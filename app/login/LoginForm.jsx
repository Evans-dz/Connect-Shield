"use client";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { signIn } from "@/app/auth/actions";

const FIELD = "w-full rounded-xl px-4 py-3 text-sm focus:outline-none";
const FIELD_STYLE = { background: "#FFFFFF", border: "1px solid #C7CDD8", color: "#16202E" };
const LABEL = "text-[11px] font-mono uppercase tracking-wide";
const LABEL_STYLE = { color: "#8992A3" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="w-full mt-5 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium disabled:opacity-60"
      style={{ background: "#14213D", color: "#F3F5F8" }}>
      {pending && <Loader2 size={15} className="animate-spin" />}
      {pending ? "Signing in" : "Sign in"}
    </button>
  );
}

export default function LoginForm() {
  const [state, formAction] = useFormState(signIn, {});
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: "#FDECEA", border: "1px solid #F3B8AC" }}>
          <AlertCircle size={15} color="#D14343" className="shrink-0 mt-0.5" />
          <span className="text-sm" style={{ color: "#B23A2E" }}>{state.error}</span>
        </div>
      )}
      <div>
        <label className={LABEL} style={LABEL_STYLE}>Work email</label>
        <input name="email" type="email" autoComplete="email" required className={FIELD + " mt-1.5"} style={FIELD_STYLE} placeholder="you@yourhospice.com" />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className={LABEL} style={LABEL_STYLE}>Password</label>
          <Link href="/forgot-password" className="text-[12px]" style={{ color: "#B8863F" }}>Forgot password?</Link>
        </div>
        <input name="password" type="password" autoComplete="current-password" required className={FIELD + " mt-1.5"} style={FIELD_STYLE} placeholder="••••••••••" />
      </div>
      <SubmitButton />
    </form>
  );
}
