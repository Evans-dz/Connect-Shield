// Shared benchmarking helpers — plain module, safe on server and client.
//
// Everything here reads the PUBLIC ssvi_public table (published CMS data,
// anon-readable — the same table the /hospice pages are built on). Every
// function degrades to null instead of throwing, so a dead Supabase URL or a
// missing row renders an empty state, never a crash.

// FY2025 national mean of the published CMS SSVI file. The dashboard's SSVI
// panel already prints this same figure ("National avg: 6.42 · Median: 7").
// Update alongside the annual CMS refresh.
export const NATIONAL_AVG_SSVI = 6.42;
export const NATIONAL_SCORED_COUNT = 6643;

// Average FY2025 SSVI across one state. Pages through ssvi_public the same way
// /hospice/state/[code] does (PostgREST caps a select at 1000 rows).
// Returns { avg, count } or null.
export async function fetchStateAverage(db, state) {
  if (!db || !state) return null;
  try {
    const scores = [];
    const PAGE = 1000;
    for (let i = 0; i < 4; i++) {
      const { data, error } = await db
        .from("ssvi_public")
        .select("fy2025_total_ssvi")
        .eq("state", state)
        .not("fy2025_total_ssvi", "is", null)
        .range(i * PAGE, i * PAGE + PAGE - 1);
      if (error || !data || data.length === 0) break;
      scores.push(...data.map((r) => Number(r.fy2025_total_ssvi)).filter(Number.isFinite));
      if (data.length < PAGE) break;
    }
    if (!scores.length) return null;
    const avg = scores.reduce((s, n) => s + n, 0) / scores.length;
    return { avg: Math.round(avg * 10) / 10, count: scores.length };
  } catch {
    return null;
  }
}

// National percentile for a score — the share of scored US hospices with a
// LOWER FY2025 SSVI. Ported from the /api/ssvi-lookup teaser: two head-only
// count queries, no rows transferred. Higher percentile = higher (worse) score.
// Returns 0-100 or null.
export async function fetchNationalPercentile(db, total) {
  if (!db || total == null) return null;
  try {
    const [scoredRes, belowRes] = await Promise.all([
      db.from("ssvi_public").select("ccn", { count: "exact", head: true }).not("fy2025_total_ssvi", "is", null),
      db.from("ssvi_public").select("ccn", { count: "exact", head: true }).lt("fy2025_total_ssvi", total),
    ]);
    if (scoredRes.error || belowRes.error || !scoredRes.count) return null;
    return Math.round((belowRes.count / scoredRes.count) * 100);
  } catch {
    return null;
  }
}

// The ssvi_public row for one CCN — name, location, score, and the
// precomputed national/state ranks the /hospice pages use. Returns row or null.
export async function fetchPublicRow(db, ccn) {
  if (!db || !ccn) return null;
  try {
    const { data, error } = await db
      .from("ssvi_public")
      .select(
        "ccn, hospice_name, city, state, fy2025_total_ssvi, fy2024_total_ssvi, fy2025_spending_score, fy2025_utilization_score, pct_national, rank_national, n_national, rank_state, n_state"
      )
      .ilike("ccn", ccn)
      .limit(1);
    if (error || !data || !data.length) return null;
    return data[0];
  } catch {
    return null;
  }
}
