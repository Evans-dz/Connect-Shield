"use client";
import { useFormState, useFormStatus } from "react-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { updatePassword } from "@/app/auth/actions";

const FIELD = "w-full rounded-xl px-4 py-3 text-sm focus:outline-none";
const FIELD_STYLE = { background: "#FFFFFF", border: "1px solid #C7CDD8", color: "#16202E" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending}
      className="w-full mt-5 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium disabled:opacity-60"
      style={{ background: "#14213D", color: "#F3F5F8" }}>
      {pending && <Loader2 size={15} className="animate-spin" />}
      {pending ? "Saving" : "Set new password"}
    </button>
  );
}

export default function ResetForm() {
  const [state, formAction] = useFormState(updatePassword, {});
  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: "#FDECEA", border: "1px solid #F3B8AC" }}>
          <AlertCircle size={15} color="#D14343" className="shrink-0 mt-0.5" />
          <span className="text-sm" style={{ color: "#B23A2E" }}>{state.error}</span>
        </div>
      )}
      <div>
        <label className="text-[11px] font-mono uppercase tracking-wide" style={{ color: "#8992A3" }}>New password</label>
        <input name="password" type="password" autoComplete="new-password" required minLength={10} className={FIELD + " mt-1.5"} style={FIELD_STYLE} placeholder="At least 10 characters" />
      </div>
      <div>
        <label className="text-[11px] font-mono uppercase tracking-wide" style={{ color: "#8992A3" }}>Confirm new password</label>
        <input name="confirm" type="password" autoComplete="new-password" required minLength={10} className={FIELD + " mt-1.5"} style={FIELD_STYLE} placeholder="Re-enter your password" />
      </div>
      <SubmitButton />
    </form>
  );
}
