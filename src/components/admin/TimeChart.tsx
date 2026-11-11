"use client";

import styles from "@/app/admin/admin.module.scss";
import { useState } from "react";
import { LuChartLine, LuTable } from "react-icons/lu";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type DayPoint = {
  day: string;
  /** Short axis label, e.g. "4 Nov" */
  label: string;
  /** Full label for the tooltip and table, e.g. "Wed 4 Nov" */
  long: string;
  visits: number;
  visitors: number;
  leads: number;
};

const plural = (n: number, word: string) => (n === 1 ? word : `${word}s`);

// biome-ignore lint/suspicious/noExplicitAny: Recharts passes loosely typed tooltip props
function Tip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as DayPoint;
  return (
    <div className={styles.tip}>
      <div className={styles.tipTitle}>{p.long}</div>
      <div className={styles.tipRow}>
        <span className={styles.tipKey} />
        <strong>{p.visits}</strong>
        <span>{plural(p.visits, "visit")}</span>
      </div>
      <div className={styles.tipRow}>
        <span className={styles.tipKeyNone} />
        <strong>{p.visitors}</strong>
        <span>{plural(p.visitors, "visitor")}</span>
      </div>
      <div className={styles.tipRow}>
        <span className={styles.tipKeyNone} />
        <strong>{p.leads}</strong>
        <span>{plural(p.leads, "lead")}</span>
      </div>
    </div>
  );
}

/** Round axis values: 0, 5, 10, 15, 20 rather than 0, 5, 10, 15, 19. */
function axisTicks(max: number) {
  const step =
    [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2500, 5000].find((s) => s * 4 >= max) ??
    Math.ceil(max / 4);
  const top = Math.max(step * Math.ceil(max / step), step * 2);
  return Array.from({ length: top / step + 1 }, (_, i) => i * step);
}

export function TimeChart({ data, days }: { data: DayPoint[]; days: number }) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const tick = { fill: "var(--adm-muted)", fontSize: 11 };
  const last = data.length - 1;
  const ticks = axisTicks(Math.max(...data.map((d) => d.visits), 0));

  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h2 className={styles.cardTitle}>Visits over time</h2>
          <p className={styles.cardDesc}>Instagram visits per day, last {days} days</p>
        </div>
        <button
          type="button"
          className={styles.chartToggle}
          onClick={() => setView(view === "chart" ? "table" : "chart")}
        >
          {view === "chart" ? <LuTable aria-hidden /> : <LuChartLine aria-hidden />}
          {view === "chart" ? "Table" : "Chart"}
        </button>
      </div>
      <div className={`${styles.cardBody} ${styles.chartBody}`}>
        {view === "chart" ? (
          <div className={styles.chartBox}>
            {/* Absolutely positioned, so the chart fills the card whatever its height. */}
            <div className={styles.chartInner}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 12, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
                  <XAxis
                    dataKey="label"
                    tick={tick}
                    tickLine={false}
                    axisLine={{ stroke: "var(--chart-axis)" }}
                    interval="preserveStartEnd"
                    minTickGap={36}
                    tickMargin={8}
                  />
                  <YAxis
                    width={36}
                    tick={tick}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                    ticks={ticks}
                    domain={[0, ticks[ticks.length - 1]]}
                  />
                  <Tooltip
                    content={<Tip />}
                    cursor={{ stroke: "var(--adm-muted)", strokeWidth: 1 }}
                    isAnimationActive={false}
                  />
                  <Area
                    type="monotone"
                    dataKey="visits"
                    stroke="var(--series-1)"
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    fill="var(--series-1)"
                    fillOpacity={0.1}
                    isAnimationActive={false}
                    // Only the most recent day carries a dot.
                    dot={({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) =>
                      index === last && cx != null && cy != null ? (
                        <circle
                          key="end"
                          cx={cx}
                          cy={cy}
                          r={4}
                          fill="var(--series-1)"
                          stroke="var(--adm-card)"
                          strokeWidth={2}
                        />
                      ) : (
                        <g key={`d${index}`} />
                      )
                    }
                    activeDot={{
                      r: 5,
                      fill: "var(--series-1)",
                      stroke: "var(--adm-card)",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Day</th>
                  <th scope="col">Visits</th>
                  <th scope="col">Visitors</th>
                  <th scope="col">Leads</th>
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map((p) => (
                  <tr key={p.day}>
                    <td>{p.long}</td>
                    <td>{p.visits}</td>
                    <td>{p.visitors}</td>
                    <td>{p.leads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
