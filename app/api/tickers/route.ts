import { NextResponse } from "next/server";
import { fetchTickersServer } from "@/lib/sec";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") ?? "").trim().toLowerCase();
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "12") || 12));
    const companies = await fetchTickersServer();
    if (!q) return NextResponse.json({ count: companies.length, companies });
    const starts: typeof companies = [];
    const contains: typeof companies = [];
    for (const c of companies) {
      if (c.ticker.toLowerCase().startsWith(q)) starts.push(c);
      else if (
        c.ticker.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q)
      )
        contains.push(c);
      if (starts.length >= limit) break;
    }
    const matches = [...starts, ...contains].slice(0, limit);
    return NextResponse.json({ count: matches.length, companies: matches });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to fetch SEC tickers", detail: String(e) },
      { status: 502 }
    );
  }
}
