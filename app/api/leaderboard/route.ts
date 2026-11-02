import { NextResponse } from "next/server";
import { LEADERS } from "@/data/leaders";
import { fetchHeadcountMerged, fetchTickersServer, type HeadcountPoint } from "@/lib/sec";

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
            const { points } = await fetchHeadcountMerged(entry.cik, 12);
            if (points.length < 2) return null;
            const last = points[points.length - 1];
            const prev = points[points.length - 2];
            const row: Row = {
              ticker,
              name: entry.name,
              latest: last.employees,
              latestYear: last.year,
              yoyPct: ((last.employees - prev.employees) / prev.employees) * 100,
              cagr5y: cagr(points, 5),
              cagr10y: cagr(points, 10),
              points: points.length,
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
    return NextResponse.json({
      count: rows.length,
      universe: universe.length,
      growers: growers.slice(0, 15),
      shrinkers: shrinkers.slice(0, 15),
      biggest: biggest.slice(0, 15),
    });
  } catch (e) {
    return NextResponse.json({ error: String(e), growers: [], shrinkers: [], biggest: [] }, { status: 502 });
  }
}
