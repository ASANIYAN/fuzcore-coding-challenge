import { Link, Outlet } from "react-router-dom";
import { CustomButton } from "@/components/custom/custom-button";
import { useLogout } from "@/modules/auth/hooks/use-logout";

export default function DashboardLayout() {
  const { logout, isLoggingOut } = useLogout();

  return (
    <div className="min-h-screen bg-app-surface text-app-text">
      <header className="border-b border-app-border bg-app-card">
        <nav className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4 text-sm">
          <Link to="/dashboard" className="text-app-primary hover:underline">Dashboard</Link>
          <Link to="/dashboard/customers" className="text-app-primary hover:underline">Customers</Link>
          <Link to="/dashboard/categories" className="text-app-primary hover:underline">Categories</Link>
          <Link to="/dashboard/transactions" className="text-app-primary hover:underline">Transactions</Link>
          <Link to="/dashboard/invoices" className="text-app-primary hover:underline">Invoices</Link>
          <Link to="/dashboard/profile" className="text-app-primary hover:underline">Profile</Link>
          <div className="ml-auto">
            <CustomButton
              type="button"
              variant="secondary"
              size="sm"
              loading={isLoggingOut}
              onClick={() => logout()}
            >
              Logout
            </CustomButton>
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
