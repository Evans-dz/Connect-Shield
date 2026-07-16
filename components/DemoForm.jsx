"use client";
import { useState } from "react";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const FIELD = "w-full rounded-xl px-4 py-3 text-sm focus:outline-none";
const FIELD_STYLE = { background: "#FFFFFF", border: "1px solid #C7CDD8", color: "#16202E" };

export default function DemoForm() {
  const [form, setForm] = useState({ name: "", email: "", hospice: "", ccn: "", phone: "", message: "" });
  const [state, setState] = useState("idle"); // idle | sending | done | error
  const [err, setErr] = useState("");

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async () => {
    if (!form.name.trim() || !form.email.trim() || !form.hospice.trim()) {
      setErr("Please add your name, work email, and hospice name.");
      setState("error");
      return;
    }
    setState("sending");
    setErr("");
    try {
      const res = await fetch("/api/demo-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Request failed");
      }
      setState("done");
    } catch (e) {
      setErr("We couldn't submit that just now. Email us at hello@connect-shield.com and we'll set you up.");
      setState("error");
    }
  };

  if (state === "done") {
    return (
      <div className="rounded-2xl p-8 text-center" style={{ background: "#FFFFFF", border: "1px solid #E3E7ED" }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: "#EAF6EF" }}>
          <CheckCircle2 size={24} color="#2E9E62" />
        </div>
        <h3 className="font-display text-2xl text-ink mt-4">Request received</h3>
        <p className="text-sm mt-2 max-w-sm mx-auto" style={{ color: "#64708A" }}>
          We'll reach out within one business day to set up your secure portal and walk your team through your SSVI breakdown.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-6 md:p-8" style={{ background: "#FFFFFF", border: "1px solid #E3E7ED", boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wide" style={{ color: "#8992A3" }}>Your name *</label>
          <input className={FIELD + " mt-1.5"} style={FIELD_STYLE} value={form.name} onChange={set("name")} placeholder="Jane Doe" />
        </div>
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wide" style={{ color: "#8992A3" }}>Work email *</label>
          <input className={FIELD + " mt-1.5"} style={FIELD_STYLE} value={form.email} onChange={set("email")} placeholder="jane@yourhospice.com" type="email" />
        </div>
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wide" style={{ color: "#8992A3" }}>Hospice name *</label>
          <input className={FIELD + " mt-1.5"} style={FIELD_STYLE} value={form.hospice} onChange={set("hospice")} placeholder="Evergreen Hospice LLC" />
        </div>
        <div>
          <label className="text-[11px] font-mono uppercase tracking-wide" style={{ color: "#8992A3" }}>CCN (optional)</label>
          <input className={FIELD + " mt-1.5 font-mono"} style={FIELD_STYLE} value={form.ccn} onChange={set("ccn")} placeholder="B51562" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11px] font-mono uppercase tracking-wide" style={{ color: "#8992A3" }}>Phone (optional)</label>
          <input className={FIELD + " mt-1.5"} style={FIELD_STYLE} value={form.phone} onChange={set("phone")} placeholder="(555) 555-5555" />
        </div>
        <div className="sm:col-span-2">
          <label className="text-[11px] font-mono uppercase tracking-wide" style={{ color: "#8992A3" }}>What's on your mind? (optional)</label>
          <textarea className={FIELD + " mt-1.5"} style={FIELD_STYLE} rows={4} value={form.message} onChange={set("message")} placeholder="We just got our SSVI score and want to understand it." />
        </div>
      </div>

      {state === "error" && (
        <div className="flex items-start gap-2 mt-4 rounded-xl p-3" style={{ background: "#FDECEA", border: "1px solid #F3B8AC" }}>
          <AlertCircle size={15} color="#D14343" className="shrink-0 mt-0.5" />
          <span className="text-sm" style={{ color: "#B23A2E" }}>{err}</span>
        </div>
      )}

      <button
        onClick={submit}
        disabled={state === "sending"}
        className="w-full mt-5 flex items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-medium disabled:opacity-60"
        style={{ background: "#14213D", color: "#F3F5F8" }}
      >
        {state === "sending" ? <Loader2 size={15} className="animate-spin" /> : null}
        {state === "sending" ? "Sending" : "Request my demo"}
      </button>
      <p className="text-[11px] font-mono text-center mt-3" style={{ color: "#8992A3" }}>
        No sensitive data needed · We reply within one business day
      </p>
    </div>
  );
}
