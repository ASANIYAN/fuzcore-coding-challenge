import { Link, useSearchParams } from "react-router-dom";
import ResetPasswordForm from "@/modules/auth/components/reset-password-form";

export default function ResetPasswordView() {
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <div className="rounded-xl border border-app-border bg-app-card p-6 shadow-card transition-all duration-normal hover:shadow-lg">
        <h1 className="text-xxiv font-semibold text-app-text">Reset password</h1>
        <p className="mt-1 text-xiii text-app-text-muted">
          Enter the reset code from your email and choose a new password.
        </p>
        <div className="mt-6">
          <ResetPasswordForm initialEmail={email} />
        </div>
        <Link to="/login" className="mt-4 inline-block text-xiii text-app-primary transition-colors hover:text-app-primary-hover">Back to login</Link>
      </div>
    </section>
  );
}
