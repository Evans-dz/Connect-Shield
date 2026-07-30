"use client";
import { useState } from "react";
import Link from "next/link";
import { Search, Loader2, Lock, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import Gauge from "./Gauge";
import { SITE } from "@/lib/site";

const TONE_BG = { low: "#EAF6EF", mid: "#FEF3E2", high: "#FDECEA" };
const TONE_FG = { low: "#1A6E41", mid: "#7A5700", high: "#B23A2E" };

function num(v) {
  if (v === null || v === undefined || typeof v === "boolean") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function plural(n, one, many) {
  return Math.abs(n) === 1 ? one : many;
}

function Stat({ value, max, label, tone, sub }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center"
        style={{ background: TONE_BG[tone] || "#FEF3E2", color: TONE_FG[tone] || "#7A5700" }}
      >
        <span className="font-mono text-xl font-semibold leading-none">{value}</span>
        <span className="font-mono text-[9px] mt-1 leading-none">of {max}</span>
      </div>
      <div className="min-w-0">
        <div className="text-sm text-white font-medium leading-snug">{label}</div>
        <div className="text-xs mt-0.5" style={{ color: "#93A0B8" }}>{sub}</div>
      </div>
    </div>
  );
}

export default function CCNTeaser() {
  const [ccn, setCcn] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const run = async () => {
    const clean = ccn.trim();
    if (!clean) return;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res = await fetch(`/api/ssvi-lookup?ccn=${encodeURIComponent(clean)}`);
      if (res.status === 404) {
        setError(`No CMS SSVI record found for "${clean}". Check the CCN and try again — it's on your PS&R report next to your provider name.`);
      } else if (!res.ok) {
        setError("Something went wrong. Try again in a moment.");
      } else {
        setData(await res.json());
      }
    } catch {
      setError("Couldn't reach the lookup. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const flagged = data ? num(data.flaggedCount) : null;
  const flaggedMax = (data ? num(data.utilizationMax) : null) ?? 8;
  const spending = data ? num(data.spending) : null;
  const spendingMax = (data ? num(data.spendingMax) : null) ?? 8;
  const percentile = data ? num(data.percentile) : null;
  const showBreakdown = flagged !== null || spending !== null;

  const bothKnown = flagged !== null && spending !== null;
  const spendingLeads = bothKnown && spending > flagged;
  const utilizationLeads = bothKnown && flagged > spending;

  const delta = data && data.priorTotal != null ? Math.abs(data.total - data.priorTotal) : null;

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "#14213D", border: "1px solid #243354" }}>
      <div className="p-6 md:p-8">
        <div className="eyebrow" style={{ color: "#E8CFA0" }}>Free · No signup · All 6,643 scored US hospices</div>
        <h3 className="font-display text-2xl md:text-[26px] text-white mt-3">Look up your hospice's SSVI score</h3>
        <p className="text-sm mt-2 max-w-md" style={{ color: "#93A0B8" }}>
          Enter your CCN to see your published CMS score, your full eight-measure breakdown, and how you rank nationally — free.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 mt-5">
          <div className="relative flex-1">
            <Search size={16} color="#5A6B8C" className="absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              value={ccn}
              onChange={(e) => setCcn(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              placeholder="Enter your CCN (e.g. 123456)"
              className="w-full rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-white placeholder:text-slate-mute focus:outline-none"
              style={{ background: "#0E1830", border: "1px solid #243354" }}
              aria-label="CMS Certification Number"
            />
          </div>
          <button
            onClick={run}
            disabled={loading || !ccn.trim()}
            className="flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium shrink-0 disabled:opacity-60"
            style={{ background: "#B8863F", color: "#0E1830" }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            {loading ? "Looking up" : "Look up score"}
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2 mt-4 rounded-xl p-3" style={{ background: "#1E2C4E" }}>
            <AlertCircle size={15} color="#E0A34A" className="shrink-0 mt-0.5" />
            <span className="text-sm" style={{ color: "#D8C199" }}>{error}</span>
          </div>
        )}

        {!data && !error && (
          <div className="text-xs mt-4" style={{ color: "#5A6B8C" }}>
            Don&apos;t know your CCN?{" "}
            <Link href="/hospice" className="underline" style={{ color: "#93A0B8" }}>
              Browse all agencies by state
            </Link>
          </div>
        )}
      </div>

      {data && (
        <div className="px-6 md:px-8 pb-8">
          <div className="rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row items-center gap-6" style={{ background: "#0E1830", border: "1px solid #243354" }}>
            <Gauge score={data.total} tone={data.tone} size={116} />
            <div className="flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <CheckCircle2 size={15} color="#2E9E62" />
                <span className="text-sm text-white font-medium">{data.hospice_name}</span>
                <span className="text-xs font-mono" style={{ color: "#5A6B8C" }}>CCN {data.ccn}</span>
              </div>
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: TONE_BG[data.tone], color: TONE_FG[data.tone] }}>
                <span className="text-sm font-mono font-semibold">FY{data.year}: {data.total}/16 · {data.risk}</span>
              </div>
              <div className="text-xs font-mono mt-3 flex items-center justify-center sm:justify-start gap-3" style={{ color: "#93A0B8" }}>
                <span>National avg 6.4</span>
                {delta !== null && (
                  <span className="inline-flex items-center gap-1" style={{ color: data.total > data.priorTotal ? "#E0857A" : "#7FC79E" }}>
                    {data.total > data.priorTotal ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                    {delta === 0
                      ? `no change vs FY${data.priorYear}`
                      : `${delta} ${plural(delta, "pt", "pts")} vs FY${data.priorYear}`}
                  </span>
                )}
              </div>
              <Link
                href={`/hospice/ccn/${encodeURIComponent(data.ccn)}`}
                className="inline-flex items-center gap-1.5 text-sm mt-4 font-medium"
                style={{ color: "#E8CFA0" }}
              >
                View full FY2025 breakdown
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {showBreakdown && (
            <div className="mt-3 rounded-2xl p-5" style={{ background: "#0E1830", border: "1px solid #243354" }}>
              <div className="text-[11px] font-mono uppercase tracking-wide" style={{ color: "#5A6B8C" }}>
                Where your {data.total} {plural(data.total, "point", "points")} come from
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mt-4">
                {flagged !== null && (
                  <Stat
                    value={flagged}
                    max={flaggedMax}
                    tone={data.tone}
                    label={
                      flagged === 0
                        ? "No utilization flags"
                        : `${flagged} utilization ${plural(flagged, "measure", "measures")} flagged`
                    }
                    sub={
                      flagged === 0
                        ? "Clean on utilization this year"
                        : utilizationLeads
                        ? "Driving most of your total"
                        : "Each flag adds a point to your score"
                    }
                  />
                )}
                {spending !== null && (
                  <Stat
                    value={spending}
                    max={spendingMax}
                    tone={data.tone}
                    label="Spending score"
                    sub={
                      spendingLeads
                        ? "Driving most of your total"
                        : spending === 0
                        ? "No spending points this year"
                        : "Scored separately from utilization"
                    }
                  />
                )}
              </div>

              {percentile !== null && (
                <div className="mt-4 pt-4 text-xs" style={{ borderTop: "1px solid #243354", color: "#93A0B8" }}>
                  Scores higher than <span className="font-mono" style={{ color: "#E8CFA0" }}>{percentile}%</span> of scored US hospices. The SSVI is not a quality rating — it measures divergence from peer norms.
                </div>
              )}
            </div>
          )}

          {/* What the public data can't tell you */}
          <div className="mt-3 rounded-2xl p-5 md:p-6" style={{ background: "#0E1830", border: "1px solid #243354" }}>
            <div className="flex items-start gap-3">
              <Lock size={18} color="#E8CFA0" className="shrink-0 mt-0.5" />
              <div>
                <div className="text-sm text-white font-medium">
                  {flagged !== null && flagged > 0
                    ? `You know which ${flagged} flagged. You don't know how far over you are.`
                    : "Your score is public. What's driving it isn't."}
                </div>
                <div className="text-xs mt-2 leading-relaxed" style={{ color: "#93A0B8" }}>
                  CMS publishes the flags, not your underlying numbers. Connect Shield reads
                  your own PS&amp;R, PEPPER, CAHPS, and QAPI reports against your SSVI — showing
                  your actual values, how far each sits from the threshold, what to fix first,
                  and how your score moves as you fix it.
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <Link href="/demo" className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#B8863F", color: "#0E1830" }}>
                    Book a demo
                  </Link>
                  <Link
                    href={`/hospice/ccn/${encodeURIComponent(data.ccn)}`}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ border: "1px solid #243354", color: "#93A0B8" }}
                  >
                    See the free breakdown
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
