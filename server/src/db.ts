import Database from "better-sqlite3";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.CRM_DATA_DIR
  ? path.resolve(process.env.CRM_DATA_DIR)
  : path.resolve(__dirname, "..", "data");

fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "crm.sqlite");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

export function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id                       TEXT PRIMARY KEY,
      user_id                  TEXT NOT NULL,
      preferred_name           TEXT NOT NULL,
      full_name                TEXT,
      date_of_birth            TEXT,
      contact_number           TEXT,
      email                    TEXT,
      address                  TEXT,
      source                   TEXT,
      status                   TEXT NOT NULL DEFAULT 'warm_lead',
      preferred_contact_mode   TEXT,
      preferred_contact_timing TEXT,
      follow_up_date           TEXT,
      follow_up_note           TEXT,
      requirements_json        TEXT NOT NULL DEFAULT '[]',
      activities_json          TEXT NOT NULL DEFAULT '[]',
      -- denormalised birthday month/day for fast upcoming-birthday queries
      dob_month                INTEGER,
      dob_day                  INTEGER,
      created_at               TEXT NOT NULL,
      updated_at               TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_customers_user   ON customers(user_id);
    CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
    CREATE INDEX IF NOT EXISTS idx_customers_dob    ON customers(dob_month, dob_day);
    CREATE INDEX IF NOT EXISTS idx_customers_follow ON customers(follow_up_date);
  `);
}
