import { NextResponse } from "next/server";
import { fetchStockMonthly, yearEndCloses } from "@/lib/stock";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { ticker: string } }
) {
  try {
    const monthly = await fetchStockMonthly(params.ticker);
    const first = monthly[0];
    const last = monthly[monthly.length - 1];
    return NextResponse.json({
      ticker: params.ticker.toUpperCase(),
      count: monthly.length,
      monthly: monthly.slice(-240), // last 20 years for the chart
      yearly: yearEndCloses(monthly),
      first,
      last,
      totalReturnPct:
        first && last && first.close > 0
          ? ((last.close - first.close) / first.close) * 100
          : null,
    });
  } catch (e) {
    return NextResponse.json(
      { ticker: params.ticker.toUpperCase(), error: String(e), monthly: [], yearly: [] },
      { status: 502 }
    );
  }
}
