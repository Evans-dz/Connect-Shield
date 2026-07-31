// Central site configuration. Edit copy, links, and stats here.
//
// NOTE: this variant drops the competitor comparison table entirely and
// replaces it with a plain capability list. Use this if you would rather not
// make claims about what other tools do or do not offer.

export const SITE = {
  name: "Connect Shield",
  tagline: "Hospice Compliance Intelligence",
  domain: "connect-shield.com",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://connect-shield.com",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://staging.connect-shield.com",
  email: "admin@connect-shield.com",
  description:
    "Connect Shield turns CMS claims data into a clear compliance picture for hospice leadership — your published SSVI score, PEPPER outliers, CAP exposure, and survey readiness in one secure, encrypted dashboard.",
};

export const STATS = [
  { value: "6,643", label: "US hospices scored & indexed" },
  { value: "0-16", label: "SSVI range, every provider" },
  { value: "9", label: "CMS claims-based metrics" },
  { value: "Encrypted", label: "end-to-end & isolated" },
];

export const NAV = [
  { label: "Platform", href: "/#platform" },
  { label: "Solutions", href: "/#solutions" },
  { label: "Why us", href: "/#compare" },
  { label: "Pricing", href: "/pricing" },
];

// Kept for compatibility with the existing table markup, but every row now
// describes only what Connect Shield does. The competitor columns are unused
// if you also switch the table to a single-column layout.
export const COMPETITORS = {
  intro:
    "A score lookup tells you the number. Connect Shield reads your own PS&R, PEPPER, CAHPS, and QAPI reports against that score and turns it into a list your leadership can work through.",
  rows: [
    { feature: "Free public SSVI lookup and a page for every scored agency", cs: true, engine: null, shield: null },
    { feature: "Reads your uploaded PS&R, PEPPER, CAHPS & QAPI reports", cs: true, engine: null, shield: null },
    { feature: "CAP exposure and clawback estimate from your beneficiary count", cs: true, engine: null, shield: null },
    { feature: "AI chart and Conditions of Participation auditor", cs: true, engine: null, shield: null },
    { feature: "Per-clinic secure portal with isolated access", cs: true, engine: null, shield: null },
    { feature: "Regulatory change tracking against your own profile", cs: true, engine: null, shield: null },
    { feature: "Year-over-year score tracking as you make changes", cs: true, engine: null, shield: null },
  ],
};

export const FAQ = [
  {
    q: "Is my data secure?",
    a: "Yes. Connect Shield works from CMS agency-level claims data and the reports you upload — never patient names or diagnoses — and everything is encrypted in transit and at rest. Each clinic's portal is isolated, so only your team can see your data.",
  },
  {
    q: "Where does the SSVI score come from?",
    a: "Directly from the CMS Service and Spending Variation Index file published with the FY2027 Hospice Wage Index proposed rule (CMS-1851-P). We load every scored US hospice and show your exact published number, not an estimate.",
  },
  {
    q: "What exactly does the SSVI measure?",
    a: "CMS scores every hospice 0 to 16 using nine claims-based metrics: eight utilization measures worth one point each, plus a non-hospice spending score worth up to eight. A higher score means an agency's claims patterns diverge further from peer norms. CMS is explicit that it is not a determination of fraud, waste, or abuse.",
  },
  {
    q: "Is the score you show the real CMS number?",
    a: "Yes. For any CCN in the CMS file we display the published FY2025 and FY2024 scores. Every one of the eight utilization flags we show reconciles to the CMS-published utilization score, so the breakdown always adds up to your official number.",
  },
  {
    q: "Is the SSVI final?",
    a: "No. The SSVI was introduced in the FY2027 proposed rule (CMS-1851-P), and CMS solicited comment on both the metrics and the scoring system. Scores shown here come from the data file released with that proposed rule. We update when CMS publishes new data.",
  },
  {
    q: "How do I get an account?",
    a: "Accounts are provisioned per clinic. Book a demo and we set up your secure portal, load your CCN, and walk your team through the dashboard.",
  },
  {
    q: "How is my login secured?",
    a: "Authentication runs on managed infrastructure with hashed credentials, encrypted sessions, and support for multi-factor authentication. Each clinic sees only its own data.",
  },
];
