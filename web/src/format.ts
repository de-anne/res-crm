import type { Requirement } from "@shared/index";
import { TRANSACTION_TYPE_LABELS } from "@shared/index";

export function formatMoney(n?: number): string {
  if (n == null) return "";
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `$${(Math.round(m * 100) / 100).toString()}M`;
  }
  if (n >= 1000) return `$${Math.round(n / 1000)}k`;
  return `$${n.toLocaleString("en-SG")}`;
}

export function formatBudget(r: Requirement): string {
  if (r.budgetMin != null && r.budgetMax != null)
    return `${formatMoney(r.budgetMin)}–${formatMoney(r.budgetMax)}`;
  if (r.budgetMax != null) return `up to ${formatMoney(r.budgetMax)}`;
  if (r.budgetMin != null) return `from ${formatMoney(r.budgetMin)}`;
  return "";
}

/** One-line human summary of a requirement. */
export function summariseRequirement(r: Requirement): string {
  const parts: string[] = [r.transactionType];
  if (r.sizeOrRooms) parts.push(r.sizeOrRooms);
  if (r.propertyType) parts.push(r.propertyType);
  const loc = [r.location, r.districtCode].filter(Boolean).join(" ");
  if (loc) parts.push(`in ${loc}`);
  const budget = formatBudget(r);
  if (budget) parts.push(`(${budget})`);
  return parts.join(" ");
}

export function txLabel(t: Requirement["transactionType"]): string {
  return TRANSACTION_TYPE_LABELS[t];
}

export function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? iso + "T00:00:00" : iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-SG", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-SG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function age(dob?: string): number | undefined {
  if (!dob) return undefined;
  const d = new Date(dob + "T00:00:00");
  if (isNaN(d.getTime())) return undefined;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
}
