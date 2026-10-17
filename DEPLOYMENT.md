# ClariFlow Production Deployment Guide

This document outlines the production deployment workflow for ClariFlow, incorporating a single-instance Express backend, PostgreSQL database, Telegram bot polling, Caddy HTTPS reverse proxy with SPA client-side routing, automated backups, and rollback procedures.

---

## 1. Architecture & Design Principles

```
   [Internet Clients]
          │
          │ HTTPS (443) / HTTP (80)
          ▼
   ┌────────────────────────────────────────────────────────┐
   │               Caddy 2 Reverse Proxy                    │
   │  • Automatic Let's Encrypt TLS                         │
   │  • Static React SPA files (/srv/dist) + gzip/zstd      │
   │  • SPA fallback: try_files {path} /index.html          │
   │  • Reverse proxy: /api/* & /_health -> backend:5000    │
   └───────────────┬────────────────────────────────────────┘
                   │ Internal Docker Network
                   ▼
   ┌────────────────────────────────────────────────────────┐
   │          ClariFlow Express Backend (Replicas: 1)       │
   │  • Node.js 20 Alpine (Non-root user)                   │
   │  • Parameterized queries via pg.Pool                   │
   │  • node-telegram-bot-api (Polling mode)                │
   │  • Dedicated /health check endpoint                    │
   └───────────────┬────────────────────────────────────────┘
                   │ Internal Docker Network (Port 5432)
                   ▼
   ┌────────────────────────────────────────────────────────┐
   │             PostgreSQL 16 (Alpine)                     │
   │  • Named persistent volume: postgres_prod_data         │
   │  • Health check: pg_isready                            │
   └────────────────────────────────────────────────────────┘
```

> [!IMPORTANT]
> **Single Instance Constraint for Telegram Polling:**
> The backend runs Telegram Bot in long-polling mode (`polling: true`). Telegram enforces a strict 1-polling-client constraint per bot token. The backend container is explicitly pinned to `replicas: 1` in `docker-compose.prod.yml` to prevent HTTP `409 Conflict` errors.

---

## 2. Pre-Deployment Security Checklist & Manual Steps

### Step 1: Rotate Telegram Bot Token (Mandatory Manual Step)
A bot token was previously committed to git history in commit `b79978d`. **Do not use this token in production.**
1. Open Telegram and search for `@BotFather`.
2. Send `/mybots`, select your ClariFlow bot.
3. Select **API Token** -> **Revoke current token**.
4. Copy the newly issued token.

### Step 2: Prepare Production Environment
Copy the example file to `.env` at the project root (Docker Compose automatically reads `.env` by default):
```bash
cp .env.production.example .env
nano .env
```

Configure your domain and credentials:
```env
DOMAIN=clariflow.yourdomain.com
LETSENCRYPT_EMAIL=admin@yourdomain.com
POSTGRES_DB=clariflow
POSTGRES_USER=clariflow
POSTGRES_PASSWORD=generate_a_strong_random_password_here
BOT_TOKEN=your_newly_rotated_telegram_token
CORS_ORIGIN=https://clariflow.yourdomain.com
```

---

## 3. Step-by-Step Deployment Procedure

### 1. Launch the Production Stack
ClariFlow builds both the backend and frontend using multi-stage Dockerfiles inside `docker-compose.prod.yml`:
```bash
# Launch stack (builds Node backend & Caddy frontend SPA, connects to PostgreSQL)
docker compose -f docker-compose.prod.yml up -d --build
```

Verify that all three services are running and healthy:
```bash
docker compose -f docker-compose.prod.yml ps
```

### 2. Verify Schema or Seed Initial Data
The backend automatically creates the `Product` and `Order` tables on startup if they do not exist.

*(Optional for demo/testing)* Seed the documented demo orders (`ORD-TEST-200`, `ORD-8821`, `ORD-4092`):
```bash
docker compose -f docker-compose.prod.yml exec backend node seed.js
```

---

## 4. Verification Commands

Verify each layer of the production stack using automated checks:

```bash
# 1. Health Probe (verifies Express, PostgreSQL, and Telegram bot)
curl -s https://clariflow.yourdomain.com/health | jq .
# Expected output:
# {
#   "status": "ok",
#   "uptime": 120,
#   "database": "connected",
#   "bot": "polling"
# }

# 2. Test Order Lookup (ORD-TEST-200)
curl -s https://clariflow.yourdomain.com/api/orders/ORD-TEST-200 | jq .

# 3. Test 404 Not Found Handling
curl -s -w "\nHTTP_CODE:%{http_code}\n" https://clariflow.yourdomain.com/api/orders/ORD-UNKNOWN-999

# 4. Test 400 Bad Request Handling
curl -s -w "\nHTTP_CODE:%{http_code}\n" https://clariflow.yourdomain.com/api/orders/%20%20

# 5. Test SPA Client Routing Fallback
curl -s -I https://clariflow.yourdomain.com/orders/ORD-TEST-200 | head -n 5
# Must return HTTP 200 with text/html content-type (not 404)

# 6. Telegram Bot Live Verification
# In Telegram, send message "/order ORD-TEST-200" to verify live bot reply.
```

---

## 5. Automated Backups & Rollback

### Automated Database Backup
ClariFlow supports automated backups via the built-in Docker daemon in `docker-compose.prod.yml` or via host automation:

* **Docker Service:** `clariflow-backup-prod` automatically takes daily gzip-compressed dumps (`pg_dump --clean --if-exists`) and stores them in `./backups/`.
* **Configurable Retention:** Backups older than 14 days (configurable via `RETENTION_DAYS`) are automatically pruned.

**Manual / Cron Backup (Linux / macOS):**
```bash
bash scripts/backup.sh
```

**Manual / Task Scheduler (Windows PowerShell):**
```powershell
pwsh -File .\scripts\backup.ps1 -RetentionDays 14 -Compress
```

Backups are saved to `./backups/clariflow_backup_<TIMESTAMP>.sql.gz` and automatically pruned according to the retention window.

### Disaster Recovery / Rollback
To restore a previous database state:

**Linux / macOS:**
```bash
bash scripts/rollback.sh ./backups/clariflow_backup_20261017_052422.sql.gz
```

**Windows (PowerShell):**
```powershell
pwsh -File .\scripts\rollback.ps1 -BackupFile .\backups\clariflow_backup_20261017_052422.sql.gz
```

*For comprehensive restoration procedures, isolated test verification, and emergency recovery scenarios, see the complete guide: [BACKUP_RECOVERY.md](BACKUP_RECOVERY.md).*


---

## 6. Maintenance & Ongoing Operations

- **Logs Inspection:**
  ```bash
  docker compose -f docker-compose.prod.yml logs -f backend
  docker compose -f docker-compose.prod.yml logs -f caddy
  ```
- **Graceful Shutdown / Restart:**
  ```bash
  docker compose -f docker-compose.prod.yml restart backend
  ```
  *(Graceful shutdown triggers `bot.stopPolling()`, closes `pg.Pool`, and terminates cleanly without hanging).*
