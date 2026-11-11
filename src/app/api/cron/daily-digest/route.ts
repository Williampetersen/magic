import { type NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/tracking/cron";
import { hasDb } from "@/lib/tracking/db";
import { TIME_ZONE } from "@/lib/tracking/format";
import { closeStaleSessions, purgeOldData, sendDailyDigest } from "@/lib/tracking/notify";
import { siteOrigin } from "@/lib/tracking/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily job: close leftover sessions, delete old data, send the digest.
 *
 * Vercel Cron runs in UTC, so vercel.json schedules this at 06:00 and 07:00 UTC.
 * The digest goes out on the first run at or after 08:00 Copenhagen time
 * (06:00 UTC in summer, 07:00 UTC in winter) and is never sent twice.
 * Add ?force=1 to send it right away.
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDb()) return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 500 });

  const origin = siteOrigin();
  const swept = await closeStaleSessions(origin);
  const purged = await purgeOldData();

  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, hour: "2-digit", hour12: false }).format(
      new Date(),
    ),
  );
  const force = request.nextUrl.searchParams.get("force") === "1";
  const digest =
    hour >= 8 || force
      ? await sendDailyDigest(origin)
      : { sent: false, why: "before 08:00 Copenhagen time" };

  return NextResponse.json({ ok: true, swept, purged, digest });
}
