import { createClient } from "@supabase/supabase-js";
import crypto from "node:crypto";
import fs from "node:fs";

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, SLUG, MEMBER_EMAIL, MEMBER_NAME, ROLE } = process.env;

function die(msg) { console.error("\n\u2717 " + msg + "\n"); process.exit(1); }
function summary(text) {
  console.log(text);
  if (process.env.GITHUB_STEP_SUMMARY) {
    try { fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, text + "\n"); } catch {}
  }
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) die("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY secrets.");

const slug = (SLUG || "").trim().toLowerCase();
const email = (MEMBER_EMAIL || "").trim().toLowerCase();
const memberName = (MEMBER_NAME || "").trim() || null;
const role = (ROLE || "member").trim();

if (!slug) die("Clinic slug is required.");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) die("A valid member email is required.");
if (!["member", "admin", "owner"].includes(role)) die("Role must be member, admin, or owner.");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

function genPassword() {
  const lower = "abcdefghijkmnpqrstuvwxyz", upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digit = "23456789", sym = "!@#$%^&*?-_", all = lower + upper + digit + sym;
  const pick = (s) => s[crypto.randomInt(s.length)];
  const out = [pick(lower), pick(upper), pick(digit), pick(sym)];
  while (out.length < 16) out.push(pick(all));
  for (let i = out.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [out[i], out[j]] = [out[j], out[i]]; }
  return out.join("");
}

const { data: clinic, error: findErr } = await supabase
  .from("clinics").select("id, name, slug").eq("slug", slug).maybeSingle();
if (findErr) die("Lookup failed: " + findErr.message);
if (!clinic) die(`No clinic found with slug "${slug}". Onboard the clinic first.`);

const password = genPassword();
const { data: created, error: uErr } = await supabase.auth.admin.createUser({
  email, password, email_confirm: true, user_metadata: { full_name: memberName },
});
if (uErr) die(`Could not create the login: ${uErr.message}`);
const userId = created.user.id;

const { error: pErr } = await supabase.from("profiles").upsert({
  id: userId, clinic_id: clinic.id, email, full_name: memberName, role,
});
if (pErr) {
  await supabase.auth.admin.deleteUser(userId).catch(() => {});
  die(`Could not link the user to the clinic: ${pErr.message}`);
}

const portal = `https://${clinic.slug}.connect-shield.com`;
summary("\n## \u2705 User added to " + clinic.name);
summary("");
summary("| Field | Value |");
summary("| --- | --- |");
summary(`| Clinic | ${clinic.name} (${clinic.slug}) |`);
summary(`| Portal URL | ${portal} |`);
summary(`| Login at | https://connect-shield.com/login |`);
summary(`| Email | ${email} |`);
summary(`| Temp password | \`${password}\` |`);
summary(`| Role | ${role} |`);
summary("");
summary("> \u26A0 Temp password is in this run log. Have them change it on first login.");

console.log("\n\u2713 Done.");
