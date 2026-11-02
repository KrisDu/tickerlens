import { fetchQuote as fetchYahooQuote, type Quote } from "@/lib/stock";

export type QuoteProvider = "finnhub" | "twelvedata" | "yahoo";

// Finnhub free tier: 60 calls/min, real-time US quotes, no card.
// https://finnhub.io/api/v1/quote?symbol=AAPL&token=KEY
async function fetchFinnhubQuote(ticker: string, key: string): Promise<Quote> {
  const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
    ticker.toUpperCase()
  )}&token=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 20 },
  });
  if (!res.ok) throw new Error(`Finnhub HTTP ${res.status}`);
  const j = await res.json();
  if (j == null || typeof j.c !== "number" || !(j.c > 0))
    throw new Error(`Finnhub no quote for ${ticker}`);
  const price = j.c as number;
  const prevClose = (typeof j.pc === "number" && j.pc > 0 ? j.pc : price) as number;
  return {
    price: round2(price),
    prevClose: round2(prevClose),
    change: round2(price - prevClose),
    changePct: round2(((price - prevClose) / prevClose) * 100),
    open: numOrNull(j.o),
    dayHigh: numOrNull(j.h),
    dayLow: numOrNull(j.l),
    volume: null,
    marketTime: typeof j.t === "number" ? new Date(j.t * 1000).toISOString() : null,
    currency: "USD",
    exchange: "",
  };
}

// Twelve Data free tier: 800 req/day. Two most recent daily bars give
// today's quote + previous close in a single credit.
async function fetchTwelveDataQuote(ticker: string, key: string): Promise<Quote> {
  const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(
    ticker.toUpperCase()
  )}&interval=1day&outputsize=2&apikey=${encodeURIComponent(key)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 30 },
  });
  if (!res.ok) throw new Error(`Twelve Data HTTP ${res.status}`);
  const j = await res.json();
  const vals = (j?.values ?? []) as Array<Record<string, string>>;
  if (!vals.length || Number.isNaN(Number(vals[0]?.close)))
    throw new Error(`Twelve Data no quote for ${ticker} (${String(j?.message ?? "unknown")})`);
  const last = vals[0];
  const prev = vals[1];
  const price = Number(last.close);
  const prevClose = prev ? Number(prev.close) : price;
  return {
    price: round2(price),
    prevClose: round2(prevClose),
    change: round2(price - prevClose),
    changePct: prevClose > 0 ? round2(((price - prevClose) / prevClose) * 100) : 0,
    open: numOrNull(Number(last.open)),
    dayHigh: numOrNull(Number(last.high)),
    dayLow: numOrNull(Number(last.low)),
    volume: Number.isFinite(Number(last.volume)) ? Number(last.volume) : null,
    marketTime: last.datetime ? new Date(`${last.datetime}T16:00:00-04:00`).toISOString() : null,
    currency: "USD",
    exchange: (j?.meta?.exchange as string | undefined) ?? "",
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && isFinite(v) && v > 0 ? round2(v) : null;
}

export async function fetchLiveQuote(
  ticker: string
): Promise<{ quote: Quote; provider: QuoteProvider }> {
  const finnhub = process.env.FINNHUB_API_KEY?.trim();
  if (finnhub) {
    try {
      return { quote: await fetchFinnhubQuote(ticker, finnhub), provider: "finnhub" };
    } catch {
      // fall through to next provider
    }
  }
  const twelve = process.env.TWELVEDATA_API_KEY?.trim();
  if (twelve) {
    try {
      return { quote: await fetchTwelveDataQuote(ticker, twelve), provider: "twelvedata" };
    } catch {
      // fall through to Yahoo
    }
  }
  return { quote: await fetchYahooQuote(ticker), provider: "yahoo" };
}
