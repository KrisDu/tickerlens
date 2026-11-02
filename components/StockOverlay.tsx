"use client";

import { useEffect, useMemo, useState } from "react";
import type { HeadcountPoint } from "@/lib/sec";

interface YearClose {
  year: number;
  close: number;
}

export default function StockOverlay({
  ticker,
  points,
}: {
  ticker: string;
  points: HeadcountPoint[];
}) {
  const [prices, setPrices] = useState<YearClose[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    setPrices(null);
    setFailed(false);
    fetch(`/api/stock/${ticker}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => setPrices(j.yearly ?? []))
      .catch(() => setFailed(true));
  }, [ticker]);

  const rows = useMemo(() => {
    if (!prices?.length) return [];
    const px = new Map(prices.map((p) => [p.year, p.close]));
    return points
      .map((p) => ({ year: p.year, employees: p.employees, close: px.get(p.year) ?? null }))
      .filter((r) => r.close != null) as Array<{ year: number; employees: number; close: number }>;
  }, [points, prices]);

  if (failed)
    return <div className="note">Price history unavailable for {ticker} (Stooq has no series).</div>;
  if (!prices) return <div className="loading">Loading price history…</div>;
  if (!rows.length)
    return <div className="note">No overlapping years between headcount and price data.</div>;

  const W = 720;
  const H = 300;
  const pad = 48;
  const emps = rows.map((r) => r.employees);
  const cl = rows.map((r) => r.close);
  // Log scale for price keeps doublings visually even.
  const logs = cl.map((c) => Math.log(c));
  const eMin = Math.min(...emps);
  const eMax = Math.max(...emps);
  const lMin = Math.min(...logs);
  const lMax = Math.max(...logs);
  const X = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, rows.length - 1);
  const Ye = (v: number) => H - pad - ((v - eMin) / Math.max(1, eMax - eMin)) * (H - pad * 2);
  const Yp = (c: number) => H - pad - ((Math.log(c) - lMin) / Math.max(1e-9, lMax - lMin)) * (H - pad * 2);
  const ePath = rows.map((r, i) => `${i === 0 ? "M" : "L"}${X(i)},${Ye(r.employees)}`).join(" ");
  const pPath = rows.map((r, i) => `${i === 0 ? "M" : "L"}${X(i)},${Yp(r.close)}`).join(" ");
  const hi = hover ?? rows.length - 1;
  const a = rows[hi];

  return (
    <div>
      <div style={{ display: "flex", gap: 16, alignItems: "baseline", flexWrap: "wrap" }}>
        <span style={{ fontSize: 13 }}>
          <i style={{ display: "inline-block", width: 18, height: 3, background: "#5eead4", verticalAlign: "middle", marginRight: 6 }} />
          <span className="muted">employees ({a.employees.toLocaleString()} in {a.year})</span>
        </span>
        <span style={{ fontSize: 13 }}>
          <i style={{ display: "inline-block", width: 18, height: 3, background: "#fbbf24", verticalAlign: "middle", marginRight: 6 }} />
          <span className="muted">year-end close (${a.close.toLocaleString(undefined, { maximumFractionDigits: 2 })})</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", marginTop: 8 }} onMouseLeave={() => setHover(null)}>
        <path d={`${ePath} L${X(rows.length - 1)},${H - pad} L${X(0)},${H - pad} Z`} fill="#5eead4" opacity="0.12" />
        <path d={ePath} fill="none" stroke="#5eead4" strokeWidth="2" />
        <path d={pPath} fill="none" stroke="#fbbf24" strokeWidth="2.5" strokeLinejoin="round" />
        {rows.map((r, i) => (
          <g key={r.year}>
            <circle cx={X(i)} cy={Yp(r.close)} r={hover === i ? 5 : 2.5} fill={hover === i ? "#fff" : "#0b1020"} stroke="#fbbf24" strokeWidth="2" style={{ cursor: "pointer" }} onMouseEnter={() => setHover(i)} />
            <rect x={X(i) - 14} y={0} width={28} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />
            {i % Math.ceil(rows.length / 8) === 0 && (
              <text x={X(i)} y={H - 12} fill="#9aa7d0" fontSize="11" textAnchor="middle">{r.year}</text>
            )}
          </g>
        ))}
        <text x={6} y={20} fill="#5eead4" fontSize="10">headcount</text>
        <text x={W - 6} y={20} fill="#fbbf24" fontSize="10" textAnchor="end">price (log)</text>
      </svg>
      <div className="chart-tip">
        Fiscal-year headcount vs calendar year-end close (Stooq, split-adjusted). Hiring ≠ returns — compare shapes, not levels.
      </div>
    </div>
  );
}
