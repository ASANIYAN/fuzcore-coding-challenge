export type InvoiceStatus = "draft" | "sent" | "paid" | "void";

export type InvoiceItem = {
  id: string;
  invoiceId: string;
  description: string;
  quantity: string;
  unitPrice: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type Invoice = {
  id: string;
  userId: string;
  customerId: string;
  invoiceNumber: number;
  status: InvoiceStatus;
  currency: string;
  taxRate: number | null;
  issueDate: string;
  dueDate: string | null;
  notes: string | null;
  paymentLink: string | null;
  sentAt: string | null;
  paidAt: string | null;
  voidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  items: InvoiceItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
};

export type InvoicesPaginatedResponse = {
  success: true;
  data: Invoice[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type InvoiceResponse = {
  success: true;
  data: Invoice;
};

export type PaymentLinkResponse = {
  success: true;
  data: {
    paymentLink: string;
  };
};

export type InvoiceMessageResponse = {
  success: true;
  data: {
    message: string;
  };
};
