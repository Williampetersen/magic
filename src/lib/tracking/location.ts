import type { Row } from "./db";

/*
 * Where a visit came from (channel) and how far its location can be trusted.
 *
 * Vercel looks the visitor's IP address up in a location database. For most
 * Danish internet providers, and for every mobile network, that database only
 * knows where the provider registered its addresses: central Copenhagen. Those
 * visits all get the same point (the Copenhagen city centre, postal code 1072),
 * whether the person sits in Copenhagen, Odense or Aalborg. Such a visit is
 * "uncertain": the country is right, the city may not be.
 */

/** City-centre points that IP databases use when they only know the provider. */
const FALLBACK_POINTS = [{ country: "DK", lat: 55.67594, lon: 12.56553 }];

const near = (a: unknown, b: number) => typeof a === "number" && Math.abs(a - b) < 0.0006;

/** True when the city is only the internet provider's registered address. */
export function isUncertain(s: Row) {
  if (s.geo_source === "ipinfo") return false;
  return FALLBACK_POINTS.some(
    (p) => s.country_code === p.country && near(s.latitude, p.lat) && near(s.longitude, p.lon),
  );
}

/** The same test in SQL, for a sessions row aliased `s`. */
export const UNCERTAIN_SQL = `(COALESCE(s.geo_source, 'vercel') <> 'ipinfo' AND (${FALLBACK_POINTS.map(
  (p) =>
    `(s.country_code = '${p.country}' AND abs(s.latitude - ${p.lat}) < 0.0006 AND abs(s.longitude - ${p.lon}) < 0.0006)`,
).join(" OR ")}))`;

/** Short city text for lists: "Aarhus", or "Copenhagen?" when uncertain. */
export function cityText(s: Row) {
  if (isUncertain(s)) return `${s.city || "Copenhagen"}?`;
  return s.city || s.country || "Unknown";
}

export const UNCERTAIN_HINT =
  "Uncertain: the internet provider (often a mobile network) is registered in Copenhagen, so the visitor can be anywhere in Denmark.";

/* ---------- Channels ---------- */

export const CHANNELS = [
  "instagram_bio",
  "instagram",
  "facebook",
  "google",
  "direct",
  "other",
] as const;
export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABELS: Record<Channel, string> = {
  instagram_bio: "Instagram bio link (/dk)",
  instagram: "Instagram (stories, posts, DMs, app)",
  facebook: "Facebook",
  google: "Google",
  direct: "Direct (typed in or saved)",
  other: "Other websites",
};

export const CHANNEL_SHORT: Record<Channel, string> = {
  instagram_bio: "/dk bio link",
  instagram: "Instagram",
  facebook: "Facebook",
  google: "Google",
  direct: "Direct",
  other: "Other sites",
};

export const isChannel = (v: unknown): v is Channel =>
  typeof v === "string" && (CHANNELS as readonly string[]).includes(v);

/**
 * Channel of a sessions row aliased `s`. Instagram first (tagged link,
 * Instagram referrer or the Instagram app), then Facebook (tag, referrer or
 * the Facebook app), Google, no referrer at all, and everything else.
 */
export const CHANNEL_SQL = `(CASE
  WHEN s.source = 'instagram' AND s.ig_placement = 'bio' THEN 'instagram_bio'
  WHEN s.source = 'instagram' THEN 'instagram'
  WHEN lower(COALESCE(s.utm_source, '')) IN ('facebook', 'fb', 'meta')
    OR s.referrer ~* '^https?://([a-z0-9-]+\\.)*(facebook\\.com|fb\\.com|fb\\.me)(/|:|$)'
    OR COALESCE(s.user_agent, '') ~ '(FBAN|FBAV|FB_IAB)' THEN 'facebook'
  WHEN lower(COALESCE(s.utm_source, '')) LIKE 'google%'
    OR s.referrer ~* '^https?://([a-z0-9-]+\\.)*google\\.[a-z.]+(/|:|$)' THEN 'google'
  WHEN s.utm_source IS NULL AND s.referrer IS NULL THEN 'direct'
  ELSE 'other'
END)`;

/* ---------- Danish regions ---------- */

/** Vercel gives Danish regions as codes (stored as these names); IPinfo gives English names. */
const DK_REGION_NAMES: Record<string, string> = {
  "capital region": "Hovedstaden",
  "capital region of denmark": "Hovedstaden",
  "central jutland": "Midtjylland",
  "central denmark region": "Midtjylland",
  "north denmark": "Nordjylland",
  "north denmark region": "Nordjylland",
  "region zealand": "Sjælland",
  zealand: "Sjælland",
  "south denmark": "Syddanmark",
  "region of southern denmark": "Syddanmark",
};

export function danishRegion(name: string | null) {
  if (!name) return null;
  return DK_REGION_NAMES[name.trim().toLowerCase()] || name;
}

/** The region name Meta Ads uses for each Danish region, for location targeting. */
export const META_DK_REGIONS: Record<string, string> = {
  Hovedstaden: "Capital Region of Denmark",
  Sjælland: "Region Zealand",
  Syddanmark: "Region of Southern Denmark",
  Midtjylland: "Central Denmark Region",
  Nordjylland: "North Denmark Region",
};
