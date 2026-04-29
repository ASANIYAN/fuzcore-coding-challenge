import { Link } from "react-router-dom";
import SignupForm from "@/modules/auth/components/signup-form";

export default function SignupView() {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-xxiv font-semibold text-app-text">Create account</h1>
        <p className="mt-1 text-xiii text-app-text-muted">Start managing your finances in one place.</p>
      </div>
      <SignupForm />
      <p className="text-xiii text-app-text-muted">
        Already have an account? <Link to="/login" className="text-app-primary hover:underline">Sign in</Link>
      </p>
    </section>
  );
}
