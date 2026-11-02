"use client";

import { useEffect, useState } from "react";

interface Scored {
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
  score: number;
  label: "bullish" | "bearish" | "neutral";
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function SentimentCard({ ticker, name }: { ticker: string; name: string }) {
  const [data, setData] = useState<{ score: number; label: string; counts: { bullish: number; bearish: number; neutral: number } | null; items: Scored[] } | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setData(null);
    setError(false);
    fetch(`/api/sentiment/${ticker}?name=${encodeURIComponent(name)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => setData(j))
      .catch(() => setError(true));
  }, [ticker, name]);

  if (error) return <div className="note">Sentiment unavailable right now.</div>;
  if (!data) return <div className="loading">Scoring headlines…</div>;
  if (!data.items.length) return <div className="note">No headlines to score.</div>;

  const pct = Math.round(((data.score + 1) / 2) * 100);
  const color = data.label === "bullish" ? "#34d399" : data.label === "bearish" ? "#f87171" : "#9aa7d0";

  return (
    <div>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <b style={{ color, fontSize: 20, textTransform: "capitalize" }}>{data.label}</b>
        <span className="muted" style={{ fontSize: 12 }}>
          {data.counts ? `${data.counts.bullish}▲ ${data.counts.neutral}• ${data.counts.bearish}▼` : ""} · {data.items.length} headlines
        </span>
      </div>
      <div className="bar" style={{ height: 10, margin: "8px 0" }}>
        <i style={{ left: "0%", width: "100%", background: "rgba(255,255,255,.06)" }} />
        <i style={{ left: `calc(${pct}% - 2px)`, width: 4, background: color }} />
      </div>
      <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
        {data.items.slice(0, 6).map((h, i) => (
          <div key={i} style={{ fontSize: 13, lineHeight: 1.35 }}>
            <span
              className="pill"
              style={{
                fontSize: 10,
                marginRight: 6,
                color: h.label === "bullish" ? "#34d399" : h.label === "bearish" ? "#f87171" : undefined,
              }}
            >
              {h.score >= 0 ? "+" : ""}{h.score.toFixed(2)}
            </span>
            <a href={h.link} target="_blank" rel="noreferrer" style={{ color: "var(--text)" }}>
              {h.title}
            </a>
            <div className="note">
              {h.publisher}
              {h.publishedAt ? ` · ${timeAgo(h.publishedAt)}` : ""}
            </div>
          </div>
        ))}
      </div>
      <div className="note" style={{ marginTop: 6 }}>
        Lexicon-scored headlines (no ML model, no key). Hover a score: +1 max bullish.
      </div>
    </div>
  );
}
