import { Link, Outlet } from "react-router-dom";
import { CustomButton } from "@/components/custom/custom-button";
import { useLogout } from "@/modules/auth/hooks/use-logout";

export default function DashboardLayout() {
  const { logout, isLoggingOut } = useLogout();

  return (
    <div className="min-h-screen text-app-text">
      <header className="sticky top-0 z-20 border-b border-app-border/80 bg-app-card/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-4 text-xiii">
          <Link to="/dashboard" className="rounded-full px-3 py-1.5 text-app-primary transition-all duration-fast hover:bg-app-primary-dim hover:text-app-primary-hover">Dashboard</Link>
          <Link to="/dashboard/customers" className="rounded-full px-3 py-1.5 text-app-primary transition-all duration-fast hover:bg-app-primary-dim hover:text-app-primary-hover">Customers</Link>
          <Link to="/dashboard/categories" className="rounded-full px-3 py-1.5 text-app-primary transition-all duration-fast hover:bg-app-primary-dim hover:text-app-primary-hover">Categories</Link>
          <Link to="/dashboard/transactions" className="rounded-full px-3 py-1.5 text-app-primary transition-all duration-fast hover:bg-app-primary-dim hover:text-app-primary-hover">Transactions</Link>
          <Link to="/dashboard/invoices" className="rounded-full px-3 py-1.5 text-app-primary transition-all duration-fast hover:bg-app-primary-dim hover:text-app-primary-hover">Invoices</Link>
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
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
