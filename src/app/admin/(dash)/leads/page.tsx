import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { SetupNotice } from "@/components/admin/Setup";
import { Badge, Card, Empty, Flag, PageHeader, SourceBadge, cx, nf } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/tracking/adminAuth";
import { hasDb } from "@/lib/tracking/db";
import {
  deviceLabel,
  fmtAgo,
  fmtDateTime,
  fmtDuration,
  locationLabel,
} from "@/lib/tracking/format";
import { listLeads } from "@/lib/tracking/queries";
import Link from "next/link";
import {
  LuArrowRight,
  LuChevronRight,
  LuMail,
  LuPhone,
  LuTrash2,
  LuUserCheck,
} from "react-icons/lu";
import { deleteLeadAction } from "../../actions";
import styles from "../../admin.module.scss";

export default async function LeadsPage() {
  await requireAdmin("/admin/leads");
  if (!hasDb()) return <SetupNotice title="Leads" />;

  const leads = await listLeads();
  const fromInstagram = leads.filter((l) => l.source === "instagram").length;

  return (
    <>
      <PageHeader
        title="Leads"
        description={
          leads.length
            ? `${nf.format(leads.length)} contact ${leads.length === 1 ? "request" : "requests"}, ${nf.format(fromInstagram)} from Instagram`
            : "Everyone who sent the contact form"
        }
      />

      <Card flush>
        {leads.length ? (
          leads.map((lead) => {
            const tracked = Boolean(lead.session_id);
            const journey: string[] = lead.journey || [];
            // The same page can appear twice, so each step gets its own key.
            const seen = new Map<string, number>();
            const steps = journey.slice(0, 12).map((path) => {
              const occurrence = (seen.get(path) ?? 0) + 1;
              seen.set(path, occurrence);
              return {
                path,
                key: `${path}#${occurrence}`,
                first: seen.size === 1 && occurrence === 1,
              };
            });
            return (
              <article key={lead.id} className={styles.leadCard}>
                <div className={styles.leadTop}>
                  <div style={{ minWidth: 0 }}>
                    <div className={styles.leadName}>{lead.name}</div>
                    <div className={styles.leadContact}>
                      <a href={`mailto:${lead.email}`}>
                        <LuMail aria-hidden />
                        {lead.email}
                      </a>
                      {lead.phone && (
                        <a href={`tel:${lead.phone}`}>
                          <LuPhone aria-hidden />
                          {lead.phone}
                        </a>
                      )}
                    </div>
                  </div>
                  <div className={styles.leadWhen}>
                    <span>{fmtAgo(lead.created_at)}</span>
                    <span>{fmtDateTime(lead.created_at)}</span>
                  </div>
                </div>

                <div className={styles.badgeRow}>
                  <Badge>
                    {lead.service} · {lead.plan}
                  </Badge>
                  {tracked ? (
                    <>
                      <SourceBadge session={lead} />
                      <Badge>
                        <Flag code={lead.country_code} title={lead.country} />
                        &nbsp;{locationLabel(lead)}
                      </Badge>
                      <Badge>{deviceLabel(lead)}</Badge>
                      <Badge>
                        {lead.visit_number > 1
                          ? `${lead.visit_number - 1} earlier ${lead.visit_number === 2 ? "visit" : "visits"}`
                          : "First visit"}
                      </Badge>
                      <Badge>{fmtDuration(lead.duration_seconds)} on site</Badge>
                    </>
                  ) : (
                    <Badge title="This person did not accept cookies, so their visit was not tracked.">
                      No tracking details
                    </Badge>
                  )}
                </div>

                {journey.length > 0 && (
                  <div className={styles.journey} aria-label="Pages viewed before contacting you">
                    <span>Journey</span>
                    {steps.map((step) => (
                      <span
                        key={step.key}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                      >
                        {!step.first && <LuArrowRight aria-hidden />}
                        <span className={styles.step}>{step.path}</span>
                      </span>
                    ))}
                    {journey.length > 12 && <span>+{journey.length - 12} more</span>}
                  </div>
                )}

                <div className={styles.filterActions} style={{ marginTop: 12 }}>
                  {lead.visitor_id && (
                    <Link
                      href={`/admin/visitors/${lead.visitor_id}${lead.session_id ? `?visit=${lead.session_id}` : ""}`}
                      className={cx(styles.btn, styles.btnSmall)}
                    >
                      Full journey
                      <LuChevronRight aria-hidden />
                    </Link>
                  )}
                  <form action={deleteLeadAction}>
                    <input type="hidden" name="id" value={lead.id} />
                    <ConfirmSubmit
                      className={cx(styles.btn, styles.btnSmall, styles.btnDanger)}
                      message={`Delete the contact request from ${lead.name}? This cannot be undone.`}
                    >
                      <LuTrash2 aria-hidden />
                      Delete
                    </ConfirmSubmit>
                  </form>
                </div>
              </article>
            );
          })
        ) : (
          <Empty icon={<LuUserCheck aria-hidden />} title="No leads yet">
            When someone sends the contact form, they appear here with their source and the pages
            they viewed first.
          </Empty>
        )}
      </Card>
    </>
  );
}
