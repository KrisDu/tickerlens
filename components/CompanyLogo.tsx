"use client";

import { useState } from "react";
import { initials, logoUrl } from "@/lib/logos";

export default function CompanyLogo({
  ticker,
  name,
  size = 28,
}: {
  ticker: string;
  name: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const style = { width: size, height: size, borderRadius: Math.max(6, size / 4) };
  if (failed) {
    return (
      <span className="logo-fallback" style={{ ...style, fontSize: Math.max(10, size * 0.36) }} aria-hidden>
        {initials(name || ticker)}
      </span>
    );
  }
  return (
    <img
      src={logoUrl(ticker)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="logo"
      style={style}
      onError={() => setFailed(true)}
    />
  );
}
