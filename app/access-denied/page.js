import { ShieldAlert } from "lucide-react";
import { signOut } from "@/app/auth/actions";

export const metadata = { title: "Access denied", robots: { index: false } };

export default function AccessDeniedPage() {
  return (
    <section className="hero-navy relative overflow-hidden" style={{ minHeight: "calc(100vh - 4rem)" }}>
      <div className="index-field absolute inset-0" aria-hidden="true" />
      <div className="relative flex items-center justify-center px-5" style={{ minHeight: "calc(100vh - 4rem)" }}>
        <div className="w-full text-center" style={{ maxWidth: 440 }}>
          <div className="rounded-2xl p-8" style={{ background: "#FFFFFF", border: "1px solid #E3E7ED", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto" style={{ background: "#FDECEA" }}>
              <ShieldAlert size={24} color="#D14343" />
            </div>
            <h1 className="font-display mt-4" style={{ fontSize: "1.6rem", color: "#16202E" }}>Access denied</h1>
            <p className="text-sm mt-2" style={{ color: "#64708A" }}>
              You're signed in, but this portal belongs to a different clinic. If you think this is a mistake, contact your Connect Shield administrator.
            </p>
            <form action={signOut} className="mt-6">
              <button type="submit" className="w-full rounded-xl py-3 text-sm font-medium" style={{ background: "#14213D", color: "#F3F5F8" }}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
