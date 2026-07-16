import { NextResponse } from "next/server";
import { createClient } from "@/lib/auth/server";

// Supabase redirects password-reset (and future magic-link) emails here with a
// one-time code. We exchange it for a session, then forward the user on.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/login?error=link`);
}
