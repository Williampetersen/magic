import { AutoRefresh } from "@/components/admin/AutoRefresh";
import { CopyButton } from "@/components/admin/CopyButton";
import { SetupNotice } from "@/components/admin/Setup";
import { WorldMap } from "@/components/admin/WorldMap";
import {
  Badge,
  BarList,
  Card,
  DeviceIcon,
  Empty,
  Flag,
  LinkTabs,
  PageHeader,
  SourceBadge,
  StatTile,
  cx,
  nf,
} from "@/components/admin/ui";
import { requireAdmin } from "@/lib/tracking/adminAuth";
import { type Row, hasDb } from "@/lib/tracking/db";
import { deviceName, fmtAgo, fmtDateTime, fmtDuration } from "@/lib/tracking/format";
import {
  CHANNEL_LABELS,
  CHANNEL_SHORT,
  type Channel,
  META_DK_REGIONS,
  UNCERTAIN_HINT,
  cityText,
  isUncertain,
} from "@/lib/tracking/location";
import {
  type LocationFilters,
  SEGMENTS,
  getLocations,
  parseSegment,
} from "@/lib/tracking/locationQueries";
import Link from "next/link";
import {
  LuCircleCheck,
  LuDownload,
  LuInfo,
  LuInstagram,
  LuMapPin,
  LuPenLine,
  LuUsers,
} from "react-icons/lu";
import styles from "../../admin.module.scss";

const RANGES = [
  { value: 7, label: "7 days" },
  { value: 30, label: "30 days" },
  { value: 90, label: "90 days" },
];

const COUNTRIES: { value: LocationFilters["country"]; label: string }[] = [
  { value: "DK", label: "Denmark" },
  { value: "all", label: "All countries" },
];

type Search = Record<string, string | string[] | undefined>;

const pct = (part: number, whole: number) => (whole ? Math.round((part / whole) * 100) : 0);

/** How Meta Ads names a city in location targeting: "Aarhus, Central Denmark Region, Denmark". */
function metaLocation(c: Row) {
  if (c.code === "DK") {
    const region = META_DK_REGIONS[c.region as string];
    return [c.city, region, "Denmark"].filter(Boolean).join(", ");
  }
  return [c.city, c.country].filter(Boolean).join(", ");
}

/** A number cell that greys out zeros, so the real numbers stand out. */
function Num({ value }: { value: number }) {
  return <td className={value ? undefined : styles.zero}>{nf.format(value)}</td>;
}

function ChannelBadge({ session }: { session: Row }) {
  if (session.source === "instagram") return <SourceBadge session={session} />;
  return (
    <Badge dot="var(--series-other)" title={CHANNEL_LABELS[session.channel as Channel]}>
      {CHANNEL_SHORT[session.channel as Channel] || "Other"}
    </Badge>
  );
}

export default async function LocationsPage({ searchParams }: { searchParams: Promise<Search> }) {
  await requireAdmin("/admin/locations");
  if (!hasDb()) return <SetupNotice title="Locations" />;

  const sp = await searchParams;
  const get = (key: string) => {
    const value = sp[key];
    return (Array.isArray(value) ? value[0] : value) || "";
  };
  const filters: LocationFilters = {
    days: RANGES.find((r) => String(r.value) === get("range"))?.value ?? 30,
    country: get("country") === "all" ? "all" : "DK",
    segment: parseSegment(get("source")),
  };
  const mapView = get("map") === "world" ? "world" : "region";

  const href = (patch: Record<string, string | number>) => {
    const next = {
      range: filters.days,
      country: filters.country,
      source: filters.segment,
      map: mapView,
      ...patch,
    };
    const p = new URLSearchParams();
    if (next.range !== 30) p.set("range", String(next.range));
    if (next.country !== "DK") p.set("country", String(next.country));
    if (next.source !== "all") p.set("source", String(next.source));
    if (next.map !== "region") p.set("map", String(next.map));
    const text = p.toString();
    return `/admin/locations${text ? `?${text}` : ""}`;
  };
  const exportQuery = new URLSearchParams({
    range: String(filters.days),
    country: filters.country,
    source: filters.segment,
  }).toString();

  const d = await getLocations(filters);
  const { overall: o, segment: seg } = d;
  const segmentLabel = SEGMENTS.find((s) => s.value === filters.segment)?.label ?? "All sources";
  const countryLabel = filters.country === "DK" ? "Denmark" : "all countries";
  const reliable = d.cities.filter((c) => c.city && !c.uncertain);
  const metaCities = reliable.slice(0, 20);
  const metaText = metaCities.map(metaLocation).join("\n");
  const ipinfo = Boolean(process.env.IPINFO_TOKEN);
  const isBio = filters.segment === "instagram_bio";

  return (
    <>
      <PageHeader
        title="Locations"
        description="Where your visitors are and where they came from. Use it to pick the cities and regions for your Meta ads."
      >
        <AutoRefresh seconds={60} />
      </PageHeader>

      <div className={styles.filterBar}>
        <LinkTabs
          label="Date range"
          value={filters.days}
          options={RANGES}
          href={(v) => href({ range: v })}
        />
        <LinkTabs
          label="Country"
          value={filters.country}
          options={COUNTRIES}
          href={(v) => href({ country: v })}
        />
      </div>

      <div className={styles.stats}>
        <StatTile
          label="Visitors"
          icon={<LuUsers aria-hidden />}
          value={nf.format(o.visitors)}
          hint={`All sources · ${countryLabel}`}
        />
        <StatTile
          label="From Instagram"
          icon={<LuInstagram aria-hidden />}
          value={nf.format(o.instagram)}
          hint={`${pct(o.instagram, o.visitors)}% of all visitors`}
        />
        <StatTile
          label="Via your /dk link"
          value={nf.format(o.bio)}
          hint="nordicwide.com/dk in your bio"
        />
        <StatTile
          label="Leads"
          value={nf.format(o.leads)}
          hint={`${pct(o.leads, o.visitors)}% sent the contact form`}
        />
      </div>

      {seg.uncertain > 0 && (
        <div className={styles.notice} style={{ marginTop: 16, marginBottom: 0 }}>
          <LuInfo aria-hidden />
          <div>
            <strong>
              {nf.format(seg.uncertain)} of {nf.format(seg.visits)} visits show “Copenhagen?”.
            </strong>{" "}
            Their internet provider (usually a mobile network like TDC, Telia, Telenor or 3) is
            registered in central Copenhagen, so the IP address only proves the visitor is in
            Denmark. No website can see the real town without asking the visitor. These visits are
            kept apart, so the cities below are the ones you can trust.{" "}
            {ipinfo ? (
              <>IPinfo found a better city for {nf.format(seg.improved)} visits.</>
            ) : (
              <>
                For a second opinion on new visits, add a free IPinfo token as{" "}
                <code>IPINFO_TOKEN</code> in Vercel (Settings → System status shows how).
              </>
            )}
          </div>
        </div>
      )}

      <div className={styles.sectionLabel}>
        <div className={styles.segWrap}>
          <LinkTabs
            label="Source"
            value={filters.segment}
            options={SEGMENTS}
            href={(v) => href({ source: v })}
          />
        </div>
        <span className={styles.sub} style={{ margin: 0 }}>
          Below: {segmentLabel.toLowerCase()} · {countryLabel} · last {filters.days} days ·{" "}
          {nf.format(seg.visitors)} {seg.visitors === 1 ? "visitor" : "visitors"}
        </span>
      </div>

      <div className={styles.grid}>
        <Card
          className={styles.col4}
          title="Where visitors came from"
          description={`Visitors per source · ${countryLabel}`}
        >
          <BarList
            rows={d.sources.map((r) => ({
              key: r.channel,
              label: CHANNEL_LABELS[r.channel] || r.channel,
              value: r.visitors,
              hint: r.leads ? `· ${r.leads} ${r.leads === 1 ? "lead" : "leads"}` : undefined,
            }))}
            empty={<Empty icon={<LuUsers aria-hidden />} title="No visitors in this period" />}
          />
        </Card>

        <Card
          className={styles.col8}
          title="Map"
          description="Approximate area of each visit. Larger dots mean more visits."
          action={
            <LinkTabs
              small
              label="Map area"
              value={mapView}
              options={[
                { value: "region", label: "Region" },
                { value: "world", label: "World" },
              ]}
              href={(v) => href({ map: v })}
            />
          }
        >
          <WorldMap points={d.points} view={mapView} worldHref={href({ map: "world" })} />
        </Card>

        <Card
          className={styles.col12}
          title="Cities"
          description="Ranked by visitors. Instagram and /dk count visitors from there; leads sent the contact form."
          flush
          action={
            <a
              href={`/api/admin/locations/export?${exportQuery}`}
              className={cx(styles.btn, styles.btnSmall)}
              download
            >
              <LuDownload aria-hidden />
              CSV
            </a>
          }
        >
          {d.cities.length ? (
            <div className={styles.cityWrap}>
              <table className={styles.cityTable}>
                <thead>
                  <tr>
                    <th>City</th>
                    <th>Visitors</th>
                    <th>Instagram</th>
                    <th>/dk</th>
                    <th>Leads</th>
                    <th>Lead rate</th>
                    <th>Avg. time</th>
                    <th>Last visit</th>
                  </tr>
                </thead>
                <tbody>
                  {d.cities.map((c) => {
                    const name = c.uncertain
                      ? "Copenhagen? (uncertain)"
                      : c.city || (c.country ? `${c.country}, city unknown` : "Unknown");
                    const meta = c.uncertain
                      ? "Provider registered in Copenhagen · anywhere in Denmark"
                      : [
                          c.region && !/^[A-Z0-9]{1,3}$/.test(c.region) ? c.region : null,
                          filters.country === "all" ? c.country : null,
                          c.postcodes
                            ? `postcode ${String(c.postcodes).split(", ").slice(0, 4).join(", ")}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" · ");
                    return (
                      <tr key={`${c.code}-${c.city}-${c.uncertain}`}>
                        <td>
                          <span
                            className={styles.cityName}
                            title={c.uncertain ? UNCERTAIN_HINT : undefined}
                          >
                            <Flag code={c.code} title={c.country} />
                            <span>
                              {name}
                              {meta && <span className={styles.cityMeta}>{meta}</span>}
                            </span>
                          </span>
                        </td>
                        <Num value={c.visitors} />
                        <Num value={c.instagram} />
                        <Num value={c.bio} />
                        <Num value={c.leads} />
                        <td className={c.leads ? undefined : styles.zero}>
                          {pct(c.leads, c.visitors)}%
                        </td>
                        <td>{fmtDuration(c.avg_duration)}</td>
                        <td className={styles.zero}>{fmtAgo(c.last_visit)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty icon={<LuMapPin aria-hidden />} title="No visits in this period">
              Try a longer date range, another source or “All countries”.
            </Empty>
          )}
        </Card>

        {filters.country === "DK" && (
          <Card
            className={styles.col4}
            title="Regions in Denmark"
            description="Visitors per region. Meta Ads can target each region."
          >
            <BarList
              rows={d.regions.map((r) => ({
                key: r.region,
                label: r.region === "Unknown" ? "Unknown (Copenhagen? visits)" : r.region,
                value: r.visitors,
                hint: r.leads ? `· ${r.leads} ${r.leads === 1 ? "lead" : "leads"}` : undefined,
              }))}
              empty={<Empty icon={<LuMapPin aria-hidden />} title="No Danish visitors yet" />}
            />
          </Card>
        )}

        <Card
          className={filters.country === "DK" ? styles.col8 : styles.col12}
          title="Use it in Meta Ads"
          description="Your best cities, written the way Meta Ads names them. Uncertain “Copenhagen?” visits are left out."
          action={metaText ? <CopyButton text={metaText} label="Copy list" /> : undefined}
        >
          {metaText ? (
            <>
              <textarea
                className={styles.metaList}
                readOnly
                value={metaText}
                rows={Math.min(10, Math.max(4, metaCities.length))}
                aria-label="Cities for Meta Ads"
              />
              <ol className={styles.steps}>
                <li>
                  In Meta Ads Manager open your ad set → <strong>Audience</strong> →{" "}
                  <strong>Locations</strong>.
                </li>
                <li>
                  Choose <strong>Add locations in bulk</strong>, paste the list and keep a radius of
                  about 15–25 km around each city.
                </li>
                <li>
                  Put more budget on cities with leads and a high lead rate. Cities with only a few
                  visitors are a hint, not proof: compare again after a few more weeks.
                </li>
              </ol>
            </>
          ) : (
            <Empty icon={<LuMapPin aria-hidden />} title="No reliable cities yet">
              When visitors come from home or work internet, their city shows up here. Visits on
              mobile data often only show “Copenhagen?”.
            </Empty>
          )}
        </Card>

        <Card
          className={styles.col12}
          title={isBio ? "Every visit through nordicwide.com/dk" : "Latest visits"}
          description={
            isBio
              ? "People who opened the link in your Instagram bio, newest first"
              : `${segmentLabel} · newest first`
          }
          flush
          action={
            <Link
              href={`/admin/visitors?source=${filters.segment === "instagram_any" ? "instagram" : filters.segment}`}
              className={cx(styles.btn, styles.btnSmall)}
            >
              See all
            </Link>
          }
        >
          {d.visits.length ? (
            <div className={styles.rows}>
              <div className={styles.rowHead}>
                <span>Time</span>
                <span>Came from</span>
                <span>City</span>
                <span>Device</span>
                <span style={{ textAlign: "right" }}>Pages</span>
                <span style={{ textAlign: "right" }}>Time</span>
                <span>Lead</span>
              </div>
              {d.visits.map((s) => (
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
                    <ChannelBadge session={s} />
                  </span>
                  <span className={cx(styles.cell, styles.aLoc)}>
                    <Flag code={s.country_code} title={s.country} />
                    <span className={styles.cellStack}>
                      <span
                        className={styles.truncate}
                        title={isUncertain(s) ? UNCERTAIN_HINT : undefined}
                      >
                        {cityText(s)}
                      </span>
                      <small>
                        {isUncertain(s)
                          ? "City uncertain"
                          : [
                              s.postal_code,
                              s.region && !/^[A-Z0-9]{1,3}$/.test(s.region) ? s.region : s.country,
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                      </small>
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
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <Empty icon={<LuUsers aria-hidden />} title="No visits match">
              Try a longer date range, another source or “All countries”.
            </Empty>
          )}
        </Card>
      </div>
    </>
  );
}
