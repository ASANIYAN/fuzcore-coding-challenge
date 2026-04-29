import { Link } from "react-router-dom";

export default function ResetPasswordView() {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-3 px-6">
      <h1 className="text-xxiv font-semibold text-app-text">Reset your password</h1>
      <p className="text-xiii text-app-text-muted">Use your reset code and choose a new password to regain access.</p>
      <Link to="/login" className="text-xiii text-app-primary hover:underline">Back to login</Link>
    </section>
  );
}
