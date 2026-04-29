import { createBrowserRouter, type RouteObject } from "react-router-dom";
import App from "@/App";
import DashboardLayout from "@/components/layouts/dashboard-layout";
import LoginView from "@/modules/auth/views/login";
import SignupView from "@/modules/auth/views/signup";
import ForgotPasswordView from "@/modules/auth/views/forgot-password";
import VerifyEmailView from "@/modules/auth/views/verify-email";
import ResetPasswordView from "@/modules/auth/views/reset-password";
import DashboardView from "@/modules/dashboard/views/dashboard-view";
import ProfileView from "@/modules/profile/views/profile-view";
import CustomersListView from "@/modules/customers/views/customers-list";
import CustomerDetailsView from "@/modules/customers/views/customer-details";
import CategoriesListView from "@/modules/categories/views/categories-list";
import TransactionsListView from "@/modules/transactions/views/transactions-list";
import TransactionsImportView from "@/modules/transactions/views/transactions-import";
import InvoicesListView from "@/modules/invoices/views/invoices-list";
import InvoiceCreateView from "@/modules/invoices/views/invoice-create";
import InvoiceDetailsView from "@/modules/invoices/views/invoice-details";

const dashboardRoutes: RouteObject[] = [
  {
    path: "/dashboard",
    element: <DashboardLayout />,
    children: [
      { index: true, element: <DashboardView /> },
      { path: "customers", element: <CustomersListView /> },
      { path: "customers/:id", element: <CustomerDetailsView /> },
      { path: "categories", element: <CategoriesListView /> },
      { path: "transactions", element: <TransactionsListView /> },
      { path: "transactions/import", element: <TransactionsImportView /> },
      { path: "invoices", element: <InvoicesListView /> },
      { path: "invoices/new", element: <InvoiceCreateView /> },
      { path: "invoices/:id", element: <InvoiceDetailsView /> },
      { path: "profile", element: <ProfileView /> },
    ],
  },
];

const unprotectedRoutes: RouteObject[] = [
  { index: true, element: <SignupView /> },
  { path: "/login", element: <LoginView /> },
  { path: "/signup", element: <SignupView /> },
  { path: "/forgot-password", element: <ForgotPasswordView /> },
  { path: "/verify-email", element: <VerifyEmailView /> },
  { path: "/reset-password", element: <ResetPasswordView /> },
];

export const routes: RouteObject[] = [
  {
    path: "/",
    element: <App />,
    errorElement: (
      <section className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-xxiv font-semibold text-app-text">Something went wrong</h1>
        <p className="text-xiii text-app-text-muted">
          We ran into an issue loading this page. Please refresh and try again.
        </p>
      </section>
    ),
    children: [
      ...unprotectedRoutes,
      ...dashboardRoutes,
      {
        path: "*",
        element: (
          <section className="mx-auto flex min-h-screen w-full max-w-lg flex-col items-center justify-center gap-3 px-6 text-center">
            <h1 className="text-xxiv font-semibold text-app-text">Page not found</h1>
            <p className="text-xiii text-app-text-muted">
              The page you are looking for does not exist or may have moved.
            </p>
          </section>
        ),
      },
    ],
  },
];

const router = createBrowserRouter(routes);

export default router;
