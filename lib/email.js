// lib/email.js — transactional email via Resend's REST API. Plain fetch, no SDK.
//
// ── REQUIRED ENV ────────────────────────────────────────────────────────────
//   RESEND_API_KEY   Resend API key (https://resend.com/api-keys).
//                    MISSING => every send is a no-op that logs a console.warn
//                    and returns { ok: false, skipped: true }. Nothing throws.
//   EMAIL_FROM       Verified sender, e.g. 'Connect Shield <digest@connect-shield.com>'.
//                    Optional — defaults to the address below. The domain must
//                    be verified in Resend before real sends will work.
// ────────────────────────────────────────────────────────────────────────────
//
// Server-only. Never import into a client component.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "Connect Shield <digest@connect-shield.com>";

/**
 * Send one email. Never throws — returns:
 *   { ok: true,  id }              sent
 *   { ok: false, skipped: true }   no RESEND_API_KEY configured (logged)
 *   { ok: false, error }           Resend rejected it or the network failed
 *
 * @param {object} msg
 * @param {string|string[]} msg.to      recipient(s)
 * @param {string} msg.subject
 * @param {string} [msg.html]           HTML body
 * @param {string} [msg.text]           plain-text body (send at least one body)
 * @param {string} [msg.from]           override EMAIL_FROM for this send
 */
export async function sendEmail({ to, subject, html, text, from } = {}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY not set — email skipped:", subject || "(no subject)");
    return { ok: false, skipped: true };
  }
  if (!to || !subject || (!html && !text)) {
    return { ok: false, error: "to, subject, and a body (html or text) are required" };
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from || process.env.EMAIL_FROM || DEFAULT_FROM,
        to: Array.isArray(to) ? to : [to],
        subject,
        ...(html ? { html } : {}),
        ...(text ? { text } : {}),
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("[email] send failed:", res.status, data?.message || data?.name || "");
      return { ok: false, error: data?.message || `Resend responded ${res.status}` };
    }
    return { ok: true, id: data?.id || null };
  } catch (e) {
    console.error("[email] send failed:", e?.message || e);
    return { ok: false, error: e?.message || "network error" };
  }
}
