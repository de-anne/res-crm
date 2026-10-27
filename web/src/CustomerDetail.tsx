import { useState } from "react";
import type { Customer, CustomerStatus } from "@shared/index";
import {
  CUSTOMER_STATUS_LABELS,
  CONTACT_MODE_LABELS,
  SG_DISTRICTS,
} from "@shared/index";
import { summariseRequirement, formatDate, formatDateTime, age } from "./format";

interface Props {
  customer: Customer;
  onClose: () => void;
  onEdit: () => void;
  onStatusChange: (status: CustomerStatus) => Promise<void>;
  onDelete: () => Promise<void>;
  onAddActivity: (note: string) => Promise<void>;
}

function districtLabel(code?: string): string {
  if (!code) return "";
  const d = SG_DISTRICTS.find((x) => x.code === code);
  return d ? `${d.code} (${d.localities.slice(0, 2).join(", ")})` : code;
}

export function CustomerDetail({
  customer,
  onClose,
  onEdit,
  onStatusChange,
  onDelete,
  onAddActivity,
}: Props) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const a = age(customer.dateOfBirth);

  async function submitNote() {
    if (!note.trim()) return;
    setBusy(true);
    try {
      await onAddActivity(note.trim());
      setNote("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>
            {customer.preferredName}{" "}
            <span className={`badge ${customer.status}`}>{CUSTOMER_STATUS_LABELS[customer.status]}</span>
          </h2>
          <button className="close-x" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="modal-body">
          <dl className="detail-grid">
            {customer.fullName && (
              <>
                <dt>Full name</dt>
                <dd>{customer.fullName}</dd>
              </>
            )}
            {customer.dateOfBirth && (
              <>
                <dt>Date of birth</dt>
                <dd>
                  {formatDate(customer.dateOfBirth)}
                  {a != null && <span className="inline-note"> · {a} yrs</span>}
                </dd>
              </>
            )}
            {customer.contactNumber && (
              <>
                <dt>Contact</dt>
                <dd>
                  <a href={`tel:${customer.contactNumber}`}>{customer.contactNumber}</a>
                </dd>
              </>
            )}
            {customer.email && (
              <>
                <dt>Email</dt>
                <dd>
                  <a href={`mailto:${customer.email}`}>{customer.email}</a>
                </dd>
              </>
            )}
            {customer.address && (
              <>
                <dt>Address</dt>
                <dd>{customer.address}</dd>
              </>
            )}
            {customer.source && (
              <>
                <dt>How you know</dt>
                <dd>{customer.source}</dd>
              </>
            )}
            {customer.preferredContactMode && (
              <>
                <dt>Preferred contact</dt>
                <dd>
                  {CONTACT_MODE_LABELS[customer.preferredContactMode]}
                  {customer.preferredContactTiming ? ` · ${customer.preferredContactTiming}` : ""}
                </dd>
              </>
            )}
            {!customer.preferredContactMode && customer.preferredContactTiming && (
              <>
                <dt>Contact timing</dt>
                <dd>{customer.preferredContactTiming}</dd>
              </>
            )}
            {customer.followUpDate && (
              <>
                <dt>Next follow-up</dt>
                <dd>
                  {formatDate(customer.followUpDate)}
                  {customer.followUpNote ? ` — ${customer.followUpNote}` : ""}
                </dd>
              </>
            )}
          </dl>

          <h3 style={{ marginTop: 18 }}>Requirements</h3>
          {customer.requirements.length === 0 ? (
            <p className="inline-note">No requirements recorded.</p>
          ) : (
            customer.requirements.map((r) => (
              <div className="req-block" key={r.id} style={{ marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>{summariseRequirement(r)}</div>
                {r.districtCode && <div className="inline-note">District: {districtLabel(r.districtCode)}</div>}
                {r.notes && <div style={{ marginTop: 4 }}>{r.notes}</div>}
              </div>
            ))
          )}

          <h3 style={{ marginTop: 18 }}>Activity log</h3>
          <div className="field" style={{ display: "flex", gap: 8 }}>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note, e.g. called, wants viewing next week"
              onKeyDown={(e) => {
                if (e.key === "Enter") submitNote();
              }}
            />
            <button type="button" onClick={submitNote} disabled={busy || !note.trim()}>
              Add
            </button>
          </div>
          {customer.activities.length === 0 ? (
            <p className="inline-note">No activity yet.</p>
          ) : (
            <div>
              {customer.activities.map((act) => (
                <div className="activity-item" key={act.id}>
                  <div>{act.note}</div>
                  <div className="when">{formatDateTime(act.createdAt)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-foot">
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {confirmDelete ? (
              <>
                <button className="danger small" onClick={onDelete}>
                  Confirm delete
                </button>
                <button className="secondary small" onClick={() => setConfirmDelete(false)}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                {customer.status === "archived" ? (
                  <button className="secondary small" onClick={() => onStatusChange("warm_lead")}>
                    Restore
                  </button>
                ) : (
                  <button className="secondary small" onClick={() => onStatusChange("archived")}>
                    Archive
                  </button>
                )}
                <button className="danger small" onClick={() => setConfirmDelete(true)}>
                  Delete
                </button>
              </>
            )}
          </div>
          <button onClick={onEdit}>Edit</button>
        </div>
      </div>
    </div>
  );
}
