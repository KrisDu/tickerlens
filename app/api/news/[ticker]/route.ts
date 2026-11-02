import { NextResponse } from "next/server";
import { fetchGoogleNewsItems } from "@/lib/news";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase();
  try {
    const { searchParams } = new URL(req.url);
    const name = (searchParams.get("name") ?? "").trim();
    const items = await fetchGoogleNewsItems(ticker, name, 8);
    return NextResponse.json({ ticker, count: items.length, items });
  } catch (e) {
    return NextResponse.json(
      { ticker, count: 0, items: [], error: String(e) },
      { status: 502 }
    );
  }
}
