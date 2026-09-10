"use client";
import { useState } from "react";
import { Link2, Loader2, Check, Copy, AlertCircle } from "lucide-react";

// "Create preview link" — POSTs to /api/share for the given CCN, then copies
// the read-only portal preview URL to the clipboard. The link renders published
// CMS data only, with every other portal tab visibly locked (see /s/[token]),
// and expires after 15 days.
//
// Degrades honestly: 401/500/network failures render a one-line error, never a
// crash. Requires the share_links migration; until it runs, the server answers
// 500 and the same error line shows.
export default function ShareLinkButton({ ccn }) {
  const [state, setState] = useState("idle"); // idle | creating | done | error
  const [url, setUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  if (!ccn) return null;

  const copy = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked (permissions/http) — the visible URL still allows manual copy.
    }
  };

  const create = async () => {
    setState("creating");
    setError(null);
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ccn }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        setError(data.error || "Could not create the link. Try again.");
        setState("error");
        return;
      }
      setUrl(data.url);
      setState("done");
      copy(data.url);
    } catch {
      setError("Could not reach the server. Try again.");
      setState("error");
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={create}
          disabled={state === "creating"}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium disabled:opacity-60"
          style={{ background: "#B8863F", color: "#0E1830" }}
        >
          {state === "creating" ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
          {state === "creating" ? "Creating link" : url ? "Create new link" : "Create preview link"}
        </button>
        {url && (
          <button
            onClick={() => copy(url)}
            className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-mono"
            style={{ background: "#F5F6F8", color: copied ? "#2E9E62" : "#64708A", border: "1px solid #E3E7ED" }}
            title="Copy link"
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>

      {url && (
        <div className="mt-2 text-xs font-mono break-all rounded-lg px-3 py-2" style={{ background: "#F5F6F8", color: "#16202E", border: "1px solid #E3E7ED" }}>
          {url}
        </div>
      )}

      {state === "error" && error && (
        <div className="mt-2 flex items-start gap-1.5 text-xs" style={{ color: "#D14343" }}>
          <AlertCircle size={13} className="shrink-0 mt-px" /> {error}
        </div>
      )}

      <div className="mt-2 text-[11px] font-mono" style={{ color: "#8992A3" }}>
        Read-only portal preview of the published CMS score — every other tab shows locked. No documents, no uploads. Expires in 15 days.
      </div>
    </div>
  );
}
