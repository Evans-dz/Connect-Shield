import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";

const ROOT_DOMAIN = "connect-shield.com";
const cookieDomain = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;

// Subdomains that are NOT clinics — served as the normal (apex) site.
const RESERVED = new Set(["www", "staging", "app", "api", "admin", "mail", "status"]);

// Extract the subdomain label. "demo.connect-shield.com" -> "demo".
// Apex, localhost, and *.vercel.app previews -> null (treated as the main site).
function getSubdomain(hostname) {
  if (hostname === ROOT_DOMAIN) return null;
  if (hostname.endsWith("." + ROOT_DOMAIN)) {
    return hostname.slice(0, -(ROOT_DOMAIN.length + 1));
  }
  return null;
}

export async function updateSession(request) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return response; // auth not configured — never block the site

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
    ...(cookieDomain ? { cookieOptions: { domain: cookieDomain } } : {}),
  });

  // Refresh the session — must run immediately after client creation.
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // transient auth error — keep serving
  }

  // ---------- Subdomain routing ----------
  const hostname = (request.headers.get("host") || "").split(":")[0];
  const sub = getSubdomain(hostname);

  // Apex / www / reserved / previews / localhost -> normal site, no clinic routing.
  if (!sub || RESERVED.has(sub)) return response;

  // Helpers that preserve the refreshed auth cookies on redirect/rewrite.
  const carryCookies = (res) => {
    response.cookies.getAll().forEach((c) => res.cookies.set(c.name, c.value, c));
    return res;
  };
  const redirectTo = (absoluteUrl) => carryCookies(NextResponse.redirect(absoluteUrl));
  const rewriteTo = (pathname) => {
    const u = request.nextUrl.clone();
    u.pathname = pathname;
    return carryCookies(NextResponse.rewrite(u));
  };

  // Does this subdomain map to a real clinic?
  let clinic = null;
  try {
    const { data } = await supabase.rpc("clinic_by_slug", { p_slug: sub });
    clinic = Array.isArray(data) ? data[0] : data;
  } catch {}

  if (!clinic) {
    // Unknown subdomain (typo, unassigned) -> marketing homepage.
    return redirectTo(`https://${ROOT_DOMAIN}`);
  }

  // Logged out on a clinic subdomain -> main-site login.
  if (!user) {
    return redirectTo(`https://${ROOT_DOMAIN}/login`);
  }

  // Which clinic does this user belong to?
  let myClinicId = null;
  try {
    const { data } = await supabase.rpc("current_clinic_id");
    myClinicId = data;
  } catch {}

  if (myClinicId && myClinicId === clinic.id) {
    // Authorized: serve the dashboard at the subdomain root; pass other paths through.
    if (request.nextUrl.pathname === "/") return rewriteTo("/dashboard");
    return response;
  }

  // Logged in, but this portal isn't theirs -> access denied.
  return rewriteTo("/access-denied");
}
