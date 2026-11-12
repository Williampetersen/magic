import { type Row, db } from "./db";
import { clip } from "./detect";

export type Place = { road: string | null; postcode: string | null; city: string | null };

const ENDPOINT = "https://nominatim.openstreetmap.org/reverse";
// OpenStreetMap asks every program to name itself. No personal details here.
const USER_AGENT = "website-visitor-dashboard/1.0";

/**
 * Nearest road, postal code and city to a coordinate, from OpenStreetMap
 * (Nominatim, free, no key). Only the coordinate is sent, never an IP address.
 *
 * Returns null when the lookup failed and can be tried again later, and an
 * empty place when OpenStreetMap has nothing near the point.
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<Place | null> {
  // zoom=17 is street level: a road name, no house number.
  const url = `${ENDPOINT}?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=17&addressdetails=1&accept-language=en`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!res.ok) {
      console.warn("nearest address lookup: status", res.status);
      return null;
    }
    const address = (await res.json())?.address;
    if (!address) return { road: null, postcode: null, city: null };
    return {
      road: clip(address.road || address.pedestrian || address.footway || address.square, 150),
      postcode: clip(address.postcode, 20),
      city: clip(
        address.city ||
          address.town ||
          address.village ||
          address.municipality ||
          address.hamlet ||
          address.county,
        120,
      ),
    };
  } catch (err) {
    console.warn("nearest address lookup:", err instanceof Error ? err.name : err);
    return null;
  }
}

/**
 * The nearest address for a point. A point is looked up once: the answer is
 * stored on every visit at that point, and later visits there reuse it.
 */
export async function nearestAddressFor(latitude: unknown, longitude: unknown) {
  if (typeof latitude !== "number" || typeof longitude !== "number") return null;

  const [known] = await db()`
    SELECT near_road AS road, near_postcode AS postcode, near_city AS city
    FROM sessions
    WHERE latitude = ${latitude} AND longitude = ${longitude} AND near_checked_at IS NOT NULL
    ORDER BY near_checked_at DESC LIMIT 1`;
  const place = (known as Place | undefined) ?? (await reverseGeocode(latitude, longitude));
  if (!place) return null;

  await db()`
    UPDATE sessions
    SET near_road = ${place.road}, near_postcode = ${place.postcode}, near_city = ${place.city},
        near_checked_at = now()
    WHERE latitude = ${latitude} AND longitude = ${longitude} AND near_checked_at IS NULL`;
  return place;
}

/** Looks the address up (if it is still missing) and puts it on the visit row. */
export async function addNearestAddress(session: Row | undefined) {
  if (!session || session.near_checked_at) return;
  try {
    const place = await nearestAddressFor(session.latitude, session.longitude);
    if (!place) return;
    session.near_road = place.road;
    session.near_postcode = place.postcode;
    session.near_city = place.city;
    session.near_checked_at = new Date().toISOString();
  } catch (err) {
    console.error("nearest address", err);
  }
}
