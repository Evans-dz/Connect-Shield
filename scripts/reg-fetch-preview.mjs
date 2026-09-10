#!/usr/bin/env node
// scripts/reg-fetch-preview.mjs
// Preview what the Regulatory Watch fetcher (/api/cron/reg-fetch) would queue
// as drafts — no server, no CRON_SECRET, no database. Read-only against the
// public Federal Register API, using the exact same query + mapping as the
// route via app/api/cron/reg-fetch/mapping.mjs (shared module, cannot drift).
//
//   node scripts/reg-fetch-preview.mjs [--days 30]
//
// The live route additionally dedupes against existing reg_updates rows by
// source_url before inserting; this preview just shows the mapped candidates.

import { parseArgs } from "./lib/common.mjs";
import { buildFederalRegisterUrl, clampDays, mapDocuments } from "../app/api/cron/reg-fetch/mapping.mjs";

const args = parseArgs(process.argv.slice(2), { strings: ["days"], booleans: ["help"] });
if (args.help) {
  console.log("Usage: node scripts/reg-fetch-preview.mjs [--days N]   (N = 1-90, default 14)");
  process.exit(0);
}
const days = clampDays(args.days, 14);

const url = buildFederalRegisterUrl(days);
console.log(`Federal Register query (last ${days} days):\n  ${url}\n`);

const res = await fetch(url);
if (!res.ok) {
  console.error(`\nERROR: Federal Register API responded ${res.status}\n`);
  process.exit(1);
}
const json = await res.json();
const rows = mapDocuments(json?.results);

if (!rows.length) {
  console.log("No matching CMS hospice documents in the window.");
  process.exit(0);
}

console.log(`${rows.length} document[s] would be queued as drafts:\n`);
for (const r of rows) {
  console.log(`[${r.severity.toUpperCase().padEnd(6)}] ${r.tag} · ${r.published_date || "undated"}`);
  console.log(`  ${r.title}`);
  console.log(`  ${r.source_url}`);
  if (r.summary) console.log(`  ${r.summary.length > 200 ? r.summary.slice(0, 200) + "…" : r.summary}`);
  console.log("");
}
