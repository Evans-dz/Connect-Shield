"use client";
import { useEffect, useMemo, useState } from "react";
import { TrendingUp } from "lucide-react";
import { createClient } from "@/lib/auth/client";
import { computeCompliance } from "@/lib/compliance";

// Score history — a small trend line of the Composite Compliance Index over
// time, built from the append-only clinic_report_card_history table.
//
// NO SCORES ARE STORED. Each history row holds the raw extracted values from
// one save; this component replays them in order (keeping the latest card per
// report type, exactly like the live dashboard) and recomputes the composite
// at each point with lib/compliance.js — one source of truth.
//
// Hidden until at least 2 history rows produce a score. Renders nothing (not
// an error) when the table doesn't exist yet or the query fails.
//
// Honest caveat: SSVI comes from the live CMS lookup, not from history, so the
// CURRENT published SSVI is applied at every point. The line shows how the
// composite moved as reports were saved, not a reconstruction of past SSVIs.

const scoreColor = (s) => (s >= 85 ? "#2E9E62" : s >= 70 ? "#C98A1F" : "#D14343");

function fmtDay(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export default function BenchmarkTrend({ clinicId, resolvedSsvi = null }) {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!clinicId) { setRows([]); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("clinic_report_card_history")
          .select("report_type, analysis, report_date, created_at")
          .eq("clinic_id", clinicId)
          .order("created_at", { ascending: true })
          .limit(200);
        if (!cancelled) setRows(error ? [] : data || []);
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => { cancelled = true; };
  }, [supabase, clinicId]);

  // Replay the history: after each save, compute what the composite was.
  const points = useMemo(() => {
    if (!Array.isArray(rows) || rows.length < 2) return [];
    const latest = {}; // report_type -> analysis (same "latest per type" rule as the live view)
    const out = [];
    for (const r of rows) {
      if (!r?.report_type) continue;
      latest[r.report_type] = r.analysis || {};
      try {
        const raw = {
          ...(latest.psr?.psrMetrics || {}),
          ...(latest.cap?.capData || {}),
        };
        if (Array.isArray(latest.psr?.psrPeriods) && latest.psr.psrPeriods.length) {
          raw.periods = latest.psr.psrPeriods;
        }
        const c = computeCompliance({
          raw,
          ssvi: resolvedSsvi,
          pepper: latest.pepper || null,
          cahps: latest.cahps || null,
          qapi: latest.qapi || null,
        });
        if (c?.composite?.score != null) {
          out.push({ t: r.created_at, score: c.composite.score });
        }
      } catch {
        // one bad snapshot never hides the rest of the line
      }
    }
    return out;
  }, [rows, resolvedSsvi]);

  if (points.length < 2) return null; // hidden until there is a real trend

  // Geometry — fixed viewBox, scales to the card width.
  const W = 560, H = 110, PX = 14, PY = 18;
  const n = points.length;
  const x = (i) => PX + (i * (W - 2 * PX)) / (n - 1);
  const y = (s) => H - PY - (Math.max(0, Math.min(100, s)) * (H - 2 * PY)) / 100;
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.score).toFixed(1)}`).join(" ");
  const first = points[0];
  const last = points[n - 1];
  const delta = last.score - first.score;

  return (
    <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid #E3E7ED", boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}>
      <div className="flex items-center gap-2 flex-wrap">
        <TrendingUp size={16} color="#B8863F" />
        <span style={{ fontFamily: "Fraunces, serif", color: "#16202E" }} className="text-lg">Score History</span>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "#F5F6F8", color: "#64708A" }}>
          {n} saves · recomputed from stored report values
        </span>
        <span className="text-xs font-mono ml-auto font-semibold" style={{ color: delta > 0 ? "#2E9E62" : delta < 0 ? "#D14343" : "#8992A3" }}>
          {delta > 0 ? `▲ +${delta}` : delta < 0 ? `▼ ${delta}` : "— no change"} since {fmtDay(first.t)}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-3" role="img" aria-label={`Composite index trend from ${first.score} to ${last.score}`}>
        {/* reference bands: 80 (low risk) and 60 (medium risk) thresholds */}
        {[80, 60].map((ref) => (
          <g key={ref}>
            <line x1={PX} x2={W - PX} y1={y(ref)} y2={y(ref)} stroke="#E3E7ED" strokeWidth="1" strokeDasharray="3 4" />
            <text x={W - PX + 2} y={y(ref) + 3} fontFamily="IBM Plex Mono, monospace" fontSize="8" fill="#C7CDD8">{ref}</text>
          </g>
        ))}
        <path d={path} fill="none" stroke="#B8863F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={x(i)} cy={y(p.score)} r={i === n - 1 ? 4 : 2.5} fill={scoreColor(p.score)} stroke="#FFFFFF" strokeWidth="1.5" />
        ))}
        {/* first + last labels */}
        <text x={x(0)} y={y(first.score) - 7} textAnchor="start" fontFamily="IBM Plex Mono, monospace" fontSize="10" fontWeight="600" fill={scoreColor(first.score)}>{first.score}</text>
        <text x={x(n - 1)} y={y(last.score) - 8} textAnchor="end" fontFamily="IBM Plex Mono, monospace" fontSize="11" fontWeight="600" fill={scoreColor(last.score)}>{last.score}</text>
        <text x={x(0)} y={H - 3} textAnchor="start" fontFamily="IBM Plex Mono, monospace" fontSize="8.5" fill="#8992A3">{fmtDay(first.t)}</text>
        <text x={x(n - 1)} y={H - 3} textAnchor="end" fontFamily="IBM Plex Mono, monospace" fontSize="8.5" fill="#8992A3">{fmtDay(last.t)}</text>
      </svg>

      <div className="mt-1 text-[10px] font-mono" style={{ color: "#8992A3" }}>
        Composite index after each report save. Current published SSVI applied at every point.
      </div>
    </div>
  );
}
