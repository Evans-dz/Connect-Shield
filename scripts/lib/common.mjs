// scripts/lib/common.mjs
// Shared plumbing for the CMS ingest scripts (ingest-ssvi.mjs, ingest-providers.mjs).
// Plain Node ESM. Only dependency: @supabase/supabase-js (already in package.json).

import fs from "node:fs";

/* ------------------------------------------------------------------ */
/* CLI args                                                            */
/* ------------------------------------------------------------------ */

// Tiny arg parser: `--flag value` for string flags, bare `--flag` for booleans.
export function parseArgs(argv, { strings = [], booleans = [] } = {}) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      out._.push(a);
      continue;
    }
    const name = a.slice(2);
    if (booleans.includes(name)) {
      out[name] = true;
    } else if (strings.includes(name)) {
      out[name] = argv[++i];
      if (out[name] === undefined) die(`--${name} needs a value`);
    } else {
      die(`Unknown flag: ${a}`);
    }
  }
  return out;
}

export function die(msg) {
  console.error(`\nERROR: ${msg}\n`);
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/* CSV parsing (RFC 4180: quoted fields, "" escapes, embedded commas   */
/* and newlines, CRLF, UTF-8 BOM)                                      */
/* ------------------------------------------------------------------ */

export function parseCsv(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c; // includes commas and raw newlines inside quotes
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\r") {
      // swallow; \n handles the row break
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  // Drop rows that are entirely empty (trailing blank lines etc.)
  return rows.filter((r) => r.some((f) => String(f).trim() !== ""));
}

export function readCsvFile(path) {
  let text;
  try {
    text = fs.readFileSync(path, "utf8");
  } catch (e) {
    die(`Cannot read ${path}: ${e.message}`);
  }
  const rows = parseCsv(text);
  if (rows.length < 2) die(`${path} has no data rows (got ${rows.length} line[s])`);
  return { header: rows[0], rows: rows.slice(1) };
}

/* ------------------------------------------------------------------ */
/* Header mapping                                                      */
/* ------------------------------------------------------------------ */

// "CMS Certification Number (CCN)" -> "cmscertificationnumberccn"
export function normHeader(h) {
  return String(h).toLowerCase().replace(/[^a-z0-9]/g, "");
}

// targets: [{ key, aliases: [..], pattern: RegExp|null, required: bool }]
// Matching passes, most exact first:
//   1. normalized header === alias
//   2. normalized header CONTAINS alias (aliases tried longest-first, across all targets)
//   3. target.pattern regex against the normalized header
// Each header maps to at most one target; each target takes the first header that hits.
export function mapHeaders(header, targets) {
  const normed = header.map(normHeader);
  const byKey = {}; // key -> column index
  const usedCols = new Set();

  // Pass 1: exact
  for (const t of targets) {
    for (let c = 0; c < normed.length; c++) {
      if (usedCols.has(c)) continue;
      if (t.aliases.includes(normed[c])) {
        byKey[t.key] = c;
        usedCols.add(c);
        break;
      }
    }
  }

  // Pass 2: contains, longest alias first so specific beats generic
  const pairs = [];
  for (const t of targets) {
    if (byKey[t.key] !== undefined) continue;
    for (const a of t.aliases) pairs.push([t.key, a]);
  }
  pairs.sort((x, y) => y[1].length - x[1].length);
  for (const [key, alias] of pairs) {
    if (byKey[key] !== undefined) continue;
    for (let c = 0; c < normed.length; c++) {
      if (usedCols.has(c)) continue;
      if (normed[c].includes(alias)) {
        byKey[key] = c;
        usedCols.add(c);
        break;
      }
    }
  }

  // Pass 3: regex patterns
  for (const t of targets) {
    if (byKey[t.key] !== undefined || !t.pattern) continue;
    for (let c = 0; c < normed.length; c++) {
      if (usedCols.has(c)) continue;
      if (t.pattern.test(normed[c])) {
        byKey[t.key] = c;
        usedCols.add(c);
        break;
      }
    }
  }

  const missing = targets.filter((t) => t.required && byKey[t.key] === undefined);
  const unmapped = header.filter((_, c) => !usedCols.has(c));
  return { byKey, missing, unmapped };
}

export function printMapping(header, byKey, unmapped) {
  console.log("Header mapping:");
  const inv = Object.entries(byKey).sort((a, b) => a[1] - b[1]);
  for (const [key, col] of inv) {
    console.log(`  ${String(key).padEnd(28)} <- column ${col}: "${header[col]}"`);
  }
  if (unmapped.length) {
    console.log(`  (ignored ${unmapped.length} unmapped column[s]: ${unmapped.map((h) => `"${h}"`).join(", ")})`);
  }
  console.log("");
}

/* ------------------------------------------------------------------ */
/* Value parsing / normalization                                       */
/* ------------------------------------------------------------------ */

// CCN: uppercase, strip separators, left-pad pure digits to 6 (Excel strips
// leading zeros). Result must be exactly 6 alphanumerics (e.g. 031562, A91618).
export function normalizeCcn(raw) {
  if (raw === null || raw === undefined) return null;
  let c = String(raw).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!c) return null;
  if (/^[0-9]+$/.test(c) && c.length < 6) c = c.padStart(6, "0");
  return c.length === 6 ? c : null;
}

// Verified against all 6,643 live connect-shield.com slugs (2026-08-31):
//   slug = slugify(hospice_name) + "-" + state.toLowerCase() + "-" + ccn.toLowerCase()
// slugify: lowercase; every run of non [a-z0-9] becomes a single "-"; trim "-".
//   "MAGGIE'S HOSPICE, LLC" / AZ / 031625 -> maggie-s-hospice-llc-az-031625
//   "ST CROIX HOSPICE LOMBARD" / IL / 141624 -> st-croix-hospice-lombard-il-141624
export function slugify(s) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function makeSlug(name, state, ccn) {
  return `${slugify(name)}-${String(state).toLowerCase()}-${String(ccn).toLowerCase()}`;
}

export function cleanText(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (s === "" || s === "-" || s === "--" || /^n\/?a$/i.test(s)) return null;
  return s;
}

export function parseNumber(v) {
  const s = cleanText(v);
  if (s === null) return null;
  const n = Number(s.replace(/[$,%\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

// Y/Yes/True/1/X/Flagged -> true ; N/No/False/0/blank/"-" -> false ; else null
export function parseBool(v) {
  const s = cleanText(v);
  if (s === null) return false;
  if (/^(y|yes|true|t|1|x|flagged)$/i.test(s)) return true;
  if (/^(n|no|false|f|0|notflagged|not flagged)$/i.test(s)) return false;
  return null;
}

export function parseState(v) {
  const s = cleanText(v);
  if (!s) return null;
  const up = s.toUpperCase();
  return /^[A-Z]{2}$/.test(up) ? up : null;
}

// "Urban"/"Rural"/"U"/"R" -> "U"/"R" (matches the GEO map in app/hospice/[slug]/page.jsx)
export function parseUrbanRural(v) {
  const s = cleanText(v);
  if (!s) return null;
  const c = s[0].toUpperCase();
  return c === "U" || c === "R" ? c : null;
}

// "04/07/2022" or "2022-04-07" -> "2022-04-07" (ISO for a date column)
export function parseUsDate(v) {
  const s = cleanText(v);
  if (!s) return null;
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return null;
}

/* ------------------------------------------------------------------ */
/* Supabase                                                            */
/* ------------------------------------------------------------------ */

export async function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    return {
      client: null,
      reason:
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in the environment. " +
        "Example: NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_KEY=<service-role-key> node scripts/ingest-ssvi.mjs ...",
    };
  }
  const { createClient } = await import("@supabase/supabase-js");
  return { client: createClient(url, key, { auth: { persistSession: false } }) };
}

// Page through the whole table. Returns { rows } or { error }.
export async function fetchExisting(client, table, columns) {
  const rows = [];
  const PAGE = 1000;
  for (let i = 0; i < 40; i++) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .range(i * PAGE, i * PAGE + PAGE - 1);
    if (error) return { error };
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return { rows };
}

// The live schema is not in this repo, so target columns are verified against
// the database before writing: select them with limit 1 and drop any column
// PostgREST reports as nonexistent. Returns { kept, dropped } or { error }.
export async function probeColumns(client, table, columns) {
  let kept = [...columns];
  const dropped = [];
  for (let attempt = 0; attempt < columns.length + 2; attempt++) {
    if (!kept.length) break;
    const { error } = await client.from(table).select(kept.join(",")).limit(1);
    if (!error) return { kept, dropped };
    const m =
      /column\s+(?:\S+\.)?"?([A-Za-z0-9_]+)"?\s+does not exist/i.exec(error.message || "") ||
      /'([A-Za-z0-9_]+)' column/i.exec(error.message || "");
    if (m && kept.includes(m[1])) {
      dropped.push(m[1]);
      kept = kept.filter((c) => c !== m[1]);
      continue;
    }
    return { error };
  }
  return { kept, dropped };
}

// Chunked upsert. Every row must have the same key set (PostgREST requirement).
export async function chunkedUpsert(client, table, rows, { onConflict, ignoreDuplicates = false, chunkSize = 500 } = {}) {
  let written = 0;
  const errors = [];
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await client
      .from(table)
      .upsert(chunk, { onConflict, ignoreDuplicates, count: "exact" });
    if (error) {
      errors.push(`rows ${i}-${i + chunk.length - 1}: ${error.message}`);
      if (errors.length >= 3) break; // three strikes; report and stop
    } else {
      written += chunk.length;
    }
  }
  return { written, errors };
}

/* ------------------------------------------------------------------ */
/* Output                                                              */
/* ------------------------------------------------------------------ */

export function printSummary(title, pairs) {
  console.log(`\n${title}`);
  for (const [k, v] of pairs) {
    console.log(`  ${String(k).padEnd(34)} ${v}`);
  }
  console.log("");
}
