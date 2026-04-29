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
    { name: "Invoices" },
    { name: "Transactions" },
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
  },
} as const;
