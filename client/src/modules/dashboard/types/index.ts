export type DashboardMoney = {
  currency: string;
  amount: number;
};

export type DashboardInvoiceMetric = {
  currency: string;
  amount: number;
  invoiceCount: number;
};

export type DashboardRecentTransaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  currency: string;
  description: string | null;
  transactionDate: string;
};

export type DashboardRecentInvoice = {
  id: string;
  invoiceNumber: number;
  status: "draft" | "sent" | "paid" | "void";
  currency: string;
  issueDate: string;
  dueDate: string | null;
};

export type DashboardData = {
  period: {
    from: string;
    to: string;
  };
  revenue: DashboardMoney[];
  expenses: DashboardMoney[];
  net: DashboardMoney[];
  outstanding: DashboardInvoiceMetric[];
  overdue: DashboardInvoiceMetric[];
  recentTransactions: DashboardRecentTransaction[];
  recentInvoices: DashboardRecentInvoice[];
};

export type DashboardResponse = {
  success: true;
  data: DashboardData;
};
