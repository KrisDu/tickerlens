"use client";

import { useEffect, useState } from "react";
import type { FinancialYear } from "@/lib/financials";

function B(v: number | null, digits = 0): string {
  if (v == null) return "—";
  const a = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (a >= 1e9) return `${sign}$${(a / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `${sign}$${(a / 1e6).toFixed(1)}M`;
  return `${sign}$${a.toLocaleString(undefined, { maximumFractionDigits: digits })}`;
}

export default function BuybacksCard({ cik, ticker }: { cik: string; ticker: string }) {
  const [years, setYears] = useState<FinancialYear[] | null>(null);
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
      .then((j) => setYears((j.years ?? []).filter((y: FinancialYear) => y.sharesOut != null || y.buybacks != null)))
      .catch(() => setError(true));
  }, [cik, ticker]);

  if (!cik) return null;
  if (error) return <div className="note">Buyback data unavailable.</div>;
  if (years === null) return <div className="loading">Tallying buybacks…</div>;
  if (!years.length) return <div className="note">No share-count data in XBRL.</div>;

  const first = years[0];
  const last = years[years.length - 1];
  const shrink =
    first.sharesOut && last.sharesOut && first.sharesOut > 0
      ? ((first.sharesOut - last.sharesOut) / first.sharesOut) * 100
      : null;
  const totalBb = years.reduce((a, y) => a + (y.buybacks ?? 0), 0);
  const maxBb = Math.max(1, ...years.map((y) => y.buybacks ?? 0));
  const W = 720;
  const H = 180;
  const pad = 36;
  const X = (i: number) => pad + (i * (W - pad * 2)) / Math.max(1, years.length - 1);

  return (
    <div>
      <div className="stats" style={{ marginTop: 0 }}>
        <div className="stat"><b>{shrink != null ? `${shrink >= 0 ? "−" : "+"}${Math.abs(shrink).toFixed(1)}%` : "—"}</b><span>share-count change ({first.year}→{last.year})</span></div>
        <div className="stat"><b>{B(totalBb)}</b><span>spent on buybacks (sum)</span></div>
        <div className="stat"><b>{last.sharesOut ? (last.sharesOut / 1e9).toFixed(2) + "B" : "—"}</b><span>shares out ({last.year})</span></div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
        {years.map((y, i) => {
          const h = ((y.buybacks ?? 0) / maxBb) * (H - pad - 20);
          return (
            <g key={y.year}>
              <rect
                x={X(i) - 8}
                y={H - pad - h}
                width={16}
                height={Math.max(1, h)}
                rx={3}
                fill="#818cf8"
                opacity={0.85}
              >
                <title>{`${y.year}: ${B(y.buybacks)} buybacks${y.sharesOut ? ` · ${(y.sharesOut / 1e9).toFixed(2)}B shares` : ""}`}</title>
              </rect>
              {i % Math.ceil(years.length / 8) === 0 && (
                <text x={X(i)} y={H - 12} fill="#9aa7d0" fontSize="11" textAnchor="middle">{y.year}</text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="chart-tip">Buyback $ per fiscal year (XBRL PaymentsForRepurchaseOfCommonStock). Shrinking share count = each remaining share owns more of the company.</div>
    </div>
  );
}
