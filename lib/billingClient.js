// Client-side helpers. Call these from your dashboard buttons.
// Example:
//   import { startCheckout, openBillingPortal } from "@/lib/billingClient";
//   <button onClick={() => startCheckout(clinicId, PRICES.multi_agency.monthly)}>Upgrade</button>
//   <button onClick={() => openBillingPortal(clinicId)}>Manage billing</button>

export async function startCheckout(clinicId, priceId) {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clinicId, priceId }),
  });
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  } else {
    console.error("[billing] checkout failed:", data.error);
    alert(data.error || "Could not start checkout.");
  }
}

export async function openBillingPortal(clinicId) {
  const res = await fetch("/api/stripe/portal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clinicId }),
  });
  const data = await res.json();
  if (data.url) {
    window.location.href = data.url;
  } else {
    console.error("[billing] portal failed:", data.error);
    alert(data.error || "No billing account yet.");
  }
}
