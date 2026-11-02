"use client";

import { useEffect, useState } from "react";

interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
}

function timeAgo(iso: string): string {
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const s = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function NewsFeed({ ticker, name }: { ticker: string; name: string }) {
  const [items, setItems] = useState<NewsItem[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    setItems(null);
    setError(false);
    fetch(`/api/news/${ticker}?name=${encodeURIComponent(name)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => setItems(j.items ?? []))
      .catch(() => setError(true));
  }, [ticker, name]);

  if (error)
    return <div className="note">News feed unavailable right now — try again later.</div>;
  if (items === null) return <div className="loading">Fetching latest headlines…</div>;
  if (!items.length)
    return <div className="note">No recent headlines found for {ticker}.</div>;
  return (
    <div style={{ display: "grid", gap: 10 }}>
      {items.map((n, i) => (
        <div key={i} style={{ lineHeight: 1.35 }}>
          <a href={n.link} target="_blank" rel="noreferrer" style={{ color: "var(--text)", fontSize: 14 }}>
            {n.title}
          </a>
          <div className="note" style={{ marginTop: 2 }}>
            {n.publisher}
            {n.publishedAt ? ` · ${timeAgo(n.publishedAt)}` : ""}
          </div>
        </div>
      ))}
      <div className="note">Headlines via Google News RSS · refreshes every ~15 min.</div>
    </div>
  );
}
