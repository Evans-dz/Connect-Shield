"use client";
import { createBrowserClient } from "@supabase/ssr";

// Cookie domain (e.g. ".connect-shield.com") lets the login session carry across
// every clinic subdomain. Set NEXT_PUBLIC_COOKIE_DOMAIN in Production only.
const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    cookieDomain ? { cookieOptions: { domain: cookieDomain } } : undefined
  );
}
