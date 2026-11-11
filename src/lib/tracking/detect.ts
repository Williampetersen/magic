import crypto from "node:crypto";
import { UAParser } from "ua-parser-js";

export type Utm = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
  content: string | null;
};

export const clip = (value: unknown, max = 300): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
};

export function parseUtm(search: string | null | undefined): Utm {
  const params = new URLSearchParams(search || "");
  return {
    source: clip(params.get("utm_source"), 100),
    medium: clip(params.get("utm_medium"), 100),
    campaign: clip(params.get("utm_campaign"), 150),
    content: clip(params.get("utm_content"), 150),
  };
}

function hostOf(url: string | null) {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

export const isInstagramInApp = (ua: string) => /Instagram/i.test(ua);

/** Instagram visitor = tagged link, Instagram referrer, or the Instagram in-app browser. */
export function isInstagramVisit(utm: Utm, referrer: string | null, ua: string) {
  const source = (utm.source || "").toLowerCase();
  if (source === "instagram" || source === "ig") return true;
  const host = hostOf(referrer);
  if (host === "instagram.com" || host.endsWith(".instagram.com")) return true;
  return isInstagramInApp(ua);
}

export type Placement = "bio" | "story" | "post" | "dm" | "unknown";

export function igPlacement(utm: Utm): Placement {
  for (const raw of [utm.medium, utm.content]) {
    const v = (raw || "").toLowerCase();
    if (!v) continue;
    if (/bio|profile/.test(v)) return "bio";
    if (/stor/.test(v)) return "story";
    if (/post|feed|reel/.test(v)) return "post";
    if (/^dm|direct|message/.test(v)) return "dm";
  }
  return "unknown";
}

const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|facebookcatalog|meta-external|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|axios|node-fetch|undici|go-http|okhttp|scrapy|phantomjs|puppeteer|playwright|vercel|inspectiontool|bingpreview|whatsapp|telegram|slack|discord|embedly|skype|pinterest|ahrefs|semrush|preview/i;

export function isBot(ua: string) {
  return !ua || ua.length < 20 || BOT_PATTERN.test(ua);
}

const IPHONE_MODELS: Record<string, string> = {
  "iPhone12,1": "iPhone 11",
  "iPhone12,3": "iPhone 11 Pro",
  "iPhone12,5": "iPhone 11 Pro Max",
  "iPhone12,8": "iPhone SE (2nd gen)",
  "iPhone13,1": "iPhone 12 mini",
  "iPhone13,2": "iPhone 12",
  "iPhone13,3": "iPhone 12 Pro",
  "iPhone13,4": "iPhone 12 Pro Max",
  "iPhone14,4": "iPhone 13 mini",
  "iPhone14,5": "iPhone 13",
  "iPhone14,2": "iPhone 13 Pro",
  "iPhone14,3": "iPhone 13 Pro Max",
  "iPhone14,6": "iPhone SE (3rd gen)",
  "iPhone14,7": "iPhone 14",
  "iPhone14,8": "iPhone 14 Plus",
  "iPhone15,2": "iPhone 14 Pro",
  "iPhone15,3": "iPhone 14 Pro Max",
  "iPhone15,4": "iPhone 15",
  "iPhone15,5": "iPhone 15 Plus",
  "iPhone16,1": "iPhone 15 Pro",
  "iPhone16,2": "iPhone 15 Pro Max",
  "iPhone17,3": "iPhone 16",
  "iPhone17,4": "iPhone 16 Plus",
  "iPhone17,1": "iPhone 16 Pro",
  "iPhone17,2": "iPhone 16 Pro Max",
  "iPhone17,5": "iPhone 16e",
};

/** Samsung sends a product code. These are the common recent phones. */
const GALAXY_MODELS: Record<string, string> = {
  "SM-S938": "Galaxy S25 Ultra",
  "SM-S936": "Galaxy S25+",
  "SM-S931": "Galaxy S25",
  "SM-S928": "Galaxy S24 Ultra",
  "SM-S926": "Galaxy S24+",
  "SM-S921": "Galaxy S24",
  "SM-S918": "Galaxy S23 Ultra",
  "SM-S916": "Galaxy S23+",
  "SM-S911": "Galaxy S23",
  "SM-S908": "Galaxy S22 Ultra",
  "SM-S906": "Galaxy S22+",
  "SM-S901": "Galaxy S22",
  "SM-G998": "Galaxy S21 Ultra",
  "SM-G996": "Galaxy S21+",
  "SM-G991": "Galaxy S21",
  "SM-A566": "Galaxy A56",
  "SM-A556": "Galaxy A55",
  "SM-A546": "Galaxy A54",
  "SM-A536": "Galaxy A53",
  "SM-A528": "Galaxy A52s",
  "SM-A366": "Galaxy A36",
  "SM-A356": "Galaxy A35",
  "SM-A346": "Galaxy A34",
  "SM-A256": "Galaxy A25",
  "SM-A166": "Galaxy A16",
  "SM-A156": "Galaxy A15",
};

export function parseUserAgent(ua: string) {
  const r = new UAParser(ua).getResult();
  let model = r.device.model || null;
  // The Instagram app adds the exact Apple hardware id, e.g. "(iPhone14,5; iOS 17_0; ...)"
  const apple = ua.match(/Instagram [\d.]+ \((iP(?:hone|ad)\d+,\d+)/);
  if (apple) model = IPHONE_MODELS[apple[1]] || `${model || "Apple"} (${apple[1]})`;
  const galaxy = model ? GALAXY_MODELS[model.slice(0, 7)] : undefined;
  if (galaxy) model = `${galaxy} (${model})`;
  return {
    device_type: r.device.type || "desktop",
    device_vendor: r.device.vendor || null,
    device_model: model,
    os: r.os.name || null,
    os_version: r.os.version || null,
    browser: r.browser.name || null,
    browser_version: r.browser.version || null,
  };
}

const DK_REGIONS: Record<string, string> = {
  "81": "Nordjylland",
  "82": "Midtjylland",
  "83": "Syddanmark",
  "84": "Hovedstaden",
  "85": "Sjælland",
};

const regionNames = new Intl.DisplayNames(["en"], { type: "region" });

export function countryName(code: string | null) {
  if (!code) return null;
  try {
    return regionNames.of(code.toUpperCase()) || code;
  } catch {
    return code;
  }
}

function decode(value: string | null) {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function toNumber(value: string | null) {
  const n = Number.parseFloat(value || "");
  return Number.isFinite(n) ? n : null;
}

/** Location from the headers Vercel adds to every request. */
export function geoFromHeaders(h: Headers) {
  const code = clip(h.get("x-vercel-ip-country"), 2)?.toUpperCase() || null;
  const regionCode = clip(h.get("x-vercel-ip-country-region"), 10);
  return {
    country_code: code,
    country: countryName(code),
    region: code === "DK" && regionCode ? DK_REGIONS[regionCode] || regionCode : regionCode,
    city: clip(decode(h.get("x-vercel-ip-city")), 120),
    postal_code: clip(h.get("x-vercel-ip-postal-code"), 20),
    latitude: toNumber(h.get("x-vercel-ip-latitude")),
    longitude: toNumber(h.get("x-vercel-ip-longitude")),
    timezone: clip(h.get("x-vercel-ip-timezone"), 60),
  };
}

export function clientIp(h: Headers) {
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || null;
}

/** 85.191.12.34 becomes 85.191.xxx.xxx. The full address is never stored. */
export function maskIp(ip: string | null) {
  if (!ip) return null;
  if (ip.includes(".") && !ip.includes(":")) {
    const parts = ip.split(".");
    return parts.length === 4 ? `${parts[0]}.${parts[1]}.xxx.xxx` : null;
  }
  const groups = ip.split(":").filter(Boolean);
  return groups.length ? `${groups.slice(0, 3).join(":")}:xxxx:xxxx` : null;
}

export function hashIp(ip: string | null) {
  const salt = process.env.IP_HASH_SALT;
  if (!ip || !salt) return null;
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

/** Optional ISP lookup. Only runs when IPINFO_TOKEN is set. */
export async function lookupIsp(ip: string | null) {
  const token = process.env.IPINFO_TOKEN;
  if (!token || !ip || ip === "::1" || ip.startsWith("127.") || ip.startsWith("192.168.")) {
    return null;
  }
  try {
    const res = await fetch(`https://ipinfo.io/${encodeURIComponent(ip)}/json?token=${token}`, {
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const isp: string | null =
      data.carrier?.name || data.company?.name || data.org?.replace(/^AS\d+\s+/, "") || null;
    const network: string | null = data.carrier?.name ? "mobile" : data.company?.type || null;
    return { isp: clip(isp, 150), network: clip(network, 40) };
  } catch {
    return null;
  }
}

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_PATTERN.test(v);
