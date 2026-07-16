import { redirect } from "next/navigation";
import { createClient } from "@/lib/auth/server";
import AuthShell from "@/components/AuthShell";
import ResetForm from "./ResetForm";

export const metadata = { title: "Set a new password", robots: { index: false } };

export default async function ResetPasswordPage() {
  // The email link's callback established a session before landing here.
  // If there's no session, the link was invalid or expired.
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/forgot-password");

  return (
    <AuthShell title="Set a new password" subtitle="Choose a strong password of at least 10 characters.">
      <ResetForm />
    </AuthShell>
  );
}
