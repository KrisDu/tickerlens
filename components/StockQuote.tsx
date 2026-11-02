"use client";

import { useEffect, useState } from "react";
import type { Quote } from "@/lib/stock";

export default function StockQuote({ ticker }: { ticker: string }) {
  const [q, setQ] = useState<Quote | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(`/api/quote/${ticker}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json();
        if (alive && j.quote) {
          setQ(j.quote);
          setProvider(j.provider ?? null);
          setFailed(false);
        } else if (alive) {
          setFailed(true);
        }
      } catch {
        if (alive) setFailed(true);
      }
    };
    load();
    const t = setInterval(load, 60000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [ticker]);

  if (failed) return null;
  if (!q) return <span className="muted" style={{ fontSize: 13 }}>Loading quote…</span>;
  const up = q.change >= 0;
  const time = q.marketTime
    ? new Date(q.marketTime).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "";
  return (
    <span
      style={{
        display: "inline-flex",
        gap: 10,
        alignItems: "baseline",
        flexWrap: "wrap",
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: "8px 14px",
      }}
    >
      <b style={{ fontSize: 24 }}>${q.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</b>
      <b style={{ color: up ? "#34d399" : "#f87171" }}>
        {up ? "▲" : "▼"} {up ? "+" : ""}{q.change.toFixed(2)} ({up ? "+" : ""}{q.changePct.toFixed(2)}%)
      </b>
      <span className="muted" style={{ fontSize: 12 }}>
        {q.exchange ? `${q.exchange} · ` : ""}{time ? `${time} · ` : ""}
        {provider === "finnhub" ? "live · Finnhub" : provider === "twelvedata" ? "live · Twelve Data" : "delayed · Yahoo"} · auto-refreshes
      </span>
    </span>
  );
}
