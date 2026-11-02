"use client";

import { useMemo, useState } from "react";
import type { Person } from "@/lib/sec";

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function yearNum(s: string): number {
  const m = s.match(/\d{4}/);
  return m ? parseInt(m[0], 10) : 2000;
}

export default function PeopleTimeline({
  ticker,
  serverPeople,
}: {
  ticker: string;
  serverPeople: Person[];
}) {
  const [filter, setFilter] = useState<"all" | "present" | "past">("all");
  const [query, setQuery] = useState("");

  const all = serverPeople;
  const maxY = new Date().getFullYear();
  const minY = useMemo(
    () =>
      all.length
        ? Math.min(...all.map((p) => yearNum(p.start)), maxY - 20)
        : maxY - 20,
    [all, maxY]
  );
  const span = Math.max(1, maxY - minY);

  const visible = all.filter(
    (p) =>
      (filter === "all" || p.status === filter) &&
      (p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.role.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div>
      <div className="controls">
        <input
          className="input"
          placeholder="Search people or roles…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select className="select" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}>
          <option value="all">All ({all.length})</option>
          <option value="present">Present ({all.filter((p) => p.status === "present").length})</option>
          <option value="past">Past ({all.filter((p) => p.status === "past").length})</option>
        </select>
      </div>
      <div className="timeline">
        {visible.map((p) => {
          const s = yearNum(p.start);
          const e = p.end ? yearNum(p.end) : maxY;
          const left = ((s - minY) / span) * 100;
          const width = Math.max(4, ((e - s + 1) / span) * 100);
          return (
            <div className="person" key={p.id}>
              <div className="avatar">{initials(p.name)}</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <b>{p.name}</b>
                  <span className={`pill ${p.status}`}>{p.status}</span>
                </div>
                <small>
                  {p.role} · {p.start} → {p.end ?? "now"}
                </small>
                <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{p.bio}</div>
                <div className="bar">
                  <i style={{ left: `${left}%`, width: `${width}%` }} />
                </div>
              </div>
            </div>
          );
        })}
        {visible.length === 0 && (
          <div className="loading">No people match. Try another search or filter.</div>
        )}
      </div>
      <div className="note" style={{ marginTop: 10 }}>
        Curated key people for {ticker}. Coverage varies by company.
      </div>
    </div>
  );
}
