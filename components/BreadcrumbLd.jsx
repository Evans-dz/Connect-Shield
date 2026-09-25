import { SITE } from "@/lib/site";

// BreadcrumbList schema for a sub-page. `trail` is [{ name, path }] from the
// section down to this page, the same shape the hospice directory pages use.
export default function BreadcrumbLd({ trail }) {
  const ld = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: `${SITE.url}${c.path}`,
    })),
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />;
}
