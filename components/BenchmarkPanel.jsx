"use client";
import { useEffect, useState } from "react";
import { BarChart3 } from "lucide-react";
import { createClient } from "@/lib/auth/client";
import {
  NATIONAL_AVG_SSVI,
  NATIONAL_SCORED_COUNT,
  fetchStateAverage,
  fetchNationalPercentile,
  fetchPublicRow,
} from "@/components/BenchmarkData";
import ShareLinkButton from "@/components/ShareLinkButton";

// "Where you stand" — the clinic's published FY2025 SSVI against its state
// average, the national average, and the national percentile, all from the
// public ssvi_public table (the same data the /hospice pages serve).
//
// Failure modes are first-class: while loading it renders a skeleton; when the
// CCN has no FY2025 row or Supabase is unreachable it renders an honest empty
// state. It never crashes the dashboard.

const ssviColor = (s) => (s <= 4 ? "#2E9E62" : s <= 7 ? "#C98A1F" : "#D14343");

function BenchmarkRing({ score, size = 84, stroke = 8 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(16, score || 0));
  const color = ssviColor(pct);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`SSVI ${pct} out of 16`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#E3E7ED" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
        strokeWidth={stroke} strokeDasharray={c} strokeDashoffset={c - (pct / 16) * c}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x="50%" y="45%" textAnchor="middle" dominantBaseline="central"
        fontFamily="IBM Plex Mono, monospace" fontSize={size * 0.26} fontWeight="600" fill="#16202E">{pct}</text>
      <text x="50%" y="68%" textAnchor="middle" dominantBaseline="central"
        fontFamily="IBM Plex Mono, monospace" fontSize={size * 0.14} fill="#64708A">/16</text>
    </svg>
  );
}

// One comparison row: label, a 0-16 bar, the value, and the delta vs your score.
function BenchmarkRow({ label, sub, value, yours, isYou = false }) {
  const v = Number(value);
  const ok = Number.isFinite(v);
  const width = ok ? Math.max(2, Math.min(100, (v / 16) * 100)) : 0;
  const delta = !isYou && ok && Number.isFinite(Number(yours)) ? Math.round((yours - v) * 10) / 10 : null;
  return (
    <div className="flex items-center gap-3">
      <div className="w-40 shrink-0 min-w-0">
        <div className="text-sm font-medium truncate" style={{ color: "#16202E" }}>{label}</div>
        {sub && <div className="text-[10px] font-mono truncate" style={{ color: "#8992A3" }}>{sub}</div>}
      </div>
      <div className="flex-1 rounded-full h-2" style={{ background: "#E3E7ED" }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${width}%`, background: isYou ? ssviColor(v) : "#93A0B8" }} />
      </div>
      <div className="w-12 text-right text-sm font-mono font-semibold shrink-0" style={{ color: isYou ? ssviColor(v) : "#16202E" }}>
        {ok ? v : "—"}
      </div>
      <div className="w-16 text-right text-[11px] font-mono shrink-0" style={{ color: delta == null ? "#C7CDD8" : delta > 0 ? "#D14343" : delta < 0 ? "#2E9E62" : "#8992A3" }}>
        {delta == null ? (isYou ? "you" : "") : delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : "even"}
      </div>
    </div>
  );
}

export default function BenchmarkPanel({ ccn }) {
  const [supabase] = useState(() => createClient());
  const [loading, setLoading] = useState(!!ccn);
  const [row, setRow] = useState(null);
  const [stateAvg, setStateAvg] = useState(null);
  const [percentile, setPercentile] = useState(null);

  useEffect(() => {
    if (!ccn) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const pub = await fetchPublicRow(supabase, ccn);
        if (cancelled) return;
        setRow(pub);
        if (pub?.fy2025_total_ssvi != null) {
          const [st, pct] = await Promise.all([
            fetchStateAverage(supabase, pub.state),
            // Prefer the precomputed percentile the /hospice pages use; compute
            // it from count queries (the teaser's method) only when missing.
            pub.pct_national != null ? Promise.resolve(Number(pub.pct_national)) : fetchNationalPercentile(supabase, pub.fy2025_total_ssvi),
          ]);
          if (cancelled) return;
          setStateAvg(st);
          setPercentile(Number.isFinite(Number(pct)) ? Math.round(Number(pct)) : null);
        }
      } catch {
        // fall through to the empty state
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [supabase, ccn]);

  const total = row?.fy2025_total_ssvi != null ? Number(row.fy2025_total_ssvi) : null;

  return (
    <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid #E3E7ED", boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}>
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={16} color="#B8863F" />
        <span style={{ fontFamily: "Fraunces, serif", color: "#16202E" }} className="text-lg">Where You Stand</span>
        {total != null && (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "#EAF6EF", color: "#2E9E62" }}>✓ CMS Published · FY2025</span>
        )}
      </div>

      {loading && (
        <div className="flex items-center gap-5 animate-pulse" aria-label="Loading benchmark">
          <div className="w-[84px] h-[84px] rounded-full shrink-0" style={{ background: "#E3E7ED" }} />
          <div className="flex-1 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-3.5 rounded-full" style={{ background: "#E3E7ED", width: `${88 - i * 14}%` }} />
            ))}
          </div>
        </div>
      )}

      {!loading && total == null && (
        <div className="rounded-xl p-4" style={{ background: "#F5F6F8" }}>
          <div className="text-sm" style={{ color: "#64708A" }}>
            {ccn
              ? "No published FY2025 SSVI is available for this CCN yet, or the benchmark data could not be loaded. The comparison appears as soon as CMS data is reachable."
              : "Enter your CCN above to see your score against your state and the nation."}
          </div>
        </div>
      )}

      {!loading && total != null && (
        <>
          <div className="flex items-start gap-5 flex-wrap">
            <BenchmarkRing score={total} />
            <div className="flex-1 min-w-[260px] space-y-3 pt-1">
              <BenchmarkRow
                label="Your SSVI"
                sub={row.hospice_name ? `${row.hospice_name}` : `CCN ${ccn}`}
                value={total}
                yours={total}
                isYou
              />
              <BenchmarkRow
                label={`${row.state || "State"} average`}
                sub={stateAvg ? `${stateAvg.count.toLocaleString()} scored hospices` : "state data unavailable"}
                value={stateAvg?.avg}
                yours={total}
              />
              <BenchmarkRow
                label="National average"
                sub={`${NATIONAL_SCORED_COUNT.toLocaleString()} scored hospices`}
                value={NATIONAL_AVG_SSVI}
                yours={total}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 flex-wrap">
            {percentile != null && (
              <span className="text-[11px] font-mono px-2 py-1 rounded" style={{ background: "#F5F6F8", color: "#64708A" }}>
                Higher SSVI than {percentile}% of US hospices — lower is better
              </span>
            )}
            {row.rank_state != null && row.n_state != null && (
              <span className="text-[11px] font-mono px-2 py-1 rounded" style={{ background: "#F5F6F8", color: "#64708A" }}>
                #{row.rank_state} of {Number(row.n_state).toLocaleString()} in {row.state}
              </span>
            )}
            {total >= 10 && (
              <span className="text-[11px] font-mono px-2 py-1 rounded" style={{ background: "#FDECEA", color: "#D14343" }}>
                ≥10 — the range CMS associates with program integrity review
              </span>
            )}
          </div>
        </>
      )}

      {ccn && (
        <div className="mt-4 pt-4" style={{ borderTop: "1px solid #E3E7ED" }}>
          <div className="text-xs uppercase tracking-widest font-mono mb-2" style={{ color: "#64708A" }}>Share this scorecard</div>
          <ShareLinkButton ccn={ccn} />
        </div>
      )}
    </div>
  );
}
