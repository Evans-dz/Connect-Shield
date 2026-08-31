import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import SSVILookup from '@/components/SSVILookup'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export const dynamic = 'force-dynamic'

// Keep display of arbitrary URL input short and boring. CCNs are 6 characters.
function displayCcn(raw) {
  const s = String(raw || '').trim()
  return s.length > 12 ? `${s.slice(0, 12)}…` : s
}

export async function generateMetadata({ params }) {
  const ccn = displayCcn(decodeURIComponent(params.cnn || ''))
  return {
    title: ccn ? `CCN ${ccn} — Hospice SSVI Lookup` : 'Hospice SSVI Lookup',
    description:
      'Look up a Medicare-certified hospice by CCN to see its published FY2025 CMS Service and Spending Variation Index score.',
    // Unscored-CCN pages are an unbounded URL space; keep them out of the index.
    robots: { index: false, follow: true },
  }
}

export default async function Page({ params }) {
  const ccn = decodeURIComponent(params.cnn || '').trim()
  if (!ccn) redirect('/hospice')

  const { data, error } = await db
    .from('ssvi_public')
    .select('slug, fy2025_total_ssvi')
    .ilike('ccn', ccn)
    .limit(1)

  const row = data && data[0]
  if (row && row.fy2025_total_ssvi !== null) {
    redirect(`/hospice/${row.slug}`)
  }

  const shown = displayCcn(ccn)
  const lookupFailed = Boolean(error)

  return (
    <div className="bg-slate-50">
      <div className="mx-auto max-w-4xl px-5 py-10 sm:px-6 sm:py-14">
        <nav className="mb-8 text-sm text-slate-500">
          <Link href="/hospice" className="hover:text-slate-900">
            Hospice SSVI Scores
          </Link>
          <span className="mx-2 text-slate-300">/</span>
          <span className="text-slate-700">CCN {shown}</span>
        </nav>

        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
          {lookupFailed
            ? `CCN ${shown}: lookup temporarily unavailable`
            : `CCN ${shown}: no published FY2025 SSVI score`}
        </h1>

        {lookupFailed ? (
          <p className="mt-4 text-slate-700">
            We couldn&apos;t check this CCN against the CMS SSVI file right now.
            Please try again shortly.
          </p>
        ) : (
          <>
            <p className="mt-4 text-slate-700">
              This CCN is not in the FY2025 SSVI data file CMS published with
              the FY2027 hospice final rule. That file covers roughly 6,643
              Medicare-certified hospices &mdash; but not all of them.
            </p>
            <p className="mt-3 text-slate-700">
              Agencies that are new to Medicare, and agencies with too few
              claims to meet CMS reporting thresholds, are excluded from the
              file. No published score does not mean a score of zero &mdash; it
              means CMS did not calculate one.
            </p>
          </>
        )}

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-slate-900">
            Search by agency name or CCN
          </h2>
          <div className="mt-4">
            <SSVILookup />
          </div>
        </div>

        <section className="mt-10 rounded-xl bg-slate-900 p-6 sm:p-8">
          <h2 className="text-lg font-semibold text-white">
            Is this your agency?
          </h2>
          <p className="mt-2 text-slate-300">
            Connect Shield tracks your compliance picture even before CMS
            publishes a score for you &mdash; PEPPER, CAHPS, QAPI, and
            PS&amp;R in one dashboard.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/demo"
              className="rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-500"
            >
              Book a demo
            </Link>
            <Link
              href="/hospice"
              className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-800"
            >
              Browse all states
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
