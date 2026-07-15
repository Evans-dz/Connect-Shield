import { NextResponse } from "next/server";
import { supabasePublic, riskFromScore } from "@/lib/supabase";

// Public teaser lookup. Deliberately returns ONLY the total score, risk band,
// and year-over-year delta — never the individual measure flags. The gating is
// enforced here on the server, not just hidden in the UI.
export async function GET(req) {
  const ccn = (req.nextUrl.searchParams.get("ccn") || "").trim().toUpperCase();
  if (!ccn) return NextResponse.json({ error: "Missing CCN" }, { status: 400 });

  const supabase = supabasePublic();
  if (!supabase) return NextResponse.json({ error: "Lookup unavailable" }, { status: 503 });

  const { data, error } = await supabase
    .from("ssvi_scores")
    .select("ccn, hospice_name, fy2025_total_ssvi, fy2024_total_ssvi")
    .eq("ccn", ccn)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const has2025 = data.fy2025_total_ssvi != null;
  const year = has2025 ? 2025 : 2024;
  const total = has2025 ? data.fy2025_total_ssvi : data.fy2024_total_ssvi;
  if (total == null) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const risk = riskFromScore(total);
  return NextResponse.json({
    ccn: data.ccn,
    hospice_name: data.hospice_name,
    year,
    total,
    risk: risk.label,
    tone: risk.tone,
    priorYear: has2025 ? 2024 : null,
    priorTotal: has2025 ? data.fy2024_total_ssvi : null,
    // Note: measure-level flags are intentionally omitted. Sign in for the full breakdown.
  });
}
