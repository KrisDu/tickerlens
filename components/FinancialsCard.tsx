"use client";

import { useEffect, useState } from "react";
import type { FinancialYear } from "@/lib/financials";

interface Stats {
  revenueCagr10y: number | null;
  epsCagr10y: number | null;
  avgRoe10y: number | null;
  divStreak: number;
  posEpsYears: number;
}

function B(v: number | null, digits = 0): string {
  if (v == null) return "—";
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (a >= 1e12) return `${sign}$${(a / 1e12).toFixed(2)}T`;
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(1)}M`;
  return `${sign}$${a.toLocaleString(undefined, { maximumFractionDigits: digits })}`;
}

function N(v: number | null, digits = 2): string {
  return v == null ? "—" : v.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

function P(v: number | null, digits = 1): string {
  return v == null ? "—" : `${v >= 0 ? "+" : ""}${v.toFixed(digits)}%`;
}

export default function FinancialsCard({ cik, ticker }: { cik: string; ticker: string }) {
  const [years, setYears] = useState<FinancialYear[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!cik) return;
    setYears(null);
    setError(false);
    fetch(`/api/company/${cik}/financials?ticker=${encodeURIComponent(ticker)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        setYears(j.years ?? []);
        setStats(j.stats ?? null);
      })
      .catch(() => setError(true));
  }, [cik, ticker]);

  if (!cik) return null;
  if (error) return <div className="note">XBRL financials unavailable for this CIK.</div>;
  if (years === null) return <div className="loading">Reading 10-K XBRL financials…</div>;
  if (!years.length) return <div className="note">No annual XBRL facts found.</div>;

  return (
    <div>
      {stats && (
        <div className="stats" style={{ marginTop: 0 }}>
          <div className="stat"><b>{P(stats.revenueCagr10y)}</b><span>10y revenue CAGR</span></div>
          <div className="stat"><b>{P(stats.avgRoe10y)}</b><span>avg ROE (10y)</span></div>
          <div className="stat"><b>{stats.divStreak}y</b><span>dividend streak</span></div>
          <div className="stat"><b>{stats.posEpsYears}/{years.length}</b><span>profitable years</span></div>
        </div>
      )}
      <div className="table-wrap" style={{ overflowX: "auto" }}>
        <table className="grid">
          <thead>
            <tr>
              <th>FY</th>
              <th style={{ textAlign: "right" }}>Revenue</th>
              <th style={{ textAlign: "right" }}>Net income</th>
              <th style={{ textAlign: "right" }}>EPS (dil.)</th>
              <th style={{ textAlign: "right" }}>BV/share</th>
              <th style={{ textAlign: "right" }}>ROE</th>
              <th style={{ textAlign: "right" }}>FCF</th>
              <th style={{ textAlign: "right" }}>Div/share</th>
              <th style={{ textAlign: "right" }}>Curr ratio</th>
              <th style={{ textAlign: "right" }}>D/E</th>
            </tr>
          </thead>
          <tbody>
            {[...years].reverse().map((y) => (
              <tr key={y.year}>
                <td><b>{y.year}</b></td>
                <td style={{ textAlign: "right" }}>{B(y.revenue)}</td>
                <td style={{ textAlign: "right", color: (y.netIncome ?? 0) < 0 ? "#f87171" : undefined }}>{B(y.netIncome)}</td>
                <td style={{ textAlign: "right" }}>${N(y.eps)}</td>
                <td style={{ textAlign: "right" }}>${N(y.bvps)}</td>
                <td style={{ textAlign: "right", color: (y.roe ?? 0) >= 15 ? "#34d399" : undefined }}>{y.roe != null ? `${y.roe.toFixed(1)}%` : "—"}</td>
                <td style={{ textAlign: "right" }}>{B(y.fcf)}</td>
                <td style={{ textAlign: "right" }}>${N(y.divps)}</td>
                <td style={{ textAlign: "right" }}>{y.currentRatio != null ? y.currentRatio.toFixed(2) : "—"}</td>
                <td style={{ textAlign: "right" }}>{y.debtToEquity != null ? y.debtToEquity.toFixed(2) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="note" style={{ marginTop: 6 }}>
        Annual FY facts from SEC XBRL companyfacts (10-K preferred). Per-share figures split-adjusted via Yahoo. Green ROE ≥ 15% — Buffett&apos;s hurdle.
      </div>
    </div>
  );
}
