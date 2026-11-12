import { ConfirmSubmit, ScrollIntoView } from "@/components/admin/ConfirmSubmit";
import { SetupNotice } from "@/components/admin/Setup";
import { EVENT_ICONS, StatusBadge, TriggerBadge } from "@/components/admin/triggers";
import { Badge, Card, Flag, SourceBadge, StatTile, cx, nf } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/tracking/adminAuth";
import { type Row, hasDb } from "@/lib/tracking/db";
import { isUuid } from "@/lib/tracking/detect";
import { eventLabel } from "@/lib/tracking/emails";
import {
  deviceLabel,
  fmtAgo,
  fmtDateTime,
  fmtDuration,
  fmtTime,
  googleMapsUrl,
  locationLabel,
  nearestAddress,
  placementLabel,
  sourceLabel,
} from "@/lib/tracking/format";
import { addNearestAddress } from "@/lib/tracking/geocode";
import { getVisitor } from "@/lib/tracking/queries";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import {
  LuChevronLeft,
  LuChevronRight,
  LuCircleCheck,
  LuExternalLink,
  LuFileText,
  LuFlame,
  LuLogIn,
  LuLogOut,
  LuMail,
  LuMousePointerClick,
  LuPhone,
  LuTrash2,
} from "react-icons/lu";
import { deleteVisitorAction } from "../../../actions";
import styles from "../../../admin.module.scss";

function Def({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  const empty = children === null || children === undefined || children === "";
  return (
    <div className={cx(styles.def, wide && styles.defWide)}>
      <dt>{label}</dt>
      <dd className={empty ? styles.muted : undefined}>{empty ? "–" : children}</dd>
    </div>
  );
}

/** Opens the visit's coordinates in Google Maps, in a new tab. */
function GoogleMapsLink({ session }: { session: Row }) {
  return (
    <a
      className={styles.extLink}
      href={googleMapsUrl(session.latitude, session.longitude)}
      target="_blank"
      rel="noopener noreferrer"
    >
      Open in Google Maps
      <LuExternalLink aria-hidden />
    </a>
  );
}

const yesNo = (value: unknown) => (value ? "Yes" : "No");
const join = (...parts: unknown[]) => parts.filter(Boolean).join(" ") || null;

type TimelineItem =
  | { kind: "page"; at: string; row: Row }
  | { kind: "event"; at: string; row: Row };

function Timeline({
  session,
  pageviews,
  events,
}: { session: Row; pageviews: Row[]; events: Row[] }) {
  const items: TimelineItem[] = [
    ...pageviews.map((row) => ({ kind: "page" as const, at: row.entered_at, row })),
    ...events.map((row) => ({ kind: "event" as const, at: row.created_at, row })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <ol className={styles.timeline}>
      <li className={styles.tlItem}>
        <span className={styles.tlIcon}>
          <LuLogIn aria-hidden />
        </span>
        <span className={styles.tlBody}>
          <span>Arrived from {sourceLabel(session)}</span>
          <small>
            {[
              session.utm_campaign && `Campaign “${session.utm_campaign}”`,
              session.referrer && `Referrer ${session.referrer}`,
              `Visit #${session.visit_number}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </small>
        </span>
        <span className={styles.tlTime}>{fmtTime(session.started_at)}</span>
      </li>

      {items.map((item) => {
        if (item.kind === "page") {
          const p = item.row;
          return (
            <li key={`p-${p.id}`} className={cx(styles.tlItem, styles.tlPage)}>
              <span className={styles.tlIcon}>
                <LuFileText aria-hidden />
              </span>
              <span className={styles.tlBody}>
                <span className={styles.strong}>{p.path}</span>
                {p.title && <small>{p.title}</small>}
                <small>
                  {fmtDuration(p.time_on_page_seconds)} on page · scrolled
                  <span className={styles.scrollMeter} aria-hidden>
                    <span style={{ width: `${p.max_scroll_percent}%` }} />
                  </span>
                  {p.max_scroll_percent}%
                </small>
              </span>
              <span className={styles.tlTime}>{fmtTime(p.entered_at)}</span>
            </li>
          );
        }
        const e = item.row;
        const Icon = EVENT_ICONS[e.type] ?? LuMousePointerClick;
        return (
          <li
            key={`e-${e.id}`}
            className={cx(styles.tlItem, e.type === "form_submit" && styles.tlLead)}
          >
            <span className={styles.tlIcon}>
              <Icon aria-hidden />
            </span>
            <span className={styles.tlBody}>
              <span>
                {eventLabel(e.type)}
                {e.label ? `: ${e.label}` : ""}
              </span>
              {e.path && <small>on {e.path}</small>}
            </span>
            <span className={styles.tlTime}>{fmtTime(e.created_at)}</span>
          </li>
        );
      })}

      <li className={styles.tlItem}>
        <span className={styles.tlIcon}>
          <LuLogOut aria-hidden />
        </span>
        <span className={styles.tlBody}>
          <span>{session.ended_at ? "Visit ended" : "Still on the site, or just left"}</span>
          <small>Last page {session.exit_page || "/"}</small>
        </span>
        <span className={styles.tlTime}>
          {fmtTime(session.ended_at || session.last_activity_at)}
        </span>
      </li>
    </ol>
  );
}

export default async function VisitorPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ visit?: string }>;
}) {
  const { id } = await params;
  await requireAdmin(`/admin/visitors/${id}`);
  if (!hasDb()) return <SetupNotice title="Visitor" />;
  if (!isUuid(id)) notFound();

  const data = await getVisitor(id);
  if (!data) notFound();
  const { visitor, sessions, pageviews, events, notifications, leads } = data;
  const { visit } = await searchParams;

  const latest: Row | undefined = sessions[0];
  // Visits from before the address lookup existed (or where it failed) get it now.
  await addNearestAddress(latest);
  const address = latest ? nearestAddress(latest) : null;
  const instagram = sessions.find((s) => s.source === "instagram") ?? latest;
  const totalPages = sessions.reduce((sum, s) => sum + s.page_count, 0);
  const totalSeconds = sessions.reduce((sum, s) => sum + s.duration_seconds, 0);
  const lead = leads[0];
  const hasMap = latest?.latitude != null && latest?.longitude != null;
  const mapSrc = hasMap
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${latest.longitude - 0.45}%2C${latest.latitude - 0.25}%2C${latest.longitude + 0.45}%2C${latest.latitude + 0.25}&layer=mapnik&marker=${latest.latitude}%2C${latest.longitude}`
    : null;

  return (
    <>
      <Link href="/admin/visitors" className={styles.back}>
        <LuChevronLeft aria-hidden />
        Visitors
      </Link>

      <header className={styles.pageHead}>
        <div>
          <div className={styles.titleRow}>
            <Flag code={latest?.country_code} title={latest?.country} />
            <h1 className={styles.h1}>
              {visitor.linked_lead_name ||
                `Visitor from ${latest?.city || latest?.country || "an unknown place"}`}
            </h1>
          </div>
          <div className={styles.badgeRow}>
            {instagram && <SourceBadge session={instagram} />}
            <Badge>
              {visitor.visit_count > 1
                ? `Returning · ${visitor.visit_count} visits`
                : "New visitor"}
            </Badge>
            {sessions.some((s) => s.converted) && (
              <Badge tone="good" icon={<LuCircleCheck aria-hidden />}>
                Lead
              </Badge>
            )}
            {sessions.some((s) => s.high_interest) && (
              <Badge icon={<LuFlame aria-hidden />}>High interest</Badge>
            )}
            {latest?.is_instagram_in_app_browser && <Badge>Instagram in-app browser</Badge>}
          </div>
        </div>
      </header>

      <div className={styles.stats}>
        <StatTile label="Visits" value={nf.format(sessions.length)} />
        <StatTile label="Pages viewed" value={nf.format(totalPages)} />
        <StatTile label="Time on site" value={fmtDuration(totalSeconds)} />
        <StatTile
          label="First seen"
          value={fmtAgo(visitor.first_seen)}
          hint={fmtDateTime(visitor.first_seen)}
        />
        <StatTile
          label="Last seen"
          value={fmtAgo(visitor.last_seen)}
          hint={fmtDateTime(visitor.last_seen)}
        />
      </div>

      <div className={styles.grid} style={{ marginTop: 16 }}>
        {(lead || visitor.linked_lead_email) && (
          <Card
            className={styles.col12}
            title="Lead"
            description="This visitor sent the contact form"
          >
            <div className={styles.leadName}>{lead?.name || visitor.linked_lead_name}</div>
            <div className={styles.leadContact}>
              <a href={`mailto:${lead?.email || visitor.linked_lead_email}`}>
                <LuMail aria-hidden />
                {lead?.email || visitor.linked_lead_email}
              </a>
              {(lead?.phone || visitor.linked_lead_phone) && (
                <a href={`tel:${lead?.phone || visitor.linked_lead_phone}`}>
                  <LuPhone aria-hidden />
                  {lead?.phone || visitor.linked_lead_phone}
                </a>
              )}
            </div>
            {lead && (
              <p className={styles.sub}>
                Asked about {lead.service} · {lead.plan} · {fmtDateTime(lead.created_at)}
              </p>
            )}
          </Card>
        )}

        <Card
          className={styles.col8}
          title="Timeline"
          description="Every visit, page and click, newest visit first"
          flush
        >
          {visit && visit !== sessions[0]?.id && <ScrollIntoView targetId={`visit-${visit}`} />}
          {sessions.map((s, i) => (
            <details
              key={s.id}
              id={`visit-${s.id}`}
              className={styles.session}
              open={i === 0 || s.id === visit}
            >
              <summary>
                <LuChevronRight className={styles.chev} aria-hidden />
                <span className={styles.sessionTitle}>{fmtDateTime(s.started_at)}</span>
                <SourceBadge session={s} />
                {s.converted && (
                  <Badge tone="good" icon={<LuCircleCheck aria-hidden />}>
                    Lead
                  </Badge>
                )}
                {s.high_interest && <Badge icon={<LuFlame aria-hidden />}>High interest</Badge>}
                <span className={styles.sessionMeta}>
                  {s.page_count} {s.page_count === 1 ? "page" : "pages"} ·{" "}
                  {fmtDuration(s.duration_seconds)}
                </span>
              </summary>
              <Timeline
                session={s}
                pageviews={pageviews.filter((p) => p.session_id === s.id)}
                events={events.filter((e) => e.session_id === s.id)}
              />
            </details>
          ))}
        </Card>

        <Card
          className={styles.col4}
          title="Location and device"
          description="The map shows where the internet connection is, not the person’s exact position"
        >
          {mapSrc ? (
            <iframe
              className={styles.mapFrame}
              src={mapSrc}
              title={`Map of ${locationLabel(latest as Row)}`}
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <p className={styles.sub}>No coordinates for this visit.</p>
          )}
          {hasMap && (
            <p className={styles.mapNote}>
              <GoogleMapsLink session={latest} />
            </p>
          )}
          <dl className={cx(styles.defs, styles.defs1)} style={{ marginTop: 12 }}>
            <Def label="Place">{latest ? locationLabel(latest) : null}</Def>
            <Def label="Nearest address">{address}</Def>
            <Def label="Local time zone">{latest?.timezone}</Def>
            <Def label="Provider">{latest?.isp}</Def>
            <Def label="IP (masked)">{latest?.ip_masked}</Def>
            <Def label="Device">{latest ? deviceLabel(latest) : null}</Def>
            <Def label="Language">{latest?.language}</Def>
            <Def label="Connection">{latest?.connection_type}</Def>
          </dl>
        </Card>

        {latest && (
          <Card
            className={styles.col12}
            title="Everything collected"
            description={`From the latest visit, ${fmtDateTime(latest.started_at)}`}
          >
            <h3 className={styles.groupTitle}>Source</h3>
            <dl className={styles.defs}>
              <Def label="Source">{latest.source === "instagram" ? "Instagram" : "Other"}</Def>
              <Def label="Placement">
                {latest.source === "instagram" ? placementLabel(latest.ig_placement) : null}
              </Def>
              <Def label="UTM source">{latest.utm_source}</Def>
              <Def label="UTM medium">{latest.utm_medium}</Def>
              <Def label="UTM campaign">{latest.utm_campaign}</Def>
              <Def label="UTM content">{latest.utm_content}</Def>
              <Def label="Referrer">{latest.referrer}</Def>
              <Def label="Landing page">{latest.landing_page}</Def>
              <Def label="Exit page">{latest.exit_page}</Def>
              <Def label="First source">{join(visitor.first_source, visitor.first_campaign)}</Def>
            </dl>

            <h3 className={styles.groupTitle}>Location and network</h3>
            <dl className={styles.defs}>
              <Def label="Country">
                {join(latest.country, latest.country_code && `(${latest.country_code})`)}
              </Def>
              <Def label="Region">{latest.region}</Def>
              <Def label="City">{latest.city}</Def>
              <Def label="Postal code">{latest.postal_code}</Def>
              <Def label="Coordinates">
                {hasMap ? (
                  <>
                    {latest.latitude}, {latest.longitude} · <GoogleMapsLink session={latest} />
                  </>
                ) : null}
              </Def>
              <Def label="Timezone">{latest.timezone}</Def>
              <Def label="Nearest address" wide>
                {address ? (
                  <>
                    {address}
                    <small className={styles.defNote}>
                      The road, postal code and city nearest to the coordinates (from
                      OpenStreetMap). The coordinates come from the IP address and often mark the
                      centre of the city, so this is an area, not the visitor’s home address.
                    </small>
                  </>
                ) : null}
              </Def>
              <Def label="IP (masked)">{latest.ip_masked}</Def>
              <Def label="IP fingerprint">
                {latest.ip_hash ? `${latest.ip_hash.slice(0, 16)}…` : null}
              </Def>
              <Def label="Internet provider">{latest.isp}</Def>
              <Def label="Connection">{latest.connection_type}</Def>
            </dl>

            <h3 className={styles.groupTitle}>Device and browser</h3>
            <dl className={styles.defs}>
              <Def label="Device type">{latest.device_type}</Def>
              <Def label="Brand">{latest.device_vendor}</Def>
              <Def label="Model">{latest.device_model}</Def>
              <Def label="Operating system">{join(latest.os, latest.os_version)}</Def>
              <Def label="Browser">{join(latest.browser, latest.browser_version)}</Def>
              <Def label="In-app browser">{yesNo(latest.is_instagram_in_app_browser)}</Def>
              <Def label="Language">{latest.language}</Def>
              <Def label="Screen">
                {latest.screen_width ? `${latest.screen_width} × ${latest.screen_height}` : null}
              </Def>
              <Def label="Viewport">{latest.viewport}</Def>
              <Def label="User agent">{latest.user_agent}</Def>
            </dl>

            <h3 className={styles.groupTitle}>Visit</h3>
            <dl className={styles.defs}>
              <Def label="Started">{fmtDateTime(latest.started_at)}</Def>
              <Def label="Last activity">{fmtDateTime(latest.last_activity_at)}</Def>
              <Def label="Ended">{latest.ended_at ? fmtDateTime(latest.ended_at) : null}</Def>
              <Def label="Pages">{latest.page_count}</Def>
              <Def label="Duration">{fmtDuration(latest.duration_seconds)}</Def>
              <Def label="Visit number">{latest.visit_number}</Def>
              <Def label="Returning">{yesNo(latest.is_returning)}</Def>
              <Def label="Form started">{yesNo(latest.form_started)}</Def>
              <Def label="Converted">{yesNo(latest.converted)}</Def>
              <Def label="Visitor ID">{visitor.id}</Def>
            </dl>
          </Card>
        )}

        {notifications.length > 0 && (
          <Card className={styles.col12} title="Emails sent about this visitor" flush>
            {notifications.map((n) => (
              <div key={n.id} className={styles.logRow}>
                <span className={cx(styles.muted, styles.lTime)}>{fmtDateTime(n.sent_at)}</span>
                <span className={styles.lType}>
                  <TriggerBadge type={n.trigger_type} />
                </span>
                <span className={cx(styles.cellStack, styles.lBody)}>
                  <span className={styles.truncate}>{n.subject || n.reason}</span>
                  <small>{n.reason}</small>
                </span>
                <span className={styles.lStatus}>
                  <StatusBadge status={n.status} error={n.error} />
                </span>
              </div>
            ))}
          </Card>
        )}

        <Card
          className={styles.col12}
          title="Delete this visitor"
          description="Removes every visit, page view, click and linked lead for this person. Use this when someone asks you to delete their data. This cannot be undone."
        >
          <form action={deleteVisitorAction}>
            <input type="hidden" name="id" value={visitor.id} />
            <ConfirmSubmit
              className={cx(styles.btn, styles.btnDanger)}
              message="Delete everything stored about this visitor? This cannot be undone."
            >
              <LuTrash2 aria-hidden />
              Delete all data
            </ConfirmSubmit>
          </form>
        </Card>
      </div>
    </>
  );
}
