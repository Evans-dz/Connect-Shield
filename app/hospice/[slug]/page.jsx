import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const revalidate = 86400
export const dynamicParams = true

const MEASURES = [
  ['fy2025_live_discharge', 'Live discharge rate'],
  ['fy2025_los_180', 'Length of stay over 180 days'],
  ['fy2025_nursing_facility', 'Nursing facility patient share'],
  ['fy2025_no_chc_gip', 'No continuous home care or general inpatient care'],
  ['fy2025_last_two_days', 'Visits in last two days of life'],
  ['fy2025_sn_minutes', 'Skilled nursing minutes'],
  ['fy2025_weekend_visits', 'Weekend visit rate'],
  ['fy2025_return_7days', 'Return to hospice within 7 days'],
]

export async function generateStaticParams() {
  const { data } = await db
    .from('ssvi_public')
    .select('slug')
    .not('fy2025_total_ssvi', 'is', null)
    .order('fy2025_total_ssvi', { ascending: false })
    .limit(500)
  return (data || []).map((r) => ({ slug: r.slug }))
}

async function getAgency(slug) {
  const { data } = await db
    .from('ssvi_public')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (!data || data.fy2025_total_ssvi === null) return null
  return data
}

export async function generateMetadata({ params }) {
  const a = await getAgency(params.slug)
  if (!a) return { title: 'Hospice not found | Connect Shield' }
  const where = [a.city, a.state].filter(Boolean).join(', ')
  return {
    title: `${a.hospice_name}${where ? ` (${where})` : ''} — SSVI ${a.fy2025_total_ssvi} | Connect Shield`,
    description: `FY2025 CMS Service and Spending Variation Index for ${a.hospice_name}, CCN ${a.ccn}. Score ${a.fy2025_total_ssvi} of 16, higher than ${a.pct_national}% of hospices nationally.`,
    alternates: { canonical: `https://connect-shield.com/hospice/${a.slug}` },
  }
}

export default async function Page({ params }) {
  const a = await getAgency(params.slug)
  if (!a) notFound()

  const flagged = MEASURES.filter(([k]) => a[k] === true).length
  const change = a.ssvi_change

  return (
    <main>
      <nav>
        <Link href="/hospice">Hospice SSVI Scores</Link>
        {a.state && (
          <>
            {' / '}
            <Link href={`/hospice/state/${a.state.toLowerCase()}`}>{a.state}</Link>
          </>
        )}
      </nav>

      <h1>{a.hospice_name}</h1>
      <p>
        CCN {a.ccn}
        {a.city ? ` · ${a.city}` : ''}
        {a.state ? `, ${a.state}` : ''}
        {a.urban_rural ? ` · ${a.urban_rural}` : ''}
      </p>

      <section>
        <h2>FY2025 SSVI</h2>
        <p>
          <strong>{a.fy2025_total_ssvi}</strong> of 16
        </p>
        {a.pct_national !== null && (
          <p>
            Higher than {a.pct_national}% of hospices nationally
            {a.pct_state !== null && a.state
              ? ` and ${a.pct_state}% in ${a.state}`
              : ''}
            .
          </p>
        )}
        <p>
          Spending score {a.fy2025_spending_score} of 8 · Utilization score{' '}
          {a.fy2025_utilization_score} of 8
        </p>
        {change !== null && a.fy2024_total_ssvi !== null && (
          <p>
            {change > 0 ? 'Up' : change < 0 ? 'Down' : 'Unchanged'}
            {change !== 0 ? ` ${Math.abs(change)} point${Math.abs(change) === 1 ? '' : 's'}` : ''}{' '}
            from FY2024 (score {a.fy2024_total_ssvi}).
          </p>
        )}
      </section>

      <section>
        <h2>Utilization measures</h2>
        <p>{flagged} of 8 flagged in FY2025.</p>
        <ul>
          {MEASURES.map(([key, label]) => (
            <li key={key}>
              {a[key] ? 'Flagged' : 'Not flagged'} — {label}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Non-hospice spending</h2>
        <p>
          Spending score {a.fy2025_spending_score} of 8, based on Medicare
          spending outside the hospice benefit for this agency&apos;s enrolled
          beneficiaries.
        </p>
      </section>

      <section>
        <h2>What this means</h2>
        <p>
          The SSVI is not a quality rating and does not indicate wrongdoing. It
          measures how far an agency&apos;s claims patterns diverge from peer
          norms, and it is one of the inputs CMS uses to decide where to focus
          oversight. A higher score means more divergence.
        </p>
        <p>
          Source: CMS FY2027 Hospice Wage Index Proposed Rule (CMS-1851-P), SSVI
          data file. FY2025 and FY2024 scores as published by CMS.
        </p>
      </section>
    </main>
  )
}
