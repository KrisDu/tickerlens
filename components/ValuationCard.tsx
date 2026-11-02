"use client";

import { useEffect, useState } from "react";
import type { FinancialYear } from "@/lib/financials";
import type { Quote } from "@/lib/stock";

function Check({ ok, label, value }: { ok: boolean | null; label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 13 }}>
      <span style={{ width: 18, color: ok == null ? "var(--muted)" : ok ? "#34d399" : "#f87171" }}>
        {ok == null ? "•" : ok ? "✓" : "✗"}
      </span>
      <span className="muted">{label}</span>
      <b style={{ marginLeft: "auto" }}>{value}</b>
    </div>
  );
}

export default function ValuationCard({ cik, ticker }: { cik: string; ticker: string }) {
  const [years, setYears] = useState<FinancialYear[] | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!cik) return;
    setYears(null);
    setQuote(null);
    setError(false);
    Promise.all([
      fetch(`/api/company/${cik}/financials?ticker=${encodeURIComponent(ticker)}`).then((r) => (r.ok ? r.json() : null)),
      fetch(`/api/quote/${ticker}`).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([f, q]) => {
        if (!f?.years?.length || !q?.quote) throw new Error("missing data");
        setYears(f.years);
        setQuote(q.quote);
      })
      .catch(() => setError(true));
  }, [cik, ticker]);

  if (!cik) return null;
  if (error) return <div className="note">Valuation needs XBRL financials + a live quote — one is missing.</div>;
  if (!years || !quote) return <div className="loading">Computing margin of safety…</div>;

  const latest = years[years.length - 1];
  const price = quote.price;
  const eps = latest.eps;
  const bvps = latest.bvps;
  const pe = eps != null && eps > 0 ? price / eps : null;
  const pb = bvps != null && bvps > 0 ? price / bvps : null;
  const graham = eps != null && eps > 0 && bvps != null && bvps > 0 ? Math.sqrt(22.5 * eps * bvps) : null;
  const ncavps =
    latest.assetsCurrent != null && latest.liabilities != null && latest.sharesDiluted
      ? (latest.assetsCurrent - latest.liabilities) / latest.sharesDiluted
      : null;
  const ncavRule = ncavps != null && ncavps > 0 ? price < (2 / 3) * ncavps : null;
  const cr = latest.currentRatio;

  return (
    <div>
      <div className="stats" style={{ marginTop: 0 }}>
        <div className="stat"><b>{pe != null ? pe.toFixed(1) : "—"}</b><span>P/E (FY{latest.year} EPS)</span></div>
        <div className="stat"><b>{pb != null ? pb.toFixed(2) : "—"}</b><span>P/B</span></div>
        <div className="stat"><b>{graham != null ? `$${graham.toFixed(2)}` : "—"}</b><span>Graham Number</span></div>
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        <Check ok={pe != null ? pe < 15 : null} label="P/E under 15 (Graham)" value={pe != null ? pe.toFixed(1) : "n/a"} />
        <Check ok={pb != null ? pb < 1.5 : null} label="P/B under 1.5 (Graham)" value={pb != null ? pb.toFixed(2) : "n/a"} />
        <Check ok={pe != null && pb != null ? pe * pb < 22.5 : null} label="P/E × P/B under 22.5" value={pe != null && pb != null ? (pe * pb).toFixed(1) : "n/a"} />
        <Check ok={cr != null ? cr > 2 : null} label="Current ratio over 2.0" value={cr != null ? cr.toFixed(2) : "n/a"} />
        <Check ok={ncavRule} label="Price under ⅔ NCAV (net-net)" value={ncavps != null ? `$${ncavps.toFixed(2)}/sh` : "n/a"} />
        <Check
          ok={graham != null ? price < graham : null}
          label="Price below Graham Number"
          value={graham != null ? `${((price / graham - 1) * 100).toFixed(0)}% ${price < graham ? "below" : "above"}` : "n/a"}
        />
      </div>
      <div className="note" style={{ marginTop: 8 }}>
        Graham Number = √(22.5 × EPS × BV/share). NCAV = (current assets − total liabilities) ÷ shares.
        Educational screen, not investment advice.
      </div>
    </div>
  );
}
