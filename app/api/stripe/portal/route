import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST { clinicId } -> { url }
// Opens the Stripe-hosted Customer Portal so a clinic can upgrade,
// downgrade, cancel, or update their card.
export async function POST(req) {
  try {
    const { clinicId } = await req.json();
    if (!clinicId) {
      return NextResponse.json({ error: "Missing clinicId." }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: clinic, error } = await db
      .from("clinics")
      .select("id, stripe_customer_id")
      .eq("id", clinicId)
      .single();

    if (error || !clinic?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing account for this clinic yet." },
        { status: 404 }
      );
    }

    const origin =
      req.headers.get("origin") || `https://${req.headers.get("host")}`;

    const portal = await stripe.billingPortal.sessions.create({
      customer: clinic.stripe_customer_id,
      return_url: `${origin}/billing`,
    });

    return NextResponse.json({ url: portal.url });
  } catch (err) {
    console.error("[stripe-portal]", err);
    return NextResponse.json(
      { error: "Unable to open billing portal." },
      { status: 500 }
    );
  }
}
