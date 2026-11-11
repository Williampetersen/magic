"use client";

import styles from "@/app/admin/admin.module.scss";
import { useState } from "react";

export type MapPoint = {
  /** Position in percent of the map width and height */
  x: number;
  y: number;
  /** Dot diameter in px */
  size: number;
  label: string;
  country: string | null;
  count: number;
};

export function MapView({
  width,
  height,
  land,
  points,
}: {
  width: number;
  height: number;
  land: string;
  points: MapPoint[];
}) {
  const [active, setActive] = useState<number | null>(null);
  const tip = active === null ? null : points[active];

  return (
    <div className={styles.mapWrap} onMouseLeave={() => setActive(null)}>
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Map of visitor locations">
        <path className={styles.mapLand} d={land} />
      </svg>
      {points.map((p, i) => (
        <button
          key={`${p.label}-${p.x}-${p.y}`}
          type="button"
          className={styles.bubble}
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size }}
          aria-label={`${p.label}${p.country ? `, ${p.country}` : ""}: ${p.count} visits`}
          onMouseEnter={() => setActive(i)}
          onFocus={() => setActive(i)}
          onBlur={() => setActive(null)}
        />
      ))}
      {tip && (
        <output
          className={`${styles.tip} ${styles.mapTip} ${
            tip.x < 22 ? styles.mapTipLeft : tip.x > 78 ? styles.mapTipRight : ""
          }`}
          style={{ left: `${tip.x}%`, top: `${Math.max(tip.y, 22)}%` }}
        >
          <span className={styles.tipTitle}>
            {tip.label}
            {tip.country && tip.country !== tip.label ? `, ${tip.country}` : ""}
          </span>
          <span className={styles.tipRow}>
            <span className={styles.tipKey} />
            <strong>{tip.count}</strong>
            <span>{tip.count === 1 ? "visit" : "visits"}</span>
          </span>
        </output>
      )}
    </div>
  );
}
