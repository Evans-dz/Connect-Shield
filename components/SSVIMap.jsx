'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// [col, row] on an 11 x 8 grid. Schematic, not geographic.
const GRID = {
  AK: [0, 0], ME: [10, 0],
  VT: [9, 1], NH: [10, 1],
  WA: [0, 2], ID: [1, 2], MT: [2, 2], ND: [3, 2], MN: [4, 2],
  IL: [5, 2], WI: [6, 2], MI: [7, 2], NY: [9, 2], MA: [10, 2],
  OR: [0, 3], NV: [1, 3], WY: [2, 3], SD: [3, 3], IA: [4, 3],
  IN: [5, 3], OH: [6, 3], PA: [7, 3], NJ: [8, 3], CT: [9, 3], RI: [10, 3],
  CA: [0, 4], UT: [1, 4], CO: [2, 4], NE: [3, 4], MO: [4, 4],
  KY: [5, 4], WV: [6, 4], VA: [7, 4], MD: [8, 4], DE: [9, 4],
  AZ: [1, 5], NM: [2, 5], KS: [3, 5], AR: [4, 5], TN: [5, 5],
  NC: [6, 5], SC: [7, 5], DC: [8, 5],
  OK: [3, 6], LA: [4, 6], MS: [5, 6], AL: [6, 6], GA: [7, 6],
  HI: [0, 7], TX: [3, 7], FL: [8, 7],
}

const NAMES = {
  AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California',
  CO: 'Colorado', CT: 'Connecticut', DE: 'Delaware', DC: 'District of Columbia',
  FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois',
  IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
  ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan',
  MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana',
  NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
  NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota',
  OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania',
  RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
  TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia',
  WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming',
  PR: 'Puerto Rico', GU: 'Guam', VI: 'US Virgin Islands',
  MP: 'Northern Mariana Islands', AS: 'American Samoa',
}

const CELL = 62
const GAP = 6
const COLS = 11
const ROWS = 8

// Sequential bronze ramp, light to dark
const RAMP = ['#FDF8F1', '#F5E6CF', '#E8C89B', '#D4A469', '#B8863F', '#8F6530']

function colorFor(avg, min, max) {
  if (avg == null) return '#F1F5F9'
  const span = max - min || 1
  const t = (avg - min) / span
  const i = Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))
  return RAMP[i]
}

function textFor(avg, min, max) {
  if (avg == null) return '#94A3B8'
  const span = max - min || 1
  return (avg - min) / span > 0.55 ? '#FFFFFF' : '#44403C'
}

export default function SSVIMap({ states }) {
  const byCode = {}
  for (const s of states) byCode[s.code] = s

  const scored = states.filter((s) => s.avg != null).map((s) => s.avg)
  const min = Math.min(...scored)
  const max = Math.max(...scored)

  const [active, setActive] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const territories = states.filter((s) => !GRID[s.code])

  async function pick(code) {
    if (active === code) {
      setActive(null)
      setRows([])
      return
    }
    setActive(code)
    setLoading(true)
    setRows([])
    const { data, error } = await db
      .from('ssvi_public')
      .select('slug, hospice_name, city, fy2025_total_ssvi, ssvi_change')
      .eq('state', code)
      .not('fy2025_total_ssvi', 'is', null)
      .order('fy2025_total_ssvi', { ascending: false })
      .limit(10)
    setRows(error ? [] : data || [])
    setLoading(false)
  }

  const sel = active ? byCode[active] : null

  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        <svg
          viewBox={`0 0 ${COLS * (CELL + GAP)} ${ROWS * (CELL + GAP)}`}
          className="w-full"
          style={{ minWidth: 620 }}
          role="img"
          aria-label="US states colored by average hospice SSVI score"
        >
          {Object.entries(GRID).map(([code, [c, r]]) => {
            const s = byCode[code]
            const avg = s ? s.avg : null
            const isActive = active === code
            return (
              <g
                key={code}
                onClick={() => s && pick(code)}
                style={{ cursor: s ? 'pointer' : 'default' }}
              >
                <rect
                  x={c * (CELL + GAP)}
                  y={r * (CELL + GAP)}
                  width={CELL}
                  height={CELL}
                  rx="6"
                  fill={colorFor(avg, min, max)}
                  stroke={isActive ? '#0F172A' : '#E2E8F0'}
                  strokeWidth={isActive ? 2.5 : 1}
                />
                <text
                  x={c * (CELL + GAP) + CELL / 2}
                  y={r * (CELL + GAP) + CELL / 2 - 4}
                  textAnchor="middle"
                  fontSize="15"
                  fontWeight="600"
                  fill={textFor(avg, min, max)}
                >
                  {code}
                </text>
                <text
                  x={c * (CELL + GAP) + CELL / 2}
                  y={r * (CELL + GAP) + CELL / 2 + 14}
                  textAnchor="middle"
                  fontSize="12"
                  fill={textFor(avg, min, max)}
                  opacity="0.85"
                >
                  {avg == null ? '—' : avg.toFixed(1)}
                </text>
              </g>
            )
          })}
        </svg>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>Lower</span>
          <div className="flex">
            {RAMP.map((c) => (
              <div key={c} className="h-3 w-8" style={{ background: c }} />
            ))}
          </div>
          <span>Higher average SSVI</span>
          <span className="ml-auto">Click a state to see its agencies</span>
        </div>

        {territories.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Territories
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {territories.map((s) => (
                <button
                  key={s.code}
                  onClick={() => pick(s.code)}
                  className="rounded-lg border px-3 py-2 text-sm"
                  style={{
                    background: colorFor(s.avg, min, max),
                    color: textFor(s.avg, min, max),
                    borderColor: active === s.code ? '#0F172A' : '#E2E8F0',
                  }}
                >
                  <span className="font-semibold">{s.code}</span>{' '}
                  <span className="opacity-85">
                    {s.avg == null ? '—' : s.avg.toFixed(1)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {sel && (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {NAMES[sel.code] || sel.code}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {sel.count.toLocaleString()} agencies · average{' '}
                {sel.avg.toFixed(1)} of 16 · spending {sel.spend.toFixed(1)} ·
                utilization {sel.util.toFixed(1)}
              </p>
            </div>
            <Link
              href={`/hospice/state/${sel.code.toLowerCase()}`}
              className="text-sm font-medium text-amber-700 hover:underline"
            >
              See all {sel.count.toLocaleString()} →
            </Link>
          </div>

          {loading && (
            <div className="px-5 py-6 text-sm text-slate-500 sm:px-6">
              Loading agencies…
            </div>
          )}

          {!loading && rows.length > 0 && (
            <>
              <div className="px-5 pt-4 text-xs font-medium uppercase tracking-wider text-slate-500 sm:px-6">
                Highest SSVI in {sel.code}
              </div>
              <ul className="mt-2 divide-y divide-slate-100">
                {rows.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/hospice/${r.slug}`}
                      className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50 sm:px-6"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-900">
                          {r.hospice_name}
                        </span>
                        <span className="block text-xs text-slate-500">
                          {r.city}
                          {r.ssvi_change != null && r.ssvi_change !== 0
                            ? ` · ${r.ssvi_change > 0 ? '+' : ''}${r.ssvi_change} vs FY2024`
                            : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block text-lg font-semibold tabular-nums text-slate-900">
                          {r.fy2025_total_ssvi}
                        </span>
                        <span className="block text-xs text-slate-400">
                          of 16
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}

          {!loading && rows.length === 0 && (
            <div className="px-5 py-6 text-sm text-slate-500 sm:px-6">
              No agencies found.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
