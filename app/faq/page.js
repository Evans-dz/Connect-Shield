import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Hospice Compliance & Demo FAQ",
  description:
    "Answers to the hospice compliance questions owners actually search — SSVI scores, PEPPER reports, the Medicare aggregate cap, CMS-2567s, CHAP accreditation — plus how a Connect Shield demo works and how pricing is structured.",
  alternates: { canonical: `${SITE.url}/faq` },
};

// Each answer string is used verbatim in BOTH the visible page and the
// FAQPage JSON-LD, so the structured data always matches the on-page text.
// The optional `link` renders as a separate related-page link below the answer.

const COMPANY_FAQ = [
  {
    q: "What happens on a Connect Shield demo?",
    a: "It's a 20-minute walkthrough with a founder — never a sales team. We pull your own CCN live, so you're looking at your hospice's published SSVI score and the measures behind it, not a canned dataset. Pricing is shared on the call.",
    link: { href: "/demo", label: "Book a demo" },
  },
  {
    q: "Do I need to prepare anything for the demo?",
    a: "Just your CCN. Everything we show comes from data CMS already publishes about your agency, so there's nothing to install, export, or upload before the call.",
  },
  {
    q: "How is Connect Shield pricing structured?",
    a: "Pricing is shared on the demo call. Plans run as a 12-month subscription, and every plan includes the full platform — tiers differ by how many agencies and users you have, never by which tools you get.",
    link: { href: "/pricing", label: "See what every plan includes" },
  },
  {
    q: "Does Connect Shield store patient data?",
    a: "No. Connect Shield stores zero PHI — the platform works from published, facility-level CMS data and the aggregate reports you upload, never patient names, charts, or diagnoses. There is no patient table in the product.",
    link: { href: "/security", label: "How our security works" },
  },
  {
    q: "Who is behind Connect Shield?",
    a: "Connect Shield LLC, based in St. George, Utah. It was founded by Zac Evans with Justin Larsen — a hospice owner-operator of 20 years, a Certified Hospice Administrator, and a veteran of 16 CMS and state surveys.",
    link: { href: "/about", label: "Meet the team" },
  },
  {
    q: "Is the free SSVI lookup really free?",
    a: "Yes. Every scored US hospice has a public page with its full SSVI breakdown, and looking one up requires no signup. The paid platform starts where the lookup ends — reading your own reports against that score.",
    link: { href: "/hospice", label: "Browse all agencies" },
  },
  {
    q: "Can my whole team use Connect Shield?",
    a: "Yes. Each hospice gets its own isolated portal, and your users are provisioned inside it — every query is scoped to your clinic, so your team sees your data and nobody else's. User counts scale with your plan.",
  },
];

const COMPLIANCE_FAQ = [
  {
    q: "What is the SSVI?",
    a: "The Service and Spending Variation Index is a 0–16 score CMS now assigns every hospice, built from nine claims-based measures: eight utilization measures worth one point each, plus a non-hospice spending score worth up to eight. CMS finalized it in the FY2027 hospice final rule on July 30, 2026, and it takes effect October 1, 2026. A higher score means an agency's claims patterns diverge further from peer norms.",
    link: { href: "/ssvi", label: "Look up your SSVI score" },
  },
  {
    q: "What is a good SSVI score?",
    a: "Lower is better. Across the 6,643 scored US hospices, the national average is 6.42 and the median is 7, so a score at or below 7 sits with the majority of the field. Scores of 10 or higher — about 12.5% of hospices — are the range most likely to draw program-integrity attention.",
    link: { href: "/ssvi", label: "See all nine measures explained" },
  },
  {
    q: "Is a high SSVI score a violation?",
    a: "No. CMS is explicit that the SSVI is not a determination of fraud, waste, or abuse. A high score means your claims patterns diverge from peer norms, which makes review more likely — treat it as a reason to understand which measures flagged you, not as a finding against your agency.",
  },
  {
    q: "What is a PEPPER report?",
    a: "The Program for Evaluating Payment Patterns Electronic Report compares your hospice's billing against national percentiles across target areas known to attract audit attention — long lengths of stay and live discharges among them. Sitting above the 80th percentile on a target area doesn't prove anything is wrong, but it does put you on the map for review. PEPPER relaunched in June 2026 after a 2.5-year pause, so fresh reports are landing again.",
    link: { href: "/pepper", label: "Read your PEPPER report" },
  },
  {
    q: "What is the hospice aggregate CAP?",
    a: "The aggregate cap is the annual ceiling on total Medicare payments a hospice can receive: your beneficiary count multiplied by a per-beneficiary cap amount CMS updates each year. It exists to keep hospice spending in line with the cost of conventional end-of-life care. Your Beneficiary Count report holds the number that drives the calculation.",
    link: { href: "/beneficiary-count", label: "Calculate your CAP exposure" },
  },
  {
    q: "What happens if we exceed the CAP?",
    a: "You repay the difference. Payments above the cap are treated as an overpayment, and your Medicare Administrative Contractor issues a repayment demand — often months after the cap year closes. Running the calculation during the year, while admissions and census can still be managed, is how agencies see it coming.",
    link: { href: "/beneficiary-count", label: "Run the CAP math" },
  },
  {
    q: "What is a CMS-2567?",
    a: "Form CMS-2567 is the Statement of Deficiencies — the official document issued after a survey, listing each deficiency found and the requirement it falls under. Your agency responds on the same form with a plan of correction. Condition-level deficiencies are the serious ones: they can put Medicare certification at risk until corrected.",
    link: { href: "/survey-results", label: "Organize your survey results" },
  },
  {
    q: "What is CHAP accreditation?",
    a: "CHAP — Community Health Accreditation Partner — is a CMS-approved accrediting organization for hospices. A CHAP-accredited agency is surveyed by CHAP under its deeming authority in place of the state survey agency, against standards that meet or exceed the Medicare Conditions of Participation. Accreditation is voluntary, and it does not exempt an agency from CMS oversight.",
    link: { href: "/survey-results", label: "Track your survey readiness" },
  },
  {
    q: "How often does CMS update hospice compliance data?",
    a: "On different cycles per dataset. Hospice quality data on Care Compare refreshes quarterly, PEPPER is released annually, and the published SSVI file — FY2024 and FY2025 scores so far — follows the annual rulemaking cycle. Connect Shield loads each new CMS release as it lands.",
  },
];

const ALL_FAQ = [...COMPANY_FAQ, ...COMPLIANCE_FAQ];

function FaqItem({ f, first }) {
  return (
    <details className="group py-5" style={{ borderTop: first ? "1px solid #E3E7ED" : "none" }}>
      <summary className="flex items-center justify-between cursor-pointer list-none">
        <span className="font-display text-lg text-ink pr-6">{f.q}</span>
        <span className="text-gold transition-transform group-open:rotate-45 text-xl leading-none">+</span>
      </summary>
      <p className="text-slate text-sm mt-3 max-w-2xl">{f.a}</p>
      {f.link && (
        <Link href={f.link.href} className="inline-flex items-center gap-1.5 mt-3 text-sm font-medium" style={{ color: "#B8863F" }}>
          {f.link.label} <ArrowRight size={14} />
        </Link>
      )}
    </details>
  );
}

export default function FaqPage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: ALL_FAQ.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      {/* Hero */}
      <section className="hero-navy relative overflow-hidden">
        <div className="index-field absolute inset-0" aria-hidden="true" />
        <div className="max-w-content mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-14 relative text-center">
          <div className="eyebrow justify-center animate-fade-up" style={{ color: "#E8CFA0" }}>FAQ</div>
          <h1 className="font-display text-white mt-4 animate-fade-up" style={{ fontSize: "clamp(2.2rem, 4.4vw, 3.2rem)", lineHeight: 1.06 }}>
            Frequently asked questions
          </h1>
          <p className="text-base md:text-lg mt-5 max-w-2xl mx-auto animate-fade-up" style={{ color: "#AEBAD0", animationDelay: "80ms" }}>
            How the demo works, how pricing is structured, and straight answers to the hospice compliance terms owners actually search.
          </p>
          <div className="flex items-center justify-center gap-2 mt-6 text-[12px] font-mono animate-fade-up" style={{ color: "#7C8AA8", animationDelay: "140ms" }}>
            SSVI · PEPPER · Aggregate CAP · CMS-2567 · CHAP
          </div>
        </div>
      </section>

      {/* Group 1 — Connect Shield & demos */}
      <section className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-24">
        <Reveal>
          <div className="eyebrow">About Connect Shield &amp; demos</div>
          <h2 className="font-display text-ink mt-3" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
            The product, the demo, the price.
          </h2>
        </Reveal>
        <div className="mt-8 max-w-3xl divide-y" style={{ borderColor: "#E3E7ED" }}>
          {COMPANY_FAQ.map((f, i) => (
            <Reveal key={f.q} delay={(i % 3) * 60}>
              <FaqItem f={f} first={i === 0} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Group 2 — compliance questions */}
      <section style={{ background: "#EEF0F4" }}>
        <div className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-24">
          <Reveal>
            <div className="eyebrow">Hospice compliance, answered</div>
            <h2 className="font-display text-ink mt-3 max-w-2xl" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
              The terms behind the acronyms.
            </h2>
            <p className="text-slate mt-3 max-w-xl">
              Plain-language definitions of the scores, reports, and forms that decide how CMS sees your agency.
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="mt-8 max-w-3xl rounded-2xl bg-white px-6 md:px-8 py-2" style={{ border: "1px solid #E3E7ED" }}>
              <div className="divide-y" style={{ borderColor: "#E3E7ED" }}>
                {COMPLIANCE_FAQ.map((f) => (
                  <FaqItem key={f.q} f={f} first={false} />
                ))}
              </div>
            </div>
          </Reveal>
          <p className="text-[12px] font-mono mt-6 max-w-3xl" style={{ color: "#8992A3" }}>
            Everything on this page is informational, built from published CMS data. It is not legal advice, clinical advice, or a compliance determination — decisions about your agency remain yours.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-20 text-center">
        <Reveal>
          <h2 className="font-display text-ink" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
            Still have a question? Ask it on the demo.
          </h2>
          <p className="text-slate mt-3 max-w-xl mx-auto">
            20 minutes with our team, your CCN loaded, your published SSVI score on screen. Most questions answer themselves once you see your own numbers.
          </p>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 mt-7 text-sm font-medium"
            style={{ background: "#B8863F", color: "#0E1830" }}
          >
            Book a demo <ArrowRight size={15} />
          </Link>
          <p className="text-[12px] font-mono mt-6" style={{ color: "#8992A3" }}>
            Prefer email? {SITE.email}
          </p>
        </Reveal>
      </section>
    </>
  );
}
