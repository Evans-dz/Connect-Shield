# REG-WATCH.md — Regulatory Watch pipeline: fetcher, review queue, publish

How a Federal Register rule drop becomes a card on every clinic's dashboard.
Nothing reaches a clinic without a human approving it first.

```
Federal Register API ──► /api/cron/reg-fetch ──► reg_updates (status = draft)
      (public, no key)     (Vercel cron, Mon 13:00 UTC)         │
                                                                ▼
                                              /admin/reg-review  (admin only)
                                              verify source · write impact line
                                               │                        │
                                            Publish                  Reject
                                               │                        │
                                    status = published          status = archived
                                               │
              ┌────────────────────────────────┴───────────────────┐
              ▼                                                    ▼
   Dashboard › Regulatory Watch                     /api/cron/weekly-digest
   (every clinic, immediately)                      (Mon 14:00 UTC — one hour
                                                    after the fetcher, so a
                                                    same-morning publish still
                                                    makes the email)
```

## 1. The fetcher — `/api/cron/reg-fetch`

Pulls recent CMS documents matching **hospice** (rules, proposed rules,
notices) from the Federal Register public API and inserts them as
`reg_updates` drafts. Runs weekly via the cron in `vercel.json`
(`0 13 * * 1`).

Per document it writes:

| Column | Value |
|---|---|
| `status` | `draft` — invisible to clinics until published |
| `source` | `Federal Register` |
| `tag` | `Final Rule` / `Proposed Rule` / `Notice` (from document type) |
| `severity` | heuristic: text mentions "final rule" → high, "proposed" → medium, else low |
| `title` | document title, verbatim |
| `summary` | abstract, truncated to ~500 chars |
| `impact` | **null — the reviewer writes the "what it means for you" line** |
| `published_date` | Federal Register publication date |
| `source_url` | canonical federalregister.gov URL (the "View source" link) |

**Idempotent:** every candidate is deduped by `source_url` against existing
rows in *any* status, so re-running never re-queues a document that was
already drafted, published, or archived. The route only inserts — it never
updates or deletes. If the dedupe check itself fails, a live run writes
nothing.

Query + mapping live in `app/api/cron/reg-fetch/mapping.mjs`, shared with the
preview script below so the two can't drift.

### "New drafts" email notification

A **live run that inserts at least one draft** emails
`admin@connect-shield.com` (the `ADMIN_NOTIFY` const at the top of
`route.js`) so the review queue never sits unnoticed between Monday logins:
one email per run, listing every inserted draft — severity, tag, publication
date, title, trimmed summary, source link — with a **Review and publish**
button into `/admin/reg-review`. Dry runs and zero-insert runs never email.

Delivery is best-effort: a failed or skipped send **never fails the run** —
the drafts are already inserted, and the response reports what happened via
`emailSent`:

| `emailSent` | Meaning |
|---|---|
| `true` | notification delivered to Resend |
| `"skipped"` | nothing inserted, or `RESEND_API_KEY` not set (send no-ops with a console.warn) |
| `false` | send attempted and failed (run still `ok: true`) |

Dry runs instead report `wouldEmail` (would a live run with this result have
emailed?) plus `recipient`, so the wiring is testable without any email keys.

Sends go through `lib/email.js` and need **`RESEND_API_KEY`** — a free
[resend.com](https://resend.com) account is enough. Verify the
`connect-shield.com` domain there (or use Resend's test sender via
`EMAIL_FROM` while unverified), create an API key, and set it in the Vercel
project env. It is the **same key the weekly digest uses** — set it once,
both emails work.

## 2. The review queue — `/admin/reg-review`

Log in as `admin@connect-shield.com` (the gate is `ADMIN_EMAIL` in
`app/admin/reg-review/page.js` and `actions.js`). For each draft:

1. Open the source link and verify the card against the actual document.
2. Fix the severity if the heuristic guessed wrong (it's deliberately dumb).
3. Write the impact line — drafts arrive without one on purpose.
4. **Publish** (→ every clinic's feed immediately, plus the next digest) or
   **Reject** (→ archived, and the fetcher will not re-queue it).

## 3. Trigger manually

Always dry-run first — it fetches, maps, and dedupe-checks but writes nothing,
returning exactly the rows a live run would insert:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://connect-shield.com/api/cron/reg-fetch?dryRun=1"

# happy with the output? run it live:
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://connect-shield.com/api/cron/reg-fetch"
```

`?days=N` (1–90, default 14) widens the lookback — useful after a gap:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://connect-shield.com/api/cron/reg-fetch?dryRun=1&days=60"
```

Responses: `503` = `CRON_SECRET` not set on the project, `401` = wrong bearer,
otherwise JSON with `fetched` / `candidates` / `alreadyQueued` / `inserted` /
`emailSent` (or, on a dry run, `wouldInsert` rows plus `wouldEmail` +
`recipient` — a dry run never sends email).

## 4. Local preview (no server, no secret, no database)

```bash
node scripts/reg-fetch-preview.mjs --days 30
```

Read-only against the public API; prints every document the fetcher would
queue, with severity, tag, date, title, URL, and summary. Verified 2026-09-10:
a 90-day window catches the *FY 2027 Hospice Wage Index and Payment Rate
Update* final rule (published 2026-08-03) as HIGH / Final Rule.

## 5. One-time Vercel setup

Set **`CRON_SECRET`** in the Vercel project env (any long random string — the
same variable the weekly digest already requires; set it once, both crons use
it). Vercel automatically sends it as the Bearer header on cron invocations.
Without it, both cron endpoints refuse to run (503). The fetcher also needs
`NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_KEY` (already required
app-wide); with Supabase unconfigured it reports `skipped` instead of
crashing. For the new-drafts notification email, set **`RESEND_API_KEY`**
(shared with the weekly digest — see the notification section under §1);
without it the fetcher still runs fine and reports `emailSent: "skipped"`.

Zero PHI anywhere in this pipeline: every input is a public Federal Register
document and every output is Connect Shield's own regulatory summary.
