import { SetupNotice } from "@/components/admin/Setup";
import {
  Badge,
  Card,
  Empty,
  PLACEMENT_COLORS,
  PageHeader,
  StatTile,
  cx,
  nf,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/tracking/adminAuth";
import { type Row, hasDb } from "@/lib/tracking/db";
import { placementLabel } from "@/lib/tracking/format";
import { linkPerformance } from "@/lib/tracking/queries";
import { routes } from "@/resources";
import { LuLink } from "react-icons/lu";
import styles from "../../admin.module.scss";
import { LinkBuilder } from "./LinkBuilder";

function linkName(row: Row) {
  const placement = row.placement === "unknown" ? "Untagged" : placementLabel(row.placement);
  return row.campaign ? `${placement} · ${row.campaign}` : placement;
}

export default async function LinksPage() {
  await requireAdmin("/admin/links");
  if (!hasDb()) return <SetupNotice title="Link builder" />;

  const rows = await linkPerformance();
  const max = Math.max(...rows.map((r) => r.visits), 1);
  const topVisits = rows[0];
  const topLeads = [...rows].sort((a, b) => b.leads - a.leads)[0];
  const pages = Object.entries(routes)
    .filter(([path, enabled]) => enabled && path !== "/privacy")
    .map(([path]) => path);

  return (
    <>
      <PageHeader
        title="Link builder"
        description="Tagged links tell you which bio link, story, post or DM a visitor came from."
      />

      <div className={styles.grid}>
        <Card
          className={styles.col12}
          title="Your Instagram links"
          description="Copy the right link for each place. The links open the same page, only the tag differs."
        >
          <LinkBuilder
            pages={pages}
            defaultBase={process.env.SITE_URL?.replace(/\/+$/, "") || ""}
          />
        </Card>

        {rows.length > 0 && (
          <div className={cx(styles.col12, styles.stats)}>
            <StatTile
              compact
              label="Most visitors"
              value={linkName(topVisits)}
              hint={`${nf.format(topVisits.visits)} visits from ${nf.format(topVisits.visitors)} visitors`}
            />
            <StatTile
              compact
              label="Most leads"
              value={topLeads.leads ? linkName(topLeads) : "No leads yet"}
              hint={
                topLeads.leads
                  ? `${nf.format(topLeads.leads)} ${topLeads.leads === 1 ? "lead" : "leads"} from ${nf.format(topLeads.visits)} visits`
                  : "Leads appear when a visitor sends the contact form"
              }
            />
          </div>
        )}

        <Card
          className={styles.col12}
          title="Which link works best"
          description="All Instagram visits in the stored period, grouped by link"
          flush
        >
          {rows.length ? (
            <>
              <div className={styles.perfHead}>
                <span>Link</span>
                <span className={styles.right}>Visits</span>
                <span className={cx(styles.right, styles.hideSmall)}>Visitors</span>
                <span className={styles.right}>Leads</span>
                <span className={cx(styles.right, styles.hideSmall)}>Lead rate</span>
              </div>
              {rows.map((r) => (
                <div key={`${r.placement}-${r.campaign}-${r.tagged}`} className={styles.perfRow}>
                  <div className={styles.perfName}>
                    <div className={styles.perfLabel}>
                      <Badge dot={PLACEMENT_COLORS[r.placement] || PLACEMENT_COLORS.unknown}>
                        {r.placement === "unknown" ? "Untagged" : placementLabel(r.placement)}
                      </Badge>
                      <span className={r.campaign ? styles.strong : styles.muted}>
                        {r.campaign ||
                          (r.tagged ? "No campaign name" : "Instagram app or referrer, no tag")}
                      </span>
                    </div>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${(r.visits / max) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className={cx(styles.right, styles.strong)}>{nf.format(r.visits)}</span>
                  <span className={cx(styles.right, styles.hideSmall)}>
                    {nf.format(r.visitors)}
                  </span>
                  <span className={cx(styles.right, styles.strong)}>{nf.format(r.leads)}</span>
                  <span className={cx(styles.right, styles.muted, styles.hideSmall)}>
                    {r.visits ? `${((r.leads / r.visits) * 100).toFixed(1)}%` : "–"}
                  </span>
                </div>
              ))}
            </>
          ) : (
            <Empty icon={<LuLink aria-hidden />} title="No Instagram visits yet">
              Share the links above. Results appear here after the first visit.
            </Empty>
          )}
        </Card>
      </div>
    </>
  );
}
