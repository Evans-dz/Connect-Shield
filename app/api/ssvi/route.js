import { NextResponse } from "next/server";
import { createClient } from "@/lib/auth/server";

export const runtime = "nodejs";

// Returns the full ssvi_scores row for a CCN. Auth-gated so the complete
// breakdown is only available to signed-in clinics (the marketing site uses the
// separate, gated /api/ssvi-lookup for its teaser).
export async function GET(req) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ccn = (req.nextUrl.searchParams.get("ccn") || "").trim().toUpperCase();
  if (!ccn) return NextResponse.json({ error: "CCN required" }, { status: 400 });

  const { data, error } = await supabase
    .from("ssvi_scores")
    .select("*")
    .eq("ccn", ccn)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data);
}
