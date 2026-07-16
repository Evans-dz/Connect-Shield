"use client";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { requestPasswordReset } from "@/app/auth/actions";

const FIELD = "w-full rounded-xl px-4 py-3 text-sm focus:outline-none";
const FIELD_STYLE = { background: "#FFFFFF", border: "1px solid #C7CDD8", color: "#16202E" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="w-full mt-5 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium disabled:opacity-60"
      style={{ background: "#14213D", color: "#F3F5F8" }}>
      {pending && <Loader2 size={15} className="animate-spin" />}
      {pending ? "Sending" : "Send reset link"}
    </button>
  );
}

export default function ForgotForm() {
  const [state, formAction] = useFormState(requestPasswordReset, {});

  if (state?.sent) {
    return (
      <div className="text-center">
        <div className="w-11 h-11 rounded-full flex items-center justify-center mx-auto" style={{ background: "#EAF6EF" }}>
          <CheckCircle2 size={22} color="#2E9E62" />
        </div>
        <p className="text-sm mt-4" style={{ color: "#64708A" }}>
          If an account exists for that email, a reset link is on its way. Check your inbox and follow the link to set a new password.
        </p>
        <Link href="/login" className="inline-block mt-5 text-sm" style={{ color: "#B8863F" }}>Back to sign in</Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: "#FDECEA", border: "1px solid #F3B8AC" }}>
          <AlertCircle size={15} color="#D14343" className="shrink-0 mt-0.5" />
          <span className="text-sm" style={{ color: "#B23A2E" }}>{state.error}</span>
        </div>
      )}
      <div>
        <label className="text-[11px] font-mono uppercase tracking-wide" style={{ color: "#8992A3" }}>Work email</label>
        <input name="email" type="email" autoComplete="email" required className={FIELD + " mt-1.5"} style={FIELD_STYLE} placeholder="you@yourhospice.com" />
      </div>
      <SubmitButton />
      <div className="text-center">
        <Link href="/login" className="text-[12px]" style={{ color: "#93A0B8" }}>Back to sign in</Link>
      </div>
    </form>
  );
}
