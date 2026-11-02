import { NextResponse } from "next/server";
import { fetchGoogleNewsItems } from "@/lib/news";
import { scoreHeadlines } from "@/lib/sentiment";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase();
  try {
    const { searchParams } = new URL(req.url);
    const name = (searchParams.get("name") ?? "").trim();
    const items = await fetchGoogleNewsItems(ticker, name, 20);
    const result = scoreHeadlines(items);
    return NextResponse.json({ ticker, sample: items.length, ...result });
  } catch (e) {
    return NextResponse.json(
      { ticker, error: String(e), score: 0, label: "neutral", counts: null, items: [] },
      { status: 502 }
    );
  }
}
