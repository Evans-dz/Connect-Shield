import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Pricing — Hospice Compliance Intelligence",
  description:
    "Connect Shield pricing for hospice agencies. Every plan includes your published SSVI score, report analysis, and a secure per-clinic portal. Book a demo to get set up.",
  alternates: { canonical: `${SITE.url}/pricing` },
};

const TIERS = [
  {
    name: "Single Agency",
    for: "One hospice, one CCN",
    highlight: false,
    features: [
      "Published SSVI score + all 9 measures",
      "PS&R Report 810 analysis",
      "Beneficiary count & CAP exposure",
      "PEPPER & CAHPS reads",
      "Document library",
      "Atlas compliance assistant",
    ],
  },
  {
    name: "Multi-Agency",
    for: "Owners & groups with several CCNs",
    highlight: true,
    features: [
      "Everything in Single Agency",
      "All CCNs in one portal",
      "Cross-agency SSVI benchmarking",
      "Chart & CoP auditor",
      "Survey & recertification tracking",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    for: "Networks, MSOs & consultants",
    highlight: false,
    features: [
      "Everything in Multi-Agency",
      "Unlimited CCNs",
      "Role-based team access",
      "Dedicated onboarding",
      "Custom reporting",
      "SSO & security review",
    ],
  },
];

export default function Pricing() {
  return (
    <>
      <section className="hero-navy relative overflow-hidden">
        <div className="index-field absolute inset-0" aria-hidden="true" />
        <div className="max-w-content mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-14 relative text-center">
          <div className="eyebrow justify-center animate-fade-up" style={{ color: "#E8CFA0" }}>Pricing</div>
          <h1 className="font-display text-white mt-4 animate-fade-up" style={{ fontSize: "clamp(2.2rem, 4.4vw, 3.2rem)", lineHeight: 1.06 }}>
            Priced per agency. Quoted on your demo.
          </h1>
          <p className="text-base md:text-lg mt-5 max-w-xl mx-auto animate-fade-up" style={{ color: "#AEBAD0", animationDelay: "80ms" }}>
            Compliance tooling is priced to your number of CCNs and the scope you need. We give you an exact quote on the call — no surprises, no per-seat traps.
          </p>
        </div>
      </section>

      <section className="max-w-content mx-auto px-5 md:px-8 -mt-8 md:-mt-10 pb-20 md:pb-28 relative">
        <div className="grid md:grid-cols-3 gap-4">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} delay={i * 80}>
              <div
                className="h-full rounded-2xl p-7 bg-white flex flex-col"
                style={{
                  border: t.highlight ? "1.5px solid #B8863F" : "1px solid #E3E7ED",
                  boxShadow: t.highlight ? "0 24px 60px rgba(20,33,61,0.12)" : "0 1px 3px rgba(16,24,40,0.04)",
                }}
              >
                {t.highlight && (
                  <div className="self-start mb-3 text-[11px] font-mono px-2 py-1 rounded" style={{ background: "#F7F0E1", color: "#B8863F" }}>
                    Most popular
                  </div>
                )}
                <h3 className="font-display text-2xl text-ink">{t.name}</h3>
                <p className="text-sm text-slate mt-1">{t.for}</p>
                <div className="my-6" style={{ borderTop: "1px solid #EEF0F4" }} />
                <ul className="space-y-3 flex-1">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-ink">
                      <Check size={16} color="#2E9E62" className="shrink-0 mt-0.5" /> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/demo"
                  className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium"
                  style={t.highlight ? { background: "#B8863F", color: "#0E1830" } : { background: "#14213D", color: "#F3F5F8" }}
                >
                  Book a demo <ArrowRight size={15} />
                </Link>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="text-center text-[12px] font-mono mt-8" style={{ color: "#8992A3" }}>
          Every plan is zero-PHI and includes a secure per-clinic portal. Questions? {SITE.email}
        </p>
      </section>
    </>
  );
}
