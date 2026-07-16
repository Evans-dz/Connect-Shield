import { updateSession } from "@/lib/auth/middleware";

// Runs before every page/route (except static assets). For now it only refreshes
// the auth session. Step 4 expands this to resolve the clinic subdomain and guard
// the dashboard.
export async function middleware(request) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // All paths except Next internals and static image files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
