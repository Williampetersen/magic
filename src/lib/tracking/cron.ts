import crypto from "node:crypto";
import type { NextRequest } from "next/server";

/** Vercel Cron sends "Authorization: Bearer <CRON_SECRET>" automatically. */
export function isCronAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}
