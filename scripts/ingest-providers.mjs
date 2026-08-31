#!/usr/bin/env node
// scripts/ingest-providers.mjs
// Backfill the full Medicare-certified hospice universe into `ssvi_public` so
// UNSCORED agencies get a directory row (all score fields stay null).
//
//   node scripts/ingest-providers.mjs --file <csv> [--dry-run] [--table ssvi_public]
//
// Source file: CMS "Hospice - General Information" CSV (one row per hospice —
// CCN, name, address, city, state, ZIP, county, phone, ownership,
// certification date). Verified download URLs are in docs/DATA.md.
//
// Behavior:
//   - INSERT-ONLY. CCNs already in the table are skipped entirely; this script
//     never touches a scored row, its name, or its slug.
//   - New rows get a slug from the verified rule in scripts/lib/common.mjs.
//   - --dry-run parses + validates + prints without writing (no env needed).
//
// Env for live writes: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_KEY.

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
  parseState,
  parseUsDate,
  getClient,
  fetchExisting,
  probeColumns,
  chunkedUpsert,
  printSummary,
} from "./lib/common.mjs";

const args = parseArgs(process.argv.slice(2), {
  strings: ["file", "table"],
  booleans: ["dry-run", "help"],
});

if (args.help || !args.file) {
  console.log("Usage: node scripts/ingest-providers.mjs --file <csv> [--dry-run] [--table ssvi_public]");
  process.exit(args.help ? 0 : 1);
}

const TABLE = args.table || "ssvi_public";
const DRY = Boolean(args["dry-run"]);

// Aliases match the verified Aug 2026 header of Hospice_General-Information:
// CMS Certification Number (CCN), Facility Name, Address Line 1, Address Line 2,
// City/Town, State, ZIP Code, County/Parish, Telephone Number, CMS Region,
// Ownership Type, Certification Date
const TARGETS = [
  { key: "ccn", required: true, aliases: ["ccn", "cmscertificationnumberccn", "cmscertificationnumber", "providerccn", "providernumber"] },
  { key: "hospice_name", required: true, aliases: ["facilityname", "hospicename", "providername", "agencyname"] },
  { key: "city", required: false, aliases: ["citytown", "city"] },
  { key: "state", required: true, aliases: ["stateabbreviation", "state"] },
  // Optional extras — written only if ssvi_public actually has these columns
  // (verified live before writing; missing ones are dropped with a note).
  { key: "address", required: false, aliases: ["addressline1", "address"] },
  { key: "zip", required: false, aliases: ["zipcode", "zip"] },
  { key: "county", required: false, aliases: ["countyparish", "county"] },
  { key: "phone", required: false, aliases: ["telephonenumber", "phonenumber", "phone"] },
  { key: "ownership_type", required: false, aliases: ["ownershiptype", "ownership"] },
  { key: "certification_date", required: false, aliases: ["certificationdate"] },
];

const { header, rows } = readCsvFile(args.file);
const { byKey, missing, unmapped } = mapHeaders(header, TARGETS);

console.log(`\ningest-providers — ${path.basename(args.file)} — table ${TABLE}${DRY ? " — DRY RUN" : ""}\n`);
printMapping(header, byKey, unmapped);

if (missing.length) {
  die(
    `Required column(s) not found: ${missing.map((t) => t.key).join(", ")}.\n` +
      `File headers were: ${header.join(" | ")}\n` +
      `Is this the Hospice General Information CSV? (See docs/DATA.md.)`
  );
}

const get = (row, key) => (byKey[key] === undefined ? undefined : row[byKey[key]]);

const records = [];
let badCcn = 0;
let badIdentity = 0;
const stateCounts = {};

for (const row of rows) {
  const ccn = normalizeCcn(get(row, "ccn"));
  if (!ccn) {
    badCcn++;
    continue;
  }
  const name = cleanText(get(row, "hospice_name"));
  const state = parseState(get(row, "state"));
  if (!name || !state) {
    badIdentity++;
    continue;
  }
  const rec = {
    ccn,
    hospice_name: name,
    state,
    slug: makeSlug(name, state, ccn),
  };
  if (byKey.city !== undefined) rec.city = cleanText(get(row, "city"));
  if (byKey.address !== undefined) rec.address = cleanText(get(row, "address"));
  if (byKey.zip !== undefined) rec.zip = cleanText(get(row, "zip"));
  if (byKey.county !== undefined) rec.county = cleanText(get(row, "county"));
  if (byKey.phone !== undefined) rec.phone = cleanText(get(row, "phone"));
  if (byKey.ownership_type !== undefined) rec.ownership_type = cleanText(get(row, "ownership_type"));
  if (byKey.certification_date !== undefined) rec.certification_date = parseUsDate(get(row, "certification_date"));

  records.push(rec);
  stateCounts[state] = (stateCounts[state] || 0) + 1;
}

// Dedupe by CCN (last occurrence wins)
const byCcn = new Map();
for (const r of records) byCcn.set(r.ccn, r);
const unique = [...byCcn.values()];
const dupes = records.length - unique.length;

/* ---------------- compare against the DB ---------------- */

const { client, reason } = await getClient();
let existing = null;
let dbNote = null;

if (client) {
  const res = await fetchExisting(client, TABLE, "ccn");
  if (res.error) {
    dbNote = `Could not read ${TABLE} (${res.error.message}).`;
    if (!DRY) die(`${dbNote}\nRefusing a live write without the existing-CCN list — this script must stay insert-only.`);
  } else {
    existing = new Set(res.rows.map((r) => r.ccn));
  }
} else {
  dbNote = reason;
  if (!DRY) die(reason);
}

const fresh = existing ? unique.filter((r) => !existing.has(r.ccn)) : null;

printSummary("Parse summary", [
  ["data rows in file", rows.length],
  ["valid provider records", unique.length],
  ["duplicate CCNs (last wins)", dupes],
  ["skipped: missing/invalid CCN", badCcn],
  ["skipped: missing name or state", badIdentity],
  ["states covered", Object.keys(stateCounts).length],
]);

if (existing) {
  printSummary("Against the database", [
    [`rows already in ${TABLE} (skipped)`, unique.length - fresh.length],
    ["new directory rows to insert", fresh.length],
  ]);
  console.log("Sample new rows:");
  for (const r of fresh.slice(0, 5)) console.log(`  /hospice/${r.slug}`);
  if (!fresh.length) console.log("  (none — universe already covered)");
  console.log("");
} else if (dbNote) {
  console.log(`NOTE: ${dbNote} New-row split unavailable in this dry run.\n`);
}

console.log("Sample records:");
for (const r of unique.slice(0, 3)) console.log(`  ${JSON.stringify(r)}`);
console.log("");

if (DRY) {
  console.log("DRY RUN — nothing written.\n");
  process.exit(0);
}

/* ---------------- live write (insert-only) ---------------- */

if (!fresh.length) {
  console.log("Nothing to insert. Done.\n");
  process.exit(0);
}

const allKeys = [...new Set(fresh.flatMap((r) => Object.keys(r)))];
const probe = await probeColumns(client, TABLE, allKeys);
if (probe.error) die(`Could not verify ${TABLE} columns: ${probe.error.message}`);
if (probe.dropped.length) {
  console.log(`NOTE: ${TABLE} lacks these columns; they will not be written: ${probe.dropped.join(", ")}\n`);
}
const required = ["ccn", "hospice_name", "state", "slug"];
for (const k of required) {
  if (!probe.kept.includes(k)) die(`${TABLE} is missing required column ${k} — wrong table?`);
}
const uniform = fresh.map((r) => {
  const o = {};
  for (const k of probe.kept) o[k] = r[k] === undefined ? null : r[k];
  return o;
});

// ignoreDuplicates: a concurrent insert can never overwrite an existing row.
const { written, errors } = await chunkedUpsert(client, TABLE, uniform, {
  onConflict: "ccn",
  ignoreDuplicates: true,
});

printSummary("Write summary", [
  ["new rows inserted", written],
  ["chunk errors", errors.length],
]);
if (errors.length) {
  for (const e of errors) console.error(`  ${e}`);
  console.error(
    '\nIf the error mentions "no unique or exclusion constraint", ssvi_public needs a unique index on ccn — see docs/DATA.md "One-time prerequisite".\n'
  );
  process.exit(1);
}

console.log("Done. Unscored rows will NOT appear on the site yet — every page filters on");
console.log("fy2025_total_ssvi IS NOT NULL. They become visible only when the pages add");
console.log("directory support for unscored agencies. Details: docs/DATA.md.\n");
