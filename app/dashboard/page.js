import { redirect } from "next/navigation";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/auth/server";
import { signOut } from "@/app/auth/actions";

export const metadata = { title: "Dashboard", robots: { index: false } };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Read the profile + clinic (may be empty until assigned in Step 5). RLS ensures
  // a user can only ever read their own profile and their own clinic.
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, clinic_id, role")
    .eq("id", user.id)
    .maybeSingle();

  let clinic = null;
  if (profile?.clinic_id) {
    const { data } = await supabase
      .from("clinics")
      .select("name, slug, plan")
      .eq("id", profile.clinic_id)
      .maybeSingle();
    clinic = data;
  }

  return (
    <section className="hero-navy relative overflow-hidden" style={{ minHeight: "calc(100vh - 4rem)" }}>
      <div className="index-field absolute inset-0" aria-hidden="true" />
      <div className="relative flex items-center justify-center px-5" style={{ minHeight: "calc(100vh - 4rem)" }}>
        <div className="w-full" style={{ maxWidth: 520 }}>
          <div className="rounded-2xl p-8" style={{ background: "#FFFFFF", border: "1px solid #E3E7ED", boxShadow: "0 24px 60px rgba(0,0,0,0.3)" }}>
            <div className="flex items-center gap-2.5 mb-6">
              <span className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "#B8863F" }}>
                <ShieldCheck size={17} color="#0E1830" />
              </span>
              <span className="font-display text-lg" style={{ color: "#16202E" }}>Connect Shield</span>
            </div>

            <div className="flex items-center gap-2">
              <CheckCircle2 size={18} color="#2E9E62" />
              <span className="font-display text-xl" style={{ color: "#16202E" }}>You're signed in.</span>
            </div>
            <p className="text-sm mt-2" style={{ color: "#64708A" }}>
              This is a temporary placeholder. Your real compliance dashboard gets folded in behind this login in a later step.
            </p>

            <div className="mt-6 rounded-xl p-4 space-y-2" style={{ background: "#F5F6F8" }}>
              <Row label="Signed in as" value={user.email} />
              <Row label="Clinic" value={clinic ? `${clinic.name} (${clinic.slug})` : "Not yet assigned"} />
              <Row label="Plan" value={clinic ? clinic.plan : "—"} />
              <Row label="Role" value={profile?.role || "—"} />
            </div>

            <form action={signOut} className="mt-6">
              <button type="submit"
                className="w-full rounded-xl py-3 text-sm font-medium"
                style={{ background: "#14213D", color: "#F3F5F8" }}>
                Sign out
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[11px] font-mono uppercase tracking-wide" style={{ color: "#8992A3" }}>{label}</span>
      <span className="text-sm font-mono text-right" style={{ color: "#16202E" }}>{value}</span>
    </div>
  );
}
