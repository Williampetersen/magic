import { randomUUID } from "node:crypto";
import { db, insertRow, type Row } from "./db";
import {
  clientIp,
  clip,
  geoFromHeaders,
  hashIp,
  igPlacement,
  isInstagramInApp,
  isInstagramVisit,
  isUuid,
  lookupIsp,
  maskIp,
  parseUserAgent,
  parseUtm,
} from "./detect";
import { checkHighInterest, closeStaleSessions, notifyArrival } from "./notify";
import { getSettings, num } from "./settings";

export const VISITOR_COOKIE = "tw_vid";
export const SESSION_COOKIE = "tw_sid";

export type TrackContext = {
  headers: Headers;
  ua: string;
  vid: string | null;
  sid: string | null;
  origin: string;
};

type Body = Record<string, unknown>;
type Background = () => Promise<void>;

const int = (value: unknown, min: number, max: number) => {
  const n = Math.round(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
};

/** Referrers from our own site say nothing about where the visitor came from. */
function externalReferrer(raw: unknown, host: string | null) {
  const referrer = clip(raw, 500);
  if (!referrer) return null;
  try {
    return new URL(referrer).host === host ? null : referrer;
  } catch {
    return null;
  }
}

/** Before or without consent: count the visit, store nothing about the person. */
export async function recordAnonymous(ctx: TrackContext, body: Body) {
  const utm = parseUtm(clip(body.search, 600));
  const referrer = externalReferrer(body.referrer, ctx.headers.get("host"));
  await db()`
    INSERT INTO anonymous_visits (source, path, country_code)
    VALUES (
      ${isInstagramVisit(utm, referrer, ctx.ua) ? "instagram" : "other"},
      ${clip(body.path, 300) || "/"},
      ${clip(ctx.headers.get("x-vercel-ip-country"), 2)}
    )`;
}

async function startSession(ctx: TrackContext, body: Body, path: string) {
  const utm = parseUtm(clip(body.search, 600));
  const referrer = externalReferrer(body.referrer, ctx.headers.get("host"));
  const instagram = isInstagramVisit(utm, referrer, ctx.ua);
  const ip = clientIp(ctx.headers);
  const ipHash = hashIp(ip);
  const source = instagram ? "instagram" : "other";

  // Find the visitor: by cookie first, then by the same IP hash + browser.
  let visitor: Row | undefined;
  if (ctx.vid) {
    [visitor] = await db()`SELECT * FROM visitors WHERE id = ${ctx.vid}`;
  }
  if (!visitor && ipHash) {
    [visitor] = await db()`
      SELECT v.* FROM sessions s JOIN visitors v ON v.id = s.visitor_id
      WHERE s.ip_hash = ${ipHash} AND s.user_agent = ${ctx.ua}
      ORDER BY s.started_at DESC LIMIT 1`;
  }
  if (visitor) {
    [visitor] = await db()`
      UPDATE visitors SET visit_count = visit_count + 1, last_seen = now()
      WHERE id = ${visitor.id} RETURNING *`;
  } else {
    [visitor] = await db()`
      INSERT INTO visitors (id, visit_count, first_source, first_campaign)
      VALUES (${randomUUID()}, 1, ${source}, ${utm.campaign})
      RETURNING *`;
  }

  const id = randomUUID();
  const viewportW = int(body.vw, 0, 20000);
  const viewportH = int(body.vh, 0, 20000);
  await insertRow("sessions", {
    id,
    visitor_id: visitor.id,
    source,
    ig_placement: instagram ? igPlacement(utm) : null,
    utm_source: utm.source,
    utm_medium: utm.medium,
    utm_campaign: utm.campaign,
    utm_content: utm.content,
    referrer,
    landing_page: path,
    exit_page: path,
    ...geoFromHeaders(ctx.headers),
    ip_masked: maskIp(ip),
    ip_hash: ipHash,
    user_agent: ctx.ua.slice(0, 600),
    ...parseUserAgent(ctx.ua),
    is_instagram_in_app_browser: isInstagramInApp(ctx.ua),
    language: clip(body.lang, 20) || clip(ctx.headers.get("accept-language")?.split(",")[0], 20),
    screen_width: int(body.sw, 0, 20000),
    screen_height: int(body.sh, 0, 20000),
    viewport: viewportW && viewportH ? `${viewportW}x${viewportH}` : null,
    connection_type: clip(body.conn, 40),
    is_returning: visitor.visit_count > 1,
    visit_number: visitor.visit_count,
  });
  return { id, visitorId: visitor.id as string, ip };
}

export async function recordPageview(ctx: TrackContext, body: Body) {
  const path = clip(body.path, 300) || "/";
  const pageviewId = isUuid(body.pv) ? body.pv : randomUUID();
  const settings = await getSettings();
  const timeout = num(settings, "session_timeout_minutes", 1, 240);

  let sessionId: string | null = null;
  let visitorId = ctx.vid;
  let newSessionIp: string | null | undefined;

  if (ctx.sid && ctx.vid) {
    const [open] = await db()`
      SELECT id FROM sessions
      WHERE id = ${ctx.sid} AND visitor_id = ${ctx.vid} AND ended_at IS NULL
        AND last_activity_at > now() - (${timeout}::int * interval '1 minute')`;
    if (open) sessionId = open.id;
  }
  if (!sessionId) {
    const started = await startSession(ctx, body, path);
    sessionId = started.id;
    visitorId = started.visitorId;
    newSessionIp = started.ip;
  }

  await db()`
    INSERT INTO pageviews (id, session_id, path, title)
    VALUES (${pageviewId}, ${sessionId}, ${path}, ${clip(body.title, 200)})
    ON CONFLICT (id) DO NOTHING`;
  const [session] = await db()`
    UPDATE sessions
    SET page_count = page_count + 1, exit_page = ${path}, last_activity_at = now()
    WHERE id = ${sessionId} RETURNING *`;

  const isNew = newSessionIp !== undefined;
  const background: Background = async () => {
    if (isNew) {
      const net = await lookupIsp(newSessionIp ?? null);
      if (net?.isp) {
        session.isp = net.isp;
        session.connection_type = session.connection_type || net.network;
        await db()`
          UPDATE sessions SET isp = ${net.isp}, connection_type = ${session.connection_type}
          WHERE id = ${session.id}`;
      }
      await notifyArrival(session, ctx.origin);
    }
    await checkHighInterest(session, ctx.origin);
    await closeStaleSessions(ctx.origin);
  };

  return { sessionId: sessionId as string, visitorId: visitorId as string, background };
}

/** Heartbeat: time on page and scroll depth. Also sent as a beacon when the page is hidden. */
export async function recordPing(ctx: TrackContext, body: Body) {
  if (!ctx.sid || !isUuid(body.pv)) return { expired: true, background: null };
  const seconds = int(body.s, 0, 14400) ?? 0;
  const scroll = int(body.sc, 0, 100) ?? 0;

  const updated = await db()`
    UPDATE pageviews p
    SET time_on_page_seconds = GREATEST(p.time_on_page_seconds, ${seconds}),
        max_scroll_percent = GREATEST(p.max_scroll_percent, ${scroll})
    FROM sessions s
    WHERE p.id = ${body.pv} AND p.session_id = ${ctx.sid}
      AND s.id = p.session_id AND s.ended_at IS NULL
    RETURNING p.id`;
  if (!updated.length) return { expired: true, background: null };

  const [session] = await db()`
    UPDATE sessions
    SET last_activity_at = now(),
        duration_seconds = (
          SELECT COALESCE(sum(time_on_page_seconds), 0) FROM pageviews WHERE session_id = ${ctx.sid}
        )
    WHERE id = ${ctx.sid} RETURNING *`;

  const background: Background = () => checkHighInterest(session, ctx.origin);
  return { expired: false, background: session.high_interest ? null : background };
}

const EVENT_TYPES = new Set([
  "click_cta",
  "click_link",
  "click_pricing_plan",
  "click_email",
  "click_phone",
  "click_social",
  "outbound_link",
  "form_start",
]);

export async function recordEvent(ctx: TrackContext, body: Body) {
  const type = clip(body.type, 40);
  if (!ctx.sid || !ctx.vid || !type || !EVENT_TYPES.has(type)) return;
  const inserted = await db()`
    INSERT INTO events (session_id, type, label, path)
    SELECT s.id, ${type}, ${clip(body.label, 200)}, ${clip(body.path, 300)}
    FROM sessions s
    WHERE s.id = ${ctx.sid} AND s.visitor_id = ${ctx.vid} AND s.ended_at IS NULL
      AND (SELECT count(*) FROM events e WHERE e.session_id = s.id) < 500
    RETURNING id`;
  if (!inserted.length) return;
  if (type === "form_start") {
    await db()`UPDATE sessions SET form_started = true, last_activity_at = now() WHERE id = ${ctx.sid}`;
  } else {
    await db()`UPDATE sessions SET last_activity_at = now() WHERE id = ${ctx.sid}`;
  }
}
