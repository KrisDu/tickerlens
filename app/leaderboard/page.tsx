"use client";

import { Suspense, useEffect, useState } from "react";

interface Row {
  ticker: string;
  name: string;
  latest: number | null;
  latestYear: number | null;
  yoyPct: number | null;
  cagr5y: number | null;
  cagr10y: number | null;
  points: number;
}

function pct(v: number | null, digits = 1): string {
  return v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

function Table({ title, sub, rows, cols }: { title: string; sub: string; rows: Row[]; cols: Array<"yoy" | "cagr5" | "cagr10" | "latest"> }) {
  const link = (r: Row) => `/company/${r.ticker}`;
  return (
    <div className="card">
      <h3 style={{ marginBottom: 2 }}>{title}</h3>
      <div className="note" style={{ marginBottom: 8 }}>{sub}</div>
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Company</th>
              {cols.includes("latest") && <th style={{ textAlign: "right" }}>Employees</th>}
              {cols.includes("yoy") && <th style={{ textAlign: "right" }}>YoY</th>}
              {cols.includes("cagr5") && <th style={{ textAlign: "right" }}>5y CAGR</th>}
              {cols.includes("cagr10") && <th style={{ textAlign: "right" }}>10y CAGR</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.ticker}>
                <td><a href={link(r)}><span className="ticker">{r.ticker}</span></a></td>
                <td className="muted">{r.name}</td>
                {cols.includes("latest") && <td style={{ textAlign: "right" }}>{r.latest?.toLocaleString() ?? "—"} <span className="muted">({r.latestYear})</span></td>}
                {cols.includes("yoy") && <td style={{ textAlign: "right", color: (r.yoyPct ?? 0) < -3 ? "#f87171" : (r.yoyPct ?? 0) >= 0 ? "#34d399" : undefined }}>{pct(r.yoyPct)}</td>}
                {cols.includes("cagr5") && <td style={{ textAlign: "right" }}>{pct(r.cagr5y)}</td>}
                {cols.includes("cagr10") && <td style={{ textAlign: "right" }}>{pct(r.cagr10y)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Boards() {
  const [data, setData] = useState<{ growers: Row[]; shrinkers: Row[]; biggest: Row[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/leaderboard")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => setData(j))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) return <div className="error">Leaderboard failed: {error}</div>;
  if (!data) return <div className="loading">Crunching ~30 companies × 10 years of filings (a few minutes cold, cached after)…</div>;
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <Table title="🚀 Fastest growers" sub="Highest 5-year headcount CAGR" rows={data.growers} cols={["cagr5", "cagr10", "latest"]} />
      <Table title="📉 Biggest shrinkers" sub="Worst latest year-over-year change (possible layoffs)" rows={data.shrinkers} cols={["yoy", "cagr5", "latest"]} />
      <Table title="🏢 Largest employers" sub="Latest disclosed headcount" rows={data.biggest} cols={["latest", "yoy"]} />
    </div>
  );
}

export default function LeaderboardPage() {
  return (
    <div>
      <p className="muted" style={{ fontSize: 13 }}><a href="/">← Explorer</a></p>
      <h1 style={{ margin: "4px 0 6px" }}>Leaderboards</h1>
      <p className="muted">Computed live from parsed 10-K/20-F disclosures across the covered universe. Cold compute takes minutes; results cache for a day.</p>
      <Suspense fallback={<div className="loading">Loading…</div>}>
        <Boards />
      </Suspense>
    </div>
  );
}
