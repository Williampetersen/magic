import styles from "@/app/admin/admin.module.scss";
import type { Row } from "@/lib/tracking/db";
import { placementLabel, sourceLabel } from "@/lib/tracking/format";
import * as Flags from "country-flag-icons/react/3x2";
import Link from "next/link";
import type { ComponentType, ReactNode, SVGProps } from "react";
import {
  LuArrowDownRight,
  LuArrowUpRight,
  LuGamepad2,
  LuMonitor,
  LuSmartphone,
  LuTablet,
  LuTv,
  LuWatch,
} from "react-icons/lu";

export const cx = (...names: (string | false | null | undefined)[]) =>
  names.filter(Boolean).join(" ");

export const nf = new Intl.NumberFormat("en-GB");

export function PageHeader({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className={styles.pageHead}>
      <div>
        <h1 className={styles.h1}>{title}</h1>
        {description && <p className={styles.sub}>{description}</p>}
      </div>
      {children && <div className={styles.headSide}>{children}</div>}
    </header>
  );
}

export function Card({
  title,
  description,
  action,
  children,
  className,
  flush,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Content runs edge to edge (lists and tables). */
  flush?: boolean;
}) {
  return (
    <section className={cx(styles.card, className)}>
      {(title || action) && (
        <div className={styles.cardHead}>
          <div>
            {title && <h2 className={styles.cardTitle}>{title}</h2>}
            {description && <p className={styles.cardDesc}>{description}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={flush ? styles.cardFlush : styles.cardBody}>{children}</div>
    </section>
  );
}

/** Change against the period before. More visitors is good, so up is green. */
export function Delta({
  current,
  previous,
  period,
}: {
  current: number;
  previous: number;
  /** The period compared against, e.g. "yesterday" or "the 7 days before". */
  period: string;
}) {
  if (!previous) return <span>none {period}</span>;
  const change = Math.round(((current - previous) / previous) * 100);
  const up = change > 0;
  return (
    <>
      <span className={cx(styles.delta, change !== 0 && (up ? styles.deltaUp : styles.deltaDown))}>
        {change !== 0 && (up ? <LuArrowUpRight aria-hidden /> : <LuArrowDownRight aria-hidden />)}
        {up ? "+" : ""}
        {change}%
      </span>
      <span className={styles.deltaNote}>vs {period}</span>
    </>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  large,
  compact,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  large?: boolean;
  /** For values that are words, not numbers. */
  compact?: boolean;
}) {
  return (
    <div className={cx(styles.stat, large && styles.statLarge, compact && styles.statCompact)}>
      <div className={styles.statLabel}>
        {icon}
        {label}
      </div>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statHint}>{hint}</div>
    </div>
  );
}

export type BarRow = {
  key: string;
  label: string;
  value: number;
  leading?: ReactNode;
  hint?: string;
};

/** Ranked horizontal bars: one hue, largest first, the value printed at the end. */
export function BarList({ rows, empty }: { rows: BarRow[]; empty?: ReactNode }) {
  if (!rows.length) return <>{empty ?? <Empty title="No data yet" />}</>;
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className={styles.barList}>
      {rows.map((r) => (
        <li key={r.key}>
          <div className={styles.barHead}>
            <span className={styles.barLabel} title={r.label}>
              {r.leading}
              <span>{r.label}</span>
            </span>
            <span className={styles.barValue}>
              {nf.format(r.value)}
              {r.hint && <span className={styles.barHint}>{r.hint}</span>}
            </span>
          </div>
          <div className={styles.barTrack}>
            <div className={styles.barFill} style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

export type Part = { key: string; label: string; value: number; color: string };

/** One whole split into parts: a thin bar above a list that names every part. */
export function SegmentedBar({ parts }: { parts: Part[] }) {
  const total = parts.reduce((sum, p) => sum + p.value, 0);
  const share = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  const summary = parts.map((p) => `${p.label} ${p.value} (${share(p.value)}%)`).join(", ");
  return (
    <>
      <div
        className={cx(styles.segBar, !total && styles.segBarEmpty)}
        role="img"
        aria-label={total ? summary : "No data yet"}
      >
        {parts
          .filter((p) => p.value > 0)
          .map((p) => (
            <span
              key={p.key}
              title={`${p.label}: ${p.value} (${share(p.value)}%)`}
              style={{ flex: p.value, background: p.color }}
            />
          ))}
      </div>
      <ul className={styles.legendList}>
        {parts.map((p) => (
          <li key={p.key} className={styles.legendRow}>
            <span className={styles.swatch} style={{ background: p.color }} />
            <span className={styles.legendName}>{p.label}</span>
            <span className={styles.legendValue}>{nf.format(p.value)}</span>
            <span className={styles.legendShare}>{share(p.value)}%</span>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Colour follows the placement itself, so a filter never repaints it. */
export const PLACEMENT_COLORS: Record<string, string> = {
  bio: "var(--series-1)",
  story: "var(--series-2)",
  post: "var(--series-3)",
  dm: "var(--series-4)",
  unknown: "var(--series-other)",
};

export const PLACEMENT_ORDER = ["bio", "story", "post", "dm", "unknown"];

export function Flag({ code, title }: { code?: string | null; title?: string }) {
  const Svg = code
    ? (Flags as Record<string, ComponentType<SVGProps<SVGSVGElement> & { title?: string }>>)[
        code.toUpperCase()
      ]
    : undefined;
  if (!Svg) return <span className={cx(styles.flag, styles.flagEmpty)} aria-hidden />;
  return (
    <span className={styles.flag}>
      <Svg title={title || code || ""} />
    </span>
  );
}

export function DeviceIcon({ type }: { type?: string | null }) {
  switch (type) {
    case "mobile":
      return <LuSmartphone aria-label="Phone" />;
    case "tablet":
      return <LuTablet aria-label="Tablet" />;
    case "smarttv":
      return <LuTv aria-label="TV" />;
    case "wearable":
      return <LuWatch aria-label="Wearable" />;
    case "console":
      return <LuGamepad2 aria-label="Console" />;
    default:
      return <LuMonitor aria-label="Desktop" />;
  }
}

export const deviceTypeLabel = (type?: string | null) =>
  ({ mobile: "Phone", tablet: "Tablet", desktop: "Desktop", smarttv: "TV" })[type || ""] ||
  (type ? type[0].toUpperCase() + type.slice(1) : "Unknown");

export function Badge({
  tone,
  icon,
  dot,
  children,
  title,
}: {
  tone?: "good" | "bad" | "warn";
  icon?: ReactNode;
  dot?: string;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cx(
        styles.badge,
        tone === "good" && styles.badgeGood,
        tone === "bad" && styles.badgeBad,
        tone === "warn" && styles.badgeWarn,
      )}
    >
      {icon}
      {dot && <span className={styles.badgeDot} style={{ background: dot }} />}
      <span>{children}</span>
    </span>
  );
}

/** "Story", "Bio link"... for Instagram visits, otherwise where the visit came from. */
export function SourceBadge({ session }: { session: Row }) {
  if (session.source !== "instagram") {
    return <Badge dot="var(--series-other)">{sourceLabel(session)}</Badge>;
  }
  const placement = session.ig_placement || "unknown";
  return (
    <Badge
      dot={PLACEMENT_COLORS[placement] || PLACEMENT_COLORS.unknown}
      title={`Instagram · ${placementLabel(placement)}`}
    >
      {placement === "unknown" ? "Instagram" : placementLabel(placement)}
    </Badge>
  );
}

export function Empty({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={styles.empty}>
      {icon && <div className={styles.emptyIcon}>{icon}</div>}
      <div className={styles.emptyTitle}>{title}</div>
      {children && <div>{children}</div>}
      {action && <div className={styles.emptyAction}>{action}</div>}
    </div>
  );
}

/** Small tab row made of links, so the choice lives in the page address. */
export function LinkTabs<T extends string | number>({
  value,
  options,
  href,
  label,
  small,
}: {
  value: T;
  options: { value: T; label: string }[];
  href: (value: T) => string;
  label: string;
  small?: boolean;
}) {
  return (
    <nav className={cx(styles.seg, small && styles.segSmall)} aria-label={label}>
      {options.map((o) => (
        <Link
          key={o.value}
          href={href(o.value)}
          scroll={false}
          aria-current={o.value === value ? "true" : undefined}
          className={cx(styles.segItem, o.value === value && styles.segActive)}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
