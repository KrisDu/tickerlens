// Value-investing fundamentals from SEC XBRL companyfacts.
// Annual (FY) series for the concepts Graham & Buffett cared about:
// revenue, earnings, book value, ROE, debt, cash flow, dividends.

export interface AnnualValue {
  fy: number;
  val: number;
  form: string;
  filed: string;
  end: string;
}

export interface FinancialYear {
  year: number;
  revenue: number | null;
  netIncome: number | null;
  eps: number | null;
  equity: number | null;
  sharesDiluted: number | null;
  sharesOut: number | null;
  assetsCurrent: number | null;
  liabCurrent: number | null;
  liabilities: number | null;
  ltDebt: number | null;
  assets: number | null;
  grossProfit: number | null;
  retainedEarnings: number | null;
  ebit: number | null;
  ocf: number | null;
  capex: number | null;
  dividends: number | null;
  buybacks: number | null;
  roe: number | null;
  fcf: number | null;
  bvps: number | null;
  divps: number | null;
  currentRatio: number | null;
  debtToEquity: number | null;
}

const SEC_UA = process.env.SEC_CONTACT_EMAIL?.trim()
  ? `TickerLens/1.0 (${process.env.SEC_CONTACT_EMAIL.trim()})`
  : "TickerLens/1.0 (contact@tickerlens.local)";

function formRank(f: string): number {
  if (f === "10-K" || f === "20-F" || f === "40-F") return 0;
  if (f === "10-K/A" || f === "20-F/A" || f === "40-F/A") return 1;
  return 2;
}

function durationDays(start: string, end: string): number {
  const s = Date.parse(start);
  const e = Date.parse(end);
  if (isNaN(s) || isNaN(e)) return 0;
  return Math.round((e - s) / 86400000);
}

type RankKey = [number, number, number, string];

function cmpRank(a: RankKey, b: RankKey): number {
  for (let i = 0; i < 4; i++) {
    if (i === 3) {
      if (a[i] !== b[i]) return a[i] > b[i] ? -1 : 1; // latest filed wins
      continue;
    }
    if (a[i] !== b[i]) return (a[i] as number) - (b[i] as number);
  }
  return 0;
}

// One FY point per fiscal year. Filers switch tags over time (Apple:
// Revenues -> SalesRevenueNet after 2018) and comparative columns get
// mislabeled fy (FY2025 10-K restates FY2024 as fy=2025), so each candidate
// tag gets its own series and the richest series wins conflicts.
export function extractAnnual(
  facts: Record<string, unknown>,
  ns: string,
  tags: string[]
): AnnualValue[] {
  const nsFacts = (facts?.[ns] ?? {}) as Record<string, unknown>;
  type Scored = AnnualValue & { frame: string; effFrame: string; durationDays: number };
  type Pick = { r: AnnualValue; key: RankKey };
  const series: Array<{ picks: Map<number, Pick>; len: number; idx: number }> = [];
  for (let ti = 0; ti < tags.length; ti++) {
    const t = tags[ti];
    const node = nsFacts[t] as Record<string, unknown> | undefined;
    if (!node?.units) continue;
    const units = node.units as Record<string, Array<Record<string, string | number>>>;
    const all: Scored[] = [];
    for (const arr of Object.values(units)) {
      for (const u of arr) {
        if (typeof u?.val !== "number" || u?.fp !== "FY") continue;
        const fy = Number(u.fy ?? String(u.filed ?? "").slice(0, 4) ?? 0);
        if (!(fy >= 1990 && fy <= 2032)) continue;
        const end = String(u.end ?? "");
        const frame = String((u as Record<string, unknown>).frame ?? "");
        // SEC derives frame from dates; when absent, infer it from end date.
        const endYear = /(\d{4})-\d{2}-\d{2}/.exec(end)?.[1] ?? "";
        all.push({
          fy,
          val: Number(u.val),
          form: String(u.form ?? ""),
          filed: String(u.filed ?? ""),
          end,
          frame,
          effFrame: frame || (endYear ? `CY${endYear}` : ""),
          durationDays: durationDays(String(u.start ?? ""), end),
        });
      }
    }
    const byYear = new Map<number, Scored>();
    const rank = (r: Scored): RankKey => {
      // Period match: does this fact belong to fiscal year fy?
      const period = r.frame === `CY${r.fy}` ? 0
        : (() => { const m = /(\d{4})-\d{2}-\d{2}/.exec(r.end); return m && Number(m[1]) === r.fy; })() ? 1
        : /^CY\d{4}$/.test(r.effFrame) ? 3
        : 2;
      // Annuality: full-year facts only (quarterly fragments share fp:FY).
      const annual = r.durationDays >= 350 && r.durationDays <= 380 ? 0
        : r.durationDays === 0 ? 1
        : 2;
      return [period, annual, formRank(r.form), r.filed];
    };
    for (const r of all) {
      const cur = byYear.get(r.fy);
      if (!cur || cmpRank(rank(r), rank(cur)) < 0) byYear.set(r.fy, r);
    }
    const picks = new Map<number, Pick>();
    for (const [fy, r] of byYear)
      picks.set(fy, { r: { fy: r.fy, val: r.val, form: r.form, filed: r.filed, end: r.end }, key: rank(r) });
    series.push({ picks, len: picks.size, idx: ti });
  }
  // Merge tags per year by pick quality (a long series' quarterly fragment
  // must not beat another tag's true annual). Ties: richer series, then
  // primary tag order.
  const merged = new Map<number, AnnualValue>();
  const fys = new Set<number>();
  for (const s of series) for (const fy of s.picks.keys()) fys.add(fy);
  for (const fy of fys) {
    const cands = series
      .filter((s) => s.picks.has(fy))
      .map((s) => ({ ...s.picks.get(fy)!, len: s.len, idx: s.idx }))
      .sort((a, b) => {
        const c = cmpRank(a.key, b.key);
        if (c !== 0) return c;
        if (a.len !== b.len) return b.len - a.len;
        return a.idx - b.idx;
      });
    merged.set(fy, cands[0].r);
  }
  return Array.from(merged.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, r]) => r);
}

export async function fetchFinancials(cik: string): Promise<{
  years: FinancialYear[];
  currency: string;
}> {
  const padded = String(cik).padStart(10, "0");
  const res = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${padded}.json`, {
    headers: { "User-Agent": SEC_UA, Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`SEC companyfacts failed: ${res.status}`);
  const j = await res.json();
  const facts = (j?.facts ?? {}) as Record<string, unknown>;

  const get = (ns: string, ...tags: string[]) => {
    const arr = extractAnnual(facts, ns, tags);
    return new Map(arr.map((a) => [a.fy, a.val]));
  };
  const revenue = get("us-gaap", "RevenueFromContractWithCustomerExcludingAssessedTax", "Revenues", "SalesRevenueNet", "SalesRevenueGoodsNet");
  const netIncome = get("us-gaap", "NetIncomeLoss");
  const eps = get("us-gaap", "EarningsPerShareDiluted");
  const equity = get("us-gaap", "StockholdersEquity");
  const shares = get("us-gaap", "WeightedAverageNumberOfDilutedSharesOutstanding");
  const assetsCurrent = get("us-gaap", "AssetsCurrent");
  const liabCurrent = get("us-gaap", "LiabilitiesCurrent");
  const liabilities = get("us-gaap", "Liabilities");
  const ltDebt = get("us-gaap", "LongTermDebtNoncurrent", "LongTermDebt");
  const ocf = get("us-gaap", "NetCashProvidedByUsedInOperatingActivities");
  const capex = get("us-gaap", "PaymentsToAcquirePropertyPlantAndEquipment");
  const dividends = get("us-gaap", "PaymentsOfDividends", "PaymentsOfDividendsCommonStock");
  const sharesOut = get("dei", "EntityCommonStockSharesOutstanding");
  const buybacks = get("us-gaap", "PaymentsForRepurchaseOfCommonStock", "PaymentsForRepurchaseOfEquity");
  const assets = get("us-gaap", "Assets");
  const grossProfit = get("us-gaap", "GrossProfit");
  const retainedEarnings = get("us-gaap", "RetainedEarningsAccumulatedDeficit");
  const ebit = get("us-gaap", "OperatingIncomeLoss");

  const years = Array.from(
    new Set([
      ...revenue.keys(), ...netIncome.keys(), ...eps.keys(), ...equity.keys(),
      ...shares.keys(), ...sharesOut.keys(), ...assetsCurrent.keys(), ...liabCurrent.keys(),
      ...liabilities.keys(), ...ltDebt.keys(), ...assets.keys(), ...grossProfit.keys(),
      ...retainedEarnings.keys(), ...ebit.keys(), ...ocf.keys(), ...capex.keys(),
      ...dividends.keys(), ...buybacks.keys(),
    ])
  ).sort((a, b) => a - b);

  const pick = (m: Map<number, number>, y: number) => m.get(y) ?? null;
  const out: FinancialYear[] = years.map((year) => {
    const ni = pick(netIncome, year);
    const eq = pick(equity, year);
    const sh = pick(shares, year);
    const oc = pick(ocf, year);
    const cx = pick(capex, year);
    const dv = pick(dividends, year);
    const ac = pick(assetsCurrent, year);
    const lc = pick(liabCurrent, year);
    const li = pick(liabilities, year);
    const roe = ni != null && eq != null && eq !== 0 ? ni / eq : null;
    const fcf = oc != null && cx != null ? oc - Math.abs(cx) : null;
    const r2 = (v: number | null) => (v == null ? null : Math.round(v * 100) / 100);
    const r4 = (v: number | null) => (v == null ? null : Math.round(v * 10000) / 10000);
    const epsRaw = pick(eps, year);
    return {
      year,
      revenue: pick(revenue, year),
      netIncome: ni,
      eps: r2(epsRaw),
      equity: eq,
      sharesDiluted: sh,
      sharesOut: pick(sharesOut, year),
      assetsCurrent: ac,
      liabCurrent: lc,
      liabilities: li,
      ltDebt: pick(ltDebt, year),
      assets: pick(assets, year),
      grossProfit: pick(grossProfit, year),
      retainedEarnings: pick(retainedEarnings, year),
      ebit: pick(ebit, year),
      ocf: oc,
      capex: cx != null ? Math.abs(cx) : null,
      dividends: dv != null ? Math.abs(dv) : null,
      buybacks: (() => { const b = pick(buybacks, year); return b != null ? Math.abs(b) : null; })(),
      roe: roe != null ? Math.round(roe * 10000) / 100 : null,
      fcf,
      bvps: eq != null && sh != null && sh !== 0 ? r2(eq / sh) : null,
      divps: dv != null && sh != null && sh !== 0 ? r4(Math.abs(dv) / sh) : null,
      currentRatio: ac != null && lc != null && lc !== 0 ? ac / lc : null,
      debtToEquity: li != null && eq != null && eq !== 0 ? li / eq : null,
    };
  });
  return { years: out, currency: "USD" };
}
