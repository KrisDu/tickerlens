"use client";

import { useEffect, useState } from "react";

interface Item {
  item: string;
  title: string;
  snippet: string;
}

interface Filing {
  accession: string;
  filingDate: string;
  form: string;
  items: Item[];
  docUrl: string;
}

export default function EightKFeed({ cik }: { cik: string }) {
  const [filings, setFilings] = useState<Filing[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!cik) return;
    setFilings(null);
    setError(false);
    fetch(`/api/company/${cik}/eightks`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => setFilings(j.filings ?? []))
      .catch(() => setError(true));
  }, [cik]);

  if (!cik) return null;
  if (error) return <div className="note">8-K feed unavailable.</div>;
  if (filings === null) return <div className="loading">Scanning recent 8-Ks…</div>;
  if (!filings.length) return <div className="note">No recent 8-Ks found.</div>;

  return (
    <div style={{ display: "grid", gap: 10 }}>
      {filings.map((f) => (
        <div key={f.accession} style={{ fontSize: 13 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
            <b>{f.filingDate}</b>
            <a href={f.docUrl} target="_blank" rel="noreferrer" className="muted" style={{ fontSize: 12 }}>
              full 8-K ↗
            </a>
          </div>
          {f.items.length === 0 && <div className="note">No coded items detected.</div>}
          {f.items.map((it) => (
            <div key={it.item} style={{ marginTop: 4, paddingLeft: 10, borderLeft: "2px solid var(--line)" }}>
              <b>Item {it.item}</b> — <span>{it.title}</span>
            </div>
          ))}
        </div>
      ))}
      <div className="note">Item codes translated to plain English. 5.02 = exec changes, 2.02 = earnings, 1.01 = big contracts.</div>
    </div>
  );
}
