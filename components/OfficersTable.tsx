"use client";

import { useEffect, useState } from "react";
import type { OfficerRecord } from "@/lib/sec";

export default function OfficersTable({ cik }: { cik: string }) {
  const [records, setRecords] = useState<OfficerRecord[] | null>(null);
  const [changes, setChanges] = useState<Array<{ year: number; role: string; from: string | null; to: string | null }>>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!cik) return;
    setRecords(null);
    setError(false);
    fetch(`/api/company/${cik}/officers`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        setRecords(j.records ?? []);
        setChanges(j.changes ?? []);
      })
      .catch(() => setError(true));
  }, [cik]);

  if (!cik) return null;
  if (error) return <div className="note">Could not parse officer signatures for this CIK.</div>;
  if (records === null) return <div className="loading">Reading 10-K signature blocks…</div>;
  if (!records.length)
    return <div className="note">No CEO/CFO signatures parsed from recent filings.</div>;

  const changed = new Set(changes.map((c) => `${c.year}:${c.role}`));
  return (
    <div>
      {changes.length > 0 && (
        <div className="note" style={{ marginBottom: 8 }}>
          Succession detected:{" "}
          {changes.map((c, i) => (
            <span key={i}>
              {i > 0 ? " · " : ""}
              {c.year} {c.role}: {c.from ?? "?"} → <b>{c.to ?? "?"}</b>
            </span>
          ))}
        </div>
      )}
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th>FY</th>
              <th>CEO (per signatures)</th>
              <th>CFO (per signatures)</th>
            </tr>
          </thead>
          <tbody>
            {[...records].reverse().map((r) => (
              <tr key={r.year}>
                <td><b>{r.year}</b></td>
                <td style={changed.has(`${r.year}:CEO`) ? { color: "#fbbf24", fontWeight: 700 } : undefined}>
                  {r.ceo ?? <span className="muted">—</span>}
                </td>
                <td style={changed.has(`${r.year}:CFO`) ? { color: "#fbbf24", fontWeight: 700 } : undefined}>
                  {r.cfo ?? <span className="muted">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="note" style={{ marginTop: 6 }}>
        Parsed from each 10-K/20-F SIGNATURES block (“Principal Executive/Financial Officer”). Changed names highlighted.
      </div>
    </div>
  );
}
