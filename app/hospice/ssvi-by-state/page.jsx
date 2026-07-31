import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { SITE } from '@/lib/site'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const revalidate = 86400

export const metadata = {
  title: 'Hospice SSVI Scores by State — All 6,643 Medicare-Certified Agencies | Connect Shield',
  description:
    'Every state ranked by average CMS Service and Spending Variation Index score. Analysis of FY2025 SSVI data for all Medicare-certified hospices in the United States.',
  alternates: { canonical: `${SITE.url}/hospice/ssvi-by-state` },
}

const MIN_FOR_RANKING = 20

async function fetchAll() {
  const rows = []
  const PAGE = 1000
  for (let i = 0; i < 12; i++) {
    const { data, error } = await db
      .from('ssvi_public')
      .select(
        'state, urban_rural, fy2025_total_ssvi, fy2025_spending_score, fy2025_utilization_score, fy2024_total_ssvi'
      )
      .not('fy2025_total_ssvi', 'is', null)
      .range(i * PAGE, i * PAGE + PAGE - 1)
    if (error || !data || data.length === 0) break
    rows.push(...data)
    if (data.length < PAGE) break
  }
  return rows
}

function mean(arr) {
  if (!arr.length) return null
  return arr.reduce((s, n) => s + Number(n), 0) / arr.length
}

export default async function Page() {
  const rows = await fetchAll()

  const nationalAvg = mean(rows.map((r) => r.fy2025_total_ssvi))
  const nationalSpend = mean(rows.map((r) => r.fy2025_spending_score))
  const nationalUtil = mean(rows.map((r) => r.fy2025_utilization_score))
  const spendShare = Math.round((nationalSpend / nationalAvg) * 100)

  // Score distribution 0-16
  const dist = Array.from({ length: 17 }, () => 0)
  for (const r of rows) {
    const v = Math.round(Number(r.fy2025_total_ssvi))
    if (v >= 0 && v <= 16) dist[v] += 1
  }
  const distMax = Math.max(...dist)
  const topScore = dist.reduce((acc, n, i) => (n > 0 ? i : acc), 0)

  // Year over year
  const withBoth = rows.filter((r) => r.fy2024_total_ssvi !== null)
  const rose = withBoth.filter(
    (r) => Number(r.fy2025_total_ssvi) > Number(r.fy2024_total_ssvi)
  ).length
  const fell = withBoth.filter(
    (r) => Number(r.fy2025_total_ssvi) < Number(r.fy2024_total_ssvi)
  ).length
  const same = withBoth.length - rose - fell

  // Urban / rural
  const urban = rows.filter((r) => r.urban_rural === 'U')
  const rural = rows.filter((r) => r.urban_rural === 'R')
  const urbanAvg = mean(urban.map((r) => r.fy2025_total_ssvi))
  const ruralAvg = mean(rural.map((r) => r.fy2025_total_ssvi))

  // By state
  const map = {}
  for (const r of rows) {
    if (!r.state) continue
    if (!map[r.state]) map[r.state] = []
    map[r.state].push(r)
  }

  const states = Object.entries(map)
    .map(([code, list]) => ({
      code,
      count: list.length,
      avg: mean(list.map((r) => r.fy2025_total_ssvi)),
      spend: mean(list.map((r) => r.fy2025_spending_score)),
      util: mean(list.map((r) => r.fy2025_utilization_score)),
    }))
    .sort((a, b) => b.avg - a.avg)

  const ranked = states.filter((s) => s.count >= MIN_FOR_RANKING)
  const highest = ranked.slice(0, 5)
  const lowest = [...ranked].reverse().slice(0, 5)
  const biggest = [...states].sort((a, b) => b.count - a.count).slice(0, 5)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Hospice SSVI Scores by State',
    description:
      'Every US state ranked by average CMS Service and Spending Variation Index score, based on FY2025 data for all Medicare-certified hospices.',
    datePublished: '2026-07-30',
    author: { '@type': 'Organization', name: SITE.name, url: SITE.url },
    publisher: { '@type': 'Organization', name: SITE.name, url: SITE.url },
    mainEntityOfPage: `${SITE.url}/hospice/ssvi-by-state`,
  }

  return (
    <div className="bg-slate-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 text-sm text-slate-500">
          <Link href="/hospice" className="hover:text-slate-900">
            Hospice SSVI Scores
          </Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-700">By state</span>
        </nav>

        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          Hospice SSVI Scores by State
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-slate-700">
          CMS published a Service and Spending Variation Index score for every
          Medicare-certified hospice in the country. We analyzed all{' '}
          {rows.length.toLocaleString()} of them.
        </p>

        {/* Key findings */}
        <section className="mt-10 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">
            What the data shows
          </h2>
          <ul className="mt-4 space-y-3 text-slate-700">
            <li>
              The national average FY2025 SSVI is{' '}
              <strong className="font-semibold text-slate-900">
                {nationalAvg.toFixed(1)} of 16
              </strong>
              . It is not split evenly: non-hospice spending contributes{' '}
              <strong className="font-semibold text-slate-900">
                {nationalSpend.toFixed(1)} points
              </strong>{' '}
              on average against{' '}
              <strong className="font-semibold text-slate-900">
                {nationalUtil.toFixed(1)}
              </strong>{' '}
              from utilization — roughly {spendShare}% of the typical score comes
              from the spending half alone.
            </li>
            <li>
              <strong className="font-semibold text-slate-900">
                No hospice in the country scored a 16.
              </strong>{' '}
              The highest score in the data is {topScore}, held by{' '}
              {dist[topScore]} {dist[topScore] === 1 ? 'agency' : 'agencies'}.
            </li>
            <li>
              State averages range from{' '}
              <strong className="font-semibold text-slate-900">
                {highest[0].avg.toFixed(1)} in {highest[0].code}
              </strong>{' '}
              down to{' '}
              <strong className="font-semibold text-slate-900">
                {lowest[0].avg.toFixed(1)} in {lowest[0].code}
              </strong>{' '}
              — a spread of {(highest[0].avg - lowest[0].avg).toFixed(1)} points
              among states with at least {MIN_FOR_RANKING} agencies.
            </li>
            <li>
              Between FY2024 and FY2025,{' '}
              <strong className="font-semibold text-slate-900">
                {rose.toLocaleString()} hospices saw their score rise
              </strong>
              , {fell.toLocaleString()} saw it fall, and {same.toLocaleString()}{' '}
              were unchanged.
            </li>
            <li>
              Urban agencies average {urbanAvg.toFixed(1)} against{' '}
              {ruralAvg.toFixed(1)} for rural — a gap of{' '}
              {Math.abs(urbanAvg - ruralAvg).toFixed(1)} points across{' '}
              {urban.length.toLocaleString()} urban and{' '}
              {rural.length.toLocaleString()} rural providers.
            </li>
          </ul>
        </section>

        {/* Concentration */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            Where the hospices are
          </h2>
          <p className="mt-3 text-slate-700">
            The single most striking thing in the data has nothing to do with
            scores. It is how unevenly hospices are distributed. These five
            states hold the most Medicare-certified agencies:
          </p>

          <div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-5">
            {biggest.map((s) => (
              <Link
                key={s.code}
                href={`/hospice/state/${s.code.toLowerCase()}`}
                className="bg-white px-4 py-5 text-center hover:bg-amber-50"
              >
                <div className="text-sm font-semibold text-slate-900">
                  {s.code}
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums text-slate-900">
                  {s.count.toLocaleString()}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  avg {s.avg.toFixed(1)}
                </div>
              </Link>
            ))}
          </div>

          <p className="mt-5 text-slate-700">
            Market structure explains much of this. States with
            certificate-of-need laws for hospice restrict how many agencies can
            operate; states without them do not. The result is that population
            is a poor predictor of how many hospices a state has, and comparing
            raw counts between states with different regulatory regimes is
            misleading.
          </p>
        </section>

        {/* Distribution */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            How scores are distributed
          </h2>
          <p className="mt-3 text-slate-700">
            Scores cluster in the middle. The tails are thin in both directions —
            very few hospices are clean across the board, and very few are
            flagged on nearly everything.
          </p>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="space-y-1.5">
              {dist.map((n, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-6 shrink-0 text-right text-xs tabular-nums text-slate-500">
                    {i}
                  </div>
                  <div className="h-5 flex-1 overflow-hidden rounded bg-slate-100">
                    <div
                      className="h-full rounded bg-amber-700"
                      style={{
                        width: distMax ? `${(n / distMax) * 100}%` : '0%',
                      }}
                    />
                  </div>
                  <div className="w-16 shrink-0 text-right text-xs tabular-nums text-slate-500">
                    {n.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-slate-500">
              FY2025 SSVI score (0&ndash;16) by number of agencies.
            </p>
          </div>
        </section>

        {/* Highest and lowest */}
        <section className="mt-10 grid gap-6 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Highest average SSVI
            </h3>
            <ul className="mt-4 space-y-2">
              {highest.map((s, i) => (
                <li key={s.code} className="flex items-center justify-between">
                  <Link
                    href={`/hospice/state/${s.code.toLowerCase()}`}
                    className="text-sm font-medium text-slate-900 hover:text-amber-700"
                  >
                    {i + 1}. {s.code}
                  </Link>
                  <span className="text-sm tabular-nums text-slate-600">
                    {s.avg.toFixed(1)} · {s.count.toLocaleString()} agencies
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Lowest average SSVI
            </h3>
            <ul className="mt-4 space-y-2">
              {lowest.map((s, i) => (
                <li key={s.code} className="flex items-center justify-between">
                  <Link
                    href={`/hospice/state/${s.code.toLowerCase()}`}
                    className="text-sm font-medium text-slate-900 hover:text-amber-700"
                  >
                    {i + 1}. {s.code}
                  </Link>
                  <span className="text-sm tabular-nums text-slate-600">
                    {s.avg.toFixed(1)} · {s.count.toLocaleString()} agencies
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <p className="mt-4 text-sm text-slate-500">
          Rankings above include only states with at least {MIN_FOR_RANKING}{' '}
          scored agencies. Small states swing heavily on a handful of providers.
        </p>

        {/* Full table */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold text-slate-900">
            Every state and territory, ranked
          </h2>
          <p className="mt-3 text-slate-700">
            Sorted by average FY2025 SSVI. Click any state for the full list of
            agencies and their individual scores.
          </p>

          <div className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">State</th>
                    <th className="px-5 py-3 text-right">Agencies</th>
                    <th className="px-5 py-3 text-right">Avg SSVI</th>
                    <th className="px-5 py-3 text-right">Avg spending</th>
                    <th className="px-5 py-3 text-right">Avg utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {states.map((s) => (
                    <tr key={s.code} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <Link
                          href={`/hospice/state/${s.code.toLowerCase()}`}
                          className="font-medium text-slate-900 hover:text-amber-700"
                        >
                          {s.code}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-600">
                        {s.count.toLocaleString()}
                      </td>
                      <td className="px-5 py-3 text-right font-semibold tabular-nums text-slate-900">
                        {s.avg.toFixed(1)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-600">
                        {s.spend.toFixed(1)}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-600">
                        {s.util.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Methodology */}
        <section className="mt-10 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">
            About the SSVI
          </h2>
          <p className="mt-3 text-slate-700">
            The Service and Spending Variation Index is a 0&ndash;16 score CMS
            introduced in the FY2027 hospice wage index proposed rule
            (CMS-1851-P). It combines a 0&ndash;8 non-hospice spending score,
            based on Medicare spending outside the hospice benefit for an
            agency&apos;s enrolled beneficiaries, with a 0&ndash;8 utilization
            score built from eight claims-based measures &mdash; live discharge
            rate, length of stay over 180 days, nursing facility patient share,
            absence of continuous home care or general inpatient care, visits in
            the last two days of life, skilled nursing minutes, weekend visit
            rate, and return to hospice within seven days.
          </p>
          <p className="mt-4 text-slate-700">
            A higher score means an agency&apos;s claims patterns diverge further
            from peer norms. It is not a quality rating, and it does not
            establish that any agency has done anything wrong. It is one of the
            inputs CMS uses to decide where to focus oversight.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Analysis by Connect Shield using the CMS SSVI data file published
            with CMS-1851-P. Averages are unweighted means across agencies with a
            FY2025 score. {rows.length.toLocaleString()} agencies had a FY2025
            score; agencies without one are excluded. Connect Shield is not
            affiliated with CMS.
          </p>
        </section>

        {/* CTA */}
        <section className="mt-10 rounded-xl bg-slate-900 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">
            Look up a specific agency
          </h2>
          <p className="mt-2 text-slate-300">
            Every Medicare-certified hospice has its own page with the full
            eight-measure breakdown, national and state ranking, and
            year-over-year change. Free, no signup.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/hospice"
              className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-500"
            >
              Search all {rows.length.toLocaleString()} agencies
            </Link>
            <Link
              href="/demo"
              className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Book a demo
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
