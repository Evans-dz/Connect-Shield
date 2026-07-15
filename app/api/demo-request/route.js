import { NextResponse } from "next/server";
import { supabaseService } from "@/lib/supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = (body.name || "").trim().slice(0, 200);
  const email = (body.email || "").trim().slice(0, 200);
  const hospice = (body.hospice || "").trim().slice(0, 200);
  const ccn = (body.ccn || "").trim().slice(0, 20).toUpperCase();
  const phone = (body.phone || "").trim().slice(0, 40);
  const message = (body.message || "").trim().slice(0, 2000);

  if (!name || !hospice || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Name, hospice, and a valid email are required." }, { status: 400 });
  }

  const supabase = supabaseService();
  if (!supabase) {
    // Env not wired yet — don't lose the lead silently; surface it in logs.
    console.log("[demo-request] (no Supabase configured):", { name, email, hospice, ccn, phone, message });
    return NextResponse.json({ ok: true, stored: false });
  }

  const { error } = await supabase.from("demo_leads").insert({
    name, email, hospice_name: hospice, ccn: ccn || null, phone: phone || null, message: message || null,
    source: "marketing_site",
  });

  if (error) {
    console.error("[demo-request] insert failed:", error.message);
    return NextResponse.json({ error: "Could not save your request." }, { status: 500 });
  }
  return NextResponse.json({ ok: true, stored: true });
}
