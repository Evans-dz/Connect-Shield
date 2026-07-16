import { redirect } from "next/navigation";
import { createClient } from "@/lib/auth/server";
import AuthShell from "@/components/AuthShell";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <AuthShell
      title="Sign in to your portal"
      subtitle="Enter the credentials your Connect Shield onboarding email provided."
      footer={<>Need access? <a href="/demo" style={{ color: "#B8863F" }}>Book a demo</a></>}
    >
      <LoginForm />
    </AuthShell>
  );
}
