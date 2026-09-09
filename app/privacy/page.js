import Link from "next/link";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Privacy Policy",
  description:
    "Connect Shield's plain-English privacy policy: what we collect (account details, demo-form fields, usage analytics), what we never collect (PHI), and how to reach us or request deletion.",
  alternates: { canonical: `${SITE.url}/privacy` },
};

const EFFECTIVE = "September 8, 2026";

// Small helper for the repeated section shell — number, header, body.
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

export default function Privacy() {
  return (
    <>
      {/* Hero */}
      <section className="hero-navy relative overflow-hidden">
        <div className="index-field absolute inset-0" aria-hidden="true" />
        <div className="max-w-content mx-auto px-5 md:px-8 pt-16 md:pt-20 pb-12 relative">
          <div className="eyebrow animate-fade-up" style={{ color: "#E8CFA0" }}>Legal</div>
          <h1 className="font-display text-white mt-4 animate-fade-up" style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", lineHeight: 1.08 }}>
            Privacy Policy
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
              <p>This is the privacy policy of Connect Shield LLC (&quot;Connect Shield&quot;).</p>
              <p>We collect the minimum needed to run your account: a name, a work email, your agency details, and anonymous usage analytics.</p>
              <p>We never collect PHI or patient data — the product is built so there is nowhere to put it.</p>
              <p>We never sell your data. Ever.</p>
              <p>Want your data deleted? Email <a href={`mailto:${SITE.email}`} className="underline" style={{ color: "#B8863F" }}>{SITE.email}</a>.</p>
            </div>
          </div>

          <Section n="01" title="What we collect">
            <Bullets
              items={[
                "Account details: your name, work email, and hashed login credentials.",
                "Demo-form fields: name, work email, agency name, CCN, role, and anything you type in the message box.",
                "Billing details: handled by our payment processor — we never see or store full card numbers.",
                "Usage analytics: aggregate page views and performance data via Vercel Analytics.",
                "Uploaded reports: the facility-level CMS reports you choose to upload (PS&R, PEPPER, CAHPS, QAPI).",
              ]}
            />
          </Section>

          <Section n="02" title="What we never collect">
            <p>
              No Protected Health Information (PHI). No patient charts, clinical notes, patient names, or any identifiable patient data. The reports the platform works from are aggregate, facility-level documents. Our <Link href="/terms" className="underline" style={{ color: "#B8863F" }}>terms</Link> also require that you not upload PHI. More on the architecture: <Link href="/security" className="underline" style={{ color: "#B8863F" }}>Security</Link>.
            </p>
          </Section>

          <Section n="03" title="How we use it">
            <Bullets
              items={[
                "To run your portal: authentication, per-clinic data isolation, and your compliance dashboard.",
                "To respond to demo requests and support questions.",
                "To send service emails about your account and, if you opt in, product updates.",
                "To understand aggregate usage so we can improve the product.",
              ]}
            />
            <p>We do not sell your data. We do not rent it, trade it, or share it with advertisers.</p>
          </Section>

          <Section n="04" title="Cookies">
            <p>
              Two purposes only: keeping you signed in (authentication session) and anonymous analytics. No advertising cookies, no cross-site trackers.
            </p>
          </Section>

          <Section n="05" title="Who we share with">
            <p>
              Only the infrastructure that runs the service — hosting, database, email delivery, and payment processing providers — each bound by their own contractual data-protection terms, and only what they need to do their job. We disclose data if the law genuinely requires it, and we will tell you when we are allowed to.
            </p>
          </Section>

          <Section n="06" title="Deletion & your choices">
            <Bullets
              items={[
                `Request deletion of your account and data any time: email ${SITE.email}.`,
                "Unsubscribe from marketing email with one click; service emails continue while you have an account.",
                "Ask us what we hold about you — we'll tell you.",
              ]}
            />
          </Section>

          <Section n="07" title="Email & CAN-SPAM">
            <p>
              Every marketing email we send identifies us, includes a working unsubscribe link, and honors opt-outs promptly.
            </p>
            {/* CAN-SPAM contact block — registered business address. */}
            <div className="rounded-xl p-5 font-mono text-[13px]" style={{ background: "#EEF0F4", color: "#16202E" }}>
              <div>Connect Shield LLC</div>
              <div>923 S River Rd</div>
              <div>St George, UT 84790</div>
              <div>{SITE.email}</div>
              <div>(435) 224-6987</div>
            </div>
          </Section>

          <Section n="08" title="Governing law">
            <p>
              This policy is governed by the laws of the State of Utah, without regard to conflict-of-law rules.
            </p>
          </Section>

          <Section n="09" title="Changes">
            <p>
              If this policy changes materially, we'll update the effective date above and note it to account holders by email. Continued use after a change means you accept the updated policy.
            </p>
          </Section>

          <Section n="10" title="Contact">
            <p>
              Questions about privacy: <a href={`mailto:${SITE.email}`} className="underline" style={{ color: "#B8863F" }}>{SITE.email}</a> — or see <Link href="/contact" className="underline" style={{ color: "#B8863F" }}>Contact &amp; Team</Link>.
            </p>
          </Section>
        </div>
      </section>
    </>
  );
}
