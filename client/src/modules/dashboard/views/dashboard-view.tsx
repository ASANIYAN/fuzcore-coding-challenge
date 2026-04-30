import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import CustomInput from "@/components/custom/custom-input";
import { CustomButton } from "@/components/custom/custom-button";
import { useDashboard } from "@/modules/dashboard/hooks/use-dashboard";

function toIsoStartOfDay(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toISOString();
}

function toIsoEndOfDay(dateString: string) {
  return new Date(`${dateString}T23:59:59.999`).toISOString();
}

export default function DashboardView() {
  const filterForm = useForm({
    defaultValues: {
      from: "",
      to: "",
    },
  });

  const from = filterForm.watch("from");
  const to = filterForm.watch("to");

  const dashboardFrom = from ? toIsoStartOfDay(from) : undefined;
  const dashboardTo = to ? toIsoEndOfDay(to) : undefined;

  const { dashboard, isLoading, isFetching } = useDashboard(dashboardFrom, dashboardTo);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-xxiv font-semibold text-app-text">Dashboard</h1>
        <p className="text-xiii text-app-text-muted">Overview of revenue, expenses, invoices, and recent activity.</p>
      </header>

      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-5">
        <h2 className="mb-4 text-xvi font-semibold text-app-text">Date range</h2>
        <form className="grid gap-4 md:grid-cols-3">
          <CustomInput control={filterForm.control} name="from" label="From" type="date" />
          <CustomInput control={filterForm.control} name="to" label="To" type="date" />
          <div className="flex items-end">
            <CustomButton type="button" loading={isFetching}>Auto refresh</CustomButton>
          </div>
        </form>
      </div>

      {isLoading || !dashboard ? (
        <p className="text-xiii text-app-text-muted">Loading dashboard...</p>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-4">
              <p className="text-xii text-app-text-muted">Revenue</p>
              {dashboard.revenue.length ? dashboard.revenue.map((row) => (
                <p key={row.currency} className="text-xiv font-medium text-app-text">{row.currency} {row.amount.toFixed(2)}</p>
              )) : <p className="text-xiii text-app-text-muted">0.00</p>}
            </div>
            <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-4">
              <p className="text-xii text-app-text-muted">Expenses</p>
              {dashboard.expenses.length ? dashboard.expenses.map((row) => (
                <p key={row.currency} className="text-xiv font-medium text-app-text">{row.currency} {row.amount.toFixed(2)}</p>
              )) : <p className="text-xiii text-app-text-muted">0.00</p>}
            </div>
            <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-4">
              <p className="text-xii text-app-text-muted">Net</p>
              {dashboard.net.length ? dashboard.net.map((row) => (
                <p key={row.currency} className="text-xiv font-medium text-app-text">{row.currency} {row.amount.toFixed(2)}</p>
              )) : <p className="text-xiii text-app-text-muted">0.00</p>}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-4">
              <p className="mb-2 text-xii text-app-text-muted">Outstanding invoices</p>
              {dashboard.outstanding.length ? dashboard.outstanding.map((row) => (
                <p key={row.currency} className="text-xiii text-app-text">{row.currency} {row.amount.toFixed(2)} ({row.invoiceCount} invoices)</p>
              )) : <p className="text-xiii text-app-text-muted">No outstanding invoices.</p>}
            </div>
            <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-4">
              <p className="mb-2 text-xii text-app-text-muted">Overdue invoices</p>
              {dashboard.overdue.length ? dashboard.overdue.map((row) => (
                <p key={row.currency} className="text-xiii text-app-text">{row.currency} {row.amount.toFixed(2)} ({row.invoiceCount} invoices)</p>
              )) : <p className="text-xiii text-app-text-muted">No overdue invoices.</p>}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xii text-app-text-muted">Recent transactions</p>
                <Link to="/dashboard/transactions" className="text-xii text-app-primary hover:underline">View all</Link>
              </div>
              {dashboard.recentTransactions.length ? (
                <ul className="space-y-1">
                  {dashboard.recentTransactions.map((row) => (
                    <li key={row.id} className="text-xiii text-app-text">
                      {new Date(row.transactionDate).toLocaleDateString()} - {row.type} - {row.currency} {row.amount.toFixed(2)}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xiii text-app-text-muted">No recent transactions.</p>
              )}
            </div>
            <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xii text-app-text-muted">Recent invoices</p>
                <Link to="/dashboard/invoices" className="text-xii text-app-primary hover:underline">View all</Link>
              </div>
              {dashboard.recentInvoices.length ? (
                <ul className="space-y-1">
                  {dashboard.recentInvoices.map((row) => (
                    <li key={row.id} className="text-xiii text-app-text">
                      #{row.invoiceNumber} - {row.status} - {row.currency}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xiii text-app-text-muted">No recent invoices.</p>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
