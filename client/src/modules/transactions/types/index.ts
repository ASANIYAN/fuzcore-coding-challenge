export type TransactionType = "income" | "expense";

export type Transaction = {
  id: string;
  userId: string;
  customerId: string | null;
  categoryId: string;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string | null;
  reference: string | null;
  transactionDate: string;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type TransactionsPaginatedResponse = {
  success: true;
  data: Transaction[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type TransactionResponse = {
  success: true;
  data: Transaction;
};

export type TransactionDeleteResponse = {
  success: true;
  data: {
    message: string;
  };
};
