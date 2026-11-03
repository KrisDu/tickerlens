# TickerLens — every public company, every headcount, past & present

Terminal-style stock explorer for **every US public company**: 25 years of
employee headcount parsed from live SEC EDGAR filings, Buffett/Graham
financials, F-Score/Z-Score screens, insider trades, 8-K radar, 10-K diffs,
live quotes, headline sentiment, leaderboards, and a filing-alert watchlist.

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

- **Explorer (`/`)** — all 10,423 SEC-registered companies with header search
  (ticker / name / CIK, server-filtered) on every page, sort, pagination, a
  4-slot compare tray, and ☆ watch buttons. Live ticker tape under the header.
- **Company (`/company/[ticker]`)** — sticky section nav across 13 cards:
  live price badge (auto-refreshes), 25y headcount chart + table (YoY, layoff
  flags, per-point source snippets), Buffett & Graham financials, buyback
  tracker, valuation checklist (P/E, P/B, Graham Number, net-net rule),
  Piotroski F-Score + Altman Z-Score, headline sentiment gauge, news, insider
  trades, 8-K radar, 10-K what-changed diff, headcount × stock overlay, CEO/CFO
  tenure from SEC signatures, key-people timeline, CSV/PNG export.
- **Leaderboards (`/leaderboard`)** — fastest growers (5y CAGR), biggest
  shrinkers, largest employers, plus the **per-employee league** (revenue,
  profit, and market cap per head) — computed live across the covered universe.
- **Watchlist (`/watchlist`)** — star any company; the app checks each watched
  CIK's latest SEC filing and flags NEW filings from the last 60 days.
  Stored in your browser (no account, no backend).
- **Compare (`/compare`)** — side-by-side headcount table + per-company charts.

## Look & feel

Terminal-luxe dark theme: near-black ink, phosphor-green accents, Inter prose
with JetBrains Mono numerals, tabular figures in every table, live ticker
tape, sticky section nav with anchor links, mono eyebrows, and a pulsing
loading state. Single theme, no toggle — one signature look.

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
   Each point keeps the exact source snippet shown in the UI table.

Candidate numbers are ranked (annual CY frame matching the fiscal year beats
quarterly fragments; headline phrasing beats carve-outs like “25,000 employees
transferred in the acquisition”); year-like numbers are rejected. Verified
against actuals: AAPL 2014–2025, MSFT 2002–2026, TSM 2014–2025 (20-F), NVDA
2015–2026.

SEC politeness: declared `User-Agent` with contact, sequential fetching with
delays, retries on 403/429, success-only in-memory cache (7-day TTL), long
`revalidate` on immutable archive docs. First load per company can take
~30–90s cold (up to ~4 min for a 25-year history); warm after.

## Financials & scores: how they work

- **XBRL annuals** (`GET /api/company/[cik]/financials`) — revenue, net income,
  EPS, book value, ROE, FCF, dividends, current ratio, D/E, buybacks, shares
  outstanding. Quarterly fragments and mislabeled comparative columns are
  filtered by frame/date matching; per-share series are split-adjusted via
  Yahoo corporate actions.
- **Valuation** — P/E, P/B, Graham Number √(22.5 × EPS × BV), net-net rule,
  Graham checklist. Educational screen, not investment advice.
- **F-Score / Z-Score** (`GET /api/company/[cik]/scores[?price=]`) — Piotroski
  9-point checklist + Altman Z with zone label (manufacturing version; read
  banks differently).
- **Insiders** (`GET /api/company/[cik]/insiders`) — open-market P/S transactions
  parsed from raw Form 4 XML (discovered via filing `index.json`, since the
  listed document is the rendered HTML view). Grants/exercises excluded.
- **8-K radar** (`GET /api/company/[cik]/eightks`) — item codes translated to
  plain English (5.02 = exec changes, 2.02 = earnings, 1.01 = big contracts).
- **10-K diff** (`GET /api/company/[cik]/riskdiff`) — sentence-level Risk
  Factors added/removed vs the prior annual filing.

## Sentiment & news

`GET /api/sentiment/[ticker]` scores up to 20 Google News headlines with a
transparent finance lexicon (−1 to +1, negation-aware) and aggregates to a
bullish/bearish/neutral gauge with per-headline scores. No ML model, no key.
Headlines feed (`GET /api/news/[ticker]`) refreshes every ~15 min.

## Stock quotes: keyless vs API key

Quotes work out of the box with no key via Yahoo Finance (delayed ~15 min).
For real-time quotes, set one of these env vars — the API tries Finnhub,
then Twelve Data, then falls back to Yahoo, and the badge shows the source.
History charts also use Yahoo (split-adjusted monthly closes).

| Provider | Key | Free tier | Freshness (free) | Notes |
|---|---|---|---|---|
| Finnhub | free, no card | 60 calls/min | real-time US | best free live option; personal-use license |
| Twelve Data | free, no card | 800 req/day | real-time US | also forex/crypto; WS streaming is paid |
| Alpaca | free account | 200 calls/min | real-time IEX feed | full consolidated SIP feed is $99/mo |
| Yahoo (built-in fallback) | none | unofficial | ~15 min delayed | can break without notice; fine for casual use |

## Environment variables

| Variable | Default | Purpose |
|---|---|---|
| `FINNHUB_API_KEY` | — (Yahoo fallback) | real-time quotes |
| `TWELVEDATA_API_KEY` | — (Yahoo fallback) | real-time quotes |
| `SEC_CONTACT_EMAIL` | `contact@tickerlens.local` | SEC User-Agent contact (set your real email for heavy use) |

```powershell
# local dev
$env:FINNHUB_API_KEY="your_key"; $env:SEC_CONTACT_EMAIL="you@example.com"
& "C:\Program Files\nodejs\npm.cmd" run dev

# docker
docker run -d --name tickerlens -p 3200:3000 -e FINNHUB_API_KEY=your_key -e SEC_CONTACT_EMAIL=you@example.com tickerlens
```

## Is it live? If Apple files a 10-K today, do I see it?

Yes, with bounded delay. SEC listing data revalidates hourly
(`submissions`, XBRL concept/facts), the company ticker index daily, filing
documents are immutable (cached 7 days), news every 15 min, quotes every
60 s. So a 10-K filed today appears in the app within about an hour — or
immediately after a server/container restart, which clears the caches. Parsed
10-K points show the exact source snippet so you can verify them against the
filing.

## API routes (all live, no key required)

- `GET /api/tickers?q=...` — SEC company index, optional server-side search.
- `GET /api/company/[cik]/headcount` — merged XBRL + parsed-filings series,
  CAGR, YoY, layoff flags, per-point snippets.
- `GET /api/company/[cik]/info` — submissions facts (name, tickers, SIC, filings).
- `GET /api/company/[cik]/financials[?ticker=]` — annual fundamentals +
  split-adjusted per-share series + value stats (CAGR, streaks).
- `GET /api/company/[cik]/officers` — CEO/CFO per year from SIGNATURES blocks.
- `GET /api/company/[cik]/scores[?price=]` — Piotroski F-Score + Altman Z-Score detail.
- `GET /api/company/[cik]/eightks` — recent 8-Ks with plain-English item codes.
- `GET /api/company/[cik]/insiders` — Form 4 open-market buys/sells + net totals.
- `GET /api/company/[cik]/riskdiff` — Risk Factors added/removed vs prior 10-K.
- `GET /api/quote/[ticker]` — live quote via Finnhub → Twelve Data → Yahoo chain.
- `GET /api/stock/[ticker]` — monthly closes (Yahoo) + year-end series + splits.
- `GET /api/people/[ticker]` — curated key people.
- `GET /api/news/[ticker]?name=...` — latest headlines (Google News RSS).
- `GET /api/sentiment/[ticker]?name=...` — lexicon-scored headlines with gauge.
- `GET /api/leaderboard[?tickers=...]` — growers / shrinkers / biggest employers /
  per-employee league.

SEC requires a `User-Agent` header — set server-side in `lib/sec.ts`.
SEC blocks UAs containing URLs, so the default contact is email-shaped.
All state beyond SEC data stays in the browser; no DB, no telemetry.

## Project structure

```
app/            Next.js App Router pages + API routes (see list above)
components/     UI cards (one concern each): HeadcountChart, FinancialsCard,
                ValuationCard, ScoresCard, InsidersCard, EightKFeed, DiffCard,
                SentimentCard, NewsFeed, StockOverlay, StockQuote, TickerTape…
lib/            server data layer: sec.ts (EDGAR), financials.ts (XBRL annuals),
                scores.ts (F/Z), filings.ts (8-K/Form 4/diff), stock.ts (Yahoo),
                quotes.ts (provider chain), news.ts, sentiment.ts
data/           curated key-people timelines (leaders.ts)
```

## License

MIT — see [LICENSE](LICENSE).
