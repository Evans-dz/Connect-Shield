"use client";
// components/ReportDownloadModal.jsx
// ─────────────────────────────────────────────────────────────────────────────
// The Dashboard's "download this as a PDF" door.
//
// Renders an action card plus the picker modal behind it, so the Dashboard only
// has to drop in a single element. On open it pulls this clinic's persisted
// report cards straight from Supabase (the same rows ComplianceCardsRow reads),
// so no dashboard state has to be lifted for the PDF to see everything.
//
// Two modes, named by purpose:
//   Full Compliance Analysis — everything, including findings and actions
//   Compliance Summary       — scores, measures, inventory, provenance, methodology
// Mode is a preset over the checkboxes, not a lock: every section stays
// overridable in either mode.
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useCallback } from "react";
import { FileDown, X, Loader2, AlertCircle, Check } from "lucide-react";
import { createClient } from "@/lib/auth/client";
import { REPORT_SECTIONS, MODES, presetFor, generateComplianceReport } from "@/lib/reportPdf";

const CARD_TYPES = ["cap", "psr", "pepper", "cahps", "qapi"];

export default function ReportDownloadModal({
  clinicId,
  clinicName,
  ccn,
  analysis,       // analysisData || storedAnalysis
  ssvi,           // resolveSSVI(ccnResult) — already resolved by the Dashboard
  ssviMeasures,   // SSVI_MEASURES from the dashboard, so definitions never drift
}) {
  const [supabase] = useState(() => createClient());
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("full");
  const [sections, setSections] = useState(() => presetFor("full"));
  const [cards, setCards] = useState({});
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  // What actually has data behind it. Sections with nothing on file start
  // unchecked — an empty section in a report handed to an auditor reads as a
  // gap, so it should be a deliberate choice to include it.
  const availability = {
    summary: true,
    ssvi: !!ssvi,
    cap: !!cards.cap || Object.values(analysis?.capData || {}).some((v) => v != null),
    psr: !!cards.psr || Object.values(analysis?.psrMetrics || {}).some((v) => v != null),
    pepper: !!cards.pepper,
    cahps: !!cards.cahps,
    qapi: !!cards.qapi,
    quality: Object.values(analysis?.qualityMetrics || {}).some((v) => v != null && v !== false && v !== 0),
    findings: (analysis?.criticalFindings || []).length > 0,
    categories: (analysis?.complianceCategories || []).length > 0,
    methodology: true,
  };

  const applyMode = useCallback((nextMode, avail) => {
    const preset = presetFor(nextMode);
    const next = {};
    REPORT_SECTIONS.forEach((s) => { next[s.id] = preset[s.id] && avail[s.id] !== false; });
    return next;
  }, []);

  // Load the clinic's persisted cards + the signed-in user, once per open.
  useEffect(() => {
    if (!open || !clinicId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const [{ data: rows }, { data: auth }] = await Promise.all([
          supabase
            .from("clinic_report_cards")
            .select("report_type, analysis, updated_at, report_date, report_period_label")
            .eq("clinic_id", clinicId),
          supabase.auth.getUser(),
        ]);
        if (cancelled) return;
        const map = {};
        (rows || []).forEach((r) => {
          if (!CARD_TYPES.includes(r.report_type)) return;
          map[r.report_type] = {
            ...(r.analysis || {}),
            _updatedAt: r.updated_at,
            _reportDate: r.report_date,
            _periodLabel: r.report_period_label,
          };
        });
        setCards(map);
        setUserEmail(auth?.user?.email || "");
      } catch (e) {
        if (!cancelled) setError("Could not load this clinic's reports. You can still generate a report from what's on screen.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, clinicId, supabase]);

  // Once cards land, re-apply the preset against real availability.
  useEffect(() => {
    if (!open || loading) return;
    setSections(applyMode(mode, {
      ...availability,
      cap: !!cards.cap || Object.values(analysis?.capData || {}).some((v) => v != null),
      psr: !!cards.psr || Object.values(analysis?.psrMetrics || {}).some((v) => v != null),
      pepper: !!cards.pepper,
      cahps: !!cards.cahps,
      qapi: !!cards.qapi,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, loading, mode, cards]);

  const chooseMode = (m) => setMode(m);
  const toggle = (id) => setSections((s) => ({ ...s, [id]: !s[id] }));
  const chosenCount = REPORT_SECTIONS.filter((s) => sections[s.id]).length;

  const generate = async () => {
    setWorking(true);
    setError("");
    try {
      await generateComplianceReport({
        mode,
        sections,
        clinicName: clinicName || analysis?.agencyName || "Hospice Agency",
        ccn: ccn || "",
        analysis,
        ssvi,
        ssviMeasures,
        cards,
        generatedBy: userEmail,
      });
      setOpen(false);
    } catch (e) {
      setError(e?.message || "Could not generate the report. Please try again.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      {/* Action card — sits in the dashboard column like every other block */}
      <div
        className="rounded-2xl p-4 flex items-center gap-4 flex-wrap"
        style={{ background: "#FFFFFF", border: "1px solid #E3E7ED", boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#F7F0E1" }}>
          <FileDown size={18} color="#B8863F" />
        </div>
        <div className="flex-1 min-w-0">
          <div style={{ fontFamily: "Fraunces, serif", color: "#16202E" }} className="text-base">
            Download compliance report
          </div>
          <div className="text-xs mt-0.5" style={{ color: "#64708A" }}>
            A branded PDF of this dashboard, with every figure sourced — ready to hand to a surveyor or billing auditor.
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shrink-0"
          style={{ background: "#14213D", color: "#F3F5F8" }}
        >
          <FileDown size={15} />
          Create report
        </button>
      </div>

      {!open ? null : (
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 80, background: "rgba(16,24,40,0.55)" }}
          onClick={() => !working && setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl overflow-hidden flex flex-col"
            style={{ background: "#FFFFFF", maxHeight: "88vh", boxShadow: "0 24px 60px rgba(16,24,40,0.28)" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 flex items-start gap-3" style={{ borderBottom: "1px solid #E3E7ED" }}>
              <div className="flex-1 min-w-0">
                <div style={{ fontFamily: "Fraunces, serif", color: "#16202E" }} className="text-lg">
                  Create report
                </div>
                <div className="text-xs font-mono mt-0.5 truncate" style={{ color: "#64708A" }}>
                  {clinicName || analysis?.agencyName || "This agency"}{ccn ? ` · CCN ${ccn}` : ""}
                </div>
              </div>
              <button onClick={() => !working && setOpen(false)} className="p-1 shrink-0" aria-label="Close">
                <X size={16} color="#8992A3" />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-5 overflow-y-auto">
              {/* Mode */}
              <div>
                <div className="text-xs uppercase tracking-widest font-mono mb-2" style={{ color: "#64708A" }}>
                  Report type
                </div>
                <div className="space-y-2">
                  {["full", "summary"].map((m) => {
                    const active = mode === m;
                    return (
                      <button
                        key={m}
                        onClick={() => chooseMode(m)}
                        className="w-full text-left rounded-xl px-4 py-3 flex items-start gap-3 transition-colors"
                        style={{
                          background: active ? "#F7F0E1" : "#FFFFFF",
                          border: `1.5px solid ${active ? "#B8863F" : "#E3E7ED"}`,
                        }}
                      >
                        <div
                          className="w-4 h-4 rounded-full shrink-0 mt-0.5 flex items-center justify-center"
                          style={{
                            border: `1.5px solid ${active ? "#B8863F" : "#C7CDD8"}`,
                            background: active ? "#B8863F" : "transparent",
                          }}
                        >
                          {active && <Check size={10} color="#FFFFFF" />}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium" style={{ color: "#16202E" }}>
                            {MODES[m].title}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: "#64708A" }}>
                            {m === "full"
                              ? "Every section, including critical findings and recommended actions."
                              : "Scores, measures, report inventory, provenance and methodology. No findings or recommended actions."}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sections */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs uppercase tracking-widest font-mono" style={{ color: "#64708A" }}>
                    Sections to include
                  </div>
                  <span className="text-[11px] font-mono" style={{ color: "#8992A3" }}>
                    {chosenCount} of {REPORT_SECTIONS.length}
                  </span>
                </div>

                {loading ? (
                  <div className="flex items-center gap-2 py-6 justify-center">
                    <Loader2 size={15} className="animate-spin" color="#B8863F" />
                    <span className="text-sm font-mono" style={{ color: "#64708A" }}>Checking what's on file…</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {REPORT_SECTIONS.map((s) => {
                      const checked = !!sections[s.id];
                      const hasData = availability[s.id] !== false;
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggle(s.id)}
                          className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg"
                          style={{ background: checked ? "#F5F6F8" : "transparent" }}
                        >
                          <div
                            className="w-4 h-4 rounded shrink-0 flex items-center justify-center"
                            style={{
                              border: `1.5px solid ${checked ? "#14213D" : "#C7CDD8"}`,
                              background: checked ? "#14213D" : "transparent",
                            }}
                          >
                            {checked && <Check size={10} color="#FFFFFF" />}
                          </div>
                          <span className="text-sm flex-1 min-w-0" style={{ color: "#16202E" }}>
                            {s.label}
                          </span>
                          {s.interpretive && (
                            <span
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded shrink-0"
                              style={{ background: "#F7F0E1", color: "#B8863F" }}
                            >
                              analysis
                            </span>
                          )}
                          {!hasData && (
                            <span className="text-[10px] font-mono shrink-0" style={{ color: "#8992A3" }}>
                              nothing on file
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {error && (
                <div className="rounded-xl p-3 flex items-start gap-2" style={{ background: "#FDECEA", border: "1px solid #F3B8AC" }}>
                  <AlertCircle size={15} color="#D14343" className="shrink-0 mt-0.5" />
                  <span className="text-sm" style={{ color: "#B23A2E" }}>{error}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-4 flex items-center gap-3" style={{ borderTop: "1px solid #E3E7ED", background: "#F5F6F8" }}>
              <div className="text-[11px] font-mono flex-1 min-w-0" style={{ color: "#8992A3" }}>
                Every figure is stamped with its source and period.
              </div>
              <button
                onClick={() => setOpen(false)}
                disabled={working}
                className="rounded-xl px-4 py-2.5 text-sm shrink-0"
                style={{ background: "#FFFFFF", color: "#64708A", border: "1px solid #E3E7ED" }}
              >
                Cancel
              </button>
              <button
                onClick={generate}
                disabled={working || chosenCount === 0}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium shrink-0"
                style={{
                  background: chosenCount === 0 ? "#E3E7ED" : "#14213D",
                  color: chosenCount === 0 ? "#8992A3" : "#F3F5F8",
                  opacity: working ? 0.75 : 1,
                }}
              >
                {working ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
                {working ? "Building PDF…" : "Download PDF"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
