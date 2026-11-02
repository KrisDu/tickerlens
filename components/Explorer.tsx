"use client";

import { useEffect, useMemo, useState } from "react";
import type { CompanyEntry } from "@/lib/sec";
import WatchlistButton from "@/components/WatchlistButton";

const PAGE_SIZE = 50;

export default function Explorer() {
  const [all, setAll] = useState<CompanyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [compare, setCompare] = useState<CompanyEntry[]>([]);
  const [sortMode, setSortMode] = useState<"ticker" | "name">("ticker");

  useEffect(() => {
    fetch("/api/tickers")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        setAll(j.companies ?? []);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let list = all;
    if (needle) {
      list = all.filter(
        (c) =>
          c.ticker.toLowerCase().includes(needle) ||
          c.name.toLowerCase().includes(needle) ||
          c.cik.includes(needle)
      );
    }
    list = [...list].sort((a, b) =>
      sortMode === "ticker"
        ? a.ticker.localeCompare(b.ticker)
        : a.name.localeCompare(b.name)
    );
    return list;
  }, [all, q, sortMode]);

  useEffect(() => setPage(0), [q, sortMode]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const slice = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const toggleCompare = (c: CompanyEntry) => {
    setCompare((prev) =>
      prev.some((x) => x.ticker === c.ticker)
        ? prev.filter((x) => x.ticker !== c.ticker)
        : prev.length >= 4
          ? prev
          : [...prev, c]
    );
  };

  return (
    <div>
      <section className="hero">
        <h1>
          Every public company. <span>Every headcount. Past &amp; present.</span>
        </h1>
        <p>
          Search {all.length ? all.length.toLocaleString() : "all"} SEC-registered companies.
          Open any ticker for live headcount history from 10-K / 20-F XBRL filings plus a
          past-vs-present key-people timeline. Pick up to 4 to compare.
        </p>
      </section>

      <section className="stats">
        <div className="stat"><b>{all.length ? all.length.toLocaleString() : "—"}</b><span>public companies indexed</span></div>
        <div className="stat"><b>SEC EDGAR</b><span>live XBRL headcount source</span></div>
        <div className="stat"><b>2009 → now</b><span>typical filing coverage</span></div>
        <div className="stat"><b>{compare.length}/4</b><span>in compare tray</span></div>
      </section>

      <div className="controls">
        <input
          className="input"
          placeholder="Search ticker, company, or CIK — e.g. AAPL, Tesla, 320193…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select className="select" value={sortMode} onChange={(e) => setSortMode(e.target.value as typeof sortMode)}>
          <option value="ticker">Sort: ticker</option>
          <option value="name">Sort: name</option>
        </select>
        {q && (
          <button className="btn btn-ghost" onClick={() => setQ("")}>Clear</button>
        )}
      </div>

      {loading && <div className="loading">Loading SEC company list…</div>}
      {error && <div className="error">Could not load tickers: {error} — is the dev server online?</div>}

      {!loading && !error && (
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Company</th>
                <th>CIK</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((c) => (
                <tr key={c.ticker + c.cik}>
                  <td><span className="ticker">{c.ticker}</span></td>
                  <td>{c.name}</td>
                  <td className="muted">{c.cik}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <a href={`/company/${c.ticker}?cik=${c.cik}&name=${encodeURIComponent(c.name)}`}>
                      <button className="btn" style={{ padding: "6px 10px" }}>Open →</button>
                    </a>{" "}
                    <button
                      className="btn btn-ghost"
                      style={{ padding: "6px 10px" }}
                      onClick={() => toggleCompare(c)}
                    >
                      {compare.some((x) => x.ticker === c.ticker) ? "✓ Added" : "+ Compare"}
                    </button>{" "}
                    <WatchlistButton item={{ ticker: c.ticker, cik: c.cik, name: c.name }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pager">
            <span>{filtered.length.toLocaleString()} matches · page {page + 1} / {pages}</span>
            <span style={{ display: "flex", gap: 8 }}>
              <button className="btn btn-ghost" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Prev</button>
              <button className="btn btn-ghost" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </span>
          </div>
        </div>
      )}

      {compare.length > 0 && (
        <div className="compare-bar">
          <b>Compare ({compare.length}):</b>
          {compare.map((c) => (
            <span className="chip" key={c.ticker}>
              {c.ticker}
              <button onClick={() => toggleCompare(c)} aria-label={`remove ${c.ticker}`}>✕</button>
            </span>
          ))}
          <a href={`/compare?tickers=${compare.map((c) => c.ticker).join(",")}&ciks=${compare.map((c) => c.cik).join(",")}`} style={{ marginLeft: "auto" }}>
            <button className="btn">Open comparison →</button>
          </a>
          <button className="btn btn-ghost" onClick={() => setCompare([])}>Clear</button>
        </div>
      )}
    </div>
  );
}
