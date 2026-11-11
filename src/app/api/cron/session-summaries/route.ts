import { type NextRequest, NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/tracking/cron";
import { hasDb } from "@/lib/tracking/db";
import { closeStaleSessions } from "@/lib/tracking/notify";
import { siteOrigin } from "@/lib/tracking/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Ends inactive sessions and sends their summary emails.
 * Can also be called by an external scheduler every few minutes
 * (same "Authorization: Bearer CRON_SECRET" header).
 */
export async function GET(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasDb()) return NextResponse.json({ error: "DATABASE_URL is not set" }, { status: 500 });

  let closed = 0;
  let emails = 0;
  // Work through the backlog in batches of 25.
  for (let i = 0; i < 8; i++) {
    const result = await closeStaleSessions(siteOrigin());
    closed += result.closed;
    emails += result.emails;
    if (result.closed < 25) break;
  }
  return NextResponse.json({ ok: true, closed, emails });
}
