# ClariFlow Database Backup & Disaster Recovery Guide

This document describes the automated database backup architecture, retention policies, restore procedures, and isolated recovery verification protocols for ClariFlow.

---

## 1. Architecture Overview

ClariFlow's database tier runs PostgreSQL 16 on a dedicated Docker bridge network (`clariflow-internal`) with persistent volume storage (`postgres_prod_data`).

### Backup Strategy
* **Format:** Gzip-compressed SQL dumps (`pg_dump` with `--clean --if-exists`) ensuring idempotent, atomic restoration.
* **Storage Location:** `./backups/clariflow_backup_<TIMESTAMP>.sql.gz` on the host filesystem (mapped to `/backups` inside containers).
* **Retention Policy:** Default 14 days (configurable via `RETENTION_DAYS`). Automated pruning removes backups older than the retention window on each execution.
* **Zero Production Downtime:** Backup dumps execute online without locking tables or interrupting active Telegram bot or Express API operations.

---

## 2. Automated Backups

### Method A: Docker Compose Built-in Service (Recommended for Production)
The `docker-compose.prod.yml` configuration includes an automated backup container (`clariflow-backup-prod`) that runs as an internal daemon:

```yaml
backup:
  image: postgres:16-alpine
  container_name: clariflow-backup-prod
  environment:
    POSTGRES_DB: ${POSTGRES_DB:-clariflow}
    POSTGRES_USER: ${POSTGRES_USER:-clariflow}
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    POSTGRES_HOST: postgres
    BACKUP_INTERVAL: 86400  # 24 hours (daily)
    RETENTION_DAYS: 14       # 14 days retention
  volumes:
    - ./backups:/backups
    - ./scripts/backup-cron.sh:/usr/local/bin/backup-cron.sh:ro
  entrypoint: ["/bin/sh", "/usr/local/bin/backup-cron.sh"]
  restart: unless-stopped
```

* Executes every 24 hours (86,400s) automatically.
* Validates dump size; corrupt or 0-byte dumps are discarded immediately.
* Automatically prunes `.sql.gz` files older than `RETENTION_DAYS`.

### Method B: Host Scheduled Tasks (Cron / Task Scheduler)
If managing backups from the host environment:

#### Linux / macOS (Cron):
Add to `crontab -e`:
```bash
# Run daily at 02:00 AM UTC with 14-day retention
0 2 * * * cd /opt/clariflow && bash scripts/backup.sh >> /var/log/clariflow-backup.log 2>&1
```

#### Windows (PowerShell / Task Scheduler):
```powershell
# Run manually:
pwsh -File .\scripts\backup.ps1 -RetentionDays 14 -Compress

# Or schedule via Task Scheduler (Daily at 2:00 AM):
$Action = New-ScheduledTaskAction -Execute "pwsh.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File C:\path\to\ClariFlow\scripts\backup.ps1"
$Trigger = New-ScheduledTaskTrigger -Daily -At 2:00AM
Register-ScheduledTask -Action $Action -Trigger $Trigger -TaskName "ClariFlow_Daily_Backup" -Description "Daily PostgreSQL backup with 14-day retention"
```

---

## 3. Disaster Recovery & Rollback Procedure

> [!WARNING]
> Restoring a backup into the production database is a destructive overwrite. Always perform a pre-restore backup and verify recovery in an isolated test database first.

### Step-by-Step Restoration Protocol

#### Step 1: Create a Safety Snapshot of Current State
Before any restore, capture the current database state in case the restore needs to be rolled back:
```powershell
# Windows
pwsh -File .\scripts\backup.ps1 -BackupDir "./backups/pre-restore"

# Linux
BACKUP_DIR="./backups/pre-restore" bash scripts/backup.sh
```

#### Step 2: Validate the Target Backup File
Confirm the archive is intact and non-empty:
```powershell
# Verify size
Get-Item .\backups\clariflow_backup_20261017_052422.sql.gz | Select-Object Name, Length, LastWriteTime
```

#### Step 3: Test Restoration in an Isolated Database (Mandatory Verification)
Always test that the backup restores cleanly into an isolated database before touching production:

```powershell
# 1. Create isolated verification database
docker exec clariflow-postgres-prod psql -U clariflow -d postgres -c "CREATE DATABASE clariflow_recovery_test OWNER clariflow;"

# 2. Restore backup into isolated database
pwsh -File .\scripts\rollback.ps1 -BackupFile .\backups\clariflow_backup_20261017_052422.sql.gz -PostgresDb clariflow_recovery_test -Force

# 3. Verify tables and counts
docker exec clariflow-postgres-prod psql -U clariflow -d clariflow_recovery_test -c "SELECT count(*) FROM \"Order\";"
docker exec clariflow-postgres-prod psql -U clariflow -d clariflow_recovery_test -c "SELECT count(*) FROM \"User\";"

# 4. Clean up test database
docker exec clariflow-postgres-prod psql -U clariflow -d postgres -c "DROP DATABASE clariflow_recovery_test;"
```

#### Step 4: Production Restoration
Once validated in the isolated database, execute the restore on the target production database:

**Windows (PowerShell):**
```powershell
pwsh -File .\scripts\rollback.ps1 -BackupFile .\backups\clariflow_backup_20261017_052422.sql.gz
```
*(The script prompts for explicit confirmation `yes` unless `-Force` is supplied).*

**Linux / macOS:**
```bash
bash scripts/rollback.sh ./backups/clariflow_backup_20261017_052422.sql.gz
```

#### Step 5: Post-Restore Verification
1. Probe health endpoint:
   ```bash
   curl -s http://localhost:5000/health
   # Must return status: ok, database: connected
   ```
2. Verify critical order lookup:
   ```bash
   curl -s http://localhost:5000/api/orders/ORD-TEST-200
   ```
3. Test Telegram bot response:
   Send `/order ORD-TEST-200` to confirm live bot polling and database lookup.

---

## 4. Automated Recovery Test Suite

To programmatically verify backup creation, decompression, isolated database recovery, schema consistency, and retention pruning, run:

```bash
npm test --prefix backend -- --test-name-pattern="Database Backup and Recovery Suite"
```

This automated test suite (`backend/test/backup-recovery.test.js`):
1. Creates a live compressed backup.
2. Spins up an isolated database (`clariflow_recovery_test`).
3. Restores the backup.
4. Asserts presence of `Product`, `Order`, `User`, `AuditLog` tables and verified records (`ORD-TEST-200`, `ORD-8821`, `ORD-4092`).
5. Cleans up the test database.
6. Asserts retention policy prunes files older than 14 days while keeping active backups intact.
