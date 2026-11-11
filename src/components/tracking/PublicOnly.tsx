"use client";

import { Flex } from "@once-ui-system/core";
import { usePathname } from "next/navigation";

const isAdminPath = (pathname: string | null) => (pathname ?? "").startsWith("/admin");

/** Hides the public header, footer and background inside the private /admin area. */
export function PublicOnly({ children }: { children: React.ReactNode }) {
  if (isAdminPath(usePathname())) return null;
  return <>{children}</>;
}

/** The padded, centred frame around public pages. The admin area uses the full screen. */
export function SiteFrame({ children }: { children: React.ReactNode }) {
  if (isAdminPath(usePathname())) return <>{children}</>;
  return (
    <Flex zIndex={0} fillWidth padding="l" horizontal="center" flex={1}>
      <Flex horizontal="center" fillWidth minHeight="0">
        {children}
      </Flex>
    </Flex>
  );
}
