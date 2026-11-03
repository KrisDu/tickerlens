"use client";

import { useEffect, useState } from "react";

interface Diff {
  newYear: number;
  oldYear: number;
  newForm: string;
  oldForm: string;
  diff: {
    newCount: number;
    oldCount: number;
    added: string[];
    removed: string[];
    addedCount: number;
    removedCount: number;
  } | null;
}

export default function DiffCard({ cik }: { cik: string }) {
  const [d, setD] = useState<Diff | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!cik) return;
    setD(null);
    setError(false);
    fetch(`/api/company/${cik}/riskdiff`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => (j.diff ? setD(j as Diff) : setError(true)))
      .catch(() => setError(true));
  }, [cik]);

  if (!cik) return null;
  if (error) return <div className="note">Could not diff the last two annual filings.</div>;
  if (!d || !d.diff) return <div className="loading">Diffing Risk Factors…</div>;

  return (
    <div style={{ fontSize: 13 }}>
      <div className="muted" style={{ marginBottom: 8 }}>
        {d.newForm} FY{d.newYear} vs {d.oldForm} FY{d.oldYear} · {d.diff.newCount} vs {d.diff.oldCount} risk sentences ·{" "}
        <b style={{ color: "#34d399" }}>+{d.diff.addedCount} new</b> ·{" "}
        <b style={{ color: "#f87171" }}>−{d.diff.removedCount} removed</b>
      </div>
      {d.diff.added.map((s, i) => (
        <div key={`a${i}`} style={{ marginBottom: 6, paddingLeft: 10, borderLeft: "2px solid #34d399" }}>
          <span style={{ color: "#34d399", fontWeight: 700 }}>NEW </span>
          <span className="muted">{s.length > 320 ? s.slice(0, 320) + "…" : s}</span>
        </div>
      ))}
      {d.diff.removed.map((s, i) => (
        <div key={`r${i}`} style={{ marginBottom: 6, paddingLeft: 10, borderLeft: "2px solid #f87171" }}>
          <span style={{ color: "#f87171", fontWeight: 700 }}>GONE </span>
          <span className="muted">{s.length > 320 ? s.slice(0, 320) + "…" : s}</span>
        </div>
      ))}
      <div className="note">Exact-sentence match on Item 1A Risk Factors. New risks = what management started worrying about.</div>
    </div>
  );
}
