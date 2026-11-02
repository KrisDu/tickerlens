import { NextResponse } from "next/server";
import { fetchLiveQuote } from "@/lib/quotes";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { ticker: string } }
) {
  try {
    const { quote, provider } = await fetchLiveQuote(params.ticker);
    return NextResponse.json({ ticker: params.ticker.toUpperCase(), provider, quote });
  } catch (e) {
    return NextResponse.json(
      { ticker: params.ticker.toUpperCase(), error: String(e), quote: null },
      { status: 502 }
    );
  }
}
