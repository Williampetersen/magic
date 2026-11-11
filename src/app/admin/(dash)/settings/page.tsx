import { SetupNotice } from "@/components/admin/Setup";
import { Card, PageHeader, cx, nf } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/tracking/adminAuth";
import { hasDb } from "@/lib/tracking/db";
import { smtpConfigured } from "@/lib/tracking/mail";
import { tableCounts } from "@/lib/tracking/queries";
import { DEFAULT_ALERT_EMAIL, getSettings } from "@/lib/tracking/settings";
import { LuCircleCheck, LuCircleMinus, LuCircleX } from "react-icons/lu";
import styles from "../../admin.module.scss";
import { SettingsForm } from "./SettingsForm";

function Check({
  state,
  title,
  children,
}: {
  state: "ok" | "bad" | "off";
  title: string;
  children: React.ReactNode;
}) {
  const Icon = state === "ok" ? LuCircleCheck : state === "bad" ? LuCircleX : LuCircleMinus;
  const word = state === "ok" ? "Ready" : state === "bad" ? "Missing" : "Not used";
  return (
    <li
      className={cx(
        styles.statusRow,
        state === "ok" ? styles.statusOk : state === "bad" ? styles.statusBad : styles.statusOff,
      )}
    >
      <Icon aria-label={word} />
      <div>
        {title}
        <small>{children}</small>
      </div>
    </li>
  );
}

export default async function SettingsPage() {
  await requireAdmin("/admin/settings");
  if (!hasDb()) return <SetupNotice title="Settings" />;

  const [settings, counts] = await Promise.all([getSettings(), tableCounts()]);
  const env = process.env;

  return (
    <>
      <PageHeader title="Settings" description="Email alerts, thresholds and data retention." />

      <div className={styles.formStack}>
        <Card title="System status" description="What is set up on the server">
          <ul className={styles.status}>
            <Check state="ok" title="Database">
              Connected. {nf.format(counts.visitors)} visitors, {nf.format(counts.sessions)} visits,{" "}
              {nf.format(counts.leads)} leads, {nf.format(counts.notifications)} emails logged.
            </Check>
            <Check state={smtpConfigured() ? "ok" : "bad"} title="Email sending (SMTP)">
              {smtpConfigured()
                ? "SMTP is configured. Use “Send test email” below to check it."
                : "No emails can be sent, including the contact form. Add SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASS in Vercel."}
            </Check>
            <Check state={env.CRON_SECRET ? "ok" : "bad"} title="Daily jobs (CRON_SECRET)">
              {env.CRON_SECRET
                ? "The daily digest, visit summaries and automatic cleanup can run."
                : "Without CRON_SECRET the daily digest and the automatic deletion of old data do not run."}
            </Check>
            <Check state={env.IP_HASH_SALT ? "ok" : "bad"} title="IP fingerprint (IP_HASH_SALT)">
              {env.IP_HASH_SALT
                ? "Returning visitors can be recognised without storing their IP address."
                : "Without IP_HASH_SALT returning visitors are only recognised by cookie."}
            </Check>
            <Check
              state={env.ADMIN_SESSION_SECRET ? "ok" : "off"}
              title="Login cookie key (ADMIN_SESSION_SECRET)"
            >
              {env.ADMIN_SESSION_SECRET
                ? "The login cookie is signed with its own secret."
                : "Optional. The login cookie is signed with a key made from your password."}
            </Check>
            <Check
              state={env.IPINFO_TOKEN ? "ok" : "off"}
              title="Internet provider lookup (IPINFO_TOKEN)"
            >
              {env.IPINFO_TOKEN
                ? "The visitor’s internet provider is looked up at ipinfo.io."
                : "Optional. Add a free ipinfo.io token to see each visitor’s internet provider."}
            </Check>
          </ul>
        </Card>
      </div>

      <div style={{ height: 16 }} />
      <SettingsForm
        initial={settings}
        defaultEmail={process.env.ALERT_EMAIL_TO || DEFAULT_ALERT_EMAIL}
      />
    </>
  );
}
