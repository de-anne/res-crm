import { useState } from "react";
import type { Alert, Customer } from "@shared/index";
import { formatDate } from "./format";
import type { AlertSettings } from "./settings";

interface Props {
  alerts: Alert[];
  customers: Customer[];
  settings: AlertSettings;
  onSettingsChange: (s: AlertSettings) => void;
  onOpenCustomer: (id: string) => void;
}

export function Dashboard({
  alerts,
  customers,
  settings,
  onSettingsChange,
  onOpenCustomer,
}: Props) {
  const [showSettings, setShowSettings] = useState(false);
  const active = customers.filter((c) => c.status === "active").length;
  const warm = customers.filter((c) => c.status === "warm_lead").length;
  const cold = customers.filter((c) => c.status === "cold_lead").length;

  const birthdays = alerts.filter((a) => a.kind === "birthday");
  const followups = alerts.filter((a) => a.kind === "followup");

  return (
    <div>
      <div className="stat-row" style={{ marginBottom: 16 }}>
        <div className="stat">
          <div className="n">{customers.length}</div>
          <div className="l">Total contacts</div>
        </div>
        <div className="stat">
          <div className="n" style={{ color: "var(--active)" }}>{active}</div>
          <div className="l">Active customers</div>
        </div>
        <div className="stat">
          <div className="n" style={{ color: "var(--warm)" }}>{warm}</div>
          <div className="l">Warm leads</div>
        </div>
        <div className="stat">
          <div className="n" style={{ color: "var(--cold)" }}>{cold}</div>
          <div className="l">Cold leads</div>
        </div>
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>🔔 Alert settings</h2>
          <button className="ghost small" onClick={() => setShowSettings((s) => !s)}>
            {showSettings ? "Hide" : "Adjust"}
          </button>
        </div>
        {showSettings ? (
          <div style={{ marginTop: 12 }}>
            <div className="row">
              <div className="field">
                <label>Show birthdays within (days)</label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={settings.birthdayWindow}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, birthdayWindow: clampInput(e.target.value) })
                  }
                />
              </div>
              <div className="field">
                <label>Show follow-ups within (days)</label>
                <input
                  type="number"
                  min={0}
                  max={365}
                  value={settings.followUpWindow}
                  onChange={(e) =>
                    onSettingsChange({ ...settings, followUpWindow: clampInput(e.target.value) })
                  }
                />
              </div>
            </div>
            <p className="inline-note" style={{ marginTop: 0 }}>
              Overdue follow-ups always appear regardless of the window.
            </p>
          </div>
        ) : (
          <p className="inline-note" style={{ marginBottom: 0, marginTop: 8 }}>
            Birthdays within {settings.birthdayWindow} day{settings.birthdayWindow === 1 ? "" : "s"},
            follow-ups within {settings.followUpWindow} day{settings.followUpWindow === 1 ? "" : "s"}.
          </p>
        )}
      </div>

      <div className="card">
        <h2>🎂 Upcoming birthdays</h2>
        {birthdays.length === 0 ? (
          <p className="inline-note">
            No birthdays in the next {settings.birthdayWindow} day
            {settings.birthdayWindow === 1 ? "" : "s"}.
          </p>
        ) : (
          birthdays.map((a) => (
            <div
              key={`b-${a.customerId}`}
              className="alert-item birthday"
              onClick={() => onOpenCustomer(a.customerId)}
            >
              <span className="icon">🎂</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{a.customerName}</div>
                <div className="detail">
                  {a.detail} · {formatDate(a.date)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2>📞 Follow-ups</h2>
        {followups.length === 0 ? (
          <p className="inline-note">
            No follow-ups due in the next {settings.followUpWindow} day
            {settings.followUpWindow === 1 ? "" : "s"}.
          </p>
        ) : (
          followups.map((a) => (
            <div
              key={`f-${a.customerId}`}
              className={`alert-item ${a.daysAway < 0 ? "overdue" : ""}`}
              onClick={() => onOpenCustomer(a.customerId)}
            >
              <span className="icon">{a.daysAway < 0 ? "⚠️" : "📞"}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600 }}>{a.customerName}</div>
                <div className="detail">{a.detail}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function clampInput(v: string): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.min(365, Math.max(0, Math.round(n)));
}
