import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { SITE } from "@/lib/site";
import { SOLUTIONS } from "@/lib/solutions";

export default function Footer() {
  return (
    <footer style={{ background: "#0E1830" }}>
      <div className="max-w-content mx-auto px-5 md:px-8 py-14">
        <div className="grid md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#B8863F" }}>
                <ShieldCheck size={17} color="#0E1830" />
              </span>
              <span className="font-display text-lg text-white">{SITE.name}</span>
            </div>
            <p className="text-sm mt-4 max-w-xs" style={{ color: "#93A0B8" }}>
              {SITE.tagline}. Built for hospice leadership, on public CMS data, with zero patient information.
            </p>
          </div>

          <div>
            <div className="eyebrow mb-4">Solutions</div>
            <ul className="space-y-2.5">
              {SOLUTIONS.slice(0, 4).map((s) => (
                <li key={s.slug}>
                  <Link href={`/${s.slug}`} className="text-sm hover:text-white transition-colors" style={{ color: "#93A0B8" }}>
                    {s.nav}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="eyebrow mb-4">More</div>
            <ul className="space-y-2.5">
              {SOLUTIONS.slice(4).map((s) => (
                <li key={s.slug}>
                  <Link href={`/${s.slug}`} className="text-sm hover:text-white transition-colors" style={{ color: "#93A0B8" }}>
                    {s.nav}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="eyebrow mb-4">Company</div>
            <ul className="space-y-2.5">
              <li><Link href="/pricing" className="text-sm hover:text-white transition-colors" style={{ color: "#93A0B8" }}>Pricing</Link></li>
              <li><Link href="/demo" className="text-sm hover:text-white transition-colors" style={{ color: "#93A0B8" }}>Book a demo</Link></li>
              <li><a href={SITE.appUrl} className="text-sm hover:text-white transition-colors" style={{ color: "#93A0B8" }}>Sign in</a></li>
              <li><a href={`mailto:${SITE.email}`} className="text-sm hover:text-white transition-colors" style={{ color: "#93A0B8" }}>{SITE.email}</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3" style={{ borderTop: "1px solid #243354" }}>
          <div className="text-[12px] font-mono" style={{ color: "#5A6B8C" }}>
            © {new Date().getFullYear()} {SITE.name} · {SITE.domain}
          </div>
          <div className="text-[12px] font-mono max-w-xl" style={{ color: "#5A6B8C" }}>
            SSVI figures reproduced from the CMS FY2027 Hospice Wage Index proposed rule (CMS-1851-P), which is not finalized. Connect Shield is not affiliated with CMS and does not determine fraud, waste, or abuse.
          </div>
        </div>
      </div>
    </footer>
  );
}
