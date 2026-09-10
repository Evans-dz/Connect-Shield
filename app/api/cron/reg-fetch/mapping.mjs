// app/api/cron/reg-fetch/mapping.mjs
// Pure query-building + document→row mapping for the Federal Register fetcher.
// Shared by the cron route (route.js) and the local preview script
// (scripts/reg-fetch-preview.mjs) so the two can never drift.
// Plain ESM with zero imports — runs identically under Next.js and bare `node`.

export const FR_ENDPOINT = "https://www.federalregister.gov/api/v1/documents.json";

// Clamp the ?days lookback window to 1–90; anything unparseable -> fallback.
export function clampDays(raw, fallback = 14) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(90, Math.max(1, n));
}

// Federal Register public API query (no key required): documents from the
// last `days` days where CMS is an agency, the text matches "hospice", and
// the document is a rule, proposed rule, or notice.
export function buildFederalRegisterUrl(days, today = new Date()) {
  const since = new Date(today.getTime() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const p = new URLSearchParams();
  p.set("conditions[term]", "hospice");
  p.append("conditions[agencies][]", "centers-for-medicare-medicaid-services");
  for (const t of ["RULE", "PRORULE", "NOTICE"]) p.append("conditions[type][]", t);
  p.set("conditions[publication_date][gte]", since);
  for (const f of ["document_number", "title", "abstract", "type", "publication_date", "html_url", "agencies"]) {
    p.append("fields[]", f);
  }
  p.set("per_page", "50");
  p.set("order", "newest");
  return `${FR_ENDPOINT}?${p.toString()}`;
}

// The API returns human-readable types ("Rule" / "Proposed Rule" / "Notice").
// Map them to the tag vocabulary the review queue and dashboard chips show.
const TAG_BY_TYPE = {
  Rule: "Final Rule",
  "Proposed Rule": "Proposed Rule",
  Notice: "Notice",
};
export function tagForType(type) {
  return TAG_BY_TYPE[type] || type || "Notice";
}

// Severity heuristic — deliberately dumb; the human reviewer corrects course
// by rewriting `impact` or rejecting the card:
//   title/abstract mentions "final rule" -> high    (binding, effective dates)
//   ... mentions "proposed"              -> medium  (comment period, not yet law)
//   anything else (notices, corrections) -> low
export function severityFor(doc) {
  const hay = `${doc?.title || ""} ${doc?.abstract || ""}`.toLowerCase();
  if (hay.includes("final rule")) return "high";
  if (hay.includes("proposed")) return "medium";
  return "low";
}

// Abstracts can run long; keep the card summary to ~500 chars, cut on a word.
export function truncateSummary(s, max = 500) {
  if (s === null || s === undefined) return null;
  const t = String(s).trim();
  if (!t) return null;
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > max - 80 ? lastSpace : max)}…`;
}

// One Federal Register document -> one reg_updates draft row.
// `impact` stays null on purpose: the admin reviewer writes the
// "what it means for you" line before publishing. `source_url` is the
// column both /admin/reg-review and the dashboard feed render as the
// "View source" link.
export function mapDocument(doc) {
  return {
    status: "draft",
    source: "Federal Register",
    tag: tagForType(doc.type),
    severity: severityFor(doc),
    title: String(doc.title).trim(),
    summary: truncateSummary(doc.abstract),
    impact: null,
    published_date: doc.publication_date || null,
    source_url: doc.html_url,
  };
}

// Map an API result set, dropping anything without the two fields the
// pipeline cannot work without (a title to review, a URL to dedupe on).
export function mapDocuments(results) {
  return (results || []).filter((d) => d && d.title && d.html_url).map(mapDocument);
}
