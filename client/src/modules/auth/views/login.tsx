import { Link } from "react-router-dom";
import LoginForm from "@/modules/auth/components/login-form";

export default function LoginView() {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-6 px-6">
      <div>
        <h1 className="text-xxiv font-semibold text-app-text">Welcome back</h1>
        <p className="mt-1 text-xiii text-app-text-muted">Sign in to continue.</p>
      </div>
      <LoginForm />
      <p className="text-xiii text-app-text-muted">
        Don&apos;t have an account? <Link to="/signup" className="text-app-primary hover:underline">Create one</Link>
      </p>
    </section>
  );
}
