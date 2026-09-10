import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { ccn, expiresInDays? } -> { ok, token, url, expires_at }
//
// Creates a shareable read-only snapshot link for a CCN. Auth required — the
// same session-cookie pattern as /api/ssvi. The insert goes through the USER'S
// client, so RLS on share_links enforces created_by = auth.uid().
//
// The link shows only published CMS data for the CCN (see /s/[token]). That is
// why any signed-in user may create a link for any CCN: it is the pre-demo
// "here is your score" page, generated for prospects as well as for the
// clinic's own CCN.
//
// Requires the 0001_share_links.sql migration to have been run.

const CCN_RE = /^[A-Z0-9]{5,10}$/;
const DEFAULT_EXPIRY_DAYS = 15;

export async function POST(req) {
  const supabase = await createClient();
  const { data: { user } = {} } = await supabase.auth.getUser().catch(() => ({ data: {} }));
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const ccn = (body.ccn || "").trim().toUpperCase();
  if (!CCN_RE.test(ccn)) {
    return NextResponse.json({ error: "A valid CCN is required." }, { status: 400 });
  }

  const days = Math.min(365, Math.max(1, Number(body.expiresInDays) || DEFAULT_EXPIRY_DAYS));
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

  // 144 bits of randomness, URL-safe. Unguessable; uniqueness enforced by the DB.
  const token = randomBytes(18).toString("base64url");

  const { error } = await supabase.from("share_links").insert({
    token,
    ccn,
    created_by: user.id,
    expires_at: expiresAt,
  });

  if (error) {
    console.error("[share] insert failed:", error.message);
    return NextResponse.json({ error: "Could not create the link. Try again." }, { status: 500 });
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL ||
    req.headers.get("origin") ||
    `https://${req.headers.get("host")}`;

  return NextResponse.json({
    ok: true,
    token,
    url: `${origin.replace(/\/$/, "")}/s/${token}`,
    expires_at: expiresAt,
  });
}
