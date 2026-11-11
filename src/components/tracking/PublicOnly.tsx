"use client";

import { usePathname } from "next/navigation";

/** Hides the public header and footer inside the private /admin area. */
export function PublicOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  if (pathname.startsWith("/admin")) return null;
  return <>{children}</>;
}
