"use client";

import { useEffect, useState } from "react";

export default function AboutBlurb({
  ticker,
  name,
  sic,
  exchange,
}: {
  ticker: string;
  name: string;
  sic?: string;
  exchange?: string;
}) {
  const [about, setAbout] = useState<{ title: string; extract: string; url: string } | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    setAbout(null);
    setDone(false);
    fetch(`/api/about/${ticker}?name=${encodeURIComponent(name)}`)
      .then(async (r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j?.about) setAbout(j.about);
        setDone(true);
      })
      .catch(() => setDone(true));
  }, [ticker, name]);

  if (!done) return <p className="muted">Loading company profile…</p>;
  if (about)
    return (
      <p>
        {about.extract}{" "}
        <a href={about.url} target="_blank" rel="noreferrer" className="muted" style={{ fontSize: 13 }}>
          Wikipedia ↗
        </a>
      </p>
    );
  const bits = [sic ? `a ${sic.toLowerCase()} company` : null, exchange ? `listed on ${exchange}` : null].filter(
    Boolean
  );
  return (
    <p className="muted">
      {name} — {bits.length ? bits.join(", ") + "." : "a US public company."} No encyclopedia
      entry found; see filings below for the full story.
    </p>
  );
}
