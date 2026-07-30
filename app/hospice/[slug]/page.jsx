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

const GEO = { U: 'Urban', R: 'Rural' }

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
    title: `${a.hospice_name}${where ? ` (${where})` : ''} — SSVI ${a.fy2025_total_ssvi} of 16 | Connect Shield`,
    description: `FY2025 CMS Service and Spending Variation Index for ${a.hospice_name}, CCN ${a.ccn}. Score ${a.fy2025_total_ssvi} of 16, ranked ${a.rank_national} of ${a.n_national} hospices nationally.`,
    alternates: { canonical: `${SITE.url}/hospice/${a.slug}` },
  }
}

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
        {value}
      </div>
      {sub && <div className="mt-1 text-sm text-slate-500">{sub}</div>}
    </div>
  )
}

export default async function Page({ params }) {
  const a = await getAgency(params.slug)
  if (!a) notFound()

  const flagged = MEASURES.filter(([k]) => a[k] === true).length
  const change = a.ssvi_change
  const pct = Math.round((Number(a.fy2025_total_ssvi) / 16) * 100)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MedicalOrganization',
    name: a.hospice_name,
    identifier: a.ccn,
    address: {
      '@type': 'PostalAddress',
      addressLocality: a.city,
      addressRegion: a.state,
      addressCountry: 'US',
    },
  }

  return (
    <div className="bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 text-sm text-slate-500">
          <Link href="/hospice" className="hover:text-slate-900">
            Hospice SSVI Scores
          </Link>
          {a.state && (
            <>
              <span className="mx-2 text-slate-300">/</span>
              <Link
                href={`/hospice/state/${a.state.toLowerCase()}`}
                className="hover:text-slate-900"
              >
                {a.state}
              </Link>
            </>
          )}
        </nav>

        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {a.hospice_name}
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            CCN {a.ccn}
            {a.city ? ` · ${a.city}` : ''}
            {a.state ? `, ${a.state}` : ''}
            {GEO[a.urban_rural] ? ` · ${GEO[a.urban_rural]}` : ''}
          </p>
        </header>

        <section className="mb-10 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-8 sm:px-8">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
              FY2025 SSVI Score
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-6xl font-semibold tabular-nums text-slate-900">
                {a.fy2025_total_ssvi}
              </span>
              <span className="text-2xl text-slate-400">/ 16</span>
            </div>

            <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-amber-700"
                style={{ width: `${pct}%` }}
              />
            </div>

            <p className="mt-6 text-slate-700">
              Ranked{' '}
              <strong className="font-semibold text-slate-900">
                {a.rank_national} of {a.n_national?.toLocaleString()}
              </strong>{' '}
              hospices nationally
              {a.state && a.rank_state ? (
                <>
                  {' '}
                  and{' '}
                  <strong className="font-semibold text-slate-900">
                    {a.rank_state} of {a.n_state}
                  </strong>{' '}
                  in {a.state}
                </>
              ) : null}
              . Higher than {a.pct_national}% of hospices nationally.
            </p>
          </div>

          <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
            <div className="bg-white px-6 py-5">
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Spending
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {a.fy2025_spending_score}
                <span className="text-base font-normal text-slate-400"> / 8</span>
              </div>
            </div>
            <div className="bg-white px-6 py-5">
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                Utilization
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {a.fy2025_utilization_score}
                <span className="text-base font-normal text-slate-400"> / 8</span>
              </div>
            </div>
            <div className="bg-white px-6 py-5">
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                vs FY2024
              </div>
              <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                {change === null
                  ? '—'
                  : change > 0
                  ? `+${change}`
                  : change === 0
                  ? 'No change'
                  : change}
              </div>
              {a.fy2024_total_ssvi !== null && (
                <div className="mt-1 text-sm text-slate-500">
                  was {a.fy2024_total_ssvi}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900">
            Utilization measures
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {flagged} of 8 flagged in FY2025. Each flagged measure adds one point
            to the utilization score.
          </p>

          <ul className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {MEASURES.map(([key, label]) => (
              <li
                key={key}
                className="flex items-center justify-between gap-4 px-5 py-4"
              >
                <span className="text-sm text-slate-800">{label}</span>
                {a[key] ? (
                  <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-amber-800 ring-1 ring-inset ring-amber-200">
                    Flagged
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-slate-50 px-3 py-1 text-xs font-medium uppercase tracking-wide text-slate-500 ring-1 ring-inset ring-slate-200">
                    Not flagged
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900">
            Non-hospice spending
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Stat
              label="Spending score"
              value={`${a.fy2025_spending_score} / 8`}
              sub="Based on Medicare spending outside the hospice benefit"
            />
            {a.fy2025_spending_per_day !== null && (
              <Stat
                label="Non-hospice spending per day"
                value={`$${Number(a.fy2025_spending_per_day).toFixed(2)}`}
                sub="FY2025"
              />
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">
            What this means
          </h2>
          <p className="mt-3 text-slate-700">
            The SSVI is not a quality rating and does not indicate wrongdoing. It
            measures how far an agency&apos;s claims patterns diverge from peer
            norms, and it is one of the inputs CMS uses to decide where to focus
            oversight. A higher score means more divergence from peers.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Source: CMS FY2027 Hospice Wage Index and Payment Rate Update
            Proposed Rule (CMS-1851-P), SSVI data file. FY2025 and FY2024 scores
            as published by CMS. Connect Shield is not affiliated with CMS.
          </p>
        </section>

        <section className="mt-10 rounded-xl bg-slate-900 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">
            Is this your agency?
          </h2>
          <p className="mt-2 text-slate-300">
            Connect Shield tracks your SSVI alongside PEPPER, CAHPS, QAPI, and
            PS&amp;R data, and flags regulatory changes as they happen.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/demo"
              className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-500"
            >
              Book a demo
            </Link>
            <Link
              href={a.state ? `/hospice/state/${a.state.toLowerCase()}` : '/hospice'}
              className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              {a.state ? `See all ${a.state} hospices` : 'Browse all states'}
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}
