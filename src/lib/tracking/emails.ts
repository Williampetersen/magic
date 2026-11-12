import type { Row } from "./db";
import {
  deviceLabel,
  fmtDateTime,
  fmtDuration,
  fmtTime,
  locationLabel,
  nearestAddress,
  placementLabel,
  sourceLabel,
} from "./format";
import { escapeHtml as e } from "./mail";

export type BuiltEmail = { subject: string; html: string; text: string };

type Section = {
  heading?: string;
  rows?: [string, string][];
  table?: { head: string[]; body: string[][] };
  note?: string;
};

type Layout = {
  badge: string;
  color: string;
  title: string;
  intro?: string;
  sections: Section[];
  button?: { label: string; url: string };
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** Mobile-friendly HTML email plus a plain-text copy of the same content. */
function render(l: Layout) {
  const sections = l.sections
    .map((s) => {
      let out = "";
      if (s.heading) {
        out += `<tr><td style="padding:22px 24px 6px;font:600 12px ${FONT};letter-spacing:.08em;text-transform:uppercase;color:#6b7280;">${e(s.heading)}</td></tr>`;
      }
      if (s.rows?.length) {
        out += `<tr><td style="padding:4px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${s.rows
          .map(
            ([k, v]) =>
              `<tr><td style="padding:7px 12px 7px 0;font:14px ${FONT};color:#6b7280;vertical-align:top;width:38%;border-bottom:1px solid #f0f1f3;">${e(k)}</td><td style="padding:7px 0;font:500 14px ${FONT};color:#111827;vertical-align:top;border-bottom:1px solid #f0f1f3;word-break:break-word;">${e(v)}</td></tr>`,
          )
          .join("")}</table></td></tr>`;
      }
      if (s.table) {
        const head = s.table.head
          .map(
            (h, i) =>
              `<th align="${i === 0 ? "left" : "right"}" style="padding:6px 0 6px ${i === 0 ? 0 : 10}px;font:600 12px ${FONT};color:#6b7280;border-bottom:1px solid #e5e7eb;">${e(h)}</th>`,
          )
          .join("");
        const body = s.table.body
          .map(
            (r) =>
              `<tr>${r
                .map(
                  (c, i) =>
                    `<td align="${i === 0 ? "left" : "right"}" style="padding:7px 0 7px ${i === 0 ? 0 : 10}px;font:14px ${FONT};color:#111827;border-bottom:1px solid #f0f1f3;${i === 0 ? "word-break:break-word;" : "white-space:nowrap;"}">${e(c)}</td>`,
                )
                .join("")}</tr>`,
          )
          .join("");
        out += `<tr><td style="padding:4px 24px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${head}</tr>${body}</table></td></tr>`;
      }
      if (s.note) {
        out += `<tr><td style="padding:6px 24px;font:14px/1.5 ${FONT};color:#374151;">${e(s.note)}</td></tr>`;
      }
      return out;
    })
    .join("");

  const button = l.button
    ? `<tr><td style="padding:24px;"><a href="${e(l.button.url)}" style="display:block;text-align:center;background:#111827;color:#ffffff;text-decoration:none;font:600 15px ${FONT};padding:13px 20px;border-radius:10px;">${e(l.button.label)}</a></td></tr>`
    : "";

  const html = `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;"><tr><td align="center" style="padding:20px 10px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e5e7eb;">
<tr><td style="background:#0b0f14;padding:22px 24px;">
<span style="display:inline-block;background:${l.color};color:#ffffff;font:700 11px ${FONT};letter-spacing:.08em;text-transform:uppercase;padding:4px 9px;border-radius:999px;">${e(l.badge)}</span>
<div style="font:700 20px/1.3 ${FONT};color:#ffffff;padding-top:12px;">${e(l.title)}</div>
${l.intro ? `<div style="font:14px/1.5 ${FONT};color:#9ca3af;padding-top:6px;">${e(l.intro)}</div>` : ""}
</td></tr>
${sections}${button}
<tr><td style="padding:14px 24px 20px;font:12px ${FONT};color:#9ca3af;">Times are Europe/Copenhagen. Sent by your website visitor tracking. Switch alerts on or off in Admin → Settings.</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    `[${l.badge}] ${l.title}`,
    l.intro || "",
    ...l.sections.flatMap((s) => [
      "",
      s.heading ? `${s.heading.toUpperCase()}` : "",
      ...(s.rows || []).map(([k, v]) => `${k}: ${v}`),
      ...(s.table ? s.table.body.map((r) => `- ${r.join(" | ")}`) : []),
      s.note || "",
    ]),
    "",
    l.button ? `${l.button.label}: ${l.button.url}` : "",
  ]
    .filter((line, i, all) => line !== "" || all[i - 1] !== "")
    .join("\n")
    .trim();

  return { html, text };
}

const COLORS = {
  arrival: "#2563eb",
  returning: "#7c3aed",
  interest: "#d97706",
  abandoned: "#dc2626",
  lead: "#059669",
  summary: "#4b5563",
  digest: "#0891b2",
};

/** The road nearest to the visit's coordinates, when it has been looked up. */
function nearestAddressRow(s: Row): [string, string][] {
  const address = nearestAddress(s);
  return address ? [["Nearest address", `${address} (approximate)`]] : [];
}

export function visitorFacts(s: Row, previousVisit?: string | Date | null): [string, string][] {
  const rows: [string, string][] = [
    ["Time", fmtDateTime(s.started_at)],
    [
      "Came from",
      s.source === "instagram"
        ? `Instagram · ${placementLabel(s.ig_placement)}${s.utm_campaign ? ` · campaign "${s.utm_campaign}"` : ""}`
        : sourceLabel(s),
    ],
    ["Landing page", s.landing_page || "/"],
    ["Location", locationLabel(s)],
    ...nearestAddressRow(s),
    ["Device", deviceLabel(s)],
    ["Instagram in-app browser", s.is_instagram_in_app_browser ? "Yes" : "No"],
    ["Language", s.language || "Unknown"],
  ];
  if (s.isp) rows.push(["Internet provider", s.isp]);
  if (s.connection_type) rows.push(["Connection", s.connection_type]);
  rows.push([
    "Visitor",
    s.is_returning
      ? `Returning · visit #${s.visit_number}${previousVisit ? ` · last visit ${fmtDateTime(previousVisit)}` : ""}`
      : "New visitor",
  ]);
  rows.push(["IP (masked)", s.ip_masked || "Unknown"]);
  return rows;
}

const visitorButton = (origin: string, s: Row) => ({
  label: "Open visitor in dashboard",
  url: `${origin}/admin/visitors/${s.visitor_id}`,
});

const where = (s: Row) => s.city || s.country || "unknown location";

export function arrivalEmail(s: Row, previousVisit: string | null, origin: string): BuiltEmail {
  const returning = Boolean(s.is_returning);
  const title = returning
    ? `Returning Instagram visitor from ${where(s)}`
    : `New Instagram visitor from ${where(s)}`;
  return {
    subject: `${returning ? "🔁" : "👋"} ${title}`,
    ...render({
      badge: returning ? "Returning visitor" : "New visitor",
      color: returning ? COLORS.returning : COLORS.arrival,
      title,
      intro: returning
        ? `This person has now visited ${s.visit_number} times.`
        : "Someone just opened your site from Instagram.",
      sections: [{ rows: visitorFacts(s, previousVisit) }],
      button: visitorButton(origin, s),
    }),
  };
}

export function highInterestEmail(s: Row, reasons: string[], origin: string): BuiltEmail {
  const title = `High interest: visitor from ${where(s)}`;
  return {
    subject: `🔥 ${title}`,
    ...render({
      badge: "High interest",
      color: COLORS.interest,
      title,
      intro: `Why: ${reasons.join(", ")}.`,
      sections: [
        {
          heading: "So far",
          rows: [
            ["Pages viewed", String(s.page_count)],
            ["Time on site", fmtDuration(s.duration_seconds)],
            ["Current page", s.exit_page || "/"],
          ],
        },
        { heading: "Visitor", rows: visitorFacts(s) },
      ],
      button: visitorButton(origin, s),
    }),
  };
}

export function formAbandonedEmail(s: Row, origin: string): BuiltEmail {
  const title = `Contact form started but not sent (${where(s)})`;
  return {
    subject: `✍️ ${title}`,
    ...render({
      badge: "Form abandoned",
      color: COLORS.abandoned,
      title,
      intro: "This Instagram visitor began typing in the contact form and left without sending it.",
      sections: [
        {
          heading: "Visit",
          rows: [
            ["Pages viewed", String(s.page_count)],
            ["Time on site", fmtDuration(s.duration_seconds)],
            ["Exit page", s.exit_page || "/"],
          ],
        },
        { heading: "Visitor", rows: visitorFacts(s) },
      ],
      button: visitorButton(origin, s),
    }),
  };
}

const EVENT_LABELS: Record<string, string> = {
  click_cta: "Button",
  click_link: "Link",
  click_pricing_plan: "Pricing plan",
  click_email: "Email link",
  click_phone: "Phone link",
  click_social: "Social link",
  outbound_link: "Outbound link",
  form_start: "Form started",
  form_submit: "Form submitted",
};

export const eventLabel = (type: string) => EVENT_LABELS[type] || type;

export function journeyTable(pageviews: Row[]) {
  return {
    head: ["Page", "Time", "Scroll"],
    body: pageviews.map((p, i) => [
      `${i + 1}. ${p.path}`,
      fmtDuration(p.time_on_page_seconds),
      `${p.max_scroll_percent}%`,
    ]),
  };
}

export function summaryEmail(s: Row, pageviews: Row[], events: Row[], origin: string): BuiltEmail {
  const title = `Visit summary: ${s.page_count} page${s.page_count === 1 ? "" : "s"}, ${fmtDuration(s.duration_seconds)} (${where(s)})`;
  const clicks = events.filter((ev) => ev.type.startsWith("click_") || ev.type === "outbound_link");
  const formStatus = s.converted
    ? "Submitted (lead)"
    : s.form_started
      ? "Started but not sent"
      : "Not opened";
  const sections: Section[] = [
    {
      heading: "Totals",
      rows: [
        ["Total pages", String(s.page_count)],
        ["Total duration", fmtDuration(s.duration_seconds)],
        ["Contact form", formStatus],
        ["Exit page", s.exit_page || "/"],
      ],
    },
    { heading: "Journey", table: journeyTable(pageviews) },
  ];
  if (clicks.length) {
    sections.push({
      heading: "Buttons and links clicked",
      table: {
        head: ["What", "When"],
        body: clicks
          .slice(0, 40)
          .map((ev) => [
            `${eventLabel(ev.type)}: ${ev.label || "(no label)"}`,
            fmtTime(ev.created_at),
          ]),
      },
    });
  }
  sections.push({ heading: "Visitor", rows: visitorFacts(s) });
  return {
    subject: `📋 ${title}`,
    ...render({
      badge: "Visit summary",
      color: COLORS.summary,
      title,
      intro: "This visit is over. Here is the full journey.",
      sections,
      button: visitorButton(origin, s),
    }),
  };
}

export type DigestData = {
  dayLabel: string;
  sessions: Row[];
  visitors: number;
  newVisitors: number;
  returningVisitors: number;
  leads: Row[];
  countries: Row[];
  cities: Row[];
  pages: Row[];
  devices: Row[];
  placements: Row[];
  abandoned: number;
};

const countTable = (label: string, rows: Row[]) => ({
  head: [label, "Visits"],
  body: rows.map((r) => [String(r.label || "Unknown"), String(r.count)]),
});

export function digestEmail(d: DigestData, origin: string): BuiltEmail {
  const title = `${d.visitors} Instagram visitor${d.visitors === 1 ? "" : "s"} on ${d.dayLabel}`;
  const sections: Section[] = [
    {
      heading: "Yesterday",
      rows: [
        ["Instagram visitors", String(d.visitors)],
        ["Visits (sessions)", String(d.sessions.length)],
        ["New / returning", `${d.newVisitors} / ${d.returningVisitors}`],
        ["Leads", String(d.leads.length)],
        ["Forms started but not sent", String(d.abandoned)],
      ],
    },
  ];
  if (d.placements.length) {
    sections.push({
      heading: "Where on Instagram",
      table: {
        head: ["Placement", "Visits"],
        body: d.placements.map((r) => [placementLabel(r.label), String(r.count)]),
      },
    });
  }
  if (d.countries.length)
    sections.push({ heading: "Top countries", table: countTable("Country", d.countries) });
  if (d.cities.length)
    sections.push({ heading: "Top cities", table: countTable("City", d.cities) });
  if (d.pages.length) sections.push({ heading: "Top pages", table: countTable("Page", d.pages) });
  if (d.devices.length)
    sections.push({ heading: "Devices", table: countTable("Device", d.devices) });
  if (d.leads.length) {
    sections.push({
      heading: "Leads",
      table: {
        head: ["Name", "Contact"],
        body: d.leads.map((l) => [l.name, l.email]),
      },
    });
  }
  if (d.sessions.length) {
    sections.push({
      heading: "Every visit",
      table: {
        head: ["Visit", "Pages", "Time"],
        body: d.sessions
          .slice(0, 40)
          .map((s) => [
            `${fmtTime(s.started_at).slice(0, 5)} · ${placementLabel(s.ig_placement)} · ${where(s)}${s.converted ? " · LEAD" : ""}`,
            String(s.page_count),
            fmtDuration(s.duration_seconds),
          ]),
      },
    });
  }
  return {
    subject: `📊 Daily digest: ${title}`,
    ...render({
      badge: "Daily digest",
      color: COLORS.digest,
      title,
      sections,
      button: { label: "Open dashboard", url: `${origin}/admin` },
    }),
  };
}

export type LeadInput = {
  name: string;
  email: string;
  phone: string;
  service: string;
  plan: string;
};

/** The "New lead" email, with the visitor's tracking details when we have them. */
export function leadEmail(
  lead: LeadInput,
  tracking: { session: Row; pageviews: Row[]; earlierVisits: number } | null,
  origin: string,
): BuiltEmail {
  const sections: Section[] = [
    {
      heading: "Contact request",
      rows: [
        ["Name", lead.name],
        ["Email", lead.email],
        ["Phone", lead.phone],
        ["Service", lead.service],
        ["Plan", lead.plan],
      ],
    },
  ];
  if (tracking) {
    const s = tracking.session;
    sections.push({
      heading: "Where this lead came from",
      rows: [
        ["Source", `Came from ${sourceLabel(s)}`],
        ["Location", locationLabel(s)],
        ...nearestAddressRow(s),
        ["Device", deviceLabel(s)],
        ["Earlier visits", String(tracking.earlierVisits)],
        ["Time on site", fmtDuration(s.duration_seconds)],
      ],
    });
    if (tracking.pageviews.length) {
      sections.push({
        heading: "Pages viewed before contacting you",
        table: journeyTable(tracking.pageviews),
      });
    }
  } else {
    sections.push({
      heading: "Where this lead came from",
      note: "No tracking details: this visitor did not accept cookies, or tracking is not set up.",
    });
  }
  return {
    subject: `New lead: ${lead.name} (${lead.service})`,
    ...render({
      badge: "Hot lead",
      color: COLORS.lead,
      title: `New lead: ${lead.name}`,
      intro: `${lead.service} · ${lead.plan}`,
      sections,
      button: tracking
        ? visitorButton(origin, tracking.session)
        : { label: "Open leads in dashboard", url: `${origin}/admin/leads` },
    }),
  };
}

export function testEmail(origin: string): BuiltEmail {
  return {
    subject: "✅ Test email from your visitor tracking",
    ...render({
      badge: "Test",
      color: COLORS.lead,
      title: "Email notifications are working",
      intro: "This is a test sent from Admin → Settings.",
      sections: [
        {
          note: "If you can read this, your SMTP settings are correct and Instagram visitor alerts will arrive at this address.",
        },
      ],
      button: { label: "Open dashboard", url: `${origin}/admin` },
    }),
  };
}
