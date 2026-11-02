"use client";

import { useEffect, useState } from "react";
import WatchlistButton, { loadWatchlist, type WatchItem } from "@/components/WatchlistButton";

interface FilingState {
  ticker: string;
  latestForm: string;
  latestDate: string;
  isNew: boolean;
  dismissed: boolean;
}

const SEEN_KEY = "el-watchlist-seen";

function loadSeen(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export default function WatchlistPage() {
  const [list, setList] = useState<WatchItem[]>([]);
  const [states, setStates] = useState<Record<string, FilingState>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setList(loadWatchlist());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const seen = loadSeen();
    list.forEach(async (w) => {
      try {
        const r = await fetch(`/api/company/${w.cik}/info`);
        if (!r.ok) return;
        const j = await r.json();
        const d = (j.filings?.filingDates ?? [])[0] as string | undefined;
        const f = (j.filings?.forms ?? [])[0] as string | undefined;
        if (!d) return;
        const ageDays = (Date.now() - new Date(d).getTime()) / 86400000;
        setStates((s) => ({
          ...s,
          [w.ticker]: {
            ticker: w.ticker,
            latestForm: f ?? "?",
            latestDate: d,
            isNew: ageDays <= 60 && seen[w.ticker] !== d,
            dismissed: seen[w.ticker] === d,
          },
        }));
      } catch {}
    });
  }, [list, ready]);

  const dismiss = (ticker: string) => {
    const st = states[ticker];
    if (!st) return;
    try {
      localStorage.setItem(SEEN_KEY, JSON.stringify({ ...loadSeen(), [ticker]: st.latestDate }));
    } catch {}
    setStates((s) => ({ ...s, [ticker]: { ...st, isNew: false, dismissed: true } }));
  };

  const remove = (ticker: string) => {
    const next = list.filter((w) => w.ticker !== ticker);
    setList(next);
    try {
      localStorage.setItem("el-watchlist", JSON.stringify(next));
    } catch {}
  };

  if (!ready) return <div className="loading">Loading watchlist…</div>;
  return (
    <div>
      <p className="muted" style={{ fontSize: 13 }}><a href="/">← Explorer</a></p>
      <h1 style={{ margin: "4px 0 6px" }}>Watchlist</h1>
      <p className="muted">
        Saved in your browser. We check each watched company&apos;s latest SEC filing —
        anything filed in the last 60 days that you haven&apos;t dismissed shows as NEW.
      </p>
      {!list.length && (
        <div className="card">
          Nothing watched yet. <a href="/">Browse companies</a> and hit ☆ Watch.
        </div>
      )}
      <div style={{ display: "grid", gap: 10 }}>
        {list.map((w) => {
          const st = states[w.ticker];
          return (
            <div className="card" key={w.ticker} style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
              <span className="ticker">{w.ticker}</span>
              <div style={{ flex: 1, minWidth: 200 }}>
                <b>{w.name}</b>
                <div className="muted" style={{ fontSize: 12 }}>
                  {st ? (
                    <>Latest filing: {st.latestForm} · {st.latestDate}</>
                  ) : (
                    <>Checking filings…</>
                  )}
                </div>
              </div>
              {st?.isNew && (
                <>
                  <span className="pill present">NEW FILING</span>
                  <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => dismiss(w.ticker)}>Dismiss</button>
                </>
              )}
              <a href={`/company/${w.ticker}?cik=${w.cik}&name=${encodeURIComponent(w.name)}`}>
                <button className="btn" style={{ padding: "6px 10px" }}>Open →</button>
              </a>
              <WatchlistButton item={w} />
              <button className="btn btn-ghost" style={{ padding: "6px 10px" }} onClick={() => remove(w.ticker)}>Remove</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
