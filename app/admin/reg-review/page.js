import { redirect } from "next/navigation";
import { createClient } from "@/lib/auth/server";
import { supabaseService } from "@/lib/supabase";
import { publishUpdate, rejectUpdate } from "./actions";

export const metadata = { title: "Review Queue", robots: { index: false } };
export const dynamic = "force-dynamic";

// Change this to your email to move the review gate. Must match actions.js.
const ADMIN_EMAIL = "admin@connect-shield.com";

export default async function RegReviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if ((user.email || "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) redirect("/dashboard");

  const svc = supabaseService();
  const { data: drafts } = await svc
    .from("reg_updates")
    .select("*")
    .eq("status", "draft")
    .order("published_date", { ascending: false });
  const list = drafts || [];

  return (
    <div style={{ background: "#F5F6F8", minHeight: "100vh", fontFamily: "Inter, sans-serif" }}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl" style={{ fontFamily: "Fraunces, serif", color: "#14213D" }}>Regulatory Watch — Review Queue</h1>
        <p className="text-sm mt-1 mb-6" style={{ color: "#64708A" }}>
          Draft cards awaiting review. Verify each against its source link before publishing. Published cards appear in every clinic&apos;s feed immediately; rejected cards are archived.
        </p>

        {list.length === 0 && (
          <div className="rounded-xl p-6 text-sm text-center" style={{ background: "#FFFFFF", border: "1px solid #E3E7ED", color: "#64708A" }}>
            No drafts waiting. New drafts from the Federal Register fetcher will appear here for your approval.
          </div>
        )}

        <div className="space-y-4">
          {list.map((r) => (
            <div key={r.id} className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid #E3E7ED" }}>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-[10px] uppercase font-mono px-2 py-1 rounded" style={{ background: "#FEF3E2", color: "#C98A1F" }}>{r.severity} impact</span>
                <span className="text-[11px] font-mono" style={{ color: "#8992A3" }}>{`${r.source}${r.tag ? ` \u00b7 ${r.tag}` : ""} \u00b7 ${r.published_date || "undated"}`}</span>
              </div>
              <h3 className="text-base" style={{ fontFamily: "Fraunces, serif", color: "#16202E" }}>{r.title}</h3>
              <p className="text-sm mt-1.5" style={{ color: "#64708A" }}>{r.summary}</p>
              {r.impact && (
                <div className="mt-2 p-3 rounded-lg text-sm" style={{ background: "#F5F6F8", color: "#16202E" }}>
                  <span className="font-mono text-xs" style={{ color: "#B8863F" }}>What it means: </span>{r.impact}
                </div>
              )}
              {Array.isArray(r.checklist) && r.checklist.length > 0 && (
                <ul className="mt-2 text-sm list-disc pl-5" style={{ color: "#16202E" }}>
                  {r.checklist.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              )}
              <div className="mt-3 flex items-center gap-3 flex-wrap">
                {r.source_url ? (
                  <a href={r.source_url} target="_blank" rel="noopener noreferrer" className="text-xs font-mono" style={{ color: "#B8863F" }}>View source &rarr;</a>
                ) : (
                  <span className="text-xs font-mono" style={{ color: "#D14343" }}>&#9888; no source link</span>
                )}
                <div className="flex gap-2 ml-auto">
                  <form action={publishUpdate}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: "#2E9E62", color: "#FFFFFF" }}>Publish</button>
                  </form>
                  <form action={rejectUpdate}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="px-3 py-1.5 rounded-lg text-sm font-medium" style={{ background: "#FFFFFF", color: "#D14343", border: "1px solid #F3B8AC" }}>Reject</button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
