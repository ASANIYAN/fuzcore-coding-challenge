export type CustomerType = "person" | "company";

export type Customer = {
  id: string;
  userId: string;
  displayName: string;
  companyName: string | null;
  type: CustomerType;
  email: string;
  phone: string | null;
  taxId: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type CustomersPaginatedResponse = {
  success: true;
  data: Customer[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CustomerResponse = {
  success: true;
  data: Customer;
};

export type CustomerDeleteResponse = {
  success: true;
  data: {
    message: string;
  };
};
