import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { db, initSchema } from "./db.js";
import {
  registerUser,
  loginUser,
  requireAuth,
  countUsers,
  type AuthedRequest,
} from "./auth.js";
import {
  createCustomer,
  getCustomer,
  updateCustomer,
  setStatus,
  deleteCustomer,
  addActivity,
  searchCustomers,
} from "./customers.repo.js";
import { getAlerts } from "./alerts.js";
import { buildWorkbook } from "./export.js";
import type { SearchParams, CustomerStatus } from "../../shared/src/index.js";

initSchema();

const app = express();
// CORS: if CORS_ORIGIN is set (comma-separated list of allowed site origins),
// restrict to those; otherwise allow any origin (fine for a personal tool).
const corsOrigins = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors(corsOrigins.length ? { origin: corsOrigins } : {}));
app.use(express.json({ limit: "1mb" }));

const PORT = Number(process.env.PORT) || 4000;

// ---- Validation schemas -----------------------------------------------------

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const requirementSchema = z.object({
  transactionType: z.enum(["WTB", "WTS", "WTR", "WTL"]),
  propertyType: z.enum(["HDB", "Condo", "Landed", "Commercial", "Other"]).optional(),
  sizeOrRooms: z.string().optional(),
  districtCode: z.string().optional(),
  location: z.string().optional(),
  budgetMin: z.number().nonnegative().optional(),
  budgetMax: z.number().nonnegative().optional(),
  notes: z.string().optional(),
});

const customerSchema = z.object({
  preferredName: z.string().min(1, "Preferred name is required"),
  fullName: z.string().optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  contactNumber: z.string().optional(),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  address: z.string().optional(),
  source: z.string().optional(),
  status: z.enum(["active", "warm_lead", "cold_lead", "archived"]),
  preferredContactMode: z
    .enum(["call", "whatsapp", "sms", "email", "wechat", "telegram"])
    .optional(),
  preferredContactTiming: z.string().optional(),
  followUpDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("").transform(() => undefined)),
  followUpNote: z.string().optional(),
  requirements: z.array(requirementSchema).optional(),
});

// ---- Health -----------------------------------------------------------------

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, hasUsers: countUsers() > 0 });
});

// ---- Auth -------------------------------------------------------------------

app.post("/api/auth/register", (req, res) => {
  const parsed = credsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  try {
    const user = registerUser(parsed.data.email, parsed.data.password);
    const token = loginUser(parsed.data.email, parsed.data.password);
    res.status(201).json({ token, email: user.email });
  } catch (e) {
    const err = e as Error & { status?: number };
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  const parsed = credsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  try {
    const token = loginUser(parsed.data.email, parsed.data.password);
    res.json({ token, email: parsed.data.email.trim().toLowerCase() });
  } catch (e) {
    const err = e as Error & { status?: number };
    res.status(err.status ?? 500).json({ error: err.message });
  }
});

// ---- Search params parsing --------------------------------------------------

function parseSearch(query: Record<string, unknown>): SearchParams {
  const toArr = (v: unknown): string[] | undefined => {
    if (v == null) return undefined;
    if (Array.isArray(v)) return v.map(String);
    return String(v).split(",").map((s) => s.trim()).filter(Boolean);
  };
  const num = (v: unknown): number | undefined => {
    if (v == null || v === "") return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  return {
    q: query.q ? String(query.q) : undefined,
    status: toArr(query.status) as CustomerStatus[] | undefined,
    transactionType: toArr(query.transactionType) as SearchParams["transactionType"],
    propertyType: toArr(query.propertyType) as SearchParams["propertyType"],
    districtCode: query.districtCode ? String(query.districtCode) : undefined,
    location: query.location ? String(query.location) : undefined,
    budgetMin: num(query.budgetMin),
    budgetMax: num(query.budgetMax),
    includeArchived: query.includeArchived === "true" || query.includeArchived === "1",
  };
}

// ---- Customers (all require auth) -------------------------------------------

app.use("/api/customers", requireAuth);
app.use("/api/alerts", requireAuth);
app.use("/api/export", requireAuth);

app.get("/api/customers", (req: AuthedRequest, res) => {
  const results = searchCustomers(req.userId!, parseSearch(req.query as Record<string, unknown>));
  res.json(results);
});

app.post("/api/customers", (req: AuthedRequest, res) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const created = createCustomer(req.userId!, parsed.data);
  res.status(201).json(created);
});

app.get("/api/customers/:id", (req: AuthedRequest, res) => {
  const c = getCustomer(req.userId!, req.params.id);
  if (!c) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(c);
});

app.put("/api/customers/:id", (req: AuthedRequest, res) => {
  const parsed = customerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0].message });
    return;
  }
  const updated = updateCustomer(req.userId!, req.params.id, parsed.data);
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

// Archive / restore / set status
app.patch("/api/customers/:id/status", (req: AuthedRequest, res) => {
  const schema = z.object({ status: z.enum(["active", "warm_lead", "cold_lead", "archived"]) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }
  const updated = setStatus(req.userId!, req.params.id, parsed.data.status);
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

app.post("/api/customers/:id/activities", (req: AuthedRequest, res) => {
  const schema = z.object({ note: z.string().min(1) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Note is required" });
    return;
  }
  const updated = addActivity(req.userId!, req.params.id, parsed.data.note);
  if (!updated) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(updated);
});

app.delete("/api/customers/:id", (req: AuthedRequest, res) => {
  const ok = deleteCustomer(req.userId!, req.params.id);
  if (!ok) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.status(204).end();
});

// ---- Alerts -----------------------------------------------------------------

app.get("/api/alerts", (req: AuthedRequest, res) => {
  const birthdayWindow = Number(req.query.birthdayWindow) || 3;
  const followUpWindow = Number(req.query.followUpWindow) || 7;
  res.json(getAlerts(req.userId!, birthdayWindow, followUpWindow));
});

// ---- Excel export -----------------------------------------------------------

app.get("/api/export", (req: AuthedRequest, res) => {
  const results = searchCustomers(req.userId!, parseSearch(req.query as Record<string, unknown>));
  const buf = buildWorkbook(results);
  const stamp = new Date().toISOString().slice(0, 10);
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", `attachment; filename="crm-export-${stamp}.xlsx"`);
  res.send(buf);
});

// ---- Serve the built web app (single-process deploy) ------------------------
// If a built frontend exists (web/dist), serve it so one Node process hosts
// both the API and the UI. Set CRM_WEB_DIR to override the location.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webDir = process.env.CRM_WEB_DIR
  ? path.resolve(process.env.CRM_WEB_DIR)
  : path.resolve(__dirname, "..", "..", "web", "dist");

if (fs.existsSync(path.join(webDir, "index.html"))) {
  app.use(express.static(webDir));
  // SPA fallback: anything not under /api returns index.html.
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(webDir, "index.html"));
  });
  console.log(`Serving web app from ${webDir}`);
} else {
  console.log(`No web build found at ${webDir} (run "npm run build" in /web to enable).`);
}

app.listen(PORT, () => {
  console.log(`CRM API listening on http://localhost:${PORT}`);
});

export { app, db };
