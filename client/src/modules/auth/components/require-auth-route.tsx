import { Navigate, Outlet, useLocation } from "react-router-dom";
import { CustomSpinner } from "@/components/custom/custom-spinner";
import { useSessionStatus } from "@/modules/auth/hooks/use-session-status";

export default function RequireAuthRoute() {
  const location = useLocation();
  const { isAuthenticated, isLoading, isError } = useSessionStatus();

  if (isLoading) {
    return (
      <section className="flex min-h-screen items-center justify-center gap-2 text-app-text-muted">
        <CustomSpinner />
        <p className="text-xiii">Checking your session...</p>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xxiv font-semibold text-app-text">
          We couldn&apos;t verify your session
        </h1>
        <p className="text-xiii text-app-text-muted">
          Please refresh the page and try again.
        </p>
      </section>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
