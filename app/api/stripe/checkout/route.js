import { NextResponse } from "next/server";
import { stripe, isValidPriceId } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { clinicId, priceId } -> { url }
export async function POST(req) {
  try {
    const { clinicId, priceId } = await req.json();

    if (!clinicId || !isValidPriceId(priceId)) {
      return NextResponse.json(
        { error: "Missing or invalid clinicId / priceId." },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();
    const { data: clinic, error } = await db
      .from("clinics")
      .select("id, name, slug, stripe_customer_id")
      .eq("id", clinicId)
      .single();

    if (error || !clinic) {
      return NextResponse.json({ error: "Clinic not found." }, { status: 404 });
    }

    const origin =
      req.headers.get("origin") || `https://${req.headers.get("host")}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],

      // Reuse the clinic's Stripe customer if we already created one.
      ...(clinic.stripe_customer_id
        ? {
            customer: clinic.stripe_customer_id,
            customer_update: { address: "auto", name: "auto" },
          }
        : {}),

      // Ties this checkout back to the clinic for the webhook.
      client_reference_id: clinic.id,
      metadata: { clinic_id: clinic.id },
      subscription_data: { metadata: { clinic_id: clinic.id } },

      // Stripe Tax: calculate US sales tax automatically.
      automatic_tax: { enabled: true },
      billing_address_collection: "required",

      allow_promotion_codes: true,

      success_url: `${origin}/billing?status=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?status=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe-checkout]", err);
    return NextResponse.json(
      { error: "Unable to start checkout." },
      { status: 500 }
    );
  }
}
