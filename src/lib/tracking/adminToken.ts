import crypto from "node:crypto";

/* Signed admin session token. No Next.js imports, so the proxy can use it too. */

export const ADMIN_COOKIE = "tw_admin";
const SESSION_DAYS = 14;

function secret() {
  const explicit = process.env.ADMIN_SESSION_SECRET;
  if (explicit) return explicit;
  // Fallback so the login still works with only ADMIN_PASSWORD set.
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return null;
  return crypto.createHash("sha256").update(`tw-admin-session:${password}`).digest("hex");
}

function sign(expires: number) {
  const key = secret();
  if (!key) return null;
  return crypto.createHmac("sha256", key).update(`admin.v1.${expires}`).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD);
}

/** Compares against ADMIN_PASSWORD without leaking timing information. */
export function passwordMatches(given: string) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const digest = (v: string) => crypto.createHash("sha256").update(v).digest();
  return crypto.timingSafeEqual(digest(given), digest(expected));
}

export function createSessionToken() {
  const expires = Date.now() + SESSION_DAYS * 86_400_000;
  const signature = sign(expires);
  if (!signature) throw new Error("ADMIN_PASSWORD is not set.");
  return { value: `v1.${expires}.${signature}`, maxAge: SESSION_DAYS * 86_400 };
}

export function verifySessionToken(token: string | undefined) {
  if (!token) return false;
  const [version, expiresRaw, signature] = token.split(".");
  const expires = Number(expiresRaw);
  if (version !== "v1" || !signature || !Number.isFinite(expires) || expires < Date.now()) {
    return false;
  }
  const expected = sign(expires);
  return Boolean(expected) && safeEqual(signature, expected as string);
}

/** Only allow redirects back into the admin area after login. */
export function safeNextPath(next: unknown) {
  return typeof next === "string" && /^\/admin(\/[\w\-./]*)?(\?[\w\-=&%.+]*)?$/.test(next)
    ? next
    : "/admin";
}
