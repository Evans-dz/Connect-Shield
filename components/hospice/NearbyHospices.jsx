import Link from 'next/link'

// Linked list of other agencies in the same state (same city listed first
// by the caller). Renders nothing when the list is empty — safe with no data.
export default function NearbyHospices({ items, stateFullName, stateCode }) {
  const list = (items || []).filter((i) => i && i.slug && i.hospice_name)
  if (!list.length) return null

  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold text-slate-900">Nearby hospices</h2>
      <p className="mt-1 text-sm text-slate-600">
        Other Medicare-certified hospices
        {stateFullName ? ` in ${stateFullName}` : ''}, with FY2025 SSVI scores.
      </p>
      <ul className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {list.map((h) => (
          <li key={h.slug}>
            <Link
              href={`/hospice/${h.slug}`}
              className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-amber-50"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-900">
                  {h.hospice_name}
                </span>
                {h.city && (
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {h.city}
                  </span>
                )}
              </span>
              {h.fy2025_total_ssvi !== null &&
                h.fy2025_total_ssvi !== undefined && (
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                    {h.fy2025_total_ssvi}
                    <span className="font-normal text-slate-400"> / 16</span>
                  </span>
                )}
            </Link>
          </li>
        ))}
      </ul>
      {stateCode && (
        <p className="mt-3">
          <Link
            href={`/hospice/state/${String(stateCode).toLowerCase()}`}
            className="text-sm font-medium text-amber-700 hover:underline"
          >
            See all {stateFullName || String(stateCode).toUpperCase()} hospices
            &rarr;
          </Link>
        </p>
      )}
    </section>
  )
}
