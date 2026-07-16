"use client";
import { createBrowserClient } from "@supabase/ssr";

// Supabase client for use in Client Components (browser). Reads the public
// URL + anon key. RLS is what protects data — the anon key is safe in the browser.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
