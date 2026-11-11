import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { SetupNotice } from "@/components/admin/Setup";
import {
  Badge,
  Card,
  DeviceIcon,
  Empty,
  Flag,
  PageHeader,
  SourceBadge,
  cx,
  nf,
} from "@/components/admin/ui";
import { requestOrigin, requireAdmin } from "@/lib/tracking/adminAuth";
import { hasDb } from "@/lib/tracking/db";
import { deviceName, fmtAgo, fmtDateTime, fmtDuration } from "@/lib/tracking/format";
import { closeStaleSessions } from "@/lib/tracking/notify";
import { type VisitFilters, listCountries, listVisits } from "@/lib/tracking/queries";
import Link from "next/link";
import { after } from "next/server";
import {
  LuCircleCheck,
  LuDownload,
  LuPenLine,
  LuSearch,
  LuSlidersHorizontal,
} from "react-icons/lu";
import styles from "../../admin.module.scss";

const PAGE_SIZE = 50;

type Search = Record<string, string | string[] | undefined>;

export default async function VisitorsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin("/admin/visitors");
  if (!hasDb()) return <SetupNotice title="Visitors" />;

  const sp = await searchParams;
  const get = (key: string) => {
    const value = sp[key];
    return (Array.isArray(value) ? value[0] : value) || "";
  };
  const filters: VisitFilters = {
    source: get("source") === "all" ? "all" : "instagram",
    from: get("from"),
    to: get("to"),
    country: get("country"),
    device: get("device"),
    converted: get("converted"),
    q: get("q"),
  };
  const page = Math.max(1, Number.parseInt(get("page") || "1", 10) || 1);

  const origin = await requestOrigin();
  after(() => closeStaleSessions(origin).catch((err) => console.error("sweep", err)));

  const [{ rows, total }, countries] = await Promise.all([
    listVisits(filters, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    listCountries(),
  ]);

  // The active filters, reused for the CSV export and the pager links.
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && !(key === "source" && value === "instagram")) query.set(key, value);
  }
  const pageHref = (n: number) => {
    const next = new URLSearchParams(query);
    if (n > 1) next.set("page", String(n));
    const text = next.toString();
    return `/admin/visitors${text ? `?${text}` : ""}`;
  };
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(page * PAGE_SIZE, total);

  return (
    <>
      <PageHeader
        title="Visitors"
        description={`${nf.format(total)} ${total === 1 ? "visit" : "visits"}, newest first`}
      >
        <AutoRefresh seconds={30} />
      </PageHeader>

      <input
        type="checkbox"
        id="show-filters"
        className={styles.filterToggle}
        defaultChecked={query.size > 0}
      />
      <label htmlFor="show-filters" className={cx(styles.btn, styles.filterButton)}>
        <LuSlidersHorizontal aria-hidden />
        Filters{query.size > 0 ? ` (${query.size})` : ""}
      </label>
      <form method="get" className={styles.filters}>
        <label className={styles.field}>
          <span>From</span>
          <input className={styles.control} type="date" name="from" defaultValue={filters.from} />
        </label>
        <label className={styles.field}>
          <span>To</span>
          <input className={styles.control} type="date" name="to" defaultValue={filters.to} />
        </label>
        <label className={styles.field}>
          <span>Source</span>
          <select className={styles.control} name="source" defaultValue={filters.source}>
            <option value="instagram">Instagram</option>
            <option value="all">All sources</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>Country</span>
          <select className={styles.control} name="country" defaultValue={filters.country}>
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>Device</span>
          <select className={styles.control} name="device" defaultValue={filters.device}>
            <option value="">All devices</option>
            <option value="mobile">Phone</option>
            <option value="tablet">Tablet</option>
            <option value="desktop">Desktop</option>
          </select>
        </label>
        <label className={styles.field}>
          <span>Lead</span>
          <select className={styles.control} name="converted" defaultValue={filters.converted}>
            <option value="">Everyone</option>
            <option value="yes">Leads only</option>
            <option value="no">Not a lead</option>
          </select>
        </label>
        <label className={cx(styles.field, styles.fieldGrow)}>
          <span>Search</span>
          <input
            className={styles.control}
            type="search"
            name="q"
            placeholder="City, country, page, campaign, lead name or email"
            defaultValue={filters.q}
          />
        </label>
        <div className={styles.filterActions}>
          <button type="submit" className={cx(styles.btn, styles.btnPrimary)}>
            <LuSearch aria-hidden />
            Apply
          </button>
          <Link href="/admin/visitors" className={styles.btn}>
            Reset
          </Link>
          <a href={`/api/admin/export?${query.toString()}`} className={styles.btn} download>
            <LuDownload aria-hidden />
            CSV
          </a>
        </div>
      </form>

      <Card flush>
        {rows.length ? (
          <div className={styles.rows}>
            <div className={styles.rowHead}>
              <span>Time</span>
              <span>Came from</span>
              <span>Location</span>
              <span>Device</span>
              <span style={{ textAlign: "right" }}>Pages</span>
              <span style={{ textAlign: "right" }}>Time</span>
              <span>Lead</span>
            </div>
            {rows.map((s) => (
              <Link
                key={s.id}
                href={`/admin/visitors/${s.visitor_id}?visit=${s.id}`}
                className={styles.row}
              >
                <span className={cx(styles.cell, styles.aTime)}>
                  <span className={styles.cellStack}>
                    <span>{fmtAgo(s.started_at)}</span>
                    <small>{fmtDateTime(s.started_at)}</small>
                  </span>
                </span>
                <span className={cx(styles.cell, styles.aSrc)}>
                  <SourceBadge session={s} />
                </span>
                <span className={cx(styles.cell, styles.aLoc)}>
                  <Flag code={s.country_code} title={s.country} />
                  <span className={styles.cellStack}>
                    <span className={styles.truncate}>{s.city || s.country || "Unknown"}</span>
                    {s.city && s.country && <small>{s.country}</small>}
                  </span>
                </span>
                <span className={cx(styles.cell, styles.aDev)}>
                  <DeviceIcon type={s.device_type} />
                  <span className={styles.cellStack}>
                    <span className={styles.truncate}>{deviceName(s)}</span>
                    <small>
                      {[s.os, s.is_instagram_in_app_browser ? "Instagram app" : s.browser]
                        .filter(Boolean)
                        .join(" · ")}
                    </small>
                  </span>
                </span>
                <span className={cx(styles.cell, styles.num, styles.aPages)}>
                  <span>
                    {s.page_count}
                    <span className={styles.mobileOnly}>
                      {s.page_count === 1 ? " page" : " pages"}
                    </span>
                  </span>
                </span>
                <span className={cx(styles.cell, styles.num, styles.aDur)}>
                  {fmtDuration(s.duration_seconds)}
                </span>
                <span className={cx(styles.cell, styles.aLead)}>
                  {s.converted ? (
                    <Badge tone="good" icon={<LuCircleCheck aria-hidden />}>
                      {s.linked_lead_name || "Lead"}
                    </Badge>
                  ) : s.form_started ? (
                    <Badge tone="warn" icon={<LuPenLine aria-hidden />}>
                      Form started
                    </Badge>
                  ) : null}
                  {s.is_returning && <span className={styles.muted}>Visit #{s.visit_number}</span>}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <Empty icon={<LuSearch aria-hidden />} title="No visits match">
            Try a wider date range, or switch Source to “All sources”.
          </Empty>
        )}
        {total > PAGE_SIZE && (
          <div className={styles.pager}>
            <span>
              {from}–{to} of {nf.format(total)}
            </span>
            <div className={styles.pagerBtns}>
              {page > 1 && (
                <Link href={pageHref(page - 1)} className={cx(styles.btn, styles.btnSmall)}>
                  Newer
                </Link>
              )}
              {to < total && (
                <Link href={pageHref(page + 1)} className={cx(styles.btn, styles.btnSmall)}>
                  Older
                </Link>
              )}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}
