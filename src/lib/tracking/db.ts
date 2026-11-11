import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

export function hasDb() {
  return Boolean(process.env.DATABASE_URL);
}

/** Tagged-template SQL client: await db()`SELECT ...`. Also db().query(text, params). */
export function db() {
  if (!client) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set.");
    client = neon(url);
  }
  return client;
}

// biome-ignore lint/suspicious/noExplicitAny: database rows are loosely typed
export type Row = Record<string, any>;

export async function insertRow(table: string, values: Row) {
  const keys = Object.keys(values);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  await db().query(
    `INSERT INTO ${table} (${keys.join(", ")}) VALUES (${placeholders})`,
    keys.map((k) => values[k]),
  );
}
