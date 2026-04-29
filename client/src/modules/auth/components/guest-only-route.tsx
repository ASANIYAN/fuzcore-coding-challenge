import { Navigate, Outlet } from "react-router-dom";
import { CustomSpinner } from "@/components/custom/custom-spinner";
import { useSessionStatus } from "@/modules/auth/hooks/use-session-status";

export default function GuestOnlyRoute() {
  const { isAuthenticated, isLoading } = useSessionStatus();

  if (isLoading) {
    return (
      <section className="flex min-h-screen items-center justify-center gap-2 text-app-text-muted">
        <CustomSpinner />
        <p className="text-xiii">Preparing your session...</p>
      </section>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
