// Piotroski F-Score (9 pts) + Altman Z-Score from XBRL annual facts.
// F-Score rewards profitable, cash-generative, deleveraging, efficient
// businesses — pure Graham/Buffett. Z-Score flags distress (<1.81).
import { extractAnnual } from "@/lib/financials";

const SEC_UA_S = process.env.SEC_CONTACT_EMAIL?.trim()
  ? `TickerLens/1.0 (${process.env.SEC_CONTACT_EMAIL.trim()})`
  : "TickerLens/1.0 (contact@tickerlens.local)";

export interface PiotroskiDetail {
  roa: boolean | null;
  cfo: boolean | null;
  deltaRoa: boolean | null;
  accrual: boolean | null;
  deltaLever: boolean | null;
  deltaLiquid: boolean | null;
  noDilution: boolean | null;
  deltaMargin: boolean | null;
  deltaTurn: boolean | null;
}

export interface Scores {
  fScore: number | null;
  fMax: 9;
  fDetail: PiotroskiDetail;
  fLabel: string | null;
  zScore: number | null;
  zLabel: string | null;
  zParts: Record<string, number | null>;
  year: number | null;
  priceUsed: number | null;
}

async function facts(cik: string) {
  const padded = String(cik).padStart(10, "0");
  const res = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${padded}.json`, {
    headers: { "User-Agent": SEC_UA_S, Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`SEC companyfacts failed: ${res.status}`);
  const j = await res.json();
  return (j?.facts ?? {}) as Record<string, unknown>;
}

function last2(m: Map<number, number>): [number, number][] {
  return [...m.entries()].sort((a, b) => a[0] - b[0]).slice(-2) as [number, number][];
}

export async function fetchScores(cik: string, price?: number): Promise<Scores> {
  const f = await facts(cik);
  const M = (ns: string, ...tags: string[]) => {
    const arr = extractAnnual(f, ns, tags);
    return new Map(arr.map((a) => [a.fy, a.val]));
  };
  const ni = M("us-gaap", "NetIncomeLoss");
  const ocf = M("us-gaap", "NetCashProvidedByUsedInOperatingActivities");
  const ta = M("us-gaap", "Assets");
  const ltd = M("us-gaap", "LongTermDebtNoncurrent", "LongTermDebt");
  const ca = M("us-gaap", "AssetsCurrent");
  const cl = M("us-gaap", "LiabilitiesCurrent");
  const sh = M("dei", "EntityCommonStockSharesOutstanding");
  const shD = M("us-gaap", "WeightedAverageNumberOfDilutedSharesOutstanding");
  const gp = M("us-gaap", "GrossProfit");
  const rev = M(
    "us-gaap",
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "Revenues",
    "SalesRevenueNet"
  );
  const re = M("us-gaap", "RetainedEarningsAccumulatedDeficit");
  const ebit = M("us-gaap", "OperatingIncomeLoss");
  const tl = M("us-gaap", "Liabilities");

  const shares = sh.size >= 2 ? sh : shD;
  const yrs = [...ni.keys(), ...ocf.keys(), ...ta.keys()]
    .filter((y) => ni.has(y) && ocf.has(y) && ta.has(y))
    .sort((a, b) => a - b);
  const empty: Scores = {
    fScore: null, fMax: 9, fDetail: {} as PiotroskiDetail, fLabel: null,
    zScore: null, zLabel: null, zParts: {}, year: null, priceUsed: price ?? null,
  };
  if (yrs.length < 2) return empty;
  const t = yrs[yrs.length - 1];
  const p = yrs[yrs.length - 2];
  const at = (m: Map<number, number>, y: number) => (m.has(y) ? m.get(y)! : null);
  const v = (x: number | null | undefined) => (x == null ? null : x);

  const niT = v(at(ni, t))!, ocfT = v(at(ocf, t))!, taT = v(at(ta, t))!;
  const niP = v(at(ni, p))!, taP = v(at(ta, p))!;
  const roaT = niT / taT;
  const roaP = niP / taP;
  const lev = (y: number) => {
    const l = at(ltd, y);
    const a = at(ta, y);
    return l != null && a ? l / a : null;
  };
  const cr = (y: number) => {
    const a = at(ca, y);
    const l = at(cl, y);
    return a != null && l ? a / l : null;
  };
  const gm = (y: number) => {
    const g = at(gp, y);
    const r = at(rev, y);
    return g != null && r ? g / r : null;
  };
  const turn = (y: number) => {
    const r = at(rev, y);
    const a = at(ta, y);
    return r != null && a ? r / a : null;
  };
  const shT = at(shares, t);
  const shP = at(shares, p);

  const d: PiotroskiDetail = {
    roa: roaT > 0,
    cfo: ocfT > 0,
    deltaRoa: roaT > roaP,
    accrual: ocfT / taT > roaT,
    deltaLever: lev(t) != null && lev(p) != null ? lev(t)! < lev(p)! : null,
    deltaLiquid: cr(t) != null && cr(p) != null ? cr(t)! > cr(p)! : null,
    noDilution: shT != null && shP != null ? shT <= shP : null,
    deltaMargin: gm(t) != null && gm(p) != null ? gm(t)! > gm(p)! : null,
    deltaTurn: turn(t) != null && turn(p) != null ? turn(t)! > turn(p)! : null,
  };
  const pts = Object.values(d).filter((x) => x === true).length;
  const known = Object.values(d).filter((x) => x !== null).length;
  const fScore = known >= 7 ? pts : null;
  const fLabel =
    fScore == null ? null : fScore >= 7 ? "Strong" : fScore >= 4 ? "Average" : "Weak";

  // Altman Z (manufacturing version; directionally useful, not for banks).
  let zScore: number | null = null;
  let zLabel: string | null = null;
  let zParts: Record<string, number | null> = {};
  const caT = at(ca, t);
  const clT = at(cl, t);
  const reT = at(re, t);
  const ebitT = at(ebit, t);
  const tlT = at(tl, t);
  const revT = at(rev, t);
  if (
    caT != null && clT != null && reT != null && ebitT != null &&
    tlT != null && tlT !== 0 && revT != null && taT !== 0 && price
  ) {
    const so = shT ?? at(shD, t);
    if (so) {
      const x1 = (caT - clT) / taT;
      const x2 = reT / taT;
      const x3 = ebitT / taT;
      const x4 = (price * so) / tlT;
      const x5 = revT / taT;
      zScore = Math.round((1.2 * x1 + 1.4 * x2 + 3.3 * x3 + 0.6 * x4 + 1.0 * x5) * 100) / 100;
      zParts = { x1: +x1.toFixed(3), x2: +x2.toFixed(3), x3: +x3.toFixed(3), x4: +x4.toFixed(3), x5: +x5.toFixed(3) };
      zLabel = zScore > 2.99 ? "Safe zone" : zScore > 1.81 ? "Grey zone" : "Distress zone";
    }
  }

  return { fScore, fMax: 9, fDetail: d, fLabel, zScore, zLabel, zParts, year: t, priceUsed: price ?? null };
}
