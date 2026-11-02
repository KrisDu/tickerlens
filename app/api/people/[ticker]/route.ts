import { NextResponse } from "next/server";
import { LEADERS } from "@/data/leaders";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase();
  const people = LEADERS[ticker] ?? [];
  // Enrich present/past counts
  return NextResponse.json({
    ticker,
    count: people.length,
    present: people.filter((p) => p.status === "present").length,
    past: people.filter((p) => p.status === "past").length,
    people,
  });
}
