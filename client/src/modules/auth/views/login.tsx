import { Link } from "react-router-dom";
import LoginForm from "@/modules/auth/components/login-form";

export default function LoginView() {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-6 py-10">
      <div className="grid w-full gap-8 md:grid-cols-[1.1fr_1fr]">
        <div className="hidden rounded-xl border border-app-primary-border bg-gradient-to-br from-app-primary-dim via-app-surface to-app-card p-8 shadow-card md:flex md:flex-col md:justify-between">
          <div>
            <h2 className="mt-3 text-xxiv font-semibold text-app-text">
              Finance workspace
            </h2>
            <p className="mt-2 text-xiii text-app-text-muted">
              Secure invoicing, transaction flows, and customer operations in
              one clear surface.
            </p>
          </div>
          <p className="text-xii text-app-text-subtle">
            Trusted sessions. Predictable APIs. Fast workflows.
          </p>
        </div>

        <div className="rounded-xl border border-app-border bg-app-card p-6 shadow-card transition-all duration-normal hover:shadow-lg">
          <h1 className="text-xxiv font-semibold text-app-text">
            Welcome back
          </h1>
          <p className="mt-1 text-xiii text-app-text-muted">
            Sign in to continue.
          </p>
          <div className="mt-6">
            <LoginForm />
          </div>
          <Link
            to="/forgot-password"
            className="mt-4 inline-block text-xiii text-app-primary transition-colors hover:text-app-primary-hover"
          >
            Forgot your password?
          </Link>
          <p className="mt-3 text-xiii text-app-text-muted">
            Don&apos;t have an account?{" "}
            <Link
              to="/signup"
              className="text-app-primary transition-colors hover:text-app-primary-hover"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
