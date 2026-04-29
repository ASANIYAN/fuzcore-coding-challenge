import { Link, Outlet } from "react-router-dom";

export default function DashboardLayout() {
  return (
    <div className="min-h-screen bg-app-surface text-app-text">
      <header className="border-b border-app-border bg-app-card">
        <nav className="mx-auto flex max-w-5xl items-center gap-4 px-6 py-4 text-sm">
          <Link to="/dashboard" className="text-app-primary hover:underline">Dashboard</Link>
          <Link to="/dashboard/urls" className="text-app-primary hover:underline">URLs</Link>
          <Link to="/dashboard/profile" className="text-app-primary hover:underline">Profile</Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-8">
        <Outlet />
      </main>
    </div>
  );
}
