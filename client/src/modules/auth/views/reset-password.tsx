import { Link, useSearchParams } from "react-router-dom";
import ResetPasswordForm from "@/modules/auth/components/reset-password-form";

export default function ResetPasswordView() {
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-xxiv font-semibold text-app-text">Reset password</h1>
        <p className="mt-1 text-xiii text-app-text-muted">
          Enter the reset code from your email and choose a new password.
        </p>
      </div>
      <ResetPasswordForm initialEmail={email} />
      <Link to="/login" className="text-xiii text-app-primary hover:underline">Back to login</Link>
    </section>
  );
}
