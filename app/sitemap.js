import { SITE } from "@/lib/site";
import { SOLUTION_SLUGS } from "@/lib/solutions";
import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default async function sitemap() {
  const now = new Date();

  const core = ["", "/pricing", "/demo"].map((p) => ({
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
  for (let i = 0; i < 12; i++) {
    const { data, error } = await db
      .from("ssvi_public")
      .select("slug, state")
      .not("fy2025_total_ssvi", "is", null)
      .range(i * PAGE, i * PAGE + PAGE - 1);
    if (error || !data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE) break;
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
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const agencyPages = rows.map((r) => ({
    url: `${SITE.url}/hospice/${r.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...core, ...solutions, ...hospiceIndex, ...statePages, ...agencyPages];
}
