import * as XLSX from "xlsx";
import type { Customer } from "@shared/index";
import { CUSTOMER_STATUS_LABELS, CONTACT_MODE_LABELS } from "@shared/index";

function fmtMoney(n?: number): string {
  if (n == null) return "";
  return n.toLocaleString("en-SG");
}

/** Flatten a customer (one row per requirement, or one row if none). */
function customerRows(c: Customer): Record<string, string>[] {
  const base = {
    "Preferred Name": c.preferredName,
    "Full Name": c.fullName ?? "",
    "Status": CUSTOMER_STATUS_LABELS[c.status],
    "Date of Birth": c.dateOfBirth ?? "",
    "Contact Number": c.contactNumber ?? "",
    "Email": c.email ?? "",
    "Address": c.address ?? "",
    "How We Know": c.source ?? "",
    "Preferred Contact": c.preferredContactMode
      ? CONTACT_MODE_LABELS[c.preferredContactMode]
      : "",
    "Contact Timing": c.preferredContactTiming ?? "",
    "Follow-up Date": c.followUpDate ?? "",
    "Follow-up Note": c.followUpNote ?? "",
  };

  if (!c.requirements.length) {
    return [
      {
        ...base,
        "Req Type": "",
        "Property": "",
        "Size/Rooms": "",
        "District": "",
        "Location": "",
        "Budget Min": "",
        "Budget Max": "",
        "Requirement Notes": "",
      },
    ];
  }

  return c.requirements.map((r) => ({
    ...base,
    "Req Type": r.transactionType,
    "Property": r.propertyType ?? "",
    "Size/Rooms": r.sizeOrRooms ?? "",
    "District": r.districtCode ?? "",
    "Location": r.location ?? "",
    "Budget Min": fmtMoney(r.budgetMin),
    "Budget Max": fmtMoney(r.budgetMax),
    "Requirement Notes": r.notes ?? "",
  }));
}

export function buildWorkbook(customers: Customer[]): Buffer {
  const rows = customers.flatMap(customerRows);
  const ws = XLSX.utils.json_to_sheet(rows);

  // Reasonable column widths.
  const headers = rows.length ? Object.keys(rows[0]) : [];
  ws["!cols"] = headers.map((h) => ({ wch: Math.max(h.length + 2, 14) }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Customers");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}
