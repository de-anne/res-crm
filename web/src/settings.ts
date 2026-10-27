/** User-adjustable alert window preferences, persisted in localStorage. */

export interface AlertSettings {
  birthdayWindow: number; // days ahead to show upcoming birthdays
  followUpWindow: number; // days ahead to show upcoming follow-ups
}

const KEY = "crm_alert_settings";

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  birthdayWindow: 3,
  followUpWindow: 7,
};

export function loadAlertSettings(): AlertSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_ALERT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AlertSettings>;
    return {
      birthdayWindow: clamp(parsed.birthdayWindow, DEFAULT_ALERT_SETTINGS.birthdayWindow),
      followUpWindow: clamp(parsed.followUpWindow, DEFAULT_ALERT_SETTINGS.followUpWindow),
    };
  } catch {
    return { ...DEFAULT_ALERT_SETTINGS };
  }
}

export function saveAlertSettings(s: AlertSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s));
}

function clamp(v: unknown, fallback: number): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(365, Math.max(0, Math.round(n)));
}
