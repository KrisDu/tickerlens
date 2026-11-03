import { NextResponse } from "next/server";
import { fetchWikipediaAbout } from "@/lib/about";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase();
  try {
    const { searchParams } = new URL(req.url);
    const name = (searchParams.get("name") ?? "").trim();
    if (!name) return NextResponse.json({ ticker, about: null });
    const about = await fetchWikipediaAbout(name);
    return NextResponse.json({ ticker, about });
  } catch (e) {
    return NextResponse.json({ ticker, about: null, error: String(e) });
  }
}
