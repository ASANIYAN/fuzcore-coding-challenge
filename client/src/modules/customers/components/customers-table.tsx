import { Link } from "react-router-dom";
import { CustomButton } from "@/components/custom/custom-button";
import type { Customer } from "@/modules/customers/types";

type CustomersTableProps = {
  customers: Customer[];
  deletingCustomerId?: string | null;
  onDelete: (customerId: string) => void;
};

export default function CustomersTable({
  customers,
  deletingCustomerId,
  onDelete,
}: CustomersTableProps) {
  if (!customers.length) {
    return (
      <div className="rounded-[--radius-lg] border border-app-border bg-app-card p-6 text-xiii text-app-text-muted">
        No customers found. Create your first customer to get started.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[--radius-lg] border border-app-border bg-app-card">
      <table className="w-full min-w-[760px] text-left text-xiii">
        <thead className="border-b border-app-border bg-app-surface text-app-text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Name</th>
            <th className="px-4 py-3 font-medium">Type</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Country</th>
            <th className="px-4 py-3 font-medium">Created</th>
            <th className="px-4 py-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((customer) => (
            <tr key={customer.id} className="border-b border-app-border last:border-b-0">
              <td className="px-4 py-3 text-app-text">{customer.displayName}</td>
              <td className="px-4 py-3 text-app-text-muted capitalize">{customer.type}</td>
              <td className="px-4 py-3 text-app-text">{customer.email}</td>
              <td className="px-4 py-3 text-app-text-muted">{customer.country ?? "-"}</td>
              <td className="px-4 py-3 text-app-text-muted">
                {new Date(customer.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Link
                    to={`/dashboard/customers/${customer.id}`}
                    className="text-app-primary hover:underline"
                  >
                    View
                  </Link>
                  <CustomButton
                    type="button"
                    size="sm"
                    variant="danger"
                    loading={deletingCustomerId === customer.id}
                    onClick={() => onDelete(customer.id)}
                  >
                    Delete
                  </CustomButton>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
