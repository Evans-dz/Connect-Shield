import Link from "next/link";
import { ArrowRight, Check, Minus, ShieldCheck, FileText, PieChart, Search, Activity, BookOpen, Bot, Lock } from "lucide-react";
import Reveal from "@/components/Reveal";
import CCNTeaser from "@/components/CCNTeaser";
import { SITE, STATS, COMPETITORS, FAQ } from "@/lib/site";
import { SOLUTIONS } from "@/lib/solutions";

const PLATFORM = [
  { icon: Search, title: "Published SSVI lookup", body: "Your exact CMS score for all 7,059 hospices, with every one of the nine measures broken down." },
  { icon: Activity, title: "PS&R risk drivers", body: "Upload Report 810 and get RN intensity, length of stay, and reimbursement calculated in seconds." },
  { icon: PieChart, title: "CAP exposure", body: "Turn your beneficiary count into a live aggregate-cap calculation with a clawback estimate." },
  { icon: FileText, title: "PEPPER & CAHPS", body: "Read your outlier target areas and survey scores against national thresholds, in plain terms." },
  { icon: BookOpen, title: "Survey & CoP auditor", body: "Track deficiencies and audit charts against the Medicare Conditions of Participation." },
  { icon: Bot, title: "Atlas assistant", body: "Ask your compliance data anything — SSVI, CAP, RN intensity — and get precise answers." },
];

function Cell({ v }) {
  if (v === true) return <Check size={17} color="#2E9E62" className="mx-auto" />;
  if (v === "partial") return <Minus size={17} color="#C98A1F" className="mx-auto" />;
  return <span className="block text-center text-slate-mute">—</span>;
}

export default function Home() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="hero-navy relative overflow-hidden">
        <div className="index-field absolute inset-0" aria-hidden="true" />
        <div className="max-w-content mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-16 md:pb-20 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            <div>
              <div className="eyebrow animate-fade-up" style={{ color: "#E8CFA0" }}>Hospice Compliance Intelligence</div>
              <h1 className="font-display text-white mt-4 animate-fade-up" style={{ fontSize: "clamp(2.4rem, 5vw, 3.6rem)", lineHeight: 1.05, animationDelay: "60ms" }}>
                The compliance score CMS keeps on your hospice — decoded.
              </h1>
              <p className="text-base md:text-lg mt-5 max-w-lg animate-fade-up" style={{ color: "#AEBAD0", animationDelay: "120ms" }}>
                CMS now scores every hospice from 0 to 16 on nine claims-based measures. Connect Shield shows you your number, reads your own reports alongside it, and tells you exactly what to fix — securely, and built to HIPAA standards.
              </p>
              <div className="flex flex-wrap gap-3 mt-7 animate-fade-up" style={{ animationDelay: "180ms" }}>
                <Link href="/demo" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium" style={{ background: "#B8863F", color: "#0E1830" }}>
                  Book a demo <ArrowRight size={16} />
                </Link>
                <a href="#lookup" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-white" style={{ border: "1px solid #2E3E60" }}>
                  Look up my SSVI score
                </a>
              </div>
              <div className="flex items-center gap-2 mt-6 text-[12px] font-mono animate-fade-up" style={{ color: "#7C8AA8", animationDelay: "240ms" }}>
                <ShieldCheck size={14} color="#B8863F" /> HIPAA-compliant · Encrypted, role-based access · Built on public CMS data
              </div>
            </div>

            <div id="lookup" className="animate-fade-up" style={{ animationDelay: "160ms" }}>
              <CCNTeaser />
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────── */}
      <section style={{ background: "#14213D" }}>
        <div className="max-w-content mx-auto px-5 md:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6" style={{ borderTop: "1px solid #243354" }}>
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 60}>
              <div className="text-center md:text-left">
                <div className="font-mono text-2xl md:text-3xl" style={{ color: "#E8CFA0" }}>{s.value}</div>
                <div className="text-[12px] mt-1" style={{ color: "#93A0B8" }}>{s.label}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── PLATFORM ──────────────────────────────────────── */}
      <section id="platform" className="max-w-content mx-auto px-5 md:px-8 py-20 md:py-28">
        <Reveal>
          <div className="eyebrow">The platform</div>
          <h2 className="font-display text-ink mt-3 max-w-2xl" style={{ fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)", lineHeight: 1.1 }}>
            Every report CMS scores you on, read in one place.
          </h2>
          <p className="text-slate mt-4 max-w-xl">
            Other tools stop at a lookup. Connect Shield reads your PS&R, beneficiary count, PEPPER, and CAHPS alongside the published CMS data — then turns it into a to-do list your leadership can act on.
          </p>
        </Reveal>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-12">
          {PLATFORM.map((f, i) => {
            const Icon = f.icon;
            return (
              <Reveal key={f.title} delay={(i % 3) * 80}>
                <div className="h-full rounded-2xl p-6 bg-white transition-transform hover:-translate-y-0.5" style={{ border: "1px solid #E3E7ED", boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F7F0E1" }}>
                    <Icon size={19} color="#B8863F" />
                  </div>
                  <h3 className="font-display text-lg text-ink mt-4">{f.title}</h3>
                  <p className="text-sm text-slate mt-2">{f.body}</p>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ── MISSION ───────────────────────────────────────── */}
      <section style={{ background: "#F7F0E1" }}>
        <div className="max-w-content mx-auto px-5 md:px-8 py-20 md:py-28 text-center">
          <Reveal>
            <div className="eyebrow justify-center">Visibility · Compliance · Confidence</div>
            <h2 className="font-display text-ink mt-4 mx-auto max-w-3xl" style={{ fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.08 }}>
              Confidence starts with visibility.
            </h2>
            <p className="text-slate mt-5 max-w-2xl mx-auto text-base md:text-lg">
              Our mission is to empower hospice leadership with the intelligence, tools, and visibility needed to navigate compliance with confidence.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── SOLUTIONS GRID ────────────────────────────────── */}
      <section id="solutions" style={{ background: "#EEF0F4" }}>
        <div className="max-w-content mx-auto px-5 md:px-8 py-20 md:py-28">
          <Reveal>
            <div className="eyebrow">Solutions</div>
            <h2 className="font-display text-ink mt-3" style={{ fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)", lineHeight: 1.1 }}>
              Built around the terms you're already searching.
            </h2>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-3 mt-12">
            {SOLUTIONS.map((s, i) => (
              <Reveal key={s.slug} delay={(i % 2) * 70}>
                <Link href={`/${s.slug}`} className="group flex items-start justify-between gap-4 rounded-2xl p-6 bg-white transition-colors hover:border-gold" style={{ border: "1px solid #E3E7ED" }}>
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-wider" style={{ color: "#B8863F" }}>{s.hero.kicker}</div>
                    <h3 className="font-display text-xl text-ink mt-2">{s.nav}</h3>
                    <p className="text-sm text-slate mt-1.5 max-w-md">{s.metaDescription.split(".")[0]}.</p>
                  </div>
                  <ArrowRight size={18} className="shrink-0 mt-1 text-slate-mute transition-transform group-hover:translate-x-1 group-hover:text-gold" />
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── COMPARE ───────────────────────────────────────── */}
      <section id="compare" className="max-w-content mx-auto px-5 md:px-8 py-20 md:py-28">
        <Reveal>
          <div className="eyebrow">Why Connect Shield</div>
          <h2 className="font-display text-ink mt-3 max-w-2xl" style={{ fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)", lineHeight: 1.1 }}>
            A lookup tells you the score. We tell you what to do about it.
          </h2>
          <p className="text-slate mt-4 max-w-xl">{COMPETITORS.intro}</p>
        </Reveal>

        <Reveal delay={80}>
          <div className="mt-12 overflow-x-auto rounded-2xl bg-white" style={{ border: "1px solid #E3E7ED" }}>
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr style={{ borderBottom: "1px solid #E3E7ED" }}>
                  <th className="text-left font-medium text-slate px-5 py-4 w-1/2">Capability</th>
                  <th className="px-4 py-4 text-center" style={{ background: "#F7F0E1" }}>
                    <span className="font-display text-ink">Connect Shield</span>
                  </th>
                  <th className="px-4 py-4 text-center font-mono text-[12px] text-slate">Hospice Engine</th>
                  <th className="px-4 py-4 text-center font-mono text-[12px] text-slate">Hospice Shield</th>
                </tr>
              </thead>
              <tbody>
                {COMPETITORS.rows.map((r) => (
                  <tr key={r.feature} style={{ borderBottom: "1px solid #EEF0F4" }}>
                    <td className="px-5 py-3.5 text-ink">{r.feature}</td>
                    <td className="px-4 py-3.5" style={{ background: "#FBF6EC" }}><Cell v={r.cs} /></td>
                    <td className="px-4 py-3.5"><Cell v={r.engine} /></td>
                    <td className="px-4 py-3.5"><Cell v={r.shield} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[12px] font-mono mt-3" style={{ color: "#8992A3" }}>
            Comparison reflects publicly described features as of {new Date().getFullYear()}. ✓ full · <span style={{ color: "#C98A1F" }}>–</span> partial · — not offered.
          </p>
        </Reveal>
      </section>

      {/* ── SECURITY STRIP ────────────────────────────────── */}
      <section style={{ background: "#0E1830" }}>
        <div className="max-w-content mx-auto px-5 md:px-8 py-16">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { icon: ShieldCheck, h: "HIPAA-compliant by design", p: "Connect Shield is built and operated to HIPAA standards. Your data is encrypted in transit and at rest, and we work from CMS agency-level data and the reports you upload." },
              { icon: Lock, h: "Secure per-clinic access", p: "Each hospice gets its own portal with hashed credentials, encrypted sessions, and multi-factor authentication support." },
              { icon: Check, h: "Sourced straight from CMS", p: "SSVI figures come directly from the CMS-1851-P file. Every measure we show reconciles to your published score." },
            ].map((c, i) => {
              const Icon = c.icon;
              return (
                <Reveal key={c.h} delay={i * 80}>
                  <Icon size={20} color="#B8863F" />
                  <h3 className="font-display text-lg text-white mt-3">{c.h}</h3>
                  <p className="text-sm mt-2" style={{ color: "#93A0B8" }}>{c.p}</p>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <section className="max-w-content mx-auto px-5 md:px-8 py-20 md:py-28">
        <Reveal>
          <div className="eyebrow">Questions</div>
          <h2 className="font-display text-ink mt-3" style={{ fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)", lineHeight: 1.1 }}>
            The things owners ask first.
          </h2>
        </Reveal>
        <div className="mt-10 max-w-3xl divide-y" style={{ borderColor: "#E3E7ED" }}>
          {FAQ.map((f, i) => (
            <Reveal key={f.q} delay={(i % 3) * 60}>
              <details className="group py-5" style={{ borderTop: i === 0 ? "1px solid #E3E7ED" : "none" }}>
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="font-display text-lg text-ink pr-6">{f.q}</span>
                  <span className="text-gold transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                </summary>
                <p className="text-slate text-sm mt-3 max-w-2xl">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ─────────────────────────────────────── */}
      <section className="max-w-content mx-auto px-5 md:px-8 pb-24">
        <Reveal>
          <div className="hero-navy rounded-3xl px-8 md:px-14 py-14 md:py-16 text-center relative overflow-hidden">
            <div className="index-field absolute inset-0" aria-hidden="true" />
            <div className="relative">
              <h2 className="font-display text-white" style={{ fontSize: "clamp(1.9rem, 3.6vw, 2.8rem)", lineHeight: 1.08 }}>
                See your full compliance picture in one call.
              </h2>
              <p className="mt-4 max-w-lg mx-auto" style={{ color: "#AEBAD0" }}>
                We'll set up your secure portal, load your CCN, and walk your team through exactly what's driving your score.
              </p>
              <Link href="/demo" className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-medium mt-7" style={{ background: "#B8863F", color: "#0E1830" }}>
                Book a demo <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
