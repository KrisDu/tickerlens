import { NextResponse } from "next/server";
import {
  fetchOwnershipXml,
  fetchRecentForms,
  parseForm4,
  type InsiderFiling,
} from "@/lib/filings";
import { sleep } from "@/lib/sec";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function GET(
  _req: Request,
  { params }: { params: { cik: string } }
) {
  try {
    const filings = await fetchRecentForms(params.cik, ["4"], 14);
    const out: (InsiderFiling & { filingDate: string })[] = [];
    let buys = 0;
    let sells = 0;
    for (const f of filings) {
      const raw = await fetchOwnershipXml(params.cik, f.accession);
      if (raw) {
        const parsed = parseForm4(raw);
        if (parsed) {
          for (const t of parsed.txs) {
            if (t.side === "buy") buys += t.shares;
            else sells += t.shares;
          }
          out.push({ ...parsed, accession: f.accession, filingDate: f.filingDate });
        }
      }
      await sleep(250);
      if (out.length >= 10) break;
    }
    return NextResponse.json({
      cik: params.cik,
      count: out.length,
      filings: out,
      totals: { buyShares: buys, sellShares: sells, netShares: buys - sells },
    });
  } catch (e) {
    return NextResponse.json(
      { cik: params.cik, error: String(e), filings: [], totals: null },
      { status: 502 }
    );
  }
}
