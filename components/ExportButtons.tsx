"use client";

import type { HeadcountPoint } from "@/lib/sec";

function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 500);
}

function toCSV(points: HeadcountPoint[]): string {
  const esc = (v: string | number | null | undefined) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows = [
    ["fiscal_year", "employees", "form", "filing_date", "source", "snippet"],
    ...points.map((p) => [
      String(p.year),
      String(p.employees),
      p.form,
      p.filingDate,
      p.source,
      p.snippet ?? "",
    ]),
  ];
  return rows.map((r) => r.map(esc).join(",")).join("\n");
}

function svgToPng(svgId: string, filename: string) {
  const svg = document.getElementById(svgId) as unknown as SVGSVGElement | null;
  if (!svg) return;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  // Dark background so the PNG is readable outside the site.
  const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  bg.setAttribute("width", "100%");
  bg.setAttribute("height", "100%");
  bg.setAttribute("fill", "#0b1020");
  clone.insertBefore(bg, clone.firstChild);
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  img.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 1440;
    canvas.height = Math.round((1440 * svg.viewBox.baseVal.height) / Math.max(1, svg.viewBox.baseVal.width));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    canvas.toBlob((b) => {
      if (!b) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 500);
    }, "image/png");
  };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(xml);
}

export default function ExportButtons({
  ticker,
  points,
  svgId,
}: {
  ticker: string;
  points: HeadcountPoint[];
  svgId: string;
}) {
  if (!points.length) return null;
  return (
    <span style={{ display: "inline-flex", gap: 8 }}>
      <button
        className="btn btn-ghost"
        style={{ padding: "6px 10px" }}
        onClick={() => download(`${ticker}-headcount.csv`, toCSV(points), "text/csv")}
      >
        ↓ CSV
      </button>
      <button
        className="btn btn-ghost"
        style={{ padding: "6px 10px" }}
        onClick={() => svgToPng(svgId, `${ticker}-headcount.png`)}
      >
        ↓ PNG
      </button>
    </span>
  );
}
