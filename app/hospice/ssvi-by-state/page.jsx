import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { SITE } from '@/lib/site'
import SSVIMap from '@/components/SSVIMap'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const revalidate = 86400

export const metadata = {
  title:
    'Hospice SSVI Scores by State — Analysis of All 6,643 Medicare-Certified Agencies | Connect Shield',
  description:
    'The CMS Service and Spending Variation Index is mostly a spending index. An analysis of FY2025 SSVI scores for every Medicare-certified hospice in the United States, ranked by state.',
  alternates: { canonical: `${SITE.url}/hospice/ssvi-by-state` },
  openGraph: {
    type: 'article',
    title: 'Hospice SSVI Scores by State',
    description:
      'Two-thirds of the average hospice SSVI score comes from non-hospice spending, not utilization. An analysis of all 6,643 scored agencies.',
    url: `${SITE.url}/hospice/ssvi-by-state`,
  },
}

const MIN_FOR_RANKING = 20
const PUBLISHED = '2026-07-30'

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

function KeyStat({ label, value, sub }) {
  return (
    <div className="px-5 py-5">
      <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-1.5 text-3xl font-semibold tabular-nums text-slate-900">
        {value}
      </div>
      {sub && <div className="mt-1 text-sm text-slate-500">{sub}</div>}
    </div>
  )
}

export default async function Page() {
  const rows = await fetchAll()

  const nationalAvg = mean(rows.map((r) => r.fy2025_total_ssvi))
  const nationalSpend = mean(rows.map((r) => r.fy2025_spending_score))
  const nationalUtil = mean(rows.map((r) => r.fy2025_utilization_score))
  const spendShare = Math.round((nationalSpend / nationalAvg) * 100)

  // Distribution 0-16
  const dist = Array.from({ length: 17 }, () => 0)
  for (const r of rows) {
    const v = Math.round(Number(r.fy2025_total_ssvi))
    if (v >= 0 && v <= 16) dist[v] += 1
  }
  const distMax = Math.max(...dist)
  const topScore = dist.reduce((acc, n, i) => (n > 0 ? i : acc), 0)

  // Spending score distribution — how many agencies max out at 8
  const spendMaxed = rows.filter(
    (r) => Number(r.fy2025_spending_score) === 8
  ).length
  const utilMaxed = rows.filter(
    (r) => Number(r.fy2025_utilization_score) === 8
  ).length
  const spendMaxedPct = Math.round((spendMaxed / rows.length) * 100)

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
  const grouped = {}
  for (const r of rows) {
    if (!r.state) continue
    if (!grouped[r.state]) grouped[r.state] = []
    grouped[r.state].push(r)
  }

  const states = Object.entries(grouped)
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

  // Composition extremes — most spending-driven and most utilization-driven
  const bySpendTilt = [...ranked].sort(
    (a, b) => b.spend - b.util - (a.spend - a.util)
  )
  const spendTilted = bySpendTilt.slice(0, 3)
  const utilTilted = [...bySpendTilt].reverse().slice(0, 3)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Hospice SSVI Scores by State',
    description:
      'An analysis of FY2025 CMS Service and Spending Variation Index scores for all Medicare-certified hospices in the United States.',
    datePublished: PUBLISHED,
    dateModified: PUBLISHED,
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

      <article className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-16">
        <nav className="mb-8 text-sm text-slate-500">
          <Link href="/hospice" className="hover:text-slate-900">
            Hospice SSVI Scores
          </Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-700">By state</span>
        </nav>

        <header>
          <div className="text-xs font-medium uppercase tracking-wider text-amber-700">
            Analysis
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-4xl">
            The hospice SSVI is mostly a spending index
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-slate-700">
            CMS published a Service and Spending Variation Index score for every
            Medicare-certified hospice in the country. We analyzed all{' '}
            {rows.length.toLocaleString()} of them. Roughly {spendShare}% of the
            average score comes from a single half of the formula &mdash; and two
            agencies with the same score can be there for opposite reasons.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            Published July 30, 2026 · Connect Shield
          </p>
        </header>

        {/* Headline numbers */}
        <div className="mt-10 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-3">
          <div className="bg-white">
            <KeyStat
              label="National average"
              value={`${nationalAvg.toFixed(1)} / 16`}
              sub={`${rows.length.toLocaleString()} scored agencies`}
            />
          </div>
          <div className="bg-white">
            <KeyStat
              label="From spending"
              value={nationalSpend.toFixed(1)}
              sub={`${spendShare}% of the average score`}
            />
          </div>
          <div className="bg-white">
            <KeyStat
              label="From utilization"
              value={nationalUtil.toFixed(1)}
              sub={`${100 - spendShare}% of the average score`}
            />
          </div>
        </div>

        {/* The finding */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            The two halves are not equal
          </h2>
          <p className="mt-4 leading-relaxed text-slate-700">
            The SSVI is built from two components worth eight points each. On
            paper they carry the same weight. In the data they do not. The
            average agency earns {nationalSpend.toFixed(1)} of its{' '}
            {nationalAvg.toFixed(1)} points from non-hospice spending and only{' '}
            {nationalUtil.toFixed(1)} from the eight claims-based utilization
            measures combined.
          </p>
          <p className="mt-4 leading-relaxed text-slate-700">
            {spendMaxed.toLocaleString()} agencies &mdash; {spendMaxedPct}% of
            everyone scored &mdash; sit at the maximum 8 on spending. Only{' '}
            {utilMaxed.toLocaleString()} do on utilization. For most hospices,
            the spending half is doing the work.
          </p>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Most spending-driven
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Largest gap between spending and utilization averages
              </p>
              <ul className="mt-4 space-y-3">
                {spendTilted.map((s) => (
                  <li key={s.code}>
                    <div className="flex items-baseline justify-between">
                      <Link
                        href={`/hospice/state/${s.code.toLowerCase()}`}
                        className="text-sm font-medium text-slate-900 hover:text-amber-700"
                      >
                        {s.code}
                      </Link>
                      <span className="text-sm tabular-nums text-slate-600">
                        {s.avg.toFixed(1)} total
                      </span>
                    </div>
                    <div className="mt-1 text-xs tabular-nums text-slate-500">
                      spending {s.spend.toFixed(1)} · utilization{' '}
                      {s.util.toFixed(1)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Most utilization-driven
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Smallest gap between spending and utilization averages
              </p>
              <ul className="mt-4 space-y-3">
                {utilTilted.map((s) => (
                  <li key={s.code}>
                    <div className="flex items-baseline justify-between">
                      <Link
                        href={`/hospice/state/${s.code.toLowerCase()}`}
                        className="text-sm font-medium text-slate-900 hover:text-amber-700"
                      >
                        {s.code}
                      </Link>
                      <span className="text-sm tabular-nums text-slate-600">
                        {s.avg.toFixed(1)} total
                      </span>
                    </div>
                    <div className="mt-1 text-xs tabular-nums text-slate-500">
                      spending {s.spend.toFixed(1)} · utilization{' '}
                      {s.util.toFixed(1)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-xl border-l-4 border-amber-600 bg-white p-6 sm:p-7">
            <p className="leading-relaxed text-slate-800">
              Two agencies can post the same SSVI and need completely different
              responses. One is a non-hospice spending pattern &mdash; what is
              being billed outside the benefit for its patients. The other is a
              care-pattern issue &mdash; visit timing, length of stay, live
              discharge rates. A ranking tells you neither. Only the composition
              does.
            </p>
          </div>
        </section>

        {/* Map */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Average SSVI by state
          </h2>
          <p className="mt-4 leading-relaxed text-slate-700">
            Darker states have higher average scores. Shading is by rank rather
            than raw value, so differences stay visible across a narrow range.
            Click any state to see its highest-scoring agencies and the split
            between its two halves.
          </p>
          <div className="mt-6">
            <SSVIMap states={states} />
          </div>
        </section>

        {/* Distribution */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            How scores are distributed
          </h2>
          <p className="mt-4 leading-relaxed text-slate-700">
            Scores cluster in the middle and fall off sharply above 8 &mdash; the
            point at which an agency has effectively exhausted one half of the
            formula and has to start accumulating points from the other. No
            hospice in the country scored a 16. The highest is {topScore}, held
            by {dist[topScore]} {dist[topScore] === 1 ? 'agency' : 'agencies'}.
          </p>

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
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

        {/* Movement */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Scores move
          </h2>
          <p className="mt-4 leading-relaxed text-slate-700">
            The SSVI is not a fixed label. Between FY2024 and FY2025,{' '}
            {rose.toLocaleString()} hospices saw their score rise,{' '}
            {fell.toLocaleString()} saw it fall, and {same.toLocaleString()}{' '}
            stayed put &mdash; meaning roughly{' '}
            {Math.round(((rose + fell) / withBoth.length) * 100)}% of agencies
            moved in a single year.
          </p>
          <p className="mt-4 leading-relaxed text-slate-700">
            Urban agencies average {urbanAvg.toFixed(1)} against{' '}
            {ruralAvg.toFixed(1)} for rural, a gap of{' '}
            {Math.abs(urbanAvg - ruralAvg).toFixed(1)} points across{' '}
            {urban.length.toLocaleString()} urban and{' '}
            {rural.length.toLocaleString()} rural providers.
          </p>
        </section>

        {/* Concentration */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Where the hospices are
          </h2>
          <p className="mt-4 leading-relaxed text-slate-700">
            State counts vary far more than population does. These five states
            hold the most Medicare-certified agencies:
          </p>

          <div className="mt-6 grid gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-5">
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

          <p className="mt-5 leading-relaxed text-slate-700">
            Because counts differ this sharply, state averages are not directly
            comparable as market descriptions. A state with{' '}
            {biggest[0].count.toLocaleString()} agencies and one with fewer than
            a hundred are describing very different provider landscapes, even
            when their averages land close together.
          </p>
        </section>

        {/* Rankings */}
        <section className="mt-12 grid gap-6 sm:grid-cols-2">
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
          Rankings include only states with at least {MIN_FOR_RANKING} scored
          agencies. Small states swing heavily on a handful of providers.
        </p>

        {/* Full table */}
        <section className="mt-12">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
            Every state and territory
          </h2>
          <p className="mt-4 leading-relaxed text-slate-700">
            Sorted by average FY2025 SSVI, with each half shown separately.
            Click any state for its full agency list.
          </p>

          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr className="text-left text-xs font-medium uppercase tracking-wider text-slate-500">
                    <th className="px-5 py-3">State</th>
                    <th className="px-5 py-3 text-right">Agencies</th>
                    <th className="px-5 py-3 text-right">Avg SSVI</th>
                    <th className="px-5 py-3 text-right">Spending</th>
                    <th className="px-5 py-3 text-right">Utilization</th>
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
        <section className="mt-12 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-slate-900">
            About the SSVI and this analysis
          </h2>
          <p className="mt-3 leading-relaxed text-slate-700">
            The Service and Spending Variation Index is a 0&ndash;16 score CMS
            introduced in the FY2027 hospice wage index proposed rule
            (CMS-1851-P). It combines a 0&ndash;8 non-hospice spending score,
            based on Medicare spending outside the hospice benefit for an
            agency&apos;s enrolled beneficiaries, with a 0&ndash;8 utilization
            score built from eight claims-based measures: live discharge rate,
            length of stay over 180 days, nursing facility patient share, absence
            of continuous home care or general inpatient care, visits in the last
            two days of life, skilled nursing minutes, weekend visit rate, and
            return to hospice within seven days.
          </p>
          <p className="mt-4 leading-relaxed text-slate-700">
            A higher score means an agency&apos;s claims patterns diverge further
            from peer norms. It is not a quality rating, and it does not
            establish that any agency has done anything wrong. It is one of the
            inputs CMS uses to decide where to focus oversight.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-slate-500">
            Analysis by Connect Shield using the CMS SSVI data file published
            with CMS-1851-P. State figures are unweighted means across agencies
            with a FY2025 score; {rows.length.toLocaleString()} agencies had one,
            and agencies without a score are excluded throughout. Year-over-year
            comparisons use the {withBoth.length.toLocaleString()} agencies with
            both a FY2024 and FY2025 score. The FY2027 rule was proposed, not
            final, at the time of publication; figures reflect the SSVI data file
            as released with the proposed rule. Connect Shield is not affiliated
            with CMS.
          </p>
        </section>

        {/* CTA */}
        <section className="mt-12 rounded-xl bg-slate-900 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">
            Look up a specific agency
          </h2>
          <p className="mt-2 leading-relaxed text-slate-300">
            Every Medicare-certified hospice has its own page showing the full
            eight-measure breakdown, both halves of the score, national and state
            ranking, and year-over-year change. Free, no signup.
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
      </article>
    </div>
  )
}
