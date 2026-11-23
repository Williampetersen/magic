import { isAdmin } from "@/lib/tracking/adminAuth";
import { hasDb } from "@/lib/tracking/db";
import { fmtDateTime } from "@/lib/tracking/format";
import { META_DK_REGIONS } from "@/lib/tracking/location";
import { type LocationFilters, getLocations, parseSegment } from "@/lib/tracking/locationQueries";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// A byte-order mark at the start makes Excel read the file as UTF-8 (Danish letters).
const BOM = String.fromCharCode(0xfeff);

function cell(value: unknown) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  // Stop spreadsheet apps from running a cell as a formula.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** One row per city, for planning Meta ads in a spreadsheet. */
export async function GET(request: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!hasDb()) return NextResponse.json({ error: "No database" }, { status: 500 });

  const p = request.nextUrl.searchParams;
  const days = Number(p.get("range"));
  const filters: LocationFilters = {
    days: [7, 30, 90].includes(days) ? days : 30,
    country: p.get("country") === "all" ? "all" : "DK",
    segment: parseSegment(p.get("source") || undefined),
  };
  const { cities } = await getLocations(filters);

  const header = [
    "City",
    "Region",
    "Country",
    "City certainty",
    "Visitors",
    "Visits",
    "From Instagram",
    "Via /dk link",
    "Leads",
    "Lead rate %",
    "Form started or high interest",
    "Avg. time (s)",
    "Avg. pages",
    "Postal codes",
    "Latitude",
    "Longitude",
    "Last visit (Copenhagen)",
    "Meta Ads location",
  ];
  const lines = [header.map(cell).join(",")];
  for (const c of cities) {
    const metaRegion = c.code === "DK" ? META_DK_REGIONS[c.region as string] : null;
    lines.push(
      [
        c.uncertain ? "Copenhagen?" : c.city || "Unknown",
        c.region,
        c.country,
        c.uncertain ? "uncertain (provider registered in Copenhagen)" : c.city ? "city" : "unknown",
        c.visitors,
        c.visits,
        c.instagram,
        c.bio,
        c.leads,
        c.visitors ? Math.round((c.leads / c.visitors) * 100) : 0,
        c.engaged,
        Math.round(c.avg_duration),
        c.avg_pages.toFixed(1),
        c.postcodes,
        c.lat?.toFixed(4),
        c.lon?.toFixed(4),
        fmtDateTime(c.last_visit),
        c.uncertain || !c.city ? "" : [c.city, metaRegion, c.country].filter(Boolean).join(", "),
      ]
        .map(cell)
        .join(","),
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  return new NextResponse(BOM + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cities-${today}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
