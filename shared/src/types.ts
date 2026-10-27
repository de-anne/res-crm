/**
 * Shared domain types for the SG Real Estate CRM.
 * Used by both the server and the web frontend.
 */

export type CustomerStatus =
  | "active"      // Active/existing customer
  | "warm_lead"   // Warm lead
  | "cold_lead"   // Cold lead
  | "archived";   // Archived (reversible soft-delete)

export const CUSTOMER_STATUS_LABELS: Record<CustomerStatus, string> = {
  active: "Active customer",
  warm_lead: "Warm lead",
  cold_lead: "Cold lead",
  archived: "Archived",
};

/** What the customer wants to do. */
export type TransactionType =
  | "WTB"   // Want to buy
  | "WTS"   // Want to sell
  | "WTR"   // Want to rent (tenant)
  | "WTL";  // Want to let (landlord)

export const TRANSACTION_TYPE_LABELS: Record<TransactionType, string> = {
  WTB: "Want to buy",
  WTS: "Want to sell",
  WTR: "Want to rent",
  WTL: "Want to let",
};

export type PropertyType = "HDB" | "Condo" | "Landed" | "Commercial" | "Other";

export const PROPERTY_TYPES: PropertyType[] = ["HDB", "Condo", "Landed", "Commercial", "Other"];

export type ContactMode = "call" | "whatsapp" | "sms" | "email" | "wechat" | "telegram";

export const CONTACT_MODE_LABELS: Record<ContactMode, string> = {
  call: "Phone call",
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "Email",
  wechat: "WeChat",
  telegram: "Telegram",
};

/**
 * A single structured requirement, e.g. "WTB Condo in Sengkang below $2M".
 * A customer may have several (a seller who is also looking to buy, etc.).
 */
export interface Requirement {
  id: string;
  transactionType: TransactionType;
  propertyType?: PropertyType;
  /** e.g. "3-room", "2-bedroom", "executive" */
  sizeOrRooms?: string;
  /** District code like "D13" if known. */
  districtCode?: string;
  /** Free-text location, e.g. "Sengkang", "near Rosyth School". */
  location?: string;
  budgetMin?: number;
  budgetMax?: number;
  /** Original free-text requirement as typed by the agent. */
  notes?: string;
}

/** A timestamped note / interaction with the customer. */
export interface Activity {
  id: string;
  createdAt: string; // ISO timestamp
  note: string;
}

export interface Customer {
  id: string;
  preferredName: string;          // required
  fullName?: string;
  dateOfBirth?: string;           // ISO date (YYYY-MM-DD)
  contactNumber?: string;
  email?: string;
  address?: string;
  /** Where / how the agent knows this customer. */
  source?: string;
  status: CustomerStatus;

  preferredContactMode?: ContactMode;
  /** Preferred timing of contact, e.g. "weekday evenings", "after 6pm". */
  preferredContactTiming?: string;

  requirements: Requirement[];
  activities: Activity[];

  /** Next follow-up action date (ISO date) and optional note. */
  followUpDate?: string;
  followUpNote?: string;

  createdAt: string;
  updatedAt: string;
}

/** Payload for creating/updating a customer (server assigns ids/timestamps). */
export type CustomerInput = Omit<
  Customer,
  "id" | "createdAt" | "updatedAt" | "requirements" | "activities"
> & {
  requirements?: Array<Omit<Requirement, "id">>;
};

/** Search / filter parameters. */
export interface SearchParams {
  /** Free-text keyword across names, notes, requirements, location. */
  q?: string;
  status?: CustomerStatus[];
  transactionType?: TransactionType[];
  propertyType?: PropertyType[];
  districtCode?: string;
  location?: string;
  budgetMin?: number;
  budgetMax?: number;
  /** Include archived records (default false). */
  includeArchived?: boolean;
}

/** An upcoming alert surfaced on the dashboard. */
export interface Alert {
  kind: "birthday" | "followup";
  customerId: string;
  customerName: string;
  date: string;        // ISO date of the event
  daysAway: number;
  detail?: string;
}
