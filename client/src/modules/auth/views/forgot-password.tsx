import { Link } from "react-router-dom";
import ForgotPasswordForm from "@/modules/auth/components/forgot-password-form";

export default function ForgotPasswordView() {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-xxiv font-semibold text-app-text">Forgot password</h1>
        <p className="mt-1 text-xiii text-app-text-muted">
          Enter your email and we&apos;ll send a reset code.
        </p>
      </div>
      <ForgotPasswordForm />
      <Link to="/login" className="text-xiii text-app-primary hover:underline">Back to login</Link>
    </section>
  );
}
