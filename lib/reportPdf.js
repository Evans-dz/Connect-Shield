// lib/reportPdf.js
// ─────────────────────────────────────────────────────────────────────────────
// Connect Shield — branded compliance report PDF generator.
//
// Builds a print-grade, auditor-presentable PDF from the same data the Dashboard
// renders. Deliberately PROGRAMMATIC (real vector text, real page breaks, real
// repeating headers) rather than a screenshot of the dark UI — auditors print
// these, and rasterized dark-theme screenshots print badly.
//
// jsPDF + jspdf-autotable are loaded from CDN on first use, matching the pattern
// already used for pdf.js / SheetJS / mammoth in ConnectShieldApp.jsx. No
// package.json change, no bundle weight until someone actually clicks download.
//
// TWO MODES, named by PURPOSE (never by audience):
//   full    — "Full Compliance Analysis": everything, including the interpretive
//             layer (critical findings, recommended actions).
//   summary — "Compliance Summary": scores, measures, report inventory,
//             provenance, methodology. No interpretive findings/remedies.
// Mode is only a PRESET over the section list; the caller can override any
// section in either mode.
// ─────────────────────────────────────────────────────────────────────────────

// ── Brand tokens (mirrors the dashboard palette, retuned for white paper) ─────
const NAVY   = [20, 33, 61];     // #14213D
const BRONZE = [184, 134, 63];   // #B8863F
const INK    = [22, 32, 46];     // #16202E
const SLATE  = [100, 112, 138];  // #64708A
const MUTE   = [137, 146, 163];  // #8992A3
const LINE   = [227, 231, 237];  // #E3E7ED
const WASH   = [249, 250, 251];
const RED    = [209, 67, 67];    // #D14343
const AMBER  = [201, 138, 31];   // #C98A1F
const GREEN  = [46, 158, 98];    // #2E9E62
const WHITE  = [255, 255, 255];

// US Letter in millimetres — auditors are US-based, so Letter not A4.
const PAGE = { w: 215.9, h: 279.4 };
const M = { left: 18, right: 18, top: 30, bottom: 24 };
const CONTENT_W = PAGE.w - M.left - M.right;

const CDN_JSPDF =
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
const CDN_AUTOTABLE =
  "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";

// Candidate paths for the square Connect Shield mark, tried in order. The mark
// is self-contained (bronze tile + navy shield), so it reads correctly on both
// the white cover and the navy running header. If none resolve, we draw a vector
// fallback so the report never fails just because an asset moved.
const LOGO_CANDIDATES = [
  "/connect-shield-mark.png",
  "/icon.png",
  "/apple-icon.png",
  "/favicon.png",
];

// ── Section catalogue ────────────────────────────────────────────────────────
// `interpretive: true` marks Connect Shield's own analysis layer — findings and
// recommended actions. Those are what the Compliance Summary preset drops.
export const REPORT_SECTIONS = [
  { id: "summary",     label: "Executive summary",              interpretive: false },
  { id: "ssvi",        label: "SSVI measure breakdown",         interpretive: false },
  { id: "cap",         label: "Medicare CAP & beneficiary",     interpretive: false },
  { id: "psr",         label: "PS&R leading indicators",        interpretive: false },
  { id: "pepper",      label: "PEPPER target areas",            interpretive: false },
  { id: "cahps",       label: "CAHPS survey results",           interpretive: false },
  { id: "qapi",        label: "QAPI program components",        interpretive: false },
  { id: "quality",     label: "Quality & survey metrics",       interpretive: false },
  { id: "findings",    label: "Critical findings",              interpretive: true  },
  { id: "categories",  label: "Category breakdown & actions",   interpretive: true  },
  { id: "methodology", label: "Methodology & data sources",     interpretive: false },
];

export const MODES = {
  full:    { id: "full",    title: "Full Compliance Analysis" },
  summary: { id: "summary", title: "Compliance Summary" },
};

// Preset for a mode: everything for `full`; everything except the interpretive
// layer for `summary`.
export function presetFor(mode) {
  const out = {};
  REPORT_SECTIONS.forEach((s) => {
    out[s.id] = mode === "summary" ? !s.interpretive : true;
  });
  return out;
}

// ── Small formatters (kept local so this file has no app dependencies) ───────
const num = (n, dec = 0) =>
  n != null && n !== "" && !isNaN(Number(n))
    ? Number(n).toLocaleString(undefined, { maximumFractionDigits: dec })
    : "—";
const money = (n) => (n != null && !isNaN(Number(n)) ? `$${num(n)}` : "—");
const pct = (n, dec = 1) =>
  n != null && !isNaN(Number(n)) ? `${Number(n).toFixed(dec)}%` : "—";
const dash = (v) => (v == null || v === "" ? "—" : String(v));

function ordinal(n) {
  if (n == null || isNaN(Number(n))) return "—";
  const i = Math.round(Number(n));
  const v = i % 100;
  if (v >= 11 && v <= 13) return `${i}th`;
  const suf = ["th", "st", "nd", "rd"][i % 10] || "th";
  return `${i}${suf}`;
}

function longDate(d) {
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function shortDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

const ssviLabelFor = (s) =>
  s == null ? "Not published" : s <= 4 ? "Low variation" : s <= 7 ? "Moderate variation" : "High variation";
const ssviTone = (s) => (s == null ? SLATE : s <= 4 ? GREEN : s <= 7 ? AMBER : RED);
const scoreTone = (s) => (s == null ? SLATE : s >= 85 ? GREEN : s >= 70 ? AMBER : RED);

function safeFilePart(s) {
  return String(s || "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "Agency";
}

function makeReportId(now) {
  const stamp =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0");
  let rand = "";
  for (let i = 0; i < 6; i++) rand += "0123456789ABCDEF"[Math.floor(Math.random() * 16)];
  return `CS-${stamp}-${rand}`;
}

// ── CDN loading ──────────────────────────────────────────────────────────────
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-cs-pdf="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") return resolve();
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)));
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.csPdf = src;
    s.onload = () => { s.dataset.loaded = "1"; resolve(); };
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

// jsPDF must be present before autotable, which patches its prototype.
async function ensurePdfLibs() {
  if (!window.jspdf?.jsPDF) await loadScript(CDN_JSPDF);
  if (!window.jspdf?.jsPDF) throw new Error("PDF engine did not load. Check your network connection and try again.");
  const proto = window.jspdf.jsPDF.API;
  if (!proto || typeof proto.autoTable !== "function") await loadScript(CDN_AUTOTABLE);
  if (typeof window.jspdf.jsPDF.API.autoTable !== "function") {
    throw new Error("PDF table engine did not load. Check your network connection and try again.");
  }
  return window.jspdf.jsPDF;
}

// ── Logo ─────────────────────────────────────────────────────────────────────
async function loadMarkDataUrl() {
  for (const src of LOGO_CANDIDATES) {
    try {
      const res = await fetch(src, { cache: "force-cache" });
      if (!res.ok) continue;
      const blob = await res.blob();
      if (!blob.type || !blob.type.startsWith("image/")) continue;
      return await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = () => reject(new Error("read failed"));
        fr.readAsDataURL(blob);
      });
    } catch {
      // try the next candidate
    }
  }
  return null;
}

// Vector fallback: bronze rounded tile with a navy shield outline and check.
// Only used when no mark PNG resolves, so the report always renders branded.
function drawVectorMark(doc, x, y, size) {
  const r = size * 0.22;
  doc.setFillColor(...BRONZE);
  doc.roundedRect(x, y, size, size, r, r, "F");
  const cx = x + size / 2;
  const top = y + size * 0.24;
  const half = size * 0.22;
  const shoulder = y + size * 0.34;
  const waist = y + size * 0.6;
  const tip = y + size * 0.79;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(size * 0.075);
  doc.setLineJoin("round");
  doc.setLineCap("round");
  doc.lines(
    [
      [half, size * 0.1],
      [0, waist - shoulder],
      [-half, tip - waist],
      [-half, -(tip - waist)],
      [0, -(waist - shoulder)],
      [half, -(size * 0.1)],
    ],
    cx,
    top,
    [1, 1],
    "S",
    true
  );
  doc.setLineWidth(size * 0.085);
  doc.lines([[size * 0.1, size * 0.1], [size * 0.17, -size * 0.19]], cx - size * 0.13, y + size * 0.5, [1, 1], "S", false);
}

function drawMark(doc, x, y, size, markData) {
  if (markData) {
    try {
      doc.addImage(markData, "PNG", x, y, size, size, undefined, "FAST");
      return;
    } catch {
      // fall through to vector
    }
  }
  drawVectorMark(doc, x, y, size);
}

// Letter-spaced small caps line, used for the mono tagline in the lockup.
function tracked(doc, text, x, y, spacing) {
  let cx = x;
  for (const ch of String(text)) {
    doc.text(ch, cx, y);
    cx += doc.getTextWidth(ch) + spacing;
  }
  return cx;
}

// ── Layout primitives ────────────────────────────────────────────────────────
function need(doc, y, h) {
  if (y + h > PAGE.h - M.bottom) {
    doc.addPage();
    return M.top;
  }
  return y;
}

function heading(doc, y, label, sub) {
  y = need(doc, y, 24);
  doc.setDrawColor(...BRONZE);
  doc.setLineWidth(0.9);
  doc.line(M.left, y, M.left + 14, y);
  y += 6.5;
  doc.setFont("times", "bold");
  doc.setFontSize(14.5);
  doc.setTextColor(...INK);
  doc.text(label, M.left, y);
  y += 4.5;
  if (sub) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.setTextColor(...SLATE);
    const lines = doc.splitTextToSize(sub, CONTENT_W);
    doc.text(lines, M.left, y);
    y += lines.length * 3.6;
  }
  return y + 3.5;
}

function paragraph(doc, y, text, opts = {}) {
  const size = opts.size || 9;
  const color = opts.color || SLATE;
  doc.setFont("helvetica", opts.bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.setTextColor(...color);
  const lines = doc.splitTextToSize(String(text), CONTENT_W);
  y = need(doc, y, lines.length * (size * 0.44) + 4);
  doc.text(lines, M.left, y);
  return y + lines.length * (size * 0.44) + 3;
}

// A callout strip — used sparingly for the single most important number.
function calloutRow(doc, y, items) {
  const h = 22;
  y = need(doc, y, h + 6);
  const gap = 4;
  const w = (CONTENT_W - gap * (items.length - 1)) / items.length;
  items.forEach((it, i) => {
    const x = M.left + i * (w + gap);
    doc.setFillColor(...WASH);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, w, h, 1.6, 1.6, "FD");
    doc.setFont("courier", "normal");
    doc.setFontSize(6.6);
    doc.setTextColor(...MUTE);
    doc.text(String(it.label).toUpperCase(), x + 4, y + 6);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(...(it.tone || INK));
    doc.text(String(it.value), x + 4, y + 14.5);
    if (it.note) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(...SLATE);
      doc.text(doc.splitTextToSize(String(it.note), w - 8)[0] || "", x + 4, y + 19);
    }
  });
  return y + h + 6;
}

function tableBase() {
  return {
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 8.3,
      cellPadding: 2.2,
      lineColor: LINE,
      lineWidth: 0.15,
      textColor: INK,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: "bold",
      fontSize: 7.8,
      cellPadding: 2.4,
    },
    alternateRowStyles: { fillColor: WASH },
    margin: { left: M.left, right: M.right, top: M.top, bottom: M.bottom },
    tableWidth: CONTENT_W,
  };
}

function runTable(doc, y, config) {
  doc.autoTable({ ...tableBase(), startY: y, ...config });
  return doc.lastAutoTable.finalY + 7;
}

// A plain two-column metric table — the workhorse for report data.
function metricTable(doc, y, rows, headers = ["Metric", "Value", "Basis"]) {
  return runTable(doc, y, {
    head: [headers],
    body: rows,
    columnStyles: {
      0: { cellWidth: 52, fontStyle: "bold" },
      1: { cellWidth: 34 },
      2: { textColor: SLATE, fontSize: 7.8 },
    },
  });
}

// ── Cover ────────────────────────────────────────────────────────────────────
function drawCover(doc, meta, markData) {
  // Lockup: square mark + serif wordmark + tracked mono tagline. The wordmark is
  // drawn as text, not a scaled raster, so it stays crisp at any size.
  drawMark(doc, M.left, 26, 26, markData);
  doc.setFont("times", "bold");
  doc.setFontSize(27);
  doc.setTextColor(...NAVY);
  doc.text("Connect Shield", M.left + 33, 41);
  doc.setFont("courier", "normal");
  doc.setFontSize(7.2);
  doc.setTextColor(...SLATE);
  tracked(doc, "HOSPICE COMPLIANCE INTELLIGENCE", M.left + 33.5, 49, 0.55);

  doc.setDrawColor(...BRONZE);
  doc.setLineWidth(1.1);
  doc.line(M.left, 62, PAGE.w - M.right, 62);

  // Document title block
  doc.setFont("courier", "normal");
  doc.setFontSize(7.4);
  doc.setTextColor(...BRONZE);
  tracked(doc, "COMPLIANCE REPORT", M.left, 78, 0.5);

  doc.setFont("times", "bold");
  doc.setFontSize(30);
  doc.setTextColor(...INK);
  doc.text(doc.splitTextToSize(meta.docTitle, CONTENT_W), M.left, 92);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  const nameLines = doc.splitTextToSize(meta.clinicName, CONTENT_W);
  doc.text(nameLines, M.left, 105);

  let y = 105 + nameLines.length * 6 + 8;

  // Identity block — everything an auditor needs to place this document.
  doc.autoTable({
    ...tableBase(),
    startY: y,
    theme: "plain",
    styles: { ...tableBase().styles, fontSize: 9, cellPadding: { top: 2.2, bottom: 2.2, left: 0, right: 4 } },
    body: [
      ["CMS Certification Number", dash(meta.ccn)],
      ["Reporting period", dash(meta.reportPeriod)],
      ["Report generated", meta.generatedLong],
      ["Report ID", meta.reportId],
      ["Prepared by", dash(meta.generatedBy)],
      ["Source platform", "Connect Shield · connect-shield.com"],
    ],
    columnStyles: {
      0: { cellWidth: 58, textColor: SLATE, fontSize: 8.2 },
      1: { fontStyle: "bold", textColor: INK },
    },
  });
  y = doc.lastAutoTable.finalY + 12;

  // Scope statement. This is the part that makes the document self-explaining
  // when it lands on someone else's desk without Connect Shield to introduce it.
  const boxTop = y;
  doc.setFillColor(...WASH);
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.4);
  doc.setTextColor(...NAVY);
  const scopeTitle = "Scope of this document";
  const scopeBody =
    meta.mode === "summary"
      ? "This document reports published CMS scores, extracted report figures, the agency's report inventory, and the provenance of each figure. It does not include Connect Shield's interpretive findings or recommended actions. It contains no protected health information."
      : "This document reports published CMS scores, extracted report figures, the agency's report inventory and provenance, and Connect Shield's interpretive analysis — including critical findings and recommended actions. It contains no protected health information.";
  const scopeLines = doc.splitTextToSize(scopeBody, CONTENT_W - 12);
  const boxH = 12 + scopeLines.length * 3.9;
  doc.roundedRect(M.left, boxTop, CONTENT_W, boxH, 2, 2, "FD");
  doc.setDrawColor(...BRONZE);
  doc.setLineWidth(1.4);
  doc.line(M.left, boxTop + 1, M.left, boxTop + boxH - 1);
  doc.text(scopeTitle, M.left + 6, boxTop + 6.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text(scopeLines, M.left + 6, boxTop + 11.5);
}

// ── Running header + footer (drawn in a final pass so page counts are known) ──
function decoratePages(doc, meta, markData) {
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);

    if (p > 1) {
      doc.setFillColor(...NAVY);
      doc.rect(0, 0, PAGE.w, 16, "F");
      drawMark(doc, M.left, 4, 8, markData);
      doc.setFont("times", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...WHITE);
      doc.text("Connect Shield", M.left + 11, 10.4);
      doc.setFont("courier", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(147, 160, 184);
      doc.text(meta.docTitle.toUpperCase(), PAGE.w - M.right, 10.2, { align: "right" });
      doc.setDrawColor(...BRONZE);
      doc.setLineWidth(0.9);
      doc.line(0, 16, PAGE.w, 16);
    }

    const fy = PAGE.h - 14;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(M.left, fy, PAGE.w - M.right, fy);
    doc.setFont("courier", "normal");
    doc.setFontSize(6.6);
    doc.setTextColor(...MUTE);
    const left = `${meta.clinicName}${meta.ccn ? ` · CCN ${meta.ccn}` : ""}`;
    doc.text(doc.splitTextToSize(left, 95)[0] || "", M.left, fy + 4.6);
    doc.text(meta.reportId, PAGE.w / 2, fy + 4.6, { align: "center" });
    doc.text(`Page ${p} of ${total}`, PAGE.w - M.right, fy + 4.6, { align: "right" });
  }
}

// ── Section builders ─────────────────────────────────────────────────────────
function sectionSummary(doc, y, ctx) {
  const { analysis, ssvi } = ctx;
  y = heading(
    doc,
    y,
    "Executive summary",
    "Composite position across every report currently on file for this agency."
  );

  const composite = analysis?.overallComplianceScore;
  y = calloutRow(doc, y, [
    {
      label: "Composite compliance index",
      value: composite != null && composite > 0 ? `${composite}/100` : "—",
      tone: scoreTone(composite > 0 ? composite : null),
      note: analysis?.overallRiskLevel ? `${analysis.overallRiskLevel} audit risk` : "Not yet calculated",
    },
    {
      label: `SSVI total${ssvi ? ` · FY${ssvi.year}` : ""}`,
      value: ssvi?.total != null ? `${ssvi.total}/16` : "—",
      tone: ssviTone(ssvi?.total),
      note: ssvi ? ssviLabelFor(ssvi.total) : "No published score retrieved",
    },
    {
      label: "Reports on file",
      value: String(ctx.onFileCount),
      tone: NAVY,
      note: ctx.onFileTypes || "None",
    },
  ]);

  const rows = [];
  if (ssvi) {
    rows.push([
      "SSVI utilization score",
      ssvi.utilization != null ? `${ssvi.utilization}/8` : "—",
      "CMS published · claims-based utilization measures",
    ]);
    rows.push([
      "SSVI non-hospice spending score",
      ssvi.spending != null ? `${ssvi.spending}/8` : "—",
      "CMS published · Part A/B spending for enrolled beneficiaries",
    ]);
    if (ssvi.priorTotal != null) {
      const delta = ssvi.total - ssvi.priorTotal;
      rows.push([
        `FY${ssvi.priorYear} SSVI total`,
        `${ssvi.priorTotal}/16`,
        `Year over year: ${delta === 0 ? "no change" : `${delta > 0 ? "+" : ""}${delta} points`}`,
      ]);
    }
    rows.push(["National SSVI average", "6.42/16", "CMS published national mean; median 7"]);
  }
  if (analysis?.reportPeriod) rows.push(["Reporting period analyzed", analysis.reportPeriod, "As stated on the source report"]);
  if (analysis?.agencyName && analysis.agencyName !== "Unknown Agency") {
    rows.push(["Agency name on report", analysis.agencyName, "Extracted from the submitted report"]);
  }

  if (rows.length) y = metricTable(doc, y, rows);

  if (ssvi?.isFallback) {
    y = paragraph(
      doc,
      y,
      `CMS has not published an FY${(ssvi.year || 2024) + 1} SSVI for this agency. All SSVI figures in this report reflect FY${ssvi.year} claims, the most recent published year.`,
      { size: 8.2 }
    );
  }
  if (analysis?._parseWarning) {
    y = paragraph(
      doc,
      y,
      "Note: the most recent analysis on file was generated from an incomplete source report, so some figures below are unavailable. Re-uploading a complete, text-searchable PS&R Report 810 and Beneficiary Count report will populate them.",
      { size: 8.2, color: AMBER }
    );
  }
  return y;
}

function sectionSSVI(doc, y, ctx) {
  const { ssvi, ssviMeasures, mode } = ctx;
  const measures = Array.isArray(ssviMeasures) ? ssviMeasures : [];
  const count = measures.length;

  y = heading(
    doc,
    y,
    "SSVI measure breakdown",
    `The Service and Spending Variation Index is a 0–16 CMS score. The utilization score (0–8) is built from ${count} claims-based measures, each worth one point when flagged. The non-hospice spending score (0–8) is calculated separately from Part A/B spending.`
  );

  if (!ssvi) {
    y = paragraph(
      doc,
      y,
      "No published CMS SSVI record was retrieved for this CCN at the time this report was generated.",
      { size: 8.6 }
    );
    return y;
  }

  const head = mode === "full"
    ? [["#", "Utilization measure", "CMS flag threshold", "Result", "Pts", "Remedy"]]
    : [["#", "Utilization measure", "CMS flag threshold", "Result", "Pts"]];

  const body = measures.map((m, i) => {
    const flagged = ssvi.flags ? ssvi.flags[m.key] : null;
    const result = flagged === true ? "Flagged" : flagged === false ? "Not flagged" : "Not published";
    const pts = flagged === true ? "1" : flagged === false ? "0" : "—";
    const row = [String(i + 1), m.label, m.flagThreshold, result, pts];
    if (mode === "full") row.push(m.remedy);
    return row;
  });

  const colStyles = mode === "full"
    ? { 0: { cellWidth: 7, halign: "center" }, 1: { cellWidth: 34, fontStyle: "bold" }, 2: { cellWidth: 40, fontSize: 7.4, textColor: SLATE }, 3: { cellWidth: 20, halign: "center" }, 4: { cellWidth: 9, halign: "center", fontStyle: "bold" }, 5: { fontSize: 7.4, textColor: SLATE } }
    : { 0: { cellWidth: 8, halign: "center" }, 1: { cellWidth: 52, fontStyle: "bold" }, 2: { fontSize: 7.6, textColor: SLATE }, 3: { cellWidth: 26, halign: "center" }, 4: { cellWidth: 12, halign: "center", fontStyle: "bold" } };

  const resultCol = 3;
  y = runTable(doc, y, {
    head,
    body,
    columnStyles: colStyles,
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === resultCol) {
        const v = data.cell.raw;
        if (v === "Flagged") { data.cell.styles.textColor = RED; data.cell.styles.fontStyle = "bold"; }
        else if (v === "Not flagged") data.cell.styles.textColor = GREEN;
        else data.cell.styles.textColor = MUTE;
      }
    },
  });

  const flaggedCount = measures.filter((m) => ssvi.flags && ssvi.flags[m.key] === true).length;
  y = metricTable(
    doc,
    y,
    [
      [`Utilization measures flagged`, `${flaggedCount} of ${count}`, `FY${ssvi.year} published claims data`],
      ["Utilization score", ssvi.utilization != null ? `${ssvi.utilization}/8` : "—", "Sum of flagged utilization measures"],
      ["Non-hospice spending score", ssvi.spending != null ? `${ssvi.spending}/8` : "—", "Calculated by CMS from Part A/B spending"],
      ["Total SSVI", ssvi.total != null ? `${ssvi.total}/16` : "—", `${ssviLabelFor(ssvi.total)} · national average 6.42`],
    ],
    ["SSVI component", "Score", "Basis"]
  );
  return y;
}

function sectionCAP(doc, y, ctx) {
  const cap = ctx.cards?.cap?.capData || ctx.analysis?.capData || {};
  const hasAny = Object.values(cap).some((v) => v != null && v !== "");
  y = heading(
    doc,
    y,
    "Medicare aggregate CAP",
    "The aggregate cap limits total Medicare reimbursement per beneficiary across the cap year. Reimbursement above the limit is repayable to CMS."
  );
  if (!hasAny) {
    y = paragraph(doc, y, "No beneficiary count or CAP data is currently on file for this agency.", { size: 8.6 });
    return y;
  }
  const exposure = cap.capExposure;
  const util = cap.capUtilizationPct;
  y = metricTable(doc, y, [
    ["Cap year", dash(cap.capYear), "As stated on the Beneficiary Count report"],
    ["Total beneficiary count", cap.totalBeneficiaryCount != null ? Number(cap.totalBeneficiaryCount).toFixed(4) : "—", "Full plus fractional counts"],
    ["Per-beneficiary cap amount", money(cap.perBeneficiaryCap), "CMS published cap amount for the cap year"],
    ["Aggregate cap limit", money(cap.capLimit), "Beneficiary count multiplied by the per-beneficiary cap"],
    ["Net reimbursement", money(cap.netReimbursement), "PS&R net of sequestration"],
    ["Cap utilization", pct(util), util != null && util >= 100 ? "Above the aggregate cap limit" : "Share of the aggregate cap limit used"],
    ["Cap exposure", money(exposure), exposure > 0 ? "Amount above the cap limit, repayable to CMS" : "No amount above the cap limit"],
  ]);
  return y;
}

function sectionPSR(doc, y, ctx) {
  const psr = ctx.cards?.psr?.psrMetrics || ctx.analysis?.psrMetrics || {};
  const hasAny = Object.values(psr).some((v) => v != null);
  y = heading(
    doc,
    y,
    "PS&R leading indicators",
    "Operational figures extracted from PS&R Report 810. These are the inputs that drive SSVI utilization scoring."
  );
  if (!hasAny) {
    y = paragraph(doc, y, "No PS&R data is currently on file for this agency.", { size: 8.6 });
    return y;
  }
  y = metricTable(doc, y, [
    ["Total Medicare days", num(psr.totalMedicareDays), "Routine home care days billed"],
    ["Total claims", num(psr.totalClaims), "Medicare claims filed in the period"],
    ["Unduplicated census", num(psr.totalUnduplicatedCensus), "Unique beneficiaries served"],
    ["Average length of stay", psr.avgLengthOfStay != null ? `${num(psr.avgLengthOfStay, 1)} days` : "—", "Medicare days divided by unduplicated census · national average approximately 89 days"],
    ["Skilled nursing units (Rev 0551)", num(psr.snVisitUnits), "15-minute nursing increments billed"],
    ["RN visit intensity", psr.rnUnitsPerDay != null ? `${num(psr.rnUnitsPerDay, 2)} units/day` : "—", psr.rnUnitsPerDay != null && psr.rnUnitsPerDay < 1.0 ? "Below the 1.0 SSVI threshold" : "Rev 0551 units divided by Medicare days"],
    ["Gross reimbursement", money(psr.grossReimbursement), "Before sequestration"],
    ["Net reimbursement", money(psr.netReimbursement), "After 2% sequestration"],
  ]);
  return y;
}

function sectionPEPPER(doc, y, ctx) {
  const p = ctx.cards?.pepper;
  y = heading(
    doc,
    y,
    "PEPPER target areas",
    "PEPPER compares this agency to national statistics across areas CMS monitors for improper payment risk. At or above the 80th percentile is a high outlier; at or below the 20th is a low outlier."
  );
  if (!p) {
    y = paragraph(doc, y, "No PEPPER report is currently on file for this agency.", { size: 8.6 });
    return y;
  }
  const areas = Array.isArray(p.targetAreas) ? p.targetAreas : [];
  if (areas.length) {
    y = runTable(doc, y, {
      head: [["Target area", "Agency value", "National percentile", "Status"]],
      body: areas.map((a) => [
        dash(a.name),
        dash(a.value),
        a.percentile != null ? ordinal(a.percentile) : "—",
        a.outlier === "high" ? "High outlier" : a.outlier === "low" ? "Low outlier" : "Within range",
      ]),
      columnStyles: {
        0: { cellWidth: 68, fontStyle: "bold" },
        1: { cellWidth: 36 },
        2: { cellWidth: 32, halign: "center" },
        3: { halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const v = data.cell.raw;
          if (v === "High outlier") { data.cell.styles.textColor = RED; data.cell.styles.fontStyle = "bold"; }
          else if (v === "Low outlier") data.cell.styles.textColor = AMBER;
          else data.cell.styles.textColor = GREEN;
        }
      },
    });
  }
  y = metricTable(
    doc,
    y,
    [
      ["Target areas reviewed", dash(p.targetAreaCount ?? areas.length), "As contained in the source PEPPER report"],
      ["Areas at or above 80th percentile", dash(p.outlierCount), "High outliers carry elevated audit risk"],
    ],
    ["PEPPER summary", "Value", "Basis"]
  );
  return y;
}

function sectionCAHPS(doc, y, ctx) {
  const c = ctx.cards?.cahps;
  y = heading(
    doc,
    y,
    "CAHPS survey results",
    "CAHPS Hospice Survey measures caregiver experience of care, reported against the national average."
  );
  if (!c) {
    y = paragraph(doc, y, "No CAHPS survey results are currently on file for this agency.", { size: 8.6 });
    return y;
  }
  const domains = Array.isArray(c.domains) ? c.domains : [];
  y = metricTable(
    doc,
    y,
    [
      ["Overall CAHPS score", c.cahpsOverallScore != null ? `${c.cahpsOverallScore}%` : "—", "As reported in the source survey results"],
      ["National average", c.cahpsNationalAvg != null ? `${c.cahpsNationalAvg}%` : "—", "CMS published national benchmark"],
    ],
    ["CAHPS summary", "Value", "Basis"]
  );
  if (domains.length) {
    y = runTable(doc, y, {
      head: [["Measure", "Agency", "National", "Difference"]],
      body: domains.map((d) => {
        const diff =
          d.score != null && d.nationalAvg != null
            ? `${d.score - d.nationalAvg > 0 ? "+" : ""}${(d.score - d.nationalAvg).toFixed(1)} pts`
            : "—";
        return [dash(d.name), d.score != null ? `${d.score}%` : "—", d.nationalAvg != null ? `${d.nationalAvg}%` : "—", diff];
      }),
      columnStyles: {
        0: { cellWidth: 86, fontStyle: "bold" },
        1: { cellWidth: 26, halign: "center" },
        2: { cellWidth: 26, halign: "center" },
        3: { halign: "center" },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 3) {
          const v = String(data.cell.raw || "");
          if (v.startsWith("-")) data.cell.styles.textColor = AMBER;
          else if (v.startsWith("+")) data.cell.styles.textColor = GREEN;
        }
      },
    });
  }
  return y;
}

function sectionQAPI(doc, y, ctx) {
  const q = ctx.cards?.qapi;
  y = heading(
    doc,
    y,
    "QAPI program components",
    "Quality Assurance and Performance Improvement program assessed against the components required under 42 CFR 418.58."
  );
  if (!q) {
    y = paragraph(doc, y, "No QAPI program document is currently on file for this agency.", { size: 8.6 });
    return y;
  }
  const comps = Array.isArray(q.components) ? q.components : [];
  y = metricTable(
    doc,
    y,
    [
      ["Components documented", `${dash(q.componentsDocumented)} of ${dash(q.componentsTotal || 8)}`, "Assessed against 42 CFR 418.58"],
      ["Active performance improvement projects", dash(q.activePipCount), "As documented in the QAPI program"],
      ["Program status", dash(q.status), "Complete, partial, or incomplete"],
    ],
    ["QAPI summary", "Value", "Basis"]
  );
  if (comps.length) {
    y = runTable(doc, y, {
      head: [["#", "Required component", "Documented", "Note"]],
      body: comps.map((c, i) => [String(i + 1), dash(c.name), c.present ? "Yes" : "No", dash(c.note)]),
      columnStyles: {
        0: { cellWidth: 8, halign: "center" },
        1: { cellWidth: 56, fontStyle: "bold" },
        2: { cellWidth: 24, halign: "center" },
        3: { fontSize: 7.6, textColor: SLATE },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 2) {
          const v = data.cell.raw;
          data.cell.styles.textColor = v === "Yes" ? GREEN : RED;
          data.cell.styles.fontStyle = "bold";
        }
      },
    });
  }
  return y;
}

function sectionQuality(doc, y, ctx) {
  const q = ctx.analysis?.qualityMetrics || {};
  const hasAny = Object.values(q).some((v) => v != null && v !== false && v !== 0);
  y = heading(doc, y, "Quality & survey metrics", "Survey and quality indicators drawn from the agency's submitted reports.");
  if (!hasAny) {
    y = paragraph(doc, y, "No survey or quality metrics are currently on file for this agency.", { size: 8.6 });
    return y;
  }
  y = metricTable(doc, y, [
    ["CAHPS overall score", q.cahpsOverallScore != null ? `${q.cahpsOverallScore}%` : "—", q.cahpsNationalAvg != null ? `National average ${q.cahpsNationalAvg}%` : "From submitted CAHPS results"],
    ["Survey deficiencies cited", dash(q.surveyDeficiencyCount), q.surveyConditionLevel ? "Includes a condition-level citation" : "From submitted survey results"],
    ["Open deficiencies", dash(q.openDeficiencies), "Cited and not yet closed"],
    ["PEPPER outlier flags", dash(q.pepperOutlierFlags), "Target areas above the outlier threshold"],
    ["QAPI projects documented", dash(q.qapiProjectCount), "Active performance improvement projects"],
  ]);
  return y;
}

function sectionFindings(doc, y, ctx) {
  const findings = ctx.analysis?.criticalFindings || [];
  y = heading(
    doc,
    y,
    "Critical findings",
    "Connect Shield's interpretive analysis of the submitted reports. These are analytical observations, not CMS determinations."
  );
  if (!findings.length) {
    y = paragraph(doc, y, "No critical findings were identified in the most recent analysis.", { size: 8.6 });
    return y;
  }
  y = runTable(doc, y, {
    head: [["Severity", "Category", "Finding", "Recommended action", "Exposure"]],
    body: findings.map((f) => [
      dash(f.severity).toUpperCase(),
      dash(f.category),
      dash(f.finding),
      dash(f.recommendation),
      f.clawbackRisk > 0 ? money(f.clawbackRisk) : "—",
    ]),
    columnStyles: {
      0: { cellWidth: 17, halign: "center", fontStyle: "bold", fontSize: 7 },
      1: { cellWidth: 27, fontStyle: "bold", fontSize: 7.8 },
      2: { cellWidth: 55, fontSize: 7.8 },
      3: { fontSize: 7.8, textColor: SLATE },
      4: { cellWidth: 20, halign: "right", fontSize: 7.8 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 0) {
        const v = String(data.cell.raw || "").toLowerCase();
        data.cell.styles.textColor = v === "high" ? RED : v === "medium" ? AMBER : GREEN;
      }
    },
  });
  return y;
}

function sectionCategories(doc, y, ctx) {
  const cats = ctx.analysis?.complianceCategories || [];
  y = heading(
    doc,
    y,
    "Category breakdown & recommended actions",
    "Scoring factors behind each compliance category, with the actions Connect Shield recommends."
  );
  if (!cats.length) {
    y = paragraph(doc, y, "No compliance category breakdown is currently on file for this agency.", { size: 8.6 });
    return y;
  }
  cats.forEach((cat) => {
    y = need(doc, y, 30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(dash(cat.label), M.left, y);
    const scoreTxt = `${cat.score != null ? cat.score : "—"}/100`;
    doc.setTextColor(...scoreTone(cat.score));
    doc.text(scoreTxt, PAGE.w - M.right, y, { align: "right" });
    y += 4.2;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.4);
    doc.setTextColor(...MUTE);
    const metaLine = [
      cat.source ? `Source: ${cat.source}` : null,
      cat.riskLevel ? `Risk: ${cat.riskLevel}` : null,
      cat.clawbackAmount > 0 ? `Exposure: ${money(cat.clawbackAmount)}` : null,
    ].filter(Boolean).join("   ·   ");
    if (metaLine) { doc.text(metaLine, M.left, y); y += 4; }
    if (cat.summary) y = paragraph(doc, y, cat.summary, { size: 8.2, color: INK });

    const factors = Array.isArray(cat.factors) ? cat.factors : [];
    if (factors.length) {
      y = runTable(doc, y, {
        head: [["Weight", "Scoring factor", "Detail", "Status"]],
        body: factors.map((f) => [
          f.weight != null ? `${f.weight}%` : "—",
          dash(f.label),
          dash(f.detail),
          f.status === "good" ? "Passing" : f.status === "warn" ? "Attention" : "At risk",
        ]),
        columnStyles: {
          0: { cellWidth: 16, halign: "center" },
          1: { cellWidth: 45, fontStyle: "bold", fontSize: 7.8 },
          2: { fontSize: 7.6, textColor: SLATE },
          3: { cellWidth: 22, halign: "center", fontSize: 7.6 },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 3) {
            const v = data.cell.raw;
            data.cell.styles.textColor = v === "Passing" ? GREEN : v === "Attention" ? AMBER : RED;
          }
        },
      });
    }

    const actions = Array.isArray(cat.actions) ? cat.actions : [];
    if (actions.length) {
      y = need(doc, y, 10);
      doc.setFont("courier", "normal");
      doc.setFontSize(6.8);
      doc.setTextColor(...BRONZE);
      doc.text("RECOMMENDED ACTIONS", M.left, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.2);
      doc.setTextColor(...INK);
      actions.forEach((a) => {
        const lines = doc.splitTextToSize(String(a), CONTENT_W - 6);
        y = need(doc, y, lines.length * 3.9 + 2);
        doc.setFillColor(...BRONZE);
        doc.circle(M.left + 1.2, y - 1.2, 0.8, "F");
        doc.text(lines, M.left + 5, y);
        y += lines.length * 3.9 + 1.4;
      });
    }
    y += 5;
  });
  return y;
}

function sectionMethodology(doc, y, ctx) {
  y = heading(
    doc,
    y,
    "Methodology & data sources",
    "Where every figure in this report came from, and how it was produced."
  );

  y = paragraph(
    doc,
    y,
    "Connect Shield assembles this report from two categories of source data. The first is public CMS data: the provider-level Service and Spending Variation Index file, which supplies the published SSVI total, its utilization and spending components, and the per-measure flags. Connect Shield does not calculate these figures; it reports the values CMS published for this CCN. The second is agency-submitted reports uploaded by the agency itself — PS&R Report 810, the Beneficiary Count report, PEPPER, CAHPS survey results, and the QAPI program document. Figures drawn from those reports are extracted from the documents as submitted.",
    { size: 8.4 }
  );
  y = paragraph(
    doc,
    y,
    "Derived figures are calculated from the extracted values using published CMS formulas. Average length of stay is Medicare days divided by unduplicated census. RN visit intensity is revenue code 0551 units divided by Medicare days. The aggregate cap limit is the total beneficiary count multiplied by the CMS per-beneficiary cap amount for the cap year, and cap exposure is net reimbursement less that limit.",
    { size: 8.4 }
  );
  y = paragraph(
    doc,
    y,
    "Extraction and interpretive analysis are performed with automated assistance. Connect Shield's compliance index, category scores, and any findings are analytical products of this platform. They are not CMS determinations, audit conclusions, or legal advice, and they carry no regulatory standing. Published CMS figures and figures extracted from source reports should be verified against the original documents, which the agency retains.",
    { size: 8.4 }
  );
  y = paragraph(
    doc,
    y,
    "Connect Shield holds no protected health information. The platform ingests aggregate and summary-level reports only; no patient records, patient identifiers, or clinical documentation are stored, processed, or reflected anywhere in this report.",
    { size: 8.4, color: INK }
  );

  const prov = ctx.provenance || [];
  if (prov.length) {
    y = runTable(doc, y, {
      head: [["Report on file", "Reporting period", "Document date", "Last updated", "Source"]],
      body: prov,
      columnStyles: {
        0: { cellWidth: 38, fontStyle: "bold" },
        1: { cellWidth: 46, fontSize: 7.6 },
        2: { cellWidth: 26, fontSize: 7.6 },
        3: { cellWidth: 26, fontSize: 7.6 },
        4: { fontSize: 7.4, textColor: SLATE },
      },
    });
  }

  y = metricTable(
    doc,
    y,
    [
      ["Report ID", ctx.meta.reportId, "Unique identifier for this generated document"],
      ["Generated", ctx.meta.generatedLong, "Date and time this document was produced"],
      ["Generated by", dash(ctx.meta.generatedBy), "Signed-in user who produced this document"],
      ["Document type", ctx.meta.docTitle, ctx.meta.mode === "summary" ? "Excludes interpretive findings and recommended actions" : "Includes interpretive findings and recommended actions"],
    ],
    ["Document record", "Value", "Basis"]
  );
  return y;
}

// ── Entry point ──────────────────────────────────────────────────────────────
/**
 * Generate and download the branded compliance report.
 *
 * @param {object}  opts
 * @param {"full"|"summary"} opts.mode
 * @param {object}  opts.sections      map of section id -> boolean
 * @param {string}  opts.clinicName
 * @param {string}  opts.ccn
 * @param {object}  opts.analysis      composite analysis (analysisData || storedAnalysis)
 * @param {object}  opts.ssvi          result of resolveSSVI(ccnResult)
 * @param {array}   opts.ssviMeasures  SSVI_MEASURES from the dashboard
 * @param {object}  opts.cards         { cap, psr, pepper, cahps, qapi } from clinic_report_cards
 * @param {string}  opts.generatedBy   signed-in user's email
 * @returns {Promise<string>} the saved file name
 */
export async function generateComplianceReport(opts) {
  const {
    mode = "full",
    sections = presetFor(mode),
    clinicName = "Hospice Agency",
    ccn = "",
    analysis = null,
    ssvi = null,
    ssviMeasures = [],
    cards = {},
    generatedBy = "",
  } = opts || {};

  const JsPDF = await ensurePdfLibs();
  const markData = await loadMarkDataUrl();

  const now = new Date();
  const meta = {
    mode,
    docTitle: (MODES[mode] || MODES.full).title,
    clinicName,
    ccn,
    reportPeriod: analysis?.reportPeriod || cards?.psr?._periodLabel || cards?.cap?._periodLabel || "",
    generatedLong: `${longDate(now)} at ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
    generatedBy,
    reportId: makeReportId(now),
  };

  // Provenance rows — the audit trail for every report feeding this document.
  const TYPE_LABEL = {
    cap: "Beneficiary Count / CAP",
    psr: "PS&R Report 810",
    pepper: "PEPPER report",
    cahps: "CAHPS survey results",
    qapi: "QAPI program",
  };
  const provenance = Object.keys(TYPE_LABEL)
    .filter((k) => cards[k])
    .map((k) => [
      TYPE_LABEL[k],
      dash(cards[k]._periodLabel),
      shortDate(cards[k]._reportDate),
      shortDate(cards[k]._updatedAt),
      "Agency-submitted report",
    ]);
  if (ssvi) {
    provenance.unshift([
      `CMS SSVI file (FY${ssvi.year})`,
      `Federal fiscal year ${ssvi.year}`,
      "—",
      "—",
      "CMS public provider-level data",
    ]);
  }

  const onFileTypes = Object.keys(TYPE_LABEL).filter((k) => cards[k]);
  const ctx = {
    meta,
    mode,
    analysis,
    ssvi,
    ssviMeasures,
    cards,
    provenance,
    onFileCount: onFileTypes.length,
    onFileTypes: onFileTypes.map((k) => TYPE_LABEL[k].split(" ")[0]).join(", "),
  };

  const doc = new JsPDF({ unit: "mm", format: "letter", orientation: "portrait", compress: true });
  doc.setProperties({
    title: `${meta.docTitle} — ${clinicName}`,
    subject: `Connect Shield ${meta.docTitle}${ccn ? ` · CCN ${ccn}` : ""}`,
    author: "Connect Shield",
    creator: "Connect Shield · connect-shield.com",
    keywords: ["hospice", "compliance", "SSVI", "Connect Shield", meta.reportId].join(", "),
  });

  drawCover(doc, meta, markData);

  const BUILDERS = {
    summary: sectionSummary,
    ssvi: sectionSSVI,
    cap: sectionCAP,
    psr: sectionPSR,
    pepper: sectionPEPPER,
    cahps: sectionCAHPS,
    qapi: sectionQAPI,
    quality: sectionQuality,
    findings: sectionFindings,
    categories: sectionCategories,
    methodology: sectionMethodology,
  };

  const chosen = REPORT_SECTIONS.filter((s) => sections[s.id]);
  if (chosen.length) {
    doc.addPage();
    let y = M.top;
    chosen.forEach((s, i) => {
      if (i > 0) y = need(doc, y, 40);
      y = BUILDERS[s.id](doc, y, ctx);
      y += 4;
    });
  }

  decoratePages(doc, meta, markData);

  const fileName = `ConnectShield_${mode === "summary" ? "ComplianceSummary" : "FullComplianceAnalysis"}_${safeFilePart(clinicName)}${ccn ? `_${safeFilePart(ccn)}` : ""}_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
  return fileName;
}
