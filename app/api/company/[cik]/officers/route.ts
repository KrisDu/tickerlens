import { NextResponse } from "next/server";
import { fetchOfficers } from "@/lib/sec";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(
  _req: Request,
  { params }: { params: { cik: string } }
) {
  try {
    const records = await fetchOfficers(params.cik, 12);
    const changes: Array<{ year: number; role: "CEO" | "CFO"; from: string | null; to: string | null }> = [];
    for (let i = 1; i < records.length; i++) {
      if (records[i].ceo !== records[i - 1].ceo && (records[i].ceo || records[i - 1].ceo))
        changes.push({ year: records[i].year, role: "CEO", from: records[i - 1].ceo, to: records[i].ceo });
      if (records[i].cfo !== records[i - 1].cfo && (records[i].cfo || records[i - 1].cfo))
        changes.push({ year: records[i].year, role: "CFO", from: records[i - 1].cfo, to: records[i].cfo });
    }
    return NextResponse.json({ cik: params.cik, count: records.length, records, changes });
  } catch (e) {
    return NextResponse.json(
      { cik: params.cik, error: String(e), records: [], changes: [] },
      { status: 502 }
    );
  }
}
