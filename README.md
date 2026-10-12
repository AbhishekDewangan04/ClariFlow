# ClariFlow — Intelligent Real-Time Order Operations Platform

ClariFlow is a high-performance order management platform combining a futuristic Apple-inspired **Liquid Glass** frontend with an Express/PostgreSQL backend and Telegram bot automation.

The platform provides live telemetry, order lookup, timeline tracking, and customer support previews—all powered strictly by **real API data with zero fabricated statistics**.

---

## 🏗 Architecture & Tech Stack

```
   ┌─────────────────────────────────────────────────────────────┐
   │                   ClariFlow Frontend                        │
   │  React 19 + Vite • Tailwind CSS • Three.js WebGL (R3F)     │
   │  Motion • Lucide Icons • WebGL Liquid Glass Shader Engine   │
   └───────────────┬─────────────────────────────▲───────────────┘
                   │ HTTP /api/orders/:id        │ SSE / Polling Health
                   ▼                             │
   ┌─────────────────────────────────────────────┴───────────────┐
   │                    Express Backend                          │
   │  Node.js • Express 5 • node-telegram-bot-api • pg Pool      │
   │  Prisma 8 ORM (PostgreSQL) • Graceful Process Termination   │
   └───────────────┬─────────────────────────────▲───────────────┘
                   │                             │
                   ▼                             │
   ┌─────────────────────────────┐ ┌─────────────┴───────────────┐
   │       PostgreSQL 16         │ │        Telegram API         │
   │   Orders, Products, Logs    │ │   Customer Bot Dispatcher   │
   └─────────────────────────────┘ └─────────────────────────────┘
```

- **Frontend:** React 19, Vite, Tailwind CSS, Lucide React, Motion (Framer Motion), `@react-three/fiber` & Three.js for interactive WebGL core, custom WebGL Liquid Glass shader refraction engine (`liquidGL.js`).
- **Backend:** Node.js, Express 5, `pg` connection pool, Prisma ORM runtime, `node-telegram-bot-api`.
- **Database:** PostgreSQL 16 (dockerized or local).

---

## ⚡ Quick Start

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [Docker Desktop](https://www.docker.com/) (recommended for PostgreSQL container)

### 2. Environment Configuration

#### Backend (`backend/.env`)
Create `backend/.env` (reference: `backend/.env.example`):
```env
PORT=5000
DATABASE_URL="postgresql://clariflow:clariflow_password@localhost:5432/clariflow"
BOT_TOKEN="your_telegram_bot_token_here"
```

#### Frontend (`frontend/.env`)
Optional override for backend URL (defaults to `http://localhost:5000`):
```env
VITE_API_BASE_URL="http://localhost:5000"
```

---

### 3. Start PostgreSQL Database

Using Docker Compose:
```bash
docker compose up -d postgres
```

Verify PostgreSQL is running:
```bash
docker compose ps
```

---

### 4. Seed Database with Test Orders

Run the database seed script to populate sample products and orders (`ORD-TEST-200`, `ORD-8821`, `ORD-4092`):
```bash
cd backend
node seed.js
```

---

### 5. Launch the Backend

```bash
cd backend
npm install
npm run dev
```
Backend will start at `http://localhost:5000`.

---

### 6. Launch the Frontend

In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:5173` in your browser.

---

## 🧪 Testing & Verification

### Backend Tests (10/10 Passing)
Includes unit and API integration tests covering valid order queries, whitespace handling (`400`), missing orders (`404`), and database disconnection resilience (`503`):
```bash
cd backend
npm test
```

### Frontend Tests (17/17 Passing)
Tests order payload normalization, tone mapping, currency and relative time formatters, and LiquidGL shaders:
```bash
cd frontend
npm test
```

### Production Build
Verify clean compilation of the frontend production bundle:
```bash
cd frontend
npm run build
```

---

## 📡 API Contract

### `GET /`
Returns service status and health.
- **Response:** `200 OK`
```json
{
  "message": "ClariFlow Backend Running"
}
```

### `GET /api/orders/:orderNumber`
Lookup an order by order number.
- **Responses:**
  - `200 OK`: Returns order details.
    ```json
    {
      "id": "cm1...",
      "orderNumber": "ORD-TEST-200",
      "customerName": "Alex Rivera",
      "status": "DELIVERED",
      "totalAmount": 200.00,
      "createdAt": "2026-10-09T18:00:00.000Z",
      "updatedAt": "2026-10-11T18:00:00.000Z"
    }
    ```
  - `400 Bad Request`: When `:orderNumber` is empty, whitespace, or invalid.
    ```json
    { "error": "Invalid order number" }
    ```
  - `404 Not Found`: When `:orderNumber` does not exist in the database.
    ```json
    { "error": "Order not found" }
    ```
  - `503 Service Unavailable`: When PostgreSQL is unreachable.
    ```json
    { "error": "Database unavailable" }
    ```

---

## 🤖 Telegram Bot Integration

The backend initializes Telegram Bot polling using `node-telegram-bot-api` when `BOT_TOKEN` is supplied:
1. Send `/start` to the bot for greeting and command instructions.
2. Send `/order <orderNumber>` (e.g. `/order ORD-TEST-200`) to check live status directly within Telegram.
3. On process termination (`SIGTERM`, `SIGINT`), polling is gracefully stopped to avoid connection hanging.

---

## 💎 Design & Operational Guarantees

1. **No Fabricated Data:** The Overview hero metrics, device activity, and order counters strictly aggregate live session and API records. When no orders have been fetched or the database is starting up, metrics reflect real zeros and prompt user lookup.
2. **Support Page Marked PREVIEW:** As backend conversation endpoints and chat histories are not yet implemented, the Support page is clearly labeled with a warning banner indicating that it is an interactive preview.
3. **Database Unavailable Resilience:** If PostgreSQL is offline, both backend and frontend fail gracefully with clear diagnostic messages and retry buttons rather than unhandled promise crashes.
4. **Liquid Glass Design System:** Real-time glassmorphism, responsive navigation rail, collapsible search shortcuts (`/`), and WebGL canvas with automatic `IntersectionObserver` frame pausing.