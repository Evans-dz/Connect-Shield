import Link from "next/link";
import { Mail, MapPin, Phone, PhoneCall, ArrowRight } from "lucide-react";
import Reveal from "@/components/Reveal";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Contact — Call, Email, or Visit",
  description:
    "Reach Connect Shield LLC in St George, Utah. Main line (435) 224-6987 is answered by the founder; customer service, email, and the office address are all published. 923 S River Rd, St George, UT 84790.",
  alternates: { canonical: `${SITE.url}/contact` },
};

// Every entry here is a real, published way to reach a named person.
const REACH = [
  {
    icon: Phone,
    label: "Main line",
    value: "(435) 224-6987",
    href: "tel:+14352246987",
    detail: "Answered by Zac Evans, Founder.",
  },
  {
    icon: PhoneCall,
    label: "Customer service",
    value: "(435) 994-5235",
    href: "tel:+14359945235",
    detail: "Dylan Evans, Customer Service.",
  },
  {
    icon: Mail,
    label: "Email",
    value: "admin@connect-shield.com",
    href: "mailto:admin@connect-shield.com",
    detail: "Replies from a human, not a ticket bot.",
  },
  {
    icon: MapPin,
    label: "Office",
    value: "923 S River Rd",
    href: null,
    detail: "St George, UT 84790",
  },
];

export default function Contact() {
  return (
    <>
      {/* Hero */}
      <section className="hero-navy relative overflow-hidden">
        <div className="index-field absolute inset-0" aria-hidden="true" />
        <div className="max-w-content mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-14 relative text-center">
          <div className="eyebrow justify-center animate-fade-up" style={{ color: "#E8CFA0" }}>Contact</div>
          <h1 className="font-display text-white mt-4 animate-fade-up" style={{ fontSize: "clamp(2.2rem, 4.4vw, 3.2rem)", lineHeight: 1.06 }}>
            A small team you can actually reach.
          </h1>
          <p className="text-base md:text-lg mt-5 max-w-2xl mx-auto animate-fade-up" style={{ color: "#AEBAD0", animationDelay: "80ms" }}>
            Connect Shield LLC builds hospice compliance intelligence from St. George, Utah. Call, and a founder answers. Email, and a person replies.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 mt-6 text-[12px] font-mono animate-fade-up" style={{ color: "#7C8AA8", animationDelay: "140ms" }}>
            923 S River Rd, St George, UT 84790 · (435) 224-6987 · {SITE.email}
          </div>
        </div>
      </section>

      {/* Reach us */}
      <section className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-24">
        <Reveal>
          <div className="eyebrow">Reach us</div>
          <h2 className="font-display text-ink mt-3" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
            Four ways in. All of them a person.
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
          {REACH.map((r, i) => (
            <Reveal key={r.label} delay={i * 70}>
              <div className="h-full rounded-2xl p-6 bg-white" style={{ border: "1px solid #E3E7ED" }}>
                <span className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "#F7F0E1" }}>
                  <r.icon size={18} color="#B8863F" />
                </span>
                <div className="text-[11px] font-mono uppercase tracking-wide mt-4" style={{ color: "#8992A3" }}>{r.label}</div>
                {r.href ? (
                  <a href={r.href} className="block text-[15px] font-mono text-ink mt-1 underline decoration-1 underline-offset-2 break-all">
                    {r.value}
                  </a>
                ) : (
                  <div className="text-[15px] font-mono text-ink mt-1">{r.value}</div>
                )}
                <p className="text-sm text-slate mt-2">{r.detail}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={120}>
          <p className="text-sm text-slate mt-8">
            Wondering who does what?{" "}
            <Link href="/about" className="text-ink underline">Meet the full team on the about page</Link>.
          </p>
          <p className="text-[12px] font-mono mt-3" style={{ color: "#8992A3" }}>
            Please don't email PHI or patient details — <Link href="/security" className="underline">here's why</Link>.
          </p>
        </Reveal>
      </section>

      {/* Company details + demo CTA */}
      <section style={{ background: "#EEF0F4" }}>
        <div className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="grid lg:grid-cols-2 gap-10 items-start">
            <Reveal>
              <div className="eyebrow">The company</div>
              <h2 className="font-display text-ink mt-3" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
                Registered, addressed, and answerable.
              </h2>
              <p className="text-slate mt-3 max-w-md">
                Connect Shield LLC is registered in Utah and operates from St. George. No PO box, no answering service — the address and numbers below are the real ones.
              </p>
              <div className="rounded-2xl p-6 bg-white mt-7 max-w-md" style={{ border: "1px solid #E3E7ED" }}>
                <div className="text-[11px] font-mono uppercase tracking-wide" style={{ color: "#8992A3" }}>Legal &amp; mailing</div>
                <div className="text-sm text-ink mt-2 leading-relaxed">
                  Connect Shield LLC<br />
                  923 S River Rd<br />
                  St George, UT 84790
                </div>
                <div className="text-[12px] font-mono mt-4 pt-4" style={{ borderTop: "1px solid #E3E7ED", color: "#8992A3" }}>
                  (435) 224-6987 · {SITE.email}
                </div>
              </div>
            </Reveal>

            <Reveal delay={80}>
              <div className="rounded-2xl p-7 md:p-8" style={{ background: "#14213D" }}>
                <h3 className="font-display text-xl text-white">The fastest answer is a demo.</h3>
                <p className="text-sm mt-3" style={{ color: "#AEBAD0" }}>
                  20 minutes, your CCN loaded, your published SSVI score on screen. Demos are with a founder — most questions answer themselves once you see your own numbers.
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
