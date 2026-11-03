// Raw filing helpers: 8-K item radar, Form 4 insider parsing, 10-K diff.
import {
  fetchAnnualFilings,
  findItem1ACut,
  sleep,
  stripHtml,
  type AnnualFiling,
} from "@/lib/sec";

const SEC_UA_F = process.env.SEC_CONTACT_EMAIL?.trim()
  ? `TickerLens/1.0 (${process.env.SEC_CONTACT_EMAIL.trim()})`
  : "TickerLens/1.0 (contact@tickerlens.local)";

function padCik(cik: string): string {
  return String(cik).padStart(10, "0");
}

async function submissions(cik: string) {
  const padded = padCik(cik);
  const res = await fetch(`https://data.sec.gov/submissions/CIK${padded}.json`, {
    headers: { "User-Agent": SEC_UA_F, Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`SEC submissions failed: ${res.status}`);
  return res.json();
}

export interface SimpleFiling {
  form: string;
  accession: string;
  filingDate: string;
  primaryDoc: string;
}

export async function fetchRecentForms(
  cik: string,
  forms: string[],
  limit: number
): Promise<SimpleFiling[]> {
  const j = await submissions(cik);
  const recent = j.filings?.recent;
  if (!recent) return [];
  const out: SimpleFiling[] = [];
  const n = (recent.form as string[]).length;
  for (let i = 0; i < n && out.length < limit; i++) {
    const form = String(recent.form[i]);
    if (!forms.includes(form)) continue;
    out.push({
      form,
      accession: String(recent.accessionNumber[i]),
      filingDate: String(recent.filingDate[i]),
      primaryDoc: String(recent.primaryDocument[i]),
    });
  }
  return out;
}

// Form 3/4/5: submissions' primaryDocument is the rendered HTML view
// (xslF345X06/form4.xml). The raw XML lives at the accession root —
// discover it via index.json.
export async function fetchOwnershipXml(
  cik: string,
  accession: string
): Promise<string | null> {
  const cikNum = Number(padCik(cik).replace(/^0+/, "") || "0");
  const acc = accession.replace(/-/g, "");
  try {
    const idx = await fetch(
      `https://www.sec.gov/Archives/edgar/data/${cikNum}/${acc}/index.json`,
      { headers: { "User-Agent": SEC_UA_F, Accept: "application/json" }, cache: "no-store" }
    );
    if (!idx.ok) return null;
    const j = await idx.json();
    const items: Array<{ name?: string }> = j?.directory?.item ?? [];
    const pick =
      items.find((it) => /^form[345]\.xml$/i.test(it.name ?? "")) ??
      items.find(
        (it) => /\.xml$/i.test(it.name ?? "") && !/index/i.test(it.name ?? "") && !(it.name ?? "").includes("/")
      );
    if (!pick?.name) return null;
    const res = await fetch(
      `https://www.sec.gov/Archives/edgar/data/${cikNum}/${acc}/${pick.name}`,
      { headers: { "User-Agent": SEC_UA_F, Accept: "*/*" }, cache: "no-store" }
    );
    if (!res.ok) return null;
    const xml = await res.text();
    return xml.includes("<ownershipDocument") ? xml : null;
  } catch {
    return null;
  }
}

export async function fetchFilingText(
  cik: string,
  f: Pick<SimpleFiling, "accession" | "primaryDoc">
): Promise<string | null> {
  const cikNum = Number(padCik(cik).replace(/^0+/, "") || "0");
  const acc = f.accession.replace(/-/g, "");
  const url = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${acc}/${f.primaryDoc}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": SEC_UA_F, Accept: "*/*" },
        cache: "no-store",
      });
      if (res.ok) {
        const raw = await res.text();
        return raw.length > 2000 ? raw : null;
      }
      if (res.status === 403 || res.status === 429) {
        await sleep(1500 * attempt);
        continue;
      }
      return null;
    } catch {
      await sleep(800);
    }
  }
  return null;
}

// --- 8-K items ---
export const ITEM_TITLES: Record<string, string> = {
  "1.01": "Entry into a material definitive agreement",
  "1.02": "Termination of a material definitive agreement",
  "1.03": "Bankruptcy or receivership",
  "1.04": "Mine safety reporting",
  "2.01": "Completion of acquisition or disposition of assets",
  "2.02": "Results of operations and financial condition",
  "2.03": "Creation of a direct financial obligation",
  "2.04": "Triggering events accelerating obligations",
  "2.05": "Costs of exit or disposal activities",
  "2.06": "Material impairments",
  "3.01": "Notice of delisting or failure to satisfy listing rule",
  "3.02": "Unregistered sales of equity securities",
  "3.03": "Material modification to rights of security holders",
  "4.01": "Changes in certifying accountant",
  "4.02": "Non-reliance on previously issued financial statements",
  "5.01": "Changes in control of registrant",
  "5.02": "Departure / election of directors or officers",
  "5.03": "Amendments to articles or bylaws",
  "5.04": "Temporary suspension of trading (blackout)",
  "5.05": "Amendments to code of ethics",
  "5.06": "Change in shell company status",
  "5.07": "Submission of matters to a vote of security holders",
  "5.08": "Shareholder director nominations",
  "7.01": "Regulation FD disclosure",
  "8.01": "Other events",
  "9.01": "Financial statements and exhibits",
};

export interface EightKItem {
  item: string;
  title: string;
  snippet: string;
}

export interface EightK {
  accession: string;
  filingDate: string;
  form: string;
  items: EightKItem[];
  docUrl: string;
}

export function parseEightKItems(text: string): EightKItem[] {
  const rx = /item\s+(\d\.\d{2})/gi;
  const seen = new Set<string>();
  const out: EightKItem[] = [];
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text)) !== null && out.length < 12) {
    const item = m[1];
    if (seen.has(item) || !ITEM_TITLES[item]) continue;
    seen.add(item);
    const s = Math.max(0, m.index - 60);
    out.push({
      item,
      title: ITEM_TITLES[item],
      snippet: text.slice(s, m.index + 220).replace(/\s+/g, " ").trim().slice(0, 280),
    });
  }
  return out;
}

// --- Form 4 insiders ---
export interface InsiderTx {
  date: string;
  code: string; // P = open-market buy, S = open-market sale
  side: "buy" | "sell";
  shares: number;
  price: number | null;
  ownedAfter: number | null;
}

export interface InsiderFiling {
  accession: string;
  filingDate: string;
  owner: string;
  title: string;
  isOfficer: boolean;
  isDirector: boolean;
  txs: InsiderTx[];
  netShares: number;
}

function tag(block: string, name: string): string | null {
  const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, "i").exec(block);
  return m ? m[1].trim() : null;
}

// Most Form 4 fields nest as <field><value>X</value></field>.
function fieldVal(block: string, name: string): string | null {
  const inner = tag(block, name);
  if (inner == null) return null;
  const m = /<value>([\s\S]*?)<\/value>/i.exec(inner);
  return (m ? m[1] : inner).replace(/<[^>]+>/g, "").trim() || null;
}

export function parseForm4(xml: string): Omit<InsiderFiling, "accession" | "filingDate"> | null {
  const ownerBlock = tag(xml, "reportingOwner") ?? "";
  const idBlock = tag(ownerBlock, "reportingOwnerId") ?? "";
  const owner = tag(idBlock, "rptOwnerName") ?? "Unknown";
  const rel = tag(ownerBlock, "reportingOwnerRelationship") ?? "";
  const isOfficer = /<isOfficer>1<\/isOfficer>/i.test(rel);
  const isDirector = /<isDirector>1<\/isDirector>/i.test(rel);
  const officerTitle = tag(rel, "officerTitle") ?? "";
  const txBlocks = xml.match(/<nonDerivativeTransaction>[\s\S]*?<\/nonDerivativeTransaction>/gi) ?? [];
  const txs: InsiderTx[] = [];
  for (const b of txBlocks) {
    const code = tag(tag(b, "transactionCoding") ?? "", "transactionCode") ?? "";
    if (code !== "P" && code !== "S") continue; // open-market only
    const amounts = tag(b, "transactionAmounts") ?? "";
    const shares = Number((fieldVal(amounts, "transactionShares") ?? "").replace(/,/g, ""));
    if (!isFinite(shares) || shares <= 0) continue;
    const priceRaw = fieldVal(amounts, "transactionPricePerShare");
    const price = priceRaw != null && priceRaw !== "" ? Number(priceRaw.replace(/,/g, "")) : null;
    txs.push({
      date: fieldVal(b, "transactionDate") ?? "",
      code,
      side: code === "P" ? "buy" : "sell",
      shares,
      price: price != null && isFinite(price) ? Math.round(price * 100) / 100 : null,
      ownedAfter: (() => {
        const o = Number((fieldVal(b, "sharesOwnedFollowingTransaction") ?? "").replace(/,/g, ""));
        return isFinite(o) ? o : null;
      })(),
    });
  }
  if (!txs.length) return null;
  const net = txs.reduce((a, t) => a + (t.side === "buy" ? t.shares : -t.shares), 0);
  return {
    owner: owner.replace(/\s+/g, " ").trim(),
    title: officerTitle.replace(/\s+/g, " ").trim(),
    isOfficer,
    isDirector,
    txs,
    netShares: net,
  };
}

// --- 10-K Risk Factors diff ---
export interface RiskDiff {
  newYear: number;
  oldYear: number;
  newCount: number;
  oldCount: number;
  added: string[];
  removed: string[];
  addedCount: number;
  removedCount: number;
}

function sentences(text: string): string[] {
  const raw = text.match(/[^.!?]+[.!?]+/g) ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of raw) {
    const n = s.replace(/\s+/g, " ").trim().toLowerCase();
    if (n.length < 40 || seen.has(n)) continue;
    seen.add(n);
    out.push(s.replace(/\s+/g, " ").trim());
  }
  return out;
}

function extractRiskSection(text: string): string {
  const cut = findItem1ACut(text);
  if (cut < 0) return text.slice(0, 400000);
  const after = text.slice(cut + 100);
  const end = after.search(/item\s+1[bCc][\s.\u00a0]|item\s+2[\s.\u00a0]/i);
  return end > 20000 ? after.slice(0, end) : after.slice(0, 400000);
}

export function diffRiskSections(newText: string, oldText: string): Omit<RiskDiff, "newYear" | "oldYear"> {
  const n = sentences(extractRiskSection(newText));
  const o = sentences(extractRiskSection(oldText));
  const oSet = new Set(o.map((s) => s.toLowerCase()));
  const nSet = new Set(n.map((s) => s.toLowerCase()));
  return {
    newCount: n.length,
    oldCount: o.length,
    added: n.filter((s) => !oSet.has(s.toLowerCase())).slice(0, 8),
    removed: o.filter((s) => !nSet.has(s.toLowerCase())).slice(0, 8),
    addedCount: n.filter((s) => !oSet.has(s.toLowerCase())).length,
    removedCount: o.filter((s) => !nSet.has(s.toLowerCase())).length,
  };
}

export { fetchAnnualFilings, stripHtml, type AnnualFiling };
