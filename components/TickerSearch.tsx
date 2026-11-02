"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { CompanyEntry } from "@/lib/sec";

export default function TickerSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<CompanyEntry[]>([]);
  const [hi, setHi] = useState(0);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (q.trim().length < 1) {
      setHits([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/tickers?q=${encodeURIComponent(q.trim())}&limit=8`);
        if (!r.ok) throw new Error();
        const j = await r.json();
        setHits(j.companies ?? []);
        setHi(0);
        setOpen(true);
      } catch {
        setHits([]);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const go = (c: CompanyEntry) => {
    setOpen(false);
    setQ("");
    router.push(`/company/${c.ticker}?cik=${c.cik}&name=${encodeURIComponent(c.name)}`);
  };

  return (
    <div ref={boxRef} className="gsearch">
      <input
        className="input gsearch-input"
        placeholder="Search any ticker or company…  (e.g. NVDA)"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => hits.length && setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && hits.length) {
            e.preventDefault();
            setHi((h) => (h + 1) % hits.length);
          } else if (e.key === "ArrowUp" && hits.length) {
            e.preventDefault();
            setHi((h) => (h - 1 + hits.length) % hits.length);
          } else if (e.key === "Enter" && hits.length) {
            go(hits[Math.min(hi, hits.length - 1)]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && hits.length > 0 && (
        <div className="gsearch-drop">
          {hits.map((c, i) => (
            <button
              key={c.ticker + c.cik}
              className={`gsearch-item${i === hi ? " active" : ""}`}
              onMouseEnter={() => setHi(i)}
              onClick={() => go(c)}
            >
              <span className="ticker">{c.ticker}</span>
              <span className="gsearch-name">{c.name}</span>
            </button>
          ))}
        </div>
      )}
      {open && !loading && q.trim().length >= 1 && hits.length === 0 && (
        <div className="gsearch-drop">
          <div className="gsearch-item muted">No matches for “{q.trim()}”</div>
        </div>
      )}
    </div>
  );
}
