import { NextResponse } from "next/server";
import { supabasePublic, riskFromScore } from "@/lib/supabase";

// Public teaser lookup. Deliberately returns ONLY the total score, risk band,
// year-over-year delta, and AGGREGATE counts (how many utilization flags, the
// spending sub-score, national percentile) — never the individual measure
// flags. The gating is enforced here on the server, not just hidden in the UI.

// The 8 SSVI utilization measures. Each flag is worth exactly 1 point, so the
// count of true flags equals fy{year}_utilization_score.
const UTILIZATION_FLAGS = [
  "last_two_days",
  "live_discharge",
  "los_180",
  "no_chc_gip",
  "nursing_facility",
  "return_7days",
  "sn_minutes",
  "weekend_visits",
];

const UTILIZATION_MAX = UTILIZATION_FLAGS.length; // 8
const SPENDING_MAX = 8; // spending + utilization = total 0-16

function flagColumns(year) {
  return UTILIZATION_FLAGS.map((f) => `fy${year}_${f}`);
}

function countFlags(row, year) {
  let n = 0;
  for (const col of flagColumns(year)) {
    if (row[col] === true) n++;
  }
  return n;
}

const SELECT_COLUMNS = [
  "ccn",
  "hospice_name",
  "fy2025_total_ssvi",
  "fy2024_total_ssvi",
  "fy2025_spending_score",
  "fy2024_spending_score",
  "fy2025_utilization_score",
  "fy2024_utilization_score",
  ...flagColumns(2025),
  ...flagColumns(2024),
].join(", ");

export async function GET(req) {
  const ccn = (req.nextUrl.searchParams.get("ccn") || "").trim().toUpperCase();
  if (!ccn) return NextResponse.json({ error: "Missing CCN" }, { status: 400 });

  const supabase = supabasePublic();
  if (!supabase) return NextResponse.json({ error: "Lookup unavailable" }, { status: 503 });

  const { data, error } = await supabase
    .from("ssvi_scores")
    .select(SELECT_COLUMNS)
    .eq("ccn", ccn)
    .maybeSingle();

  if (error) return NextResponse.json({ error: "Lookup failed" }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const has2025 = data.fy2025_total_ssvi != null;
  const year = has2025 ? 2025 : 2024;
  const total = has2025 ? data.fy2025_total_ssvi : data.fy2024_total_ssvi;
  if (total == null) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const risk = riskFromScore(total);

  // Aggregate breakdown — counts only, never which measures.
  const flaggedCount = countFlags(data, year);
  const rawSpending = has2025 ? data.fy2025_spending_score : data.fy2024_spending_score;
  const spending = rawSpending == null ? null : Number(rawSpending);

  // National percentile — how this score compares to every scored US hospice.
  // Guarded: a failure here must never break the lookup itself.
  let percentile = null;
  try {
    const totalCol = `fy${year}_total_ssvi`;
    const [scoredRes, belowRes] = await Promise.all([
      supabase.from("ssvi_scores").select("ccn", { count: "exact", head: true }).not(totalCol, "is", null),
      supabase.from("ssvi_scores").select("ccn", { count: "exact", head: true }).lt(totalCol, total),
    ]);
    if (!scoredRes.error && !belowRes.error && scoredRes.count > 0) {
      percentile = Math.round((belowRes.count / scoredRes.count) * 100);
    }
  } catch {
    percentile = null;
  }

  return NextResponse.json({
    ccn: data.ccn,
    hospice_name: data.hospice_name,
    year,
    total,
    risk: risk.label,
    tone: risk.tone,
    priorYear: has2025 ? 2024 : null,
    priorTotal: has2025 ? data.fy2024_total_ssvi : null,
    // Aggregates for the public teaser.
    flaggedCount,
    utilizationMax: UTILIZATION_MAX,
    spending,
    spendingMax: SPENDING_MAX,
    percentile,
    // Note: measure-level flags are intentionally omitted. Sign in for the full breakdown.
  });
}
