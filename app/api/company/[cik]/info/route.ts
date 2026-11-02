import { NextResponse } from "next/server";
import { fetchCompanyInfoServer } from "@/lib/sec";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: { cik: string } }
) {
  try {
    const info = await fetchCompanyInfoServer(params.cik);
    return NextResponse.json(info);
  } catch (e) {
    return NextResponse.json(
      { error: "Company info fetch failed", detail: String(e) },
      { status: 502 }
    );
  }
}
