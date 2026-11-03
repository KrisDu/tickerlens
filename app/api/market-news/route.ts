import { NextResponse } from "next/server";
import { fetchMarketNews } from "@/lib/news";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const items = await fetchMarketNews(14);
    return NextResponse.json({ count: items.length, items });
  } catch (e) {
    return NextResponse.json(
      { count: 0, items: [], error: String(e) },
      { status: 502 }
    );
  }
}
