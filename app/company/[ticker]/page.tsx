"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import HeadcountChart from "@/components/HeadcountChart";
import PeopleTimeline from "@/components/PeopleTimeline";
import NewsFeed from "@/components/NewsFeed";
import StockOverlay from "@/components/StockOverlay";
import ExportButtons from "@/components/ExportButtons";
import OfficersTable from "@/components/OfficersTable";
import WatchlistButton from "@/components/WatchlistButton";
import StockQuote from "@/components/StockQuote";
import FinancialsCard from "@/components/FinancialsCard";
import ValuationCard from "@/components/ValuationCard";
import SentimentCard from "@/components/SentimentCard";
import type { HeadcountPoint, Person } from "@/lib/sec";

interface Info {
  name: string;
  tickers: string[];
  exchanges: string[];
  sic?: string;
  sicDescription?: string;
  fiscalYearEnd?: string;
}

export default function CompanyPage({ params }: { params: { ticker: string } }) {
  const ticker = params.ticker.toUpperCase();
  const sp = useSearchParams();
  const cik = sp.get("cik") ?? "";
  const fallbackName = sp.get("name") ?? ticker;

  const [headcount, setHeadcount] = useState<HeadcountPoint[] | null>(null);
  const [meta, setMeta] = useState<{
    growthPct: number | null;
    yoyPct: number | null;
    latest: HeadcountPoint | null;
    cagr5y: number | null;
    cagr10y: number | null;
    avgAnnualChange: number | null;
    declines: Array<{ year: number; yoyPct: number | null }>;
  } | null>(null);
  const [info, setInfo] = useState<Info | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [activeCik, setActiveCik] = useState(cik);

  // If CIK missing (direct URL), resolve via tickers API
  useEffect(() => {
    if (activeCik) return;
    fetch("/api/tickers")
      .then((r) => r.json())
      .then((j) => {
        const hit = (j.companies ?? []).find((c: { ticker: string; cik: string }) => c.ticker === ticker);
        if (hit) setActiveCik(hit.cik);
        else setErr(`Ticker ${ticker} not found in SEC list.`);
      })
      .catch((e) => setErr(String(e)));
  }, [activeCik, ticker]);

  useEffect(() => {
    if (!activeCik) return;
    setHeadcount(null);
    setErr(null);
    fetch(`/api/company/${activeCik}/headcount`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`headcount HTTP ${r.status}`);
        return r.json();
      })
      .then((j) => {
        setHeadcount(j.points ?? []);
        setMeta({
          growthPct: j.growthPct,
          yoyPct: j.yoyPct,
          latest: j.latest,
          cagr5y: j.cagr5y ?? null,
          cagr10y: j.cagr10y ?? null,
          avgAnnualChange: j.avgAnnualChange ?? null,
          declines: j.declines ?? [],
        });
      })
      .catch((e) => setErr(`Headcount: ${e}`));
    fetch(`/api/company/${activeCik}/info`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => j && setInfo(j))
      .catch(() => {});
    fetch(`/api/people/${ticker}`)
      .then((r) => (r.ok ? r.json() : { people: [] }))
      .then((j) => setPeople(j.people ?? []))
      .catch(() => {});
  }, [activeCik, ticker]);

  return (
    <div>
      <p className="muted" style={{ fontSize: 13 }}>
        <a href="/">← All companies</a> · CIK {activeCik || "resolving…"}
      </p>
      <section className="hero">
        <h1>
          <span className="ticker">{ticker}</span> {info?.name ?? fallbackName}
        </h1>
        <p>
          Past &amp; present employee headcount from live SEC EDGAR filings, key people
          (founders, CEOs, execs) with tenure bars, and the latest headlines.
          Headcount merges XBRL facts with parsed 10-K / 20-F Human Capital text.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center" }}>
          <StockQuote ticker={ticker} />
          {activeCik && (
            <WatchlistButton item={{ ticker, cik: activeCik, name: info?.name ?? fallbackName }} />
          )}
          {headcount && headcount.length > 0 && (
            <ExportButtons ticker={ticker} points={headcount} svgId="headcount-chart" />
          )}
        </div>
      </section>

      <div className="cards">
        <div className="card">
          <h2>Headcount — past to present</h2>
          {!activeCik && <div className="loading">Resolving CIK…</div>}
          {activeCik && headcount === null && !err && <div className="loading">Fetching live SEC filings (up to ~2 min cold)…</div>}
          {err && <div className="error">{err}</div>}
          {headcount !== null && <HeadcountChart points={headcount} />}
          {meta?.latest && (
            <div className="stats" style={{ marginBottom: 0 }}>
              <div className="stat"><b>{meta.latest.employees.toLocaleString()}</b><span>latest ({meta.latest.year})</span></div>
              <div className="stat"><b>{meta.yoyPct != null ? `${meta.yoyPct >= 0 ? "+" : ""}${meta.yoyPct.toFixed(1)}%` : "—"}</b><span>year-over-year</span></div>
              <div className="stat"><b>{meta.cagr5y != null ? `${meta.cagr5y >= 0 ? "+" : ""}${meta.cagr5y.toFixed(1)}%` : "—"}</b><span>5-year CAGR</span></div>
              <div className="stat"><b>{meta.avgAnnualChange != null ? `${meta.avgAnnualChange >= 0 ? "+" : ""}${meta.avgAnnualChange.toLocaleString()}` : "—"}</b><span>avg hires / year</span></div>
            </div>
          )}
          {meta && meta.declines.length > 0 && (
            <div className="note" style={{ marginTop: 8, color: "#fbbf24" }}>
              ⚠ Headcount declines (possible layoffs):{" "}
              {meta.declines.map((d, i) => (
                <span key={d.year}>{i > 0 ? " · " : ""}{d.year} ({d.yoyPct != null ? `${d.yoyPct.toFixed(1)}%` : "?"})</span>
              ))}
            </div>
          )}
          {headcount && headcount.length > 0 && (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="grid">
                <thead><tr><th>Fiscal year</th><th>Employees</th><th>YoY</th><th>Form</th><th>Filed</th><th>Source</th></tr></thead>
                <tbody>
                  {[...headcount].reverse().map((p, ri, arr) => {
                    const prev = ri + 1 < arr.length ? arr[ri + 1].employees : null;
                    const yoy = prev ? ((p.employees - prev) / prev) * 100 : null;
                    const layoff = yoy != null && yoy < -3;
                    return (
                    <tr key={p.year} title={p.snippet ?? `${p.source} fact`}>
                      <td><b>{p.year}</b></td>
                      <td>{p.employees.toLocaleString()}</td>
                      <td style={{ color: layoff ? "#f87171" : yoy != null && yoy >= 0 ? "#34d399" : undefined, fontWeight: layoff ? 700 : undefined }}>
                        {yoy != null ? `${yoy >= 0 ? "+" : ""}${yoy.toFixed(1)}%${layoff ? " ⚠" : ""}` : "—"}
                      </td>
                      <td className="muted">{p.form}</td>
                      <td className="muted">{p.filingDate}</td>
                      <td>
                        <span className="pill" style={{ fontSize: 10 }}>{p.source}</span>
                        {p.snippet && (
                          <div className="note" style={{ marginTop: 4, maxWidth: 340 }}>
                            “{p.snippet}”
                          </div>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {activeCik && (
            <div className="card">
              <h2>Financials — the Buffett &amp; Graham view</h2>
              <FinancialsCard cik={activeCik} ticker={ticker} />
            </div>
          )}
        </div>
        <div style={{ display: "grid", gap: 14, alignContent: "start" }}>
          <div className="card">
            <h3>Company facts</h3>
            {info ? (
              <dl className="kv">
                <dt>Legal name</dt><dd>{info.name}</dd>
                <dt>Tickers</dt><dd>{info.tickers.join(", ") || ticker}</dd>
                <dt>Exchange</dt><dd>{info.exchanges.join(", ") || "—"}</dd>
                <dt>Industry</dt><dd>{info.sicDescription ?? "—"}{info.sic ? ` (SIC ${info.sic})` : ""}</dd>
                <dt>Fiscal year end</dt><dd>{info.fiscalYearEnd ?? "—"}</dd>
                <dt>SEC</dt>
                <dd>
                  <a target="_blank" rel="noreferrer" href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${activeCik}&type=10-K`}>
                    10-K filings ↗
                  </a>{" · "}
                  <a target="_blank" rel="noreferrer" href={`https://data.sec.gov/submissions/CIK${activeCik}.json`}>
                    JSON ↗
                  </a>
                </dd>
              </dl>
            ) : (
              <div className="muted">Loading company facts…</div>
            )}
          </div>
          <div className="card">
            <h3>Latest news</h3>
            <NewsFeed ticker={ticker} name={info?.name ?? fallbackName} />
          </div>
          <div className="card">
            <h3>Valuation &amp; margin of safety</h3>
            {activeCik ? (
              <ValuationCard cik={activeCik} ticker={ticker} />
            ) : (
              <div className="muted">Resolving CIK…</div>
            )}
          </div>
          <div className="card">
            <h3>Headline sentiment</h3>
            <SentimentCard ticker={ticker} name={info?.name ?? fallbackName} />
          </div>
          <div className="card">
            <h3>Headcount × stock price</h3>
            {headcount && headcount.length > 0 ? (
              <StockOverlay ticker={ticker} points={headcount} />
            ) : (
              <div className="muted">Loads once headcount is available.</div>
            )}
          </div>
          <div className="card">
            <h3>CEO / CFO tenure — from SEC signatures</h3>
            {activeCik ? (
              <OfficersTable cik={activeCik} />
            ) : (
              <div className="muted">Resolving CIK…</div>
            )}
          </div>
          <div className="card">
            <h3>Key people — past &amp; present</h3>
            <PeopleTimeline ticker={ticker} serverPeople={people} />
          </div>
        </div>
      </div>
    </div>
  );
}
