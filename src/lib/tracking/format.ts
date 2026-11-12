import type { Row } from "./db";

export const TIME_ZONE = "Europe/Copenhagen";

const dateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const timeOnly = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

const dayOnly = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  weekday: "short",
  day: "numeric",
  month: "short",
});

type DateInput = string | Date | null | undefined;

export const fmtDateTime = (d: DateInput) => (d ? dateTime.format(new Date(d)) : "–");
export const fmtTime = (d: DateInput) => (d ? timeOnly.format(new Date(d)) : "–");
export const fmtDay = (d: DateInput) => (d ? dayOnly.format(new Date(d)) : "–");

export function fmtDuration(seconds: number | null | undefined) {
  const s = Math.max(0, Math.round(Number(seconds) || 0));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${String(s % 60).padStart(2, "0")}s`;
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

export function fmtAgo(d: DateInput, now = Date.now()) {
  if (!d) return "–";
  const diff = Math.max(0, Math.round((now - new Date(d).getTime()) / 1000));
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  const days = Math.floor(diff / 86400);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

export const PLACEMENT_LABELS: Record<string, string> = {
  bio: "Bio link",
  story: "Story",
  post: "Post / Reel",
  dm: "Direct message",
  unknown: "Unknown placement",
};

export const placementLabel = (p: string | null | undefined) =>
  PLACEMENT_LABELS[p || "unknown"] || PLACEMENT_LABELS.unknown;

/** "Instagram story", "Instagram bio link", "Direct / other" */
export function sourceLabel(s: Row) {
  if (s.source !== "instagram") {
    if (s.utm_source) return `${s.utm_source}${s.utm_medium ? ` / ${s.utm_medium}` : ""}`;
    if (s.referrer) {
      try {
        return new URL(s.referrer).hostname.replace(/^www\./, "");
      } catch {
        return "Other";
      }
    }
    return "Direct";
  }
  const placement = s.ig_placement && s.ig_placement !== "unknown" ? s.ig_placement : null;
  const names: Record<string, string> = {
    bio: "Instagram bio link",
    story: "Instagram story",
    post: "Instagram post",
    dm: "Instagram DM",
  };
  return placement ? names[placement] : "Instagram";
}

export function locationLabel(s: Row) {
  // Outside Denmark the region is only a short code ("NH", "03"), which says little.
  const region = s.region && !/^[A-Z0-9]{1,3}$/.test(s.region) ? s.region : null;
  return [s.city, region, s.country].filter(Boolean).join(", ") || "Unknown location";
}

/**
 * "Jernbanegade, 1609 Copenhagen": the road nearest to the visit's coordinates.
 * Approximate, because the coordinates come from the IP address.
 */
export function nearestAddress(s: Row) {
  const town = [s.near_postcode, s.near_city].filter(Boolean).join(" ");
  return [s.near_road, town].filter(Boolean).join(", ") || null;
}

export const googleMapsUrl = (latitude: number, longitude: number) =>
  `https://www.google.com/maps/search/?api=1&query=${latitude}%2C${longitude}`;

/** "iPhone 13", "Samsung Galaxy S23 Ultra", "Mac", "Windows computer" */
export function deviceName(s: Row) {
  if (s.device_model === "Macintosh") return "Mac";
  if (s.device_model) {
    const showVendor =
      s.device_vendor && s.device_vendor !== "Apple" && !s.device_model.startsWith(s.device_vendor);
    return showVendor ? `${s.device_vendor} ${s.device_model}` : s.device_model;
  }
  if (s.device_type === "mobile") return "Phone";
  if (s.device_type === "tablet") return "Tablet";
  if (!s.device_type || s.device_type === "desktop") return s.os ? `${s.os} computer` : "Computer";
  return s.device_type[0].toUpperCase() + s.device_type.slice(1);
}

export function deviceLabel(s: Row) {
  const os = [s.os, s.os_version].filter(Boolean).join(" ");
  const browser = [s.browser, s.browser_version?.split(".")[0]].filter(Boolean).join(" ");
  return [deviceName(s), os, browser].filter(Boolean).join(" · ");
}
