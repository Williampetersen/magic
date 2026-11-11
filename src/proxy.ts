import { ADMIN_COOKIE, verifySessionToken } from "@/lib/tracking/adminToken";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Sends anyone who is not logged in to the admin login page, and remembers
 * which page they wanted (for example a visitor link from an alert email).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();
  if (verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value)) return NextResponse.next();

  const login = new URL("/admin/login", request.url);
  login.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
