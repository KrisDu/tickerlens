"use client";

import { useEffect, useState } from "react";

interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
}

export default function NewsTape() {
  const [items, setItems] = useState<NewsItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/market-news")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        if (alive) setItems((j.items ?? []).filter((n: NewsItem) => n.title && n.link));
      })
      .catch(() => {
        if (alive) setItems([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  if (!items || !items.length) return null;
  const row = [...items, ...items];
  return (
    <div className="newstape" aria-hidden={false} title="Market headlines">
      <span className="newstape-label">NEWS</span>
      <div className="tape tape-scroll">
        <div className="tape-track tape-track-slow">
          {row.map((n, i) => (
            <a
              key={i}
              className="tape-item news-item"
              href={n.link}
              target="_blank"
              rel="noreferrer"
            >
              <span>{n.title}</span>
              {n.publisher && <span className="muted">· {n.publisher}</span>}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
