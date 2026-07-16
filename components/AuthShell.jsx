import Link from "next/link";
import { ShieldCheck } from "lucide-react";

// Shared centered card for login / forgot / reset pages.
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <section className="hero-navy relative overflow-hidden" style={{ minHeight: "calc(100vh - 4rem)" }}>
      <div className="index-field absolute inset-0" aria-hidden="true" />
      <div className="relative flex items-center justify-center px-5" style={{ minHeight: "calc(100vh - 4rem)" }}>
        <div className="w-full" style={{ maxWidth: 420 }}>
          <div className="rounded-2xl p-8" style={{ background: "#FFFFFF", border: "1px solid #E3E7ED", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
            <Link href="/" className="flex items-center gap-2.5 justify-center mb-6">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#B8863F" }}>
                <ShieldCheck size={17} color="#0E1830" />
              </span>
              <span className="font-display text-lg" style={{ color: "#16202E" }}>Connect Shield</span>
            </Link>
            <h1 className="font-display text-center" style={{ fontSize: "1.6rem", color: "#16202E", lineHeight: 1.15 }}>{title}</h1>
            {subtitle && <p className="text-sm text-center mt-2" style={{ color: "#64708A" }}>{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
          {footer && <div className="text-center mt-5 text-sm" style={{ color: "#93A0B8" }}>{footer}</div>}
        </div>
      </div>
    </section>
  );
}
