import Stripe from "stripe";

// Server-only Stripe client. Never import this into a client component.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─────────────────────────────────────────────────────────────
// PRICE CATALOG  (these are your LIVE price IDs)
// To test safely in TEST mode: create the same 3 products in the
// Stripe Dashboard's Test mode, then swap the six IDs below for the
// test-mode price IDs and use your test API keys in Vercel.
// ─────────────────────────────────────────────────────────────
export const PRICES = {
  single_agency: {
    monthly: "price_1TvsEgFFgp0atiH1gZpAtumM",
    annual:  "price_1TvsElFFgp0atiH11qn0rgnX",
  },
  multi_agency: {
    monthly: "price_1TvsErFFgp0atiH18Mx2FyZA",
    annual:  "price_1TvsEwFFgp0atiH1xevctxZQ",
  },
  enterprise: {
    monthly: "price_1TvsF2FFgp0atiH1LW2elUaw",
    annual:  "price_1TvsF8FFgp0atiH1fFSlfdYF",
  },
};

// Reverse map: price ID -> { tier, cadence }
export const PRICE_LOOKUP = Object.entries(PRICES).reduce((acc, [tier, cadences]) => {
  for (const [cadence, id] of Object.entries(cadences)) acc[id] = { tier, cadence };
  return acc;
}, {});

export function isValidPriceId(id) {
  return Boolean(id && PRICE_LOOKUP[id]);
}
