import { useState } from "react";
import type {
  Customer,
  CustomerInput,
  Requirement,
  TransactionType,
  PropertyType,
  ContactMode,
  CustomerStatus,
} from "@shared/index";
import {
  PROPERTY_TYPES,
  CUSTOMER_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
  CONTACT_MODE_LABELS,
  SG_DISTRICTS,
} from "@shared/index";

type ReqDraft = Omit<Requirement, "id"> & { _key: string };

interface Props {
  initial?: Customer;
  onSave: (input: CustomerInput) => Promise<void>;
  onClose: () => void;
}

const STATUSES: CustomerStatus[] = ["active", "warm_lead", "cold_lead", "archived"];
const TX_TYPES: TransactionType[] = ["WTB", "WTS", "WTR", "WTL"];
const CONTACT_MODES: ContactMode[] = ["call", "whatsapp", "sms", "email", "wechat", "telegram"];

let keyCounter = 0;
const nextKey = () => `r${Date.now()}_${keyCounter++}`;

function parseMoney(v: string): number | undefined {
  const cleaned = v.replace(/[,$\s]/g, "").toLowerCase();
  if (!cleaned) return undefined;
  const mMatch = cleaned.match(/^([\d.]+)m$/);
  if (mMatch) return Math.round(parseFloat(mMatch[1]) * 1_000_000);
  const kMatch = cleaned.match(/^([\d.]+)k$/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

export function CustomerForm({ initial, onSave, onClose }: Props) {
  const [preferredName, setPreferredName] = useState(initial?.preferredName ?? "");
  const [fullName, setFullName] = useState(initial?.fullName ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(initial?.dateOfBirth ?? "");
  const [contactNumber, setContactNumber] = useState(initial?.contactNumber ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [source, setSource] = useState(initial?.source ?? "");
  const [status, setStatus] = useState<CustomerStatus>(initial?.status ?? "warm_lead");
  const [preferredContactMode, setPreferredContactMode] = useState<ContactMode | "">(
    initial?.preferredContactMode ?? "",
  );
  const [preferredContactTiming, setPreferredContactTiming] = useState(
    initial?.preferredContactTiming ?? "",
  );
  const [followUpDate, setFollowUpDate] = useState(initial?.followUpDate ?? "");
  const [followUpNote, setFollowUpNote] = useState(initial?.followUpNote ?? "");
  // Build initial requirement drafts and their budget-text map together so the
  // budget inputs are keyed by the same _key as the requirement.
  const [initialReqs] = useState<ReqDraft[]>(() =>
    (initial?.requirements ?? []).map((r) => ({ ...r, _key: nextKey() })),
  );
  const [requirements, setRequirements] = useState<ReqDraft[]>(initialReqs);
  const [budgetText, setBudgetText] = useState<Record<string, { min: string; max: string }>>(() => {
    const m: Record<string, { min: string; max: string }> = {};
    initialReqs.forEach((r) => {
      m[r._key] = {
        min: r.budgetMin != null ? String(r.budgetMin) : "",
        max: r.budgetMax != null ? String(r.budgetMax) : "",
      };
    });
    return m;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addRequirement() {
    const key = nextKey();
    setRequirements((rs) => [...rs, { _key: key, transactionType: "WTB" }]);
    setBudgetText((b) => ({ ...b, [key]: { min: "", max: "" } }));
  }

  function updateReq(key: string, patch: Partial<ReqDraft>) {
    setRequirements((rs) => rs.map((r) => (r._key === key ? { ...r, ...patch } : r)));
  }

  function removeReq(key: string) {
    setRequirements((rs) => rs.filter((r) => r._key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!preferredName.trim()) {
      setError("Preferred name is required.");
      return;
    }
    const cleanedReqs = requirements.map(({ _key, ...r }) => {
      const bt = budgetText[_key] ?? { min: "", max: "" };
      const budgetMin = parseMoney(bt.min);
      const budgetMax = parseMoney(bt.max);
      return {
        ...r,
        budgetMin,
        budgetMax,
        propertyType: r.propertyType || undefined,
        districtCode: r.districtCode || undefined,
        location: r.location?.trim() || undefined,
        sizeOrRooms: r.sizeOrRooms?.trim() || undefined,
        notes: r.notes?.trim() || undefined,
      };
    });

    const input: CustomerInput = {
      preferredName: preferredName.trim(),
      fullName: fullName.trim() || undefined,
      dateOfBirth: dateOfBirth || undefined,
      contactNumber: contactNumber.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      source: source.trim() || undefined,
      status,
      preferredContactMode: preferredContactMode || undefined,
      preferredContactTiming: preferredContactTiming.trim() || undefined,
      followUpDate: followUpDate || undefined,
      followUpNote: followUpNote.trim() || undefined,
      requirements: cleanedReqs,
    };

    setSaving(true);
    try {
      await onSave(input);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          <div className="modal-head">
            <h2>{initial ? "Edit customer" : "New customer / lead"}</h2>
            <button type="button" className="close-x" onClick={onClose} aria-label="Close">
              ×
            </button>
          </div>

          <div className="modal-body">
            {error && <div className="error-banner">{error}</div>}

            <div className="row">
              <div className="field">
                <label>Preferred name *</label>
                <input
                  value={preferredName}
                  onChange={(e) => setPreferredName(e.target.value)}
                  placeholder="e.g. Mr Tan, Auntie Lim"
                  autoFocus
                />
              </div>
              <div className="field">
                <label>Full name</label>
                <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as CustomerStatus)}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {CUSTOMER_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Date of birth</label>
                <input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label>Contact number</label>
                <input
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  placeholder="e.g. 9123 4567"
                  inputMode="tel"
                />
              </div>
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  inputMode="email"
                />
              </div>
            </div>

            <div className="field">
              <label>Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>

            <div className="field">
              <label>How you know this customer</label>
              <input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. referral from Jane, walk-in at showflat, PropertyGuru"
              />
            </div>

            <div className="row">
              <div className="field">
                <label>Preferred contact mode</label>
                <select
                  value={preferredContactMode}
                  onChange={(e) => setPreferredContactMode(e.target.value as ContactMode | "")}
                >
                  <option value="">—</option>
                  {CONTACT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {CONTACT_MODE_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Preferred contact timing</label>
                <input
                  value={preferredContactTiming}
                  onChange={(e) => setPreferredContactTiming(e.target.value)}
                  placeholder="e.g. weekday evenings, after 6pm"
                />
              </div>
            </div>

            <div className="row">
              <div className="field">
                <label>Next follow-up date</label>
                <input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
              </div>
              <div className="field">
                <label>Follow-up note</label>
                <input
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  placeholder="e.g. call to arrange viewing"
                />
              </div>
            </div>

            <h3 style={{ marginTop: 18 }}>Requirements</h3>
            {requirements.length === 0 && (
              <p className="inline-note">No requirements yet. Add what this customer wants to buy, sell, rent or let.</p>
            )}

            {requirements.map((r) => (
              <div className="req-block" key={r._key}>
                <button type="button" className="ghost small remove" onClick={() => removeReq(r._key)}>
                  Remove
                </button>
                <div className="row">
                  <div className="field">
                    <label>Type</label>
                    <select
                      value={r.transactionType}
                      onChange={(e) => updateReq(r._key, { transactionType: e.target.value as TransactionType })}
                    >
                      {TX_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t} — {TRANSACTION_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Property type</label>
                    <select
                      value={r.propertyType ?? ""}
                      onChange={(e) =>
                        updateReq(r._key, { propertyType: (e.target.value || undefined) as PropertyType })
                      }
                    >
                      <option value="">—</option>
                      {PROPERTY_TYPES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Size / rooms</label>
                    <input
                      value={r.sizeOrRooms ?? ""}
                      onChange={(e) => updateReq(r._key, { sizeOrRooms: e.target.value })}
                      placeholder="e.g. 3-room, 2-bedroom"
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="field">
                    <label>District</label>
                    <select
                      value={r.districtCode ?? ""}
                      onChange={(e) => updateReq(r._key, { districtCode: e.target.value || undefined })}
                    >
                      <option value="">— (auto-detect from location)</option>
                      {SG_DISTRICTS.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.code} · {d.localities.slice(0, 3).join(", ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Location</label>
                    <input
                      value={r.location ?? ""}
                      onChange={(e) => updateReq(r._key, { location: e.target.value })}
                      placeholder="e.g. Sengkang, near Rosyth School"
                    />
                  </div>
                </div>

                <div className="row">
                  <div className="field">
                    <label>Budget min</label>
                    <input
                      value={budgetText[r._key]?.min ?? ""}
                      onChange={(e) =>
                        setBudgetText((b) => ({
                          ...b,
                          [r._key]: { ...(b[r._key] ?? { min: "", max: "" }), min: e.target.value },
                        }))
                      }
                      placeholder="e.g. 500k"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="field">
                    <label>Budget max</label>
                    <input
                      value={budgetText[r._key]?.max ?? ""}
                      onChange={(e) =>
                        setBudgetText((b) => ({
                          ...b,
                          [r._key]: { ...(b[r._key] ?? { min: "", max: "" }), max: e.target.value },
                        }))
                      }
                      placeholder="e.g. 2m"
                      inputMode="numeric"
                    />
                  </div>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <label>Requirement notes (free text)</label>
                  <textarea
                    value={r.notes ?? ""}
                    onChange={(e) => updateReq(r._key, { notes: e.target.value })}
                    placeholder="e.g. WTB condo below $2M; looking for 2-room HDB near Rosyth School"
                  />
                </div>
              </div>
            ))}

            <button type="button" className="secondary small" onClick={addRequirement}>
              + Add requirement
            </button>
          </div>

          <div className="modal-foot">
            <button type="button" className="secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" disabled={saving}>
              {saving ? "Saving…" : initial ? "Save changes" : "Create customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
