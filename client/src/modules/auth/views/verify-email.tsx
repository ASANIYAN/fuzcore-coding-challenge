import { Link } from "react-router-dom";

export default function VerifyEmailView() {
  return (
    <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center gap-3 px-6">
      <h1 className="text-xxiv font-semibold text-app-text">Verify your email</h1>
      <p className="text-xiii text-app-text-muted">Enter the 6-digit code we sent to your email address.</p>
      <Link to="/login" className="text-xiii text-app-primary hover:underline">Back to login</Link>
    </section>
  );
}
