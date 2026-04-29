const successEnvelope = (dataSchemaRef: string) => ({
  type: "object",
  required: ["success", "data", "meta"],
  properties: {
    success: { type: "boolean", enum: [true] },
    data: { $ref: dataSchemaRef },
    meta: { type: "object", additionalProperties: true },
  },
});

const successEnvelopeNoMeta = (dataSchemaRef: string) => ({
  type: "object",
  required: ["success", "data"],
  properties: {
    success: { type: "boolean", enum: [true] },
    data: { $ref: dataSchemaRef },
  },
});

const paginatedEnvelope = (itemSchemaRef: string) => ({
  type: "object",
  required: ["success", "data", "meta"],
  properties: {
    success: { type: "boolean", enum: [true] },
    data: {
      type: "array",
      items: { $ref: itemSchemaRef },
    },
    meta: {
      type: "object",
      required: ["page", "limit", "total", "totalPages"],
      properties: {
        page: { type: "integer" },
        limit: { type: "integer" },
        total: { type: "integer" },
        totalPages: { type: "integer" },
      },
    },
  },
});

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Small Business Accounting API",
    version: "1.0.0",
    description:
      "Backend API contract for accounting and invoicing flows. Authentication uses server-managed sessions via HTTP-only cookies (no JWT bearer tokens).",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Auth" },
    { name: "Customers" },
    { name: "Categories" },
    { name: "Transactions" },
    { name: "Invoices" },
    { name: "Dashboard" },
    { name: "Webhooks" },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: "apiKey",
        in: "cookie",
        name: "sid",
        description:
          "Session cookie issued by the server via Set-Cookie after successful signup/login.",
      },
    },
    schemas: {
      ErrorEnvelope: {
        type: "object",
        required: ["success", "error"],
        example: {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: [
              {
                path: ["password"],
                message: "Password must contain at least 8 character(s)",
              },
            ],
          },
        },
        properties: {
          success: { type: "boolean", enum: [false] },
          error: {
            type: "object",
            required: ["code", "message", "details"],
            properties: {
              code: { type: "string" },
              message: { type: "string" },
              details: {
                type: "array",
                items: {
                  type: "object",
                  required: ["path", "message"],
                  properties: {
                    path: {
                      type: "array",
                      items: {
                        oneOf: [{ type: "string" }, { type: "number" }],
                      },
                    },
                    message: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      User: {
        type: "object",
        required: ["id", "email", "emailVerifiedAt"],
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          emailVerifiedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      AuthMessage: {
        type: "object",
        required: ["message"],
        properties: {
          message: { type: "string" },
        },
      },
      SignupRequest: {
        type: "object",
        required: ["email", "password"],
        example: {
          email: "owner@example.com",
          password: "supersecure123",
        },
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
        },
      },
      VerifyEmailRequest: {
        type: "object",
        required: ["email", "code"],
        example: {
          email: "owner@example.com",
          code: "123456",
        },
        properties: {
          email: { type: "string", format: "email" },
          code: { type: "string", minLength: 4, maxLength: 10 },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["email", "password"],
        example: {
          email: "owner@example.com",
          password: "supersecure123",
        },
        properties: {
          email: { type: "string", format: "email" },
          password: { type: "string", minLength: 8 },
        },
      },
      ForgotPasswordRequest: {
        type: "object",
        required: ["email"],
        example: {
          email: "owner@example.com",
        },
        properties: {
          email: { type: "string", format: "email" },
        },
      },
      ResetPasswordRequest: {
        type: "object",
        required: ["email", "code", "newPassword"],
        example: {
          email: "owner@example.com",
          code: "123456",
          newPassword: "newsecure123",
        },
        properties: {
          email: { type: "string", format: "email" },
          code: { type: "string", minLength: 4, maxLength: 10 },
          newPassword: { type: "string", minLength: 8 },
        },
      },
      Customer: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          displayName: { type: "string" },
          companyName: { type: "string", nullable: true },
          type: { type: "string", enum: ["person", "company"] },
          email: { type: "string", format: "email", nullable: true },
          phone: { type: "string", nullable: true },
          taxId: { type: "string", nullable: true },
          addressLine1: { type: "string", nullable: true },
          addressLine2: { type: "string", nullable: true },
          city: { type: "string", nullable: true },
          state: { type: "string", nullable: true },
          postalCode: { type: "string", nullable: true },
          country: { type: "string", nullable: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          archivedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      CreateCustomerRequest: {
        type: "object",
        required: ["displayName", "type"],
        example: {
          displayName: "Acme Ltd",
          type: "company",
          companyName: null,
          email: null,
          phone: null,
          taxId: null,
          addressLine1: null,
          addressLine2: null,
          city: null,
          state: null,
          postalCode: null,
          country: null,
        },
        properties: {
          displayName: { type: "string", minLength: 1 },
          companyName: { type: "string", nullable: true },
          type: { type: "string", enum: ["person", "company"] },
          email: { type: "string", format: "email", nullable: true },
          phone: { type: "string", nullable: true },
          taxId: { type: "string", nullable: true },
          addressLine1: { type: "string", nullable: true },
          addressLine2: { type: "string", nullable: true },
          city: { type: "string", nullable: true },
          state: { type: "string", nullable: true },
          postalCode: { type: "string", nullable: true },
          country: { type: "string", nullable: true },
        },
      },
      UpdateCustomerRequest: {
        type: "object",
        properties: {
          displayName: { type: "string", minLength: 1 },
          companyName: { type: "string", nullable: true },
          type: { type: "string", enum: ["person", "company"] },
          email: { type: "string", format: "email", nullable: true },
          phone: { type: "string", nullable: true },
          taxId: { type: "string", nullable: true },
          addressLine1: { type: "string", nullable: true },
          addressLine2: { type: "string", nullable: true },
          city: { type: "string", nullable: true },
          state: { type: "string", nullable: true },
          postalCode: { type: "string", nullable: true },
          country: { type: "string", nullable: true },
        },
      },
      Category: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          name: { type: "string" },
          type: { type: "string", enum: ["income", "expense"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          archivedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      CreateCategoryRequest: {
        type: "object",
        required: ["name", "type"],
        example: {
          name: "Consulting",
          type: "income",
        },
        properties: {
          name: { type: "string", minLength: 1 },
          type: { type: "string", enum: ["income", "expense"] },
        },
      },
      UpdateCategoryRequest: {
        type: "object",
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 1 },
        },
      },
      Transaction: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          customerId: { type: "string", format: "uuid", nullable: true },
          categoryId: { type: "string", format: "uuid" },
          type: { type: "string", enum: ["income", "expense"] },
          amount: { type: "number" },
          currency: { type: "string", pattern: "^[A-Z]{3}$" },
          description: { type: "string", nullable: true },
          reference: { type: "string", nullable: true },
          transactionDate: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          archivedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      CreateTransactionRequest: {
        type: "object",
        required: ["categoryId", "amount", "currency", "transactionDate"],
        example: {
          customerId: "1f8ad7b2-6cb6-4f74-bc57-645cab4e4f56",
          categoryId: "cf682285-9b3f-46db-b5cc-286f3d1cabfb",
          amount: 1250.5,
          currency: "USD",
          description: "Project milestone payment",
          reference: "INV-2026-0001",
          transactionDate: "2026-04-29T10:00:00.000Z",
        },
        properties: {
          customerId: { type: "string", format: "uuid", nullable: true },
          categoryId: { type: "string", format: "uuid" },
          amount: { type: "number", exclusiveMinimum: 0 },
          currency: { type: "string", pattern: "^[A-Z]{3}$" },
          description: { type: "string", nullable: true },
          reference: { type: "string", nullable: true },
          transactionDate: { type: "string", format: "date-time" },
        },
      },
      UpdateTransactionRequest: {
        type: "object",
        properties: {
          customerId: { type: "string", format: "uuid", nullable: true },
          categoryId: { type: "string", format: "uuid" },
          amount: { type: "number", exclusiveMinimum: 0 },
          currency: { type: "string", pattern: "^[A-Z]{3}$" },
          description: { type: "string", nullable: true },
          reference: { type: "string", nullable: true },
          transactionDate: { type: "string", format: "date-time" },
        },
      },
      TransactionImportRequest: {
        type: "object",
        required: ["file"],
        example: {
          file: "(binary csv file)",
        },
        properties: {
          file: {
            type: "string",
            format: "binary",
          },
        },
      },
      ImportJobStatus: {
        type: "object",
        properties: {
          jobId: { type: "string", format: "uuid" },
          status: { type: "string", enum: ["pending", "processing", "completed", "failed"] },
          totalRows: { type: "integer", nullable: true },
          importedRows: { type: "integer", nullable: true },
          duplicateRows: { type: "integer", nullable: true },
          failedRows: { type: "integer", nullable: true },
          errors: {
            type: "array",
            items: {
              type: "object",
              properties: {
                row: { type: "integer" },
                reason: { type: "string" },
              },
            },
          },
          startedAt: { type: "string", format: "date-time", nullable: true },
          completedAt: { type: "string", format: "date-time", nullable: true },
        },
      },
      InvoiceItemInput: {
        type: "object",
        required: ["description", "quantity", "unitPrice", "sortOrder"],
        properties: {
          description: { type: "string", minLength: 1 },
          quantity: { type: "number", exclusiveMinimum: 0 },
          unitPrice: { type: "number", exclusiveMinimum: 0 },
          sortOrder: { type: "integer", minimum: 0 },
        },
      },
      InvoiceItem: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          invoiceId: { type: "string", format: "uuid" },
          description: { type: "string" },
          quantity: { type: "string" },
          unitPrice: { type: "number" },
          sortOrder: { type: "integer" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
      Invoice: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          userId: { type: "string", format: "uuid" },
          customerId: { type: "string", format: "uuid" },
          invoiceNumber: { type: "integer" },
          status: { type: "string", enum: ["draft", "sent", "paid", "void"] },
          currency: { type: "string" },
          taxRate: { type: "string", nullable: true },
          issueDate: { type: "string", format: "date-time" },
          dueDate: { type: "string", format: "date-time", nullable: true },
          notes: { type: "string", nullable: true },
          paymentLink: { type: "string", nullable: true },
          sentAt: { type: "string", format: "date-time", nullable: true },
          paidAt: { type: "string", format: "date-time", nullable: true },
          voidedAt: { type: "string", format: "date-time", nullable: true },
          subtotal: { type: "number" },
          taxAmount: { type: "number" },
          total: { type: "number" },
          items: {
            type: "array",
            items: { $ref: "#/components/schemas/InvoiceItem" },
          },
        },
      },
      CreateInvoiceRequest: {
        type: "object",
        required: ["customerId", "currency", "issueDate", "items"],
        example: {
          customerId: "1f8ad7b2-6cb6-4f74-bc57-645cab4e4f56",
          currency: "USD",
          taxRate: 7.5,
          issueDate: "2026-04-29T10:00:00.000Z",
          dueDate: "2026-05-10T10:00:00.000Z",
          notes: "Thank you for your business.",
          items: [
            {
              description: "Design services",
              quantity: 2,
              unitPrice: 500,
              sortOrder: 0,
            },
          ],
        },
        properties: {
          customerId: { type: "string", format: "uuid" },
          currency: { type: "string", pattern: "^[A-Z]{3}$" },
          taxRate: { type: "number", minimum: 0, maximum: 100, nullable: true },
          issueDate: { type: "string", format: "date-time" },
          dueDate: { type: "string", format: "date-time", nullable: true },
          notes: { type: "string", nullable: true },
          items: {
            type: "array",
            minItems: 1,
            items: { $ref: "#/components/schemas/InvoiceItemInput" },
          },
        },
      },
      UpdateInvoiceRequest: {
        type: "object",
        properties: {
          customerId: { type: "string", format: "uuid" },
          taxRate: { type: "number", minimum: 0, maximum: 100, nullable: true },
          issueDate: { type: "string", format: "date-time" },
          dueDate: { type: "string", format: "date-time", nullable: true },
          notes: { type: "string", nullable: true },
          items: {
            type: "array",
            minItems: 1,
            items: { $ref: "#/components/schemas/InvoiceItemInput" },
          },
        },
      },
      UpdateInvoiceStatusRequest: {
        type: "object",
        required: ["status"],
        example: {
          status: "sent",
        },
        properties: {
          status: { type: "string", enum: ["sent", "paid", "void"] },
        },
      },
      DashboardResponseData: {
        type: "object",
        additionalProperties: true,
      },
      GenericMessage: {
        type: "object",
        properties: {
          message: { type: "string" },
        },
      },
      QueuedImportResponse: {
        type: "object",
        example: {
          jobId: "123",
          message: "Transaction import queued.",
        },
        properties: {
          jobId: { oneOf: [{ type: "string" }, { type: "number" }, { type: "null" }] },
          message: { type: "string" },
        },
      },
      PaymentLinkResponse: {
        type: "object",
        example: {
          paymentLink: "https://checkout.stripe.com/c/pay/cs_test_123",
        },
        properties: {
          paymentLink: { type: "string" },
        },
      },
      WebhookAck: {
        type: "object",
        example: {
          received: true,
        },
        properties: {
          received: { type: "boolean" },
        },
      },
    },
  },
  paths: {
    "/api/auth/signup": {
      post: {
        tags: ["Auth"],
        summary: "Register user, create server session, and dispatch verification code",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SignupRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Signup accepted",
            headers: {
              "Set-Cookie": {
                description:
                  "HTTP-only session cookie (sid) set by the server. Frontend should include credentials in subsequent requests.",
                schema: { type: "string" },
              },
            },
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/AuthMessage"),
              },
            },
          },
          "400": {
            description: "Validation error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } },
          },
          "409": {
            description: "Conflict",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } },
          },
          "429": {
            description: "Too many requests",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } },
          },
        },
      },
    },
    "/api/auth/verify-email": {
      post: {
        tags: ["Auth"],
        summary: "Verify user email with OTP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/VerifyEmailRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Email verified",
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/AuthMessage"),
              },
            },
          },
          "400": {
            description: "Invalid verification code",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } },
          },
          "429": {
            description: "Too many requests",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } },
          },
        },
      },
    },
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login user and create server session",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
            headers: {
              "Set-Cookie": {
                description:
                  "HTTP-only session cookie (sid) set by the server. Frontend should include credentials in subsequent requests.",
                schema: { type: "string" },
              },
            },
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/AuthMessage"),
              },
            },
          },
          "400": {
            description: "Validation error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } },
          },
          "429": {
            description: "Too many requests",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } },
          },
        },
      },
    },
    "/api/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout user and revoke current server session",
        security: [{ cookieAuth: [] }],
        responses: {
          "200": {
            description: "Logout successful",
            headers: {
              "Set-Cookie": {
                description:
                  "Session cookie cleared/expired by the server.",
                schema: { type: "string" },
              },
            },
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/AuthMessage"),
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } },
          },
        },
      },
    },
    "/api/auth/forgot-password": {
      post: {
        tags: ["Auth"],
        summary: "Request password reset OTP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ForgotPasswordRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "OTP dispatch accepted",
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/AuthMessage"),
              },
            },
          },
          "400": {
            description: "Validation error",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } },
          },
          "429": {
            description: "Too many requests",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } },
          },
        },
      },
    },
    "/api/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password with OTP",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ResetPasswordRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Password reset successful",
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/AuthMessage"),
              },
            },
          },
          "400": {
            description: "Invalid OTP or validation failure",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } },
          },
          "429": {
            description: "Too many requests",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } },
          },
        },
      },
    },
    "/api/customers": {
      get: {
        tags: ["Customers"],
        summary: "List customers",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
          { name: "search", in: "query", schema: { type: "string" } },
          { name: "type", in: "query", schema: { type: "string", enum: ["person", "company"] } },
        ],
        responses: {
          "200": {
            description: "Customers fetched",
            content: {
              "application/json": {
                schema: paginatedEnvelope("#/components/schemas/Customer"),
              },
            },
          },
        },
      },
      post: {
        tags: ["Customers"],
        summary: "Create customer",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateCustomerRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Customer created",
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/Customer"),
              },
            },
          },
        },
      },
    },
    "/api/customers/{id}": {
      get: {
        tags: ["Customers"],
        summary: "Get customer by id",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Customer fetched",
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/Customer"),
              },
            },
          },
          "404": { description: "Not found" },
        },
      },
      patch: {
        tags: ["Customers"],
        summary: "Update customer",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateCustomerRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Customer updated",
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/Customer"),
              },
            },
          },
        },
      },
      delete: {
        tags: ["Customers"],
        summary: "Archive customer",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Customer deleted",
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/GenericMessage"),
              },
            },
          },
        },
      },
    },
    "/api/categories": {
      get: {
        tags: ["Categories"],
        summary: "List categories",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "type", in: "query", schema: { type: "string", enum: ["income", "expense"] } },
        ],
        responses: {
          "200": {
            description: "Categories fetched",
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/Category"),
              },
            },
          },
        },
      },
      post: {
        tags: ["Categories"],
        summary: "Create category",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateCategoryRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Category created",
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/Category"),
              },
            },
          },
          "400": {
            description: "Validation error or duplicate category",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } },
          },
        },
      },
    },
    "/api/categories/{id}": {
      get: {
        tags: ["Categories"],
        summary: "Get category by id",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Category fetched",
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/Category"),
              },
            },
          },
        },
      },
      patch: {
        tags: ["Categories"],
        summary: "Update category",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateCategoryRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Category updated",
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/Category"),
              },
            },
          },
          "400": {
            description: "Validation error or duplicate category",
            content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorEnvelope" } } },
          },
        },
      },
      delete: {
        tags: ["Categories"],
        summary: "Archive category",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Category deleted",
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/GenericMessage"),
              },
            },
          },
        },
      },
    },
    "/api/transactions": {
      get: {
        tags: ["Transactions"],
        summary: "List transactions",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
          { name: "type", in: "query", schema: { type: "string", enum: ["income", "expense"] } },
          { name: "categoryId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "customerId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "startDate", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "endDate", in: "query", schema: { type: "string", format: "date-time" } },
        ],
        responses: {
          "200": {
            description: "Transactions fetched",
            content: {
              "application/json": {
                schema: paginatedEnvelope("#/components/schemas/Transaction"),
              },
            },
          },
        },
      },
      post: {
        tags: ["Transactions"],
        summary: "Create transaction (type inferred from category)",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateTransactionRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Transaction created",
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/Transaction"),
              },
            },
          },
        },
      },
    },
    "/api/transactions/{id}": {
      get: {
        tags: ["Transactions"],
        summary: "Get transaction by id",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Transaction fetched",
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/Transaction"),
              },
            },
          },
        },
      },
      patch: {
        tags: ["Transactions"],
        summary: "Update transaction (type inferred from category)",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateTransactionRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Transaction updated",
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/Transaction"),
              },
            },
          },
        },
      },
      delete: {
        tags: ["Transactions"],
        summary: "Delete Transaction",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Transaction archived",
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/GenericMessage"),
              },
            },
          },
        },
      },
    },
    "/api/transactions/import": {
      post: {
        tags: ["Transactions"],
        summary: "Queue CSV transaction import",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "multipart/form-data": {
              schema: { $ref: "#/components/schemas/TransactionImportRequest" },
            },
          },
        },
        responses: {
          "202": {
            description: "Import queued",
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/QueuedImportResponse"),
              },
            },
          },
        },
      },
    },
    "/api/transactions/import/{jobId}": {
      get: {
        tags: ["Transactions"],
        summary: "Get transaction import job status",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "jobId", in: "path", required: true, schema: { type: "string", format: "uuid" } },
        ],
        responses: {
          "200": {
            description: "Import status fetched",
            content: {
              "application/json": {
                schema: successEnvelopeNoMeta("#/components/schemas/ImportJobStatus"),
              },
            },
          },
        },
      },
    },
    "/api/transactions/import/sample": {
      get: {
        tags: ["Transactions"],
        summary: "Download sample transactions CSV",
        responses: {
          "200": {
            description: "Sample CSV",
            content: {
              "text/csv": {
                schema: {
                  type: "string",
                },
              },
            },
          },
        },
      },
    },
    "/api/invoices": {
      get: {
        tags: ["Invoices"],
        summary: "List invoices",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100 } },
          { name: "status", in: "query", schema: { type: "string", enum: ["draft", "sent", "paid", "void"] } },
          { name: "customerId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
        ],
        responses: {
          "200": {
            description: "Invoices fetched",
            content: {
              "application/json": {
                schema: paginatedEnvelope("#/components/schemas/Invoice"),
              },
            },
          },
        },
      },
      post: {
        tags: ["Invoices"],
        summary: "Create invoice",
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateInvoiceRequest" },
            },
          },
        },
        responses: {
          "201": {
            description: "Invoice created",
            content: {
              "application/json": {
                schema: successEnvelope("#/components/schemas/Invoice"),
              },
            },
          },
        },
      },
    },
    "/api/invoices/{id}": {
      get: {
        tags: ["Invoices"],
        summary: "Get invoice by id",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Invoice fetched",
            content: {
              "application/json": {
                schema: successEnvelope("#/components/schemas/Invoice"),
              },
            },
          },
          "404": { description: "Not found" },
        },
      },
      patch: {
        tags: ["Invoices"],
        summary: "Update invoice",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateInvoiceRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Invoice updated",
            content: {
              "application/json": {
                schema: successEnvelope("#/components/schemas/Invoice"),
              },
            },
          },
        },
      },
    },
    "/api/invoices/{id}/status": {
      post: {
        tags: ["Invoices"],
        summary: "Transition invoice status",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/UpdateInvoiceStatusRequest" },
            },
          },
        },
        responses: {
          "200": {
            description: "Invoice status updated",
            content: {
              "application/json": {
                schema: successEnvelope("#/components/schemas/Invoice"),
              },
            },
          },
          "400": { description: "Invalid transition" },
        },
      },
    },
    "/api/invoices/{id}/payment-link": {
      post: {
        tags: ["Invoices"],
        summary: "Create Stripe payment link for a sent invoice",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "Payment link returned",
            content: {
              "application/json": {
                schema: successEnvelope("#/components/schemas/PaymentLinkResponse"),
              },
            },
          },
          "400": { description: "Invalid invoice state" },
        },
      },
    },
    "/api/invoices/{id}/pdf": {
      get: {
        tags: ["Invoices"],
        summary: "Generate invoice PDF",
        security: [{ cookieAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: {
          "200": {
            description: "PDF stream",
            content: {
              "application/pdf": {
                schema: {
                  type: "string",
                  format: "binary",
                },
              },
            },
          },
          "404": { description: "Invoice not found" },
        },
      },
    },
    "/api/dashboard": {
      get: {
        tags: ["Dashboard"],
        summary: "Get dashboard aggregates",
        security: [{ cookieAuth: [] }],
        parameters: [
          { name: "from", in: "query", schema: { type: "string", format: "date-time" } },
          { name: "to", in: "query", schema: { type: "string", format: "date-time" } },
        ],
        responses: {
          "200": {
            description: "Dashboard fetched",
            content: {
              "application/json": {
                schema: successEnvelope("#/components/schemas/DashboardResponseData"),
              },
            },
          },
        },
      },
    },
    "/api/webhooks/stripe": {
      post: {
        tags: ["Webhooks"],
        summary: "Stripe webhook endpoint",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: true,
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Webhook acknowledged",
            content: {
              "application/json": {
                schema: successEnvelope("#/components/schemas/WebhookAck"),
              },
            },
          },
          "400": { description: "Invalid signature" },
        },
      },
    },
  },
} as const;
