import { SetupNotice } from "@/components/admin/Setup";
import { StatusBadge, TriggerBadge } from "@/components/admin/triggers";
import { Card, Empty, PageHeader, cx, nf } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/tracking/adminAuth";
import { type Row, hasDb } from "@/lib/tracking/db";
import { fmtDateTime } from "@/lib/tracking/format";
import { smtpConfigured } from "@/lib/tracking/mail";
import { listNotifications } from "@/lib/tracking/queries";
import Link from "next/link";
import { LuBell, LuTriangleAlert } from "react-icons/lu";
import styles from "../../admin.module.scss";

function LogRow({ n }: { n: Row }) {
  const content = (
    <>
      <span className={cx(styles.muted, styles.lTime)}>{fmtDateTime(n.sent_at)}</span>
      <span className={styles.lType}>
        <TriggerBadge type={n.trigger_type} />
      </span>
      <span className={cx(styles.cellStack, styles.lBody)}>
        <span className={styles.truncate}>{n.subject || n.reason}</span>
        <small>
          Why: {n.reason}
          {n.recipient ? ` · to ${n.recipient}` : ""}
          {n.error ? ` · error: ${n.error}` : ""}
        </small>
      </span>
      <span className={styles.lStatus}>
        <StatusBadge status={n.status} error={n.error} />
      </span>
    </>
  );
  return n.visitor_id ? (
    <Link href={`/admin/visitors/${n.visitor_id}`} className={styles.logRow}>
      {content}
    </Link>
  ) : (
    <div className={styles.logRow}>{content}</div>
  );
}

export default async function NotificationsPage() {
  await requireAdmin("/admin/notifications");
  if (!hasDb()) return <SetupNotice title="Notifications" />;

  const rows = await listNotifications();
  const failed = rows.filter((n) => n.status === "failed").length;

  return (
    <>
      <PageHeader
        title="Notifications"
        description={
          rows.length
            ? `The last ${nf.format(rows.length)} emails, and why each one was sent`
            : "Every email this system sends, and why"
        }
      />

      {!smtpConfigured() && (
        <div className={styles.notice} role="alert">
          <LuTriangleAlert aria-hidden />
          <div>
            <strong>Emails cannot be sent yet.</strong> The SMTP settings are missing on the server.
            Add <code>SMTP_HOST</code>, <code>SMTP_PORT</code>, <code>SMTP_USER</code> and{" "}
            <code>SMTP_PASS</code> in Vercel, then redeploy.
          </div>
        </div>
      )}
      {smtpConfigured() && failed > 0 && (
        <div className={styles.notice} role="alert">
          <LuTriangleAlert aria-hidden />
          <div>
            <strong>
              {failed} {failed === 1 ? "email" : "emails"} failed.
            </strong>{" "}
            Hover a “Failed” label to see the reason, or send a test email from Settings.
          </div>
        </div>
      )}

      <Card flush>
        {rows.length ? (
          rows.map((n) => <LogRow key={n.id} n={n} />)
        ) : (
          <Empty icon={<LuBell aria-hidden />} title="No emails sent yet">
            Alerts are only sent for visitors who come from Instagram.
          </Empty>
        )}
      </Card>
    </>
  );
}
