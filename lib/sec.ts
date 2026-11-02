export interface CompanyEntry {
  cik: string; // 10-digit padded
  cikNum: number;
  ticker: string;
  name: string;
}

export interface HeadcountPoint {
  year: number;
  employees: number;
  filingDate: string;
  form: string;
  fyEnd: string;
  source: "XBRL" | "10-K" | "20-F" | "40-F";
  snippet?: string;
}

export interface Person {
  id: string;
  name: string;
  role: string;
  start: string; // YYYY or YYYY-MM
  end: string | null; // null = present
  status: "present" | "past";
  bio: string;
  source?: string;
  custom?: boolean;
}

const SEC_UA = "TickerLens/1.0 (+https://github.com/KrisDu/tickerlens)";

export function padCik(cik: number | string): string {
  return String(cik).padStart(10, "0");
}

// --- server-side fetch helpers (use in API routes) ---
export async function fetchTickersServer(): Promise<CompanyEntry[]> {
  const res = await fetch("https://www.sec.gov/files/company_tickers.json", {
    headers: { "User-Agent": SEC_UA, Accept: "application/json" },
    next: { revalidate: 86400 },
  });
  if (!res.ok) throw new Error(`SEC tickers failed: ${res.status}`);
  const json = (await res.json()) as Record<
    string,
    { cik_str: number; ticker: string; title: string }
  >;
  return Object.values(json)
    .map((v) => ({
      cik: padCik(v.cik_str),
      cikNum: v.cik_str,
      ticker: v.ticker.toUpperCase(),
      name: v.title,
    }))
    .sort((a, b) => a.ticker.localeCompare(b.ticker));
}

export async function fetchHeadcountServer(
  cik: string
): Promise<HeadcountPoint[]> {
  const padded = padCik(cik);
  const urls = [
    `https://data.sec.gov/api/xbrl/companyconcept/CIK${padded}/dei/EntityNumberOfEmployees.json`,
    `https://data.sec.gov/api/xbrl/companyfacts/CIK${padded}.json`,
  ];
  // Try companyconcept first
  try {
    const r = await fetch(urls[0], {
      headers: { "User-Agent": SEC_UA, Accept: "application/json" },
      next: { revalidate: 3600 },
    });
    if (r.ok) {
      const j = await r.json();
      const units = j?.units?.["pure"] ?? j?.units?.["Employees"] ?? [];
      const pts = normalizeUnits(units);
      if (pts.length) return pts;
    }
  } catch {
    // fall through
  }
  // Fallback: companyfacts, scan for EntityNumberOfEmployees
  const r2 = await fetch(urls[1], {
    headers: { "User-Agent": SEC_UA, Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!r2.ok) throw new Error(`SEC facts failed: ${r2.status}`);
  const facts = await r2.json();
  const candidates: string[] = [
    "EntityNumberOfEmployees",
    "Employees",
    "NumberOfEmployees",
  ];
  for (const key of candidates) {
    const node =
      facts?.facts?.dei?.[key] ?? facts?.facts?.["srt"]?.[key] ?? null;
    const units =
      node?.units?.["pure"] ?? node?.units?.["Employees"] ?? node?.units
        ? flattenUnits(node?.units)
        : [];
    const pts = normalizeUnits(units);
    if (pts.length) return pts;
  }
  return [];
}

function flattenUnits(units: Record<string, unknown[]> | undefined): unknown[] {
  if (!units) return [];
  return Object.values(units).flat();
}

// Keep one point per fiscal year: prefer 10-K, latest filing per year
function normalizeUnits(units: unknown[]): HeadcountPoint[] {
  const rows = (units as Array<Record<string, string | number>>)
    .filter((u) => typeof u?.val === "number")
    .map((u) => ({
      fy: Number(String(u.fy ?? u.filed?.toString().slice(0, 4) ?? 0)),
      end: String(u.end ?? ""),
      filed: String(u.filed ?? ""),
      form: String(u.form ?? ""),
      val: Number(u.val),
    }))
    .filter((r) => r.val > 0 && r.fy >= 2000 && r.fy <= 2030);
  const byYear = new Map<number, (typeof rows)[number]>();
  const formRank = (f: string) =>
    f === "10-K" ? 0 : f === "10-K/A" ? 1 : f === "20-F" ? 2 : 3;
  for (const r of rows) {
    const cur = byYear.get(r.fy);
    if (!cur) byYear.set(r.fy, r);
    else {
      if (
        formRank(r.form) < formRank(cur.form) ||
        (r.form === cur.form && r.filed > cur.filed)
      )
        byYear.set(r.fy, r);
    }
  }
  return Array.from(byYear.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, r]) => ({
      year,
      employees: r.val,
      filingDate: r.filed,
      form: r.form,
      fyEnd: r.end,
      source: "XBRL" as const,
    }));
}

export async function fetchCompanyInfoServer(cik: string) {
  const padded = padCik(cik);
  const res = await fetch(`https://data.sec.gov/submissions/CIK${padded}.json`, {
    headers: { "User-Agent": SEC_UA, Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`SEC submissions failed: ${res.status}`);
  const j = await res.json();
  return {
    cik: padded,
    name: j.name as string,
    tickers: (j.tickers ?? []) as string[],
    exchanges: (j.exchanges ?? []) as string[],
    sic: j.sic as string | undefined,
    sicDescription: j.sicDescription as string | undefined,
    fiscalYearEnd: j.fiscalYearEnd as string | undefined,
    addresses: j.addresses as unknown,
    filings: j.filings?.recent
      ? {
          forms: (j.filings.recent.form as string[]).slice(0, 12),
          filingDates: (j.filings.recent.filingDate as string[]).slice(0, 12),
          accessionNumbers: (
            j.filings.recent.accessionNumber as string[]
          ).slice(0, 12),
        }
      : null,
  };
}

// --- 10-K / 20-F / 40-F "Human Capital" text parsing fallback ---
// Most mega-cap filers never tag headcount in XBRL, but every 10-K Item 1
// discloses it in prose ("employed approximately 164,000..."). We fetch the
// main filing document from the EDGAR archive and extract it with patterns.

interface AnnualFiling {
  form: string;
  accession: string;
  filingDate: string;
  primaryDoc: string;
  fiscalYearEnd?: string;
}

async function fetchAnnualFilings(
  cik: string,
  maxYears = 25
): Promise<AnnualFiling[]> {
  const padded = padCik(cik);
  const res = await fetch(`https://data.sec.gov/submissions/CIK${padded}.json`, {
    headers: { "User-Agent": SEC_UA, Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`SEC submissions failed: ${res.status}`);
  const j = await res.json();
  const recent = j.filings?.recent;
  if (!recent) return [];
  const out: AnnualFiling[] = [];
  const seen = new Set<string>();
  const push = (
    form: string,
    accession: string,
    filingDate: string,
    primaryDoc: string
  ) => {
    if (form !== "10-K" && form !== "20-F" && form !== "40-F") return false;
    const key = `${form}:${String(filingDate).slice(0, 4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    out.push({
      form,
      accession: String(accession),
      filingDate: String(filingDate),
      primaryDoc: String(primaryDoc),
      fiscalYearEnd: j.fiscalYearEnd as string | undefined,
    });
    return true;
  };
  const n = (recent.form as string[]).length;
  for (let i = 0; i < n && out.length < maxYears; i++) {
    push(
      String(recent.form[i]),
      String(recent.accessionNumber[i]),
      String(recent.filingDate[i]),
      String(recent.primaryDocument[i])
    );
  }
  // Older filings spill into separate archive files (recent caps at 1000
  // entries — heavy insider filers like MSFT exhaust it in ~5 years).
  const files = (j.filings?.files ?? []) as Array<{ name: string }>;
  for (const f of files) {
    if (out.length >= maxYears) break;
    try {
      const r = await fetch(`https://data.sec.gov/submissions/${f.name}`, {
        headers: { "User-Agent": SEC_UA, Accept: "application/json" },
        next: { revalidate: 3600 },
      });
      if (!r.ok) continue;
      const old = await r.json();
      const m = (old.form as string[]).length;
      for (let i = 0; i < m && out.length < maxYears; i++) {
        push(
          String(old.form[i]),
          String(old.accessionNumber[i]),
          String(old.filingDate[i]),
          String(old.primaryDocument[i])
        );
      }
    } catch {
      // ignore single-file failures
    }
  }
  return out;
}

const HEADCOUNT_PATTERNS: RegExp[] = [
  /approximately\s+(\d{1,3}(?:,\d{3})+|\d{4,})\s+(?:full-time\s+)?(?:equivalent\s+)?employees/i,
  /(\d{1,3}(?:,\d{3})+|\d{4,})\s+(?:full-time\s+)?(?:equivalent\s+)?employees/i,
  /(?:had|has|have)\s+(?:approximately\s+|about\s+)?(\d{1,3}(?:,\d{3})+|\d{4,})\s+(?:full-time\s+)?(?:equivalent\s+)?employees?/i,
  /employ(?:s|ed)?\s+(?:a\s+total\s+of\s+|a\s+workforce\s+of\s+|approximately\s+|about\s+)?(\d{1,3}(?:,\d{3})+|\d{4,})/i,
  /workforce\s+of\s+(?:approximately\s+|about\s+)?(\d{1,3}(?:,\d{3})+|\d{4,})/i,
  /headcount\s+of\s+(?:approximately\s+|about\s+)?(\d{1,3}(?:,\d{3})+|\d{4,})/i,
  /(?:employee\s+)?population\s+(?:was|were|is|of)?\s*:?\s*(?:approximately\s+|about\s+)?(\d{1,3}(?:,\d{3})+|\d{4,})/i,
  /total\s+(?:number\s+of\s+)?employees?\s+(?:was|were|is)?\s*:?\s*(?:approximately\s+|about\s+)?(\d{1,3}(?:,\d{3})+|\d{4,})/i,
];

function toNum(s: string): number {
  return Number(s.replace(/,/g, ""));
}

// Reject matches that are really about money/shares (comp tables), not people.
function looksLikeMoneyOrShares(snippet: string, numStart: number): boolean {
  const window = snippet.slice(Math.max(0, numStart - 12), numStart + 12);
  return /[$]|shares?|options?|rsus?|per\s+share|dollars?/i.test(window);
}

// Item 1A heading ends the Item 1 Business section (home of the headcount
// disclosure). Must skip Table-of-Contents entries like
// "Item 1A. Risk Factors 5 Item 1B..." — those also match /item 1a/.
function findItem1ACut(text: string): number {
  const rx = /item\s+1a[\s.\u00a0]+/gi;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(text)) !== null) {
    if (m.index > 1500000) break;
    if (m.index < 15000) continue;
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + 120);
    if (/^risk factors\s+\d{1,3}\s+item\s+1[b-z]/i.test(after)) continue; // TOC
    if (!/^risk factors/i.test(after)) continue; // cross-reference, not heading
    return m.index;
  }
  return -1;
}

export function extractHeadcountFromText(
  rawText: string
): { employees: number; snippet: string } | null {
  // Search the Human Capital subsection first (most precise), then the
  // whole Item 1 Business section, then the document head as a fallback.
  const zones: string[] = [];
  const hc = rawText.search(/human capital/i);
  if (hc >= 0) zones.push(rawText.slice(Math.max(0, hc - 1500), hc + 15000));
  const cut = findItem1ACut(rawText);
  if (cut > 60000) zones.push(rawText.slice(0, cut));
  zones.push(rawText.slice(0, 900000));
  for (const text of zones) {
    const hit = searchZoneForHeadcount(text);
    if (hit) return hit;
  }
  return null;
}

function searchZoneForHeadcount(
  text: string
): { employees: number; snippet: string } | null {
  interface Cand {
    val: number;
    index: number;
    patIdx: number;
    matchLen: number;
  }
  const cands: Cand[] = [];
  HEADCOUNT_PATTERNS.forEach((re, patIdx) => {
    const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
    const rx = new RegExp(re.source, flags);
    let m: RegExpExecArray | null;
    while ((m = rx.exec(text)) !== null) {
      const val = toNum(m[1]);
      if (val < 1 || val > 50000000) continue;
      // Years ("employees at June 30, 2004") are never headcounts.
      if (val >= 1900 && val <= 2100) continue;
      const absStart = m.index + m[0].indexOf(m[1]);
      if (looksLikeMoneyOrShares(text, absStart)) continue;
      cands.push({ val, index: m.index, patIdx, matchLen: m[0].length });
      // Avoid pathological runaway on huge zones.
      if (cands.length > 40) break;
    }
  });
  if (!cands.length) return null;
  const near = (c: Cand, rx: RegExp, radius: number) =>
    rx.test(text.slice(Math.max(0, c.index - radius), c.index + c.matchLen + radius));
  const scored = cands.map((c) => {
    let score = c.patIdx;
    // Headline disclosures say full-time / total / workforce / employed...
    if (near(c, /full-time|workforce|headcount|population/i, 60)) score -= 10;
    if (near(c, /\btotal\b|employed|people/i, 60)) score -= 5;
    // ...not carve-outs ("25,000 employees transferred in the acquisition").
    if (near(c, /acqui|transfer|divest|spin-?off|joined/i, 80)) score += 10;
    return { c, score };
  });
  scored.sort((a, b) => a.score - b.score || a.c.index - b.c.index);
  const win = scored[0].c;
  const s = Math.max(0, win.index - 90);
  const snippet =
    (s > 0 ? "…" : "") +
    text.slice(s, win.index + win.matchLen + 90).replace(/\s+/g, " ").trim();
  return { employees: win.val, snippet };
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;|&#32;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => {
      try {
        return String.fromCharCode(Number(n));
      } catch {
        return " ";
      }
    })
    .replace(/&(amp|lt|gt|quot);/g, " ")
    .replace(/\s+/g, " ");
}

function inferFiscalYear(
  coverText: string,
  filingDate: string,
  fiscalYearEnd?: string
): number {
  const m = coverText
    .slice(0, 60000)
    .match(/fiscal\s+(?:year\s+)?ended\s+[A-Za-z]+\s+\d{1,2},?\s+(\d{4})/i);
  if (m) {
    const y = Number(m[1]);
    if (y >= 2000 && y <= 2030) return y;
  }
  const filingYear = Number(filingDate.slice(0, 4));
  const mm = fiscalYearEnd ? Number(fiscalYearEnd.slice(0, 2)) : 12;
  const filingMonth = Number(filingDate.slice(5, 7));
  // Dec year-end 10-Ks file Feb-Mar of the next year; Sep year-ends file same year.
  return filingMonth < mm ? filingYear - 1 : filingYear;
}

// Success-only cache for filing parses (fetch failures are never cached,
// so a throttled run recovers on the next request). 7-day TTL.
const filingCache = new Map<string, { at: number; point: HeadcountPoint | null }>();
const FILING_CACHE_TTL = 7 * 24 * 3600 * 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function parseFilingHeadcount(
  cikNum: number,
  f: AnnualFiling
): Promise<HeadcountPoint | null> {
  const cacheKey = `${cikNum}:${f.accession}`;
  const hit = filingCache.get(cacheKey);
  if (hit && Date.now() - hit.at < FILING_CACHE_TTL) return hit.point;

  const acc = f.accession.replace(/-/g, "");
  const url = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${acc}/${f.primaryDoc}`;
  let html: string | null = null;
  let lastStatus = 0;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(url, {
      headers: { "User-Agent": SEC_UA, Accept: "text/html,*/*" },
      cache: "no-store",
    });
    lastStatus = res.status;
    if (res.ok) {
      html = await res.text();
      break;
    }
    if (res.status === 403 || res.status === 429) {
      await sleep(1500 * attempt);
      continue;
    }
    console.log(`[headcount] ${f.accession} status=${res.status} (no retry)`);
    return null;
  }
  console.log(
    `[headcount] ${f.accession} status=${lastStatus} bytes=${html ? html.length : 0}`
  );
  if (!html || html.length < 5000) return null;
  const text = stripHtml(html);
  const found = extractHeadcountFromText(text);
  console.log(
    `[headcount] ${f.accession} extracted=${found ? found.employees : "MISS"}`
  );
  const point: HeadcountPoint | null = found
    ? {
        year: inferFiscalYear(text, f.filingDate, f.fiscalYearEnd),
        employees: found.employees,
        filingDate: f.filingDate,
        form: f.form,
        fyEnd: f.fiscalYearEnd ?? "",
        source: f.form as HeadcountPoint["source"],
        snippet: found.snippet.slice(0, 280),
      }
    : null;
  filingCache.set(cacheKey, { at: Date.now(), point });
  return point;
}

export async function fetchFilingHeadcount(
  cik: string,
  maxYears = 25
): Promise<HeadcountPoint[]> {
  const padded = padCik(cik);
  const cikNum = Number(padded.replace(/^0+/, "") || "0");
  const filings = await fetchAnnualFilings(padded, maxYears);
  const byYear = new Map<number, HeadcountPoint>();
  // Sequential + polite delay to stay under SEC rate limits.
  for (const f of filings) {
    try {
      const p = await parseFilingHeadcount(cikNum, f);
      if (p && !byYear.has(p.year)) byYear.set(p.year, p);
    } catch {
      // ignore single-filing failures
    }
    await sleep(350);
  }
  return Array.from(byYear.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, p]) => p);
}

// Merged series: XBRL facts win on year conflicts, filing text fills the rest.
export async function fetchHeadcountMerged(
  cik: string,
  maxYears = 25
): Promise<{
  points: HeadcountPoint[];
  xbrlCount: number;
  filingCount: number;
}> {
  const [xbrl, filings] = await Promise.all([
    fetchHeadcountServer(cik).catch(() => [] as HeadcountPoint[]),
    fetchFilingHeadcount(cik, maxYears).catch(() => [] as HeadcountPoint[]),
  ]);
  const byYear = new Map<number, HeadcountPoint>();
  for (const p of filings) byYear.set(p.year, p);
  for (const p of xbrl) byYear.set(p.year, p); // XBRL preferred
  const points = Array.from(byYear.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, p]) => p);
  return { points, xbrlCount: xbrl.length, filingCount: filings.length };
}

// --- Officer tenure from 10-K/20-F/40-F SIGNATURES blocks ---
// Each annual filing is signed "/s/ Jane Smith" next to a title such as
// "Principal Executive Officer". Tracking signatories per year reveals
// real CEO/CFO succession without any curated data.
export interface OfficerRecord {
  year: number;
  ceo: string | null;
  cfo: string | null;
  filingDate: string;
  form: string;
}

const officerCache = new Map<string, { at: number; rec: OfficerRecord | null }>();
const OFFICER_TTL = 7 * 24 * 3600 * 1000;

function findOfficer(
  zone: string,
  titleRx: RegExp
): string | null {
  const flags = titleRx.flags.includes("g") ? titleRx.flags : titleRx.flags + "g";
  const rx = new RegExp(titleRx.source, flags);
  let m: RegExpExecArray | null;
  while ((m = rx.exec(zone)) !== null) {
    const back = zone.slice(Math.max(0, m.index - 350), m.index);
    // Nearest "/s/ Name" above the title (blocks list several signatories).
    const sigs = [...back.matchAll(/\/s\/\s*([A-Z][A-Za-z.'-]+(?:\s+[A-Z][A-Za-z.'-]+){1,3})/g)];
    const last = sigs[sigs.length - 1];
    if (last) {
      const cleaned = cleanSignatureName(last[1]);
      if (cleaned && cleaned.split(/\s+/).length >= 2) return cleaned;
    }
  }
  return null;
}

// Signature blocks print "/s/ First Last" followed by the printed name and
// title on the next lines, which collapse into one run of capitalized words
// ("Timothy D. Cook Chief", "Luca Maestri Luca Maestri"). Clean those up.
function cleanSignatureName(raw: string): string {
  let toks = raw.trim().split(/\s+/);
  const isTitle = (w: string) =>
    /^(chief|executive|financial|principal|officer|director|president|chairman|chairwoman|vice|senior|accounting|treasurer|secretary|controller|manager|member|partner|founder|owner|trustee|duly|authorized)$/i.test(
      w.replace(/\./g, "")
    );
  const norm = (w: string) => w.toLowerCase().replace(/\./g, "");
  // Drop trailing title words and suffixes.
  while (toks.length && (isTitle(toks[toks.length - 1]) || /^(jr|sr|ii|iii|iv)$/i.test(toks[toks.length - 1].replace(/\./g, "")))) toks.pop();
  // Collapse "Luca Maestri Luca Maestri" -> "Luca Maestri".
  if (toks.length % 2 === 0 && toks.length >= 4) {
    const half = toks.length / 2;
    if (toks.slice(0, half).map(norm).join(" ") === toks.slice(half).map(norm).join(" "))
      toks = toks.slice(0, half);
  }
  // Drop a trailing repeat of the first name ("Timothy D. Cook TIMOTHY").
  while (toks.length > 2 && norm(toks[toks.length - 1]) === norm(toks[0])) toks.pop();
  // Drop a leading repeat ("COOK Timothy D. Cook" style artifacts).
  while (toks.length > 2 && norm(toks[0]) === norm(toks[toks.length - 1])) toks.shift();
  return toks.join(" ").trim();
}

export function extractOfficersFromText(
  rawText: string
): { ceo: string | null; cfo: string | null } {
  const sig = rawText.search(/signatures/i);
  const zone =
    sig >= 0 ? rawText.slice(sig, sig + 50000) : rawText.slice(0, 250000);
  // Prefer explicit "Principal ..." titles, fall back to Chief titles.
  const ceo =
    findOfficer(zone, /Principal Executive Officer/i) ??
    findOfficer(zone, /Chief Executive Officer/i);
  const cfo =
    findOfficer(zone, /Principal Financial Officer/i) ??
    findOfficer(zone, /Chief Financial Officer/i);
  return { ceo, cfo };
}

async function parseFilingOfficers(
  cikNum: number,
  f: AnnualFiling
): Promise<OfficerRecord | null> {
  const cacheKey = `off:${cikNum}:${f.accession}`;
  const hit = officerCache.get(cacheKey);
  if (hit && Date.now() - hit.at < OFFICER_TTL) return hit.rec;
  const acc = f.accession.replace(/-/g, "");
  const url = `https://www.sec.gov/Archives/edgar/data/${cikNum}/${acc}/${f.primaryDoc}`;
  let html: string | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": SEC_UA, Accept: "text/html,*/*" },
        cache: "no-store",
      });
      if (res.ok) {
        html = await res.text();
        break;
      }
      if (res.status === 403 || res.status === 429) {
        await sleep(1200 * attempt);
        continue;
      }
      officerCache.set(cacheKey, { at: Date.now(), rec: null });
      return null;
    } catch {
      await sleep(800);
    }
  }
  if (!html || html.length < 5000) {
    officerCache.set(cacheKey, { at: Date.now(), rec: null });
    return null;
  }
  const text = stripHtml(html);
  const { ceo, cfo } = extractOfficersFromText(text);
  const rec: OfficerRecord | null =
    ceo || cfo
      ? {
          year: inferFiscalYear(text, f.filingDate, f.fiscalYearEnd),
          ceo,
          cfo,
          filingDate: f.filingDate,
          form: f.form,
        }
      : null;
  officerCache.set(cacheKey, { at: Date.now(), rec });
  return rec;
}

export async function fetchOfficers(
  cik: string,
  maxYears = 12
): Promise<OfficerRecord[]> {
  const padded = padCik(cik);
  const cikNum = Number(padded.replace(/^0+/, "") || "0");
  const filings = await fetchAnnualFilings(padded, maxYears);
  const byYear = new Map<number, OfficerRecord>();
  for (const f of filings) {
    try {
      const r = await parseFilingOfficers(cikNum, f);
      if (r && !byYear.has(r.year)) byYear.set(r.year, r);
    } catch {
      // ignore single-filing failures
    }
    await sleep(300);
  }
  return Array.from(byYear.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([, r]) => r);
}
