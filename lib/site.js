// Central site configuration. Edit copy, links, and stats here.

export const SITE = {
  name: "Connect Shield",
  tagline: "Hospice Compliance Intelligence",
  domain: "connect-shield.com",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://connect-shield.com",
  appUrl: process.env.NEXT_PUBLIC_APP_URL || "https://staging.connect-shield.com",
  email: "hello@connect-shield.com",
  description:
    "Connect Shield turns CMS claims data into a clear compliance picture for hospice leadership — your published SSVI score, PEPPER outliers, CAP exposure, and survey readiness in one secure, HIPAA-compliant dashboard.",
};

export const STATS = [
  { value: "7,059", label: "US hospices indexed" },
  { value: "0-16", label: "SSVI scored, all providers" },
  { value: "9", label: "CMS claims-based measures" },
  { value: "HIPAA", label: "compliant & encrypted" },
];

// Primary nav — the eight solution pages are generated from lib/solutions.js
export const NAV = [
  { label: "Platform", href: "/#platform" },
  { label: "Solutions", href: "/#solutions" },
  { label: "Why us", href: "/#compare" },
  { label: "Pricing", href: "/pricing" },
];

export const COMPETITORS = {
  intro:
    "Other tools stop at a lookup. Connect Shield reads your own reports alongside the CMS data and tells you what to fix.",
  rows: [
    { feature: "Published SSVI score lookup", cs: true, engine: true, shield: "partial" },
    { feature: "All 9 measures broken down with your values", cs: true, engine: "partial", shield: false },
    { feature: "Reads your PS&R, PEPPER & CAHPS reports", cs: true, engine: false, shield: false },
    { feature: "CAP exposure & clawback estimate", cs: true, engine: false, shield: false },
    { feature: "AI chart & CoP auditor", cs: true, engine: false, shield: false },
    { feature: "Per-clinic secure portal", cs: true, engine: false, shield: "partial" },
    { feature: "HIPAA-compliant, encrypted infrastructure", cs: true, engine: true, shield: true },
  ],
};

export const FAQ = [
  {
    q: "Is my data secure and HIPAA-compliant?",
    a: "Yes. Connect Shield is built and operated to HIPAA standards. We work from CMS agency-level claims data and the reports you upload — never patient names or diagnoses — and everything is encrypted in transit and at rest. Each clinic's portal is isolated, so only your team can see your data.",
  },
  {
    q: "Where does the SSVI score come from?",
    a: "Directly from the CMS Service and Spending Variation Index file published with the FY2027 Hospice Wage Index proposed rule (CMS-1851-P). We load every scored US hospice and show your exact published number, not an estimate.",
  },
  {
    q: "Is the score you show the real CMS number?",
    a: "Yes. For any CCN in the CMS file we display the published FY2025 and FY2024 scores. Every one of the eight utilization flags we show reconciles to the CMS-published utilization score, so the breakdown always adds up to your official number.",
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
