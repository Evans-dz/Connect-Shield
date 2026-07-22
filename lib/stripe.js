import Stripe from "stripe";

// Server-only Stripe client. Never import this into a client component.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─────────────────────────────────────────────────────────────
// PRICE CATALOG
// Active set = TEST mode (matches your sk_test_ key in Vercel).
// When you're ready to go live: swap STRIPE_SECRET_KEY to your
// sk_live_ key in Vercel, then replace the PRICES block below with
// the LIVE block (commented underneath) and redeploy.
// ─────────────────────────────────────────────────────────────
export const PRICES = {
  single_agency: {
    monthly: "price_1TvsmU2WMLJW2tL7rrIAsOa8",
    annual:  "price_1Tvsns2WMLJW2tL7RNkDxFmR",
  },
  multi_agency: {
    monthly: "price_1Tvsmr2WMLJW2tL7mhN6Ox5Y",
    annual:  "price_1TvsoH2WMLJW2tL7BcdhlleD",
  },
  enterprise: {
    monthly: "price_1TvsnC2WMLJW2tL7ZoRtUJX9",
    annual:  "price_1TvsoY2WMLJW2tL72jXSIhQE",
  },
};

// LIVE price IDs (for launch — do NOT use with test keys):
// single_agency: { monthly: "price_1TvsEgFFgp0atiH1gZpAtumM", annual: "price_1TvsElFFgp0atiH11qn0rgnX" }
// multi_agency:  { monthly: "price_1TvsErFFgp0atiH18Mx2FyZA", annual: "price_1TvsEwFFgp0atiH1xevctxZQ" }
// enterprise:    { monthly: "price_1TvsF2FFgp0atiH1LW2elUaw", annual: "price_1TvsF8FFgp0atiH1fFSlfdYF" }

// Reverse map: price ID -> { tier, cadence }
export const PRICE_LOOKUP = Object.entries(PRICES).reduce((acc, [tier, cadences]) => {
  for (const [cadence, id] of Object.entries(cadences)) acc[id] = { tier, cadence };
  return acc;
}, {});

export function isValidPriceId(id) {
  return Boolean(id && PRICE_LOOKUP[id]);
}
