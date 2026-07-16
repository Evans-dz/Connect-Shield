import AuthShell from "@/components/AuthShell";
import ForgotForm from "./ForgotForm";

export const metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Reset your password" subtitle="We'll email you a secure link to set a new one.">
      <ForgotForm />
    </AuthShell>
  );
}
