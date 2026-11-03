import { NextResponse } from "next/server";
import { fetchScores } from "@/lib/scores";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { cik: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const priceRaw = searchParams.get("price");
    const price = priceRaw ? Number(priceRaw) : undefined;
    const scores = await fetchScores(
      params.cik,
      price && isFinite(price) && price > 0 ? price : undefined
    );
    return NextResponse.json({ cik: params.cik, ...scores });
  } catch (e) {
    return NextResponse.json(
      { cik: params.cik, error: String(e), fScore: null, zScore: null },
      { status: 502 }
    );
  }
}
