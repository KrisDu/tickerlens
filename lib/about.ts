const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TickerLens/1.0";

export interface About {
  title: string;
  extract: string;
  url: string;
}

// Company description via Wikipedia: opensearch finds the article, the
// summary endpoint gives a 2-3 sentence extract. Skips disambiguation pages.
export async function fetchWikipediaAbout(
  name: string
): Promise<About | null> {
  const stripped = name
    .replace(/,?\s+(INC|CORP|CORPORATION|COMPANY|CO|LTD|LIMITED|PLC|LLC|INCORPORATED)\.?$/i, "")
    .trim();
  // Try the full legal name first ("Apple Inc" -> the company, not the fruit),
  // then the stripped name as a fallback.
  const queries = [name.trim(), stripped].filter((q, i, a) => q.length > 2 && a.indexOf(q) === i);
  try {
    for (const query of queries) {
      const search = await fetch(
        `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=3&format=json`,
        { headers: { "User-Agent": UA, Accept: "application/json" }, next: { revalidate: 604800 } }
      );
      if (!search.ok) continue;
      const [, titles, , urls] = (await search.json()) as [string, string[], string[], string[]];
      // Prefer titles sharing the most words with the query ("Apple Inc."
      // beats "Apple" the fruit).
      const qwords = new Set(query.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 1 && !/^(inc|corp|corporation|company|co|ltd|limited|plc|llc)$/.test(w)));
      const ranked = (titles ?? [])
        .map((t, i) => ({ t, i }))
        .sort((a, b) => {
          const overlap = (t: string) =>
            t.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => qwords.has(w)).length;
          return overlap(b.t) - overlap(a.t);
        });
      for (const { t: title, i } of ranked) {
        if (!title || /\(disambiguation\)/i.test(title)) continue;
        const sum = await fetch(
          `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
          { headers: { "User-Agent": UA, Accept: "application/json" }, next: { revalidate: 604800 } }
        );
        if (!sum.ok) continue;
        const j = await sum.json();
        if (j?.type === "disambiguation" || !j?.extract) continue;
        const extract = firstSentences(String(j.extract), 380);
        if (extract.length < 40) continue;
        return { title: String(j.title ?? title), extract, url: String(j.content_urls?.desktop?.page ?? urls?.[i] ?? "") };
      }
      // No usable article for this query — try the next name variant.
    }
    return null;
  } catch {
    return null;
  }
}

function firstSentences(text: string, max: number): string {
  const parts = text.replace(/\s+/g, " ").trim().match(/[^.!?]+[.!?]+/g) ?? [text];
  let out = "";
  for (const s of parts) {
    if ((out + " " + s).trim().length > max && out) break;
    out = (out + " " + s).trim();
  }
  return out || text.slice(0, max);
}
