import { NextResponse } from "next/server";
import {
  fetchFilingText,
  fetchRecentForms,
  parseEightKItems,
  type EightK,
} from "@/lib/filings";
import { stripHtml, sleep } from "@/lib/sec";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function GET(
  _req: Request,
  { params }: { params: { cik: string } }
) {
  try {
    const filings = await fetchRecentForms(params.cik, ["8-K"], 8);
    const out: EightK[] = [];
    for (const f of filings) {
      const raw = await fetchFilingText(params.cik, f);
      if (!raw) continue;
      const items = parseEightKItems(stripHtml(raw));
      const cikNum = params.cik.replace(/^0+/, "") || "0";
      out.push({
        accession: f.accession,
        filingDate: f.filingDate,
        form: f.form,
        items,
        docUrl: `https://www.sec.gov/Archives/edgar/data/${cikNum}/${f.accession.replace(/-/g, "")}/${f.primaryDoc}`,
      });
      await sleep(300);
    }
    return NextResponse.json({ cik: params.cik, count: out.length, filings: out });
  } catch (e) {
    return NextResponse.json(
      { cik: params.cik, error: String(e), filings: [] },
      { status: 502 }
    );
  }
}
