// Ticker-based logos via EODHD's public CDN (keyless, lowercase tickers).
// Anything missing 404s -> the component falls back to an initials tile.
export function logoUrl(ticker: string): string {
  const sym = ticker.toLowerCase().replace(/\//g, "-");
  return `https://eodhd.com/img/logos/US/${encodeURIComponent(sym)}.png`;
}

export function initials(name: string): string {
  const words = name
    .replace(/[,.\(\)]/g, "")
    .split(/\s+/)
    .filter((w) => w && !/^(INC|CORP|CORPORATION|COMPANY|CO|LTD|LIMITED|PLC|LLC|THE|AND|OF)$/i.test(w));
  const first = words[0]?.[0] ?? "?";
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
}
