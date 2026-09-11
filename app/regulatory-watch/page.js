import Link from "next/link";
import { ArrowRight, Clock, ExternalLink } from "lucide-react";
import Reveal from "@/components/Reveal";
import { SITE } from "@/lib/site";
import { supabasePublic, supabaseService } from "@/lib/supabase";

// Public, indexable mirror of the dashboard's Regulatory Watch feed.
// Re-renders hourly so newly published updates appear without a redeploy.
export const revalidate = 3600;

export const metadata = {
  title: "Hospice Regulatory Watch — CMS Rules, Tracked & Explained",
  description:
    "Hospice regulatory updates, tracked: every CMS hospice rule from the Federal Register, reviewed by a human and explained in plain language — the FY2027 final rule, PEPPER's return, and HOPE deadlines.",
  alternates: { canonical: `${SITE.url}/regulatory-watch` },
};

// ── Live feed ────────────────────────────────────────────────────────────────
// Published rows only (status='published' is the human-reviewed, public-safe
// set — the same rows the client dashboard feed shows). reg_updates RLS only
// grants authenticated reads, so the anon client sees nothing — this server
// component reads with the service role instead (never exposed to the client)
// and the hard status filter keeps drafts/archived rows out. Any failure
// degrades to an honest empty state.
async function getPublishedUpdates() {
  const db = supabaseService() || supabasePublic();
  if (!db) return [];
  try {
    const { data, error } = await db
      .from("reg_updates")
      .select("id, severity, source, tag, published_date, title, summary, impact, source_url")
      .eq("status", "published")
      .order("published_date", { ascending: false })
      .limit(20);
    if (error || !Array.isArray(data)) return [];
    return data;
  } catch {
    return [];
  }
}

const severityColor = (s) => (s === "high" ? "#D14343" : s === "medium" ? "#C98A1F" : "#2E9E62");

function fmtDate(d) {
  if (!d) return null;
  const date = new Date(`${d}T00:00:00`);
  if (Number.isNaN(date.getTime())) return d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Card markup mirrors the dashboard's Regulatory Watch feed card, so a
// prospect on this page is seeing the real thing, not a marketing rendition.
function UpdateCard({ r }) {
  return (
    <article className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid #E3E7ED", boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {r.severity && (
            <span className="text-[10px] uppercase font-mono px-2 py-1 rounded" style={{ background: severityColor(r.severity) + "1A", color: severityColor(r.severity) }}>
              {r.severity} impact
            </span>
          )}
          <span className="text-[11px] font-mono" style={{ color: "#8992A3" }}>
            {r.source || "Federal Register"}
            {r.tag ? ` · ${r.tag}` : ""}
          </span>
        </div>
        {r.published_date && (
          <span className="text-[11px] font-mono flex items-center gap-1 shrink-0" style={{ color: "#8992A3" }}>
            <Clock size={11} aria-hidden="true" />
            {fmtDate(r.published_date)}
          </span>
        )}
      </div>
      <h3 className="mt-2 text-base font-display text-ink">{r.title}</h3>
      {r.summary && <p className="text-sm mt-1.5 text-slate">{r.summary}</p>}
      {r.impact && (
        <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: "#F5F6F8", color: "#16202E" }}>
          <span className="font-mono text-xs" style={{ color: "#B8863F" }}>What it means for you: </span>
          {r.impact}
        </div>
      )}
      {r.source_url && (
        <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-mono mt-3" style={{ color: "#B8863F" }}>
          View source <ExternalLink size={11} aria-hidden="true" />
        </a>
      )}
    </article>
  );
}

// ── Editorial: the standing rules ────────────────────────────────────────────
// Static and always rendered. Every fact here is verifiable at the cited
// source — no claims about what Connect Shield "caught", only what CMS did.
const RULES = [
  {
    tag: "Final rule · effective Oct 1, 2026",
    title: "FY2027 Hospice Wage Index final rule (CMS-1851-F)",
    body: "Issued July 30, 2026. Beyond the 2.3% payment update and the $36,174.75 aggregate cap amount, this is the rule that finalized the SSVI — CMS now publishes a Service and Spending Variation Index score for every US hospice. Your agency has a number whether you have looked it up or not.",
    source: {
      href: "https://www.federalregister.gov/documents/2026/08/03/2026-15686/medicare-program-fy-2027-hospice-wage-index-and-payment-rate-update-and-hospice-quality-reporting",
      label: "Federal Register, 91 FR 49118",
    },
    link: { href: "/ssvi", label: "Look up your SSVI score" },
  },
  {
    tag: "Report · relaunched Jun 2026",
    title: "PEPPER is back after a 2.5-year pause",
    body: "CMS resumed the hospice Program for Evaluating Payment Patterns Electronic Report in June 2026, ending a pause that began in early 2024. PEPPER benchmarks your billing against national percentiles on the target areas reviewers watch — long lengths of stay and live discharges among them. If nobody has pulled your report since 2023, that is the first move.",
    source: {
      href: "https://pepper.cbrpepper.org/faq.html",
      label: "PEPPER release schedule",
    },
    link: { href: "/pepper", label: "Read your PEPPER report" },
  },
  {
    tag: "Deadline · ongoing",
    title: "HOPE's 90% timely-submission threshold",
    body: "Since October 1, 2025, every required HOPE record — admission, update visits, discharge — must be accepted into iQIES within 30 days, at least 90% of the time. Miss the threshold and the penalty is a 4-percentage-point cut to your annual payment update. This one is not news; it is a standard your agency has to keep hitting every month.",
    source: {
      href: "https://www.cms.gov/files/document/hospice-timeliness-compliance-report-fact-sheet-jan-2026-508c.pdf-0",
      label: "CMS timeliness fact sheet",
    },
  },
];

const PIPELINE = [
  { step: "01", label: "Monitored", body: "Every CMS hospice rule, proposed rule, and notice pulled from the Federal Register weekly." },
  { step: "02", label: "Reviewed", body: "A human reads each document against the source before anything is published. No auto-posts." },
  { step: "03", label: "Pushed", body: "Cleared updates land in every client dashboard with a what-it-means-for-you note and a checklist." },
];

export default async function RegulatoryWatchPage() {
  const updates = await getPublishedUpdates();

  return (
    <>
      {/* Hero */}
      <section className="hero-navy relative overflow-hidden">
        <div className="index-field absolute inset-0" aria-hidden="true" />
        <div className="max-w-content mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-14 relative text-center">
          <div className="eyebrow justify-center animate-fade-up" style={{ color: "#E8CFA0" }}>Regulatory Watch</div>
          <h1 className="font-display text-white mt-4 animate-fade-up" style={{ fontSize: "clamp(2.2rem, 4.4vw, 3.2rem)", lineHeight: 1.06 }}>
            Never find out about a rule change late.
          </h1>
          <p className="text-base md:text-lg mt-5 max-w-2xl mx-auto animate-fade-up" style={{ color: "#AEBAD0", animationDelay: "80ms" }}>
            Connect Shield monitors the Federal Register for every CMS hospice rule, a human reviews each one, and the update lands in every client dashboard with a what-it-means-for-you note.
          </p>
          <div className="flex items-center justify-center gap-2 mt-6 text-[12px] font-mono animate-fade-up" style={{ color: "#7C8AA8", animationDelay: "140ms" }}>
            Federal Register · CMS · Human-reviewed
          </div>
        </div>
      </section>

      {/* How the pipeline works */}
      <section className="max-w-content mx-auto px-5 md:px-8 pt-16 md:pt-20">
        <div className="grid md:grid-cols-3 gap-4">
          {PIPELINE.map((p, i) => (
            <Reveal key={p.step} delay={i * 60}>
              <div className="rounded-2xl p-5 h-full" style={{ background: "#FFFFFF", border: "1px solid #E3E7ED" }}>
                <div className="flex items-center gap-2.5">
                  <span className="text-[11px] font-mono" style={{ color: "#B8863F" }}>{p.step}</span>
                  <span className="font-display text-ink">{p.label}</span>
                </div>
                <p className="text-sm mt-2 text-slate">{p.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Live feed */}
      <section className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-20">
        <Reveal>
          <div className="eyebrow">Latest reviewed updates</div>
          <h2 className="font-display text-ink mt-3" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
            Straight from the review queue.
          </h2>
        </Reveal>

        {updates.length > 0 ? (
          <div className="mt-8 max-w-3xl space-y-4">
            {updates.map((r, i) => (
              <Reveal key={r.id ?? `${r.source_url}-${i}`} delay={(i % 3) * 60}>
                <UpdateCard r={r} />
              </Reveal>
            ))}
          </div>
        ) : (
          <Reveal>
            <div className="mt-8 max-w-3xl rounded-2xl p-6" style={{ background: "#FFFFFF", border: "1px solid #E3E7ED" }}>
              <p className="text-sm text-ink">
                The reviewed feed appears in the client dashboard — each update published there carries a plain-language summary, an impact note, and an action checklist your team can work through.
              </p>
              <p className="text-[12px] font-mono mt-3" style={{ color: "#8992A3" }}>
                Published updates surface here as the reviewer clears them.
              </p>
            </div>
          </Reveal>
        )}
      </section>

      {/* Editorial — the standing rules */}
      <section style={{ background: "#EEF0F4" }}>
        <div className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-24">
          <Reveal>
            <div className="eyebrow">The current landscape</div>
            <h2 className="font-display text-ink mt-3 max-w-2xl" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
              The rules that matter right now.
            </h2>
            <p className="text-slate mt-3 max-w-xl">
              Three things every hospice leadership team should have on the whiteboard this quarter — each verifiable at the source.
            </p>
          </Reveal>
          <div className="mt-8 grid lg:grid-cols-3 gap-4 items-stretch">
            {RULES.map((rule, i) => (
              <Reveal key={rule.title} delay={i * 60} className="h-full">
                <article className="rounded-2xl p-6 h-full flex flex-col" style={{ background: "#FFFFFF", border: "1px solid #E3E7ED", boxShadow: "0 1px 3px rgba(16,24,40,0.04)" }}>
                  <div className="text-[10px] uppercase font-mono px-2 py-1 rounded self-start" style={{ background: "#14213D", color: "#F3F5F8" }}>
                    {rule.tag}
                  </div>
                  <h3 className="font-display text-ink text-lg mt-3">{rule.title}</h3>
                  <p className="text-sm mt-2 text-slate flex-1">{rule.body}</p>
                  <div className="mt-4 flex flex-col gap-2">
                    <a href={rule.source.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-mono" style={{ color: "#B8863F" }}>
                      {rule.source.label} <ExternalLink size={11} aria-hidden="true" />
                    </a>
                    {rule.link && (
                      <Link href={rule.link.href} className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: "#B8863F" }}>
                        {rule.link.label} <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
          <p className="text-[12px] font-mono mt-6 max-w-3xl" style={{ color: "#8992A3" }}>
            Informational only, built from published CMS and Federal Register documents. Not legal advice, and not a compliance determination — decisions about your agency remain yours.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-content mx-auto px-5 md:px-8 py-16 md:py-20 text-center">
        <Reveal>
          <h2 className="font-display text-ink" style={{ fontSize: "clamp(1.6rem, 3vw, 2.2rem)", lineHeight: 1.1 }}>
            See Regulatory Watch inside your own dashboard.
          </h2>
          <p className="text-slate mt-3 max-w-xl mx-auto">
            A 20-minute demo with your CCN loaded — the reviewed feed, the action checklists, and your published SSVI score on one screen.
          </p>
          <Link
            href="/demo"
            className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 mt-7 text-sm font-medium"
            style={{ background: "#B8863F", color: "#0E1830" }}
          >
            Book a demo <ArrowRight size={15} aria-hidden="true" />
          </Link>
          <p className="text-[12px] font-mono mt-6" style={{ color: "#8992A3" }}>
            Questions first? <Link href="/faq" className="underline underline-offset-2" style={{ color: "#B8863F" }}>Read the FAQ</Link>
          </p>
        </Reveal>
      </section>
    </>
  );
}
