import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, ShieldCheck } from "lucide-react";
import Reveal from "@/components/Reveal";
import CCNTeaser from "@/components/CCNTeaser";
import { SITE } from "@/lib/site";
import { SOLUTIONS, SOLUTION_SLUGS, getSolution } from "@/lib/solutions";

export const dynamicParams = false;

export function generateStaticParams() {
  return SOLUTION_SLUGS.map((solution) => ({ solution }));
}

export function generateMetadata({ params }) {
  const s = getSolution(params.solution);
  if (!s) return {};
  const url = `${SITE.url}/${s.slug}`;
  return {
    title: s.metaTitle,
    description: s.metaDescription,
    keywords: s.keywords,
    alternates: { canonical: url },
    openGraph: { title: s.metaTitle, description: s.metaDescription, url, type: "article" },
  };
}

export default function SolutionPage({ params }) {
  const s = getSolution(params.solution);
  if (!s) notFound();

  const faqs = [...(s.faqExtra || [])];
  const related = SOLUTIONS.filter((x) => x.slug !== s.slug).slice(0, 3);

  const ld = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: s.metaTitle,
    description: s.metaDescription,
    url: `${SITE.url}/${s.slug}`,
    isPartOf: { "@type": "WebSite", name: SITE.name, url: SITE.url },
    ...(faqs.length
      ? {
          mainEntity: {
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
          },
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />

      {/* Hero */}
      <section className="hero-navy relative overflow-hidden">
        <div className="index-field absolute inset-0" aria-hidden="true" />
        <div className="max-w-content mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-16 md:pb-20 relative">
          <div className="max-w-3xl">
            <div className="eyebrow animate-fade-up" style={{ color: "#E8CFA0" }}>{s.hero.kicker}</div>
            <h1 className="font-display text-white mt-4 animate-fade-up" style={{ fontSize: "clamp(2.2rem, 4.6vw, 3.3rem)", lineHeight: 1.06, animationDelay: "60ms" }}>
              {s.hero.title}
            </h1>
            <p className="text-base md:text-lg mt-5 max-w-xl animate-fade-up" style={{ color: "#AEBAD0", animationDelay: "120ms" }}>
              {s.hero.sub}
            </p>
            <div className="flex flex-wrap gap-3 mt-7 animate-fade-up" style={{ animationDelay: "180ms" }}>
              <Link href="/demo" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium" style={{ background: "#B8863F", color: "#0E1830" }}>
                Book a demo <ArrowRight size={16} />
              </Link>
              <a href="#lookup" className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-medium text-white" style={{ border: "1px solid #2E3E60" }}>
                Look up my SSVI score
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* What it is */}
      <section className="max-w-content mx-auto px-5 md:px-8 py-20 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          <Reveal>
            <div className="eyebrow">{s.what.title}</div>
            <p className="font-display text-ink mt-4" style={{ fontSize: "clamp(1.4rem, 2.4vw, 1.9rem)", lineHeight: 1.3 }}>
              {s.what.body}
            </p>
          </Reveal>
          <Reveal delay={80}>
            <div className="grid sm:grid-cols-2 gap-3">
              {s.points.map((p) => (
                <div key={p.h} className="rounded-2xl p-5 bg-white" style={{ border: "1px solid #E3E7ED" }}>
                  <Check size={17} color="#2E9E62" />
                  <h3 className="font-display text-base text-ink mt-3">{p.h}</h3>
                  <p className="text-sm text-slate mt-1.5">{p.p}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Lookup band */}
      <section id="lookup" style={{ background: "#0E1830" }}>
        <div className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <Reveal>
              <div className="eyebrow" style={{ color: "#E8CFA0" }}>Try it now</div>
              <h2 className="font-display text-white mt-3" style={{ fontSize: "clamp(1.7rem, 3vw, 2.3rem)", lineHeight: 1.1 }}>
                Start with your published SSVI score.
              </h2>
              <p className="mt-4 max-w-md" style={{ color: "#93A0B8" }}>
                Every capability in Connect Shield connects back to your SSVI. Look yours up free, then book a demo to see the full breakdown and your {s.term} analysis together.
              </p>
              <div className="flex items-center gap-2 mt-5 text-[12px] font-mono" style={{ color: "#7C8AA8" }}>
                <ShieldCheck size={14} color="#B8863F" /> HIPAA-compliant · Public CMS data
              </div>
            </Reveal>
            <Reveal delay={80}>
              <CCNTeaser />
            </Reveal>
          </div>
        </div>
      </section>

      {/* FAQ (optional per solution) */}
      {faqs.length > 0 && (
        <section className="max-w-content mx-auto px-5 md:px-8 py-20 md:py-24">
          <Reveal>
            <div className="eyebrow">Common question</div>
            <div className="mt-6 max-w-3xl">
              {faqs.map((f) => (
                <div key={f.q} className="py-5" style={{ borderTop: "1px solid #E3E7ED" }}>
                  <h3 className="font-display text-lg text-ink">{f.q}</h3>
                  <p className="text-slate text-sm mt-2">{f.a}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* Related */}
      <section style={{ background: "#EEF0F4" }}>
        <div className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-20">
          <div className="eyebrow">Explore more</div>
          <div className="grid md:grid-cols-3 gap-3 mt-6">
            {related.map((r) => (
              <Link key={r.slug} href={`/${r.slug}`} className="group rounded-2xl p-6 bg-white transition-colors hover:border-gold" style={{ border: "1px solid #E3E7ED" }}>
                <div className="font-mono text-[11px] uppercase tracking-wider" style={{ color: "#B8863F" }}>{r.term}</div>
                <div className="font-display text-lg text-ink mt-2 flex items-center gap-2">
                  {r.nav} <ArrowRight size={15} className="text-slate-mute transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
