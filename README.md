# TickerLens — every public company, every headcount, past & present

Interactive Next.js app: search **every US public company** and open any ticker for
**25 years of employee headcount** (live SEC EDGAR filings), **CEO/CFO tenure parsed
from filing signatures**, **live quotes**, **headcount × stock overlays**, **news**,
**leaderboards**, and a **filing-alert watchlist**.

## Run

```powershell
cd tickerlens
& "C:\Program Files\nodejs\npm.cmd" install
& "C:\Program Files\nodejs\npm.cmd" run dev
# open http://localhost:3000
```

Or with Docker (no Node needed):

```powershell
docker build -t tickerlens .
docker run -d --name tickerlens -p 3200:3000 tickerlens
# open http://localhost:3200
```

## What it does

- **Explorer (`/`)** — live list of all SEC-registered companies from
  `company_tickers.json`, with header search (ticker / name / CIK) on every page,
  sort, pagination, a 4-slot compare tray, and ☆ watch buttons.
- **Company (`/company/[ticker]`)** — live price badge (auto-refreshes), headcount
  chart + table with per-year provenance and YoY %, company facts, latest-news
  feed (Google News RSS, ~15 min refresh), headcount × stock overlay, CEO/CFO
  tenure from SEC signatures, key-people timeline, CSV/PNG export.
- **People** — curated founders/CEOs/execs for ~30 mega-caps (`data/leaders.ts`)
  with `present` / `past` pills, tenure bars, search + filter.
- **Leaderboards (`/leaderboard`)** — fastest growers (5y CAGR), biggest
  shrinkers (worst YoY, possible layoffs), largest employers, computed live
  across the covered universe.
- **Watchlist (`/watchlist`)** — star any company; the app checks each watched
  CIK's latest SEC filing and flags NEW filings from the last 60 days.
  Stored in your browser.
- **Growth analytics** — 5y/10y CAGR, avg hires/year, per-year YoY with
  layoff flags (drops worse than -3%), in the API and UI table.
- **Officer tenure from SEC data** — CEO/CFO per year parsed from 10-K/20-F
  SIGNATURES blocks, with succession changes highlighted. No curation.
- **Compare (`/compare`)** — side-by-side headcount table + per-company charts.

## Headcount data: how it works

Most mega-cap filers never tag headcount in XBRL (`dei:EntityNumberOfEmployees`
returns 404 for Apple, Microsoft, Walmart, Ford, GE, … — verified), so the
headcount API (`GET /api/company/[cik]/headcount`) merges two live SEC sources:

1. **XBRL facts** — `companyconcept/.../dei/EntityNumberOfEmployees.json`,
   with `companyfacts` fallback. Wins on year conflicts.
2. **10-K / 20-F / 40-F text parsing** — fetches up to 25 recent annual filings
   (following `submissions` archive files when `recent` caps out), strips HTML,
   and extracts the Human Capital disclosure (“had approximately 164,000
   full-time equivalent employees”, “total employee population was 83,825”, …).
   Each point keeps the exact source snippet shown in the UI table. Candidates
   are ranked (headline phrasing beats carve-outs like “25,000 employees
   transferred in the acquisition”); year-like numbers are rejected.

SEC politeness: declared `User-Agent` with contact, sequential fetching with
delays, retries on 403/429, success-only in-memory cache (7-day TTL), long
`revalidate` on immutable archive docs. First load per company can take
~30–90s cold (up to ~4 min for a 25-year history); warm after.

## Stock quotes: keyless vs API key

Quotes work out of the box with no key via Yahoo Finance (delayed ~15 min).
For real-time quotes, set one of these env vars — the API tries Finnhub,
then Twelve Data, then falls back to Yahoo, and the badge shows the source:

```powershell
# local dev
$env:FINNHUB_API_KEY="your_key"; $env:TWELVEDATA_API_KEY="your_key"
& "C:\Program Files\nodejs\npm.cmd" run dev

# docker
docker run -d --name tickerlens -p 3200:3000 -e FINNHUB_API_KEY=your_key tickerlens
```

Free options worth knowing (verify current terms — they change):

| Provider | Key | Free tier | Freshness (free) | Notes |
|---|---|---|---|---|
| Finnhub | free, no card | 60 calls/min | real-time US | best free live option; personal-use license |
| Twelve Data | free, no card | 800 req/day | real-time US | also forex/crypto; WS streaming is paid |
| Alpaca | free account | 200 calls/min | real-time IEX feed | full consolidated SIP feed is $99/mo |
| Yahoo (built-in fallback) | none | unofficial | ~15 min delayed | can break without notice; fine for casual use |

## Is it live? If Apple files a 10-K today, do I see it?

Yes, with bounded delay. SEC listing data revalidates hourly
(`submissions`, XBRL concept/facts), the company ticker index daily, filing
documents are immutable (cached 7 days), and news every 15 minutes. So a 10-K
filed today appears in the app within about an hour — or immediately after a
server/container restart, which clears the caches. Parsed 10-K points show the
exact source snippet so you can verify them against the filing.

## API routes (all live, no key required)

- `GET /api/tickers?q=...` — SEC company index, optional server-side search.
- `GET /api/company/[cik]/headcount` — merged XBRL + parsed-filings series,
  CAGR, YoY, layoff flags, per-point snippets.
- `GET /api/company/[cik]/info` — submissions facts (name, tickers, SIC, filings).
- `GET /api/company/[cik]/officers` — CEO/CFO per year from SIGNATURES blocks.
- `GET /api/quote/[ticker]` — live quote via Finnhub → Twelve Data → Yahoo chain.
- `GET /api/stock/[ticker]` — monthly closes (Yahoo) + year-end series.
- `GET /api/people/[ticker]` — curated key people.
- `GET /api/news/[ticker]?name=...` — latest headlines (Google News RSS).
- `GET /api/leaderboard[?tickers=...]` — growers / shrinkers / biggest.

SEC requires a `User-Agent` header — set server-side in `lib/sec.ts`.
All state beyond SEC data stays in the browser; no DB, no telemetry.

## License

MIT — see [LICENSE](LICENSE).
