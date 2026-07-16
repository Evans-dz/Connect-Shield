import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

// Refreshes the Supabase session on every navigation and syncs the auth cookies.
// Step 2 only keeps the session fresh — route protection and per-clinic subdomain
// routing are layered on top of this in Step 4. Written defensively so an auth
// hiccup can never take the public marketing site down.
export async function updateSession(request) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return supabaseResponse; // auth not configured — don't block the site

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: do not run other code between createServerClient and getUser().
  try {
    await supabase.auth.getUser();
  } catch {
    // Transient auth error — keep the site serving.
  }

  return supabaseResponse;
}
