import { NextResponse } from "next/server";
import { supabaseService, riskFromScore } from "@/lib/supabase";
import { sendEmail } from "@/lib/email";
import { NATIONAL_AVG_SSVI, fetchPublicRow } from "@/components/BenchmarkData";

// GET /api/cron/weekly-digest — the Monday-morning per-clinic email digest.
//
// Triggered by the Vercel cron in vercel.json. Vercel sends
//   Authorization: Bearer <CRON_SECRET>
// automatically when the CRON_SECRET env var is set on the project.
//
// ── REQUIRED ENV ────────────────────────────────────────────────────────────
//   CRON_SECRET                 shared secret; requests without the matching
//                               Bearer header are rejected 401. Unset => 503,
//                               the endpoint refuses to run at all.
//   NEXT_PUBLIC_SUPABASE_URL    Supabase project (service role reads clinics,
//   SUPABASE_SERVICE_KEY        profiles, user emails, reg_updates).
//                               Missing/dead => { ok: true, skipped } — no crash.
//   RESEND_API_KEY              via lib/email.js; missing => sends no-op with
//                               a console.warn (digest compiles, nothing sent).
//   EMAIL_FROM                  optional verified sender override.
// ────────────────────────────────────────────────────────────────────────────
//
// Per clinic: current published SSVI + risk band, national/state position, and
// Regulatory Watch items published in the last 7 days (admin-approved only —
// reg_updates.status = 'published'). Zero PHI: everything in the email is
// published CMS data or Connect Shield's own regulatory summaries.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function digestHtml({ clinicName, ssvi, reg, siteUrl }) {
  const rows = [];
  if (ssvi) {
    const risk = riskFromScore(ssvi.total);
    rows.push(`
      <tr><td style="padding:6px 0;color:#64708A;font-size:13px;">FY2025 SSVI</td>
      <td style="padding:6px 0;text-align:right;font-family:monospace;font-size:15px;color:#16202E;"><strong>${esc(ssvi.total)}</strong> / 16 · ${esc(risk.label)}</td></tr>`);
    if (ssvi.pct != null) rows.push(`
      <tr><td style="padding:6px 0;color:#64708A;font-size:13px;">National position</td>
      <td style="padding:6px 0;text-align:right;font-family:monospace;font-size:13px;color:#16202E;">higher than ${esc(ssvi.pct)}% of US hospices</td></tr>`);
    if (ssvi.rankState != null && ssvi.nState != null) rows.push(`
      <tr><td style="padding:6px 0;color:#64708A;font-size:13px;">${esc(ssvi.state)} rank</td>
      <td style="padding:6px 0;text-align:right;font-family:monospace;font-size:13px;color:#16202E;">#${esc(ssvi.rankState)} of ${esc(ssvi.nState)}</td></tr>`);
    rows.push(`
      <tr><td style="padding:6px 0;color:#64708A;font-size:13px;">National average</td>
      <td style="padding:6px 0;text-align:right;font-family:monospace;font-size:13px;color:#16202E;">${NATIONAL_AVG_SSVI}</td></tr>`);
  } else {
    rows.push(`
      <tr><td style="padding:6px 0;color:#64708A;font-size:13px;" colspan="2">No published FY2025 SSVI on file for your CCN yet.</td></tr>`);
  }

  const regHtml = reg.length
    ? reg
        .map(
          (r) => `
      <div style="padding:10px 0;border-top:1px solid #E3E7ED;">
        <div style="font-size:13px;color:#16202E;font-weight:600;">${esc(r.title)}</div>
        <div style="font-size:12px;color:#64708A;margin-top:3px;">${esc(r.summary || "")}</div>
        <div style="font-size:11px;color:#8992A3;font-family:monospace;margin-top:3px;">${esc(r.source || "")}${r.published_date ? ` · ${esc(r.published_date)}` : ""}</div>
      </div>`
        )
        .join("")
    : `<div style="padding:10px 0;border-top:1px solid #E3E7ED;font-size:12px;color:#8992A3;">No new regulatory items this week.</div>`;

  return `
  <div style="max-width:560px;margin:0 auto;font-family:Inter,system-ui,sans-serif;background:#F5F6F8;padding:24px;">
    <div style="background:#14213D;border-radius:14px 14px 0 0;padding:20px 24px;">
      <div style="color:#E8CFA0;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:monospace;">Weekly compliance digest</div>
      <div style="color:#FFFFFF;font-size:19px;margin-top:6px;font-family:Georgia,serif;">${esc(clinicName || "Your hospice")}</div>
    </div>
    <div style="background:#FFFFFF;border:1px solid #E3E7ED;border-top:none;padding:20px 24px;">
      <table style="width:100%;border-collapse:collapse;">${rows.join("")}</table>
      <div style="font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:monospace;color:#64708A;margin-top:18px;">Regulatory watch — past 7 days</div>
      ${regHtml}
      <a href="${esc(siteUrl)}/dashboard" style="display:inline-block;margin-top:18px;background:#B8863F;color:#0E1830;text-decoration:none;font-size:13px;font-weight:600;padding:10px 18px;border-radius:10px;">Open your dashboard</a>
    </div>
    <div style="background:#FFFFFF;border:1px solid #E3E7ED;border-top:none;border-radius:0 0 14px 14px;padding:12px 24px;font-size:11px;color:#8992A3;font-family:monospace;">
      Connect Shield · published CMS data only · zero PHI stored
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

  const db = supabaseService();
  if (!db) {
    return NextResponse.json({ ok: true, sent: 0, skipped: "Supabase not configured" });
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://connect-shield.com").replace(/\/$/, "");
  const summary = { ok: true, clinics: 0, sent: 0, skipped: 0, errors: 0 };

  try {
    // Everything up front, each result null-guarded.
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const [clinicsRes, ccnsRes, profilesRes, regRes] = await Promise.all([
      db.from("clinics").select("id, name"),
      db.from("clinic_ccns").select("clinic_id, ccn, is_primary"),
      db.from("profiles").select("id, clinic_id"),
      db.from("reg_updates").select("title, summary, source, published_date")
        .eq("status", "published").gte("published_date", weekAgo)
        .order("published_date", { ascending: false }).limit(5),
    ]);

    const clinics = clinicsRes.data || [];
    const ccns = ccnsRes.data || [];
    const profiles = profilesRes.data || [];
    const reg = regRes.data || [];

    // Emails live in auth.users — service role only, via the admin API.
    const emailById = new Map();
    try {
      const { data: usersPage } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
      (usersPage?.users || []).forEach((u) => { if (u?.email) emailById.set(u.id, u.email); });
    } catch (e) {
      console.warn("[weekly-digest] could not list users:", e?.message || e);
    }

    for (const clinic of clinics) {
      summary.clinics++;
      try {
        const recipients = profiles
          .filter((p) => p.clinic_id === clinic.id)
          .map((p) => emailById.get(p.id))
          .filter(Boolean);
        if (!recipients.length) { summary.skipped++; continue; }

        const clinicCcns = ccns
          .filter((c) => c.clinic_id === clinic.id)
          .sort((a, b) => (b.is_primary === true) - (a.is_primary === true));
        const ccn = clinicCcns[0]?.ccn || null;

        let ssvi = null;
        if (ccn) {
          const row = await fetchPublicRow(db, ccn);
          if (row?.fy2025_total_ssvi != null) {
            ssvi = {
              total: Number(row.fy2025_total_ssvi),
              pct: row.pct_national != null ? Math.round(Number(row.pct_national)) : null,
              state: row.state || null,
              rankState: row.rank_state ?? null,
              nState: row.n_state ?? null,
            };
          }
        }

        const risk = ssvi ? riskFromScore(ssvi.total) : null;
        const subject = ssvi
          ? `Weekly digest — SSVI ${ssvi.total}/16 (${risk.label}) · ${clinic.name || "your hospice"}`
          : `Weekly digest · ${clinic.name || "your hospice"}`;

        const result = await sendEmail({
          to: recipients,
          subject,
          html: digestHtml({ clinicName: clinic.name, ssvi, reg, siteUrl }),
          text: [
            `Connect Shield weekly digest — ${clinic.name || "your hospice"}`,
            ssvi ? `FY2025 SSVI: ${ssvi.total}/16 (${risk.label}). National average: ${NATIONAL_AVG_SSVI}.` : "No published FY2025 SSVI on file yet.",
            ssvi?.pct != null ? `Higher SSVI than ${ssvi.pct}% of US hospices.` : null,
            reg.length ? `New regulatory items: ${reg.map((r) => r.title).join("; ")}` : "No new regulatory items this week.",
            `${siteUrl}/dashboard`,
          ].filter(Boolean).join("\n"),
        });

        if (result.ok) summary.sent++;
        else if (result.skipped) summary.skipped++;
        else summary.errors++;
      } catch (e) {
        console.error("[weekly-digest] clinic failed:", clinic?.id, e?.message || e);
        summary.errors++;
      }
    }
  } catch (e) {
    console.error("[weekly-digest] run failed:", e?.message || e);
    return NextResponse.json({ ok: false, error: "Digest run failed", ...summary }, { status: 500 });
  }

  return NextResponse.json(summary);
}
