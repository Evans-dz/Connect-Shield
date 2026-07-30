import { updateSession } from "@/lib/auth/middleware";

// Runs before every page/route (except static assets and public SEO pages).
// Refreshes the auth session and resolves the clinic subdomain.
export async function middleware(request) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // All paths except Next internals, static image files, and the public
    // SSVI lookup pages (no auth needed — skipping avoids a Supabase call per hit)
    "/((?!_next/static|_next/image|favicon.ico|hospice|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
