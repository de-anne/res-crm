# SG Real Estate CRM

A lightweight CRM for a Singapore real estate agent to manage leads and existing
customers across devices (laptop + phone).

## Features

- Create / edit / archive (reversible) / delete customers and leads
- Full customer record: preferred name, full name, DOB, contact, address, email,
  how you know them, preferred contact mode & timing
- Status tracking: Active customer / Warm lead / Cold lead / Archived
- Structured requirements: buyer/seller, property type, transaction type,
  numeric budget range, location — plus free-text notes
- Powerful search: keyword, Singapore district / location, budget range
- Export search results to Excel (.xlsx)
- Dashboard with upcoming birthday alerts (configurable window) and follow-up reminders
- Per-customer activity log
- Built-in Singapore reference data: 28 postal districts + HDB towns

## Tech stack

- **Backend:** Node + TypeScript, Express, SQLite (better-sqlite3)
- **Frontend:** React + TypeScript + Vite, mobile-responsive
- **Auth:** email + password (JWT)
- **Export:** xlsx

## Project structure

```
/server   - API, database, business logic
/web      - React frontend
/shared   - Types and Singapore reference data shared across both
```

## Quick start

```bash
# 1. Install everything (root + server + web)
npm run install:all

# 2. Configure the server secret
cp server/.env.example server/.env    # then edit JWT_SECRET

# 3. (Optional) load demo data
npm run seed                          # login: [email protected] / demo1234

# 4. Run server + web together
npm run dev
```

Then open **http://localhost:5173**. The API runs on **http://localhost:4000**
and the web dev server proxies `/api` to it.

On first run (empty database) the login screen starts in **register** mode —
create your account and you're in.

See `server/README.md` and `web/README.md` for details on each package.

## Deploying

**Non-technical, step-by-step guide for DreamHost + Render:** see
[`DEPLOY.md`](./DEPLOY.md). The sections below are the general reference.

## Deploying to your own web host

The app has two parts: a **Node API** (`server`) and a **static web build**
(`web/dist`). Two common ways to host:

### Option A — Single Node process (easiest)

If your host can run Node, one process can serve **both** the UI and the API.
When a web build exists at `web/dist`, the server serves it automatically
(with SPA routing), so you only run one command.

```bash
# On the host, once:
npm run install:all
npm run build                      # builds server/dist AND web/dist

# Set environment variables (do NOT commit real secrets):
export JWT_SECRET="<a long random string>"
export PORT=4000
export CRM_DATA_DIR=/var/data/res-crm   # a writable, persistent folder

# Start — serves the app on http://<host>:4000 and the API under /api
npm --prefix server start
```

Put it behind your web server for HTTPS (example Nginx reverse proxy):

```nginx
location / { proxy_pass http://127.0.0.1:4000; }
```

Override where the static files are read from with `CRM_WEB_DIR` if needed.

### Option B — Static host + separate API

Alternatively, host `web/dist` on a static host and run `server` separately,
reverse-proxying `/api` to the Node process so the relative `/api` path
resolves on the same domain:

```nginx
location / { root /path/to/web/dist; try_files $uri /index.html; }
location /api/ { proxy_pass http://127.0.0.1:4000; }
```

### Important for any host

- **Persistence:** the SQLite file lives in `CRM_DATA_DIR`. Point it at a
  folder that persists across restarts/deploys and is backed up.
- **Secret:** always set a strong `JWT_SECRET` in the host's environment.
- **HTTPS:** serve over HTTPS (your contacts' personal data / PDPA).
- The app is mobile-responsive, so the same URL works on your phone.

## Status

v1 in progress. Match-making (listing → matching buyers) deferred to v2.
Alerts are shown in-app on the dashboard; email/push notifications planned.
