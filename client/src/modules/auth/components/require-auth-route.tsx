import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionStatus } from "@/modules/auth/hooks/use-session-status";

export default function RequireAuthRoute() {
  const location = useLocation();
  const { isAuthenticated, isLoading, isError, user } = useSessionStatus();

  if (isLoading) {
    return (
      <section className="flex min-h-screen items-center justify-center text-app-text-muted">
        <div className="space-y-3">
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-4 w-48" />
        </div>
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

  if (isAuthenticated && !user?.emailVerifiedAt) {
    return (
      <Navigate
        to={`/login?email=${encodeURIComponent(user?.email ?? "")}&unverified=1`}
        replace
      />
    );
  }

  return <Outlet />;
}
