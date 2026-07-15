import { SITE } from "@/lib/site";
import { SOLUTION_SLUGS } from "@/lib/solutions";

export default function sitemap() {
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
  return [...core, ...solutions];
}
