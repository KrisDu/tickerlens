// Tiny finance-tuned headline sentiment scorer (lexicon + negation).
// Transparent and keyless: every word weight is listed below, scores are
// shown per headline. Not a recommendation engine.

const LEXICON: Record<string, number> = {
  // Strong positive
  breakout: 2.5, record: 2.2, surge: 2.4, surges: 2.4, soars: 2.6, soar: 2.6,
  skyrockets: 2.6, beats: 2.4, beat: 2.2, smashes: 2.6, upgrade: 2.2, upgraded: 2.2,
  outperform: 2.2, bullish: 2.4, breakthrough: 2.4, booming: 2.2, triumph: 2.2,
  // Positive
  gains: 1.4, gain: 1.2, rises: 1.3, rise: 1.2, jumps: 1.6, jump: 1.4, climbs: 1.3,
  climb: 1.2, rallies: 1.6, rally: 1.5, grows: 1.3, growth: 1.2, strong: 1.4,
  profits: 1.5, profit: 1.3, profitable: 1.6, raises: 1.3, raise: 1.2, buy: 1.4,
  buys: 1.3, buyback: 1.6, dividend: 1.2, dividends: 1.2, optimistic: 1.3,
  optimism: 1.3, confident: 1.2, success: 1.4, successful: 1.4, wins: 1.4, win: 1.2,
  approval: 1.3, approved: 1.3, resilient: 1.2, recovery: 1.2, rebounds: 1.4,
  rebound: 1.3, exceeds: 1.5, tops: 1.5, bargain: 1.2, undervalued: 1.8,
  opportunity: 1.0, milestone: 1.2, expands: 1.2, expansion: 1.1, hires: 0.8,
  hiring: 0.8, launch: 0.8, launches: 0.8, deal: 0.8, partnership: 1.0,
  // Strong negative
  crashes: -2.6, crash: -2.5, plunges: -2.5, plunge: -2.4, tumbles: -2.3,
  tumble: -2.2, collapses: -2.6, collapse: -2.5, bankruptcy: -3.0, bankrupt: -2.8,
  fraud: -3.0, scandal: -2.6, misses: -2.2, miss: -2.0, downgrade: -2.3,
  downgraded: -2.2, bearish: -2.3, warning: -2.0, warns: -1.9,
  // Negative
  falls: -1.4, fall: -1.2, drops: -1.4, drop: -1.2, sinks: -1.6, sink: -1.4,
  slides: -1.3, slide: -1.2, slumps: -1.6, slump: -1.4, dips: -1.1, dip: -1.0,
  declines: -1.3, decline: -1.2, cuts: -1.5, cut: -1.3, slashes: -1.7, slash: -1.5,
  layoffs: -1.8, layoff: -1.6, fires: -1.5, weak: -1.4, weakness: -1.3,
  losses: -1.6, loss: -1.4, loses: -1.4, lose: -1.2, sell: -1.3, sells: -1.3,
  selling: -1.2, lawsuit: -1.8, sues: -1.6, probe: -1.7, investigation: -1.6,
  fine: -1.4, fined: -1.5, penalty: -1.5, recall: -1.6, recalls: -1.6,
  risk: -1.0, risky: -1.1, fears: -1.2, fear: -1.0, concerns: -1.0, concern: -0.9,
  volatile: -0.8, volatility: -0.8, overvalued: -1.6, expensive: -0.9,
  debt: -0.7, default: -2.0, delays: -1.0, delay: -0.9, shortage: -1.1,
  resigns: -1.2, exits: -1.0, pessimistic: -1.3, gloom: -1.3, bleak: -1.3,
};

const NEGATORS = new Set(["not", "no", "never", "n't", "without", "hardly", "barely", "fails", "fail", "failed"]);

export interface ScoredHeadline {
  title: string;
  publisher: string;
  link: string;
  publishedAt: string;
  score: number; // -1..1
  label: "bullish" | "bearish" | "neutral";
}

export function scoreText(text: string): number {
  const toks = text.toLowerCase().replace(/[^a-z'\s]/g, " ").split(/\s+/).filter(Boolean);
  let sum = 0;
  for (let i = 0; i < toks.length; i++) {
    const w = toks[i].replace(/'s$/, "");
    const base = LEXICON[w];
    if (base == null) continue;
    // Negation in the previous 3 tokens flips the weight.
    let neg = false;
    for (let k = Math.max(0, i - 3); k < i; k++) {
      const t = toks[k];
      if (NEGATORS.has(t) || t.endsWith("n't")) {
        neg = true;
        break;
      }
    }
    sum += neg ? -base : base;
  }
  if (sum === 0) return 0;
  return Math.max(-1, Math.min(1, sum / Math.sqrt(sum * sum + 12)));
}

export function labelFor(score: number): ScoredHeadline["label"] {
  if (score >= 0.3) return "bullish";
  if (score <= -0.3) return "bearish";
  return "neutral";
}

export function scoreHeadlines(
  items: Array<{ title: string; publisher: string; link: string; publishedAt: string }>
): { score: number; label: ScoredHeadline["label"]; counts: { bullish: number; bearish: number; neutral: number }; items: ScoredHeadline[] } {
  const scored: ScoredHeadline[] = items.map((h) => {
    const score = Math.round(scoreText(h.title) * 100) / 100;
    return { ...h, score, label: labelFor(score) };
  });
  const counts = {
    bullish: scored.filter((s) => s.label === "bullish").length,
    bearish: scored.filter((s) => s.label === "bearish").length,
    neutral: scored.filter((s) => s.label === "neutral").length,
  };
  const avg = scored.length
    ? Math.round((scored.reduce((a, s) => a + s.score, 0) / scored.length) * 100) / 100
    : 0;
  return { score: avg, label: labelFor(avg), counts, items: scored };
}
