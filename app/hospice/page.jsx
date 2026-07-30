import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { SITE } from '@/lib/site'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const revalidate = 86400

export const metadata = {
  title:
    'Hospice SSVI Scores — Every Medicare-Certified Agency | Connect Shield',
  description:
    'Look up the CMS Service and Spending Variation Index (SSVI) score for any Medicare-certified hospice. FY2025 and FY2024 scores for 6,642 agencies, free and no signup.',
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

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-14">
      <h1>Hospice SSVI Scores</h1>
      <p>
        The Service and Spending Variation Index is a 0–16 score CMS introduced
        in the FY2027 hospice proposed rule. It combines a 0–8 non-hospice
        spending score with a 0–8 utilization score built from eight
        claims-based measures. CMS calculated one for every Medicare-certified
        hospice in the country.
      </p>
      <p>
        {rows.length.toLocaleString()} agencies · national average FY2025 SSVI{' '}
        {nationalAvg} of 16
      </p>

      <h2>Browse by state</h2>
      <ul>
        {states.map((s) => (
          <li key={s}>
            <Link href={`/hospice/state/${s.toLowerCase()}`}>{s}</Link> —{' '}
            {byState[s].count} agencies, average{' '}
            {(byState[s].total / byState[s].count).toFixed(1)}
          </li>
        ))}
      </ul>

      <p>
        The SSVI is not a quality rating and does not indicate wrongdoing. It
        measures divergence from peer norms and is one input CMS uses to focus
        oversight. Source: CMS FY2027 Hospice Wage Index Proposed Rule
        (CMS-1851-P), SSVI data file.
      </p>
    </main>
  )
}
