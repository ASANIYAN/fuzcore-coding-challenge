import { Link } from "react-router-dom";
import SignupForm from "@/modules/auth/components/signup-form";

export default function SignupView() {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-10">
      <div className="grid w-full gap-8 md:grid-cols-[1.1fr_1fr]">
        <div className="hidden rounded-xl border border-app-primary-border bg-gradient-to-br from-app-primary-dim via-app-surface to-app-card p-8 shadow-card md:flex md:flex-col md:justify-between">
          <div>
            <h2 className="mt-3 text-xxiv font-semibold text-app-text">
              Create your workspace
            </h2>
            <p className="mt-2 text-xiii text-app-text-muted">
              Start with secure auth, then manage customers, invoices, and
              payments.
            </p>
          </div>
          <p className="text-xii text-app-text-subtle">
            Built for clarity, speed, and finance-first UX.
          </p>
        </div>
        <div className="rounded-xl border border-app-border bg-app-card p-6 shadow-card transition-all duration-normal hover:shadow-lg">
          <h1 className="text-xxiv font-semibold text-app-text">
            Create account
          </h1>
          <p className="mt-1 text-xiii text-app-text-muted">
            Start managing your finances in one place.
          </p>
          <div className="mt-6">
            <SignupForm />
          </div>
          <p className="mt-3 text-xiii text-app-text-muted">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-app-text transition-colors hover:text-app-text-hover"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
