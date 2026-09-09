import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Terms of Service",
  description:
    "Connect Shield's terms of service in plain English: 12-month subscriptions, demo-gated signup, acceptable use, the no-PHI clause, and what our scores and analysis are — and are not.",
  alternates: { canonical: `${SITE.url}/terms` },
};

const EFFECTIVE = "September 8, 2026";

function Section({ n, title, children }) {
  return (
    <section className="mt-10">
      <div className="flex items-baseline gap-3">
        <span className="text-[12px] font-mono" style={{ color: "#B8863F" }}>{n}</span>
        <h2 className="font-display text-xl md:text-2xl text-ink">{title}</h2>
      </div>
      <div className="mt-3 space-y-3 text-sm text-slate leading-relaxed">{children}</div>
    </section>
  );
}

function Bullets({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((it) => (
        <li key={it} className="flex items-start gap-2.5">
          <span className="w-1.5 h-1.5 rounded-full shrink-0 mt-[7px]" style={{ background: "#B8863F" }} />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

export default function Terms() {
  return (
    <>
      {/* Hero */}
      <section className="hero-navy relative overflow-hidden">
        <div className="index-field absolute inset-0" aria-hidden="true" />
        <div className="max-w-content mx-auto px-5 md:px-8 pt-16 md:pt-20 pb-12 relative">
          <div className="eyebrow animate-fade-up" style={{ color: "#E8CFA0" }}>Legal</div>
          <h1 className="font-display text-white mt-4 animate-fade-up" style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", lineHeight: 1.08 }}>
            Terms of Service
          </h1>
          <p className="text-[12px] font-mono mt-4 animate-fade-up" style={{ color: "#7C8AA8", animationDelay: "80ms" }}>
            Effective {EFFECTIVE} · {SITE.name} · {SITE.domain}
          </p>
        </div>
      </section>

      {/* Body */}
      <section className="max-w-content mx-auto px-5 md:px-8 py-12 md:py-16">
        <div className="max-w-3xl">
          {/* The short version */}
          <div className="rounded-2xl p-6 md:p-7 bg-white" style={{ border: "1px solid #E3E7ED" }}>
            <div className="eyebrow">The short version</div>
            <div className="mt-4 text-sm text-ink space-y-2">
              <p>Subscriptions run 12 months and start after a demo — no self-serve signup.</p>
              <p>Never upload PHI. The product doesn't need it and the contract forbids it.</p>
              <p>Scores and analysis are information, not legal or clinical advice.</p>
              <p>Use the portal honestly, keep your credentials to yourself, and we'll take good care of you.</p>
            </div>
          </div>

          <Section n="01" title="The agreement">
            <p>
              These terms are a contract between your organization and Connect Shield LLC, a Utah limited liability company ("Connect Shield", "we", "us"), covering your use of the {SITE.name} platform and website. By creating an account or using the service, you accept them.
            </p>
          </Section>

          <Section n="02" title="Subscriptions & term">
            <Bullets
              items={[
                "Access starts with a demo — accounts are provisioned per clinic after a demo call, not self-serve.",
                "The subscription term is 12 months, billed monthly unless your order form says otherwise.",
                "Plans renew for successive 12-month terms unless either side gives notice before renewal.",
                "Pricing is confirmed on your demo call and stated in your order form.",
              ]}
            />
          </Section>

          <Section n="03" title="Your account">
            <Bullets
              items={[
                "Keep credentials confidential; you are responsible for activity under your accounts.",
                "Seats are for named individual users — no shared logins.",
                "Tell us promptly at the address below if you suspect unauthorized access.",
              ]}
            />
          </Section>

          <Section n="04" title="Acceptable use">
            <p>Don't:</p>
            <Bullets
              items={[
                "Probe, disable, or interfere with the service or its security features.",
                "Scrape, resell, or republish the platform's analysis outside your organization without written permission.",
                "Access another clinic's data or attempt to — every portal is isolated to its own clinic.",
                "Use the service to violate any law or regulation.",
              ]}
            />
          </Section>

          <Section n="05" title="No PHI — ever">
            <p>
              You agree not to upload, transmit, or store Protected Health Information or any identifiable patient data in the service. {SITE.name} operates exclusively on aggregate, facility-level data — published CMS files and the facility-level reports you upload (PS&amp;R, PEPPER, CAHPS, QAPI). If PHI is uploaded in breach of this clause, we may delete it and suspend the uploading account until resolved. See <Link href="/security" className="underline" style={{ color: "#B8863F" }}>Security</Link> for how the platform is built to make this easy.
            </p>
          </Section>

          <Section n="06" title="Informational, not advice">
            <p>
              Scores, flags, estimates, and AI-generated analysis in the platform are informational tools built from published CMS data and the documents you provide. They are not legal advice, clinical advice, or a compliance determination — and they are not a CMS determination of fraud, waste, or abuse. Decisions about your agency remain yours; consult your own counsel and clinical leadership.
            </p>
          </Section>

          <Section n="07" title="Your data & ours">
            <Bullets
              items={[
                "You own the reports and data you upload; you grant us the license needed to process them for you.",
                "We own the platform, its analysis models, and its published-data compilations.",
                "On termination, we delete your uploaded data on request — email us.",
              ]}
            />
          </Section>

          <Section n="08" title="Service & availability">
            <p>
              We work to keep the service fast and available, but it is provided "as is" and "as available" — no warranty of uninterrupted or error-free operation. Published CMS data is reproduced as released and may itself change or be corrected by CMS.
            </p>
          </Section>

          <Section n="09" title="Limitation of liability">
            <p>
              To the maximum extent the law allows, neither side is liable for indirect, incidental, or consequential damages, and our total liability under these terms is capped at the fees you paid us in the 12 months before the claim. Nothing here limits liability that cannot legally be limited.
            </p>
          </Section>

          <Section n="10" title="Termination">
            <p>
              Either side may terminate for material breach that isn't cured within 30 days of notice. We may suspend access immediately for a security issue or a breach of the no-PHI clause. Fees for the current term are otherwise non-refundable unless your order form says so.
            </p>
          </Section>

          <Section n="11" title="Governing law">
            <p>
              These terms are governed by the laws of the State of Utah, and disputes belong to the state or federal courts located in Utah.
            </p>
          </Section>

          <Section n="12" title="Changes & contact">
            <p>
              If these terms change materially, we'll update the effective date above and notify account holders by email. Questions: <a href={`mailto:${SITE.email}`} className="underline" style={{ color: "#B8863F" }}>{SITE.email}</a> · <Link href="/privacy" className="underline" style={{ color: "#B8863F" }}>Privacy Policy</Link> · <Link href="/contact" className="underline" style={{ color: "#B8863F" }}>Contact &amp; Team</Link>.
            </p>
          </Section>
        </div>
      </section>
    </>
  );
}
