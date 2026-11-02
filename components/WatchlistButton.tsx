"use client";

import { useEffect, useState } from "react";

export interface WatchItem {
  ticker: string;
  cik: string;
  name: string;
}

const KEY = "el-watchlist";

export function loadWatchlist(): WatchItem[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export default function WatchlistButton({ item }: { item: WatchItem }) {
  const [watched, setWatched] = useState(false);
  useEffect(() => {
    setWatched(loadWatchlist().some((w) => w.ticker === item.ticker));
  }, [item.ticker]);
  const toggle = () => {
    const cur = loadWatchlist();
    const next = cur.some((w) => w.ticker === item.ticker)
      ? cur.filter((w) => w.ticker !== item.ticker)
      : [...cur, item];
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    setWatched(next.some((w) => w.ticker === item.ticker));
  };
  return (
    <button
      className={watched ? "btn" : "btn btn-ghost"}
      style={{ padding: "6px 10px" }}
      onClick={toggle}
      title={watched ? "Remove from watchlist" : "Watch for new filings"}
    >
      {watched ? "★ Watching" : "☆ Watch"}
    </button>
  );
}
