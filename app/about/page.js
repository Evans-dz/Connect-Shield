import Link from "next/link";
import { ArrowRight, EyeOff, FileCheck, Phone } from "lucide-react";
import Reveal from "@/components/Reveal";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "About Us — A Founder and a 20-Year Hospice Operator",
  description:
    "Zac Evans and Justin Larsen started Connect Shield LLC in St. George, Utah, so hospices stay compliant and their billing never freezes. Meet the five-person team behind the platform.",
  alternates: { canonical: `${SITE.url}/about` },
};

// Justin Larsen — the clinical backbone of the product.
const CREDENTIALS = [
  { value: "20 yrs", label: "Hospice owner-operator" },
  { value: "CHA", label: "Certified Hospice Administrator" },
  { value: "16", label: "CMS & state surveys" },
  { value: "CHAP", label: "Accreditation" },
];

// PHOTO PENDING for every member — swap each initials <div> for an <Image>
// (e.g. /public/team/zac.jpg) when headshots land.
const TEAM = [
  { name: "Zac Evans", title: "Founder", initials: "ZE" },
  { name: "Justin Larsen", title: "Clinical Director of Success", initials: "JL" },
  { name: "Jase Larsen", title: "Client Relations Specialist", initials: "JL" },
  { name: "Lori Larsen", title: "Operations Specialist", initials: "LL" },
  { name: "Dylan Evans", title: "Customer Service", initials: "DE" },
];

const PRINCIPLES = [
  {
    icon: EyeOff,
    title: "Zero PHI, by architecture",
    body: "There is no patient table in this product. Your analysis is built from facility-level reports CMS publishes about your agency — never patient records.",
  },
  {
    icon: FileCheck,
    title: "Published data, real numbers",
    body: "The score on your dashboard is the number in the CMS file — not an estimate. If we show a figure, it reconciles to the official release.",
  },
  {
    icon: Phone,
    title: "A person answers",
    body: "The main line is answered by the founder. Customer service is a named person with a direct number. Small team, short path to an answer.",
  },
];

export default function About() {
  return (
    <>
      {/* Hero */}
      <section className="hero-navy relative overflow-hidden">
        <div className="index-field absolute inset-0" aria-hidden="true" />
        <div className="max-w-content mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-14 relative text-center">
          <div className="eyebrow justify-center animate-fade-up" style={{ color: "#E8CFA0" }}>About us</div>
          <h1 className="font-display text-white mt-4 animate-fade-up" style={{ fontSize: "clamp(2.2rem, 4.4vw, 3.2rem)", lineHeight: 1.06 }}>
            A frozen payment shouldn't be the first warning.
          </h1>
          <p className="text-base md:text-lg mt-5 max-w-2xl mx-auto animate-fade-up" style={{ color: "#AEBAD0", animationDelay: "80ms" }}>
            Too many agencies find out something was wrong when Medicare stops paying. Connect Shield exists so the data CMS sees never surprises you.
          </p>
          <div className="flex items-center justify-center gap-2 mt-6 text-[12px] font-mono animate-fade-up" style={{ color: "#7C8AA8", animationDelay: "140ms" }}>
            Connect Shield LLC · St. George, Utah · (435) 224-6987
          </div>
        </div>
      </section>

      {/* Founding story + Justin's credentials */}
      <section className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-10 items-start">
          <Reveal>
            <div className="eyebrow">The founding story</div>
            <h2 className="font-display text-ink mt-3" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
              A founder and a 20-year operator.
            </h2>
            <div className="mt-6 space-y-4 text-slate text-[15px] leading-relaxed max-w-xl">
              <p>
                Justin Larsen ran a hospice as an owner-operator for 20 years. Sixteen CMS and state surveys. CHAP accreditation.
                Two decades of watching how compliance actually fails — not loudly, in a survey, but quietly, in claims data,
                until the first sign anyone sees is a frozen Medicare payment.
              </p>
              <p>
                By then it isn't a warning. Payroll is due, the census is full, and the problem is already months old.
              </p>
              <p>
                Zac Evans started Connect Shield with Justin in St. George, Utah, around one position: an agency should never
                learn about a compliance problem from a frozen payment. CMS builds its picture of your agency from data it
                publishes. You should be reading that data first — and fixing what it shows before it costs you.
              </p>
              <p className="text-ink font-medium">
                That's the whole company. Watch what CMS watches, so nothing CMS sees surprises you.
              </p>
            </div>
          </Reveal>

          <Reveal delay={80}>
            <div className="rounded-2xl p-7 md:p-8" style={{ background: "#14213D" }}>
              <div className="eyebrow" style={{ color: "#E8CFA0" }}>The clinical backbone</div>
              <div className="flex items-center gap-4 mt-5">
                {/* PHOTO PENDING — replace this initials block with Justin's headshot. */}
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center font-display text-xl shrink-0" style={{ background: "#B8863F", color: "#0E1830" }}>
                  JL
                </div>
                <div>
                  <h3 className="font-display text-xl text-white">Justin Larsen</h3>
                  <div className="text-[12px] font-mono mt-1" style={{ color: "#E8CFA0" }}>Clinical Director of Success</div>
                </div>
              </div>
              <p className="text-sm mt-5" style={{ color: "#AEBAD0" }}>
                Every analysis the platform runs is read the way a surveyor would read it — because Justin sat on the other
                side of that table for 20 years.
              </p>
              <div className="grid grid-cols-2 gap-3 mt-6">
                {CREDENTIALS.map((c) => (
                  <div key={c.label} className="rounded-xl p-4" style={{ background: "#1E2C4E" }}>
                    <div className="font-display text-2xl text-white">{c.value}</div>
                    <div className="text-[11px] font-mono mt-1 uppercase tracking-wide" style={{ color: "#7C8AA8" }}>{c.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Team */}
      <section style={{ background: "#EEF0F4" }}>
        <div className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-24">
          <Reveal>
            <div className="eyebrow">The team</div>
            <h2 className="font-display text-ink mt-3" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
              Five people. All reachable.
            </h2>
            <p className="text-slate mt-3 max-w-xl">
              No account tiers between you and an answer. The people below are the whole company — and the people on your calls.
            </p>
          </Reveal>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
            {TEAM.map((m, i) => (
              <Reveal key={m.name} delay={(i % 3) * 70}>
                <div className="h-full rounded-2xl p-7 bg-white" style={{ border: "1px solid #E3E7ED" }}>
                  {/* PHOTO PENDING — replace this initials block with the headshot. */}
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center font-display text-lg"
                    style={{ background: "#14213D", color: "#E8CFA0" }}
                  >
                    {m.initials}
                  </div>
                  <h3 className="font-display text-lg text-ink mt-4">{m.name}</h3>
                  <div className="text-[12px] font-mono mt-1" style={{ color: "#B8863F" }}>{m.title}</div>
                </div>
              </Reveal>
            ))}
            <Reveal delay={140}>
              <Link href="/contact" className="h-full rounded-2xl p-7 flex flex-col justify-between transition-colors hover:opacity-95" style={{ background: "#14213D" }}>
                <div>
                  <h3 className="font-display text-lg text-white">Need one of us?</h3>
                  <p className="text-sm mt-2" style={{ color: "#AEBAD0" }}>Phone numbers, email, and the office address are on the contact page.</p>
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-medium mt-5" style={{ color: "#E8CFA0" }}>
                  Contact details <ArrowRight size={15} />
                </span>
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-24">
        <Reveal>
          <div className="eyebrow">How we operate</div>
          <h2 className="font-display text-ink mt-3" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
            Three principles we won't trade away.
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {PRINCIPLES.map((p, i) => (
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
        <p className="text-[12px] font-mono mt-8" style={{ color: "#8992A3" }}>
          We make no certification claims. The full security case is on the <Link href="/security" className="underline">security page</Link>.
        </p>
      </section>

      {/* CTA */}
      <section style={{ background: "#EEF0F4" }}>
        <div className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-20 text-center">
          <Reveal>
            <h2 className="font-display text-ink" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
              See your own numbers, with a founder on the call.
            </h2>
            <p className="text-slate mt-3 max-w-xl mx-auto">
              20 minutes, your CCN loaded, your published SSVI score on screen. Demos are with a founder — not a sales queue.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-7">
              <Link
                href="/demo"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium"
                style={{ background: "#B8863F", color: "#0E1830" }}
              >
                Book a demo <ArrowRight size={15} />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-medium"
                style={{ background: "#14213D", color: "#E8CFA0" }}
              >
                Contact us
              </Link>
            </div>
            <p className="text-[12px] font-mono mt-6" style={{ color: "#8992A3" }}>
              (435) 224-6987 · {SITE.email} · St. George, Utah
            </p>
          </Reveal>
        </div>
      </section>
    </>
  );
}
