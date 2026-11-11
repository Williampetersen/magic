"use server";

import { isAdmin, requestOrigin } from "@/lib/tracking/adminAuth";
import {
  ADMIN_COOKIE,
  adminConfigured,
  createSessionToken,
  passwordMatches,
  safeNextPath,
} from "@/lib/tracking/adminToken";
import { db, hasDb } from "@/lib/tracking/db";
import { clientIp, hashIp, isUuid } from "@/lib/tracking/detect";
import { testEmail } from "@/lib/tracking/emails";
import { sendMail } from "@/lib/tracking/mail";
import {
  SETTING_DEFAULTS,
  type SettingKey,
  type Settings,
  alertRecipient,
  getSettings,
  saveSettings,
} from "@/lib/tracking/settings";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export type LoginState = { error: string };
export type ActionResult = { ok: boolean; message: string };

const MAX_FAILED_LOGINS = 8;

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  if (!adminConfigured()) {
    return { error: "ADMIN_PASSWORD is not set on the server yet." };
  }

  // Slow down password guessing: 8 wrong tries per 15 minutes per network.
  const ipHash = hashIp(clientIp(await headers())) || "unknown";
  let throttle = hasDb();
  if (throttle) {
    try {
      const [{ count }] = await db()`
        SELECT count(*)::int AS count FROM admin_login_attempts
        WHERE ip_hash = ${ipHash} AND attempted_at > now() - interval '15 minutes'`;
      if (count >= MAX_FAILED_LOGINS) {
        return { error: "Too many wrong attempts. Try again in 15 minutes." };
      }
    } catch {
      throttle = false;
    }
  }

  if (!passwordMatches(String(formData.get("password") || ""))) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    if (throttle) {
      await db()`INSERT INTO admin_login_attempts (ip_hash) VALUES (${ipHash})`.catch(() => {});
    }
    return { error: "Wrong password." };
  }

  const token = createSessionToken();
  (await cookies()).set(ADMIN_COOKIE, token.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: token.maxAge,
  });
  redirect(safeNextPath(formData.get("next")));
}

export async function logoutAction() {
  (await cookies()).delete(ADMIN_COOKIE);
  redirect("/admin/login");
}

const SWITCHES: SettingKey[] = [
  "trigger_new_visitor",
  "trigger_returning_visitor",
  "trigger_high_interest",
  "trigger_form_abandoned",
  "trigger_form_submitted",
  "trigger_session_summary",
  "trigger_daily_digest",
];

const NUMBERS: Partial<Record<SettingKey, [number, number]>> = {
  high_interest_pages: [1, 50],
  high_interest_seconds: [10, 3600],
  arrival_rate_limit_minutes: [0, 1440],
  max_emails_per_hour: [1, 500],
  session_timeout_minutes: [5, 120],
  retention_days: [7, 730],
};

export async function saveSettingsAction(values: Record<string, string>): Promise<ActionResult> {
  if (!(await isAdmin())) return { ok: false, message: "Please log in again." };
  if (!hasDb()) return { ok: false, message: "The database is not connected." };

  const clean: Partial<Settings> = {};
  for (const key of SWITCHES) {
    if (key in values) clean[key] = values[key] === "true" ? "true" : "false";
  }
  for (const [key, range] of Object.entries(NUMBERS) as [SettingKey, [number, number]][]) {
    if (!(key in values)) continue;
    const n = Math.round(Number(values[key]));
    if (!Number.isFinite(n) || n < range[0] || n > range[1]) {
      return {
        ok: false,
        message: `"${key.replaceAll("_", " ")}" must be between ${range[0]} and ${range[1]}.`,
      };
    }
    clean[key] = String(n);
  }
  if ("alert_email_to" in values) {
    const email = values.alert_email_to.trim();
    if (email && !/^[^\s@,]+@[^\s@,]+\.[^\s@,]+$/.test(email)) {
      return { ok: false, message: "The notification email address is not valid." };
    }
    clean.alert_email_to = email;
  }
  if ("pricing_paths" in values) {
    clean.pricing_paths = values.pricing_paths
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => (p.startsWith("/") ? p : `/${p}`))
      .join(", ")
      .slice(0, 300);
  }

  await saveSettings(clean);
  revalidatePath("/admin/settings");
  revalidatePath("/privacy");
  return { ok: true, message: "Settings saved." };
}

export async function sendTestEmailAction(): Promise<ActionResult> {
  if (!(await isAdmin())) return { ok: false, message: "Please log in again." };
  const settings = hasDb() ? await getSettings() : { ...SETTING_DEFAULTS };
  const to = alertRecipient(settings);
  const mail = testEmail(await requestOrigin());
  let error: string | null = null;
  try {
    await sendMail({ to, ...mail });
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }
  if (hasDb()) {
    await db()`
      INSERT INTO notifications (trigger_type, dedupe_key, recipient, subject, reason, status, error)
      VALUES ('test', ${`test:${Date.now()}`}, ${to}, ${mail.subject},
              'Test email sent from Settings', ${error ? "failed" : "sent"}, ${error})`;
    revalidatePath("/admin/notifications");
  }
  return error
    ? { ok: false, message: `Could not send: ${error}` }
    : { ok: true, message: `Test email sent to ${to}.` };
}

/** GDPR erasure: removes a visitor with every visit, page view, click and linked lead. */
export async function deleteVisitorAction(formData: FormData) {
  if (!(await isAdmin())) redirect("/admin/login");
  const id = formData.get("id");
  if (isUuid(id)) {
    await db()`DELETE FROM leads WHERE visitor_id = ${id}`;
    await db()`DELETE FROM notifications WHERE visitor_id = ${id}`;
    await db()`DELETE FROM visitors WHERE id = ${id}`;
  }
  revalidatePath("/admin", "layout");
  redirect("/admin/visitors");
}

export async function deleteLeadAction(formData: FormData) {
  if (!(await isAdmin())) redirect("/admin/login");
  const id = Number(formData.get("id"));
  if (Number.isInteger(id) && id > 0) {
    const [lead] = await db()`DELETE FROM leads WHERE id = ${id} RETURNING visitor_id, session_id`;
    if (lead?.visitor_id) {
      await db()`
        UPDATE visitors SET linked_lead_name = NULL, linked_lead_email = NULL, linked_lead_phone = NULL
        WHERE id = ${lead.visitor_id}`;
    }
    await db()`DELETE FROM notifications WHERE dedupe_key = ${`lead:${id}`}`;
  }
  revalidatePath("/admin/leads");
}
