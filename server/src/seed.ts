/**
 * Seed script: creates a demo account and a handful of realistic Singapore
 * customers/leads so you can explore the CRM immediately.
 *
 * Run: npm run seed   (from the server/ directory)
 * Demo login: [email protected] / demo1234
 */
import { initSchema } from "./db.js";
import { registerUser, loginUser, countUsers } from "./auth.js";
import { createCustomer } from "./customers.repo.js";
import type { CustomerInput } from "../../shared/src/index.js";

initSchema();

const EMAIL = "[email protected]";
const PASSWORD = "demo1234";

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function birthdayIn(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `1985-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

try {
  let userId: string;
  if (countUsers() === 0) {
    userId = registerUser(EMAIL, PASSWORD).id;
  } else {
    // Derive id via login token is awkward here; just try register, fall back.
    try {
      userId = registerUser(EMAIL, PASSWORD).id;
    } catch {
      console.log("Demo user already exists; skipping seed.");
      process.exit(0);
    }
  }
  loginUser(EMAIL, PASSWORD); // sanity check

  const demo: CustomerInput[] = [
    {
      preferredName: "Mr Tan",
      fullName: "Tan Ah Kow",
      status: "warm_lead",
      dateOfBirth: birthdayIn(2),
      contactNumber: "9123 4567",
      email: "[email protected]",
      source: "Referral from Jane (ex-client)",
      preferredContactMode: "whatsapp",
      preferredContactTiming: "Weekday evenings after 7pm",
      followUpDate: daysFromNow(3),
      followUpNote: "Arrange condo viewing in Sengkang",
      requirements: [
        {
          transactionType: "WTB",
          propertyType: "Condo",
          sizeOrRooms: "3-bedroom",
          location: "Sengkang",
          budgetMax: 2_000_000,
          notes: "WTB condo in Sengkang below $2M, prefers near MRT",
        },
      ],
    },
    {
      preferredName: "Auntie Lim",
      fullName: "Lim Siew Hong",
      status: "active",
      contactNumber: "9876 5432",
      address: "Blk 123 Whampoa Drive",
      source: "Walk-in at showflat",
      preferredContactMode: "call",
      preferredContactTiming: "Mornings",
      requirements: [
        {
          transactionType: "WTS",
          propertyType: "HDB",
          sizeOrRooms: "4-room",
          location: "Whampoa",
          districtCode: "D12",
          notes: "WTS 4-room HDB at Whampoa (D12)",
        },
        {
          transactionType: "WTB",
          propertyType: "HDB",
          sizeOrRooms: "3-room",
          location: "near Rosyth School",
          budgetMax: 650_000,
          notes: "Looking for 2-3 room HDB near Rosyth School for daughter",
        },
      ],
    },
    {
      preferredName: "David",
      fullName: "David Wong",
      status: "cold_lead",
      dateOfBirth: birthdayIn(10),
      email: "[email protected]",
      source: "PropertyGuru enquiry",
      preferredContactMode: "email",
      requirements: [
        {
          transactionType: "WTB",
          propertyType: "Condo",
          location: "Potong Pasir",
          districtCode: "D13",
          budgetMin: 1_200_000,
          budgetMax: 1_800_000,
          notes: "WTB condo D13 Potong Pasir, 1.2m–1.8m",
        },
      ],
    },
    {
      preferredName: "Mrs Kumar",
      status: "warm_lead",
      contactNumber: "8111 2222",
      source: "Referral",
      followUpDate: daysFromNow(-1),
      followUpNote: "Overdue: send listing options",
      requirements: [
        {
          transactionType: "WTR",
          propertyType: "Condo",
          sizeOrRooms: "2-bedroom",
          location: "Bishan",
          budgetMax: 4500,
          notes: "WTR 2-bedroom condo Bishan up to $4.5k/mo",
        },
      ],
    },
  ];

  for (const c of demo) createCustomer(userId, c);

  console.log(`Seeded ${demo.length} demo customers.`);
  console.log(`Login: ${EMAIL} / ${PASSWORD}`);
} catch (e) {
  console.error("Seed failed:", e);
  process.exit(1);
}
