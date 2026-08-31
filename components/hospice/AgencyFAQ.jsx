// Per-agency FAQ block with matching FAQPage JSON-LD.
// `items` is [{ q, a }]. Renders nothing when empty — safe with missing data.
export default function AgencyFAQ({ items }) {
  const list = (items || []).filter((i) => i && i.q && i.a)
  if (!list.length) return null

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: list.map((i) => ({
      '@type': 'Question',
      name: i.q,
      acceptedAnswer: { '@type': 'Answer', text: i.a },
    })),
  }

  return (
    <section className="mb-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <h2 className="text-lg font-semibold text-slate-900">
        Frequently asked questions
      </h2>
      <dl className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {list.map((i) => (
          <div key={i.q} className="px-5 py-4">
            <dt className="text-sm font-semibold text-slate-900">{i.q}</dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-slate-600">
              {i.a}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
