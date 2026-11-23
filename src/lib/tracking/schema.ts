import { db } from "./db";

/*
 * Small schema additions that the app makes by itself, so a deploy works
 * before anyone runs `npm run db:migrate`. db/migrations/005_locations.sql
 * holds the same statements for the migration script.
 */

const COLUMNS: { table: string; column: string; ddl: string }[] = [
  {
    // The site owner marked this visitor as themselves: hidden from statistics.
    table: "visitors",
    column: "excluded",
    ddl: "ALTER TABLE visitors ADD COLUMN IF NOT EXISTS excluded BOOLEAN NOT NULL DEFAULT false",
  },
  {
    // 'ipinfo' when the location came from the IPinfo lookup instead of Vercel.
    table: "sessions",
    column: "geo_source",
    ddl: "ALTER TABLE sessions ADD COLUMN IF NOT EXISTS geo_source TEXT",
  },
];

/**
 * Link scanners recorded before they were filtered out: Meta's scanners use a
 * 2000 x 2000 screen, and Meta's own networks are never real visitors. They are
 * hidden (is_bot), not deleted. Meta prefixes only count outside Denmark, as the
 * stored address keeps just its first two numbers.
 */
export const HIDE_KNOWN_SCANNERS_SQL = `
  UPDATE sessions SET is_bot = true
  WHERE NOT is_bot AND (
    (screen_width = 2000 AND screen_height = 2000)
    OR (COALESCE(country_code, '') <> 'DK' AND (
      ip_masked LIKE '2a03:2880:%'
      OR split_part(ip_masked, '.', 1) || '.' || split_part(ip_masked, '.', 2) IN (
        '31.13', '45.64', '57.141', '57.144', '57.145', '57.146', '57.147', '66.220',
        '69.63', '69.171', '74.119', '102.132', '103.4', '129.134', '157.240', '163.70',
        '163.77', '173.252', '179.60', '185.60', '185.89', '204.15'
      )
    ))
  )`;

let ready: Promise<void> | null = null;

/** Adds missing columns once per server instance. Safe to call on every request. */
export function ensureSchema() {
  ready ??= (async () => {
    const existing = await db()`
      SELECT table_name, column_name FROM information_schema.columns
      WHERE table_schema = current_schema() AND table_name IN ('visitors', 'sessions')`;
    const have = new Set(existing.map((r) => `${r.table_name}.${r.column_name}`));
    for (const c of COLUMNS) {
      if (!have.has(`${c.table}.${c.column}`)) await db().query(c.ddl);
    }
    await db().query(HIDE_KNOWN_SCANNERS_SQL);
  })().catch((err) => {
    ready = null;
    console.error("ensureSchema", err);
  });
  return ready;
}
