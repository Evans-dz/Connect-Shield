import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { SITE } from '@/lib/site'
import { stateName } from '@/lib/states'
import NearbyHospices from '@/components/hospice/NearbyHospices'
import AgencyFAQ from '@/components/hospice/AgencyFAQ'

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

// Returns { a, failed }. `failed` means the database was unreachable, which
// is different from a slug that genuinely does not exist.
async function getAgency(slug) {
  const { data, error } = await db
    .from('ssvi_public')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  if (error) return { a: null, failed: true }
  if (!data || data.fy2025_total_ssvi === null) return { a: null, failed: false }
  return { a: data, failed: false }
}

async function fetchStateRows(state) {
  if (!state) return []
  const rows = []
  const PAGE = 1000
  for (let i = 0; i < 12; i++) {
    const { data, error } = await db
      .from('ssvi_public')
      .select('slug, hospice_name, city, fy2025_total_ssvi')
      .eq('state', state)
      .not('fy2025_total_ssvi', 'is', null)
      .order('fy2025_total_ssvi', { ascending: false })
      .range(i * PAGE, i * PAGE + PAGE - 1)
    if (error || !data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return rows
}

async function fetchNationalScores() {
  const rows = []
  const PAGE = 1000
  for (let i = 0; i < 12; i++) {
    const { data, error } = await db
      .from('ssvi_public')
      .select('fy2025_total_ssvi')
      .not('fy2025_total_ssvi', 'is', null)
      .range(i * PAGE, i * PAGE + PAGE - 1)
    if (error || !data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return rows
}

export async function generateMetadata({ params }) {
  const { a, failed } = await getAgency(params.slug)
  if (failed)
    return { title: 'Hospice SSVI Score Lookup', robots: { index: false } }
  if (!a) return { title: 'Hospice not found' }
  const where = [a.city, a.state].filter(Boolean).join(', ')
  const stateFull = stateName(a.state)
  const title = `${a.hospice_name}${where ? ` (${where})` : ''} — SSVI Score ${a.fy2025_total_ssvi}/16 & CMS Data`
  const description = `Published CMS data for ${a.hospice_name}${where ? ` in ${where}` : ''}: FY2025 SSVI score ${a.fy2025_total_ssvi}/16, all nine measures${stateFull ? `, ${stateFull} rank` : ''}. Free — no signup.`
  const url = `${SITE.url}/hospice/${a.slug}`
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
  }
}

// "Is this your hospice?" claim band — navy card, gold accent. Renders a
// generic variant when name/ccn are missing (including the fail-soft page).
function ClaimBand({ name, ccn, className = '' }) {
  const query = [
    ccn ? `ccn=${encodeURIComponent(ccn)}` : null,
    name ? `agency=${encodeURIComponent(name)}` : null,
    'src=claim',
  ]
    .filter(Boolean)
    .join('&')
  return (
    <section
      className={`overflow-hidden rounded-xl p-6 sm:p-8 ${className}`}
      style={{
        background:
          'radial-gradient(700px 320px at 85% -20%, rgba(184, 134, 63, 0.18), transparent 60%), #0e1830',
        border: '1px solid #1E2C4E',
        borderTop: '3px solid #b8863f',
      }}
    >
      <div className="eyebrow" style={{ color: '#E8CFA0' }}>
        For {name || 'hospice'} leadership
      </div>
      <h2 className="font-display mt-3 text-2xl text-white sm:text-3xl">
        Is this your hospice?
      </h2>
      <p className="mt-3 max-w-xl text-sm" style={{ color: '#AEBAD0' }}>
        This page shows your published CMS data. See the full picture behind it
        — every measure explained, your PEPPER and CAP alongside, and what to
        fix first.
      </p>
      <Link
        href={`/demo?${query}`}
        className="mt-5 inline-flex rounded-lg bg-[#E8CFA0] px-5 py-2.5 text-sm font-medium text-[#0e1830] hover:bg-[#f0dcb6]"
      >
        Claim your walkthrough
      </Link>
    </section>
  )
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

function avgOf(rows) {
  if (!rows || !rows.length) return null
  return (
    rows.reduce((s, r) => s + Number(r.fy2025_total_ssvi), 0) / rows.length
  )
}

export default async function Page({ params }) {
  const { a, failed } = await getAgency(params.slug)

  if (failed) {
    return (
      <div className="bg-slate-50">
        <div className="mx-auto max-w-4xl px-5 py-16 sm:px-6 sm:py-24">
          <nav className="mb-8 text-sm text-slate-500">
            <Link href="/hospice" className="hover:text-slate-900">
              Hospice SSVI Scores
            </Link>
          </nav>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Score lookup temporarily unavailable
          </h1>
          <p className="mt-4 text-slate-700">
            We couldn&apos;t load this agency&apos;s FY2025 SSVI record right
            now. Please try again shortly.
          </p>
          <p className="mt-6">
            <Link
              href="/hospice"
              className="font-medium text-amber-700 hover:underline"
            >
              Search all hospices &rarr;
            </Link>
          </p>
          <ClaimBand name={null} ccn={null} className="mt-10" />
        </div>
      </div>
    )
  }

  if (!a) notFound()

  const stateFull = stateName(a.state)
  const stateLabel = stateFull || a.state

  // Peer context for the comparison block and nearby module. Both fetches
  // fail soft — every dependent block below is guarded.
  const stateRows = await fetchStateRows(a.state)
  const national = await fetchNationalScores()

  const stateAvg = avgOf(stateRows)
  const nationalAvg = avgOf(national)
  const score = Number(a.fy2025_total_ssvi)

  // Nearby: same city first, then the rest of the state, excluding this agency.
  const others = stateRows.filter((r) => r.slug && r.slug !== a.slug)
  const cityLc = (a.city || '').toLowerCase()
  const sameCity = cityLc
    ? others.filter((r) => (r.city || '').toLowerCase() === cityLc)
    : []
  const rest = others.filter((r) => !sameCity.includes(r))
  const nearby = [...sameCity, ...rest].slice(0, 5)

  const flagged = MEASURES.filter(([k]) => a[k] === true).length
  const change = a.ssvi_change

  const hasPct = a.pct_national !== null && a.pct_national !== undefined
  const barPct = hasPct ? Number(a.pct_national) : (score / 16) * 100

  const hasPrior =
    a.fy2024_total_ssvi !== null && a.fy2024_total_ssvi !== undefined
  const yoy = hasPrior
    ? score > Number(a.fy2024_total_ssvi)
      ? 'rose'
      : score < Number(a.fy2024_total_ssvi)
      ? 'fell'
      : 'held steady'
    : null

  // FAQ — answers are plain strings so the FAQPage JSON-LD matches exactly.
  const faqItems = [
    {
      q: `What is ${a.hospice_name}'s SSVI score?`,
      a:
        `${a.hospice_name} (CCN ${a.ccn}) has a published FY2025 SSVI score of ${score} of 16` +
        (a.fy2025_spending_score !== null &&
        a.fy2025_spending_score !== undefined &&
        a.fy2025_utilization_score !== null &&
        a.fy2025_utilization_score !== undefined
          ? `: ${a.fy2025_spending_score} of 8 from non-hospice spending and ${a.fy2025_utilization_score} of 8 from the eight claims-based utilization measures.`
          : ', published by CMS with the FY2027 hospice final rule.'),
    },
    stateLabel
      ? {
          q: `How does ${a.hospice_name} compare to other ${stateLabel} hospices?`,
          a:
            (a.rank_state && a.n_state
              ? `It ranks ${a.rank_state} of ${a.n_state} scored hospices in ${stateLabel}. `
              : '') +
            (stateAvg !== null
              ? `The average ${stateLabel} hospice scored ${stateAvg.toFixed(1)} on the FY2025 SSVI` +
                (nationalAvg !== null
                  ? `, against a national average of ${nationalAvg.toFixed(1)}.`
                  : '.')
              : '') || `CMS publishes an SSVI score for every Medicare-certified hospice, so any two ${stateLabel} agencies can be compared directly.`,
        }
      : null,
    {
      q: 'Is a high SSVI score a violation?',
      a: 'No. CMS is explicit that the SSVI is not a determination of fraud, waste, or abuse. It measures how far an agency’s claims patterns diverge from peer norms, and it is one input CMS uses to decide where to focus oversight.',
    },
  ].filter(Boolean)

  const orgLd = {
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

  const breadcrumbItems = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Hospice SSVI Scores',
      item: `${SITE.url}/hospice`,
    },
  ]
  if (a.state) {
    breadcrumbItems.push({
      '@type': 'ListItem',
      position: 2,
      name: stateLabel,
      item: `${SITE.url}/hospice/state/${a.state.toLowerCase()}`,
    })
  }
  breadcrumbItems.push({
    '@type': 'ListItem',
    position: breadcrumbItems.length + 1,
    name: a.hospice_name,
    item: `${SITE.url}/hospice/${a.slug}`,
  })
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbItems,
  }

  return (
    <div className="bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-14">
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
                {stateLabel}
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
                style={{ width: `${barPct}%` }}
              />
            </div>
            {hasPct && (
              <p className="mt-2 text-xs text-slate-500">
                Bar shows national percentile, not raw score.
              </p>
            )}

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
                    {a.rank_state} of {a.n_state?.toLocaleString()}
                  </strong>{' '}
                  in {stateLabel}
                </>
              ) : null}
              {hasPct ? `. Higher than ${a.pct_national}% of hospices nationally.` : '.'}
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
                {change === null || change === undefined
                  ? '—'
                  : change > 0
                  ? `+${change}`
                  : change === 0
                  ? 'No change'
                  : change}
              </div>
              {hasPrior && (
                <div className="mt-1 text-sm text-slate-500">
                  was {a.fy2024_total_ssvi}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-900">
            How {a.hospice_name} compares
          </h2>
          <div className="mt-3 space-y-3 text-slate-700">
            <p>
              {a.hospice_name} posted a FY2025{' '}
              <Link
                href="/ssvi"
                className="font-medium text-amber-700 hover:underline"
              >
                SSVI
              </Link>{' '}
              of {score} of 16.
              {stateAvg !== null && stateLabel ? (
                <>
                  {' '}
                  The average {stateLabel} hospice scored {stateAvg.toFixed(1)}
                  {nationalAvg !== null
                    ? `; the national average is ${nationalAvg.toFixed(1)}`
                    : ''}
                  .
                </>
              ) : nationalAvg !== null ? (
                <> The national average is {nationalAvg.toFixed(1)}.</>
              ) : null}
            </p>
            {stateAvg !== null && stateLabel && (
              <p>
                That puts it{' '}
                {Math.abs(score - stateAvg) < 0.05 ? (
                  <>right at the {stateLabel} average</>
                ) : (
                  <>
                    {Math.abs(score - stateAvg).toFixed(1)}{' '}
                    {Math.abs(score - stateAvg).toFixed(1) === '1.0'
                      ? 'point'
                      : 'points'}{' '}
                    {score > stateAvg ? 'above' : 'below'} its state peers
                  </>
                )}
                {hasPrior && yoy ? (
                  <>
                    , and its score {yoy} year over year
                    {yoy !== 'held steady'
                      ? ` — from ${a.fy2024_total_ssvi} in FY2024 to ${score} in FY2025`
                      : ` at ${score}`}
                  </>
                ) : null}
                .
              </p>
            )}
            {stateAvg === null && hasPrior && yoy && (
              <p>
                Its score {yoy} year over year
                {yoy !== 'held steady'
                  ? ` — from ${a.fy2024_total_ssvi} in FY2024 to ${score} in FY2025`
                  : ` at ${score}`}
                .
              </p>
            )}
          </div>
          <p className="mt-3">
            <Link
              href="/ssvi"
              className="text-sm font-medium text-amber-700 hover:underline"
            >
              How is this score calculated? &rarr;
            </Link>
          </p>
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
            {a.fy2025_spending_per_day !== null &&
              a.fy2025_spending_per_day !== undefined && (
                <Stat
                  label="Non-hospice spending per day"
                  value={`$${Number(a.fy2025_spending_per_day).toFixed(2)}`}
                  sub="FY2025"
                />
              )}
          </div>
        </section>

        <ClaimBand name={a.hospice_name} ccn={a.ccn} className="mb-10" />

        <NearbyHospices
          items={nearby}
          stateFullName={stateFull}
          stateCode={a.state}
        />

        <AgencyFAQ items={faqItems} />

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
            Source: CMS FY2027 Hospice Wage Index and Payment Rate Update Final
            Rule (CMS-1851-F), SSVI data file. FY2025 and FY2024 scores as
            published by CMS. Connect Shield is not affiliated with CMS.
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
              href={
                a.ccn
                  ? `/demo?ccn=${encodeURIComponent(a.ccn)}&agency=${encodeURIComponent(a.hospice_name || '')}`
                  : '/demo'
              }
              className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-500"
            >
              Book a demo
            </Link>
            <Link
              href={
                a.state ? `/hospice/state/${a.state.toLowerCase()}` : '/hospice'
              }
              className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              {stateLabel ? `See all ${stateLabel} hospices` : 'Browse all states'}
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
