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

async function fetchAll(columns) {
  const rows = []
  const PAGE = 1000
  for (let i = 0; i < 12; i++) {
    const { data, error } = await db
      .from('ssvi_public')
      .select(columns)
      .not('fy2025_total_ssvi', 'is', null)
      .range(i * PAGE, i * PAGE + PAGE - 1)
    if (error || !data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return rows
}

export async function generateStaticParams() {
  const rows = await fetchAll('state')
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

  const { data } = await db
    .from('ssvi_public')
    .select(
      'slug, hospice_name, city, fy2025_total_ssvi, fy2025_spending_score, fy2025_utilization_score, ssvi_change'
    )
    .eq('state', st)
    .not('fy2025_total_ssvi', 'is', null)
    .order('fy2025_total_ssvi', { ascending: false })
    .limit(1000)

  if (!data || data.length === 0) notFound()

  const avg = (
    data.reduce((s, r) => s + Number(r.fy2025_total_ssvi), 0) / data.length
  ).toFixed(1)

  return (
    <main>
      <nav>
        <Link href="/hospice">Hospice SSVI Scores</Link> / {st}
      </nav>

      <h1>Hospice SSVI Scores in {st}</h1>
      <p>
        {data.length} Medicare-certified hospices · average FY2025 SSVI {avg} of
        16
      </p>

      <table>
        <thead>
          <tr>
            <th>Agency</th>
            <th>City</th>
            <th>SSVI</th>
            <th>Spending</th>
            <th>Utilization</th>
            <th>vs FY2024</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r) => (
            <tr key={r.slug}>
              <td>
                <Link href={`/hospice/${r.slug}`}>{r.hospice_name}</Link>
              </td>
              <td>{r.city}</td>
              <td>{r.fy2025_total_ssvi}</td>
              <td>{r.fy2025_spending_score}</td>
              <td>{r.fy2025_utilization_score}</td>
              <td>
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

      <p>
        The SSVI is not a quality rating. It measures how far an agency&apos;s
        claims patterns diverge from peer norms. Source: CMS FY2027 Hospice Wage
        Index Proposed Rule (CMS-1851-P).
      </p>
    </main>
  )
}
