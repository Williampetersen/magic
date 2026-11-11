import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { SetupNotice } from "@/components/admin/Setup";
import { type DayPoint, TimeChart } from "@/components/admin/TimeChart";
import { WorldMap } from "@/components/admin/WorldMap";
import {
  BarList,
  Card,
  Delta,
  DeviceIcon,
  Empty,
  Flag,
  LinkTabs,
  PLACEMENT_COLORS,
  PLACEMENT_ORDER,
  PageHeader,
  SegmentedBar,
  SourceBadge,
  StatTile,
  deviceTypeLabel,
  nf,
} from "@/components/admin/ui";
import { requestOrigin, requireAdmin } from "@/lib/tracking/adminAuth";
import { hasDb } from "@/lib/tracking/db";
import { deviceName, fmtAgo, fmtDuration, placementLabel } from "@/lib/tracking/format";
import { closeStaleSessions } from "@/lib/tracking/notify";
import { getOverview } from "@/lib/tracking/queries";
import Link from "next/link";
import { after } from "next/server";
import { LuInstagram, LuMapPin, LuUsers } from "react-icons/lu";
import styles from "../admin.module.scss";

const RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

const shortDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});
const longDay = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "short",
  day: "numeric",
  month: "short",
});

export default async function OverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; map?: string }>;
}) {
  await requireAdmin("/admin");
  if (!hasDb()) return <SetupNotice title="Overview" />;

  const { range, map } = await searchParams;
  const days = RANGES.find((r) => String(r.value) === range)?.value ?? 30;
  const mapView = map === "world" ? "world" : "region";
  const pageHref = (d: number, m: string) =>
    `/admin?range=${d}${m === "world" ? "&map=world" : ""}`;

  // End finished visits (and send their summary emails) in the background.
  const origin = await requestOrigin();
  after(() => closeStaleSessions(origin).catch((err) => console.error("sweep", err)));

  const d = await getOverview(days);
  const { fixed: f, kpi: k } = d;
  const conversion = k.visitors ? (k.lead_visitors / k.visitors) * 100 : 0;
  const nothingYet = !f.d30 && !k.sessions && !d.recent.length;

  const series: DayPoint[] = d.series.map((row) => {
    const date = new Date(`${row.day}T12:00:00Z`);
    return {
      day: row.day,
      label: shortDay.format(date),
      long: longDay.format(date),
      visits: row.visits,
      visitors: row.visitors,
      leads: row.leads,
    };
  });

  const placementCount = new Map<string, number>(d.placements.map((p) => [p.key, p.count]));

  return (
    <>
      <PageHeader title="Overview" description="People who came to your site from Instagram.">
        <AutoRefresh
          seconds={30}
          label={
            d.activeNow
              ? `${d.activeNow} on the site now`
              : "Nobody on the site right now · updates every 30s"
          }
        />
      </PageHeader>

      {nothingYet && (
        <div className={styles.card} style={{ marginBottom: 16 }}>
          <Empty
            icon={<LuInstagram aria-hidden />}
            title="No Instagram visitors yet"
            action={
              <Link href="/admin/links" className={`${styles.btn} ${styles.btnPrimary}`}>
                Create tagged links
              </Link>
            }
          >
            Put a tagged link in your Instagram bio, stories, posts and DMs. Visitors show up here
            as soon as they accept cookies.
          </Empty>
        </div>
      )}

      <div className={styles.stats3}>
        <StatTile
          large
          label="Visitors today"
          value={nf.format(f.today)}
          hint={<Delta current={f.today} previous={f.yesterday} period="yesterday" />}
        />
        <StatTile
          large
          label="Last 7 days"
          value={nf.format(f.d7)}
          hint={<Delta current={f.d7} previous={f.prev7} period="the 7 days before" />}
        />
        <StatTile
          large
          label="Last 30 days"
          value={nf.format(f.d30)}
          hint={<Delta current={f.d30} previous={f.prev30} period="the 30 days before" />}
        />
      </div>

      <div className={styles.sectionLabel}>
        <LinkTabs
          label="Date range"
          value={days}
          options={RANGES}
          href={(v) => pageHref(v, mapView)}
        />
        <span className={styles.sub} style={{ margin: 0 }}>
          Everything below covers the last {days} days
        </span>
      </div>

      <div className={styles.stats}>
        <StatTile
          label="Visits"
          value={nf.format(k.sessions)}
          hint={`${nf.format(k.visitors)} ${k.visitors === 1 ? "visitor" : "visitors"}`}
        />
        <StatTile label="Pages per visit" value={k.avg_pages.toFixed(1)} hint="average" />
        <StatTile label="Time per visit" value={fmtDuration(k.avg_duration)} hint="average" />
        <StatTile label="Leads" value={nf.format(k.lead_sessions)} hint="contact forms sent" />
        <StatTile
          label="Lead conversion"
          value={`${conversion.toFixed(1)}%`}
          hint="of visitors became a lead"
        />
        <StatTile
          label="Without consent"
          value={nf.format(d.anonymous)}
          hint="visits counted, no details"
        />
      </div>

      <div className={styles.grid} style={{ marginTop: 16 }}>
        <div className={styles.col8}>
          <TimeChart data={series} days={days} />
        </div>

        <Card
          className={styles.col4}
          title="Right now"
          description="The latest Instagram visitors"
          flush
        >
          {d.recent.length ? (
            <ul className={styles.feed}>
              {d.recent.map((s) => (
                <li key={s.id}>
                  <Link href={`/admin/visitors/${s.visitor_id}`} className={styles.feedItem}>
                    <span
                      className={s.is_active ? styles.liveDot : styles.idleDot}
                      title={s.is_active ? "On the site now" : "Visit ended"}
                    />
                    <span className={styles.feedMain}>
                      <span className={styles.feedTitle}>
                        <Flag code={s.country_code} title={s.country} />
                        <span className={styles.truncate}>{s.city || s.country || "Unknown"}</span>
                        <SourceBadge session={s} />
                      </span>
                      <span className={styles.feedMeta}>
                        {deviceName(s)} · {s.page_count} {s.page_count === 1 ? "page" : "pages"} ·{" "}
                        {s.exit_page}
                        {s.converted ? " · lead" : ""}
                      </span>
                    </span>
                    <span className={styles.feedTime}>{fmtAgo(s.last_activity_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <Empty icon={<LuUsers aria-hidden />} title="No visitors yet">
              New visits appear here within 30 seconds.
            </Empty>
          )}
        </Card>

        <Card
          className={styles.col6}
          title="Where on Instagram"
          description="Which kind of link brought each visit"
        >
          <SegmentedBar
            parts={PLACEMENT_ORDER.map((key) => ({
              key,
              label: key === "unknown" ? "Untagged link or in-app browser" : placementLabel(key),
              value: placementCount.get(key) ?? 0,
              color: PLACEMENT_COLORS[key],
            }))}
          />
        </Card>

        <Card
          className={styles.col6}
          title="New and returning"
          description="Visits by first-time and returning visitors"
        >
          <SegmentedBar
            parts={[
              { key: "new", label: "First visit", value: k.new_sessions, color: "var(--series-1)" },
              {
                key: "returning",
                label: "Came back",
                value: k.returning_sessions,
                color: "var(--series-2)",
              },
            ]}
          />
        </Card>

        <Card
          className={styles.col8}
          title="Visitor map"
          description="Approximate location of each visit. Larger dots mean more visits."
          action={
            <LinkTabs
              small
              label="Map area"
              value={mapView}
              options={[
                { value: "region", label: "Region" },
                { value: "world", label: "World" },
              ]}
              href={(v) => pageHref(days, v)}
            />
          }
        >
          <WorldMap points={d.points} view={mapView} worldHref={pageHref(days, "world")} />
        </Card>

        <Card className={styles.col4} title="Top countries" description="Visits">
          <BarList
            rows={d.countries.map((c) => ({
              key: c.code || c.label,
              label: c.label,
              value: c.count,
              leading: <Flag code={c.code} title={c.label} />,
            }))}
            empty={<Empty icon={<LuMapPin aria-hidden />} title="No locations yet" />}
          />
        </Card>

        <Card className={styles.col6} title="Top cities" description="Visits">
          <BarList
            rows={d.cities.map((c) => ({
              key: `${c.label}-${c.code}`,
              label: c.label,
              value: c.count,
              leading: <Flag code={c.code} />,
            }))}
            empty={<Empty icon={<LuMapPin aria-hidden />} title="No locations yet" />}
          />
        </Card>

        <Card
          className={styles.col6}
          title="Top pages"
          description="Views, with average time on page"
        >
          <BarList
            rows={d.pages.map((p) => ({
              key: p.label,
              label: p.label,
              value: p.count,
              hint: `· ${fmtDuration(p.avg_time)}`,
            }))}
          />
        </Card>

        <Card
          className={styles.col12}
          title="Devices"
          description="Visits by device, system and browser"
        >
          <div className={styles.threeCols}>
            <div>
              <h3 className={styles.colTitle}>Device</h3>
              <BarList
                rows={d.devices.map((r) => ({
                  key: r.label,
                  label: deviceTypeLabel(r.label),
                  value: r.count,
                  leading: <DeviceIcon type={r.label} />,
                }))}
              />
            </div>
            <div>
              <h3 className={styles.colTitle}>Operating system</h3>
              <BarList
                rows={d.systems.map((r) => ({ key: r.label, label: r.label, value: r.count }))}
              />
            </div>
            <div>
              <h3 className={styles.colTitle}>Browser</h3>
              <BarList
                rows={d.browsers.map((r) => ({ key: r.label, label: r.label, value: r.count }))}
              />
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
