import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { SITE } from '@/lib/site'
import { stateName } from '@/lib/states'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const revalidate = 86400
export const dynamicParams = true

const COLS =
  'slug, hospice_name, city, fy2025_total_ssvi, fy2025_spending_score, fy2025_utilization_score, ssvi_change'

// Cap ItemList JSON-LD entries so large states don't double the page weight.
const ITEMLIST_CAP = 250

async function fetchAll(columns, state) {
  const rows = []
  const PAGE = 1000
  for (let i = 0; i < 12; i++) {
    let q = db
      .from('ssvi_public')
      .select(columns)
      .not('fy2025_total_ssvi', 'is', null)
    if (state) {
      q = q.eq('state', state).order('fy2025_total_ssvi', { ascending: false })
    }
    const { data, error } = await q.range(i * PAGE, i * PAGE + PAGE - 1)
    if (error || !data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return rows
}

export async function generateStaticParams() {
  const rows = await fetchAll('state', null)
  const codes = [...new Set(rows.map((r) => r.state).filter(Boolean))]
  return codes.map((c) => ({ code: c.toLowerCase() }))
}

export async function generateMetadata({ params }) {
  const name = stateName(params.code)
  if (!name) return { title: 'State not found' }
  return {
    title: `${name} Hospice SSVI Scores`,
    description: `FY2025 CMS Service and Spending Variation Index scores for every Medicare-certified hospice in ${name}, ranked highest to lowest.`,
    alternates: {
      canonical: `${SITE.url}/hospice/state/${params.code.toLowerCase()}`,
    },
  }
}

export default async function Page({ params }) {
  const st = params.code.toUpperCase()
  const name = stateName(st)
  if (!name) notFound()

  const data = await fetchAll(COLS, st)
  // National totals for the comparison paragraphs. Null-guarded below —
  // every stat renders only when its inputs exist.
  const national = data.length ? await fetchAll('fy2025_total_ssvi', null) : []

  const stateAvg = data.length
    ? data.reduce((s, r) => s + Number(r.fy2025_total_ssvi), 0) / data.length
    : null
  const nationalAvg = national.length
    ? national.reduce((s, r) => s + Number(r.fy2025_total_ssvi), 0) /
      national.length
    : null
  const spendAvg = data.length
    ? data.reduce((s, r) => s + Number(r.fy2025_spending_score || 0), 0) /
      data.length
    : null
  const utilAvg = data.length
    ? data.reduce((s, r) => s + Number(r.fy2025_utilization_score || 0), 0) /
      data.length
    : null
  const highCount = data.filter(
    (r) => Number(r.fy2025_total_ssvi) >= 10
  ).length
  const highPct = data.length
    ? Math.round((highCount / data.length) * 100)
    : null
  const natHighPct = national.length
    ? Math.round(
        (national.filter((r) => Number(r.fy2025_total_ssvi) >= 10).length /
          national.length) *
          100
      )
    : null

  const delta =
    stateAvg !== null && nationalAvg !== null ? stateAvg - nationalAvg : null

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Hospice SSVI Scores',
        item: `${SITE.url}/hospice`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: name,
        item: `${SITE.url}/hospice/state/${st.toLowerCase()}`,
      },
    ],
  }

  const itemListLd = data.length
    ? {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${name} Hospice SSVI Scores`,
        numberOfItems: data.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: data.slice(0, ITEMLIST_CAP).map((r, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: r.hospice_name,
          url: `${SITE.url}/hospice/${r.slug}`,
        })),
      }
    : null

  return (
    <div className="bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {itemListLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
        />
      )}

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 text-sm text-slate-500">
          <Link href="/hospice" className="hover:text-slate-900">
            Hospice SSVI Scores
          </Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-700">{name}</span>
        </nav>

        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {name} Hospice SSVI Scores
        </h1>

        {data.length ? (
          <>
            <p className="mt-3 text-slate-600">
              {data.length.toLocaleString()}{' '}
              {data.length === 1
                ? 'Medicare-certified hospice'
                : 'Medicare-certified hospices'}{' '}
              · average FY2025{' '}
              <Link
                href="/ssvi"
                className="font-medium text-amber-700 hover:underline"
              >
                SSVI
              </Link>{' '}
              {stateAvg.toFixed(1)} of 16
            </p>

            <div className="mt-6 space-y-3 text-slate-700">
              {delta !== null && (
                <p>
                  The average {name} hospice scored {stateAvg.toFixed(1)} on the
                  FY2025 SSVI &mdash;{' '}
                  {Math.abs(delta) < 0.05 ? (
                    <>in line with the national average of{' '}
                      {nationalAvg.toFixed(1)}</>
                  ) : (
                    <>
                      {Math.abs(delta).toFixed(1)}{' '}
                      {Math.abs(delta).toFixed(1) === '1.0'
                        ? 'point'
                        : 'points'}{' '}
                      {delta > 0 ? 'above' : 'below'} the national average of{' '}
                      {nationalAvg.toFixed(1)}
                    </>
                  )}
                  .
                </p>
              )}
              {spendAvg !== null && utilAvg !== null && (
                <p>
                  Of that score, {spendAvg.toFixed(1)} comes from non-hospice
                  spending and {utilAvg.toFixed(1)} from the eight claims-based
                  utilization measures &mdash;{' '}
                  {spendAvg > utilAvg
                    ? 'spending drives the state average'
                    : spendAvg < utilAvg
                    ? 'utilization drives the state average'
                    : 'the two halves contribute equally'}
                  .
                </p>
              )}
              {highPct !== null && (
                <p>
                  {highCount.toLocaleString()} of {data.length.toLocaleString()}{' '}
                  {name} {highCount === 1 ? 'agency' : 'agencies'} ({highPct}%)
                  scored 10 or higher, the top band of the 0&ndash;16 range
                  {natHighPct !== null
                    ? ` — nationally, ${natHighPct}% of agencies do`
                    : ''}
                  .
                </p>
              )}
            </div>

            <div className="mt-8 overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                      <th className="px-5 py-3">Agency</th>
                      <th className="px-5 py-3">City</th>
                      <th className="px-5 py-3 text-right">SSVI</th>
                      <th className="px-5 py-3 text-right">Spending</th>
                      <th className="px-5 py-3 text-right">Utilization</th>
                      <th className="px-5 py-3 text-right">vs FY2024</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.map((r) => (
                      <tr key={r.slug} className="hover:bg-slate-50">
                        <td className="px-5 py-3">
                          <Link
                            href={`/hospice/${r.slug}`}
                            className="font-medium text-slate-900 hover:text-amber-700"
                          >
                            {r.hospice_name}
                          </Link>
                        </td>
                        <td className="px-5 py-3 text-slate-600">{r.city}</td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900">
                          {r.fy2025_total_ssvi}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-600">
                          {r.fy2025_spending_score}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-600">
                          {r.fy2025_utilization_score}
                        </td>
                        <td className="px-5 py-3 text-right tabular-nums text-slate-600">
                          {r.ssvi_change === null || r.ssvi_change === undefined
                            ? '—'
                            : r.ssvi_change > 0
                            ? `+${r.ssvi_change}`
                            : r.ssvi_change}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
            <p className="text-slate-700">
              Score data for {name} is temporarily unavailable. The full FY2025
              SSVI table for every Medicare-certified hospice in {name} will be
              back shortly.
            </p>
            <p className="mt-4">
              <Link
                href="/hospice"
                className="font-medium text-amber-700 hover:underline"
              >
                Search all hospices &rarr;
              </Link>
            </p>
          </div>
        )}

        <p className="mt-6 text-sm text-slate-500">
          The SSVI is not a quality rating and does not indicate wrongdoing. It
          measures how far an agency&apos;s claims patterns diverge from peer
          norms. Source: CMS FY2027 Hospice Wage Index Final Rule (CMS-1851-F).
        </p>
      </div>
    </div>
  )
}
