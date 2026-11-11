import { ADMIN_COOKIE, verifySessionToken } from "@/lib/tracking/adminToken";
import { hasDb } from "@/lib/tracking/db";
import { isBot, isUuid } from "@/lib/tracking/detect";
import { siteOrigin } from "@/lib/tracking/settings";
import {
  SESSION_COOKIE,
  type TrackContext,
  VISITOR_COOKIE,
  recordAnonymous,
  recordEvent,
  recordPageview,
  recordPing,
} from "@/lib/tracking/track";
import { type NextRequest, NextResponse, after } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Background work (emails, and the short wait after a visitor leaves) may
// continue after the response has been sent.
export const maxDuration = 60;

const empty = () => new NextResponse(null, { status: 204 });

const cookieOptions = (maxAge: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge,
});

export async function POST(request: NextRequest) {
  try {
    if (!hasDb()) return empty();

    const ua = request.headers.get("user-agent") || "";
    if (isBot(ua)) return empty();

    // Do not record the site owner while they are logged in to the dashboard.
    if (verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value)) return empty();

    // Only accept calls from our own pages.
    const origin = request.headers.get("origin");
    if (origin && new URL(origin).host !== request.headers.get("host")) {
      return new NextResponse(null, { status: 403 });
    }

    const body = JSON.parse(await request.text()) as Record<string, unknown>;
    const vid = request.cookies.get(VISITOR_COOKIE)?.value;
    const sid = request.cookies.get(SESSION_COOKIE)?.value;
    const ctx: TrackContext = {
      headers: request.headers,
      ua,
      vid: isUuid(vid) ? vid : null,
      sid: isUuid(sid) ? sid : null,
      origin: siteOrigin(request.nextUrl.origin),
    };

    if (body.t === "anon") {
      await recordAnonymous(ctx, body);
      return empty();
    }

    if (body.t === "revoke") {
      const res = empty();
      res.cookies.delete(VISITOR_COOKIE);
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }

    // Everything below needs cookie consent.
    if (body.c !== 1) return empty();

    if (body.t === "pv") {
      const result = await recordPageview(ctx, body);
      if (!result) return empty();
      after(() => result.background().catch((err) => console.error("track background", err)));
      const res = NextResponse.json({ ok: true });
      res.cookies.set(VISITOR_COOKIE, result.visitorId, cookieOptions(60 * 60 * 24 * 365));
      res.cookies.set(SESSION_COOKIE, result.sessionId, cookieOptions(60 * 60 * 4));
      return res;
    }

    if (body.t === "ping") {
      const result = await recordPing(ctx, body);
      const background = result.background;
      if (background) {
        after(() => background().catch((err) => console.error("track background", err)));
      }
      return NextResponse.json({ ok: true, expired: result.expired });
    }

    if (body.t === "ev") {
      await recordEvent(ctx, body);
    }
    return empty();
  } catch (err) {
    console.error("track", err);
    return empty();
  }
}
