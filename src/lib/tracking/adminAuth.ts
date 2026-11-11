import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, verifySessionToken } from "./adminToken";
import { siteOrigin } from "./settings";

export async function isAdmin() {
  const store = await cookies();
  return verifySessionToken(store.get(ADMIN_COOKIE)?.value);
}

/**
 * Call at the top of every admin page. The proxy already redirects visitors
 * who are not logged in; this second check protects the data itself.
 */
export async function requireAdmin(next?: string) {
  if (await isAdmin()) return;
  redirect(next ? `/admin/login?next=${encodeURIComponent(next)}` : "/admin/login");
}

/** Address the admin is being used on, for links inside emails. */
export async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host");
  if (!host) return siteOrigin();
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return siteOrigin(`${proto}://${host}`);
}
