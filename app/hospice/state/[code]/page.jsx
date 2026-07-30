import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { SITE } from '@/lib/site'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const revalidate = 86400
export const dynamicParams = true

const COLS =
  'slug, hospice_name, city, fy2025_total_ssvi, fy2025_spending_score, fy2025_utilization_score, ssvi_change'

async function fetchAll(columns, state) {
  const rows = []
  const PAGE = 1000
  for (let i = 0; i < 12; i++) {
    let q = db
      .from('ssvi_public')
      .select(columns)
      .not('fy2025_total_ssvi', 'is', null)
    if (state) q = q.eq('state', state).order('fy2025_total_ssvi', { ascending: false })
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
  const st = params.code.toUpperCase()
  return {
    title: `${st} Hospice SSVI Scores — All Medicare-Certified Agencies | Connect Shield`,
    description: `FY2025 CMS Service and Spending Variation Index scores for every Medicare-certified hospice in ${st}, ranked highest to lowest.`,
    alternates: {
      canonical: `${SITE.url}/hospice/state/${params.code.toLowerCase()}`,
    },
  }
}

export default async function Page({ params }) {
  const st = params.code.toUpperCase()
  const data = await fetchAll(COLS, st)
  if (!data.length) notFound()

  const avg = (
    data.reduce((s, r) => s + Number(r.fy2025_total_ssvi), 0) / data.length
  ).toFixed(1)

  return (
    <div className="bg-slate-50">
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 text-sm text-slate-500">
          <Link href="/hospice" className="hover:text-slate-900">
            Hospice SSVI Scores
          </Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-700">{st}</span>
        </nav>

        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Hospice SSVI Scores in {st}
        </h1>
        <p className="mt-3 text-slate-600">
          {data.length.toLocaleString()} Medicare-certified hospices · average
          FY2025 SSVI {avg} of 16
        </p>

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
                      {r.ssvi_change === null
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

        <p className="mt-6 text-sm text-slate-500">
          The SSVI is not a quality rating and does not indicate wrongdoing. It
          measures how far an agency&apos;s claims patterns diverge from peer
          norms. Source: CMS FY2027 Hospice Wage Index Proposed Rule
          (CMS-1851-P).
        </p>
      </main>
    </div>
  )
}
