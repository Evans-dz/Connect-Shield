import { SITE } from "@/lib/site";
import { SOLUTION_SLUGS } from "@/lib/solutions";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Regenerate daily so new/renamed agency slugs appear without a redeploy.
export const revalidate = 86400;

// Vintage of the loaded CMS SSVI file (FY2027 final rule, published 2026-07-30).
// Bump this when a new score file is ingested — it becomes lastModified for
// every directory URL, which is a real signal instead of "now" on every build.
const DATA_UPDATED = new Date("2026-07-30");

export default async function sitemap() {
  const now = new Date();

  const core = ["", "/pricing", "/demo", "/regulatory-watch"].map((p) => ({
    url: `${SITE.url}${p}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));

  const solutions = SOLUTION_SLUGS.map((slug) => ({
    url: `${SITE.url}/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.9,
  }));

  const rows = [];
  const PAGE = 1000;
  let queryError = null;
  for (let i = 0; i < 12; i++) {
    const { data, error } = await db
      .from("ssvi_public")
      .select("slug, state")
      .not("fy2025_total_ssvi", "is", null)
      .range(i * PAGE, i * PAGE + PAGE - 1);
    if (error) {
      queryError = error;
      break;
    }
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
  }

  // Never silently publish a sitemap missing ~6,700 URLs — Google would start
  // dropping the whole directory. Fail loudly against the real database (ISR
  // keeps serving the last good copy); local placeholder creds make this expected.
  const isPlaceholderDb = /127\.0\.0\.1|localhost/.test(process.env.NEXT_PUBLIC_SUPABASE_URL || "");
  if (queryError && rows.length === 0 && !isPlaceholderDb) {
    throw new Error(`sitemap: ssvi_public query failed (${queryError.message}) — refusing to emit an empty sitemap`);
  }

  const states = [...new Set(rows.map((r) => r.state).filter(Boolean))];

  const hospiceIndex = [
    {
      url: `${SITE.url}/hospice`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE.url}/hospice/ssvi-by-state`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
  ];

  const statePages = states.map((s) => ({
    url: `${SITE.url}/hospice/state/${s.toLowerCase()}`,
    lastModified: DATA_UPDATED,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const agencyPages = rows.map((r) => ({
    url: `${SITE.url}/hospice/${r.slug}`,
    lastModified: DATA_UPDATED,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...core, ...solutions, ...hospiceIndex, ...statePages, ...agencyPages];
}
