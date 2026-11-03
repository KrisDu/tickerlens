"use client";

import { useEffect, useState } from "react";

const SYMBOLS = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL", "META", "TSLA", "AVGO"];

interface Q {
  ticker: string;
  price: number;
  changePct: number;
}

export default function TickerTape() {
  const [quotes, setQuotes] = useState<Q[]>([]);

  useEffect(() => {
    let alive = true;
    Promise.all(
      SYMBOLS.map(async (t) => {
        try {
          const r = await fetch(`/api/quote/${t}`);
          if (!r.ok) return null;
          const j = await r.json();
          if (j.quote) return { ticker: t, price: j.quote.price, changePct: j.quote.changePct } as Q;
          return null;
        } catch {
          return null;
        }
      })
    ).then((all) => {
      if (alive) setQuotes(all.filter((q): q is Q => q !== null));
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!quotes.length) return null;
  const row = [...quotes, ...quotes];
  return (
    <div className="tape" aria-hidden>
      <div className="tape-track">
        {row.map((q, i) => (
          <span className="tape-item" key={`${q.ticker}-${i}`}>
            <b>{q.ticker}</b>
            <span>${q.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className={q.changePct >= 0 ? "up" : "down"}>
              {q.changePct >= 0 ? "▲" : "▼"} {Math.abs(q.changePct).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
