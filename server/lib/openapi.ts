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
  ],
  paths: {
    "/api/counter": {
      get: {
        tags: ["Health"],
        summary: "Read sample counter",
        responses: {
          "200": {
            description: "Counter state",
          },
        },
      },
    },
    "/api/counter/increment": {
      post: {
        tags: ["Health"],
        summary: "Increment sample counter",
        responses: {
          "200": {
            description: "Incremented counter state",
          },
        },
      },
    },
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
  },
} as const;
