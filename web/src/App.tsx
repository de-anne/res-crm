import { useCallback, useEffect, useState } from "react";
import type {
  Customer,
  CustomerInput,
  SearchParams,
  Alert,
  CustomerStatus,
  TransactionType,
} from "@shared/index";
import {
  CUSTOMER_STATUS_LABELS,
  TRANSACTION_TYPE_LABELS,
  SG_DISTRICTS,
} from "@shared/index";
import { api, clearToken, getToken } from "./api";
import { loadAlertSettings, saveAlertSettings, type AlertSettings } from "./settings";
import { Login } from "./Login";
import { Dashboard } from "./Dashboard";
import { CustomerForm } from "./CustomerForm";
import { CustomerDetail } from "./CustomerDetail";
import { summariseRequirement } from "./format";

type View = "dashboard" | "customers";

const TX_TYPES: TransactionType[] = ["WTB", "WTS", "WTR", "WTL"];
const STATUSES: CustomerStatus[] = ["active", "warm_lead", "cold_lead"];

function parseMoney(v: string): number | undefined {
  const cleaned = v.replace(/[,$\s]/g, "").toLowerCase();
  if (!cleaned) return undefined;
  const m = cleaned.match(/^([\d.]+)m$/);
  if (m) return Math.round(parseFloat(m[1]) * 1_000_000);
  const k = cleaned.match(/^([\d.]+)k$/);
  if (k) return Math.round(parseFloat(k[1]) * 1000);
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

export default function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [view, setView] = useState<View>("dashboard");

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertSettings, setAlertSettings] = useState<AlertSettings>(() => loadAlertSettings());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search / filter state
  const [q, setQ] = useState("");
  const [districtCode, setDistrictCode] = useState("");
  const [location, setLocation] = useState("");
  const [txType, setTxType] = useState<TransactionType | "">("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "">("");
  const [budgetMin, setBudgetMin] = useState("");
  const [budgetMax, setBudgetMax] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [editing, setEditing] = useState<Customer | "new" | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const buildParams = useCallback((): SearchParams => {
    return {
      q: q.trim() || undefined,
      districtCode: districtCode || undefined,
      location: location.trim() || undefined,
      transactionType: txType ? [txType] : undefined,
      status: statusFilter ? [statusFilter] : undefined,
      budgetMin: parseMoney(budgetMin),
      budgetMax: parseMoney(budgetMax),
      includeArchived,
    };
  }, [q, districtCode, location, txType, statusFilter, budgetMin, budgetMax, includeArchived]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, al] = await Promise.all([
        api.search(buildParams()),
        api.alerts(alertSettings.birthdayWindow, alertSettings.followUpWindow),
      ]);
      setCustomers(list);
      setAlerts(al);
    } catch (e) {
      if (e instanceof Error && e.message.includes("log in")) {
        clearToken();
        setAuthed(false);
      } else {
        setError(e instanceof Error ? e.message : "Failed to load.");
      }
    } finally {
      setLoading(false);
    }
  }, [buildParams, alertSettings]);

  // Persist + refresh alerts when the user changes the alert windows.
  function handleSettingsChange(s: AlertSettings) {
    setAlertSettings(s);
    saveAlertSettings(s);
    api
      .alerts(s.birthdayWindow, s.followUpWindow)
      .then(setAlerts)
      .catch(() => {});
  }

  useEffect(() => {
    if (authed) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  // Debounced reload when search inputs change.
  useEffect(() => {
    if (!authed) return;
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [q, districtCode, location, txType, statusFilter, budgetMin, budgetMax, includeArchived, authed, load]);

  const detailCustomer = customers.find((c) => c.id === detailId) ?? null;

  async function handleSave(input: CustomerInput) {
    if (editing === "new") {
      await api.create(input);
    } else if (editing) {
      await api.update(editing.id, input);
    }
    setEditing(null);
    await load();
  }

  async function handleStatusChange(id: string, status: CustomerStatus) {
    await api.setStatus(id, status);
    await load();
  }

  async function handleDelete(id: string) {
    await api.remove(id);
    setDetailId(null);
    await load();
  }

  async function handleAddActivity(id: string, note: string) {
    const updated = await api.addActivity(id, note);
    setCustomers((cs) => cs.map((c) => (c.id === id ? updated : c)));
  }

  function clearSearch() {
    setQ("");
    setDistrictCode("");
    setLocation("");
    setTxType("");
    setStatusFilter("");
    setBudgetMin("");
    setBudgetMax("");
    setIncludeArchived(false);
  }

  async function exportExcel() {
    try {
      await api.downloadExport(buildParams());
    } catch {
      setError("Export failed. Please try again.");
    }
  }

  if (!authed) {
    return <Login onAuthed={() => setAuthed(true)} />;
  }

  const hasActiveFilters =
    !!q || !!districtCode || !!location || !!txType || !!statusFilter || !!budgetMin || !!budgetMax || includeArchived;

  return (
    <div>
      <header className="app-header">
        <div className="brand">
          🏠 <span className="full">SG Real Estate CRM</span>
        </div>
        <nav>
          <button className={view === "dashboard" ? "active" : ""} onClick={() => setView("dashboard")}>
            Dashboard
          </button>
          <button className={view === "customers" ? "active" : ""} onClick={() => setView("customers")}>
            Customers
          </button>
          <button
            onClick={() => {
              clearToken();
              setAuthed(false);
            }}
          >
            Sign out
          </button>
        </nav>
      </header>

      <div className="container">
        {error && <div className="error-banner">{error}</div>}

        {view === "dashboard" ? (
          <Dashboard
            alerts={alerts}
            customers={customers.filter((c) => c.status !== "archived")}
            settings={alertSettings}
            onSettingsChange={handleSettingsChange}
            onOpenCustomer={(id) => {
              setView("customers");
              setDetailId(id);
            }}
          />
        ) : (
          <>
            <div className="toolbar">
              <div className="grow">
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search e.g. buy 3 room condo Sengkang, name, phone…"
                />
              </div>
              <button className="secondary" onClick={() => setShowFilters((s) => !s)}>
                {showFilters ? "Hide filters" : "Filters"}
              </button>
              <button className="secondary" onClick={exportExcel} title="Export current results to Excel">
                ⬇ Export Excel
              </button>
              <button onClick={() => setEditing("new")}>+ New</button>
            </div>

            {showFilters && (
              <div className="card">
                <div className="row">
                  <div className="field">
                    <label>District</label>
                    <select value={districtCode} onChange={(e) => setDistrictCode(e.target.value)}>
                      <option value="">Any district</option>
                      {SG_DISTRICTS.map((d) => (
                        <option key={d.code} value={d.code}>
                          {d.code} · {d.localities.slice(0, 2).join(", ")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Location contains</label>
                    <input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Whampoa, Rosyth"
                    />
                  </div>
                  <div className="field">
                    <label>Looking to</label>
                    <select value={txType} onChange={(e) => setTxType(e.target.value as TransactionType | "")}>
                      <option value="">Any</option>
                      {TX_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t} — {TRANSACTION_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="row">
                  <div className="field">
                    <label>Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as CustomerStatus | "")}
                    >
                      <option value="">Any status</option>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {CUSTOMER_STATUS_LABELS[s]}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>Budget min</label>
                    <input value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} placeholder="e.g. 500k" />
                  </div>
                  <div className="field">
                    <label>Budget max</label>
                    <input value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} placeholder="e.g. 2m" />
                  </div>
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    style={{ width: "auto" }}
                    checked={includeArchived}
                    onChange={(e) => setIncludeArchived(e.target.checked)}
                  />
                  Include archived
                </label>
                {hasActiveFilters && (
                  <button className="ghost small" style={{ marginTop: 10 }} onClick={clearSearch}>
                    Clear all
                  </button>
                )}
              </div>
            )}

            <div style={{ margin: "6px 2px 12px", color: "var(--muted)", fontSize: 13 }}>
              {loading ? "Loading…" : `${customers.length} result${customers.length === 1 ? "" : "s"}`}
            </div>

            {customers.length === 0 && !loading ? (
              <div className="empty">
                {hasActiveFilters ? "No customers match your search." : "No customers yet. Click “+ New” to add your first lead."}
              </div>
            ) : (
              <div className="customer-grid">
                {customers.map((c) => (
                  <div className="customer-card" key={c.id} onClick={() => setDetailId(c.id)}>
                    <div className="top">
                      <div>
                        <div className="name">{c.preferredName}</div>
                        {c.fullName && <div className="sub">{c.fullName}</div>}
                      </div>
                      <span className={`badge ${c.status}`}>{CUSTOMER_STATUS_LABELS[c.status]}</span>
                    </div>
                    {c.contactNumber && <div className="meta-line">📱 {c.contactNumber}</div>}
                    {c.requirements.length > 0 && (
                      <div className="reqs">
                        {c.requirements.slice(0, 2).map((r) => (
                          <div key={r.id}>• {summariseRequirement(r)}</div>
                        ))}
                        {c.requirements.length > 2 && (
                          <div className="inline-note">+{c.requirements.length - 2} more</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {editing && (
        <CustomerForm
          initial={editing === "new" ? undefined : editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {detailCustomer && !editing && (
        <CustomerDetail
          customer={detailCustomer}
          onClose={() => setDetailId(null)}
          onEdit={() => setEditing(detailCustomer)}
          onStatusChange={(s) => handleStatusChange(detailCustomer.id, s)}
          onDelete={() => handleDelete(detailCustomer.id)}
          onAddActivity={(note) => handleAddActivity(detailCustomer.id, note)}
        />
      )}
    </div>
  );
}
