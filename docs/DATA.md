# DATA.md — SSVI data: schema, sources, ingest runbook

Goal: match Hospice Engine's coverage.

| | Hospice Engine | Connect Shield today | After this runbook |
|---|---|---|---|
| Hospices | 7,059 | 6,643 | full certified universe |
| Score vintages | FY2024 + FY2025 | FY2025 only | FY2024 + FY2025 |
| Unscored agencies | directory rows | none | directory rows (scores null) |

Three loads, in order:

1. `scripts/ingest-ssvi.mjs --vintage fy2025` — refresh FY2025 from the **final** rule file.
2. `scripts/ingest-ssvi.mjs --vintage fy2024` — load FY2024 from the **proposed** rule file.
3. `scripts/ingest-providers.mjs` — backfill unscored certified hospices as directory rows.

---

## 1. The `ssvi_public` schema (inferred)

There is no migration file in this repo. The schema below is inferred from every
query against the table. Column → where it's used:

| Column | Type | Seen in |
|---|---|---|
| `ccn` | text, 6 chars, UPPER, **unique key** | SSVILookup.jsx, ccn/[cnn]/page.jsx |
| `slug` | text, unique, the URL (`/hospice/<slug>`) | sitemap.js, [slug]/page.jsx |
| `hospice_name` | text, stored verbatim from CMS file (often ALL CAPS) | SSVILookup.jsx, SSVIMap.jsx |
| `city` | text | [slug]/page.jsx |
| `state` | text, 2-letter UPPER | state/[code]/page.jsx (`eq('state', code)`) |
| `urban_rural` | text `'U'`/`'R'` | [slug]/page.jsx (`GEO` map) |
| `fy2025_total_ssvi` | numeric 0–16, **null = unscored** | every page filters `not null` |
| `fy2025_spending_score` | numeric 0–8 | [slug], ssvi-by-state |
| `fy2025_utilization_score` | numeric 0–8 | [slug], ssvi-by-state |
| `fy2025_spending_per_day` | numeric ($) | [slug]/page.jsx |
| `fy2025_live_discharge` … 8 boolean flags | boolean | [slug]/page.jsx `MEASURES` |
| `fy2024_total_ssvi` | numeric 0–16 | [slug], ssvi-by-state |
| `ssvi_change` | numeric (fy2025 − fy2024) | [slug], SSVIMap.jsx |
| `rank_national`, `n_national`, `pct_national` | int / int / numeric | [slug]/page.jsx |
| `rank_state`, `n_state` | int | [slug]/page.jsx |

The 8 flag columns: `fy2025_live_discharge`, `fy2025_los_180`,
`fy2025_nursing_facility`, `fy2025_no_chc_gip`, `fy2025_last_two_days`,
`fy2025_sn_minutes`, `fy2025_weekend_visits`, `fy2025_return_7days`.
Invariant the site relies on: the count of true flags == the utilization score
(app/api/ssvi-lookup/route.js enforces this framing). The ingest script warns on
any row where they disagree.

**Second table:** `ssvi_scores` (app/api/ssvi/route.js, app/api/ssvi-lookup/route.js)
holds the full per-CCN row including `fy2024_spending_score`,
`fy2024_utilization_score`, and all 8 `fy2024_*` flags. Whether it is a separate
table or `ssvi_public` under a view could not be determined from the repo. If it
is separate, run each ingest a second time with `--table ssvi_scores`.

**Does FY2024 just need loading? Yes.** `fy2024_total_ssvi` is already queried in
`app/hospice/[slug]/page.jsx` and `app/hospice/ssvi-by-state/page.jsx`, and
`ssvi_scores` queries reference the full fy2024 column family — the schema and UI
("vs FY2024" tile) are already built. The column is presumably null today; the
fy2024 ingest fills it. The scripts probe the live schema before writing and
skip any fy2024 sub-columns `ssvi_public` turns out not to have.

**Loading is safe now.** Every public page filters `fy2025_total_ssvi IS NOT NULL`,
so FY2024-only and unscored rows are invisible until the pages opt in. No layout
can break from these loads.

---

## 2. Slug rule (verified, do not change)

Verified against all 6,643 slugs in the live `connect-shield.com/sitemap.xml`
(2026-08-31): every slug matches `^[a-z0-9-]+-[a-z]{2}-[0-9a-z]{6}$`.

```
slug = slugify(hospice_name) + "-" + lower(state) + "-" + lower(ccn)
slugify: lowercase; each run of non-alphanumerics -> one "-"; trim "-"
```

| CMS name / state / CCN | slug |
|---|---|
| MAGGIE'S HOSPICE, LLC / AZ / 031625 | `maggie-s-hospice-llc-az-031625` |
| ST CROIX HOSPICE LOMBARD / IL / 141624 | `st-croix-hospice-lombard-il-141624` |
| OPTIMAL CARES HOSPICE / TX / A91618 | `optimal-cares-hospice-tx-a91618` |

Implemented in `scripts/lib/common.mjs` (`makeSlug`). Existing rows always keep
their stored slug — the scripts never regenerate a live URL. One synthetic row
exists: `demo-hospice-llc-us-demo01` (CCN `DEMO01`); CMS files never contain it,
so ingests can't touch it.

CCN normalization: uppercase, strip separators, left-pad pure digits to 6
(Excel drops leading zeros → `31562` becomes `031562`). Letters are real
(subunit CCNs like `A91618`); result must be exactly 6 chars or the row is
rejected and counted.

---

## 3. Where the CMS files live (verified 2026-08-31)

### FY2025 scores — FY2027 FINAL rule (CMS-1851-F, issued 2026-07-30)

Rule page: <https://www.cms.gov/medicare/payment/fee-for-service-providers/hospice/hospice-regulations-and-notices/cms-1851-f>

| File | URL | Verified |
|---|---|---|
| SSVI data (zip) | <https://www.cms.gov/files/zip/service-spending-variation-index-ssvi.zip> | 200, 5.8 MB |
| FY 2027 Final SSVI Overview (pdf) | <https://www.cms.gov/files/document/fy-2027-final-ssvi-overview.pdf> | 200, 337 KB |

### FY2024 scores — FY2027 PROPOSED rule (CMS-1851-P, April 2026)

Yes — an SSVI file **was** published with the proposed rule.
Rule page: <https://www.cms.gov/medicare/payment/fee-for-service-providers/hospice/hospice-regulations-and-notices/cms-1851-p>

| File | URL | Verified |
|---|---|---|
| SSVI data (zip) | <https://www.cms.gov/files/zip/ssvi.zip> | 200, 6.8 MB, last-modified 2026-04-17 |
| SSVI Overview (pdf) | <https://www.cms.gov/files/document/ssvi-overview.pdf> | 200, 447 KB |
| Expanded Parts B/D Non-Hospice Spending (zip) | <https://www.cms.gov/files/zip/expanded-parts-b-d-non-hospice-spending.zip> | 200, 6.2 MB |

The proposed-rule SSVI file is the FY2024+FY2025 vintage this site's own source
notes were written against ("FY2025 and FY2024 scores as published by CMS").
The site's current 6,643 = FY2025-scored; Hospice Engine's 7,059 ≈ the
FY2024∪FY2025 scored universe — the FY2024 load closes that gap.

**Not verified — say-so, not guess:** the zips' internal filenames and CSV
column headers (URL checks only; the archives were not opened). The scripts
handle this: the first `--dry-run` prints the full header→column mapping. If a
column maps wrong or a required one is missed, add its header to the alias list
in `TARGETS` at the top of the script — one line.

### Unscored universe — certified-hospice directory

| Source | URL | Verified |
|---|---|---|
| Hospice – General Information (dataset page, stable) | <https://data.cms.gov/provider-data/dataset/yc9t-dgbk> | 200 |
| Current CSV (Aug 2026 refresh — this link rotates each refresh) | <https://data.cms.gov/provider-data/sites/default/files/resources/18afea60c672e37d2f0d6e8ed984eaa6_1787169953/Hospice_General-Information_Aug2026_2.csv> | 200, 857 KB, ~6,669 hospices |
| Provider of Services (POS) file — deeper fallback | <https://data.cms.gov/provider-characteristics/hospitals-and-other-facilities/provider-of-services-file-quality-improvement-and-evaluation-system> | 200 |

General Information header (verified): `CMS Certification Number (CCN), Facility
Name, Address Line 1, Address Line 2, City/Town, State, ZIP Code, County/Parish,
Telephone Number, CMS Region, Ownership Type, Certification Date`. `-` means null.

Always grab the current CSV from the dataset page, not the cached link above.
The POS file is the fullest certified universe (includes newly certified
agencies not yet in Care Compare); it covers all facility types, so filter to
the hospice provider category per its data dictionary before feeding it in.

---

## 4. One-time prerequisite

Upsert-by-CCN needs a unique constraint. If the first live run errors with
`no unique or exclusion constraint matching the ON CONFLICT specification`,
run once in the Supabase SQL editor:

```sql
create unique index if not exists ssvi_public_ccn_key on public.ssvi_public (ccn);
```

---

## 5. Runbook

Credentials: real values from Vercel → connect-shield → Settings → Environment
Variables (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_KEY`). The local
`.env.local` has dead placeholders — don't source it for a live run.

```bash
cd ~/connect-shield
mkdir -p ~/Downloads/cms-ssvi && cd ~/Downloads/cms-ssvi

# 1. Download + unzip (filenames inside the zips will differ — ls and use the provider-level CSV)
curl -LO https://www.cms.gov/files/zip/service-spending-variation-index-ssvi.zip
curl -LO https://www.cms.gov/files/zip/ssvi.zip
unzip -o service-spending-variation-index-ssvi.zip -d final-fy2025
unzip -o ssvi.zip -d proposed-fy2024
ls final-fy2025 proposed-fy2024   # find the provider-level CSV in each
# If a file is .xlsx, export the provider sheet to CSV first (Numbers/Excel: File > Export).

# 2. ALWAYS dry-run first — check the header mapping and the counts
cd ~/connect-shield
node scripts/ingest-ssvi.mjs --file ~/Downloads/cms-ssvi/final-fy2025/<provider-file>.csv --vintage fy2025 --dry-run

# 3. Live (exports real creds for this shell only)
export NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
export SUPABASE_SERVICE_KEY="<service-role-key>"
node scripts/ingest-ssvi.mjs --file ~/Downloads/cms-ssvi/final-fy2025/<provider-file>.csv --vintage fy2025

# 4. FY2024 — same two steps
node scripts/ingest-ssvi.mjs --file ~/Downloads/cms-ssvi/proposed-fy2024/<provider-file>.csv --vintage fy2024 --dry-run
node scripts/ingest-ssvi.mjs --file ~/Downloads/cms-ssvi/proposed-fy2024/<provider-file>.csv --vintage fy2024
# NOTE: if the proposed-rule file carries BOTH years' scores, also load its
# FY2025 columns only if you did NOT load the final-rule file. Final beats proposed.

# 5. Directory universe (insert-only; cannot touch scored rows)
#    Get the current CSV link from https://data.cms.gov/provider-data/dataset/yc9t-dgbk
node scripts/ingest-providers.mjs --file ~/Downloads/Hospice_General-Information_Aug2026_2.csv --dry-run
node scripts/ingest-providers.mjs --file ~/Downloads/Hospice_General-Information_Aug2026_2.csv
```

What to expect from the dry run: `valid scored records` ≈ 6,6xx–7,0xx;
`skipped: missing/invalid CCN` near zero (a big number = wrong column mapped);
`flag-sum != utilization score` near zero (a big number = flag columns mapped
wrong — stop and fix aliases).

### 5a. Refresh derived columns (after any score load)

The scripts fill `ssvi_change` where both totals are known, but ranks and
percentiles are set-based — refresh them once in the Supabase SQL editor:

```sql
-- ssvi_change for every row (covers rows the scripts didn't pair up)
update public.ssvi_public
set ssvi_change = fy2025_total_ssvi - fy2024_total_ssvi
where fy2025_total_ssvi is not null and fy2024_total_ssvi is not null;

-- ranks + percentile over the FY2025-scored set
with ranked as (
  select ccn,
    rank()  over (order by fy2025_total_ssvi desc)                     as r_nat,
    count(*) over ()                                                   as n_nat,
    rank()  over (partition by state order by fy2025_total_ssvi desc)  as r_st,
    count(*) over (partition by state)                                 as n_st,
    round(100.0 * percent_rank() over (order by fy2025_total_ssvi))    as pct
  from public.ssvi_public
  where fy2025_total_ssvi is not null
)
update public.ssvi_public p
set rank_national = r.r_nat, n_national = r.n_nat,
    rank_state = r.r_st, n_state = r.n_st, pct_national = r.pct
from ranked r
where p.ccn = r.ccn;
```

### 5b. Bump the sitemap date

`app/sitemap.js` line ~16:

```js
const DATA_UPDATED = new Date("2026-07-30");  // set to the CMS publication date of the newest loaded file
```

That constant is `lastModified` for every directory URL — a real crawl signal.
Commit + deploy; the sitemap regenerates within a day (`revalidate = 86400`).

### 5c. Verify

- `https://connect-shield.com/hospice/<some-slug>` — "vs FY2024" tile shows a number, not "—".
- `curl -s https://connect-shield.com/sitemap.xml | grep -c "<loc>"` — count grew only if new scored agencies appeared.
- SSVI lookup on the homepage still resolves a known CCN.

---

## 6. When CMS re-releases scores (next: FY2028 proposed rule, ~April 2027)

- [ ] Find the new rule page under `cms.gov/medicare/payment/fee-for-service-providers/hospice/hospice-regulations-and-notices/` (pattern: `cms-<number>-p` / `-f`) and its SSVI zip.
- [ ] Check the overview PDF: did measures, the 0–16 scale, or column names change? If a new fiscal year appears (fy2026), the table needs new columns and the pages new copy — that's a schema+UI change, not just a load.
- [ ] `--dry-run` first, every time. Read the header mapping line by line.
- [ ] Live load newest vintage first, then older; final-rule files beat proposed-rule files for the same year.
- [ ] Re-run ingest-providers with a fresh General Information CSV (link rotates monthly).
- [ ] Run the SQL in 5a. Bump `DATA_UPDATED` (5b). Verify (5c).
- [ ] Hardcoded counts in page copy go stale: "6,643" appears in `components/SSVILookup.jsx` and `app/hospice/ssvi-by-state/page.jsx` — flag whoever owns those files.
- [ ] Positioning guardrails: scores are published CMS data, not quality ratings; the hospice Special Focus Program is suspended (since Feb 2025) — never imply active SFP selection.

---

## Script reference

| | `ingest-ssvi.mjs` | `ingest-providers.mjs` |
|---|---|---|
| Args | `--file <csv> --vintage fy2025\|fy2024 [--dry-run] [--table]` | `--file <csv> [--dry-run] [--table]` |
| Writes | upsert by CCN | insert-only (existing CCNs skipped) |
| Slugs | new rows only; existing slugs preserved | new rows only |
| Skips | rows w/o CCN or w/o total score | rows w/o CCN, name, or state |
| Schema drift | probes live columns, drops missing ones with a note | same |
| Env | `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_KEY` (live runs only) | same |

Fixtures: `scripts/fixtures/ssvi-sample.csv`, `scripts/fixtures/providers-sample.csv`
(quoted commas, embedded newline, short CCN, letter CCN, missing CCN, unscored row).
Smoke test any time:

```bash
node scripts/ingest-ssvi.mjs --file scripts/fixtures/ssvi-sample.csv --vintage fy2025 --dry-run
node scripts/ingest-providers.mjs --file scripts/fixtures/providers-sample.csv --dry-run
```
