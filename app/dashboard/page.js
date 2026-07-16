import { redirect } from "next/navigation";
import { createClient } from "@/lib/auth/server";
import { signOut } from "@/app/auth/actions";
import ConnectShield from "./ConnectShieldApp";

export const metadata = { title: "Dashboard", robots: { index: false } };

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

  return <ConnectShield initialCcn={ccn} clinicName={clinicName} signOutAction={signOut} />;
}
