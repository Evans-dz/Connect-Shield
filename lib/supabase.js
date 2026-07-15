import { createClient } from "@supabase/supabase-js";

// Server-side client for reading public SSVI data (anon key is fine — row is public).
export function supabasePublic() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

// Server-only client for writing demo leads (service key, never exposed to the browser).
export function supabaseService() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function riskFromScore(score) {
  if (score == null) return { label: "Unknown", tone: "mid" };
  if (score <= 4) return { label: "Low Risk", tone: "low" };
  if (score <= 7) return { label: "Moderate Risk", tone: "mid" };
  if (score <= 9) return { label: "Elevated Risk", tone: "high" };
  return { label: "High Risk", tone: "high" };
}
