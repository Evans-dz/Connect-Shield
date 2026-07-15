// The eight SEO landing pages. Each entry becomes /[slug] as a real,
// server-rendered, indexable page with its own metadata + JSON-LD.
// Keep copy accurate: these terms are what hospice owners actually search.

export const SOLUTIONS = [
  {
    slug: "ssvi",
    term: "SSVI Score",
    nav: "SSVI Scoring",
    metaTitle: "SSVI Score Lookup for Hospices — Service & Spending Variation Index",
    metaDescription:
      "Look up your hospice's CMS SSVI score (0–16) and see all nine claims-based measures broken down. Published FY2024 & FY2025 scores for all 7,059 US hospices. Zero PHI.",
    keywords: ["SSVI score", "Service and Spending Variation Index", "hospice SSVI lookup", "CMS-1851-P", "hospice program integrity"],
    hero: {
      kicker: "Service & Spending Variation Index",
      title: "Know your SSVI score before CMS uses it against you.",
      sub: "CMS scored every hospice in the country from 0 to 16 using nine claims-based measures. Look yours up, see exactly which measures drive it, and fix the ones you can.",
    },
    what: {
      title: "What the SSVI actually is",
      body: "Introduced in the FY2027 Hospice Wage Index proposed rule (CMS-1851-P), the Service and Spending Variation Index is a single 0–16 score built from nine claims-based metrics. It combines a Non-Hospice Spending Score (0–8) with a Utilization Score (0–8) drawn from eight service-delivery measures. A higher score signals greater deviation from peer norms — and scores at the high end can trigger program-integrity review.",
    },
    points: [
      { h: "Your exact published number", p: "We load the CMS SSVI file directly and show your FY2025 and FY2024 scores — not an estimate." },
      { h: "All nine measures, broken down", p: "See which of the eight utilization measures flagged you and where your non-hospice spending lands." },
      { h: "Year-over-year movement", p: "A rising SSVI is what draws scrutiny. We show the trend and what moved it." },
      { h: "Benchmarked to the field", p: "National average is 6.42, median 7. We place you against all 7,059 hospices." },
    ],
    faqExtra: [
      { q: "Can I change my SSVI score?", a: "The published score reflects prior-year claims and can't be changed retroactively. But knowing which measures flagged you lets you correct the billing and visit patterns before the next scoring window." },
    ],
  },
  {
    slug: "pepper",
    term: "PEPPER Report",
    nav: "PEPPER Analysis",
    metaTitle: "PEPPER Report Analysis for Hospices — Find Your Outlier Areas",
    metaDescription:
      "Upload your hospice PEPPER report and see your outlier target areas explained in plain terms, with the billing patterns behind each flag. Executive-level, zero PHI.",
    keywords: ["PEPPER report", "hospice PEPPER", "PEPPER outlier", "program for evaluating payment patterns", "hospice target areas"],
    hero: {
      kicker: "Program for Evaluating Payment Patterns",
      title: "Turn your PEPPER report into a to-do list.",
      sub: "PEPPER tells you where your billing sits above the national threshold. Connect Shield reads it and tells you what to do about each outlier area.",
    },
    what: {
      title: "What PEPPER flags mean for you",
      body: "The Program for Evaluating Payment Patterns Electronic Report compares your hospice's billing against national and jurisdictional percentiles across target areas known to attract audit attention — long lengths of stay, live discharges, and continuous or general inpatient care among them. Landing above the 80th percentile on a target area doesn't prove anything is wrong, but it does put you on the map for review.",
    },
    points: [
      { h: "Every target area explained", p: "We translate each PEPPER outlier into what it means and why it draws attention." },
      { h: "Connected to your SSVI", p: "PEPPER and SSVI watch overlapping patterns. We show you where they line up." },
      { h: "Prioritized by audit risk", p: "Not every flag matters equally. We rank them so you fix the ones that count first." },
      { h: "Documentation guidance", p: "Concrete steps to shore up records before an outlier becomes a request for records." },
    ],
  },
  {
    slug: "cahps",
    term: "CAHPS Hospice Survey",
    nav: "CAHPS Tracking",
    metaTitle: "CAHPS Hospice Survey Tracking & Analysis — Connect Shield",
    metaDescription:
      "Track your CAHPS Hospice Survey scores against national averages and see which measures pull your rating down. Clear, executive-level reporting with zero PHI.",
    keywords: ["CAHPS hospice survey", "hospice CAHPS scores", "consumer assessment of healthcare providers", "hospice quality reporting", "CAHPS national average"],
    hero: {
      kicker: "Consumer Assessment of Healthcare Providers & Systems",
      title: "See where your CAHPS scores stand — and what moves them.",
      sub: "Your CAHPS Hospice Survey results feed public reporting and referral decisions. Connect Shield shows you where you rank and which measures need attention.",
    },
    what: {
      title: "Why CAHPS matters to leadership",
      body: "The CAHPS Hospice Survey captures family and caregiver experience across measures like communication, timely help, and respect. Scores are publicly reported and shape how referral sources and families perceive your agency. Falling below the national average on a measure isn't just a quality issue — it's a visibility issue.",
    },
    points: [
      { h: "Benchmarked to national", p: "Every measure placed against the national average so you know where you truly stand." },
      { h: "Root-cause reads", p: "We highlight which measures are dragging your overall rating and why." },
      { h: "Trend over time", p: "Track quarter-over-quarter so an improvement plan shows its work." },
      { h: "Board-ready summaries", p: "Clear rollups your leadership team can act on without wading through raw data." },
    ],
  },
  {
    slug: "qapi",
    term: "QAPI Program",
    nav: "QAPI Management",
    metaTitle: "Hospice QAPI Program Support & Project Tracking — Connect Shield",
    metaDescription:
      "Organize your hospice QAPI program, tie performance improvement projects to your real compliance data, and keep survey-ready documentation. Executive-level, zero PHI.",
    keywords: ["hospice QAPI", "quality assurance performance improvement", "QAPI program", "hospice performance improvement projects", "QAPI documentation"],
    hero: {
      kicker: "Quality Assurance & Performance Improvement",
      title: "Make your QAPI program point at what actually matters.",
      sub: "A QAPI program is only as good as the data behind it. Connect Shield ties your performance improvement projects to your real SSVI, PEPPER, and survey signals.",
    },
    what: {
      title: "QAPI that survives a survey",
      body: "Medicare Conditions of Participation require an ongoing, data-driven QAPI program with active performance improvement projects. Surveyors want to see that your projects are grounded in real measures and are actually moving them. Connect Shield gives you the compliance data to justify your project selection and the tracking to show progress.",
    },
    points: [
      { h: "Data-driven project selection", p: "Point your PIPs at the measures that are actually flagging you — not guesses." },
      { h: "Progress you can show", p: "Track each project against its target measure over time." },
      { h: "Survey-ready records", p: "Keep the documentation a surveyor expects to see, organized in one place." },
      { h: "Tied to your scores", p: "Every project links back to the SSVI or survey signal that justified it." },
    ],
  },
  {
    slug: "psr-summary",
    term: "PS&R Summary",
    nav: "PS&R Summary",
    metaTitle: "Hospice PS&R Summary Analysis (Report 810) — Connect Shield",
    metaDescription:
      "Upload your PS&R Report 810 and get RN visit intensity, length of stay, reimbursement, and SSVI risk drivers calculated automatically. Executive reporting, zero PHI.",
    keywords: ["PS&R summary", "PS&R report 810", "provider statistical and reimbursement", "hospice PS&R analysis", "RN visit intensity"],
    hero: {
      kicker: "Provider Statistical & Reimbursement Report 810",
      title: "Your PS&R has your risk drivers in it. We surface them.",
      sub: "Report 810 holds the numbers CMS scores you on. Connect Shield reads it and calculates RN intensity, length of stay, and reimbursement in seconds.",
    },
    what: {
      title: "The report behind your score",
      body: "The Provider Statistical and Reimbursement report (Report 810) is the source of truth for your Medicare days, visit units, and reimbursement. Buried in it are the exact figures that drive several SSVI utilization measures — RN visit intensity, length of stay, and level-of-care mix. Reading it by hand is slow; reading it wrong is expensive.",
    },
    points: [
      { h: "RN intensity, calculated", p: "Revenue 0551 units ÷ Medicare days — the metric under the SSVI threshold, computed for you." },
      { h: "Length of stay, instantly", p: "Medicare days ÷ census, flagged against the levels that draw scrutiny." },
      { h: "Reimbursement clarity", p: "Gross, sequestration, and net laid out so nothing hides." },
      { h: "Feeds your dashboard", p: "Every figure flows into your compliance scorecard automatically." },
    ],
  },
  {
    slug: "beneficiary-count",
    term: "Beneficiary Count",
    nav: "Beneficiary Count",
    metaTitle: "Hospice Beneficiary Count & Medicare CAP Exposure — Connect Shield",
    metaDescription:
      "Turn your Beneficiary Count report (B51562) into a live Medicare aggregate CAP calculation with clawback exposure. Know if you're over the cap before CMS does. Zero PHI.",
    keywords: ["hospice beneficiary count", "B51562 report", "medicare aggregate cap", "hospice cap exposure", "hospice clawback"],
    hero: {
      kicker: "Beneficiary Count Report B51562",
      title: "Know your CAP exposure before the demand letter.",
      sub: "Your beneficiary count sets your aggregate cap. Connect Shield calculates your exposure and flags a clawback before CMS sends the bill.",
    },
    what: {
      title: "The math that ends hospices",
      body: "The Medicare aggregate cap limits total reimbursement to your beneficiary count times the annual per-beneficiary cap amount. Exceed it and CMS claws back the difference — often a devastating six-figure demand arriving months after the cap year closes. The Beneficiary Count report (B51562) holds the number that drives it, and most owners don't run the math until it's too late.",
    },
    points: [
      { h: "Live cap calculation", p: "Beneficiaries × per-cap amount, against your net reimbursement — exposure in real time." },
      { h: "Clawback estimate", p: "If you're over, we show the dollar figure you'd owe, not a vague warning." },
      { h: "Headroom when you're safe", p: "Under the cap? See exactly how much room is left before you're at risk." },
      { h: "Cap-year aware", p: "Uses the correct per-beneficiary amount for the cap year in question." },
    ],
  },
  {
    slug: "survey-results",
    term: "Survey Results",
    nav: "Survey Results",
    metaTitle: "Hospice Survey Results & Deficiency Tracking — Connect Shield",
    metaDescription:
      "Track hospice survey deficiencies, condition-level citations, and open findings against Medicare Conditions of Participation. Stay survey-ready with clear reporting. Zero PHI.",
    keywords: ["hospice survey results", "statement of deficiencies", "CMS-2567", "condition-level deficiency", "hospice conditions of participation"],
    hero: {
      kicker: "Statement of Deficiencies · Form CMS-2567",
      title: "Walk into your next survey already knowing the answers.",
      sub: "Connect Shield tracks your deficiencies, condition-level citations, and open findings against the Conditions of Participation so nothing surprises you.",
    },
    what: {
      title: "Survey readiness, not survey panic",
      body: "Hospice surveys measure you against the Medicare Conditions of Participation, and a condition-level deficiency can jeopardize your certification. The difference between a clean survey and a crisis is usually preparation: knowing your open findings, your documentation gaps, and the CoP areas most likely to be cited before the surveyor arrives.",
    },
    points: [
      { h: "Deficiency tracking", p: "Every citation logged, categorized, and tracked to closure." },
      { h: "Condition-level alerts", p: "The serious findings surfaced clearly, not buried in a list." },
      { h: "CoP-mapped auditor", p: "Our chart auditor checks documentation against the Conditions of Participation." },
      { h: "Recertification windows", p: "Face-to-face and recert timing tracked so a missed date never suspends a claim." },
    ],
  },
  {
    slug: "policy-manuals",
    term: "Policy Manuals",
    nav: "Policy Manuals",
    metaTitle: "Hospice Policy Manual Review & Compliance Library — Connect Shield",
    metaDescription:
      "Store your hospice policy manuals in one secure library and check them against Medicare Conditions of Participation. Keep survey-ready documentation. Zero PHI.",
    keywords: ["hospice policy manual", "hospice compliance library", "conditions of participation policies", "hospice document management", "hospice SOP"],
    hero: {
      kicker: "Compliance Document Library",
      title: "One secure home for every policy a surveyor will ask for.",
      sub: "Keep your manuals, procedures, and compliance documents in one place — organized, searchable, and checked against the Conditions of Participation.",
    },
    what: {
      title: "The library that answers surveyors",
      body: "When a surveyor asks for a policy, the clock is running. Scattered manuals across drives and inboxes turn a simple request into a scramble. A single organized library — with every document typed, dated, and searchable — is the quiet backbone of a survey-ready agency.",
    },
    points: [
      { h: "One organized library", p: "Every manual and procedure in one place, typed and dated automatically." },
      { h: "Searchable in seconds", p: "Find the exact policy a surveyor asks for without digging through drives." },
      { h: "CoP alignment checks", p: "Flag where a policy may not reflect current Conditions of Participation." },
      { h: "Per-clinic and secure", p: "Your documents stay in your portal, visible only to your team." },
    ],
  },
];

export const SOLUTION_SLUGS = SOLUTIONS.map((s) => s.slug);
export function getSolution(slug) {
  return SOLUTIONS.find((s) => s.slug === slug) || null;
}
