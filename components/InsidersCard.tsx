"use client";

import { useEffect, useState } from "react";

interface Tx {
  date: string;
  code: string;
  side: "buy" | "sell";
  shares: number;
  price: number | null;
  ownedAfter: number | null;
}

interface Filing {
  accession: string;
  filingDate: string;
  owner: string;
  title: string;
  isOfficer: boolean;
  isDirector: boolean;
  txs: Tx[];
  netShares: number;
}

export default function InsidersCard({ cik }: { cik: string }) {
  const [filings, setFilings] = useState<Filing[] | null>(null);
  const [totals, setTotals] = useState<{ buyShares: number; sellShares: number; netShares: number } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!cik) return;
    setFilings(null);
    setError(false);
    fetch(`/api/company/${cik}/insiders`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        setFilings(j.filings ?? []);
        setTotals(j.totals ?? null);
      })
      .catch(() => setError(true));
  }, [cik]);

  if (!cik) return null;
  if (error) return <div className="note">Insider feed unavailable.</div>;
  if (filings === null) return <div className="loading">Parsing Form 4s…</div>;
  if (!filings.length) return <div className="note">No open-market insider trades in recent Form 4s.</div>;

  return (
    <div>
      {totals && (
        <div className="stats" style={{ marginTop: 0 }}>
          <div className="stat"><b style={{ color: "#34d399" }}>+{totals.buyShares.toLocaleString()}</b><span>shares bought (open market)</span></div>
          <div className="stat"><b style={{ color: "#f87171" }}>−{totals.sellShares.toLocaleString()}</b><span>shares sold</span></div>
        </div>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        {filings.slice(0, 6).map((f) => (
          <div key={f.accession} style={{ fontSize: 13 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
              <b>{f.owner}</b>
              {f.title && <span className="muted">{f.title}</span>}
              {f.isOfficer && <span className="pill">officer</span>}
              {f.isDirector && <span className="pill">director</span>}
              <span className="muted" style={{ marginLeft: "auto", fontSize: 12 }}>{f.filingDate}</span>
            </div>
            {f.txs.map((t, i) => (
              <div key={i} className="muted" style={{ fontSize: 12 }}>
                <span style={{ color: t.side === "buy" ? "#34d399" : "#f87171", fontWeight: 700 }}>
                  {t.side === "buy" ? "BOUGHT" : "SOLD"}
                </span>{" "}
                {t.shares.toLocaleString()} sh
                {t.price != null ? ` @ $${t.price.toFixed(2)}` : ""} · {t.date || t.code}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="note" style={{ marginTop: 6 }}>Open-market P (buy) / S (sell) only — grants and exercises excluded. From Form 4 XML.</div>
    </div>
  );
}
