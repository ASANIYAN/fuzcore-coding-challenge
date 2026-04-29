export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Small Business Accounting API",
    version: "1.0.0",
    description: "Backend API contract for accounting and invoicing flows.",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Customers" },
    { name: "Categories" },
    { name: "Invoices" },
    { name: "Transactions" },
    { name: "Dashboard" },
    { name: "Webhooks" },
  ],
  paths: {
    "/api/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "Register user and dispatch verification code",
        responses: {
          "201": { description: "Signup accepted" },
          "409": { description: "Conflict" },
        },
      },
    },
    "/api/auth/verify-email": {
      post: {
        tags: ["Auth"],
        summary: "Verify user email with OTP",
        responses: {
          "200": { description: "Email verified" },
          "400": { description: "Invalid verification code" },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login user and create session",
        responses: {
          "200": { description: "Login successful" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout user and revoke current session",
        responses: {
          "200": { description: "Logout successful" },
        },
      },
    },
    "/api/customers": {
      get: {
        tags: ["Customers"],
        summary: "List customers",
        responses: {
          "200": { description: "Customers fetched" },
        },
      },
      post: {
        tags: ["Customers"],
        summary: "Create customer",
        responses: {
          "201": { description: "Customer created" },
          "400": { description: "Validation error" },
        },
      },
    },
    "/api/customers/{id}": {
      get: {
        tags: ["Customers"],
        summary: "Get customer by id",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Customer fetched" },
          "404": { description: "Not found" },
        },
      },
      patch: {
        tags: ["Customers"],
        summary: "Update customer",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Customer updated" },
        },
      },
      delete: {
        tags: ["Customers"],
        summary: "Archive customer",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Customer archived" },
        },
      },
    },
    "/api/categories": {
      get: {
        tags: ["Categories"],
        summary: "List categories",
        responses: {
          "200": { description: "Categories fetched" },
        },
      },
      post: {
        tags: ["Categories"],
        summary: "Create category",
        responses: {
          "201": { description: "Category created" },
        },
      },
    },
    "/api/categories/{id}": {
      get: {
        tags: ["Categories"],
        summary: "Get category by id",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Category fetched" },
        },
      },
      patch: {
        tags: ["Categories"],
        summary: "Update category",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Category updated" },
        },
      },
      delete: {
        tags: ["Categories"],
        summary: "Archive category",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Category archived" },
        },
      },
    },
    "/api/transactions": {
      get: {
        tags: ["Transactions"],
        summary: "List transactions",
        responses: {
          "200": { description: "Transactions fetched" },
        },
      },
      post: {
        tags: ["Transactions"],
        summary: "Create transaction",
        responses: {
          "201": { description: "Transaction created" },
        },
      },
    },
    "/api/transactions/{id}": {
      get: {
        tags: ["Transactions"],
        summary: "Get transaction by id",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Transaction fetched" },
        },
      },
      patch: {
        tags: ["Transactions"],
        summary: "Update transaction",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Transaction updated" },
        },
      },
      delete: {
        tags: ["Transactions"],
        summary: "Archive transaction",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Transaction archived" },
        },
      },
    },
    "/api/invoices/{id}/payment-link": {
      post: {
        tags: ["Invoices"],
        summary: "Create Stripe payment link for a sent invoice",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Payment link returned" },
          "400": { description: "Invalid invoice state" },
        },
      },
    },
    "/api/invoices/{id}/pdf": {
      get: {
        tags: ["Invoices"],
        summary: "Generate invoice PDF",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "PDF stream" },
          "404": { description: "Invoice not found" },
        },
      },
    },
    "/api/invoices": {
      get: {
        tags: ["Invoices"],
        summary: "List invoices",
        responses: {
          "200": { description: "Invoices fetched" },
        },
      },
      post: {
        tags: ["Invoices"],
        summary: "Create invoice",
        responses: {
          "201": { description: "Invoice created" },
        },
      },
    },
    "/api/invoices/{id}": {
      get: {
        tags: ["Invoices"],
        summary: "Get invoice by id",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Invoice fetched" },
          "404": { description: "Not found" },
        },
      },
      patch: {
        tags: ["Invoices"],
        summary: "Update invoice",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Invoice updated" },
        },
      },
    },
    "/api/invoices/{id}/status": {
      post: {
        tags: ["Invoices"],
        summary: "Transition invoice status",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Invoice status updated" },
          "400": { description: "Invalid transition" },
        },
      },
    },
    "/api/transactions/import": {
      post: {
        tags: ["Transactions"],
        summary: "Queue bulk transaction import",
        responses: {
          "202": { description: "Import queued" },
          "400": { description: "Invalid payload" },
        },
      },
    },
    "/api/webhooks/stripe": {
      post: {
        tags: ["Webhooks"],
        summary: "Stripe webhook endpoint",
        responses: {
          "200": { description: "Webhook acknowledged" },
          "400": { description: "Invalid signature" },
        },
      },
    },
    "/api/dashboard": {
      get: {
        tags: ["Dashboard"],
        summary: "Get dashboard aggregates",
        responses: {
          "200": { description: "Dashboard fetched" },
        },
      },
    },
  },
} as const;
