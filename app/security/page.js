import Link from "next/link";
import { Database, Lock, KeyRound, EyeOff, ShieldCheck, Ban, X, ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Security — Zero PHI, Nothing to Breach",
  description:
    "Connect Shield stores zero PHI. Your compliance analysis is built from data CMS already publishes about your agency — encrypted in transit and at rest, isolated per clinic, role-gated. No patient records, ever.",
  alternates: { canonical: `${SITE.url}/security` },
};

// The architecture, as six plain claims. Every one is structural, not a badge.
const PILLARS = [
  {
    icon: Database,
    title: "Built on published data",
    body: "SSVI, PEPPER, CAHPS, and PS&R are aggregate, facility-level reports. CMS publishes them about your agency — not about any patient.",
  },
  {
    icon: Lock,
    title: "Encrypted in transit",
    body: "Every connection to the portal runs over TLS 1.2+. No plaintext traffic, anywhere.",
  },
  {
    icon: Lock,
    title: "Encrypted at rest",
    body: "Database and file storage are encrypted at rest on managed infrastructure.",
  },
  {
    icon: KeyRound,
    title: "Per-clinic isolation",
    body: "Row-level security scopes every query to your clinic. Your portal can only return your rows.",
  },
  {
    icon: ShieldCheck,
    title: "Role-gated portal",
    body: "Accounts are provisioned by invitation, credentials are hashed, and access is gated by role.",
  },
  {
    icon: EyeOff,
    title: "No patient records, ever",
    body: "Not minimized. Not de-identified. Absent. There is no patient table in this product.",
  },
];

const NOT_COLLECTED = [
  "Patient charts or medical records",
  "Clinical notes or visit documentation",
  "Patient names, dates of birth, MRNs, or any identifiable patient data",
  "Diagnoses, medications, or treatment details",
  "Family or caregiver contact information",
];

export default function Security() {
  return (
    <>
      {/* Hero */}
      <section className="hero-navy relative overflow-hidden">
        <div className="index-field absolute inset-0" aria-hidden="true" />
        <div className="max-w-content mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-14 relative text-center">
          <div className="eyebrow justify-center animate-fade-up" style={{ color: "#E8CFA0" }}>Security</div>
          <h1 className="font-display text-white mt-4 animate-fade-up" style={{ fontSize: "clamp(2.2rem, 4.4vw, 3.2rem)", lineHeight: 1.06 }}>
            There is nothing to breach.
          </h1>
          <p className="text-base md:text-lg mt-5 max-w-2xl mx-auto animate-fade-up" style={{ color: "#AEBAD0", animationDelay: "80ms" }}>
            Connect Shield stores zero PHI. Your analysis is built from data CMS already publishes about your agency — encrypted, isolated per clinic, and role-gated.
          </p>
          <div className="flex items-center justify-center gap-2 mt-6 text-[12px] font-mono animate-fade-up" style={{ color: "#7C8AA8", animationDelay: "140ms" }}>
            0 patient records · TLS 1.2+ in transit · Encrypted at rest · Row-level isolation
          </div>
        </div>
      </section>

      {/* Architecture */}
      <section className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-24">
        <Reveal>
          <div className="eyebrow">The architecture is the security</div>
          <h2 className="font-display text-ink mt-3" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
            Data we never take can never leak.
          </h2>
          <p className="text-slate mt-3 max-w-xl">
            Most healthcare software carries patient data and defends it. We designed the product so there is no patient data to defend.
          </p>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={(i % 3) * 70}>
              <div className="h-full rounded-2xl p-6 bg-white" style={{ border: "1px solid #E3E7ED" }}>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F7F0E1" }}>
                  <p.icon size={18} color="#B8863F" />
                </span>
                <h3 className="font-display text-lg text-ink mt-4">{p.title}</h3>
                <p className="text-sm text-slate mt-2">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* What we deliberately do not collect */}
      <section style={{ background: "#EEF0F4" }}>
        <div className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <Reveal>
              <div className="eyebrow">By design, not by policy</div>
              <h2 className="font-display text-ink mt-3" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
                What we deliberately do NOT collect.
              </h2>
              <p className="text-slate mt-3 max-w-md">
                The reports the platform reads — SSVI, PEPPER, CAHPS, PS&amp;R — are facility-level by definition. So the product simply has no place to put any of this:
              </p>
              <ul className="mt-7 space-y-3">
                {NOT_COLLECTED.map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-ink">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#FBE9E9" }}>
                      <X size={12} color="#D14343" />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </Reveal>

            <Reveal delay={80}>
              <div className="rounded-2xl p-7 md:p-8" style={{ background: "#14213D" }}>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#B8863F" }}>
                  <Ban size={18} color="#0E1830" />
                </span>
                <h3 className="font-display text-xl text-white mt-4">Planning to send us PHI? Don't.</h3>
                <p className="text-sm mt-3" style={{ color: "#AEBAD0" }}>
                  Connect Shield is built to work without patient data, and our terms require that none is uploaded. If a workflow you want seems to need it, talk to us first — there is almost always a facility-level way to get the same answer.
                </p>
                <a
                  href={`mailto:${SITE.email}`}
                  className="inline-flex items-center gap-2 mt-5 text-sm font-medium rounded-lg px-4 py-2"
                  style={{ background: "#1E2C4E", color: "#E8CFA0" }}
                >
                  {SITE.email}
                </a>
                <div className="mt-6 pt-5 text-[12px] font-mono" style={{ borderTop: "1px solid #243354", color: "#7C8AA8" }}>
                  We make no certification claims. Our security case is architectural: data that is never collected cannot be breached.
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-20 text-center">
        <Reveal>
          <h2 className="font-display text-ink" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
            See the portal — and what it doesn't ask for.
          </h2>
          <p className="text-slate mt-3 max-w-xl mx-auto">
            20 minutes. Your published SSVI score, your isolation model, and not a single patient field on screen.
          </p>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 mt-7 text-sm font-medium"
            style={{ background: "#B8863F", color: "#0E1830" }}
          >
            Book a demo <ArrowRight size={15} />
          </Link>
          <p className="text-[12px] font-mono mt-6" style={{ color: "#8992A3" }}>
            Security questions before you book? {SITE.email}
          </p>
        </Reveal>
      </section>
    </>
  );
}
