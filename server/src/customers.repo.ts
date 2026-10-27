import { nanoid } from "nanoid";
import { db } from "./db.js";
import type {
  Customer,
  CustomerInput,
  Requirement,
  Activity,
  SearchParams,
  CustomerStatus,
} from "../../shared/src/index.js";
import { findDistrictForLocation, SG_DISTRICTS } from "../../shared/src/index.js";

interface Row {
  id: string;
  user_id: string;
  preferred_name: string;
  full_name: string | null;
  date_of_birth: string | null;
  contact_number: string | null;
  email: string | null;
  address: string | null;
  source: string | null;
  status: string;
  preferred_contact_mode: string | null;
  preferred_contact_timing: string | null;
  follow_up_date: string | null;
  follow_up_note: string | null;
  requirements_json: string;
  activities_json: string;
  dob_month: number | null;
  dob_day: number | null;
  created_at: string;
  updated_at: string;
}

function rowToCustomer(r: Row): Customer {
  return {
    id: r.id,
    preferredName: r.preferred_name,
    fullName: r.full_name ?? undefined,
    dateOfBirth: r.date_of_birth ?? undefined,
    contactNumber: r.contact_number ?? undefined,
    email: r.email ?? undefined,
    address: r.address ?? undefined,
    source: r.source ?? undefined,
    status: r.status as CustomerStatus,
    preferredContactMode: (r.preferred_contact_mode as Customer["preferredContactMode"]) ?? undefined,
    preferredContactTiming: r.preferred_contact_timing ?? undefined,
    followUpDate: r.follow_up_date ?? undefined,
    followUpNote: r.follow_up_note ?? undefined,
    requirements: JSON.parse(r.requirements_json) as Requirement[],
    activities: JSON.parse(r.activities_json) as Activity[],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function dobParts(dob?: string): { month: number | null; day: number | null } {
  if (!dob) return { month: null, day: null };
  const m = dob.match(/^\d{4}-(\d{2})-(\d{2})$/);
  if (!m) return { month: null, day: null };
  return { month: Number(m[1]), day: Number(m[2]) };
}

/**
 * Enrich requirements: assign ids, and infer districtCode from a free-text
 * location when not explicitly set.
 */
function prepareRequirements(reqs: Array<Omit<Requirement, "id">> = []): Requirement[] {
  return reqs.map((r) => {
    let districtCode = r.districtCode;
    if (!districtCode && r.location) {
      districtCode = findDistrictForLocation(r.location)?.code;
    }
    return { ...r, districtCode, id: nanoid(10) };
  });
}

export function createCustomer(userId: string, input: CustomerInput): Customer {
  const now = new Date().toISOString();
  const id = nanoid(12);
  const requirements = prepareRequirements(input.requirements);
  const { month, day } = dobParts(input.dateOfBirth);

  db.prepare(
    `INSERT INTO customers (
      id, user_id, preferred_name, full_name, date_of_birth, contact_number,
      email, address, source, status, preferred_contact_mode,
      preferred_contact_timing, follow_up_date, follow_up_note,
      requirements_json, activities_json, dob_month, dob_day, created_at, updated_at
    ) VALUES (
      @id, @user_id, @preferred_name, @full_name, @date_of_birth, @contact_number,
      @email, @address, @source, @status, @preferred_contact_mode,
      @preferred_contact_timing, @follow_up_date, @follow_up_note,
      @requirements_json, @activities_json, @dob_month, @dob_day, @created_at, @updated_at
    )`,
  ).run({
    id,
    user_id: userId,
    preferred_name: input.preferredName,
    full_name: input.fullName ?? null,
    date_of_birth: input.dateOfBirth ?? null,
    contact_number: input.contactNumber ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    source: input.source ?? null,
    status: input.status ?? "warm_lead",
    preferred_contact_mode: input.preferredContactMode ?? null,
    preferred_contact_timing: input.preferredContactTiming ?? null,
    follow_up_date: input.followUpDate ?? null,
    follow_up_note: input.followUpNote ?? null,
    requirements_json: JSON.stringify(requirements),
    activities_json: JSON.stringify([]),
    dob_month: month,
    dob_day: day,
    created_at: now,
    updated_at: now,
  });

  return getCustomer(userId, id)!;
}

export function getCustomer(userId: string, id: string): Customer | undefined {
  const row = db
    .prepare(`SELECT * FROM customers WHERE id = ? AND user_id = ?`)
    .get(id, userId) as Row | undefined;
  return row ? rowToCustomer(row) : undefined;
}

export function updateCustomer(
  userId: string,
  id: string,
  input: CustomerInput,
): Customer | undefined {
  const existing = getCustomer(userId, id);
  if (!existing) return undefined;

  const now = new Date().toISOString();
  // Requirements: if provided, re-prepare; otherwise keep existing.
  const requirements = input.requirements
    ? prepareRequirements(input.requirements)
    : existing.requirements;
  const { month, day } = dobParts(input.dateOfBirth);

  db.prepare(
    `UPDATE customers SET
      preferred_name = @preferred_name,
      full_name = @full_name,
      date_of_birth = @date_of_birth,
      contact_number = @contact_number,
      email = @email,
      address = @address,
      source = @source,
      status = @status,
      preferred_contact_mode = @preferred_contact_mode,
      preferred_contact_timing = @preferred_contact_timing,
      follow_up_date = @follow_up_date,
      follow_up_note = @follow_up_note,
      requirements_json = @requirements_json,
      dob_month = @dob_month,
      dob_day = @dob_day,
      updated_at = @updated_at
     WHERE id = @id AND user_id = @user_id`,
  ).run({
    id,
    user_id: userId,
    preferred_name: input.preferredName,
    full_name: input.fullName ?? null,
    date_of_birth: input.dateOfBirth ?? null,
    contact_number: input.contactNumber ?? null,
    email: input.email ?? null,
    address: input.address ?? null,
    source: input.source ?? null,
    status: input.status,
    preferred_contact_mode: input.preferredContactMode ?? null,
    preferred_contact_timing: input.preferredContactTiming ?? null,
    follow_up_date: input.followUpDate ?? null,
    follow_up_note: input.followUpNote ?? null,
    requirements_json: JSON.stringify(requirements),
    dob_month: month,
    dob_day: day,
    updated_at: now,
  });

  return getCustomer(userId, id);
}

export function setStatus(
  userId: string,
  id: string,
  status: CustomerStatus,
): Customer | undefined {
  const existing = getCustomer(userId, id);
  if (!existing) return undefined;
  db.prepare(
    `UPDATE customers SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
  ).run(status, new Date().toISOString(), id, userId);
  return getCustomer(userId, id);
}

export function deleteCustomer(userId: string, id: string): boolean {
  const res = db
    .prepare(`DELETE FROM customers WHERE id = ? AND user_id = ?`)
    .run(id, userId);
  return res.changes > 0;
}

export function addActivity(
  userId: string,
  id: string,
  note: string,
): Customer | undefined {
  const existing = getCustomer(userId, id);
  if (!existing) return undefined;
  const activity: Activity = {
    id: nanoid(10),
    createdAt: new Date().toISOString(),
    note,
  };
  const activities = [activity, ...existing.activities];
  db.prepare(
    `UPDATE customers SET activities_json = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
  ).run(JSON.stringify(activities), new Date().toISOString(), id, userId);
  return getCustomer(userId, id);
}

/**
 * Search customers. Column filters run in SQL; the richer requirement-level
 * matching (budget overlap, property/transaction type, location/district)
 * is applied in JS against the parsed requirements for accuracy.
 */
export function searchCustomers(userId: string, params: SearchParams): Customer[] {
  const rows = db
    .prepare(`SELECT * FROM customers WHERE user_id = ? ORDER BY updated_at DESC`)
    .all(userId) as Row[];

  let customers = rows.map(rowToCustomer);

  if (!params.includeArchived) {
    customers = customers.filter((c) => c.status !== "archived");
  }

  if (params.status && params.status.length) {
    customers = customers.filter((c) => params.status!.includes(c.status));
  }

  if (params.q && params.q.trim()) {
    const q = params.q.trim().toLowerCase();
    customers = customers.filter((c) => matchesKeyword(c, q));
  }

  const reqFilters =
    params.transactionType?.length ||
    params.propertyType?.length ||
    params.districtCode ||
    params.location ||
    params.budgetMin != null ||
    params.budgetMax != null;

  if (reqFilters) {
    customers = customers.filter((c) =>
      c.requirements.some((r) => requirementMatches(r, params)),
    );
  }

  return customers;
}

/**
 * Synonyms that expand each requirement into natural search words so queries
 * like "buy 3 room condo sengkang" match a record whose notes say "WTB condo".
 */
const TX_SYNONYMS: Record<string, string[]> = {
  WTB: ["buy", "buying", "buyer", "purchase", "wtb"],
  WTS: ["sell", "selling", "seller", "wts"],
  WTR: ["rent", "renting", "tenant", "rental", "wtr"],
  WTL: ["let", "letting", "landlord", "lease", "wtl"],
};

function matchesKeyword(c: Customer, q: string): boolean {
  const haystack: string[] = [
    c.preferredName,
    c.fullName ?? "",
    c.email ?? "",
    c.contactNumber ?? "",
    c.address ?? "",
    c.source ?? "",
    c.preferredContactTiming ?? "",
    c.followUpNote ?? "",
    ...c.requirements.flatMap((r) => {
      // Expand the district code into its locality names so a search for a
      // town (e.g. "Potong Pasir") matches a requirement tagged only "D13".
      const districtWords = r.districtCode
        ? [r.districtCode, ...(findLocalitiesForDistrict(r.districtCode))]
        : [];
      return [
        r.transactionType,
        ...(TX_SYNONYMS[r.transactionType] ?? []),
        r.propertyType ?? "",
        r.sizeOrRooms ?? "",
        r.location ?? "",
        ...districtWords,
        r.notes ?? "",
      ];
    }),
    ...c.activities.map((a) => a.note),
  ];
  // Multi-word AND matching: every term must appear somewhere.
  const terms = q.split(/\s+/).filter(Boolean);
  const text = haystack.join(" \u0001 ").toLowerCase();
  return terms.every((t) => text.includes(t));
}

function findLocalitiesForDistrict(code: string): string[] {
  const d = SG_DISTRICTS.find((x) => x.code === code.toUpperCase());
  return d ? d.localities : [];
}

function requirementMatches(r: Requirement, p: SearchParams): boolean {
  if (p.transactionType?.length && !p.transactionType.includes(r.transactionType)) {
    return false;
  }
  if (p.propertyType?.length) {
    if (!r.propertyType || !p.propertyType.includes(r.propertyType)) return false;
  }
  if (p.districtCode) {
    if ((r.districtCode ?? "").toUpperCase() !== p.districtCode.toUpperCase()) return false;
  }
  if (p.location && p.location.trim()) {
    const loc = p.location.trim().toLowerCase();
    const inLoc = (r.location ?? "").toLowerCase().includes(loc);
    const dc = findDistrictForLocation(p.location)?.code;
    const inDistrict = dc != null && (r.districtCode ?? "") === dc;
    if (!inLoc && !inDistrict) return false;
  }
  // Budget overlap: the search range [min,max] must overlap the requirement range.
  if (p.budgetMin != null || p.budgetMax != null) {
    const rMin = r.budgetMin ?? 0;
    const rMax = r.budgetMax ?? Number.MAX_SAFE_INTEGER;
    const sMin = p.budgetMin ?? 0;
    const sMax = p.budgetMax ?? Number.MAX_SAFE_INTEGER;
    const overlaps = rMin <= sMax && sMin <= rMax;
    if (!overlaps) return false;
  }
  return true;
}
