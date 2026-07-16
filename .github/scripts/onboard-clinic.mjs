import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";

const {
  SUPABASE_URL, SUPABASE_SERVICE_KEY,
  CLINIC_NAME, SLUG, OWNER_EMAIL, OWNER_NAME, CCNS, PLAN,
} = process.env;

function die(msg) { console.error("\n\u2717 " + msg + "\n"); process.exit(1); }
function summary(text) {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) {
    try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + "\n"); } catch {}
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) die("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY secrets.");

const name = (CLINIC_NAME || "").trim();
const slug = (SLUG || "").trim().toLowerCase();
const owner = (OWNER_EMAIL || "").trim().toLowerCase();
const ownerName = (OWNER_NAME || "").trim() || null;
const plan = (PLAN || "single").trim();
const ccns = (CCNS || "").split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);

if (!name) die("Clinic name is required.");
if (!/^[a-z0-9]([a-z0-9-]{0,38}[a-z0-9])?$/.test(slug)) die(`Slug "${slug}" is not a valid subdomain label.`);
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner)) die("A valid owner email is required.");
if (!["single", "multi", "enterprise"].includes(plan)) die("Plan must be single, multi, or enterprise.");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

function genPassword() {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digit = "23456789";
  const sym = "!@#$%^&*?-_";
  const all = lower + upper + digit + sym;
  const pick = (s) => s[crypto.randomInt(s.length)];
  const out = [pick(lower), pick(upper), pick(digit), pick(sym)];
  while (out.length < 16) out.push(pick(all));
  for (let i = out.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.join("");
}

{
  const { data: existing } = await supabase.from("clinics").select("id").eq("slug", slug).maybeSingle();
  if (existing) die(`A clinic with slug "${slug}" already exists. Pick a different subdomain.`);
}

const password = genPassword();
const { data: created, error: uErr } = await supabase.auth.admin.createUser({
  email: owner,
  password,
  email_confirm: true,
  user_metadata: { full_name: ownerName },
});
if (uErr) die(`Could not create the owner login: ${uErr.message}`);
const userId = created.user.id;
console.log("\u2713 Owner login created:", owner);

const { data: clinic, error: cErr } = await supabase.from("clinics")
  .insert({ name, slug, plan, status: "active" })
  .select("id, name, slug, plan")
  .single();
if (cErr) {
  await supabase.auth.admin.deleteUser(userId).catch(() => {});
  die(`Could not create the clinic: ${cErr.message}`);
}
console.log("\u2713 Clinic created:", clinic.name, `(${clinic.slug})`);

const { error: pErr } = await supabase.from("profiles").upsert({
  id: userId, clinic_id: clinic.id, email: owner, full_name: ownerName, role: "owner",
});
if (pErr) {
  await supabase.from("clinics").delete().eq("id", clinic.id).catch(() => {});
  await supabase.auth.admin.deleteUser(userId).catch(() => {});
  die(`Could not link the owner to the clinic: ${pErr.message}`);
}
console.log("\u2713 Owner linked to clinic as owner");

if (ccns.length) {
  const rows = ccns.map((c, i) => ({ clinic_id: clinic.id, ccn: c, is_primary: i === 0 }));
  const { error: ccErr } = await supabase.from("clinic_ccns").insert(rows);
  if (ccErr) console.error("\u26A0 CCN link warning:", ccErr.message);
  else console.log("\u2713 CCNs linked:", ccns.join(", "));
}

const portal = `https://${slug}.connect-shield.com`;
summary("\n## \u2705 Clinic onboarded");
summary("");
summary("| Field | Value |");
summary("| --- | --- |");
summary(`| Clinic | ${clinic.name} |`);
summary(`| Portal URL | ${portal} |`);
summary(`| Login at | https://connect-shield.com/login |`);
summary(`| Owner email | ${owner} |`);
summary(`| Temp password | \`${password}\` |`);
summary(`| Plan | ${clinic.plan} |`);
summary(`| CCN(s) | ${ccns.join(", ") || "(none)"} |`);
summary("");
summary("**Next steps:**");
summary(`1. In Vercel add domain \`${slug}.connect-shield.com\`, then add its CNAME in IONOS (same as \`demo\`).`);
summary("2. Send the owner their email + temp password and the login link.");
summary("3. Have them sign in and change the password immediately.");
summary("");
summary("> \u26A0 The temp password appears in this run log. It's one-time \u2014 the owner should change it on first login.");

console.log("\n\u2713 Done.");
