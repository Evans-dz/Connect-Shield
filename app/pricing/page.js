import Link from "next/link";
import { Check, ArrowRight, Plus, Sparkles } from "lucide-react";
import Reveal from "@/components/Reveal";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Pricing — Every Tool, Every Update, One Price",
  description:
    "Connect Shield pricing for hospice agencies. Every plan includes every compliance tool and all future features — you only pay for how many agencies and people you have. Zero PHI.",
  alternates: { canonical: `${SITE.url}/pricing` },
};

// The complete platform — included in EVERY plan.
const TOOLKIT = [
  "SSVI score + all 9 measures (FY2024 & FY2025, year-over-year)",
  "Medicare CAP exposure & clawback calculator",
  "PS&R Report 810 analysis — RN intensity, LOS, reimbursement",
  "PEPPER outlier analysis",
  "CAHPS tracking & national benchmarking",
  "QAPI project support",
  "Survey deficiency & recertification / face-to-face tracking",
  "Chart & Conditions-of-Participation auditor",
  "Regulatory Watch with action checklists",
  "Atlas AI compliance assistant",
  "Compliance document library",
  "Composite compliance scorecard & critical findings",
];

// Tiers differ only by SCALE — never by which tools you get.
const TIERS = [
  {
    name: "Single Agency",
    for: "One hospice, one CCN",
    price: "$400",
    highlight: false,
    scale: [
      "1 CCN",
      "Up to 2 users",
      "The complete platform",
      "Standard support",
    ],
  },
  {
    name: "Multi-Agency",
    for: "Owners & groups with several CCNs",
    price: "$900",
    highlight: true,
    scale: [
      "Up to 5 CCNs in one portal",
      "Up to 10 users",
      "Cross-agency SSVI benchmarking",
      "Portfolio view across agencies",
      "Priority support",
    ],
  },
  {
    name: "Enterprise",
    for: "Networks, MSOs & consultants",
    price: "$1,800",
    highlight: false,
    scale: [
      "Unlimited CCNs",
      "Role-based team access & SSO",
      "Dedicated onboarding",
      "Custom reporting & board packets",
      "White-label for consultants & MSOs",
      "Security review",
    ],
  },
];

// À la carte services — attachable to any plan.
const ADDONS = [
  {
    name: "Compliance Strategy Calls",
    body: "A standing monthly 1:1 with a compliance specialist to walk your numbers and your next moves.",
    price: "$400/mo",
    note: "or $250 à la carte",
    cadence: "Recurring",
    flag: false,
  },
  {
    name: "90-Day SSVI Remediation Plan",
    body: "A done-for-you roadmap to pull a high SSVI down — which measures to attack, in what order, with milestones.",
    price: "$2,500–$3,500",
    note: "one-time",
    cadence: "One-time",
    flag: "Most requested",
  },
  {
    name: "Quarterly Compliance Review",
    body: "A recurring deep-dive each quarter with a written action report and trend read for your leadership team.",
    price: "$1,200/qtr",
    note: "4-for-3 when prepaid",
    cadence: "Recurring",
    flag: false,
  },
  {
    name: "Done-For-You Data Setup",
    body: "We pull and upload your PS&R, CAP, and PEPPER each period so your dashboard is always current — hands-off.",
    price: "$200/mo",
    note: "per agency",
    cadence: "Recurring",
    flag: false,
  },
  {
    name: "Survey Readiness / Mock Survey",
    body: "A pre-survey run-through against the Conditions of Participation so nothing surprises you on survey day.",
    price: "$1,500–$3,000",
    note: "one-time",
    cadence: "One-time",
    flag: false,
  },
  {
    name: "Team Training Workshop",
    body: "A live onboarding session to get your whole team fluent in the dashboard and reading their own numbers.",
    price: "$500–$1,000",
    note: "one-time",
    cadence: "One-time",
    flag: false,
  },
];

export default function Pricing() {
  return (
    <>
      {/* Hero */}
      <section className="hero-navy relative overflow-hidden">
        <div className="index-field absolute inset-0" aria-hidden="true" />
        <div className="max-w-content mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-14 relative text-center">
          <div className="eyebrow justify-center animate-fade-up" style={{ color: "#E8CFA0" }}>Pricing</div>
          <h1 className="font-display text-white mt-4 animate-fade-up" style={{ fontSize: "clamp(2.2rem, 4.4vw, 3.2rem)", lineHeight: 1.06 }}>
            Every tool. Every update. One price.
          </h1>
          <p className="text-base md:text-lg mt-5 max-w-2xl mx-auto animate-fade-up" style={{ color: "#AEBAD0", animationDelay: "80ms" }}>
            No feature tiers, no add-on traps. Every plan includes the entire platform and every future feature we ship. You only pay for how many agencies and people you have.
          </p>
          <div className="flex items-center justify-center gap-2 mt-6 text-[12px] font-mono animate-fade-up" style={{ color: "#7C8AA8", animationDelay: "140ms" }}>
            Unlimited AI analysis (fair use) · All future features included · Zero PHI
          </div>
        </div>
      </section>

      {/* Complete platform — included in every plan */}
      <section style={{ background: "#EEF0F4" }}>
        <div className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-20">
          <Reveal>
            <div className="eyebrow">Included in every plan</div>
            <h2 className="font-display text-ink mt-3" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
              The complete platform — in all three tiers.
            </h2>
            <p className="text-slate mt-3 max-w-xl">
              Whether you run one agency or fifty, you get the same full toolset. Tiers below differ only by scale.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-3 mt-10">
              {TOOLKIT.map((t) => (
                <div key={t} className="flex items-start gap-2.5">
                  <Check size={17} color="#2E9E62" className="shrink-0 mt-0.5" />
                  <span className="text-sm text-ink">{t}</span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Tiers — priced by scale */}
      <section className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-24">
        <Reveal>
          <div className="text-center max-w-xl mx-auto">
            <div className="eyebrow justify-center">Choose your scale</div>
            <h2 className="font-display text-ink mt-3" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
              Same tools. Priced to your footprint.
            </h2>
          </div>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-4 mt-12">
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
                <div className="mt-5 flex items-baseline gap-1.5">
                  <span className="font-display text-ink" style={{ fontSize: "2.6rem", lineHeight: 1 }}>{t.price}</span>
                  <span className="text-sm font-mono" style={{ color: "#64708A" }}>/mo</span>
                </div>
                <div className="my-6" style={{ borderTop: "1px solid #EEF0F4" }} />
                <div className="text-[11px] font-mono uppercase tracking-wide mb-3" style={{ color: "#8992A3" }}>
                  Complete platform, plus
                </div>
                <ul className="space-y-3 flex-1">
                  {t.scale.map((f) => (
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
          Monthly, cancel anytime · Annual available (2 months free) · Every plan is zero-PHI with a secure per-clinic portal
        </p>
      </section>

      {/* Services & Support (add-ons) */}
      <section style={{ background: "#EEF0F4" }}>
        <div className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-24">
          <Reveal>
            <div className="eyebrow">Services & support</div>
            <h2 className="font-display text-ink mt-3" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
              Want us in the trenches with you?
            </h2>
            <p className="text-slate mt-3 max-w-xl">
              Optional, à la carte, and attachable to any plan. Bring in our team for hands-on help when the stakes are high.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
            {ADDONS.map((a, i) => (
              <Reveal key={a.name} delay={(i % 3) * 70}>
                <div className="h-full rounded-2xl p-6 bg-white flex flex-col" style={{ border: a.flag ? "1.5px solid #E8CFA0" : "1px solid #E3E7ED" }}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded" style={{ background: "#F5F6F8", color: "#64708A" }}>
                      {a.cadence}
                    </span>
                    {a.flag && (
                      <span className="text-[10px] font-mono uppercase tracking-wide px-2 py-0.5 rounded" style={{ background: "#F7F0E1", color: "#B8863F" }}>
                        {a.flag}
                      </span>
                    )}
                  </div>
                  <h3 className="font-display text-lg text-ink mt-3">{a.name}</h3>
                  <p className="text-sm text-slate mt-2 flex-1">{a.body}</p>
                  <div className="mt-4 flex items-baseline gap-2">
                    <span className="font-mono text-lg text-ink">{a.price}</span>
                    <span className="text-xs font-mono" style={{ color: "#8992A3" }}>{a.note}</span>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Bundle nudge */}
          <Reveal delay={80}>
            <div className="mt-8 rounded-2xl p-6 md:p-7 flex items-start gap-4" style={{ background: "#14213D" }}>
              <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#B8863F" }}>
                <Sparkles size={18} color="#0E1830" />
              </span>
              <div>
                <div className="font-display text-lg text-white">Start annual, and the Remediation Plan is on us.</div>
                <p className="text-sm mt-1.5" style={{ color: "#AEBAD0" }}>
                  Sign an annual Multi-Agency or Enterprise plan and we include the 90-Day SSVI Remediation Plan free — the fastest way to turn a high score around.
                </p>
                <Link href="/demo" className="inline-flex items-center gap-2 mt-4 text-sm font-medium rounded-lg px-4 py-2" style={{ background: "#B8863F", color: "#0E1830" }}>
                  Book a demo <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Close */}
      <section className="max-w-content mx-auto px-5 md:px-8 py-16 text-center">
        <p className="text-sm font-mono" style={{ color: "#8992A3" }}>
          Not sure which plan fits? We'll size it on the call. Questions? {SITE.email}
        </p>
      </section>
    </>
  );
}
