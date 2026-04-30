import { Navigate, Outlet } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { useSessionStatus } from "@/modules/auth/hooks/use-session-status";

export default function GuestOnlyRoute() {
  const { isAuthenticated, isLoading, user } = useSessionStatus();

  if (isLoading) {
    return (
      <section className="flex min-h-screen items-center justify-center text-app-text-muted">
        <div className="space-y-3">
          <Skeleton className="h-6 w-72" />
          <Skeleton className="h-4 w-56" />
        </div>
      </section>
    );
  }

  if (isAuthenticated && user?.emailVerifiedAt) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
