export interface PricePoint {
  date: string; // YYYY-MM-DD
  close: number;
}

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// Yahoo Finance chart API: keyless, split/dividend-adjusted monthly closes.
export async function fetchStockMonthly(ticker: string): Promise<PricePoint[]> {
  const sym = encodeURIComponent(ticker.toUpperCase().replace("/", "-"));
  let lastErr: unknown = null;
  for (const host of ["query2.finance.yahoo.com", "query1.finance.yahoo.com"]) {
    try {
      const url = `https://${host}/v8/finance/chart/${sym}?range=max&interval=1mo&events=div%7Csplit`;
      const res = await fetch(url, {
        headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
        next: { revalidate: 21600 }, // 6h
      });
      if (!res.ok) {
        lastErr = new Error(`Yahoo HTTP ${res.status}`);
        continue;
      }
      const j = await res.json();
      const result = j?.chart?.result?.[0];
      const ts: number[] = result?.timestamp ?? [];
      const adj: Array<number | null> = result?.indicators?.adjclose?.[0]?.adjclose ?? [];
      const out: PricePoint[] = [];
      for (let i = 0; i < ts.length; i++) {
        const c = adj[i];
        if (c == null || !isFinite(c) || c <= 0) continue;
        const d = new Date(ts[i] * 1000);
        const yyyy = d.getUTCFullYear();
        const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
        const dd = String(d.getUTCDate()).padStart(2, "0");
        if (yyyy < 1970) continue;
        out.push({ date: `${yyyy}-${mm}-${dd}`, close: Math.round(c * 100) / 100 });
      }
      if (out.length) return out;
      lastErr = new Error("Yahoo returned no prices");
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`No price data for ${ticker} (${String(lastErr)})`);
}

export interface Quote {
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  open: number | null;
  dayHigh: number | null;
  dayLow: number | null;
  volume: number | null;
  marketTime: string | null;
  currency: string;
  exchange: string;
}

// Intraday quote from Yahoo chart API (range=1d, 1m bars + meta).
export async function fetchQuote(ticker: string): Promise<Quote> {
  const sym = encodeURIComponent(ticker.toUpperCase().replace("/", "-"));
  let lastErr: unknown = null;
  for (const host of ["query2.finance.yahoo.com", "query1.finance.yahoo.com"]) {
    try {
      const url = `https://${host}/v8/finance/chart/${sym}?range=1d&interval=1m`;
      const res = await fetch(url, {
        headers: { "User-Agent": BROWSER_UA, Accept: "application/json" },
        next: { revalidate: 60 }, // 1 min — this is the live number
      });
      if (!res.ok) {
        lastErr = new Error(`Yahoo HTTP ${res.status}`);
        continue;
      }
      const j = await res.json();
      const result = j?.chart?.result?.[0];
      if (!result) {
        lastErr = new Error("Yahoo returned no quote");
        continue;
      }
      const meta = result.meta ?? {};
      const closes: Array<number | null> = result?.indicators?.quote?.[0]?.close ?? [];
      const opens: Array<number | null> = result?.indicators?.quote?.[0]?.open ?? [];
      const highs: Array<number | null> = result?.indicators?.quote?.[0]?.high ?? [];
      const lows: Array<number | null> = result?.indicators?.quote?.[0]?.low ?? [];
      const vols: Array<number | null> = result?.indicators?.quote?.[0]?.volume ?? [];
      const valid = (a: Array<number | null>) => a.filter((v): v is number => v != null && isFinite(v));
      const lastClose = valid(closes).pop();
      const price = meta.regularMarketPrice ?? lastClose;
      const prevClose = meta.chartPreviousClose ?? meta.previousClose;
      if (price == null || prevClose == null) {
        lastErr = new Error("Yahoo quote incomplete");
        continue;
      }
      const r2 = (v: number | null | undefined) =>
        v == null ? null : Math.round(v * 100) / 100;
      return {
        price: Math.round(price * 100) / 100,
        prevClose: Math.round(prevClose * 100) / 100,
        change: Math.round((price - prevClose) * 100) / 100,
        changePct: Math.round(((price - prevClose) / prevClose) * 10000) / 100,
        open: r2(opens.find((v) => v != null)),
        dayHigh: r2(Math.max(...valid(highs), price)),
        dayLow: r2(Math.min(...valid(lows), price)),
        volume: valid(vols).reduce((a, b) => a + b, 0) || null,
        marketTime: meta.regularMarketTime
          ? new Date(meta.regularMarketTime * 1000).toISOString()
          : null,
        currency: meta.currency ?? "USD",
        exchange: meta.exchangeName ?? meta.fullExchangeName ?? "",
      };
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`No quote for ${ticker} (${String(lastErr)})`);
}

export function yearEndCloses(monthly: PricePoint[]): Array<{ year: number; close: number }> {
  const byYear = new Map<number, PricePoint>();
  for (const p of monthly) {
    const y = Number(p.date.slice(0, 4));
    const cur = byYear.get(y);
    if (!cur || p.date > cur.date) byYear.set(y, p);
  }
  return Array.from(byYear.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, p]) => ({ year, close: p.close }));
}
