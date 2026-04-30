import { Link, useParams, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function InvoicePaymentResultView() {
  const { id = "" } = useParams();
  const [searchParams] = useSearchParams();
  const payment = (searchParams.get("payment") ?? "").toLowerCase();

  const isSuccess = payment === "success";
  const isFailed = payment === "failed";

  const title = isSuccess
    ? "Payment successful"
    : isFailed
      ? "Payment failed"
      : "Payment status unavailable";

  const description = isSuccess
    ? "Thank you. Your payment has been confirmed and the invoice should update shortly."
    : isFailed
      ? "Your payment did not complete. Please retry the payment link or contact support."
      : "We could not confirm this payment result. Please check your email receipt or contact support.";

  const badgeClass = isSuccess
    ? "border-status-paid-border bg-status-paid-bg text-status-paid-text"
    : isFailed
      ? "border-app-danger-border bg-app-danger-dim text-app-danger"
      : "border-status-draft-border bg-status-draft-bg text-status-draft-text";

  return (
    <section className="mx-auto flex min-h-screen w-full max-w-2xl items-center px-6 py-10">
      <div className="w-full rounded-xl border border-app-border bg-app-card p-8 shadow-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h1 className="text-xxiv font-semibold text-app-text">{title}</h1>
          <Badge variant="outline" className={`capitalize ${badgeClass}`}>
            {payment || "unknown"}
          </Badge>
        </div>
        <p className="text-xiii text-app-text-muted">{description}</p>

        <div className="mt-6 rounded-[--radius-md] border border-app-border bg-app-surface p-4">
          <p className="text-xii text-app-text-subtle">Invoice ID</p>
          <p className="mt-1 break-all text-xiii text-app-text">{id}</p>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/login" className="text-xiii text-app-primary transition-colors hover:text-app-primary-hover">
            Go to login
          </Link>
        </div>
      </div>
    </section>
  );
}
