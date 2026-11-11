"use client";

import { logoutAction } from "@/app/admin/actions";
import styles from "@/app/admin/admin.module.scss";
import { ThemeToggle } from "@/components/ThemeToggle";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  LuBell,
  LuExternalLink,
  LuInstagram,
  LuLayoutDashboard,
  LuLink,
  LuLogOut,
  LuSettings,
  LuUserCheck,
  LuUsers,
} from "react-icons/lu";

const NAV = [
  { href: "/admin", label: "Overview", short: "Overview", icon: LuLayoutDashboard },
  { href: "/admin/visitors", label: "Visitors", short: "Visitors", icon: LuUsers },
  { href: "/admin/leads", label: "Leads", short: "Leads", icon: LuUserCheck },
  { href: "/admin/notifications", label: "Notifications", short: "Alerts", icon: LuBell },
  { href: "/admin/links", label: "Link builder", short: "Links", icon: LuLink },
  { href: "/admin/settings", label: "Settings", short: "Settings", icon: LuSettings },
];

function Brand() {
  return (
    <div className={styles.brand}>
      <span className={styles.brandMark}>
        <LuInstagram size={16} aria-hidden />
      </span>
      <div>
        <div className={styles.brandName}>Visitor Insights</div>
        <div className={styles.brandSub}>Instagram tracking</div>
      </div>
    </div>
  );
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/admin";
  const isActive = (href: string) =>
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <div className={styles.root}>
      <aside className={styles.sidebar}>
        <Brand />
        <nav className={styles.nav} aria-label="Admin">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(item.href) ? "page" : undefined}
              className={`${styles.navItem} ${isActive(item.href) ? styles.navActive : ""}`}
            >
              <item.icon aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.sidebarFoot}>
          <div className={styles.themeRow}>
            <span>Theme</span>
            <ThemeToggle />
          </div>
          <a className={styles.navItem} href="/" target="_blank" rel="noreferrer">
            <LuExternalLink aria-hidden />
            View site
          </a>
          <form action={logoutAction}>
            <button className={styles.navItem} type="submit">
              <LuLogOut aria-hidden />
              Log out
            </button>
          </form>
        </div>
      </aside>

      <div style={{ minWidth: 0 }}>
        <header className={styles.topbar}>
          <Brand />
          <div className={styles.topbarActions}>
            <ThemeToggle />
            <form action={logoutAction}>
              <button className={styles.iconBtn} type="submit" aria-label="Log out">
                <LuLogOut size={18} aria-hidden />
              </button>
            </form>
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </div>

      <nav className={styles.tabbar} aria-label="Admin">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={`${styles.tab} ${isActive(item.href) ? styles.tabActive : ""}`}
          >
            <item.icon aria-hidden />
            {item.short}
          </Link>
        ))}
      </nav>
    </div>
  );
}
