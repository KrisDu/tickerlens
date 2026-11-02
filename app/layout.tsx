import type { Metadata } from "next";
import "./globals.css";
import TickerSearch from "@/components/TickerSearch";

export const metadata: Metadata = {
  title: "TickerLens — Every Public Company, Every Headcount",
  description:
    "Search every US public company. Live headcount from SEC EDGAR filings, officer tenure, quotes, news, and leaderboards.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <a className="brand" href="/">
            <span className="brand-mark">TL</span>
            <span className="brand-text">
              TickerLens
              <small>SEC filings · headcount · markets</small>
            </span>
          </a>
          <nav className="topnav">
            <a href="/">Explorer</a>
            <a href="/leaderboard">Leaderboards</a>
            <a href="/watchlist">Watchlist</a>
            <a
              href="https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany"
              target="_blank"
              rel="noreferrer"
            >
              SEC EDGAR ↗
            </a>
            <a
              href="https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json"
              target="_blank"
              rel="noreferrer"
            >
              API docs ↗
            </a>
          </nav>
          <TickerSearch />
        </header>
        <main className="wrap">{children}</main>
        <footer className="footer">
          Headcount from live SEC EDGAR filings (XBRL + parsed 10-K/20-F text).
          People timelines are curated. Quotes: Yahoo (delayed) or Finnhub/Twelve Data if keyed. Not investment advice.
        </footer>
      </body>
    </html>
  );
}
