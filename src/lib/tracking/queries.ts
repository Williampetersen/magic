import { type Row, db } from "./db";

/* Read-only queries for the admin dashboard. Days are Copenhagen calendar days. */

const DAY = (col: string) => `(${col} AT TIME ZONE 'Europe/Copenhagen')::date`;
const TODAY = "(now() AT TIME ZONE 'Europe/Copenhagen')::date";
/** True when the timestamp falls in the last $1 days (today included). */
const inRange = (col: string) => `${DAY(col)} > ${TODAY} - $1::int`;

const q = (text: string, params: unknown[] = []) => db().query(text, params) as Promise<Row[]>;

export type Overview = Awaited<ReturnType<typeof getOverview>>;

export async function getOverview(days: number) {
  const ig = `source = 'instagram' AND ${inRange("started_at")}`;
  const [
    fixed,
    kpi,
    anonymous,
    series,
    placements,
    countries,
    cities,
    points,
    devices,
    systems,
    browsers,
    pages,
    recent,
    active,
  ] = await Promise.all([
    q(`
      WITH s AS (
        SELECT visitor_id, ${DAY("started_at")} AS d
        FROM sessions
        WHERE source = 'instagram' AND started_at > now() - interval '62 days'
      ), t AS (SELECT ${TODAY} AS today)
      SELECT
        (count(DISTINCT visitor_id) FILTER (WHERE d = today))::int AS today,
        (count(DISTINCT visitor_id) FILTER (WHERE d = today - 1))::int AS yesterday,
        (count(DISTINCT visitor_id) FILTER (WHERE d > today - 7))::int AS d7,
        (count(DISTINCT visitor_id) FILTER (WHERE d > today - 14 AND d <= today - 7))::int AS prev7,
        (count(DISTINCT visitor_id) FILTER (WHERE d > today - 30))::int AS d30,
        (count(DISTINCT visitor_id) FILTER (WHERE d > today - 60 AND d <= today - 30))::int AS prev30
      FROM s CROSS JOIN t`),
    q(
      `SELECT
        count(*)::int AS sessions,
        count(DISTINCT visitor_id)::int AS visitors,
        COALESCE(avg(page_count), 0)::float AS avg_pages,
        COALESCE(avg(duration_seconds), 0)::float AS avg_duration,
        (count(*) FILTER (WHERE converted))::int AS lead_sessions,
        (count(DISTINCT visitor_id) FILTER (WHERE converted))::int AS lead_visitors,
        (count(*) FILTER (WHERE is_returning))::int AS returning_sessions,
        (count(*) FILTER (WHERE NOT is_returning))::int AS new_sessions
      FROM sessions WHERE ${ig}`,
      [days],
    ),
    q(
      `SELECT count(*)::int AS count FROM anonymous_visits
       WHERE source = 'instagram' AND ${inRange("created_at")}`,
      [days],
    ),
    q(
      `SELECT to_char(d.day, 'YYYY-MM-DD') AS day,
              count(s.id)::int AS visits,
              count(DISTINCT s.visitor_id)::int AS visitors,
              (count(s.id) FILTER (WHERE s.converted))::int AS leads
       FROM generate_series(${TODAY} - ($1::int - 1), ${TODAY}, interval '1 day') AS d(day)
       LEFT JOIN sessions s
         ON s.source = 'instagram' AND ${DAY("s.started_at")} = d.day::date
       GROUP BY d.day ORDER BY d.day`,
      [days],
    ),
    q(
      `SELECT COALESCE(ig_placement, 'unknown') AS key, count(*)::int AS count
       FROM sessions WHERE ${ig} GROUP BY 1`,
      [days],
    ),
    q(
      `SELECT country_code AS code, COALESCE(country, 'Unknown') AS label, count(*)::int AS count
       FROM sessions WHERE ${ig} GROUP BY 1, 2 ORDER BY count DESC, label LIMIT 8`,
      [days],
    ),
    q(
      `SELECT city AS label, country_code AS code, count(*)::int AS count
       FROM sessions WHERE ${ig} AND city IS NOT NULL
       GROUP BY 1, 2 ORDER BY count DESC, label LIMIT 8`,
      [days],
    ),
    q(
      `SELECT COALESCE(city, country, 'Unknown') AS label, country,
              round(latitude::numeric, 1)::float AS lat,
              round(longitude::numeric, 1)::float AS lon,
              count(*)::int AS count
       FROM sessions
       WHERE ${ig} AND latitude IS NOT NULL AND longitude IS NOT NULL
       GROUP BY 1, 2, 3, 4 ORDER BY count DESC LIMIT 300`,
      [days],
    ),
    q(
      `SELECT COALESCE(device_type, 'unknown') AS label, count(*)::int AS count
       FROM sessions WHERE ${ig} GROUP BY 1 ORDER BY count DESC LIMIT 6`,
      [days],
    ),
    q(
      `SELECT COALESCE(os, 'Unknown') AS label, count(*)::int AS count
       FROM sessions WHERE ${ig} GROUP BY 1 ORDER BY count DESC LIMIT 6`,
      [days],
    ),
    q(
      `SELECT COALESCE(browser, 'Unknown') AS label, count(*)::int AS count
       FROM sessions WHERE ${ig} GROUP BY 1 ORDER BY count DESC LIMIT 6`,
      [days],
    ),
    q(
      `SELECT p.path AS label, count(*)::int AS count,
              COALESCE(avg(p.time_on_page_seconds), 0)::float AS avg_time
       FROM pageviews p JOIN sessions s ON s.id = p.session_id
       WHERE s.source = 'instagram' AND ${inRange("s.started_at")}
       GROUP BY 1 ORDER BY count DESC, label LIMIT 8`,
      [days],
    ),
    q(`
      SELECT s.*, v.linked_lead_name,
             (s.ended_at IS NULL AND s.last_activity_at > now() - interval '5 minutes') AS is_active
      FROM sessions s JOIN visitors v ON v.id = s.visitor_id
      WHERE s.source = 'instagram'
      ORDER BY s.last_activity_at DESC LIMIT 8`),
    q(`
      SELECT count(*)::int AS count FROM sessions
      WHERE source = 'instagram' AND ended_at IS NULL
        AND last_activity_at > now() - interval '5 minutes'`),
  ]);

  return {
    fixed: fixed[0],
    kpi: kpi[0],
    anonymous: anonymous[0].count as number,
    series,
    placements,
    countries,
    cities,
    points,
    devices,
    systems,
    browsers,
    pages,
    recent,
    activeNow: active[0].count as number,
  };
}

export type VisitFilters = {
  source: "instagram" | "all";
  from?: string;
  to?: string;
  country?: string;
  device?: string;
  converted?: string;
  q?: string;
};

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function visitWhere(f: VisitFilters) {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replaceAll("?", `$${params.length}`));
  };
  if (f.source !== "all") where.push("s.source = 'instagram'");
  if (f.from && DATE.test(f.from)) add(`${DAY("s.started_at")} >= ?::date`, f.from);
  if (f.to && DATE.test(f.to)) add(`${DAY("s.started_at")} <= ?::date`, f.to);
  if (f.country) add("s.country_code = ?", f.country.toUpperCase().slice(0, 2));
  if (f.device) add("s.device_type = ?", f.device.slice(0, 20));
  if (f.converted === "yes") where.push("s.converted");
  if (f.converted === "no") where.push("NOT s.converted");
  if (f.q?.trim()) {
    add(
      `(s.city ILIKE ? OR s.country ILIKE ? OR s.region ILIKE ? OR s.landing_page ILIKE ?
        OR s.utm_campaign ILIKE ? OR s.device_model ILIKE ? OR s.isp ILIKE ?
        OR v.linked_lead_name ILIKE ? OR v.linked_lead_email ILIKE ?)`,
      `%${f.q
        .trim()
        .slice(0, 80)
        .replace(/[%_\\]/g, "\\$&")}%`,
    );
  }
  return { clause: where.length ? `WHERE ${where.join(" AND ")}` : "", params };
}

export async function listVisits(f: VisitFilters, limit: number, offset: number) {
  const { clause, params } = visitWhere(f);
  const [rows, total] = await Promise.all([
    q(
      `SELECT s.*, v.linked_lead_name, v.linked_lead_email, v.linked_lead_phone, v.visit_count
       FROM sessions s JOIN visitors v ON v.id = s.visitor_id
       ${clause}
       ORDER BY s.started_at DESC
       LIMIT ${Math.floor(limit)} OFFSET ${Math.floor(offset)}`,
      params,
    ),
    q(
      `SELECT count(*)::int AS count FROM sessions s JOIN visitors v ON v.id = s.visitor_id ${clause}`,
      params,
    ),
  ]);
  return { rows, total: total[0].count as number };
}

export function listCountries() {
  return q(`
    SELECT country_code AS code, max(country) AS label FROM sessions
    WHERE country_code IS NOT NULL GROUP BY 1 ORDER BY 2`);
}

export async function getVisitor(id: string) {
  const [visitor] = await db()`SELECT * FROM visitors WHERE id = ${id}`;
  if (!visitor) return null;
  const [sessions, pageviews, events, notifications, leads] = await Promise.all([
    db()`SELECT * FROM sessions WHERE visitor_id = ${id} ORDER BY started_at DESC`,
    db()`
      SELECT p.* FROM pageviews p JOIN sessions s ON s.id = p.session_id
      WHERE s.visitor_id = ${id} ORDER BY p.entered_at`,
    db()`
      SELECT e.* FROM events e JOIN sessions s ON s.id = e.session_id
      WHERE s.visitor_id = ${id} ORDER BY e.created_at`,
    db()`SELECT * FROM notifications WHERE visitor_id = ${id} ORDER BY sent_at DESC LIMIT 50`,
    db()`SELECT * FROM leads WHERE visitor_id = ${id} ORDER BY created_at DESC`,
  ]);
  return { visitor, sessions, pageviews, events, notifications, leads };
}

export function listLeads() {
  return q(`
    SELECT l.*,
           s.source, s.ig_placement, s.utm_source, s.utm_medium, s.utm_campaign, s.referrer,
           s.country, s.country_code, s.region, s.city,
           s.device_type, s.device_vendor, s.device_model, s.os, s.os_version,
           s.browser, s.browser_version, s.visit_number, s.page_count, s.duration_seconds,
           (SELECT array_agg(p.path ORDER BY p.entered_at)
              FROM pageviews p WHERE p.session_id = l.session_id) AS journey
    FROM leads l LEFT JOIN sessions s ON s.id = l.session_id
    ORDER BY l.created_at DESC LIMIT 200`);
}

export function listNotifications() {
  return q(`
    SELECT n.*, s.city, s.country, s.country_code
    FROM notifications n LEFT JOIN sessions s ON s.id = n.session_id
    ORDER BY n.sent_at DESC LIMIT 200`);
}

/** Which tagged Instagram link brought the most visits and leads. */
export function linkPerformance() {
  return q(`
    SELECT COALESCE(ig_placement, 'unknown') AS placement,
           utm_campaign AS campaign,
           (utm_source IS NOT NULL) AS tagged,
           count(*)::int AS visits,
           count(DISTINCT visitor_id)::int AS visitors,
           (count(*) FILTER (WHERE converted))::int AS leads,
           COALESCE(avg(page_count), 0)::float AS avg_pages
    FROM sessions WHERE source = 'instagram'
    GROUP BY 1, 2, 3 ORDER BY visits DESC, leads DESC LIMIT 50`);
}

export async function tableCounts() {
  const [row] = await q(`
    SELECT (SELECT count(*) FROM visitors)::int AS visitors,
           (SELECT count(*) FROM sessions)::int AS sessions,
           (SELECT count(*) FROM leads)::int AS leads,
           (SELECT count(*) FROM notifications)::int AS notifications`);
  return row;
}
