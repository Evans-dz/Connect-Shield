import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Link2,
  Lock,
  Home,
  Activity,
  PieChart,
  BarChart3,
  MessageSquare,
  ClipboardCheck,
  FileText,
  Bot,
  BookOpen,
} from "lucide-react";
import Gauge from "@/components/Gauge";
import { supabaseService, supabasePublic, riskFromScore } from "@/lib/supabase";
import {
  NATIONAL_AVG_SSVI,
  NATIONAL_SCORED_COUNT,
  fetchStateAverage,
} from "@/components/BenchmarkData";

// Locked portal preview: /s/<token>
//
// The token comes from share_links (created by a signed-in user via
// POST /api/share). Resolution happens with the SERVICE ROLE key — there is no
// public SELECT on share_links, so tokens cannot be enumerated.
//
// SAFETY INVARIANT — this page renders ONLY published CMS data from the public
// ssvi_public table for the linked CCN: name, location, SSVI scores, the eight
// utilization flags, and precomputed ranks. It must NEVER read clinic-owned
// tables, uploaded documents, computed CAP dollar figures, or anything a
// customer put into their portal. Share links get forwarded to strangers;
// nothing private may be reachable from this route. The locked sidebar rows and
// teaser cards are visual chrome only — there is no data behind them.
//
// Every failure path (missing env, unknown/revoked/expired token, no CMS row)
// renders the same honest "invalid or expired" state. noindex always.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Hospice Portal Preview",
  robots: { index: false, follow: false },
};

const TONE_BG = { low: "#EAF6EF", mid: "#FEF3E2", high: "#FDECEA" };
const TONE_FG = { low: "#1A6E41", mid: "#7A5700", high: "#B23A2E" };

// The eight FY2025 utilization measures — same keys and labels as the public
// agency page (app/hospice/[slug]). All boolean columns on ssvi_public.
const MEASURES = [
  ["fy2025_live_discharge", "Live discharge rate"],
  ["fy2025_los_180", "Length of stay over 180 days"],
  ["fy2025_nursing_facility", "Nursing facility patient share"],
  ["fy2025_no_chc_gip", "No continuous home care or general inpatient care"],
  ["fy2025_last_two_days", "Visits in last two days of life"],
  ["fy2025_sn_minutes", "Skilled nursing minutes"],
  ["fy2025_weekend_visits", "Weekend visit rate"],
  ["fy2025_return_7days", "Return to hospice within 7 days"],
];

// Every column this page can ever render — all published CMS data on ssvi_public.
const PREVIEW_COLUMNS =
  "ccn, hospice_name, city, state, fy2025_total_ssvi, fy2024_total_ssvi, " +
  "fy2025_spending_score, fy2025_utilization_score, pct_national, " +
  "rank_national, n_national, rank_state, n_state, " +
  MEASURES.map(([k]) => k).join(", ");

// The portal tabs the preview shows but does not open. Labels only — no hrefs,
// no data. Mirrors the real dashboard's feature set.
const LOCKED_TABS = [
  { label: "PS&R Risk Drivers", icon: Activity },
  { label: "Medicare CAP", icon: PieChart },
  { label: "PEPPER", icon: BarChart3 },
  { label: "CAHPS", icon: MessageSquare },
  { label: "QAPI", icon: ClipboardCheck },
  { label: "Chart Review", icon: FileText },
  { label: "Atlas Assistant", icon: Bot },
  { label: "Regulatory Watch", icon: BookOpen },
];

// Same shape as BenchmarkData's fetchPublicRow, inlined so the select can add
// the eight flag columns. Reads ssvi_public only; degrades to null.
async function fetchPreviewRow(db, ccn) {
  if (!db || !ccn) return null;
  try {
    const { data, error } = await db
      .from("ssvi_public")
      .select(PREVIEW_COLUMNS)
      .ilike("ccn", ccn)
      .limit(1);
    if (error || !data || !data.length) return null;
    return data[0];
  } catch {
    return null;
  }
}

// Dev-only sample so the preview layout can be inspected without a real link.
// NODE_ENV guard means this token renders the invalid state in production.
const DEV_SAMPLE =
  process.env.NODE_ENV === "development"
    ? {
        row: {
          hospice_name: "Canyon Rim Hospice, LLC",
          ccn: "437777",
          city: "St George",
          state: "UT",
          fy2025_total_ssvi: 9,
          fy2025_spending_score: 4,
          fy2025_utilization_score: 5,
          fy2024_total_ssvi: 11,
          pct_national: 82,
          rank_state: 6,
          n_state: 27,
          fy2025_live_discharge: true,
          fy2025_los_180: true,
          fy2025_nursing_facility: false,
          fy2025_no_chc_gip: true,
          fy2025_last_two_days: false,
          fy2025_sn_minutes: true,
          fy2025_weekend_visits: false,
          fy2025_return_7days: true,
        },
        stateAvg: { avg: "6.1", count: 27 },
        expiresAt: new Date(Date.now() + 15 * 864e5).toISOString(),
      }
    : null;

async function loadSnapshot(token) {
  if (token === "demo" && DEV_SAMPLE) return DEV_SAMPLE;
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
    const row = await fetchPreviewRow(db, link.ccn);
    if (!row || row.fy2025_total_ssvi == null) return null;

    const stateAvg = await fetchStateAverage(db, row.state);
    return { row, stateAvg, expiresAt: link.expires_at || null };
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

// One half of the SSVI: spending or utilization, n out of 8, with a fill bar.
function HalfScore({ label, value, sub }) {
  const n = value != null && Number.isFinite(Number(value)) ? Math.max(0, Math.min(8, Number(value))) : null;
  return (
    <div className="rounded-xl p-4" style={{ background: "#0E1830", border: "1px solid #243354" }}>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-sm min-w-0" style={{ color: "#AEBAD0" }}>{label}</div>
        <div className="font-mono text-lg shrink-0 text-white">{n != null ? `${n} / 8` : "—"}</div>
      </div>
      <div className="w-full rounded-full h-1.5 mt-3" style={{ background: "#243354" }}>
        <div className="h-1.5 rounded-full" style={{ width: `${n != null ? (n / 8) * 100 : 0}%`, background: "#B8863F" }} />
      </div>
      {sub && <div className="text-[11px] font-mono mt-2" style={{ color: "#7C8AA8" }}>{sub}</div>}
    </div>
  );
}

// A sidebar row for a portal feature this link cannot open. Not a link, not a
// button — aria-disabled, cursor-default, nothing to click.
function LockedRow({ label, icon: Icon }) {
  return (
    <div
      aria-disabled="true"
      className="flex items-center gap-3 rounded-lg px-3 py-2 cursor-default select-none"
      title={`${label} — in your portal`}
    >
      <Icon size={15} color="#5D6C8C" className="shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-sm truncate" style={{ color: "#93A0B8" }}>{label}</div>
        <div className="text-[10px] font-mono" style={{ color: "#5D6C8C" }}>In your portal</div>
      </div>
      <Lock size={12} color="#5D6C8C" className="shrink-0" aria-hidden="true" />
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
              Portal preview links expire after 15 days or can be revoked by whoever created them. Ask for a fresh link — or look up any hospice's published score yourself, free.
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

  const { row, stateAvg, expiresAt } = snapshot;
  const total = Number(row.fy2025_total_ssvi);
  const risk = riskFromScore(total);
  const agencyName = row.hospice_name || `CCN ${row.ccn}`;
  const where = [row.city, row.state].filter(Boolean).join(", ");
  const pct = row.pct_national != null ? Math.round(Number(row.pct_national)) : null;
  const vsState = stateAvg ? Math.round((total - stateAvg.avg) * 10) / 10 : null;
  const vsNat = Math.round((total - NATIONAL_AVG_SSVI) * 10) / 10;
  const flagged = MEASURES.filter(([k]) => row[k] === true).length;

  const prior = row.fy2024_total_ssvi != null ? Number(row.fy2024_total_ssvi) : null;
  const yoy = prior != null ? Math.round((total - prior) * 10) / 10 : null;

  const expires = expiresAt
    ? new Date(expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  // Demo CTA carries attribution. encodeURIComponent everything; omit empties.
  const demoQs = [
    row.ccn ? `ccn=${encodeURIComponent(row.ccn)}` : null,
    row.hospice_name ? `agency=${encodeURIComponent(row.hospice_name)}` : null,
    "src=share",
  ]
    .filter(Boolean)
    .join("&");
  const demoHref = `/demo?${demoQs}`;

  const goldBtn = "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium";

  return (
    // Darker page ground frames the preview as a centered app window instead of
    // a full-bleed sheet — the shell caps at 6xl and centers on wide monitors.
    <div className="min-h-screen" style={{ background: "#0A1120" }}>
    <div className="max-w-6xl mx-auto min-h-screen" style={{ background: "#0E1830", borderLeft: "1px solid #1B2A47", borderRight: "1px solid #1B2A47" }}>
      {/* ── Top bar ── */}
      <header className="px-4 md:px-6 py-3" style={{ borderBottom: "1px solid #243354" }}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#B8863F" }}>
              <ShieldCheck size={19} color="#1B2740" />
            </div>
            <div className="min-w-0">
              <div className="font-display text-white text-base leading-tight truncate">
                {agencyName} · Portal preview
              </div>
              <div className="text-[11px] font-mono mt-0.5" style={{ color: "#93A0B8" }}>
                Read-only{expires ? ` · Expires ${expires}` : " · 15-day link"}
              </div>
            </div>
          </div>
          <Link href={demoHref} className={goldBtn} style={{ background: "#B8863F", color: "#0E1830" }}>
            Book the walkthrough <ArrowRight size={14} />
          </Link>
        </div>
      </header>

      {/* ── Mobile tab chips ── */}
      <div className="lg:hidden flex gap-2 overflow-x-auto px-4 py-3" style={{ borderBottom: "1px solid #243354" }}>
        <span className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0" style={{ background: "#B8863F", color: "#0E1830" }}>
          <Home size={12} aria-hidden="true" /> Dashboard
        </span>
        {LOCKED_TABS.map(({ label }) => (
          <span
            key={label}
            aria-disabled="true"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs whitespace-nowrap shrink-0 cursor-default select-none"
            style={{ background: "#14213D", border: "1px solid #243354", color: "#93A0B8" }}
            title={`${label} — in your portal`}
          >
            <Lock size={11} color="#5D6C8C" aria-hidden="true" /> {label}
          </span>
        ))}
      </div>

      <div className="lg:flex">
        {/* ── Sidebar (desktop) ── */}
        <aside className="hidden lg:block w-64 shrink-0 px-3 py-5" style={{ borderRight: "1px solid #243354" }}>
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5" style={{ background: "#B8863F" }}>
            <Home size={15} color="#0E1830" className="shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium" style={{ color: "#0E1830" }}>Dashboard</span>
          </div>
          <div className="mt-5 px-3 text-[10px] font-mono uppercase" style={{ color: "#5D6C8C", letterSpacing: "0.14em" }}>
            Your portal
          </div>
          <div className="mt-2 space-y-0.5">
            {LOCKED_TABS.map((t) => (
              <LockedRow key={t.label} label={t.label} icon={t.icon} />
            ))}
          </div>
        </aside>

        {/* ── Main panel ── */}
        <main className="flex-1 min-w-0 px-4 md:px-8 py-7 md:py-9">
          <div className="max-w-3xl mx-auto">
            <div className="eyebrow" style={{ color: "#E8CFA0" }}>Your published CMS picture · FY2025</div>

            <div className="rounded-2xl mt-4" style={{ background: "#14213D", border: "1px solid #243354" }}>
              <div className="p-6 md:p-8">
                <h1 className="font-display text-white text-2xl md:text-3xl">{agencyName}</h1>
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

                {yoy != null && (
                  <div className="flex items-center gap-2.5 mt-5 flex-wrap">
                    <span
                      className="inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-mono font-semibold"
                      style={
                        yoy < 0
                          ? { background: TONE_BG.low, color: TONE_FG.low }
                          : yoy > 0
                            ? { background: TONE_BG.high, color: TONE_FG.high }
                            : { background: "#1E2C4E", color: "#93A0B8" }
                      }
                    >
                      {yoy < 0 ? `Down ${Math.abs(yoy)} year over year` : yoy > 0 ? `Up ${yoy} year over year` : "Held steady year over year"}
                    </span>
                    <span className="text-[11px] font-mono" style={{ color: "#7C8AA8" }}>
                      FY2024: {prior} → FY2025: {total}
                    </span>
                  </div>
                )}

                {/* ── The two halves of the score ── */}
                <div className="grid sm:grid-cols-2 gap-3 mt-6">
                  <HalfScore label="Non-hospice spending" value={row.fy2025_spending_score} sub="Medicare spending outside the benefit" />
                  <HalfScore label="Utilization measures" value={row.fy2025_utilization_score} sub={`${flagged} of 8 measures flagged`} />
                </div>

                {/* ── The eight measures ── */}
                <div className="mt-6">
                  <div className="text-sm font-medium text-white">Utilization measures — {flagged} of 8 flagged</div>
                  <div className="text-[11px] font-mono mt-1" style={{ color: "#7C8AA8" }}>
                    Each flagged measure adds one point to the utilization score.
                  </div>
                  <ul className="mt-3 rounded-xl overflow-hidden" style={{ background: "#0E1830", border: "1px solid #243354" }}>
                    {MEASURES.map(([key, label], i) => (
                      <li key={key} className="flex items-center justify-between gap-4 px-4 py-3" style={i > 0 ? { borderTop: "1px solid #243354" } : undefined}>
                        <span className="text-sm min-w-0" style={{ color: "#AEBAD0" }}>{label}</span>
                        {row[key] === true ? (
                          <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide" style={{ background: TONE_BG.mid, color: TONE_FG.mid }}>
                            Flagged
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wide" style={{ background: "#1E2C4E", color: "#93A0B8" }}>
                            Not flagged
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* ── Benchmarks ── */}
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
            </div>

            {/* ── Locked teasers — labels only, never numbers ── */}
            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              {[
                { title: "CAP exposure", desc: "Calculated from your Beneficiary Count report." },
                { title: "PEPPER outliers", desc: "Explained in plain terms." },
              ].map((t) => (
                <div key={t.title} aria-disabled="true" className="rounded-2xl p-5 cursor-default select-none" style={{ background: "#14213D", border: "1px solid #243354" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#1E2C4E" }}>
                    <Lock size={14} color="#B8863F" aria-hidden="true" />
                  </div>
                  <div className="font-display text-white text-base mt-3">{t.title}</div>
                  <div className="text-sm mt-1" style={{ color: "#AEBAD0" }}>{t.desc}</div>
                  <div className="text-[11px] font-mono mt-3" style={{ color: "#E8CFA0" }}>Unlocks in your portal</div>
                </div>
              ))}
            </div>

            {/* ── CTA band ── */}
            <div className="rounded-2xl p-6 md:p-8 mt-4" style={{ background: "#14213D", border: "1px solid #2E3E60" }}>
              <p className="font-display text-white text-xl md:text-2xl max-w-md">
                This is the preview. The portal reads your own reports next to these numbers.
              </p>
              <div className="flex items-center gap-4 mt-5 flex-wrap">
                <Link href={demoHref} className={goldBtn} style={{ background: "#B8863F", color: "#0E1830" }}>
                  Book the walkthrough <ArrowRight size={14} />
                </Link>
                <Link href="/security" className="inline-flex items-center gap-1.5 text-sm" style={{ color: "#93A0B8" }}>
                  <ShieldCheck size={14} color="#B8863F" /> Zero PHI stored
                </Link>
              </div>
            </div>

            <p className="text-[11px] font-mono mt-5" style={{ color: "#7C8AA8" }}>
              Read-only preview of published CMS SSVI data · Shared via Connect Shield · connect-shield.com · This link may expire or be revoked at any time.
            </p>
          </div>
        </main>
      </div>
    </div>
    </div>
  );
}
