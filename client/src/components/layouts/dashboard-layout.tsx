import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { CustomButton } from "@/components/custom/custom-button";
import ConfirmActionDialog from "@/components/custom/confirm-action-dialog";
import { cn } from "@/lib/utils";
import { useLogout } from "@/modules/auth/hooks/use-logout";

const dashboardLinks = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/dashboard/customers", label: "Customers" },
  { to: "/dashboard/categories", label: "Categories" },
  { to: "/dashboard/transactions", label: "Transactions" },
  { to: "/dashboard/invoices", label: "Invoices" },
];

const navLinkClassName =
  "rounded-full px-3 py-1.5 text-app-primary transition-all duration-fast hover:bg-app-primary-dim hover:text-app-text-hover";

export default function DashboardLayout() {
  const { logout, isLoggingOut } = useLogout();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen text-app-text">
      <header className="sticky top-0 z-20 border-b border-app-border/80 bg-app-card/90 backdrop-blur-md">
        <nav className="mx-auto max-w-6xl px-4 py-4 text-xiii sm:px-6">
          <div className="hidden items-center gap-2 md:flex">
            {dashboardLinks.map((link) => (
              <Link key={link.to} to={link.to} className={navLinkClassName}>
                {link.label}
              </Link>
            ))}
            <div className="ml-auto">
              <CustomButton
                type="button"
                variant="secondary"
                size="sm"
                loading={isLoggingOut}
                onClick={() => setIsLogoutDialogOpen(true)}
              >
                Logout
              </CustomButton>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 md:hidden">
            <CustomButton
              type="button"
              variant="secondary"
              size="sm"
              leftIcon={
                isMobileNavOpen ? <X className="size-4" /> : <Menu className="size-4" />
              }
              aria-controls="dashboard-mobile-nav"
              aria-expanded={isMobileNavOpen}
              onClick={() => setIsMobileNavOpen((open) => !open)}
            >
              Menu
            </CustomButton>

            <CustomButton
              type="button"
              variant="secondary"
              size="sm"
              loading={isLoggingOut}
              onClick={() => setIsLogoutDialogOpen(true)}
            >
              Logout
            </CustomButton>
          </div>

          <div
            id="dashboard-mobile-nav"
            className={cn(
              "mt-3 grid gap-2 border-t border-app-border/60 pt-3 md:hidden",
              !isMobileNavOpen && "hidden",
            )}
          >
            {dashboardLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={cn(navLinkClassName, "block w-full")}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <Outlet />
      </main>

      <ConfirmActionDialog
        open={isLogoutDialogOpen}
        title="Log out?"
        description="You will be signed out of your current session."
        confirmLabel="Log out"
        loading={isLoggingOut}
        onOpenChange={setIsLogoutDialogOpen}
        onConfirm={() => void logout()}
      />
    </div>
  );
}
