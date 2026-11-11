import { db, hasDb } from "./db";

export const DEFAULT_ALERT_EMAIL = "williampetersencop@gmail.com";

export const SETTING_DEFAULTS = {
  trigger_new_visitor: "true",
  trigger_returning_visitor: "true",
  trigger_high_interest: "true",
  trigger_form_abandoned: "true",
  trigger_form_submitted: "true",
  trigger_session_summary: "true",
  trigger_daily_digest: "true",
  high_interest_pages: "3",
  high_interest_seconds: "120",
  pricing_paths: "/price",
  arrival_rate_limit_minutes: "30",
  max_emails_per_hour: "30",
  session_timeout_minutes: "15",
  alert_email_to: "",
  retention_days: "90",
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type Settings = Record<SettingKey, string>;

export async function getSettings(): Promise<Settings> {
  const merged: Settings = { ...SETTING_DEFAULTS };
  if (!hasDb()) return merged;
  const rows = await db()`SELECT key, value FROM settings`;
  for (const row of rows) {
    if (row.key in merged) merged[row.key as SettingKey] = row.value;
  }
  return merged;
}

export async function saveSettings(values: Partial<Settings>) {
  for (const [key, value] of Object.entries(values)) {
    if (!(key in SETTING_DEFAULTS) || value === undefined) continue;
    await db()`
      INSERT INTO settings (key, value) VALUES (${key}, ${String(value)})
      ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`;
  }
}

export const isOn = (s: Settings, key: SettingKey) => s[key] === "true";

export function num(s: Settings, key: SettingKey, min: number, max: number) {
  const n = Number.parseInt(s[key], 10);
  const fallback = Number.parseInt(SETTING_DEFAULTS[key], 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

export function alertRecipient(s: Settings) {
  return s.alert_email_to.trim() || process.env.ALERT_EMAIL_TO || DEFAULT_ALERT_EMAIL;
}

/** Public address of the site, used for links inside emails. */
export function siteOrigin(requestOrigin?: string | null) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, "");
  if (requestOrigin) return requestOrigin.replace(/\/+$/, "");
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return "http://localhost:3000";
}
