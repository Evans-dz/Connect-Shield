import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Reads the current period end from either the newer (flexible/item-level)
// or classic (subscription-level) shape, so this works across API versions.
function getPeriodEnd(sub) {
  const item = sub?.items?.data?.[0];
  const ts = item?.current_period_end ?? sub?.current_period_end;
  return ts ? new Date(ts * 1000).toISOString() : null;
}

async function syncSubscriptionToClinic(sub) {
  const db = supabaseAdmin();
  const clinicId = sub?.metadata?.clinic_id || null;
  const priceId = sub?.items?.data?.[0]?.price?.id ?? null;

  const patch = {
    stripe_subscription_id: sub.id,
    subscription_status: sub.status, // active | trialing | past_due | canceled | ...
    plan_price_id: priceId,
    current_period_end: getPeriodEnd(sub),
  };

  if (clinicId) {
    await db
      .from("clinics")
      .update({ ...patch, stripe_customer_id: sub.customer })
      .eq("id", clinicId);
  } else if (sub.customer) {
    await db.from("clinics").update(patch).eq("stripe_customer_id", sub.customer);
  }

  console.log(
    "[stripe-webhook] synced",
    sub.id,
    "status:",
    sub.status,
    "->",
    clinicId || sub.customer
  );
}

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("[stripe-webhook] bad signature:", err.message);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription" && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(session.subscription);
          // Ensure clinic_id is present even if metadata didn't carry over.
          if (!sub.metadata?.clinic_id && session.client_reference_id) {
            sub.metadata = {
              ...sub.metadata,
              clinic_id: session.client_reference_id,
            };
          }
          await syncSubscriptionToClinic(sub);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscriptionToClinic(event.data.object);
        break;
      }

      default:
        // Unhandled event types are acknowledged and ignored.
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] handler error:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
