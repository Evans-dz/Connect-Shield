import Link from "next/link";
import { Mail, MapPin, Phone, ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Contact & Team",
  description:
    "Reach the Connect Shield team in St. George, Utah. Meet the people behind the platform, email us directly, or book a demo of your hospice's compliance picture.",
  alternates: { canonical: `${SITE.url}/contact` },
};

// PHOTO PENDING for both members — swap the initials <div> for an <Image>
// (e.g. /public/team/dylan.jpg, /public/team/justin.jpg) when headshots land.
const TEAM = [
  {
    name: "Dylan Evans",
    title: "Founder",
    initials: "DE",
    blurb: "Builds the platform and runs the business. Your demo call is with Dylan.",
  },
  {
    name: "Justin",
    title: "Clinical Director of Success",
    initials: "J",
    blurb: "Keeps the analysis grounded in how hospice teams actually run — and helps yours act on it.",
  },
];

export default function Contact() {
  return (
    <>
      {/* Hero */}
      <section className="hero-navy relative overflow-hidden">
        <div className="index-field absolute inset-0" aria-hidden="true" />
        <div className="max-w-content mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-14 relative text-center">
          <div className="eyebrow justify-center animate-fade-up" style={{ color: "#E8CFA0" }}>Contact &amp; Team</div>
          <h1 className="font-display text-white mt-4 animate-fade-up" style={{ fontSize: "clamp(2.2rem, 4.4vw, 3.2rem)", lineHeight: 1.06 }}>
            A small team you can actually reach.
          </h1>
          <p className="text-base md:text-lg mt-5 max-w-2xl mx-auto animate-fade-up" style={{ color: "#AEBAD0", animationDelay: "80ms" }}>
            {/* [LEGAL ENTITY NAME] is a placeholder — swap in the registered entity once filed. */}
            {SITE.name} — [LEGAL ENTITY NAME] — builds hospice compliance intelligence from St. George, Utah. Published CMS data in, a clear picture out, and a person on the other end of the email.
          </p>
          <div className="flex items-center justify-center gap-2 mt-6 text-[12px] font-mono animate-fade-up" style={{ color: "#7C8AA8", animationDelay: "140ms" }}>
            St. George, Utah · {SITE.email} · Replies from a human
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-24">
        <Reveal>
          <div className="eyebrow">The team</div>
          <h2 className="font-display text-ink mt-3" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
            Who you'll be working with.
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-2 gap-4 mt-10 max-w-3xl">
          {TEAM.map((m, i) => (
            <Reveal key={m.name} delay={i * 80}>
              <div className="h-full rounded-2xl p-7 bg-white" style={{ border: "1px solid #E3E7ED" }}>
                {/* PHOTO PENDING — replace this initials block with the headshot. */}
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center font-display text-xl"
                  style={{ background: "#14213D", color: "#E8CFA0" }}
                >
                  {m.initials}
                </div>
                <h3 className="font-display text-xl text-ink mt-4">{m.name}</h3>
                <div className="text-[12px] font-mono mt-1" style={{ color: "#B8863F" }}>{m.title}</div>
                <p className="text-sm text-slate mt-3">{m.blurb}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Contact details + CTA */}
      <section style={{ background: "#EEF0F4" }}>
        <div className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <Reveal>
              <div className="eyebrow">Reach us</div>
              <h2 className="font-display text-ink mt-3" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
                Email first. We're fast.
              </h2>
              <ul className="mt-7 space-y-4">
                <li className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#F7F0E1" }}>
                    <Mail size={16} color="#B8863F" />
                  </span>
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wide" style={{ color: "#8992A3" }}>Email</div>
                    <a href={`mailto:${SITE.email}`} className="text-sm text-ink underline">{SITE.email}</a>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#F7F0E1" }}>
                    <Phone size={16} color="#B8863F" />
                  </span>
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wide" style={{ color: "#8992A3" }}>Phone</div>
                    {/* Placeholder — swap in the business line when it's provisioned. */}
                    <span className="text-sm font-mono text-ink">[PHONE — PENDING]</span>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#F7F0E1" }}>
                    <MapPin size={16} color="#B8863F" />
                  </span>
                  <div>
                    <div className="text-[11px] font-mono uppercase tracking-wide" style={{ color: "#8992A3" }}>Location</div>
                    <span className="text-sm text-ink">St. George, Utah</span>
                  </div>
                </li>
              </ul>
              <p className="text-[12px] font-mono mt-7" style={{ color: "#8992A3" }}>
                Please don't email PHI or patient details — <Link href="/security" className="underline">here's why</Link>.
              </p>
            </Reveal>

            <Reveal delay={80}>
              <div className="rounded-2xl p-7 md:p-8" style={{ background: "#14213D" }}>
                <h3 className="font-display text-xl text-white">The fastest answer is a demo.</h3>
                <p className="text-sm mt-3" style={{ color: "#AEBAD0" }}>
                  20 minutes, your CCN loaded, your published SSVI score on screen. Most questions answer themselves once you see your own numbers.
                </p>
                <Link
                  href="/demo"
                  className="inline-flex items-center gap-2 mt-5 text-sm font-medium rounded-lg px-5 py-2.5"
                  style={{ background: "#B8863F", color: "#0E1830" }}
                >
                  Book a demo <ArrowRight size={15} />
                </Link>
                <div className="mt-6 pt-5 text-[12px] font-mono" style={{ borderTop: "1px solid #243354", color: "#7C8AA8" }}>
                  Legal &amp; trust: <Link href="/privacy" className="underline">Privacy</Link> · <Link href="/terms" className="underline">Terms</Link> · <Link href="/security" className="underline">Security</Link>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
