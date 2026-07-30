'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// PostgREST's .or() filter treats commas and parens as syntax.
// Agency names are full of them ("INTEGRITY HOSPICE CARE, LLC"), so strip them.
function sanitize(s) {
  return s.replace(/[^a-zA-Z0-9 &-]/g, '').trim()
}

export default function SSVILookup({
  heading = "Look up your hospice's SSVI score",
  sub = 'Enter your CCN or agency name. Free, no signup, all 6,643 Medicare-certified hospices.',
}) {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [touched, setTouched] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    const clean = sanitize(q)
    if (clean.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    const t = setTimeout(async () => {
      const { data, error } = await db
        .from('ssvi_public')
        .select('slug, ccn, hospice_name, city, state, fy2025_total_ssvi')
        .not('fy2025_total_ssvi', 'is', null)
        .or(`ccn.ilike.${clean}%,hospice_name.ilike.%${clean}%`)
        .order('fy2025_total_ssvi', { ascending: false })
        .limit(8)

      if (cancelled) return
      setResults(error ? [] : data || [])
      setLoading(false)
      setOpen(true)
      setTouched(true)
    }, 250)

    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [q])

  // Close the dropdown on outside click
  useEffect(() => {
    function onDown(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function go(slug) {
    router.push(`/hospice/${slug}`)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && results.length > 0) {
      e.preventDefault()
      go(results[0].slug)
    }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="text-xs font-medium uppercase tracking-wider text-amber-700">
        Free · All 6,643 US hospices
      </div>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
        {heading}
      </h2>
      <p className="mt-2 text-sm text-slate-600">{sub}</p>

      <div ref={boxRef} className="relative mt-5">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="CCN or agency name (e.g. 031635 or Integrity Hospice)"
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder:text-slate-400 focus:border-amber-600 focus:outline-none focus:ring-1 focus:ring-amber-600"
          aria-label="Search by CCN or hospice name"
          autoComplete="off"
        />

        {open && (loading || results.length > 0 || touched) && (
          <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
            {loading && (
              <div className="px-4 py-3 text-sm text-slate-500">Searching…</div>
            )}

            {!loading && results.length === 0 && sanitize(q).length >= 2 && (
              <div className="px-4 py-3 text-sm text-slate-500">
                No match. Try the CCN, or{' '}
                <button
                  onClick={() => router.push('/hospice')}
                  className="font-medium text-amber-700 hover:underline"
                >
                  browse by state
                </button>
                .
              </div>
            )}

            {!loading &&
              results.map((r) => (
                <button
                  key={r.slug}
                  onClick={() => go(r.slug)}
                  className="flex w-full items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 text-left last:border-0 hover:bg-slate-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-slate-900">
                      {r.hospice_name}
                    </span>
                    <span className="block text-xs text-slate-500">
                      CCN {r.ccn}
                      {r.city ? ` · ${r.city}` : ''}
                      {r.state ? `, ${r.state}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-lg font-semibold tabular-nums text-slate-900">
                      {r.fy2025_total_ssvi}
                    </span>
                    <span className="block text-xs text-slate-400">of 16</span>
                  </span>
                </button>
              ))}
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        FY2025 scores from the CMS SSVI data file. Not a quality rating.
      </p>
    </div>
  )
}
