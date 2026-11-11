import { type NextRequest, NextResponse } from "next/server";
import { hasDb } from "@/lib/tracking/db";
import { isUuid } from "@/lib/tracking/detect";
import { type LeadInput, leadEmail } from "@/lib/tracking/emails";
import { type LeadTracking, saveLead } from "@/lib/tracking/leads";
import { escapeHtml, sendMail } from "@/lib/tracking/mail";
import { deliver } from "@/lib/tracking/notify";
import { getSettings, isOn, siteOrigin } from "@/lib/tracking/settings";
import { SESSION_COOKIE, VISITOR_COOKIE } from "@/lib/tracking/track";

type ContactPayload = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  service: string;
  plan: string;
};

const clean = (value: string) => value.trim().slice(0, 200);

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Partial<ContactPayload>;

    if (
      !body.firstName ||
      !body.lastName ||
      !body.email ||
      !body.phone ||
      !body.service ||
      !body.plan
    ) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const firstName = clean(body.firstName);
    const lead: LeadInput = {
      name: `${firstName} ${clean(body.lastName)}`,
      email: clean(body.email),
      phone: clean(body.phone),
      service: clean(body.service),
      plan: clean(body.plan),
    };
    const contactTo = process.env.CONTACT_TO || "williampetersencop@gmail.com";
    const origin = siteOrigin(request.nextUrl.origin);

    // Save the lead and link it to the visitor. The form must keep working
    // even if tracking or the database has a problem.
    let leadId: number | null = null;
    let tracking: LeadTracking | null = null;
    let settings = null;
    if (hasDb()) {
      try {
        const vid = request.cookies.get(VISITOR_COOKIE)?.value;
        const sid = request.cookies.get(SESSION_COOKIE)?.value;
        const saved = await saveLead(isUuid(vid) ? vid : null, isUuid(sid) ? sid : null, lead);
        leadId = saved.leadId;
        tracking = saved.tracking;
        settings = await getSettings();
      } catch (err) {
        console.error("contact: tracking failed", err);
      }
    }

    // The "hot lead" switch in the admin controls whether tracking details are added.
    const includeTracking = settings ? isOn(settings, "trigger_form_submitted") : true;
    const mail = leadEmail(lead, includeTracking ? tracking : null, origin);

    let sent = false;
    if (leadId && settings) {
      try {
        sent = await deliver({
          trigger: "form_submitted",
          dedupeKey: `lead:${leadId}`,
          sessionId: tracking?.session.id,
          visitorId: tracking?.session.visitor_id,
          reason: `Contact form submitted by ${lead.name}`,
          settings,
          to: contactTo,
          replyTo: lead.email,
          build: () => mail,
        });
      } catch (err) {
        console.error("contact: notification log failed", err);
      }
    }
    if (!sent) {
      await sendMail({ to: contactTo, replyTo: lead.email, ...mail });
    }

    const safeName = escapeHtml(firstName);
    await sendMail({
      to: lead.email,
      subject: `Thanks, ${firstName}! I received your request`,
      text: [
        `Hi ${firstName},`,
        "",
        "Thanks for reaching out. I received your request and will contact you within the next 8 hours.",
        "",
        "Summary:",
        `Service: ${lead.service}`,
        `Plan: ${lead.plan}`,
        "",
        "Talk soon,",
        "Trust Web Ads",
      ].join("\n"),
      html: `
      <p>Hi ${safeName},</p>
      <p>Thanks for reaching out. I received your request and will contact you within the next 8 hours.</p>
      <p><strong>Summary</strong></p>
      <p>Service: ${escapeHtml(lead.service)}<br />Plan: ${escapeHtml(lead.plan)}</p>
      <p>Talk soon,<br />Trust Web Ads</p>
    `,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
