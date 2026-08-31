import Link from "next/link";
import { ArrowRight, ShieldCheck, Link2 } from "lucide-react";
import Gauge from "@/components/Gauge";
import { supabaseService, supabasePublic, riskFromScore } from "@/lib/supabase";
import {
  NATIONAL_AVG_SSVI,
  NATIONAL_SCORED_COUNT,
  fetchStateAverage,
  fetchPublicRow,
} from "@/components/BenchmarkData";

// Public read-only score snapshot: /s/<token>
//
// The token comes from share_links (created by a signed-in user via
// POST /api/share). Resolution happens with the SERVICE ROLE key — there is no
// public SELECT on share_links, so tokens cannot be enumerated. The page shows
// ONLY published CMS SSVI data for the linked CCN: agency name, score, risk
// band, state/national comparison. No documents, no uploads, nothing private.
//
// Every failure path (missing env, unknown/revoked/expired token, no CMS row)
// renders the same honest "invalid or expired" state. noindex always.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hospice Score Snapshot",
  robots: { index: false, follow: false },
};

const TONE_BG = { low: "#EAF6EF", mid: "#FEF3E2", high: "#FDECEA" };
const TONE_FG = { low: "#1A6E41", mid: "#7A5700", high: "#B23A2E" };

async function loadSnapshot(token) {
  try {
    if (!token || token.length > 64) return null;
    const admin = supabaseService();
    if (!admin) return null; // env not wired — render the invalid state

    const { data: link, error } = await admin
      .from("share_links")
      .select("ccn, expires_at, revoked")
      .eq("token", token)
      .maybeSingle();
    if (error || !link || link.revoked) return null;
    if (link.expires_at && new Date(link.expires_at) < new Date()) return null;

    const db = supabasePublic() || admin;
    const row = await fetchPublicRow(db, link.ccn);
    if (!row || row.fy2025_total_ssvi == null) return null;

    const stateAvg = await fetchStateAverage(db, row.state);
    return { row, stateAvg };
  } catch {
    return null;
  }
}

function StatRow({ label, value, sub, highlight = false, color = null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3" style={{ borderTop: "1px solid #243354" }}>
      <div className="min-w-0">
        <div className={`text-sm ${highlight ? "font-medium text-white" : ""}`} style={highlight ? {} : { color: "#AEBAD0" }}>{label}</div>
        {sub && <div className="text-[11px] font-mono mt-0.5" style={{ color: "#7C8AA8" }}>{sub}</div>}
      </div>
      <div className="font-mono text-xl shrink-0" style={{ color: color || (highlight ? "#E8CFA0" : "#F3F5F8") }}>{value}</div>
    </div>
  );
}

export default async function SnapshotPage({ params }) {
  const snapshot = await loadSnapshot(params?.token);

  // ── Invalid / expired / unreachable ──
  if (!snapshot) {
    return (
      <section className="hero-navy">
        <div className="max-w-content mx-auto px-5 md:px-8 py-24 md:py-32">
          <div className="max-w-md mx-auto text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "#1E2C4E" }}>
              <Link2 size={22} color="#B8863F" />
            </div>
            <h1 className="font-display text-white text-2xl md:text-3xl mt-5">This link is invalid or has expired</h1>
            <p className="text-sm mt-3" style={{ color: "#93A0B8" }}>
              Score snapshot links expire after 30 days or can be revoked by whoever created them. Ask for a fresh link — or look up any hospice's published score yourself, free.
            </p>
            <div className="flex flex-wrap justify-center gap-3 mt-7">
              <Link href="/#lookup" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium" style={{ background: "#B8863F", color: "#0E1830" }}>
                Look up an SSVI score <ArrowRight size={15} />
              </Link>
              <Link href="/demo" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-white" style={{ border: "1px solid #2E3E60" }}>
                Book a demo
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  const { row, stateAvg } = snapshot;
  const total = Number(row.fy2025_total_ssvi);
  const risk = riskFromScore(total);
  const where = [row.city, row.state].filter(Boolean).join(", ");
  const pct = row.pct_national != null ? Math.round(Number(row.pct_national)) : null;
  const vsState = stateAvg ? Math.round((total - stateAvg.avg) * 10) / 10 : null;
  const vsNat = Math.round((total - NATIONAL_AVG_SSVI) * 10) / 10;

  return (
    <section className="hero-navy">
      <div className="max-w-content mx-auto px-5 md:px-8 py-14 md:py-20">
        <div className="max-w-xl mx-auto">
          <div className="eyebrow" style={{ color: "#E8CFA0" }}>Score snapshot · Published CMS data · FY2025</div>

          <div className="rounded-2xl overflow-hidden mt-4" style={{ background: "#14213D", border: "1px solid #243354" }}>
            <div className="p-6 md:p-8">
              <h1 className="font-display text-white text-2xl md:text-3xl">{row.hospice_name || `CCN ${row.ccn}`}</h1>
              <p className="text-sm font-mono mt-1.5" style={{ color: "#93A0B8" }}>
                CCN {row.ccn}{where ? ` · ${where}` : ""}
              </p>

              <div className="flex items-center gap-6 mt-6 flex-wrap">
                <Gauge score={total} tone={risk.tone} size={148} />
                <div className="min-w-0">
                  <span className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-mono font-semibold" style={{ background: TONE_BG[risk.tone], color: TONE_FG[risk.tone] }}>
                    {risk.label}
                  </span>
                  <p className="text-sm mt-3 max-w-xs" style={{ color: "#AEBAD0" }}>
                    CMS scores every Medicare-certified hospice 0–16 on nine claims-based measures. Lower is better.
                  </p>
                  {pct != null && (
                    <p className="text-[11px] font-mono mt-2" style={{ color: "#7C8AA8" }}>
                      Higher SSVI than {pct}% of scored US hospices
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <StatRow
                  label="This hospice"
                  sub={row.rank_state != null && row.n_state != null ? `#${row.rank_state} of ${Number(row.n_state).toLocaleString()} in ${row.state}` : null}
                  value={`${total} / 16`}
                  highlight
                />
                <StatRow
                  label={`${row.state || "State"} average`}
                  sub={stateAvg ? `${stateAvg.count.toLocaleString()} scored hospices${vsState != null ? ` · ${vsState > 0 ? `+${vsState} above` : vsState < 0 ? `${Math.abs(vsState)} below` : "even with"} state` : ""}` : "unavailable"}
                  value={stateAvg ? stateAvg.avg : "—"}
                />
                <StatRow
                  label="National average"
                  sub={`${NATIONAL_SCORED_COUNT.toLocaleString()} scored hospices · ${vsNat > 0 ? `+${vsNat} above` : vsNat < 0 ? `${Math.abs(vsNat)} below` : "even with"} national`}
                  value={NATIONAL_AVG_SSVI}
                />
              </div>
            </div>

            {/* ── Powered by Connect Shield ── */}
            <div className="px-6 md:px-8 py-5" style={{ background: "#0E1830", borderTop: "1px solid #243354" }}>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 text-sm text-white">
                  <ShieldCheck size={16} color="#B8863F" />
                  <span className="font-display">Powered by Connect Shield</span>
                </div>
                <Link href="/demo" className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium" style={{ background: "#B8863F", color: "#0E1830" }}>
                  See the full breakdown <ArrowRight size={14} />
                </Link>
              </div>
              <p className="text-[11px] font-mono mt-3" style={{ color: "#7C8AA8" }}>
                Read-only snapshot of published CMS SSVI data. Zero PHI · encrypted · per-clinic isolated access.
              </p>
            </div>
          </div>

          <p className="text-[11px] font-mono mt-4 text-center" style={{ color: "#7C8AA8" }}>
            Shared via Connect Shield · connect-shield.com · This link may expire or be revoked at any time.
          </p>
        </div>
      </div>
    </section>
  );
}
