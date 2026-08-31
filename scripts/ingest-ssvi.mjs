#!/usr/bin/env node
// scripts/ingest-ssvi.mjs
// Load a CMS SSVI provider-level CSV into the `ssvi_public` table, keyed by CCN.
//
//   node scripts/ingest-ssvi.mjs --file <csv> --vintage fy2025|fy2024 [--dry-run] [--table ssvi_public]
//
// Env (only needed for a live write, or to show the new/updated split in dry-run):
//   NEXT_PUBLIC_SUPABASE_URL   your Supabase project URL
//   SUPABASE_SERVICE_KEY       service-role key (bypasses RLS)
//
// Behavior:
//   --dry-run  parse + validate + print header mapping, counts, and sample rows.
//              Writes NOTHING. Works with no env vars set.
//   live       upserts by CCN. Existing rows KEEP their slug (URLs are indexed
//              by Google — never regenerate a live slug). New rows get a slug
//              from the verified rule in scripts/lib/common.mjs.
//   Rows with no total SSVI score are skipped (use ingest-providers.mjs for
//   unscored directory rows).
//
// Full runbook, verified CMS download URLs, and post-load SQL: docs/DATA.md

import path from "node:path";
import {
  parseArgs,
  die,
  readCsvFile,
  mapHeaders,
  printMapping,
  normalizeCcn,
  makeSlug,
  cleanText,
  parseNumber,
  parseBool,
  parseState,
  parseUrbanRural,
  getClient,
  fetchExisting,
  probeColumns,
  chunkedUpsert,
  printSummary,
} from "./lib/common.mjs";

const VINTAGES = ["fy2025", "fy2024"];

const args = parseArgs(process.argv.slice(2), {
  strings: ["file", "vintage", "table"],
  booleans: ["dry-run", "help"],
});

if (args.help || !args.file || !args.vintage) {
  console.log(
    "Usage: node scripts/ingest-ssvi.mjs --file <csv> --vintage fy2025|fy2024 [--dry-run] [--table ssvi_public]"
  );
  process.exit(args.help ? 0 : 1);
}
if (!VINTAGES.includes(args.vintage)) die(`--vintage must be one of: ${VINTAGES.join(", ")}`);

const V = args.vintage; // column prefix, e.g. fy2025
const OTHER = V === "fy2025" ? "fy2024" : "fy2025";
const TABLE = args.table || "ssvi_public";
const DRY = Boolean(args["dry-run"]);

/* ---------------- header targets ---------------- */
// Aliases are matched against lowercased, punctuation-stripped headers, so
// "CMS Certification Number (CCN)" matches "cmscertificationnumber". The CMS
// zip's exact internal headers could not be inspected before writing this
// script (see docs/DATA.md) — the first --dry-run prints the mapping; if a
// column lands wrong, add an alias here.
const TARGETS = [
  { key: "ccn", required: true, aliases: ["ccn", "cmscertificationnumberccn", "cmscertificationnumber", "providerccn", "providernumber", "providerid"] },
  { key: "hospice_name", required: false, aliases: ["hospicename", "facilityname", "providername", "agencyname", "name"] },
  { key: "city", required: false, aliases: ["citytown", "city"] },
  { key: "state", required: false, aliases: ["stateabbreviation", "statecode", "state"] },
  { key: "urban_rural", required: false, aliases: ["urbanruralindicator", "urbanrural", "geographicclassification", "urbanruraldesignation"] },
  { key: "total_ssvi", required: true, aliases: ["totalssviscore", "totalssvi", "ssvitotalscore", "ssvitotal", "ssviscore"], pattern: /^(fy\d{4})?totalssvi/ },
  { key: "spending_score", required: false, aliases: ["nonhospicespendingscore", "spendingscore"], pattern: /spending(sub)?score/ },
  { key: "utilization_score", required: false, aliases: ["utilizationscore"], pattern: /utilization(sub)?score/ },
  { key: "spending_per_day", required: false, aliases: ["nonhospicespendingperday", "spendingperday"], pattern: /spendingper(beneficiary)?day/ },
  // The eight utilization measure flags (each worth 1 point).
  { key: "live_discharge", required: false, aliases: ["livedischarge"], pattern: /livedischarge/ },
  { key: "no_chc_gip", required: false, aliases: ["nochcorgip", "nochcgip"], pattern: /chc|gip|continuoushomecare|generalinpatient/ },
  { key: "last_two_days", required: false, aliases: ["lasttwodays", "last2days"], pattern: /last(two|2)days/ },
  { key: "sn_minutes", required: false, aliases: ["skillednursingminutes", "snminutes"], pattern: /skillednursing|snminutes/ },
  { key: "nursing_facility", required: false, aliases: ["nursingfacility"], pattern: /nursingfacility/ },
  { key: "weekend_visits", required: false, aliases: ["weekendvisits"], pattern: /weekend/ },
  { key: "return_7days", required: false, aliases: ["return7days"], pattern: /within7|7day|return7|returnto/ },
  { key: "los_180", required: false, aliases: ["los180", "lengthofstay180"], pattern: /180|lengthofstay|longstay/ },
];

const FLAG_KEYS = [
  "live_discharge",
  "los_180",
  "nursing_facility",
  "no_chc_gip",
  "last_two_days",
  "sn_minutes",
  "weekend_visits",
  "return_7days",
];

/* ---------------- parse the file ---------------- */

const { header, rows } = readCsvFile(args.file);
const { byKey, missing, unmapped } = mapHeaders(header, TARGETS);

console.log(`\ningest-ssvi — ${path.basename(args.file)} — vintage ${V} — table ${TABLE}${DRY ? " — DRY RUN" : ""}\n`);
printMapping(header, byKey, unmapped);

if (missing.length) {
  die(
    `Required column(s) not found: ${missing.map((t) => t.key).join(", ")}.\n` +
      `File headers were: ${header.join(" | ")}\n` +
      `Add an alias for your header in TARGETS inside scripts/ingest-ssvi.mjs.`
  );
}

const get = (row, key) => (byKey[key] === undefined ? undefined : row[byKey[key]]);

const records = [];
let badCcn = 0;
let unscored = 0;
let outOfRange = 0;
let flagMismatch = 0;

for (const row of rows) {
  const ccn = normalizeCcn(get(row, "ccn"));
  if (!ccn) {
    badCcn++;
    continue;
  }
  const total = parseNumber(get(row, "total_ssvi"));
  if (total === null) {
    unscored++;
    continue;
  }
  const spending = parseNumber(get(row, "spending_score"));
  const utilization = parseNumber(get(row, "utilization_score"));
  const perDay = parseNumber(get(row, "spending_per_day"));

  if (total < 0 || total > 16 || (spending !== null && (spending < 0 || spending > 8)) || (utilization !== null && (utilization < 0 || utilization > 8))) {
    outOfRange++;
    continue;
  }

  // Only include keys whose source column exists in the file. An absent key is
  // never written, so a partial file can't null-out existing names or flags.
  const rec = { ccn, [`${V}_total_ssvi`]: total };
  if (byKey.hospice_name !== undefined) rec.hospice_name = cleanText(get(row, "hospice_name"));
  if (byKey.city !== undefined) rec.city = cleanText(get(row, "city"));
  if (byKey.state !== undefined) rec.state = parseState(get(row, "state"));
  if (byKey.urban_rural !== undefined) rec.urban_rural = parseUrbanRural(get(row, "urban_rural"));
  if (byKey.spending_score !== undefined) rec[`${V}_spending_score`] = spending;
  if (byKey.utilization_score !== undefined) rec[`${V}_utilization_score`] = utilization;
  if (byKey.spending_per_day !== undefined) rec[`${V}_spending_per_day`] = perDay;

  let flagCount = 0;
  let anyFlagCol = false;
  for (const f of FLAG_KEYS) {
    if (byKey[f] === undefined) continue;
    anyFlagCol = true;
    const b = parseBool(get(row, f));
    rec[`${V}_${f}`] = b === null ? null : b;
    if (b === true) flagCount++;
  }
  // Sanity: the 8 flags should sum to the utilization score (see
  // app/api/ssvi-lookup/route.js — the site relies on this reconciling).
  if (anyFlagCol && utilization !== null && flagCount !== utilization) flagMismatch++;

  records.push(rec);
}

// Dedupe by CCN (keep last occurrence, matching upsert semantics)
const byCcn = new Map();
for (const r of records) byCcn.set(r.ccn, r);
const unique = [...byCcn.values()];
const dupes = records.length - unique.length;

/* ---------------- compare against the DB (optional in dry-run) ---------------- */

const { client, reason } = await getClient();
let existing = null; // Map ccn -> { slug, fy2025_total_ssvi, fy2024_total_ssvi }
let dbNote = null;

if (client) {
  const res = await fetchExisting(client, TABLE, "ccn, slug, fy2025_total_ssvi, fy2024_total_ssvi");
  if (res.error) {
    dbNote = `Could not read ${TABLE} (${res.error.message}). New/updated split unavailable.`;
    if (!DRY) die(`${dbNote}\nRefusing a live write without the existing-slug map — existing URLs must keep their slugs.`);
  } else {
    existing = new Map(res.rows.map((r) => [r.ccn, r]));
  }
} else {
  dbNote = reason;
  if (!DRY) die(reason);
}

let toInsert = 0;
let toUpdate = 0;
let skippedNoIdentity = 0;
const payload = [];
const sampleNewSlugs = [];

for (const rec of unique) {
  const ex = existing ? existing.get(rec.ccn) : undefined;
  if (ex) {
    toUpdate++;
    rec.slug = ex.slug; // never regenerate a live slug
    // Fill identity from the file only where the file actually has it; keep
    // the record's existing name if the file column was missing entirely.
    const otherTotal = ex[`${OTHER}_total_ssvi`];
    rec.ssvi_change =
      otherTotal === null || otherTotal === undefined
        ? null
        : V === "fy2025"
        ? rec.fy2025_total_ssvi - Number(otherTotal)
        : Number(otherTotal) - rec.fy2024_total_ssvi;
  } else {
    if (!rec.hospice_name || !rec.state) {
      // Can't build a slug without a name and state; report instead of guessing.
      skippedNoIdentity++;
      continue;
    }
    toInsert++;
    rec.slug = makeSlug(rec.hospice_name, rec.state, rec.ccn);
    rec.ssvi_change = null;
    if (sampleNewSlugs.length < 5) sampleNewSlugs.push(rec.slug);
  }
  payload.push(rec);
}

/* ---------------- report ---------------- */

printSummary("Parse summary", [
  ["data rows in file", rows.length],
  ["valid scored records", unique.length],
  ["duplicate CCNs (last wins)", dupes],
  ["skipped: missing/invalid CCN", badCcn],
  ["skipped: no total SSVI (unscored)", unscored],
  ["skipped: score out of range", outOfRange],
  ["flag-sum != utilization score", flagMismatch],
]);

if (existing) {
  printSummary("Against the database", [
    [`rows already in ${TABLE}`, existing.size],
    ["would update (slug preserved)", toUpdate],
    ["would insert (new slug)", toInsert],
    ["skipped: new CCN w/o name+state", skippedNoIdentity],
  ]);
  if (sampleNewSlugs.length) {
    console.log("Sample new slugs:");
    for (const s of sampleNewSlugs) console.log(`  /hospice/${s}`);
    console.log("");
  }
} else if (dbNote) {
  console.log(`NOTE: ${dbNote}\n`);
}

console.log("Sample records:");
for (const r of (existing ? payload : unique).slice(0, 3)) {
  console.log(`  ${JSON.stringify(r)}`);
}
console.log("");

if (DRY) {
  console.log("DRY RUN — nothing written.\n");
  process.exit(0);
}

/* ---------------- live write ---------------- */

// Verify target columns against the live schema; drop any the table lacks
// (e.g. ssvi_public may not carry every fy2024_* sub-column).
const allKeys = [...new Set(payload.flatMap((r) => Object.keys(r)))];
const probe = await probeColumns(client, TABLE, allKeys);
if (probe.error) die(`Could not verify ${TABLE} columns: ${probe.error.message}`);
if (probe.dropped.length) {
  console.log(`NOTE: ${TABLE} lacks these columns; they will not be written: ${probe.dropped.join(", ")}\n`);
}
const kept = new Set(probe.kept);
if (!kept.has("ccn") || !kept.has(`${V}_total_ssvi`)) {
  die(`${TABLE} is missing ccn or ${V}_total_ssvi — wrong table?`);
}
// PostgREST requires uniform keys per batch: give every row the same key set.
const uniform = payload.map((r) => {
  const o = {};
  for (const k of probe.kept) o[k] = r[k] === undefined ? null : r[k];
  return o;
});

const { written, errors } = await chunkedUpsert(client, TABLE, uniform, { onConflict: "ccn" });

printSummary("Write summary", [
  ["rows upserted", written],
  ["of which updates", toUpdate],
  ["of which inserts", toInsert],
  ["chunk errors", errors.length],
]);
if (errors.length) {
  for (const e of errors) console.error(`  ${e}`);
  console.error(
    '\nIf the error mentions "no unique or exclusion constraint", ssvi_public needs a unique index on ccn — see docs/DATA.md "One-time prerequisite".\n'
  );
  process.exit(1);
}

console.log("Done. Next steps (details in docs/DATA.md):");
console.log("  1. Run the derived-columns SQL (ranks, percentiles, ssvi_change) in the Supabase SQL editor.");
console.log("  2. Bump DATA_UPDATED in app/sitemap.js to this file's CMS publication date.");
console.log("  3. Spot-check a few /hospice/<slug> pages.\n");
