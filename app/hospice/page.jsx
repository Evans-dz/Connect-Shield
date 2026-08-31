import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { SITE } from '@/lib/site'
import { stateName } from '@/lib/states'
import SSVILookup from '@/components/SSVILookup'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const revalidate = 86400

export const metadata = {
  title: 'Hospice SSVI Scores — Every Medicare-Certified Agency',
  description:
    'Look up the CMS Service and Spending Variation Index (SSVI) score for any Medicare-certified hospice. FY2025 and FY2024 scores for 6,643 agencies, free and no signup.',
  alternates: { canonical: `${SITE.url}/hospice` },
}

export default async function Page() {
  const rows = []
  const PAGE = 1000
  for (let i = 0; i < 12; i++) {
    const { data, error } = await db
      .from('ssvi_public')
      .select('state, fy2025_total_ssvi')
      .not('fy2025_total_ssvi', 'is', null)
      .range(i * PAGE, i * PAGE + PAGE - 1)
    if (error || !data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE) break
  }

  const byState = {}
  for (const r of rows) {
    if (!r.state) continue
    if (!byState[r.state]) byState[r.state] = { count: 0, total: 0 }
    byState[r.state].count += 1
    byState[r.state].total += Number(r.fy2025_total_ssvi)
  }

  const states = Object.keys(byState).sort()
  const nationalAvg = rows.length
    ? (
        rows.reduce((s, r) => s + Number(r.fy2025_total_ssvi), 0) / rows.length
      ).toFixed(1)
    : '—'

  const datasetLd = {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'CMS Hospice Service and Spending Variation Index (SSVI) — FY2025 Scores',
    description:
      'FY2025 Service and Spending Variation Index scores (0–16) for approximately 6,643 Medicare-certified hospices, built from nine claims-based measures: a 0–8 non-hospice spending score and eight utilization measures worth one point each. Published by CMS with the FY2027 hospice final rule (CMS-1851-F).',
    url: `${SITE.url}/hospice`,
    creator: {
      '@type': 'GovernmentOrganization',
      name: 'Centers for Medicare & Medicaid Services',
      url: 'https://www.cms.gov',
    },
    publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
    citation:
      'CMS FY2027 Hospice Wage Index and Payment Rate Update Final Rule (CMS-1851-F), SSVI data file, July 30, 2026',
    temporalCoverage: '2024-10-01/2025-09-30',
    spatialCoverage: 'United States',
    variableMeasured: 'Service and Spending Variation Index (0–16)',
    isAccessibleForFree: true,
    size: 'approximately 6,643 records',
  }

  return (
    <div className="bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetLd) }}
      />
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-14">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Hospice SSVI Scores
        </h1>
        <p className="mt-4 text-slate-700">
          The Service and Spending Variation Index is a 0&ndash;16 score CMS
          finalized in the FY2027 hospice final rule. It combines a 0&ndash;8
          non-hospice spending score with a 0&ndash;8 utilization score built
          from eight claims-based measures. CMS calculated one for every
          Medicare-certified hospice in the country.
        </p>
        <p className="mt-3 text-sm text-slate-500">
          {rows.length.toLocaleString()} agencies · national average FY2025 SSVI{' '}
          {nationalAvg} of 16 · highest score in the country is 15
        </p>

        <div className="my-8">
          <SSVILookup />
        </div>

        <p className="mt-10">
          <Link
            href="/hospice/ssvi-by-state"
            className="font-medium text-amber-700 hover:underline"
          >
            Read our analysis: SSVI scores across all 50 states &rarr;
          </Link>
        </p>

        <h2 className="mt-8 text-lg font-semibold text-slate-900">
          Browse by state
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-3 lg:grid-cols-4">
          {states.map((s) => (
            <Link
              key={s}
              href={`/hospice/state/${s.toLowerCase()}`}
              className="bg-white px-4 py-3 hover:bg-amber-50"
            >
              <div className="text-sm font-semibold text-slate-900">
                {stateName(s) || s}
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                {byState[s].count.toLocaleString()}{' '}
                {byState[s].count === 1 ? 'agency' : 'agencies'} · avg{' '}
                {(byState[s].total / byState[s].count).toFixed(1)}
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-sm text-slate-500">
          The SSVI is not a quality rating and does not indicate wrongdoing. It
          measures divergence from peer norms and is one input CMS uses to focus
          oversight. Source: CMS FY2027 Hospice Wage Index Final Rule
          (CMS-1851-F), SSVI data file.
        </p>
      </div>
    </div>
  )
}
