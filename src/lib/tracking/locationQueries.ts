import type { Row } from "./db";
import { CHANNEL_SQL, type Channel, UNCERTAIN_SQL, isChannel } from "./location";
import { q } from "./queries";

/* Queries for Admin → Locations. Hidden visits (scanners, cloud networks, the owner) never count. */

export type Segment = "all" | "instagram_any" | Channel;

export const SEGMENTS: { value: Segment; label: string }[] = [
  { value: "all", label: "All sources" },
  { value: "instagram_any", label: "Instagram (all)" },
  { value: "instagram_bio", label: "/dk bio link" },
  { value: "instagram", label: "Instagram other" },
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
  { value: "direct", label: "Direct" },
  { value: "other", label: "Other sites" },
];

export const parseSegment = (value: string | undefined): Segment =>
  value === "instagram_any" || isChannel(value) ? value : "all";

export type LocationFilters = {
  days: number;
  /** "DK" for Denmark only, "all" for every country. */
  country: "DK" | "all";
  segment: Segment;
};

const DAY = "(s.started_at AT TIME ZONE 'Europe/Copenhagen')::date";
const TODAY = "(now() AT TIME ZONE 'Europe/Copenhagen')::date";

function where(f: LocationFilters, withSegment = true) {
  const parts = ["NOT s.is_bot", `${DAY} > ${TODAY} - $1::int`];
  if (f.country === "DK") parts.push("s.country_code = 'DK'");
  if (withSegment && f.segment === "instagram_any") parts.push("s.source = 'instagram'");
  // The segment was checked against the fixed list above, so it is safe to inline.
  else if (withSegment && isChannel(f.segment)) parts.push(`${CHANNEL_SQL} = '${f.segment}'`);
  return parts.join(" AND ");
}

const UNCERTAIN_LABEL = "'Copenhagen? (uncertain)'";

export async function getLocations(f: LocationFilters) {
  const all = where(f);
  const anySource = where(f, false);
  const params = [f.days];

  const [overall, sources, segment, cities, regions, points, visits] = await Promise.all([
    // Every source: how many visitors, and how many came from Instagram and /dk.
    q(
      `SELECT count(DISTINCT s.visitor_id)::int AS visitors,
              (count(DISTINCT s.visitor_id) FILTER (WHERE s.source = 'instagram'))::int AS instagram,
              (count(DISTINCT s.visitor_id)
                 FILTER (WHERE s.source = 'instagram' AND s.ig_placement = 'bio'))::int AS bio,
              (count(DISTINCT s.visitor_id) FILTER (WHERE s.converted))::int AS leads
       FROM sessions s WHERE ${anySource}`,
      params,
    ),
    q(
      `SELECT ${CHANNEL_SQL} AS channel,
              count(*)::int AS visits,
              count(DISTINCT s.visitor_id)::int AS visitors,
              (count(DISTINCT s.visitor_id) FILTER (WHERE s.converted))::int AS leads
       FROM sessions s WHERE ${anySource}
       GROUP BY 1 ORDER BY visitors DESC`,
      params,
    ),
    // The chosen source only.
    q(
      `SELECT count(*)::int AS visits,
              count(DISTINCT s.visitor_id)::int AS visitors,
              (count(DISTINCT s.visitor_id) FILTER (WHERE s.converted))::int AS leads,
              (count(*) FILTER (WHERE s.city IS NOT NULL AND NOT ${UNCERTAIN_SQL}))::int AS known_city,
              (count(*) FILTER (WHERE ${UNCERTAIN_SQL}))::int AS uncertain,
              (count(*) FILTER (WHERE s.geo_source = 'ipinfo'))::int AS improved
       FROM sessions s WHERE ${all}`,
      params,
    ),
    q(
      `SELECT CASE WHEN ${UNCERTAIN_SQL} THEN NULL ELSE s.city END AS city,
              max(CASE WHEN ${UNCERTAIN_SQL} THEN NULL ELSE s.region END) AS region,
              s.country_code AS code,
              max(s.country) AS country,
              ${UNCERTAIN_SQL} AS uncertain,
              count(*)::int AS visits,
              count(DISTINCT s.visitor_id)::int AS visitors,
              (count(DISTINCT s.visitor_id) FILTER (WHERE s.source = 'instagram'))::int AS instagram,
              (count(DISTINCT s.visitor_id)
                 FILTER (WHERE s.source = 'instagram' AND s.ig_placement = 'bio'))::int AS bio,
              (count(DISTINCT s.visitor_id) FILTER (WHERE s.converted))::int AS leads,
              (count(DISTINCT s.visitor_id)
                 FILTER (WHERE s.form_started OR s.high_interest))::int AS engaged,
              COALESCE(avg(s.duration_seconds), 0)::float AS avg_duration,
              COALESCE(avg(s.page_count), 0)::float AS avg_pages,
              avg(s.latitude)::float AS lat,
              avg(s.longitude)::float AS lon,
              string_agg(DISTINCT CASE WHEN ${UNCERTAIN_SQL} THEN NULL ELSE s.postal_code END, ', ')
                AS postcodes,
              max(s.started_at) AS last_visit
       FROM sessions s WHERE ${all}
       GROUP BY 1, 3, 5
       ORDER BY visitors DESC, leads DESC, city NULLS LAST
       LIMIT 200`,
      params,
    ),
    q(
      `SELECT CASE WHEN ${UNCERTAIN_SQL} OR s.region IS NULL THEN 'Unknown' ELSE s.region END AS region,
              count(DISTINCT s.visitor_id)::int AS visitors,
              (count(DISTINCT s.visitor_id) FILTER (WHERE s.converted))::int AS leads
       FROM sessions s WHERE ${all} AND s.country_code = 'DK'
       GROUP BY 1 ORDER BY visitors DESC`,
      params,
    ),
    q(
      `SELECT CASE WHEN ${UNCERTAIN_SQL} THEN ${UNCERTAIN_LABEL}
                   ELSE COALESCE(s.city, s.country, 'Unknown') END AS label,
              max(s.country) AS country,
              round(s.latitude::numeric, 1)::float AS lat,
              round(s.longitude::numeric, 1)::float AS lon,
              count(*)::int AS count
       FROM sessions s
       WHERE ${all} AND s.latitude IS NOT NULL AND s.longitude IS NOT NULL
       GROUP BY 1, 3, 4 ORDER BY count DESC LIMIT 300`,
      params,
    ),
    q(
      `SELECT s.*, ${CHANNEL_SQL} AS channel, v.linked_lead_name
       FROM sessions s JOIN visitors v ON v.id = s.visitor_id
       WHERE ${all}
       ORDER BY s.started_at DESC LIMIT 60`,
      params,
    ),
  ]);

  return {
    overall: overall[0],
    sources: sources as (Row & { channel: Channel })[],
    segment: segment[0],
    cities,
    regions,
    points: points as {
      label: string;
      country: string | null;
      lat: number;
      lon: number;
      count: number;
    }[],
    visits,
  };
}

export type Locations = Awaited<ReturnType<typeof getLocations>>;
