"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, ChevronDown, Menu, X } from "lucide-react";
import { SITE, NAV } from "@/lib/site";
import { SOLUTIONS } from "@/lib/solutions";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [solOpen, setSolOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="sticky top-0 z-50 transition-shadow"
      style={{
        background: "rgba(14,24,48,0.95)",
        backdropFilter: "saturate(140%) blur(10px)",
        borderBottom: "1px solid #243354",
        boxShadow: scrolled ? "0 8px 30px rgba(0,0,0,0.28)" : "none",
      }}
    >
      <div className="max-w-content mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#B8863F" }}>
            <ShieldCheck size={17} color="#0E1830" />
          </span>
          <span className="font-display text-lg text-white leading-none">{SITE.name}</span>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <div className="relative" onMouseEnter={() => setSolOpen(true)} onMouseLeave={() => setSolOpen(false)}>
            <button className="flex items-center gap-1 px-3 py-2 text-sm text-slate-faint hover:text-white transition-colors">
              Solutions <ChevronDown size={14} />
            </button>
            {solOpen && (
              <div
                className="absolute left-1/2 -translate-x-1/2 top-full pt-2"
              >
                <div className="w-[520px] grid grid-cols-2 gap-1 p-3 rounded-2xl" style={{ background: "#14213D", border: "1px solid #243354", boxShadow: "0 24px 60px rgba(0,0,0,0.4)" }}>
                  {SOLUTIONS.map((s) => (
                    <Link key={s.slug} href={`/${s.slug}`} className="px-3 py-2 rounded-lg hover:bg-navy-raised transition-colors">
                      <div className="text-sm text-white">{s.nav}</div>
                      <div className="text-[11px] text-slate-faint truncate">{s.term}</div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
          {NAV.filter((n) => n.label !== "Solutions").map((n) => (
            <Link key={n.href} href={n.href} className="px-3 py-2 text-sm text-slate-faint hover:text-white transition-colors">
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <a href={SITE.appUrl} className="px-3.5 py-2 text-sm text-slate-faint hover:text-white transition-colors">
            Sign in
          </a>
          <Link href="/demo" className="px-4 py-2 text-sm font-medium rounded-lg" style={{ background: "#B8863F", color: "#0E1830" }}>
            Book a demo
          </Link>
        </div>

        <button className="md:hidden text-white p-1" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="md:hidden px-5 pb-5 pt-1" style={{ background: "#0E1830", borderBottom: "1px solid #243354" }}>
          <div className="eyebrow mt-3 mb-2">Solutions</div>
          <div className="grid grid-cols-2 gap-1 mb-3">
            {SOLUTIONS.map((s) => (
              <Link key={s.slug} href={`/${s.slug}`} onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg text-sm text-slate-faint hover:text-white" style={{ background: "#14213D" }}>
                {s.nav}
              </Link>
            ))}
          </div>
          {NAV.filter((n) => n.label !== "Solutions").map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className="block px-1 py-2.5 text-sm text-slate-faint">
              {n.label}
            </Link>
          ))}
          <div className="flex gap-2 mt-3">
            <a href={SITE.appUrl} className="flex-1 text-center px-4 py-2.5 text-sm rounded-lg text-white" style={{ border: "1px solid #243354" }}>
              Sign in
            </a>
            <Link href="/demo" onClick={() => setOpen(false)} className="flex-1 text-center px-4 py-2.5 text-sm font-medium rounded-lg" style={{ background: "#B8863F", color: "#0E1830" }}>
              Book a demo
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
