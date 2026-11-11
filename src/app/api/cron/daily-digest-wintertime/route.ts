import { runDailyJob } from "@/lib/tracking/cron";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Runs at 07:00 UTC, which is 08:00 in Copenhagen during winter time.
 * In summer the 06:00 UTC job has already sent the digest, so this one only
 * tidies up.
 */
export function GET(request: NextRequest) {
  return runDailyJob(request);
}
