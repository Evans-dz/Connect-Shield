import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import { buildFederalRegisterUrl, clampDays, mapDocuments, truncateSummary } from "./mapping.mjs";

// GET /api/cron/reg-fetch — the Regulatory Watch fetcher.
//
// Pulls recent CMS hospice documents (rules, proposed rules, notices) from the
// Federal Register public API and queues them as reg_updates DRAFTS. Nothing
// reaches a clinic from here: drafts only surface at /admin/reg-review, where
// the admin verifies each card against its source link, writes the impact
// line, and publishes (or rejects). A live run that inserts at least one draft
// emails ADMIN_NOTIFY so the queue never sits unnoticed. Full pipeline:
// docs/REG-WATCH.md.
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
//   RESEND_API_KEY              via lib/email.js; a live run that inserts
//                               drafts emails ADMIN_NOTIFY. Missing => send
//                               no-ops with a console.warn, run still succeeds
//                               (emailSent: "skipped").
// ── QUERY PARAMS ────────────────────────────────────────────────────────────
//   ?dryRun=1   fetch + map + dedupe-check but write NOTHING; the JSON
//               response lists exactly the rows a live run would insert,
//               plus wouldEmail/recipient (no email is ever sent on a dry run).
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

// Who gets the "new drafts awaiting review" email. Change it here (one place);
// it is the same inbox that owns /admin/reg-review.
const ADMIN_NOTIFY = "admin@connect-shield.com";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// Chip colors per severity — same trio the dashboard uses (ConnectShieldApp.jsx).
const SEVERITY_CHIP = {
  high: { bg: "#FDECEA", fg: "#D14343" },
  medium: { bg: "#FEF3E2", fg: "#C98A1F" },
  low: { bg: "#EAF6EF", fg: "#2E9E62" },
};

// One inserted draft -> one card in the notification email.
function draftItemHtml(r) {
  const chip = SEVERITY_CHIP[r.severity] || SEVERITY_CHIP.low;
  return `
      <div style="padding:12px 0;border-top:1px solid #E3E7ED;">
        <div>
          <span style="display:inline-block;background:${chip.bg};color:${chip.fg};font-family:monospace;font-size:10px;text-transform:uppercase;letter-spacing:1px;padding:2px 8px;border-radius:6px;">${esc(r.severity)}</span>
          <span style="font-family:monospace;font-size:11px;color:#64708A;margin-left:6px;">${esc(r.tag)}${r.published_date ? ` · ${esc(r.published_date)}` : ""}</span>
        </div>
        <div style="font-size:13px;color:#16202E;font-weight:600;margin-top:6px;">${esc(r.title)}</div>
        ${r.summary ? `<div style="font-size:12px;color:#64708A;margin-top:3px;">${esc(truncateSummary(r.summary, 200))}</div>` : ""}
        <a href="${esc(r.source_url)}" style="display:inline-block;font-size:11px;font-family:monospace;color:#B8863F;text-decoration:none;margin-top:4px;">View source →</a>
      </div>`;
}

// Navy/gold frame matching the weekly digest email (weekly-digest/route.js).
function draftsEmailHtml({ rows, siteUrl }) {
  const n = rows.length;
  return `
  <div style="max-width:560px;margin:0 auto;font-family:Inter,system-ui,sans-serif;background:#F5F6F8;padding:24px;">
    <div style="background:#14213D;border-radius:14px 14px 0 0;padding:20px 24px;">
      <div style="color:#E8CFA0;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:monospace;">Regulatory watch — new drafts</div>
      <div style="color:#FFFFFF;font-size:19px;margin-top:6px;font-family:Georgia,serif;">${n} new CMS document${n === 1 ? "" : "s"} queued for your review</div>
    </div>
    <div style="background:#FFFFFF;border:1px solid #E3E7ED;border-top:none;padding:20px 24px;">
      ${rows.map(draftItemHtml).join("")}
      <a href="${esc(siteUrl)}/admin/reg-review" style="display:inline-block;margin-top:18px;background:#B8863F;color:#0E1830;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:10px;">Review and publish</a>
    </div>
    <div style="background:#FFFFFF;border:1px solid #E3E7ED;border-top:none;border-radius:0 0 14px 14px;padding:12px 24px;font-size:11px;color:#8992A3;font-family:monospace;">
      Drafts are invisible to clients until you publish them · Connect Shield · zero PHI
    </div>
  </div>`;
}

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

  // Queue visibility: how many drafts are sitting in /admin/reg-review right
  // now, and how many rows exist per status. Monitoring only — never blocks.
  if (db) {
    try {
      const { data: statusRows } = await db.from("reg_updates").select("status");
      const counts = {};
      for (const r of statusRows || []) counts[r.status || "unknown"] = (counts[r.status || "unknown"] || 0) + 1;
      summary.queue = counts;
    } catch {
      /* monitoring only */
    }
  }

  if (!db) {
    // No database — mirror weekly-digest: report, never crash. A dry run
    // still shows the full mapping so the fetch half can be verified alone.
    return NextResponse.json({
      ...summary,
      skipped: "Supabase not configured",
      ...(dryRun
        ? { dryRun: true, dedupeChecked: false, wouldInsert: candidates, wouldEmail: candidates.length > 0, recipient: ADMIN_NOTIFY }
        : {}),
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
      return NextResponse.json({
        ...summary, dryRun: true, dedupeChecked: false, wouldInsert: candidates,
        wouldEmail: candidates.length > 0, recipient: ADMIN_NOTIFY,
      });
    }
    return NextResponse.json({ ...summary, ok: false, error: "Dedupe check failed — nothing written" }, { status: 500 });
  }

  const fresh = candidates.filter((r) => !existingUrls.has(r.source_url));
  summary.alreadyQueued = candidates.length - fresh.length;

  if (dryRun) {
    return NextResponse.json({
      ...summary, dryRun: true, dedupeChecked: true, wouldInsert: fresh,
      wouldEmail: fresh.length > 0, recipient: ADMIN_NOTIFY,
    });
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

  // 4. Notify the admin that drafts are waiting. Live runs with inserts only —
  // never dry runs, never zero-insert runs. Best-effort: a send failure (or a
  // missing RESEND_API_KEY) must never fail a run whose drafts are already in.
  summary.emailSent = "skipped";
  if (summary.inserted > 0) {
    try {
      const n = summary.inserted;
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://connect-shield.com").replace(/\/$/, "");
      const result = await sendEmail({
        to: ADMIN_NOTIFY,
        subject: `${n} new CMS rule${n === 1 ? "" : "s"} awaiting your review — Connect Shield Regulatory Watch`,
        html: draftsEmailHtml({ rows: fresh, siteUrl }),
        text: [
          `${n} new CMS document${n === 1 ? "" : "s"} queued as Regulatory Watch draft${n === 1 ? "" : "s"}:`,
          ...fresh.map((r) => `- [${r.severity} / ${r.tag}] ${r.published_date || "n.d."} — ${r.title}\n  ${r.source_url}`),
          `Review and publish: ${siteUrl}/admin/reg-review`,
          `Drafts are invisible to clients until published.`,
        ].join("\n"),
      });
      summary.emailSent = result.ok ? true : result.skipped ? "skipped" : false;
    } catch (e) {
      console.error("[reg-fetch] notify email failed:", e?.message || e);
      summary.emailSent = false;
    }
  }

  return NextResponse.json(summary);
}
