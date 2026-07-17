// Regulatory Watch — Federal Register fetcher + Claude drafting.
// Runs from the "Fetch regulatory updates" GitHub Action. For each new CMS/hospice
// document published in the Federal Register, Claude drafts a card and it is written
// to reg_updates as status='draft' — landing in the /admin/reg-review queue for a
// human to verify against the source link and Publish or Reject. Never auto-publishes.

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY } = process.env;

function die(m) { console.error("\n\u2717 " + m + "\n"); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) die("Missing SUPABASE_URL / SUPABASE_SERVICE_KEY secrets.");
if (!ANTHROPIC_API_KEY) die("Missing ANTHROPIC_API_KEY secret.");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const LOOKBACK_DAYS = 40; // overlap window; dedup prevents re-drafting
const since = new Date(Date.now() - LOOKBACK_DAYS * 864e5).toISOString().slice(0, 10);
const TYPE_LABEL = { RULE: "Final Rule", PRORULE: "Proposed Rule", NOTICE: "Notice" };

async function fetchFederalRegister() {
  const params = new URLSearchParams();
  params.append("conditions[term]", "hospice");
  params.append("conditions[agencies][]", "centers-for-medicare-medicaid-services");
  params.append("conditions[publication_date][gte]", since);
  ["title", "abstract", "action", "document_number", "html_url", "publication_date", "type"]
    .forEach((f) => params.append("fields[]", f));
  params.append("order", "newest");
  params.append("per_page", "50");
  const url = `https://www.federalregister.gov/api/v1/documents.json?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) die(`Federal Register API error: ${res.status}`);
  const data = await res.json();
  return data.results || [];
}

async function draftCard(doc) {
  const typeLabel = TYPE_LABEL[doc.type] || doc.type || "Document";
  const system = `You draft regulatory-update cards for a hospice Medicare compliance platform. Given a CMS Federal Register document, produce ONE JSON object and nothing else. Base every word ONLY on the provided title and abstract — do NOT invent specifics, numbers, dates, or requirements that are not in the text. If the abstract is thin, keep the summary general and note that detail should be confirmed against the source. Output strictly this JSON shape:
{"summary":"2-3 plain-English sentences describing what the document does","impact":"1 sentence on what it means for a hospice agency","severity":"low|medium|high","checklist":["2 to 4 short action items a compliance officer might take"]}
No markdown, no backticks, no emojis. Output only the JSON object.`;
  const user = `Title: ${doc.title}\nType: ${typeLabel}\nAbstract: ${doc.abstract || "(none provided)"}\nAction: ${doc.action || "(none)"}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 700, system, messages: [{ role: "user", content: user }] }),
  });
  if (!res.ok) { console.error("  Claude error:", res.status, (await res.text()).slice(0, 200)); return null; }
  const data = await res.json();
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("").trim();
  const clean = text.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    console.error("  Could not parse Claude JSON for:", doc.document_number);
    return null;
  }
}

async function main() {
  const docs = await fetchFederalRegister();
  console.log(`Federal Register: ${docs.length} hospice/CMS document(s) since ${since}`);
  if (docs.length === 0) { console.log("Nothing to draft."); return; }

  // Dedup against every existing card (any status) so rejected/published docs aren't re-drafted.
  const { data: existing } = await supabase.from("reg_updates").select("source_url");
  const seen = new Set((existing || []).map((r) => r.source_url).filter(Boolean));

  let drafted = 0, skipped = 0;
  for (const doc of docs) {
    if (!doc.html_url) continue;
    if (seen.has(doc.html_url)) { skipped++; continue; }

    const card = await draftCard(doc);
    if (!card) continue;

    const typeLabel = TYPE_LABEL[doc.type] || doc.type || "Document";
    const sev = ["low", "medium", "high"].includes(String(card.severity || "").toLowerCase())
      ? String(card.severity).toLowerCase() : "medium";
    const checklist = Array.isArray(card.checklist) ? card.checklist.slice(0, 6).map(String) : [];

    const { error } = await supabase.from("reg_updates").insert({
      source: "CMS",
      tag: typeLabel,
      severity: sev,
      title: doc.title,
      summary: card.summary || "",
      impact: card.impact || "",
      checklist,
      source_url: doc.html_url,
      published_date: doc.publication_date || null,
      status: "draft",
      reviewed_by: null,
    });
    if (error) { console.error("  Insert failed:", error.message); continue; }
    seen.add(doc.html_url);
    drafted++;
    console.log(`  + draft: ${String(doc.title).slice(0, 72)}`);
  }

  const msg = `\nDone. ${drafted} new draft(s), ${skipped} already seen.`;
  console.log(msg);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `## Regulatory fetch\n\n- ${docs.length} Federal Register doc(s) since ${since}\n- **${drafted}** new draft(s) created\n- ${skipped} already seen\n\nReview and publish at \`/admin/reg-review\`.\n`);
  }
}

main().catch((e) => die(e.message));
