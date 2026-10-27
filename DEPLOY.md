# Step-by-step deployment guide (DreamHost + Render)

This guide gets your CRM online at **https://crm.anneneo.com**, reachable from
your laptop and phone. No coding needed — just following steps and clicking.

**The setup:** your DreamHost plan can't run the "server" part of the app
(DreamHost only runs this kind of backend on their pricier VPS plans). So we
host the two pieces in the two best places:

- **The backend ("API")** → on **Render** (free, runs this kind of app easily).
- **The website people see** → on **DreamHost** (your `crm.anneneo.com`).

You'll do Part 1, then Part 2. Takes roughly 30–45 minutes the first time.

---

## Part 1 — Put the backend (API) on Render

### 1.1 Create a Render account
1. Go to https://render.com and click **Get Started / Sign up**.
2. Sign up with your **GitHub** account (easiest — it's the same account that
   has the `res-crm` code). Approve the connection when asked.

### 1.2 Create the service from the blueprint
1. In Render, click **New +** (top right) → **Blueprint**.
2. Find and select the repository **`de-anne/res-crm`**. (If you don't see it,
   click **Configure account** / **Configure GitHub App** and give Render
   access to that repo, then come back.)
3. Render will detect the `render.yaml` file and show a service called
   **`res-crm-api`**. Click **Apply** / **Create**.
4. It will start building. The first build takes a few minutes. Wait until the
   status shows **Live** (green).

### 1.3 Note your API address
1. Once live, Render shows a URL near the top like:
   **`https://res-crm-api.onrender.com`** (yours may have extra characters).
2. **Copy this URL and keep it** — you'll need it in Part 2. Let's call it your
   **API URL**.

### 1.4 Test it
1. In your browser, visit your **API URL** with `/api/health` on the end, e.g.
   `https://res-crm-api.onrender.com/api/health`.
2. You should see: `{"ok":true,"hasUsers":false}`. 🎉 The backend is live.

> Note: on Render's free plan the backend "sleeps" after ~15 minutes of no use.
> The first visit after it sleeps takes ~30–60 seconds to wake up, then it's
> fast again. Totally fine for personal use. (Paid plans remove the sleep.)

---

## Part 2 — Put the website on DreamHost at crm.anneneo.com

The website is a set of ready-made files. I (Kiro) will generate those files for
you once you tell me your **API URL** from step 1.3 — see "What I need from you"
at the bottom. You'll then upload them to DreamHost.

### 2.1 Create the subdomain in DreamHost
1. Log in to the **DreamHost panel** (https://panel.dreamhost.com).
2. Go to **Websites → Manage Websites** (or **Domains → Manage Domains**).
3. Click **Add Website** / **Add Hosting to a Domain/Sub-Domain**.
4. Enter **`crm.anneneo.com`** as the subdomain.
5. Choose to host it (PHP version doesn't matter — we only serve files).
6. Save. DreamHost creates a folder for it, usually
   `/home/<your-username>/crm.anneneo.com`. It can take a few minutes to
   minutes-to-an-hour for the subdomain to become active.

### 2.2 Turn on HTTPS (the padlock)
1. In the DreamHost panel, go to **Websites → Manage Websites**, find
   `crm.anneneo.com`.
2. Click to add a **free Let's Encrypt SSL certificate** (DreamHost has a
   one-click option). This makes the site load as `https://` — important
   because it holds personal data.

### 2.3 Upload the website files
You'll receive a folder of files from me (a `dist` folder). Upload its
**contents** into the subdomain folder. Two easy ways:

**Easiest — DreamHost's built-in file manager:**
1. DreamHost panel → **Websites → Files (WebFTP/File Manager)** for
   `crm.anneneo.com`.
2. Open the `crm.anneneo.com` folder.
3. Upload everything inside the `dist` folder (the `index.html` file and the
   `assets` folder) into it.

**Or FTP (e.g. the free FileZilla app):**
1. DreamHost panel → **Users → Manage Users** to find/create your FTP username
   and password for this server.
2. In FileZilla, connect using host = your DreamHost server, your FTP user and
   password.
3. Drag the contents of `dist` into the `crm.anneneo.com` folder.

### 2.4 Open it
1. Visit **https://crm.anneneo.com** on your laptop or phone.
2. The CRM login screen appears. First time, it opens in **register** mode —
   create your own account (your real email + a password). You're in!

---

## What I (Kiro) need from you to finish

Just **one thing**: the **API URL** from step 1.3 (e.g.
`https://res-crm-api.onrender.com`).

Send it to me and I'll:
1. Build the website files pointed at your API URL.
2. Set the backend's allowed-site setting (`CORS_ORIGIN`) to
   `https://crm.anneneo.com` so the two talk securely.
3. Give you the exact `dist` folder contents to upload in step 2.3.

---

## Everyday use & upkeep

- **Access:** just bookmark `https://crm.anneneo.com` on your phone and laptop.
- **Your data** lives on Render's persistent disk (the `/var/data` folder). It
  survives restarts. Consider the **Export to Excel** button as a simple backup
  you can run any time.
- **Updating the app later:** when I push new code to GitHub, Render rebuilds
  the backend automatically. For website changes I'll give you a fresh `dist`
  to re-upload.

## Troubleshooting

- **Login/search spins for a while on first use:** the free backend was asleep;
  give it ~30–60 seconds, then it's quick.
- **"Failed to load" / can't log in:** the backend URL or the allowed-site
  setting may be off. Tell me and I'll check the `VITE_API_BASE_URL` in the
  website build and the `CORS_ORIGIN` on Render.
- **Site shows a DreamHost placeholder page:** the uploaded files went to the
  wrong folder, or the subdomain isn't active yet — re-check step 2.1 / 2.3.
