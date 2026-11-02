import { NextResponse } from "next/server";
import { fetchHeadcountMerged, type HeadcountPoint } from "@/lib/sec";

export const dynamic = "force-dynamic";
// 10-K text parsing can take a while on a cold cache (25 filings).
export const maxDuration = 300;

function cagr(points: HeadcountPoint[], years: number): number | null {
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  const target = last.year - years;
  const base = [...points].reverse().find((p) => p.year <= target) ?? points[0];
  const span = last.year - base.year;
  if (span < 1 || base.employees <= 0) return null;
  return (Math.pow(last.employees / base.employees, 1 / span) - 1) * 100;
}

export async function GET(
  _req: Request,
  { params }: { params: { cik: string } }
) {
  try {
    const { points, xbrlCount, filingCount } = await fetchHeadcountMerged(
      params.cik
    );
    const latest = points[points.length - 1] ?? null;
    const earliest = points[0] ?? null;
    const growth =
      latest && earliest && earliest.employees > 0
        ? ((latest.employees - earliest.employees) / earliest.employees) * 100
        : null;
    const yoy =
      points.length >= 2
        ? ((points[points.length - 1].employees -
            points[points.length - 2].employees) /
            points[points.length - 2].employees) *
          100
        : null;
    // Per-year YoY + layoff flags (declines worse than -3%).
    const yearly = points.map((p, i) => {
      if (i === 0) return { year: p.year, employees: p.employees, yoyPct: null as number | null };
      const prev = points[i - 1].employees;
      const yoyPct = prev > 0 ? ((p.employees - prev) / prev) * 100 : null;
      return { year: p.year, employees: p.employees, yoyPct };
    });
    const declines = yearly.filter((y) => y.yoyPct != null && y.yoyPct < -3);
    const avgAnnualChange =
      points.length >= 2 && earliest && latest
        ? Math.round((latest.employees - earliest.employees) / (latest.year - earliest.year))
        : null;
    return NextResponse.json({
      cik: params.cik,
      count: points.length,
      points,
      latest,
      earliest,
      growthPct: growth,
      yoyPct: yoy,
      cagrAll: cagr(points, 100),
      cagr5y: cagr(points, 5),
      cagr10y: cagr(points, 10),
      avgAnnualChange,
      declines,
      sources: {
        xbrl: xbrlCount,
        filings: filingCount,
        note: "XBRL = dei:EntityNumberOfEmployees facts. Filing points are parsed from the 10-K/20-F/40-F Human Capital disclosure (see snippet); XBRL wins on year conflicts.",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: "Headcount fetch failed", detail: String(e) },
      { status: 502 }
    );
  }
}
