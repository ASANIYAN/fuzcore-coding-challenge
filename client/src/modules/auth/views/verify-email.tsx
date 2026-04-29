import { Link, useSearchParams } from "react-router-dom";
import VerifyEmailForm from "@/modules/auth/components/verify-email-form";

export default function VerifyEmailView() {
  const [params] = useSearchParams();
  const email = params.get("email") ?? "";

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-xxiv font-semibold text-app-text">Verify your email</h1>
        <p className="mt-1 text-xiii text-app-text-muted">Enter the code sent to your email address.</p>
      </div>
      <VerifyEmailForm initialEmail={email} />
      <Link to="/login" className="text-xiii text-app-primary hover:underline">Back to login</Link>
    </section>
  );
}
