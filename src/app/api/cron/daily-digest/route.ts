import { runDailyJob } from "@/lib/tracking/cron";
import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Runs at 06:00 UTC, which is 08:00 in Copenhagen during summer time. */
export function GET(request: NextRequest) {
  return runDailyJob(request);
}
