# CRM Web

React + TypeScript + Vite frontend. Mobile-responsive.

## Setup

```bash
npm install
npm run dev     # http://localhost:5173
```

The dev server proxies `/api` to the backend at `http://localhost:4000`
(see `vite.config.ts`), so run the server alongside it.

## Build

```bash
npm run build   # outputs to dist/
npm run preview
```

## Notes

- Auth token is stored in `localStorage` and sent as a Bearer token.
- On first run (no users yet) the login screen opens in "register" mode.
- Excel export downloads the current filtered result set.
