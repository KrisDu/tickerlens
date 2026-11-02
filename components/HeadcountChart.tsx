"use client";

import { useMemo, useState } from "react";
import type { HeadcountPoint } from "@/lib/sec";

function fmt(n: number) {
  return n.toLocaleString("en-US");
}

export default function HeadcountChart({ points }: { points: HeadcountPoint[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [showGrowth, setShowGrowth] = useState(true);

  const { min, max, growth } = useMemo(() => {
    if (!points.length) return { min: 0, max: 1, growth: [] as (number | null)[] };
    const vals = points.map((p) => p.employees);
    const g: (number | null)[] = points.map((p, i) =>
      i === 0 ? null : ((p.employees - points[i - 1].employees) / points[i - 1].employees) * 100
    );
    return { min: Math.min(...vals), max: Math.max(...vals), growth: g };
  }, [points]);

  if (!points.length)
    return <div className="loading">No headcount found in XBRL facts or recent 10-K text for this CIK — try the 10-K link in Company facts.</div>;

  const W = 720;
  const H = 300;
  const pad = 44;
  const x = (i: number) =>
    pad + (i * (W - pad * 2)) / Math.max(1, points.length - 1);
  const y = (v: number) =>
    H - pad - ((v - min) / Math.max(1, max - min)) * (H - pad * 2);

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.employees)}`).join(" ");
  const area = `${path} L${x(points.length - 1)},${H - pad} L${x(0)},${H - pad} Z`;

  const active = hover != null ? points[hover] : points[points.length - 1];

  return (
    <div>
      <div style={{ display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
        <div style={{ fontSize: 30, fontWeight: 900 }}>{fmt(active.employees)}</div>
        <div className="muted" style={{ fontSize: 13 }}>
          employees · {active.year} · {active.form} filed {active.filingDate}
        </div>
        <label className="muted" style={{ marginLeft: "auto", fontSize: 12 }}>
          <input
            type="checkbox"
            checked={showGrowth}
            onChange={(e) => setShowGrowth(e.target.checked)}
          />{" "}
          YoY %
        </label>
      </div>
      <svg
        id="headcount-chart"
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%", height: "auto", marginTop: 8 }}
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5eead4" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#818cf8" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((t) => {
          const v = min + (max - min) * t;
          return (
            <g key={t}>
              <line x1={pad} x2={W - pad} y1={y(v)} y2={y(v)} stroke="#26315c" strokeDasharray="4 4" />
              <text x={4} y={y(v) + 4} fill="#9aa7d0" fontSize="10">
                {v >= 1000 ? `${Math.round(v / 1000)}k` : Math.round(v)}
              </text>
            </g>
          );
        })}
        <path d={area} fill="url(#hg)" />
        <path d={path} fill="none" stroke="#5eead4" strokeWidth="2.5" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={p.year}>
            <circle
              cx={x(i)}
              cy={y(p.employees)}
              r={hover === i ? 5 : 3}
              fill={hover === i ? "#fff" : "#0b1020"}
              stroke="#5eead4"
              strokeWidth="2"
              onMouseEnter={() => setHover(i)}
              style={{ cursor: "pointer" }}
            />
            <rect
              x={x(i) - 14}
              y={0}
              width={28}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHover(i)}
            />
            {i % Math.ceil(points.length / 8) === 0 && (
              <text x={x(i)} y={H - 12} fill="#9aa7d0" fontSize="11" textAnchor="middle">
                {p.year}
              </text>
            )}
            {showGrowth && growth[i] != null && (
              <text
                x={x(i)}
                y={y(p.employees) - 10}
                fill={growth[i]! >= 0 ? "#34d399" : "#f87171"}
                fontSize="10"
                textAnchor="middle"
              >
                {growth[i]! >= 0 ? "+" : ""}
                {growth[i]!.toFixed(1)}%
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="chart-tip">
        Hover points to inspect. <b>XBRL</b> = tagged SEC fact ·
        <b>10-K/20-F</b> = parsed from the filing&apos;s Human Capital text (snippet in table).
      </div>
    </div>
  );
}
