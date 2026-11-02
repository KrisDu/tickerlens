"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import HeadcountChart from "@/components/HeadcountChart";
import type { HeadcountPoint } from "@/lib/sec";

interface Series {
  ticker: string;
  cik: string;
  points: HeadcountPoint[];
  error?: string;
}

function CompareInner() {
  const sp = useSearchParams();
  const tickers = (sp.get("tickers") ?? "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 4);
  const ciks = (sp.get("ciks") ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);
  const [series, setSeries] = useState<Series[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!tickers.length) {
      setLoading(false);
      return;
    }
    Promise.all(
      tickers.map(async (ticker, i): Promise<Series> => {
        const cik = ciks[i] ?? "";
        if (!cik) return { ticker, cik: "", points: [], error: "missing CIK" };
        try {
          const r = await fetch(`/api/company/${cik}/headcount`);
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const j = await r.json();
          return { ticker, cik, points: j.points ?? [] };
        } catch (e) {
          return { ticker, cik, points: [], error: String(e) };
        }
      })
    ).then((s) => {
      setSeries(s);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!tickers.length)
    return (
      <div>
        <h1>Compare companies</h1>
        <p className="muted">
          No tickers selected. <a href="/">Go back to the explorer</a> and add up to 4 to the compare tray.
        </p>
      </div>
    );

  // Align years
  const years = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.year)))).sort((a, b) => a - b);
  const colors = ["#5eead4", "#818cf8", "#fbbf24", "#f472b6"];

  return (
    <div>
      <p className="muted" style={{ fontSize: 13 }}><a href="/">← Explorer</a></p>
      <h1 style={{ margin: "4px 0 6px" }}>Headcount showdown: {tickers.join(" vs ")}</h1>
      <p className="muted">Normalized employee counts per fiscal year, SEC XBRL. Below: individual trends + raw table.</p>
      {loading && <div className="loading">Loading headcount series…</div>}
      {!loading && (
        <>
          <div className="card" style={{ overflowX: "auto" }}>
            <table className="grid">
              <thead>
                <tr><th>Year</th>{series.map((s, i) => (
                  <th key={s.ticker} style={{ color: colors[i % colors.length] }}>{s.ticker}</th>
                ))}</tr>
              </thead>
              <tbody>
                {years.map((y) => (
                  <tr key={y}>
                    <td><b>{y}</b></td>
                    {series.map((s) => {
                      const pt = s.points.find((p) => p.year === y);
                      return <td key={s.ticker} className="muted">{pt ? pt.employees.toLocaleString() : "—"}</td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: "grid", gap: 14, marginTop: 14 }}>
            {series.map((s) => (
              <div className="card" key={s.ticker}>
                <h3><span className="ticker">{s.ticker}</span> <span className="muted">CIK {s.cik}</span></h3>
                {s.error ? <div className="error">{s.error}</div> : <HeadcountChart points={s.points} />}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense fallback={<div className="loading">Loading comparison…</div>}>
      <CompareInner />
    </Suspense>
  );
}
