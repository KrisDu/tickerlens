import { NextResponse } from "next/server";
import { diffRiskSections, fetchFilingText } from "@/lib/filings";
import { fetchAnnualFilings, inferFiscalYear, stripHtml } from "@/lib/sec";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(
  _req: Request,
  { params }: { params: { cik: string } }
) {
  try {
    const filings = await fetchAnnualFilings(params.cik, 6);
    // Prefer two consecutive filings of the same form (10-K vs 10-K).
    let pair = filings.slice(0, 2);
    if (pair.length === 2 && pair[0].form !== pair[1].form) {
      const same = filings.filter((f) => f.form === pair[0].form);
      if (same.length >= 2) pair = same.slice(0, 2);
    }
    if (pair.length < 2)
      return NextResponse.json({ cik: params.cik, error: "Need two annual filings", diff: null }, { status: 502 });
    const [nw, old] = await Promise.all([
      fetchFilingText(params.cik, pair[0]),
      fetchFilingText(params.cik, pair[1]),
    ]);
    if (!nw || !old)
      return NextResponse.json({ cik: params.cik, error: "Could not download filings", diff: null }, { status: 502 });
    const nwText = stripHtml(nw);
    const oldText = stripHtml(old);
    const newYear = inferFiscalYear(nwText.slice(0, 60000), pair[0].filingDate, pair[0].fiscalYearEnd);
    const oldYear = inferFiscalYear(oldText.slice(0, 60000), pair[1].filingDate, pair[1].fiscalYearEnd);
    const d = diffRiskSections(nwText, oldText);
    return NextResponse.json({
      cik: params.cik,
      newYear,
      oldYear,
      newForm: pair[0].form,
      oldForm: pair[1].form,
      newFiled: pair[0].filingDate,
      oldFiled: pair[1].filingDate,
      diff: d,
    });
  } catch (e) {
    return NextResponse.json(
      { cik: params.cik, error: String(e), diff: null },
      { status: 502 }
    );
  }
}
