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
  sessionBelongsTo,
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
    // Visitors who accepted cookies are known by their cookies. Everyone else
    // is tracked without cookies: the page keeps the two IDs in memory and
    // sends them along (body.vid / body.sid). Nothing is stored on their device.
    const cookieVid = request.cookies.get(VISITOR_COOKIE)?.value;
    const cookieSid = request.cookies.get(SESSION_COOKIE)?.value;
    const vid = isUuid(cookieVid) ? cookieVid : body.vid;
    const sid = isUuid(cookieSid) ? cookieSid : body.sid;
    const ctx: TrackContext = {
      headers: request.headers,
      ua,
      vid: isUuid(vid) ? vid : null,
      sid: isUuid(sid) ? sid : null,
      origin: siteOrigin(request.nextUrl.origin),
    };
    // c = 1: the visitor pressed Accept in the cookie banner.
    const cookiesAllowed = body.c === 1;
    const setCookies = (res: NextResponse, visitorId: string, sessionId: string) => {
      res.cookies.set(VISITOR_COOKIE, visitorId, cookieOptions(60 * 60 * 24 * 365));
      res.cookies.set(SESSION_COOKIE, sessionId, cookieOptions(60 * 60 * 4));
    };

    // Sent by pages that were loaded before cookie-free tracking existed.
    if (body.t === "anon") {
      await recordAnonymous(ctx, body);
      return empty();
    }

    // The visitor withdrew cookie permission: remove the cookies.
    if (body.t === "revoke") {
      const res = empty();
      res.cookies.delete(VISITOR_COOKIE);
      res.cookies.delete(SESSION_COOKIE);
      return res;
    }

    // The visitor pressed Accept in the middle of a visit: hand the IDs of the
    // running visit to the browser as cookies.
    if (body.t === "consent") {
      const res = empty();
      if (cookiesAllowed && ctx.sid && ctx.vid && (await sessionBelongsTo(ctx.sid, ctx.vid))) {
        setCookies(res, ctx.vid, ctx.sid);
      }
      return res;
    }

    if (body.t === "pv") {
      const result = await recordPageview(ctx, body);
      if (!result) return empty();
      after(() => result.background().catch((err) => console.error("track background", err)));
      const res = NextResponse.json({ ok: true, sid: result.sessionId, vid: result.visitorId });
      if (cookiesAllowed) setCookies(res, result.visitorId, result.sessionId);
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
