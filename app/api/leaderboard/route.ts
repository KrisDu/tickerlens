import { NextResponse } from "next/server";
import { LEADERS } from "@/data/leaders";
import { fetchHeadcountMerged, fetchTickersServer, type HeadcountPoint } from "@/lib/sec";
import { fetchFinancials } from "@/lib/financials";
import { fetchStockMonthly, yearEndCloses } from "@/lib/stock";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface Row {
  ticker: string;
  name: string;
  latest: number | null;
  latestYear: number | null;
  yoyPct: number | null;
  cagr5y: number | null;
  cagr10y: number | null;
  points: number;
  revPerEmp: number | null;
  profitPerEmp: number | null;
  mcapPerEmp: number | null;
}

function cagr(points: HeadcountPoint[], years: number): number | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const target = last.year - years;
  const base = [...points].reverse().find((p) => p.year <= target) ?? points[0];
  const span = last.year - base.year;
  if (span < 1 || base.employees <= 0) return null;
  return (Math.pow(last.employees / base.employees, 1 / span) - 1) * 100;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const override = (searchParams.get("tickers") ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const universe = override.length ? override : Object.keys(LEADERS);
  try {
    const all = await fetchTickersServer();
    const cikOf = new Map(all.map((c) => [c.ticker, c]));
    const jobs = universe.map((t) => ({ ticker: t, entry: cikOf.get(t) }));
    const rows: Row[] = [];
    const CONC = 6;
    for (let i = 0; i < jobs.length; i += CONC) {
      const batch = await Promise.all(
        jobs.slice(i, i + CONC).map(async ({ ticker, entry }) => {
          if (!entry) return null;
          try {
            const [{ points }, fin, stock] = await Promise.all([
              fetchHeadcountMerged(entry.cik, 12),
              fetchFinancials(entry.cik).catch(() => null),
              fetchStockMonthly(ticker).catch(() => []),
            ]);
            if (points.length < 2) return null;
            const last = points[points.length - 1];
            const prev = points[points.length - 2];
            // Match headcount year to the same fiscal year in financials.
            const fy = fin?.years.find((y) => y.year === last.year) ?? fin?.years[fin.years.length - 1];
            const revPerEmp = fy?.revenue != null ? fy.revenue / last.employees : null;
            const profitPerEmp = fy?.netIncome != null ? fy.netIncome / last.employees : null;
            const closes = yearEndCloses(stock);
            const px = closes.length ? closes[closes.length - 1].close : null;
            const so = fy?.sharesOut ?? fy?.sharesDiluted ?? null;
            const mcapPerEmp = px != null && so != null ? (px * so) / last.employees : null;
            const row: Row = {
              ticker,
              name: entry.name,
              latest: last.employees,
              latestYear: last.year,
              yoyPct: ((last.employees - prev.employees) / prev.employees) * 100,
              cagr5y: cagr(points, 5),
              cagr10y: cagr(points, 10),
              points: points.length,
              revPerEmp,
              profitPerEmp,
              mcapPerEmp,
            };
            return row;
          } catch {
            return null;
          }
        })
      );
      for (const r of batch) if (r) rows.push(r);
    }
    const growers = [...rows]
      .filter((r) => r.cagr5y != null)
      .sort((a, b) => (b.cagr5y ?? 0) - (a.cagr5y ?? 0));
    const shrinkers = [...rows]
      .filter((r) => r.yoyPct != null)
      .sort((a, b) => (a.yoyPct ?? 0) - (b.yoyPct ?? 0));
    const biggest = [...rows].sort((a, b) => (b.latest ?? 0) - (a.latest ?? 0));
    const byRevenue = [...rows]
      .filter((r) => r.revPerEmp != null)
      .sort((a, b) => (b.revPerEmp ?? 0) - (a.revPerEmp ?? 0));
    const byProfit = [...rows]
      .filter((r) => r.profitPerEmp != null)
      .sort((a, b) => (b.profitPerEmp ?? 0) - (a.profitPerEmp ?? 0));
    const byMcap = [...rows]
      .filter((r) => r.mcapPerEmp != null)
      .sort((a, b) => (b.mcapPerEmp ?? 0) - (a.mcapPerEmp ?? 0));
    return NextResponse.json({
      count: rows.length,
      universe: universe.length,
      growers: growers.slice(0, 15),
      shrinkers: shrinkers.slice(0, 15),
      biggest: biggest.slice(0, 15),
      perEmployee: {
        revenue: byRevenue.slice(0, 15),
        profit: byProfit.slice(0, 15),
        mcap: byMcap.slice(0, 15),
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e), growers: [], shrinkers: [], biggest: [], perEmployee: null }, { status: 502 });
  }
}
