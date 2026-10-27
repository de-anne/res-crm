import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import type { Request, Response, NextFunction } from "express";
import { db } from "./db.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-insecure-secret-change-me";
const TOKEN_TTL = "30d";

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export function registerUser(email: string, password: string): { id: string; email: string } {
  const normalized = email.trim().toLowerCase();
  const existing = db.prepare(`SELECT id FROM users WHERE email = ?`).get(normalized);
  if (existing) {
    throw Object.assign(new Error("Email already registered"), { status: 409 });
  }
  const id = nanoid(12);
  const hash = bcrypt.hashSync(password, 10);
  db.prepare(
    `INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)`,
  ).run(id, normalized, hash, new Date().toISOString());
  return { id, email: normalized };
}

export function loginUser(email: string, password: string): string {
  const normalized = email.trim().toLowerCase();
  const user = db.prepare(`SELECT * FROM users WHERE email = ?`).get(normalized) as
    | UserRow
    | undefined;
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    throw Object.assign(new Error("Invalid email or password"), { status: 401 });
  }
  return jwt.sign({ sub: user.id, email: user.email }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function countUsers(): number {
  const row = db.prepare(`SELECT COUNT(*) AS n FROM users`).get() as { n: number };
  return row.n;
}

export interface AuthedRequest extends Request {
  userId?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    req.userId = payload.sub;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
