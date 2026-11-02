import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface NewsItem {
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
}

function clean(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}

// Google News RSS is keyless and works server-side. Title format is
// "Headline text - Publisher"; split on the LAST " - ".
export async function GET(
  req: Request,
  { params }: { params: { ticker: string } }
) {
  const ticker = params.ticker.toUpperCase();
  try {
    const { searchParams } = new URL(req.url);
    const name = (searchParams.get("name") ?? "").trim();
    const query = encodeURIComponent(
      name ? `${ticker} ${name} stock` : `${ticker} stock market`
    );
    const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) TickerLens/1.0",
        Accept: "application/rss+xml, application/xml, */*",
      },
      next: { revalidate: 900 }, // 15 min
    });
    if (!res.ok) throw new Error(`Google News RSS HTTP ${res.status}`);
    const xml = await res.text();
    const items: NewsItem[] = [];
    const blocks = xml.match(/<item>([\s\S]*?)<\/item>/g) ?? [];
    for (const b of blocks.slice(0, 8)) {
      const t = /<title>([\s\S]*?)<\/title>/.exec(b)?.[1] ?? "";
      const link = /<link>([\s\S]*?)<\/link>/.exec(b)?.[1]?.trim() ?? "";
      const pub = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(b)?.[1]?.trim() ?? "";
      const full = clean(t);
      const dash = full.lastIndexOf(" - ");
      const title = dash > 0 ? full.slice(0, dash) : full;
      const publisher =
        dash > 0
          ? full.slice(dash + 3)
          : clean(/<source[\s\S]*?>([\s\S]*?)<\/source>/.exec(b)?.[1] ?? "");
      if (title && link) items.push({ title, publisher, link, publishedAt: pub });
    }
    return NextResponse.json({ ticker, count: items.length, items });
  } catch (e) {
    return NextResponse.json(
      { ticker, count: 0, items: [], error: String(e) },
      { status: 502 }
    );
  }
}
