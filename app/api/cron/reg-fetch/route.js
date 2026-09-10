import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { buildFederalRegisterUrl, clampDays, mapDocuments } from "./mapping.mjs";

// GET /api/cron/reg-fetch — the Regulatory Watch fetcher.
//
// Pulls recent CMS hospice documents (rules, proposed rules, notices) from the
// Federal Register public API and queues them as reg_updates DRAFTS. Nothing
// reaches a clinic from here: drafts only surface at /admin/reg-review, where
// the admin verifies each card against its source link, writes the impact
// line, and publishes (or rejects). Full pipeline: docs/REG-WATCH.md.
//
// Triggered by the Vercel cron in vercel.json (Mondays 13:00 UTC — an hour
// before the weekly digest, so a Monday rule drop can be reviewed, published,
// and still make that morning's email). Vercel sends
//   Authorization: Bearer <CRON_SECRET>
// automatically when the CRON_SECRET env var is set on the project.
//
// ── REQUIRED ENV ────────────────────────────────────────────────────────────
//   CRON_SECRET                 shared secret; requests without the matching
//                               Bearer header are rejected 401. Unset => 503,
//                               the endpoint refuses to run at all.
//   NEXT_PUBLIC_SUPABASE_URL    Supabase project (service role reads and
//   SUPABASE_SERVICE_KEY        inserts reg_updates drafts).
//                               Missing => { ok: true, skipped } — no crash.
// ── QUERY PARAMS ────────────────────────────────────────────────────────────
//   ?dryRun=1   fetch + map + dedupe-check but write NOTHING; the JSON
//               response lists exactly the rows a live run would insert.
//   ?days=N     lookback window override, clamped to 1–90 (default 14).
// ────────────────────────────────────────────────────────────────────────────
//
// Idempotent by design: every candidate is deduped against existing rows by
// source_url (the canonical federalregister.gov document URL) across ALL
// statuses, so a document already drafted, published, or archived is never
// re-queued. The route only ever INSERTS new drafts — it never updates or
// deletes existing rows. Zero PHI: everything handled here is a public
// Federal Register document.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const dryRun = searchParams.get("dryRun") === "1";
  const days = clampDays(searchParams.get("days"), 14);

  // 1. Fetch the recent-documents window from the Federal Register API.
  let docs = [];
  try {
    const res = await fetch(buildFederalRegisterUrl(days), { cache: "no-store" });
    if (!res.ok) throw new Error(`Federal Register API responded ${res.status}`);
    const json = await res.json();
    docs = Array.isArray(json?.results) ? json.results : [];
  } catch (e) {
    console.error("[reg-fetch] Federal Register fetch failed:", e?.message || e);
    return NextResponse.json({ ok: false, error: "Federal Register fetch failed" }, { status: 502 });
  }

  const candidates = mapDocuments(docs);
  const summary = { ok: true, days, fetched: docs.length, candidates: candidates.length, alreadyQueued: 0, inserted: 0 };

  const db = supabaseService();
  if (!db) {
    // No database — mirror weekly-digest: report, never crash. A dry run
    // still shows the full mapping so the fetch half can be verified alone.
    return NextResponse.json({
      ...summary,
      skipped: "Supabase not configured",
      ...(dryRun ? { dryRun: true, dedupeChecked: false, wouldInsert: candidates } : {}),
    });
  }

  // 2. Dedupe by source_url against every existing row, whatever its status.
  let existingUrls = null; // null => the check itself failed
  try {
    const urls = candidates.map((r) => r.source_url);
    if (urls.length === 0) {
      existingUrls = new Set();
    } else {
      const { data, error } = await db.from("reg_updates").select("source_url").in("source_url", urls);
      if (error) throw error;
      existingUrls = new Set((data || []).map((r) => r.source_url).filter(Boolean));
    }
  } catch (e) {
    console.error("[reg-fetch] dedupe check failed:", e?.message || e);
  }

  if (existingUrls === null) {
    // Idempotency can't be proven, so nothing may be written. A dry run can
    // still report the mapping; a live run refuses outright.
    if (dryRun) {
      return NextResponse.json({ ...summary, dryRun: true, dedupeChecked: false, wouldInsert: candidates });
    }
    return NextResponse.json({ ...summary, ok: false, error: "Dedupe check failed — nothing written" }, { status: 500 });
  }

  const fresh = candidates.filter((r) => !existingUrls.has(r.source_url));
  summary.alreadyQueued = candidates.length - fresh.length;

  if (dryRun) {
    return NextResponse.json({ ...summary, dryRun: true, dedupeChecked: true, wouldInsert: fresh });
  }

  // 3. Insert the new drafts. Insert only — existing rows are never touched.
  if (fresh.length) {
    try {
      const { error } = await db.from("reg_updates").insert(fresh);
      if (error) throw error;
      summary.inserted = fresh.length;
    } catch (e) {
      console.error("[reg-fetch] insert failed:", e?.message || e);
      return NextResponse.json({ ...summary, ok: false, error: "Insert failed" }, { status: 500 });
    }
  }

  return NextResponse.json(summary);
}
