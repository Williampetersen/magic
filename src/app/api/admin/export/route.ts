import { isAdmin } from "@/lib/tracking/adminAuth";
import { hasDb } from "@/lib/tracking/db";
import { fmtDateTime } from "@/lib/tracking/format";
import { type VisitFilters, listVisits } from "@/lib/tracking/queries";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COLUMNS: [string, string][] = [
  ["started_at", "Time (Copenhagen)"],
  ["source", "Source"],
  ["ig_placement", "Instagram placement"],
  ["utm_source", "UTM source"],
  ["utm_medium", "UTM medium"],
  ["utm_campaign", "UTM campaign"],
  ["utm_content", "UTM content"],
  ["referrer", "Referrer"],
  ["landing_page", "Landing page"],
  ["exit_page", "Exit page"],
  ["page_count", "Pages"],
  ["duration_seconds", "Duration (s)"],
  ["country", "Country"],
  ["region", "Region"],
  ["city", "City"],
  ["postal_code", "Postal code"],
  ["timezone", "Timezone"],
  ["ip_masked", "IP (masked)"],
  ["isp", "Internet provider"],
  ["device_type", "Device type"],
  ["device_vendor", "Device brand"],
  ["device_model", "Device model"],
  ["os", "OS"],
  ["os_version", "OS version"],
  ["browser", "Browser"],
  ["browser_version", "Browser version"],
  ["is_instagram_in_app_browser", "Instagram in-app browser"],
  ["language", "Language"],
  ["screen_width", "Screen width"],
  ["screen_height", "Screen height"],
  ["connection_type", "Connection"],
  ["is_returning", "Returning"],
  ["visit_number", "Visit number"],
  ["converted", "Lead"],
  ["linked_lead_name", "Lead name"],
  ["linked_lead_email", "Lead email"],
  ["linked_lead_phone", "Lead phone"],
  ["visitor_id", "Visitor ID"],
];

// A byte-order mark at the start makes Excel read the file as UTF-8 (Danish letters).
const BOM = String.fromCharCode(0xfeff);

function cell(value: unknown) {
  if (value === null || value === undefined) return "";
  let text = typeof value === "boolean" ? (value ? "yes" : "no") : String(value);
  // Stop spreadsheet apps from running a cell as a formula.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ error: "No database" }, { status: 500 });

  const p = request.nextUrl.searchParams;
  const filters: VisitFilters = {
    source: p.get("source") === "all" ? "all" : "instagram",
    from: p.get("from") || "",
    to: p.get("to") || "",
    country: p.get("country") || "",
    device: p.get("device") || "",
    converted: p.get("converted") || "",
    q: p.get("q") || "",
  };
  const { rows } = await listVisits(filters, 5000, 0);

  const lines = [COLUMNS.map(([, title]) => cell(title)).join(",")];
  for (const row of rows) {
    lines.push(
      COLUMNS.map(([key]) => cell(key === "started_at" ? fmtDateTime(row[key]) : row[key])).join(
        ",",
      ),
    );
  }
  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(BOM + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="visitors-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
