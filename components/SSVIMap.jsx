'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { geoAlbersUsa, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import { createClient } from '@supabase/supabase-js'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const ATLAS = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

const FIPS = {
  '01': 'AL', '02': 'AK', '04': 'AZ', '05': 'AR', '06': 'CA', '08': 'CO',
  '09': 'CT', '10': 'DE', '11': 'DC', '12': 'FL', '13': 'GA', '15': 'HI',
  '16': 'ID', '17': 'IL', '18': 'IN', '19': 'IA', '20': 'KS', '21': 'KY',
  '22': 'LA', '23': 'ME', '24': 'MD', '25': 'MA', '26': 'MI', '27': 'MN',
  '28': 'MS', '29': 'MO', '30': 'MT', '31': 'NE', '32': 'NV', '33': 'NH',
  '34': 'NJ', '35': 'NM', '36': 'NY', '37': 'NC', '38': 'ND', '39': 'OH',
  '40': 'OK', '41': 'OR', '42': 'PA', '44': 'RI', '45': 'SC', '46': 'SD',
  '47': 'TN', '48': 'TX', '49': 'UT', '50': 'VT', '51': 'VA', '53': 'WA',
  '54': 'WV', '55': 'WI', '56': 'WY', '72': 'PR',
}

const MAPPED = new Set(Object.values(FIPS))

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

// Map occupies MAP_W; labels live in the gutter to its right.
const MAP_W = 960
const MAP_H = 600
const GUTTER_X = 990
const VIEW_W = 1160
const BOX_W = 66
const BOX_H = 22

// Order matters — these stack top to bottom in the gutter.
const SMALL_ORDER = ['VT', 'NH', 'MA', 'RI', 'CT', 'NJ', 'DE', 'MD', 'DC']
const STACK_TOP = 108
const STACK_GAP = 30

const SMALL = {}
SMALL_ORDER.forEach((code, i) => {
  SMALL[code] = [GUTTER_X, STACK_TOP + i * STACK_GAP]
})

const RAMP = ['#FDF8F1', '#F3E3C9', '#E3C08D', '#CB9A57', '#AE7B36', '#84592A']

export default function SSVIMap({ states }) {
  const byCode = useMemo(() => {
    const m = {}
    for (const s of states) m[s.code] = s
    return m
  }, [states])

  const mappedScored = useMemo(
    () =>
      states
        .filter((s) => s.avg != null && MAPPED.has(s.code))
        .map((s) => s.avg),
    [states]
  )
  const lo = mappedScored.length ? Math.min(...mappedScored) : 0
  const hi = mappedScored.length ? Math.max(...mappedScored) : 16

  const breaks = useMemo(() => {
    const sorted = [...mappedScored].sort((a, b) => a - b)
    const out = []
    for (let i = 1; i < RAMP.length; i++) {
      out.push(sorted[Math.floor((i / RAMP.length) * sorted.length)])
    }
    return out
  }, [mappedScored])

  function bucket(code) {
    const s = byCode[code]
    if (!s || s.avg == null) return -1
    let i = 0
    while (i < breaks.length && s.avg >= breaks[i]) i++
    return i
  }

  function fillFor(code) {
    const b = bucket(code)
    return b < 0 ? '#F1F5F9' : RAMP[b]
  }

  function inkFor(code) {
    const b = bucket(code)
    if (b < 0) return '#94A3B8'
    return b >= 4 ? '#FFFFFF' : '#44403C'
  }

  const [geo, setGeo] = useState(null)
  const [err, setErr] = useState(false)
  const [active, setActive] = useState(null)
  const [hover, setHover] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let dead = false
    fetch(ATLAS)
      .then((r) => r.json())
      .then((topo) => {
        if (dead) return
        setGeo(feature(topo, topo.objects.states))
      })
      .catch(() => {
        if (!dead) setErr(true)
      })
    return () => {
      dead = true
    }
  }, [])

  const { paths, centroids } = useMemo(() => {
    if (!geo) return { paths: [], centroids: {} }
    const proj = geoAlbersUsa().fitSize([MAP_W, MAP_H], geo)
    const path = geoPath(proj)
    const p = []
    const c = {}
    for (const f of geo.features) {
      const code = FIPS[f.id]
      if (!code) continue
      const d = path(f)
      if (!d) continue
      p.push({ code, d })
      const ct = path.centroid(f)
      if (ct && !Number.isNaN(ct[0]) && !Number.isNaN(ct[1])) c[code] = ct
    }
    return { paths: p, centroids: c }
  }, [geo])

  async function pick(code) {
    if (!byCode[code]) return
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
  const tip = hover ? byCode[hover] : null
  const territories = states.filter((s) => !MAPPED.has(s.code))

  return (
    <div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-6">
        {err && (
          <div className="py-10 text-center text-sm text-slate-500">
            The map could not load. All figures are in the table below.
          </div>
        )}

        {!geo && !err && (
          <div className="py-16 text-center text-sm text-slate-400">
            Loading map&hellip;
          </div>
        )}

        {geo && (
          <div className="relative">
            <svg
              viewBox={`0 0 ${VIEW_W} ${MAP_H}`}
              className="w-full"
              role="img"
              aria-label="United States map colored by average hospice SSVI score"
            >
              {paths.map(({ code, d }) => {
                const has = !!byCode[code]
                const isOn = active === code
                return (
                  <path
                    key={code}
                    d={d}
                    fill={fillFor(code)}
                    stroke={isOn ? '#0F172A' : '#FFFFFF'}
                    strokeWidth={isOn ? 2 : 0.75}
                    onClick={() => pick(code)}
                    onMouseEnter={() => setHover(code)}
                    onMouseLeave={() => setHover(null)}
                    style={{ cursor: has ? 'pointer' : 'default' }}
                  />
                )
              })}

              {paths.map(({ code }) => {
                if (SMALL[code]) return null
                const ct = centroids[code]
                const s = byCode[code]
                if (!ct || !s || s.avg == null) return null
                return (
                  <g key={`lbl-${code}`} pointerEvents="none">
                    <text
                      x={ct[0]}
                      y={ct[1] - 2}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="600"
                      fill={inkFor(code)}
                    >
                      {code}
                    </text>
                    <text
                      x={ct[0]}
                      y={ct[1] + 10}
                      textAnchor="middle"
                      fontSize="10"
                      fill={inkFor(code)}
                      opacity="0.85"
                    >
                      {s.avg.toFixed(1)}
                    </text>
                  </g>
                )
              })}

              {SMALL_ORDER.map((code) => {
                const pos = SMALL[code]
                const ct = centroids[code]
                const s = byCode[code]
                if (!pos || !ct || !s || s.avg == null) return null
                const [bx, by] = pos
                const isOn = active === code
                return (
                  <g key={`sm-${code}`}>
                    <line
                      x1={ct[0]}
                      y1={ct[1]}
                      x2={bx}
                      y2={by}
                      stroke="#CBD5E1"
                      strokeWidth="1"
                    />
                    <circle cx={ct[0]} cy={ct[1]} r="2" fill="#94A3B8" />
                    <rect
                      x={bx}
                      y={by - BOX_H / 2}
                      width={BOX_W}
                      height={BOX_H}
                      rx="4"
                      fill={fillFor(code)}
                      stroke={isOn ? '#0F172A' : '#E2E8F0'}
                      strokeWidth={isOn ? 2 : 1}
                      onClick={() => pick(code)}
                      onMouseEnter={() => setHover(code)}
                      onMouseLeave={() => setHover(null)}
                      style={{ cursor: 'pointer' }}
                    />
                    <text
                      x={bx + BOX_W / 2}
                      y={by + 4}
                      textAnchor="middle"
                      fontSize="11"
                      fontWeight="600"
                      fill={inkFor(code)}
                      pointerEvents="none"
                    >
                      {code} {s.avg.toFixed(1)}
                    </text>
                  </g>
                )
              })}
            </svg>

            {tip && tip.avg != null && (
              <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
                <div className="text-sm font-semibold text-slate-900">
                  {NAMES[hover] || hover}
                </div>
                <div className="mt-0.5 text-xs text-slate-600">
                  {tip.count.toLocaleString()}{' '}
                  {tip.count === 1 ? 'agency' : 'agencies'} · avg{' '}
                  {tip.avg.toFixed(1)} of 16
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  spending {tip.spend.toFixed(1)} · utilization{' '}
                  {tip.util.toFixed(1)}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>{lo.toFixed(1)}</span>
          <div className="flex">
            {RAMP.map((c) => (
              <div
                key={c}
                className="h-3 w-8 border border-white"
                style={{ background: c }}
              />
            ))}
          </div>
          <span>{hi.toFixed(1)}</span>
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
                    background: fillFor(s.code),
                    color: inkFor(s.code),
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

      {sel && (
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {NAMES[sel.code] || sel.code}
              </h3>
              <p className="mt-1 text-sm text-slate-600">
                {sel.count.toLocaleString()}{' '}
                {sel.count === 1 ? 'agency' : 'agencies'} · average{' '}
                {sel.avg.toFixed(1)} of 16 · spending {sel.spend.toFixed(1)} ·
                utilization {sel.util.toFixed(1)}
              </p>
            </div>
            <Link
              href={`/hospice/state/${sel.code.toLowerCase()}`}
              className="text-sm font-medium text-amber-700 hover:underline"
            >
              See all {sel.count.toLocaleString()} &rarr;
            </Link>
          </div>

          {loading && (
            <div className="px-5 py-6 text-sm text-slate-500 sm:px-6">
              Loading agencies&hellip;
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
