import { db } from "./db.js";
import type { Alert } from "../../shared/src/index.js";

interface AlertRow {
  id: string;
  preferred_name: string;
  full_name: string | null;
  date_of_birth: string | null;
  dob_month: number | null;
  dob_day: number | null;
  follow_up_date: string | null;
  follow_up_note: string | null;
  status: string;
}

/** Days until the next occurrence of month/day from `from` (0 = today). */
function daysUntilNextAnniversary(from: Date, month: number, day: number): number {
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = new Date(from.getFullYear(), month - 1, day);
  if (next < base) {
    next = new Date(from.getFullYear() + 1, month - 1, day);
  }
  const ms = next.getTime() - base.getTime();
  return Math.round(ms / 86_400_000);
}

function isoDateFor(from: Date, month: number, day: number): string {
  const base = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  let next = new Date(from.getFullYear(), month - 1, day);
  if (next < base) next = new Date(from.getFullYear() + 1, month - 1, day);
  return next.toISOString().slice(0, 10);
}

/**
 * Compute upcoming alerts for a user.
 * @param birthdayWindow days ahead to surface birthdays (default 3)
 * @param followUpWindow days ahead to surface follow-ups (default 7)
 */
export function getAlerts(
  userId: string,
  birthdayWindow = 3,
  followUpWindow = 7,
): Alert[] {
  const now = new Date();
  const rows = db
    .prepare(
      `SELECT id, preferred_name, full_name, date_of_birth, dob_month, dob_day,
              follow_up_date, follow_up_note, status
       FROM customers WHERE user_id = ? AND status != 'archived'`,
    )
    .all(userId) as AlertRow[];

  const alerts: Alert[] = [];

  for (const r of rows) {
    const name = r.preferred_name || r.full_name || "Customer";

    // Birthday alerts (within window, including today).
    if (r.dob_month && r.dob_day) {
      const daysAway = daysUntilNextAnniversary(now, r.dob_month, r.dob_day);
      if (daysAway <= birthdayWindow) {
        alerts.push({
          kind: "birthday",
          customerId: r.id,
          customerName: name,
          date: isoDateFor(now, r.dob_month, r.dob_day),
          daysAway,
          detail:
            daysAway === 0
              ? "Birthday is today 🎂"
              : `Birthday in ${daysAway} day${daysAway === 1 ? "" : "s"}`,
        });
      }
    }

    // Follow-up alerts (overdue or within window).
    if (r.follow_up_date) {
      const target = new Date(r.follow_up_date + "T00:00:00");
      const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const daysAway = Math.round((target.getTime() - base.getTime()) / 86_400_000);
      if (daysAway <= followUpWindow) {
        alerts.push({
          kind: "followup",
          customerId: r.id,
          customerName: name,
          date: r.follow_up_date,
          daysAway,
          detail:
            daysAway < 0
              ? `Follow-up overdue by ${Math.abs(daysAway)} day${Math.abs(daysAway) === 1 ? "" : "s"}` +
                (r.follow_up_note ? ` — ${r.follow_up_note}` : "")
              : daysAway === 0
                ? `Follow-up due today` + (r.follow_up_note ? ` — ${r.follow_up_note}` : "")
                : `Follow-up in ${daysAway} days` + (r.follow_up_note ? ` — ${r.follow_up_note}` : ""),
        });
      }
    }
  }

  // Sort by soonest first (overdue follow-ups float to top).
  alerts.sort((a, b) => a.daysAway - b.daysAway);
  return alerts;
}
