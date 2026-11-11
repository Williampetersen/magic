import { type Row, db } from "./db";
import {
  type BuiltEmail,
  type DigestData,
  arrivalEmail,
  digestEmail,
  formAbandonedEmail,
  highInterestEmail,
  summaryEmail,
} from "./emails";
import { TIME_ZONE, fmtDay } from "./format";
import { sendMail } from "./mail";
import { type Settings, alertRecipient, getSettings, isOn, num } from "./settings";

type Delivery = {
  trigger: string;
  dedupeKey: string;
  sessionId?: string | null;
  visitorId?: string | null;
  reason: string;
  settings: Settings;
  to?: string;
  replyTo?: string;
  build: () => BuiltEmail | Promise<BuiltEmail>;
};

const UNCAPPED = new Set(["form_submitted", "daily_digest"]);

/**
 * Sends one email and logs it. The unique dedupe key is claimed first,
 * so the same email can never go out twice, even if two requests race.
 */
export async function deliver(d: Delivery) {
  const to = d.to || alertRecipient(d.settings);

  // Safety valve against floods: no more than N alert emails per hour in total.
  // Leads, the daily digest and test emails always go through.
  if (!UNCAPPED.has(d.trigger)) {
    const cap = num(d.settings, "max_emails_per_hour", 1, 1000);
    const [{ count }] = await db()`
      SELECT count(*)::int AS count FROM notifications
      WHERE sent_at > now() - interval '1 hour' AND status IN ('sent', 'pending')`;
    if (count >= cap) {
      await db()`
        INSERT INTO notifications
          (session_id, visitor_id, trigger_type, dedupe_key, recipient, reason, status, error)
        VALUES (${d.sessionId ?? null}, ${d.visitorId ?? null}, ${d.trigger}, ${d.dedupeKey}, ${to},
                ${d.reason}, 'skipped', ${`Not sent: the limit of ${cap} alert emails per hour was reached`})
        ON CONFLICT (dedupe_key) DO NOTHING`;
      return false;
    }
  }

  const claimed = await db()`
    INSERT INTO notifications (session_id, visitor_id, trigger_type, dedupe_key, recipient, reason)
    VALUES (${d.sessionId ?? null}, ${d.visitorId ?? null}, ${d.trigger}, ${d.dedupeKey}, ${to}, ${d.reason})
    ON CONFLICT (dedupe_key) DO NOTHING
    RETURNING id`;
  if (!claimed.length) return false;
  const id = claimed[0].id;
  try {
    const mail = await d.build();
    await db()`UPDATE notifications SET subject = ${mail.subject} WHERE id = ${id}`;
    await sendMail({ to, replyTo: d.replyTo, ...mail });
    await db()`UPDATE notifications SET status = 'sent', sent_at = now() WHERE id = ${id}`;
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db()`UPDATE notifications SET status = 'failed', error = ${message.slice(0, 500)} WHERE id = ${id}`;
    return false;
  }
}

/** Triggers 1 and 2: new or returning Instagram visitor, sent when the session starts. */
export async function notifyArrival(session: Row, origin: string) {
  if (session.source !== "instagram") return;
  const settings = await getSettings();
  const returning = Boolean(session.is_returning);
  if (!isOn(settings, returning ? "trigger_returning_visitor" : "trigger_new_visitor")) return;

  // Rate limit: at most one arrival email per visitor per N minutes.
  const minutes = num(settings, "arrival_rate_limit_minutes", 0, 1440);
  const recent = await db()`
    SELECT 1 FROM notifications
    WHERE visitor_id = ${session.visitor_id}
      AND trigger_type IN ('new_visitor', 'returning_visitor')
      AND sent_at > now() - (${minutes}::int * interval '1 minute')
    LIMIT 1`;
  if (recent.length) return;

  const previous = await db()`
    SELECT started_at FROM sessions
    WHERE visitor_id = ${session.visitor_id} AND id <> ${session.id}
    ORDER BY started_at DESC LIMIT 1`;

  await deliver({
    trigger: returning ? "returning_visitor" : "new_visitor",
    dedupeKey: `${session.id}:arrival`,
    sessionId: session.id,
    visitorId: session.visitor_id,
    reason: returning
      ? `Instagram visitor came back (visit #${session.visit_number})`
      : "First visit from Instagram",
    settings,
    build: () => arrivalEmail(session, previous[0]?.started_at ?? null, origin),
  });
}

/** Trigger 3: 3+ pages, 2+ minutes, or a pricing page (thresholds come from settings). */
export async function checkHighInterest(session: Row, origin: string) {
  if (session.high_interest) return;
  const settings = await getSettings();
  const minPages = num(settings, "high_interest_pages", 1, 100);
  const minSeconds = num(settings, "high_interest_seconds", 1, 86400);
  const pricingPaths = settings.pricing_paths
    .split(",")
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);

  const reasons: string[] = [];
  if (session.page_count >= minPages) reasons.push(`viewed ${session.page_count} pages`);
  if (session.duration_seconds >= minSeconds) {
    reasons.push(`stayed ${Math.floor(session.duration_seconds / 60)}+ minutes`);
  }
  if (pricingPaths.length) {
    const pages = await db()`SELECT DISTINCT path FROM pageviews WHERE session_id = ${session.id}`;
    const hit = pages.find((p) =>
      pricingPaths.some(
        (pp) => p.path.toLowerCase() === pp || p.path.toLowerCase().startsWith(`${pp}/`),
      ),
    );
    if (hit) reasons.push(`opened the pricing page (${hit.path})`);
  }
  if (!reasons.length) return;

  await db()`UPDATE sessions SET high_interest = true WHERE id = ${session.id}`;
  if (session.source !== "instagram" || !isOn(settings, "trigger_high_interest")) return;

  await deliver({
    trigger: "high_interest",
    dedupeKey: `${session.id}:high_interest`,
    sessionId: session.id,
    visitorId: session.visitor_id,
    reason: `High interest: ${reasons.join(", ")}`,
    settings,
    build: () => highInterestEmail(session, reasons, origin),
  });
}

/**
 * Triggers 4 and 6 for one finished Instagram session: "form started but not
 * sent" and the visit summary. Returns how many emails went out.
 */
async function sendSessionEndEmails(s: Row, settings: Settings, origin: string, why: string) {
  if (s.source !== "instagram") return 0;
  // Visits that ended long ago get no separate email: the daily digest covers them.
  if (Date.now() - new Date(s.ended_at).getTime() > 3 * 3_600_000) return 0;

  let emails = 0;
  if (s.form_started && !s.converted && isOn(settings, "trigger_form_abandoned")) {
    const ok = await deliver({
      trigger: "form_abandoned",
      dedupeKey: `${s.id}:form_abandoned`,
      sessionId: s.id,
      visitorId: s.visitor_id,
      reason: "Started the contact form but did not send it",
      settings,
      build: () => formAbandonedEmail(s, origin),
    });
    if (ok) emails++;
  }

  if (isOn(settings, "trigger_session_summary")) {
    const ok = await deliver({
      trigger: "session_summary",
      dedupeKey: `${s.id}:session_summary`,
      sessionId: s.id,
      visitorId: s.visitor_id,
      reason: why,
      settings,
      build: async () => {
        const [pageviews, events] = await Promise.all([
          db()`SELECT * FROM pageviews WHERE session_id = ${s.id} ORDER BY entered_at`,
          db()`SELECT * FROM events WHERE session_id = ${s.id} ORDER BY created_at`,
        ]);
        return summaryEmail(s, pageviews, events, origin);
      },
    });
    if (ok) emails++;
  }
  return emails;
}

/**
 * Closes sessions with no activity for N minutes and sends their emails.
 *
 * Runs from the cron job, and also whenever any tracking request or admin page
 * load happens, because the Vercel Hobby plan only allows one cron run per day.
 */
export async function closeStaleSessions(origin: string) {
  const settings = await getSettings();
  const timeout = num(settings, "session_timeout_minutes", 1, 240);
  const closed = await db()`
    UPDATE sessions SET ended_at = last_activity_at
    WHERE id IN (
      SELECT id FROM sessions
      WHERE ended_at IS NULL
        AND last_activity_at < now() - (${timeout}::int * interval '1 minute')
      ORDER BY last_activity_at
      LIMIT 25
    )
    RETURNING *`;

  let emails = 0;
  for (const s of closed) {
    emails += await sendSessionEndEmails(
      s,
      settings,
      origin,
      `Visit ended (no activity for ${timeout} minutes)`,
    );
  }
  return { closed: closed.length, emails };
}

/**
 * The browser said the visitor left the site (page closed). If nothing more
 * has happened since, end the visit now and send the summary straight away
 * instead of waiting for the inactivity timeout. If the visitor comes back
 * within the timeout, the same visit is simply reopened.
 */
export async function closeSessionAfterLeaving(
  sessionId: string,
  origin: string,
  quietSeconds: number,
) {
  const [s] = await db()`
    UPDATE sessions SET ended_at = last_activity_at
    WHERE id = ${sessionId} AND ended_at IS NULL
      AND last_activity_at < now() - (${quietSeconds}::int * interval '1 second')
    RETURNING *`;
  if (!s) return;
  await sendSessionEndEmails(s, await getSettings(), origin, "The visitor left the site");
}

function topCounts(rows: Row[], pick: (r: Row) => string | null, limit = 8) {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const key = pick(r) || "Unknown";
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

/** Trigger 7: yesterday's Instagram visitors (Copenhagen day). */
export async function sendDailyDigest(origin: string) {
  const settings = await getSettings();
  if (!isOn(settings, "trigger_daily_digest")) return { sent: false, why: "switched off" };

  const [{ day }] = await db()`
    SELECT ((now() AT TIME ZONE ${TIME_ZONE})::date - 1)::text AS day`;

  const [sessions, pages, leads, anonymous] = await Promise.all([
    db()`
      SELECT * FROM sessions
      WHERE source = 'instagram' AND (started_at AT TIME ZONE ${TIME_ZONE})::date = ${day}::date
      ORDER BY started_at`,
    db()`
      SELECT p.path AS label, count(*)::int AS count
      FROM pageviews p JOIN sessions s ON s.id = p.session_id
      WHERE s.source = 'instagram' AND (s.started_at AT TIME ZONE ${TIME_ZONE})::date = ${day}::date
      GROUP BY p.path ORDER BY count DESC LIMIT 8`,
    db()`
      SELECT l.name, l.email FROM leads l JOIN sessions s ON s.id = l.session_id
      WHERE s.source = 'instagram' AND (l.created_at AT TIME ZONE ${TIME_ZONE})::date = ${day}::date
      ORDER BY l.created_at`,
    db()`
      SELECT count(*)::int AS count FROM anonymous_visits
      WHERE source = 'instagram' AND (created_at AT TIME ZONE ${TIME_ZONE})::date = ${day}::date`,
  ]);

  if (!sessions.length && !anonymous[0].count) return { sent: false, why: "no visitors" };

  const visitorIds = new Set(sessions.map((s) => s.visitor_id));
  // A visitor is new when their very first visit happened on this day.
  const newIds = new Set(sessions.filter((s) => !s.is_returning).map((s) => s.visitor_id));
  const data: DigestData = {
    dayLabel: fmtDay(`${day}T12:00:00Z`),
    sessions,
    visitors: visitorIds.size,
    newVisitors: newIds.size,
    returningVisitors: visitorIds.size - newIds.size,
    anonymous: anonymous[0].count,
    leads,
    countries: topCounts(sessions, (s) => s.country),
    cities: topCounts(sessions, (s) => s.city),
    pages,
    devices: topCounts(sessions, (s) =>
      [s.device_type === "mobile" ? "Phone" : s.device_type, s.os].filter(Boolean).join(" · "),
    ),
    placements: topCounts(sessions, (s) => s.ig_placement || "unknown"),
    abandoned: sessions.filter((s) => s.form_started && !s.converted).length,
  };

  const sent = await deliver({
    trigger: "daily_digest",
    dedupeKey: `digest:${day}`,
    reason: `Daily digest for ${day}`,
    settings,
    build: () => digestEmail(data, origin),
  });
  return { sent, why: sent ? "ok" : "already sent or failed" };
}

/** GDPR: delete tracking data older than the retention period (default 90 days). */
export async function purgeOldData() {
  const settings = await getSettings();
  const days = num(settings, "retention_days", 1, 3650);
  const sessions = await db()`
    DELETE FROM sessions WHERE started_at < now() - (${days}::int * interval '1 day') RETURNING id`;
  const visitors = await db()`
    DELETE FROM visitors v
    WHERE v.last_seen < now() - (${days}::int * interval '1 day')
      AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.visitor_id = v.id)
    RETURNING id`;
  await db()`DELETE FROM notifications WHERE sent_at < now() - (${days}::int * interval '1 day')`;
  await db()`DELETE FROM anonymous_visits WHERE created_at < now() - (${days}::int * interval '1 day')`;
  await db()`DELETE FROM admin_login_attempts WHERE attempted_at < now() - interval '1 day'`;
  return { days, sessions: sessions.length, visitors: visitors.length };
}
