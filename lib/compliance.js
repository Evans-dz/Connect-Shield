// lib/compliance.js
// ─────────────────────────────────────────────────────────────────────────────
// Connect Shield — deterministic compliance scoring.
//
// EVERY number a hospice owner sees is calculated HERE, in plain JavaScript,
// from values extracted off their reports. No language model performs any
// arithmetic or assigns any score. The same inputs always produce the same
// output, and every figure can be traced back to the line on the report it
// came from.
//
// This file has no imports on purpose. No React, no Supabase, no fetch. It is
// pure input -> output so it can be tested in isolation and reasoned about by
// someone who is not a programmer.
//
// ── HOW TO CHANGE THE SCORING ───────────────────────────────────────────────
// Everything a domain expert would want to adjust lives in the SCORING object
// directly below. Weights decide how much each signal matters relative to the
// others. Bands decide what a given value is worth. Ceilings are hard caps that
// stop the index from ever looking reassuring while a severe, quantified
// problem exists. Editing those numbers changes the product. Nothing below the
// SCORING object needs to be touched.
// ─────────────────────────────────────────────────────────────────────────────

// CMS aggregate cap amount per beneficiary, by cap year (ending 09/30).
// Add a new line each year when CMS publishes the updated amount.
export const CAP_AMOUNTS = {
  2024: 33494.01,
  2025: 34159.74,
  2026: 34738.63,
};

export const SCORING = {
  // ── Relative importance of each signal. These are the numbers to review with
  //    someone who has run a hospice. They do not need to add to 100 — the
  //    composite is a weighted average across whichever signals have data.
  weights: {
    capExposure: 30,   // a cap overage is real money owed back to CMS
    ssvi: 25,          // CMS-published, publicly visible, drives program integrity review
    rnIntensity: 15,   // skilled nursing delivered per day of care
    lengthOfStay: 10,  // eligibility and long-stay exposure
    pepper: 10,        // improper-payment target areas
    cahps: 5,          // caregiver experience
    qapi: 5,           // required program completeness
  },

  // ── What a given value is worth, 0-100. `upTo` bands are read top to bottom
  //    and the first one the value falls under wins. `atLeast` bands are read
  //    top to bottom and the first one the value meets or exceeds wins.
  bands: {
    // Percent of the aggregate cap limit consumed. Lower is better.
    capUtilizationPct: [
      { upTo: 85, score: 100, label: "Comfortably under cap" },
      { upTo: 95, score: 80, label: "Approaching cap" },
      { upTo: 100, score: 60, label: "At the cap limit" },
      { upTo: 105, score: 35, label: "Over cap" },
      { upTo: 115, score: 22, label: "Materially over cap" },
      { upTo: Infinity, score: 10, label: "Substantially over cap" },
    ],

    // Total SSVI, 0-16 as published by CMS. Lower is better.
    ssviTotal: [
      { upTo: 4, score: 100, label: "Low variation" },
      { upTo: 7, score: 75, label: "Moderate variation" },
      { upTo: 9, score: 55, label: "Elevated variation" },
      { upTo: 12, score: 35, label: "High variation" },
      { upTo: 16, score: 15, label: "Severe variation" },
    ],

    // Revenue code 0551 units (15-minute increments) per Medicare day.
    // Higher is better. Below 1.0 is the threshold CMS scrutiny keys on.
    rnUnitsPerDay: [
      { atLeast: 1.5, score: 100, label: "Strong RN coverage" },
      { atLeast: 1.0, score: 85, label: "Adequate RN coverage" },
      { atLeast: 0.75, score: 60, label: "Below the 1.0 threshold" },
      { atLeast: 0.5, score: 40, label: "Well below threshold" },
      { atLeast: 0, score: 20, label: "Minimal skilled nursing per day" },
    ],

    // Average length of stay in days. Lower is generally better for exposure.
    avgLengthOfStay: [
      { upTo: 90, score: 100, label: "At or below national average" },
      { upTo: 120, score: 85, label: "Above national average" },
      { upTo: 180, score: 65, label: "Long-stay exposure building" },
      { upTo: 240, score: 40, label: "Significant long-stay exposure" },
      { upTo: Infinity, score: 25, label: "Severe long-stay exposure" },
    ],

    // Share of PEPPER target areas at or above the 80th percentile.
    pepperOutlierShare: [
      { upTo: 0, score: 100, label: "No high outliers" },
      { upTo: 0.2, score: 75, label: "One area flagged" },
      { upTo: 0.4, score: 55, label: "Several areas flagged" },
      { upTo: 0.6, score: 40, label: "Many areas flagged" },
      { upTo: Infinity, score: 25, label: "Majority of areas flagged" },
    ],

    // CAHPS overall score measured against the national average, in points.
    // Higher is better; positive means above national.
    cahpsVsNational: [
      { atLeast: 0, score: 100, label: "At or above national average" },
      { atLeast: -3, score: 85, label: "Slightly below national" },
      { atLeast: -7, score: 65, label: "Below national" },
      { atLeast: -12, score: 45, label: "Well below national" },
      { atLeast: -100, score: 30, label: "Far below national" },
    ],

    // Share of the 8 required QAPI components documented under 42 CFR 418.58.
    qapiCompleteness: [
      { atLeast: 1, score: 100, label: "All components documented" },
      { atLeast: 0.875, score: 85, label: "One component missing" },
      { atLeast: 0.75, score: 70, label: "Two components missing" },
      { atLeast: 0.5, score: 45, label: "Several components missing" },
      { atLeast: 0, score: 25, label: "Program substantially incomplete" },
    ],
  },

  // ── Hard caps. If the stated condition is true, the composite index cannot
  //    exceed the given value no matter how clean everything else is. This is
  //    what stops the index from reading "80 / Medium Risk" while the agency
  //    owes CMS money.
  ceilings: [
    {
      id: "over_cap",
      max: 60,
      test: (f) => f.capUtilizationPct != null && f.capUtilizationPct >= 100,
      reason: "Net reimbursement exceeds the aggregate cap limit",
    },
    {
      id: "ssvi_review_range",
      max: 65,
      test: (f) => f.ssviTotal != null && f.ssviTotal >= 10,
      reason: "SSVI is at or above 10, the range CMS associates with program integrity review",
    },
    {
      id: "condition_level_deficiency",
      max: 55,
      test: (f) => f.surveyConditionLevel === true,
      reason: "A condition-level survey deficiency is on file",
    },
  ],

  // Below this many contributing signals, we report the score as provisional
  // rather than presenting it as a settled figure.
  minSignalsForConfidence: 3,
};

// ── Numeric helpers ─────────────────────────────────────────────────────────
// Everything that reaches this file may be null, a string from a report, or a
// number. num() is the single gate: anything that isn't a usable finite number
// becomes null, and null propagates rather than silently becoming zero.
function num(v) {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[$,\s%]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function divide(a, b) {
  const x = num(a);
  const y = num(b);
  if (x == null || y == null || y === 0) return null;
  return x / y;
}

function round(n, dp = 0) {
  if (n == null) return null;
  const f = Math.pow(10, dp);
  return Math.round(n * f) / f;
}

// Read a value against a band table. Returns { score, label } or null when the
// value is unusable, so a missing input never scores as zero.
function pickBand(value, bands) {
  const v = num(value);
  if (v == null || !Array.isArray(bands)) return null;
  for (const b of bands) {
    if (b.upTo != null && v <= b.upTo) return { score: b.score, label: b.label };
    if (b.atLeast != null && v >= b.atLeast) return { score: b.score, label: b.label };
  }
  const last = bands[bands.length - 1];
  return last ? { score: last.score, label: last.label } : null;
}

// ── Derived metrics ─────────────────────────────────────────────────────────
/**
 * Recalculate every derived figure from the raw values extracted off the
 * reports. Nothing here trusts a number the model calculated — only the raw
 * counts it read off the page.
 *
 * @param {object} raw
 * @param {number} raw.totalMedicareDays        PS&R statistic section
 * @param {number} raw.totalUnduplicatedCensus  PS&R statistic section
 * @param {number} raw.snVisitUnits             PS&R charge section, revenue code 0551
 * @param {number} raw.netReimbursement         PS&R reimbursement section, after sequestration
 * @param {number} raw.grossReimbursement       PS&R reimbursement section, before sequestration
 * @param {number} raw.totalBeneficiaryCount    Beneficiary Count report, total count
 * @param {number|string} raw.capYear           Cap year ending 09/30
 * @param {number} raw.perBeneficiaryCap        Optional override of the CMS amount
 * @returns {object} derived metrics, each null when its inputs are missing
 */
export function deriveMetrics(raw = {}) {
  const medicareDays = num(raw.totalMedicareDays);
  const census = num(raw.totalUnduplicatedCensus);
  const snUnits = num(raw.snVisitUnits);
  const net = num(raw.netReimbursement);
  const gross = num(raw.grossReimbursement);
  const beneficiaries = num(raw.totalBeneficiaryCount);

  const capYear = num(raw.capYear);
  const perBeneficiaryCap =
    num(raw.perBeneficiaryCap) ??
    (capYear != null ? CAP_AMOUNTS[capYear] ?? null : null);

  // EXACT values drive scoring; rounded values are for display only.
  // This matters: RN intensity of 0.9955 is BELOW the 1.0 threshold CMS keys on,
  // but rounds to 1.00. Banding the rounded figure would score it as passing.
  const avgLengthOfStayExact = divide(medicareDays, census);
  const rnUnitsPerDayExact = divide(snUnits, medicareDays);

  const avgLengthOfStay = round(avgLengthOfStayExact, 1);
  const rnUnitsPerDay = round(rnUnitsPerDayExact, 2);

  const capLimit =
    beneficiaries != null && perBeneficiaryCap != null
      ? round(beneficiaries * perBeneficiaryCap, 2)
      : null;

  const capExposure =
    capLimit != null && net != null ? round(net - capLimit, 2) : null;

  const capUtilizationPctExact =
    capLimit != null && net != null && capLimit !== 0 ? (net / capLimit) * 100 : null;
  const capUtilizationPct = round(capUtilizationPctExact, 1);

  const sequestration =
    gross != null && net != null ? round(gross - net, 2) : null;

  return {
    totalMedicareDays: medicareDays,
    totalUnduplicatedCensus: census,
    snVisitUnits: snUnits,
    grossReimbursement: gross,
    netReimbursement: net,
    sequestration,
    avgLengthOfStay,
    rnUnitsPerDay,
    totalBeneficiaryCount: beneficiaries,
    perBeneficiaryCap,
    capYear: capYear != null ? String(capYear) : raw.capYear ?? null,
    capLimit,
    capExposure,
    capUtilizationPct,
    // Period labels exactly as printed on the source reports. These travel with
    // every cap figure so the comparison is never anonymous.
    reimbursementPeriod: raw.reimbursementPeriod || null,
    capYearPeriod: raw.capYearPeriod || null,
    // Unrounded values. Scoring reads these; the UI reads the rounded ones above.
    exact: {
      avgLengthOfStay: avgLengthOfStayExact,
      rnUnitsPerDay: rnUnitsPerDayExact,
      capUtilizationPct: capUtilizationPctExact,
    },
  };
}

// ── Extraction validation ───────────────────────────────────────────────────
// THIS IS THE PLUG-AND-PLAY LAYER.
//
// Scoring is already identical for every clinic — it is pure arithmetic over
// named fields. The part that varies clinic to clinic is EXTRACTION: fiscal year
// ends differ (12/31 vs 09/30), the number of populated period columns differs,
// PDF quality differs. No prompt is reliable enough across thousands of agencies
// on its own.
//
// So instead of trusting the read, we check it against arithmetic that MUST hold
// on any correctly-read report. When a check fails, the affected figures are
// suppressed rather than scored, and the failure is reported. A clinic sees
// "we could not read this reliably" instead of a confident wrong number.
//
// The checks below are what caught a real production bug: gross minus net did
// not equal the stated sequestration, which meant the extraction had pulled
// figures from two different period columns of the same PS&R.
export const VALIDATION = {
  // Dollar checksums allow a small tolerance for cent-level rounding on reports.
  dollarTolerance: 1.0,
  // A hospice cannot serve more unique patients than it billed days of care.
  maxPlausibleLOS: 1000,
  minPlausibleLOS: 1,
};

function issue(severity, field, message) {
  return { severity, field, message };
}

/**
 * Check a single PS&R period for internal consistency. Every rule here must hold
 * on any correctly-extracted PS&R 810 from any provider.
 *
 * @returns {{ ok: boolean, issues: Array }}
 */
export function checkPsrIntegrity(p = {}) {
  const issues = [];
  const days = num(p.totalMedicareDays);
  const census = num(p.totalUnduplicatedCensus);
  const sn = num(p.snVisitUnits);
  const gross = num(p.grossReimbursement);
  const seq = num(p.sequestration);
  const net = num(p.netReimbursement);

  // 1. The reimbursement identity. Gross minus sequestration equals net on every
  //    PS&R. If it doesn't, the three figures did not come from one column.
  if (gross != null && net != null && seq != null) {
    const implied = gross - net;
    if (Math.abs(implied - seq) > VALIDATION.dollarTolerance) {
      issues.push(issue("error", "reimbursement",
        `Gross minus net is ${implied.toFixed(2)} but the report states sequestration of ${seq.toFixed(2)}. These figures appear to come from different reporting periods.`));
    }
  } else if (gross != null && net != null && seq == null) {
    // The checksum is the main defence against a mixed-column read. When
    // sequestration is missing we CANNOT run it, and silence would look like a
    // pass. Say so explicitly instead — unverified is not the same as verified.
    issues.push(issue("warning", "reimbursement",
      "Sequestration was not captured, so gross and net reimbursement could not be cross-checked. These figures are unverified — re-upload the PS&R 810 to confirm they come from the same reporting period."));
  }
  // 2. Net can never exceed gross.
  if (gross != null && net != null && net > gross + VALIDATION.dollarTolerance) {
    issues.push(issue("error", "reimbursement", "Net reimbursement exceeds gross reimbursement, which is not possible."));
  }
  // 3. Days must cover at least one day per unique patient.
  if (days != null && census != null && census > 0 && days < census) {
    issues.push(issue("error", "statistic", `Medicare days (${days}) is fewer than unduplicated census (${census}), which is not possible.`));
  }
  // 4. Implied length of stay must be within a plausible range.
  if (days != null && census != null && census > 0) {
    const los = days / census;
    if (los < VALIDATION.minPlausibleLOS || los > VALIDATION.maxPlausibleLOS) {
      issues.push(issue("error", "statistic", `Implied average length of stay of ${los.toFixed(1)} days is outside a plausible range.`));
    }
  }
  // 5. A period with billed days but no skilled nursing units usually means the
  //    0551 quantity was read from the wrong sub-column.
  if (days != null && days > 0 && (sn == null || sn === 0)) {
    issues.push(issue("warning", "snVisitUnits",
      "No skilled nursing units found against billed Medicare days. On the PS&R the 0551 quantity sits under 'Hours/15 Min. Increments', not 'UNITS'."));
  }
  // 6. Negative values never appear on these reports.
  [["totalMedicareDays", days], ["totalUnduplicatedCensus", census], ["snVisitUnits", sn],
   ["grossReimbursement", gross], ["netReimbursement", net]].forEach(([k, v]) => {
    if (v != null && v < 0) issues.push(issue("error", k, `${k} came back negative.`));
  });

  return { ok: !issues.some((i) => i.severity === "error"), issues };
}

/** Check the Beneficiary Count figures. */
export function checkCapIntegrity(c = {}) {
  const issues = [];
  const full = num(c.fullBeneficiaryCount);
  const frac = num(c.fractionalBeneficiaryCount);
  const total = num(c.totalBeneficiaryCount);

  // Full plus fractional equals total on every Beneficiary Count Summary.
  if (full != null && frac != null && total != null) {
    if (Math.abs(full + frac - total) > 0.01) {
      issues.push(issue("error", "beneficiaryCount",
        `Full (${full}) plus fractional (${frac}) does not equal the stated total (${total}).`));
    }
  }
  if (total != null && total <= 0) {
    issues.push(issue("error", "beneficiaryCount", "Total beneficiary count is zero or negative."));
  }
  // The cap year should match the end year of the identification period.
  const capYear = num(c.capYear);
  const periodEndYear = (() => {
    const m = String(c.capYearPeriod || "").match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*$/);
    if (!m) return null;
    let y = parseInt(m[3], 10);
    if (m[3].length === 2) y += y >= 70 ? 1900 : 2000;
    return y;
  })();
  if (capYear != null && periodEndYear != null && capYear !== periodEndYear) {
    issues.push(issue("warning", "capYear",
      `Cap year ${capYear} does not match the end year of the identification period (${periodEndYear}).`));
  }
  if (capYear != null && CAP_AMOUNTS[capYear] == null) {
    issues.push(issue("warning", "capYear",
      `No published per-beneficiary cap amount on file for cap year ${capYear}. Add it to CAP_AMOUNTS in lib/compliance.js.`));
  }
  return { ok: !issues.some((i) => i.severity === "error"), issues };
}

/**
 * Pick which PS&R period to score from. The report carries up to four columns;
 * rather than asking a model to choose, every period is validated and the most
 * recent one that passes is selected. Works the same for a 12/31 fiscal year end
 * as for a 09/30 one, because it reads the printed period labels.
 */
export function selectPeriod(periods = []) {
  const rejected = [];
  const candidates = [];

  (Array.isArray(periods) ? periods : []).forEach((p) => {
    const days = num(p?.totalMedicareDays);
    if (days == null || days === 0) return; // empty future column, not a failure
    const check = checkPsrIntegrity(p);
    const endTs = periodEndTimestamp(p?.reimbursementPeriod);
    if (check.ok) candidates.push({ period: p, endTs, issues: check.issues });
    else rejected.push({ period: p, issues: check.issues });
  });

  candidates.sort((a, b) => (b.endTs || 0) - (a.endTs || 0));
  return {
    selected: candidates[0]?.period || null,
    warnings: candidates[0]?.issues || [],
    rejected,
    considered: candidates.length + rejected.length,
  };
}

// Parse the end of a printed period label like "01/01/26 - 12/31/26".
function periodEndTimestamp(label) {
  if (!label) return 0;
  const dates = [...String(label).matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g)].map((m) => {
    let y = parseInt(m[3], 10);
    if (m[3].length === 2) y += y >= 70 ? 1900 : 2000;
    return Date.UTC(y, parseInt(m[1], 10) - 1, parseInt(m[2], 10));
  });
  return dates.length ? Math.max(...dates) : 0;
}

/**
 * Full validation pass over an extraction. Returns every issue found, and which
 * signal families should be suppressed because their inputs cannot be trusted.
 */
export function validateExtraction({ psr = null, cap = null } = {}) {
  const issues = [];
  const suppress = new Set();

  if (psr) {
    const r = checkPsrIntegrity(psr);
    issues.push(...r.issues);
    if (!r.ok) {
      // Reimbursement errors poison the cap ratio; statistic errors poison LOS
      // and RN intensity. Suppress precisely, not wholesale.
      r.issues.filter((i) => i.severity === "error").forEach((i) => {
        if (i.field === "reimbursement") suppress.add("capExposure");
        if (i.field === "statistic") { suppress.add("lengthOfStay"); suppress.add("rnIntensity"); }
      });
    }
  }
  if (cap) {
    const r = checkCapIntegrity(cap);
    issues.push(...r.issues);
    if (!r.ok) suppress.add("capExposure");
  }

  return {
    ok: !issues.some((i) => i.severity === "error"),
    issues,
    suppress: [...suppress],
  };
}

// ── Signals ─────────────────────────────────────────────────────────────────
// One signal per thing we can measure. A signal only exists when the data
// behind it exists. Missing data produces no signal at all, rather than a zero
// that would drag the score down or a default that would prop it up.
// Describe exactly which two windows the cap ratio compared, so the number can
// always be traced. `aligned` is true only when the reimbursement period and the
// cap year are the same window — which is the case for a provider whose fiscal
// year end is 09/30, and not the case for a 12/31 FYE.
function describeCapWindows(metrics = {}) {
  const reimb = metrics.reimbursementPeriod || null;   // e.g. "01/01/26 - 12/31/26"
  const capYr = metrics.capYearPeriod || null;         // e.g. "10/01/25 - 09/30/26"
  const aligned = !!(reimb && capYr && reimb === capYr);
  let note;
  if (!reimb && !capYr) {
    note = "Neither the reimbursement period nor the cap year was captured from the source reports";
  } else if (!capYr) {
    note = `Reimbursement covers ${reimb}; the cap year was not captured from the Beneficiary Count report`;
  } else if (!reimb) {
    note = `Cap year covers ${capYr}; the reimbursement period was not captured from the PS&R`;
  } else if (aligned) {
    note = `Reimbursement and cap year both cover ${reimb}`;
  } else {
    note = `Reimbursement covers ${reimb}; cap year covers ${capYr}`;
  }
  return { reimbursementPeriod: reimb, capYearPeriod: capYr, aligned, note, complete: !!(reimb && capYr) };
}

function signal(id, label, score, weight, source, basis, value) {
  return { id, label, score, weight, source, basis, value };
}

/**
 * Build the list of scoreable signals from whatever this clinic has on file.
 *
 * @param {object} input
 * @param {object} input.metrics  output of deriveMetrics()
 * @param {object} input.ssvi     resolved CMS SSVI ({ total, year, ... }) or null
 * @param {object} input.pepper   PEPPER card analysis or null
 * @param {object} input.cahps    CAHPS card analysis or null
 * @param {object} input.qapi     QAPI card analysis or null
 * @returns {Array} signals
 */
export function buildSignals({ metrics = {}, ssvi = null, pepper = null, cahps = null, qapi = null, suppress = [] } = {}) {
  const W = SCORING.weights;
  const B = SCORING.bands;
  const out = [];
  // Signals whose inputs failed validation are never scored. A suppressed signal
  // simply does not exist, so it cannot drag the composite down or prop it up —
  // it lowers coverage instead, which is reported honestly to the clinic.
  const blocked = new Set(suppress || []);

  // CAP exposure — only when we could actually compute a cap limit.
  //
  // IMPORTANT, and validated against EMHospice's billing system in Aug 2026:
  // this divides reimbursement for the PS&R period by the cap limit for the cap
  // year. Those two windows are NOT the same. A PS&R from a provider with a
  // 12/31 fiscal year end reports calendar years; the cap year runs 10/01-09/30.
  // A calendar year of reimbursement therefore covers patients spanning TWO cap
  // years, while the beneficiary count covers one.
  //
  // For a fast-growing agency the recent months dominate both windows and the
  // figures converge — EMHospice's $149K exposure matched their MAC cap number
  // from billing. For a flat-census agency, or one with a September FYE, they
  // will not converge. So both windows travel with the number, and the UI and
  // PDF print them, rather than presenting a bare percentage with no basis.
  if (metrics.capUtilizationPct != null && !blocked.has("capExposure")) {
    const b = pickBand(metrics.exact?.capUtilizationPct ?? metrics.capUtilizationPct, B.capUtilizationPct);
    if (b) {
      const windows = describeCapWindows(metrics);
      const s = signal(
        "capExposure",
        "Medicare aggregate CAP",
        b.score,
        W.capExposure,
        "PS&R 810 + Beneficiary Count",
        `${b.label} — ${metrics.capUtilizationPct}% of the aggregate cap limit`,
        metrics.capUtilizationPct
      );
      s.windows = windows;
      s.periodsAligned = windows.aligned;
      out.push(s);
    }
  }

  // SSVI — CMS published only. An estimate never scores here.
  const ssviTotal = num(ssvi?.total);
  if (ssviTotal != null) {
    const b = pickBand(ssviTotal, B.ssviTotal);
    if (b) {
      out.push(
        signal(
          "ssvi",
          "CMS SSVI",
          b.score,
          W.ssvi,
          `CMS published provider data (FY${ssvi.year})`,
          `${b.label} — ${ssviTotal} of 16`,
          ssviTotal
        )
      );
    }
  }

  // RN visit intensity.
  if (metrics.rnUnitsPerDay != null && !blocked.has("rnIntensity")) {
    const exactRn = metrics.exact?.rnUnitsPerDay ?? metrics.rnUnitsPerDay;
    const b = pickBand(exactRn, B.rnUnitsPerDay);
    if (b) {
      // Show 3 decimals so a value like 0.996 doesn't display as "1" alongside
      // the words "below the 1.0 threshold".
      const shown = Math.abs(exactRn - Math.round(exactRn * 100) / 100) > 1e-9 || Math.abs(exactRn - 1) < 0.01
        ? exactRn.toFixed(3)
        : String(metrics.rnUnitsPerDay);
      out.push(
        signal(
          "rnIntensity",
          "RN visit intensity",
          b.score,
          W.rnIntensity,
          "PS&R 810, revenue code 0551",
          `${b.label} — ${shown} units per Medicare day`,
          exactRn
        )
      );
    }
  }

  // Length of stay.
  if (metrics.avgLengthOfStay != null && !blocked.has("lengthOfStay")) {
    const b = pickBand(metrics.exact?.avgLengthOfStay ?? metrics.avgLengthOfStay, B.avgLengthOfStay);
    if (b) {
      out.push(
        signal(
          "lengthOfStay",
          "Average length of stay",
          b.score,
          W.lengthOfStay,
          "PS&R 810 statistic section",
          `${b.label} — ${metrics.avgLengthOfStay} days`,
          metrics.avgLengthOfStay
        )
      );
    }
  }

  // PEPPER outliers.
  const outliers = num(pepper?.outlierCount);
  const areas =
    num(pepper?.targetAreaCount) ??
    (Array.isArray(pepper?.targetAreas) ? pepper.targetAreas.length : null);
  if (outliers != null && areas != null && areas > 0) {
    const share = outliers / areas;
    const b = pickBand(share, B.pepperOutlierShare);
    if (b) {
      out.push(
        signal(
          "pepper",
          "PEPPER target areas",
          b.score,
          W.pepper,
          "PEPPER report",
          `${b.label} — ${outliers} of ${areas} at or above the 80th percentile`,
          share
        )
      );
    }
  }

  // CAHPS against the national average.
  const cahpsScore = num(cahps?.cahpsOverallScore);
  const cahpsNat = num(cahps?.cahpsNationalAvg);
  if (cahpsScore != null && cahpsNat != null) {
    const delta = round(cahpsScore - cahpsNat, 1);
    const b = pickBand(delta, B.cahpsVsNational);
    if (b) {
      out.push(
        signal(
          "cahps",
          "CAHPS caregiver experience",
          b.score,
          W.cahps,
          "CAHPS Hospice Survey results",
          `${b.label} — ${cahpsScore}% against a national average of ${cahpsNat}%`,
          delta
        )
      );
    }
  }

  // QAPI completeness.
  const documented = num(qapi?.componentsDocumented);
  const total = num(qapi?.componentsTotal) || 8;
  if (documented != null && total > 0) {
    const share = documented / total;
    const b = pickBand(share, B.qapiCompleteness);
    if (b) {
      out.push(
        signal(
          "qapi",
          "QAPI program",
          b.score,
          W.qapi,
          "QAPI program document, 42 CFR 418.58",
          `${b.label} — ${documented} of ${total} components documented`,
          share
        )
      );
    }
  }

  return out;
}

// ── Composite ───────────────────────────────────────────────────────────────
/**
 * Weighted average across whichever signals have data, then apply severity
 * ceilings. Scoring only over what is actually on file is what stops the index
 * from moving when a new report type arrives without the agency changing.
 *
 * @returns {object} { score, provisional, signals, coverage, ceiling, trace }
 */
export function computeComposite(signals = [], facts = {}) {
  if (!Array.isArray(signals) || signals.length === 0) {
    return {
      score: null,
      provisional: true,
      signals: [],
      coverage: { counted: 0, possible: Object.keys(SCORING.weights).length, missing: Object.keys(SCORING.weights) },
      ceiling: null,
      trace: [],
    };
  }

  let weighted = 0;
  let weightTotal = 0;
  const trace = [];

  for (const s of signals) {
    const w = num(s.weight) || 0;
    const sc = num(s.score);
    if (sc == null || w <= 0) continue;
    weighted += sc * w;
    weightTotal += w;
    trace.push({
      label: s.label,
      score: sc,
      weight: w,
      basis: s.basis,
      source: s.source,
      contribution: round((sc * w) / 100, 2),
    });
  }

  if (weightTotal === 0) {
    return { score: null, provisional: true, signals, coverage: { counted: 0, possible: Object.keys(SCORING.weights).length, missing: [] }, ceiling: null, trace: [] };
  }

  const raw = weighted / weightTotal;
  let score = Math.round(raw);

  // Severity ceilings.
  let ceiling = null;
  for (const c of SCORING.ceilings) {
    let hit = false;
    try {
      hit = !!c.test(facts);
    } catch {
      hit = false;
    }
    if (hit && score > c.max) {
      score = c.max;
      ceiling = { id: c.id, max: c.max, reason: c.reason };
      break;
    }
  }

  const present = new Set(signals.map((s) => s.id));
  const possibleIds = Object.keys(SCORING.weights);
  const missing = possibleIds.filter((id) => !present.has(id));

  return {
    score,
    rawScore: round(raw, 1),
    provisional: trace.length < SCORING.minSignalsForConfidence,
    signals,
    coverage: { counted: trace.length, possible: possibleIds.length, missing },
    ceiling,
    trace,
  };
}

// ── One call the app makes ──────────────────────────────────────────────────
/**
 * The single entry point. Give it the raw extracted values and whatever report
 * cards exist; get back every derived metric plus a composite index that is
 * reproducible, explainable, and cannot contradict its own components.
 *
 * @param {object} input
 * @param {object} input.raw     raw extracted values (see deriveMetrics)
 * @param {object} input.ssvi    resolved CMS SSVI or null
 * @param {object} input.pepper  PEPPER card analysis or null
 * @param {object} input.cahps   CAHPS card analysis or null
 * @param {object} input.qapi    QAPI card analysis or null
 * @param {object} input.quality optional quality metrics (survey flags)
 */
export function computeCompliance({ raw = {}, ssvi = null, pepper = null, cahps = null, qapi = null, quality = null } = {}) {
  // A PS&R carries up to four period columns. When the extraction supplies them
  // all, code validates each and picks the most recent one that passes rather
  // than trusting a model to choose. Flat input still works for older records.
  let periodPick = null;
  let source = raw;
  if (Array.isArray(raw.periods) && raw.periods.length) {
    periodPick = selectPeriod(raw.periods);
    source = { ...raw, ...(periodPick.selected || {}) };
    delete source.periods;
  }

  const validation = validateExtraction({
    psr: {
      totalMedicareDays: source.totalMedicareDays,
      totalUnduplicatedCensus: source.totalUnduplicatedCensus,
      snVisitUnits: source.snVisitUnits,
      grossReimbursement: source.grossReimbursement,
      sequestration: source.sequestration,
      netReimbursement: source.netReimbursement,
    },
    cap: source.totalBeneficiaryCount != null || source.capYear
      ? {
          fullBeneficiaryCount: source.fullBeneficiaryCount,
          fractionalBeneficiaryCount: source.fractionalBeneficiaryCount,
          totalBeneficiaryCount: source.totalBeneficiaryCount,
          capYear: source.capYear,
          capYearPeriod: source.capYearPeriod,
        }
      : null,
  });

  const metrics = deriveMetrics(source);
  const signals = buildSignals({ metrics, ssvi, pepper, cahps, qapi, suppress: validation.suppress });

  const facts = {
    capUtilizationPct: validation.suppress.includes("capExposure") ? null : metrics.capUtilizationPct,
    ssviTotal: num(ssvi?.total),
    surveyConditionLevel: quality?.surveyConditionLevel === true,
  };

  const composite = computeComposite(signals, facts);

  return {
    metrics,
    composite,
    validation,
    periodSelection: periodPick,
    // Risk level is derived FROM the score, never asserted independently, so it
    // can no longer disagree with the number printed next to it.
    riskLevel: riskLevelFor(composite.score),
  };
}

export function riskLevelFor(score) {
  const s = num(score);
  if (s == null) return null;
  if (s >= 80) return "low";
  if (s >= 60) return "medium";
  return "high";
}
