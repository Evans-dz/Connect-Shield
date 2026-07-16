"use server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/auth/server";

// Sign in with email + password.
export async function signIn(prevState, formData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  if (!email || !password) return { error: "Enter your email and password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Incorrect email or password." };

  // Step 4 will replace this with a redirect to the user's clinic subdomain.
  redirect("/dashboard");
}

// Sign out.
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// Send a password-reset email. Always reports success (never reveals whether an
// account exists) to avoid leaking which emails are registered.
export async function requestPasswordReset(prevState, formData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { error: "Enter your email." };

  const h = await headers();
  const origin = h.get("origin") || `https://${h.get("host")}`;

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  return { sent: true };
}

// Set a new password (used on /reset-password after the email link established a session).
export async function updatePassword(prevState, formData) {
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (password.length < 10) return { error: "Password must be at least 10 characters." };
  if (password !== confirm) return { error: "The two passwords don't match." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Your reset link has expired. Request a new one." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Could not update your password. Request a new reset link and try again." };

  redirect("/dashboard");
}
