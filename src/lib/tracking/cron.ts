import crypto from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { hasDb } from "./db";
import { TIME_ZONE } from "./format";
import { closeStaleSessions, purgeOldData, sendDailyDigest } from "./notify";
import { siteOrigin } from "./settings";

/** Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" automatically. */
export function isCronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/**
 * Address used for dashboard links in emails sent by cron jobs. On Vercel this
 * is the production domain, not the internal address the cron job was called on.
 */
export function cronOrigin(request: NextRequest) {
  return process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.SITE_URL
    ? siteOrigin()
    : siteOrigin(request.nextUrl.origin);
}

/**
 * Daily job: close leftover sessions, delete old data, send the digest.
 *
 * Vercel Cron runs in UTC and on the Hobby plan only once a day per job, so
 * vercel.json schedules two jobs, at 06:00 and 07:00 UTC. The digest goes out
 * on the first run at or after 08:00 Copenhagen time (06:00 UTC in summer,
 * 07:00 UTC in winter) and is never sent twice. Add ?force=1 to send it now.
 */
export async function runDailyJob(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDb()) return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 500 });

  const origin = cronOrigin(request);
  const swept = await closeStaleSessions(origin);
  const purged = await purgeOldData();

  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      hour12: false,
    }).format(new Date()),
  );
  const force = request.nextUrl.searchParams.get("force") === "1";
  const digest =
    hour >= 8 || force
      ? await sendDailyDigest(origin)
      : { sent: false, why: "before 08:00 Copenhagen time" };

  return NextResponse.json({ ok: true, swept, purged, digest });
}
