import { redirect } from "next/navigation";
import { createClient } from "@/lib/auth/server";
import { signOut } from "@/app/auth/actions";
import ConnectShield from "./ConnectShieldApp";

export const metadata = { title: "Dashboard", robots: { index: false } };

// The demo clinic (Demo Hospice LLC). On the demo we DON'T auto-load a locked CCN,
// so the CCN lookup box shows and you can type any prospect's CCN to pull their
// live SSVI. Every real clinic still auto-loads its own CCN as normal.
const DEMO_CLINIC_ID = "1e4e1e80-94bf-4dcd-bf3d-7920b5246a16";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Resolve the user's clinic and its primary CCN (RLS restricts to their own).
  const { data: profile } = await supabase
    .from("profiles")
    .select("clinic_id")
    .eq("id", user.id)
    .maybeSingle();

  let clinicName = null;
  let ccn = null;
  if (profile?.clinic_id) {
    const { data: clinic } = await supabase
      .from("clinics")
      .select("name")
      .eq("id", profile.clinic_id)
      .maybeSingle();
    clinicName = clinic?.name || null;

    const { data: ccns } = await supabase
      .from("clinic_ccns")
      .select("ccn, is_primary")
      .eq("clinic_id", profile.clinic_id)
      .order("is_primary", { ascending: false });
    ccn = ccns?.[0]?.ccn || null;
  }

  // On the demo clinic, don't lock a CCN — show the lookup so any CCN can be entered.
  const isDemo = profile?.clinic_id === DEMO_CLINIC_ID;
  const initialCcn = isDemo ? null : ccn;

  return (
    <ConnectShield
      initialCcn={initialCcn}
      clinicName={clinicName}
      clinicId={profile?.clinic_id || null}
      signOutAction={signOut}
    />
  );
}
