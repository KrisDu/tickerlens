import { NextResponse } from "next/server";
import { fetchFinancials } from "@/lib/financials";
import { fetchSplits } from "@/lib/stock";

export const dynamic = "force-dynamic";

function cagr(vals: Array<{ year: number; v: number }>): number | null {
  if (vals.length < 2) return null;
  const first = vals[0];
  const last = vals[vals.length - 1];
  const span = last.year - first.year;
  if (span < 1 || first.v <= 0 || last.v <= 0) return null;
  return (Math.pow(last.v / first.v, 1 / span) - 1) * 100;
}

// Split-adjust per-share series: XBRL keeps as-filed values, so pre-split
// years (e.g. AAPL FY2019 EPS $11.89) would dwarf post-split years ($7.46).
function applySplits<T extends { year: number; eps: number | null; bvps: number | null; divps: number | null }>(
  years: T[],
  splits: Array<{ date: string; factor: number }>
): void {
  for (const y of years) {
    let f = 1;
    for (const s of splits) {
      if (Number(s.date.slice(0, 4)) > y.year) f *= s.factor;
    }
    if (f !== 1) {
      if (y.eps != null) y.eps = Math.round(y.eps * f * 100) / 100;
      if (y.bvps != null) y.bvps = Math.round(y.bvps * f * 100) / 100;
      if (y.divps != null) y.divps = Math.round(y.divps * f * 10000) / 10000;
    }
  }
}

export async function GET(
  req: Request,
  { params }: { params: { cik: string } }
) {
  try {
    const { searchParams } = new URL(req.url);
    const ticker = (searchParams.get("ticker") ?? "").toUpperCase();
    const { years, currency } = await fetchFinancials(params.cik);
    if (ticker) {
      try {
        applySplits(years, await fetchSplits(ticker));
      } catch {
        // unadjusted fallback
      }
    }
    const rev = years.filter((y) => y.revenue != null).map((y) => ({ year: y.year, v: y.revenue as number }));
    const eps = years.filter((y) => y.eps != null && (y.eps as number) > 0).map((y) => ({ year: y.year, v: y.eps as number }));
    const roes = years.map((y) => y.roe).filter((v): v is number => v != null);
    // Dividend streak: consecutive years with payouts, counting back from latest.
    let divStreak = 0;
    for (let i = years.length - 1; i >= 0; i--) {
      if (years[i].dividends != null && (years[i].dividends as number) > 0) divStreak++;
      else break;
    }
    const posEpsYears = years.filter((y) => y.eps != null && (y.eps as number) > 0).length;
    return NextResponse.json({
      cik: params.cik,
      currency,
      count: years.length,
      years,
      latest: years[years.length - 1] ?? null,
      stats: {
        revenueCagr10y: cagr(rev.slice(-10)),
        epsCagr10y: cagr(eps.slice(-10)),
        avgRoe10y: roes.length ? roes.slice(-10).reduce((a, b) => a + b, 0) / Math.min(10, roes.length) : null,
        divStreak,
        posEpsYears,
      },
    });
  } catch (e) {
    return NextResponse.json(
      { cik: params.cik, error: String(e), years: [], latest: null, stats: null },
      { status: 502 }
    );
  }
}
