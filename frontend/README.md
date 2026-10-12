# ClariFlow frontend

React 19 + Vite + Tailwind CSS v4 + React Router, with Motion for animation and a lazy-loaded React Three Fiber hero.
Talks to the existing Express backend; nothing in `backend/` is modified.

## Run

```powershell
npm install
npm run dev        # http://localhost:5173  (start the backend on :5000 first)
npm run build      # production build -> dist/
npm run preview    # serves dist/ on :4173, also proxying the API
```

The dev server proxies `/api/*` and `/_health` (rewritten to `GET /`) to the backend, so no CORS setup is needed.

## Configuration (optional, all non-secret)

Copy `.env.example` to `.env`.

| Variable | Purpose | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Public API URL for a deployed build (needs CORS or a reverse proxy). Empty = dev proxy. | *(empty)* |
| `VITE_DEV_PROXY_TARGET` | Backend the dev proxy forwards to | `http://localhost:5000` |
| `VITE_CURRENCY` | Display-only currency code for `totalAmount` | `INR` |

## Data honesty

- **Live:** health (`GET /`) and order lookup (`GET /api/orders/:orderNumber`). Latency sparkline = real checks from this session.
- **Local:** orders you've opened, kept in this browser's localStorage (tagged `LOCAL`; "Clear" removes them).
- **Unavailable:** order lists/metrics, conversations, Telegram status. Shown as unavailable or as a clearly labelled **Preview**, never as numbers.
- **Lifecycle track:** inferred from the status *text* (common words map to Placed → Processing → Shipped → Delivered). Unknown statuses show no position. Edit `STAGES` in `src/components/order/StatusTrack.jsx` once you know your real statuses.

## Design system

Tokens live in `src/index.css` (`@theme`): midnight surfaces, indigo/cyan accents, `glass` utility, Sora (display) / Inter (text) / JetBrains Mono (identifiers).
UI primitives: `src/components/ui/`. Motion presets: `src/lib/motion.js`.

## 3D hero and motion

- `src/scene/` is a procedural "signal core": colour = API state, pulse rate = measured latency. It is decorative and shows no business data.
- three.js is a separate lazy chunk, mounted when the browser is idle, paused while off-screen, and replaced by a static SVG for reduced motion, no WebGL, or Save-Data.
- `MotionConfig reducedMotion="user"` disables transform animation for people who prefer less motion. Page transitions are enter-only on purpose (an exit animation would re-render the old page with the new route's params).
- Dev console may show `THREE.Clock: This module has been deprecated`. That is emitted inside @react-three/fiber, not by this app.
