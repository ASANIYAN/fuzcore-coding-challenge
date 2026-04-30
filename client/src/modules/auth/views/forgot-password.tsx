import { Link } from "react-router-dom";
import ForgotPasswordForm from "@/modules/auth/components/forgot-password-form";

export default function ForgotPasswordView() {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <div className="rounded-xl border border-app-border bg-app-card p-6 shadow-card transition-all duration-normal hover:shadow-lg">
        <h1 className="text-xxiv font-semibold text-app-text">
          Forgot password
        </h1>
        <p className="mt-1 text-xiii text-app-text-muted">
          Enter your email and we&apos;ll send a reset code.
        </p>
        <div className="mt-6">
          <ForgotPasswordForm />
        </div>
        <Link
          to="/login"
          className="mt-4 inline-block text-xiii text-app-text transition-colors hover:text-app-text-hover"
        >
          Back to login
        </Link>
      </div>
    </section>
  );
}
