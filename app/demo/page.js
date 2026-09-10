import { Check } from "lucide-react";
import Reveal from "@/components/Reveal";
import DemoForm from "@/components/DemoForm";
import { SITE } from "@/lib/site";

export const metadata = {
  title: "Book a Demo — Hospice Compliance Intelligence",
  description:
    "Book a Connect Shield demo — we pull your CCN live on the call and walk your team through your SSVI score and full compliance picture. Zero PHI stored.",
  alternates: { canonical: `${SITE.url}/demo` },
};

const POINTS = [
  "See your published SSVI score and all nine measures live",
  "Understand exactly which billing patterns are driving your number",
  "Get your CAP exposure and clawback risk calculated on the spot",
  "Walk away with a prioritized list of what to fix first",
];

// Query params are display text only — never rendered as HTML. Strip angle
// brackets, cap lengths, and ignore anything that isn't a plain string.
function cleanParam(v, max) {
  if (typeof v !== "string") return "";
  return v.replace(/[<>]/g, "").trim().slice(0, max);
}

export default function Demo({ searchParams }) {
  const ccn = cleanParam(searchParams?.ccn, 20);
  const agency = cleanParam(searchParams?.agency, 120);
  const src = searchParams?.src === "claim" ? "claim" : "";
  const claiming = Boolean(ccn || agency);

  const headline = claiming
    ? `Claiming ${agency || "your hospice"}?`
    : "See your whole compliance picture in 20 minutes.";
  const sub = claiming
    ? "Book the walkthrough — we pull your full breakdown live on the call. Pricing follows the demo."
    : "Book the demo — we pull your CCN live on the call and show you exactly what CMS sees. Pricing follows the demo.";

  return (
    <>
      <section className="hero-navy relative overflow-hidden">
        <div className="index-field absolute inset-0" aria-hidden="true" />
        <div className="max-w-content mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-20 md:pb-28 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <div>
              <div className="eyebrow animate-fade-up" style={{ color: "#E8CFA0" }}>Book a demo</div>
              <h1 className="font-display text-white mt-4 animate-fade-up" style={{ fontSize: "clamp(2.2rem, 4.4vw, 3.2rem)", lineHeight: 1.06 }}>
                {headline}
              </h1>
              <p className="text-base md:text-lg mt-5 max-w-md animate-fade-up" style={{ color: "#AEBAD0", animationDelay: "80ms" }}>
                {sub}
              </p>
              <ul className="mt-7 space-y-3 animate-fade-up" style={{ animationDelay: "140ms" }}>
                {POINTS.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm" style={{ color: "#D4DBE8" }}>
                    <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#1E2C4E" }}>
                      <Check size={12} color="#E8CFA0" />
                    </span>
                    {p}
                  </li>
                ))}
              </ul>
              <div className="mt-8 text-[12px] font-mono" style={{ color: "#7C8AA8" }}>
                Prefer email? {SITE.email}
              </div>
            </div>

            <Reveal>
              <DemoForm initialHospice={agency} initialCcn={ccn} src={src} />
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
