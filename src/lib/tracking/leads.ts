import { db, type Row } from "./db";
import type { LeadInput } from "./emails";

export type LeadTracking = { session: Row; pageviews: Row[]; earlierVisits: number };

/**
 * Stores a contact-form lead. When the visitor accepted tracking, the lead is
 * linked to their visitor row and the session is marked as converted.
 */
export async function saveLead(vid: string | null, sid: string | null, lead: LeadInput) {
  let session: Row | undefined;
  if (vid && sid) {
    [session] = await db()`SELECT * FROM sessions WHERE id = ${sid} AND visitor_id = ${vid}`;
  }
  if (!session && vid) {
    [session] = await db()`
      SELECT * FROM sessions WHERE visitor_id = ${vid} ORDER BY started_at DESC LIMIT 1`;
  }

  const [{ id: leadId }] = await db()`
    INSERT INTO leads (name, email, phone, service, plan, visitor_id, session_id)
    VALUES (${lead.name}, ${lead.email}, ${lead.phone}, ${lead.service}, ${lead.plan},
            ${session?.visitor_id ?? null}, ${session?.id ?? null})
    RETURNING id`;

  if (!session) return { leadId: leadId as number, tracking: null };

  await db()`
    UPDATE visitors
    SET linked_lead_name = ${lead.name}, linked_lead_email = ${lead.email}, linked_lead_phone = ${lead.phone}
    WHERE id = ${session.visitor_id}`;
  [session] = await db()`
    UPDATE sessions SET converted = true, form_started = true, last_activity_at = now()
    WHERE id = ${session.id} RETURNING *`;
  await db()`
    INSERT INTO events (session_id, type, label, path)
    VALUES (${session.id}, 'form_submit', ${`${lead.service} · ${lead.plan}`.slice(0, 200)}, ${session.exit_page})`;
  const pageviews = await db()`
    SELECT * FROM pageviews WHERE session_id = ${session.id} ORDER BY entered_at`;

  const tracking: LeadTracking = {
    session,
    pageviews,
    earlierVisits: Math.max(0, (session.visit_number || 1) - 1),
  };
  return { leadId: leadId as number, tracking };
}
