"use client";

import { useEffect, useState } from "react";

interface Detail {
  roa: boolean | null;
  cfo: boolean | null;
  deltaRoa: boolean | null;
  accrual: boolean | null;
  deltaLever: boolean | null;
  deltaLiquid: boolean | null;
  noDilution: boolean | null;
  deltaMargin: boolean | null;
  deltaTurn: boolean | null;
}

const LABELS: Array<[keyof Detail, string]> = [
  ["roa", "ROA positive"],
  ["cfo", "Cash flow positive"],
  ["deltaRoa", "ROA improving"],
  ["accrual", "Cash-backed earnings (CFO > NI)"],
  ["deltaLever", "Leverage falling"],
  ["deltaLiquid", "Liquidity improving"],
  ["noDilution", "No new shares issued"],
  ["deltaMargin", "Gross margin expanding"],
  ["deltaTurn", "Asset turnover rising"],
];

export default function ScoresCard({ cik, ticker }: { cik: string; ticker: string }) {
  const [data, setData] = useState<{
    fScore: number | null;
    fDetail: Detail;
    fLabel: string | null;
    zScore: number | null;
    zLabel: string | null;
    year: number | null;
  } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!cik) return;
    setData(null);
    setError(false);
    (async () => {
      try {
        let price: number | undefined;
        try {
          const q = await fetch(`/api/quote/${ticker}`);
          if (q.ok) {
            const j = await q.json();
            if (j.quote?.price) price = j.quote.price;
          }
        } catch {}
        const r = await fetch(
          `/api/company/${cik}/scores${price ? `?price=${price}` : ""}`
        );
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        setData(await r.json());
      } catch {
        setError(true);
      }
    })();
  }, [cik, ticker]);

  if (!cik) return null;
  if (error) return <div className="note">Scores unavailable for this CIK.</div>;
  if (!data) return <div className="loading">Running F-Score &amp; Z-Score…</div>;
  if (data.fScore == null && data.zScore == null)
    return <div className="note">Not enough XBRL history to score.</div>;

  const fColor = data.fLabel === "Strong" ? "#34d399" : data.fLabel === "Weak" ? "#f87171" : "#fbbf24";
  const zColor = data.zLabel === "Safe zone" ? "#34d399" : data.zLabel === "Distress zone" ? "#f87171" : "#fbbf24";

  return (
    <div>
      <div className="stats" style={{ marginTop: 0 }}>
        <div className="stat">
          <b style={{ color: fColor }}>{data.fScore ?? "—"}/9</b>
          <span>Piotroski F-Score ({data.year}) · {data.fLabel ?? ""}</span>
        </div>
        <div className="stat">
          <b style={{ color: zColor }}>{data.zScore ?? "—"}</b>
          <span>Altman Z-Score · {data.zLabel ?? ""}</span>
        </div>
      </div>
      <div style={{ display: "grid", gap: 4, fontSize: 13 }}>
        {LABELS.map(([k, label]) => {
          const v = data.fDetail[k];
          return (
            <div key={k} style={{ display: "flex", gap: 8, alignItems: "baseline" }}>
              <span style={{ width: 18, color: v == null ? "var(--muted)" : v ? "#34d399" : "#f87171" }}>
                {v == null ? "•" : v ? "✓" : "✗"}
              </span>
              <span className={v === false ? "" : "muted"}>{label}</span>
            </div>
          );
        })}
      </div>
      <div className="note" style={{ marginTop: 6 }}>
        F ≥ 7 strong, ≤ 3 weak. Z &gt; 2.99 safe, &lt; 1.81 distress (manufacturing model — read banks differently).
      </div>
    </div>
  );
}
