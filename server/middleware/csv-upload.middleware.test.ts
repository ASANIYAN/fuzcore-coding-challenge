import assert from "node:assert/strict";
import test from "node:test";
import type { Request } from "express";
import { AppError } from "../lib/errors";
import { csvUploadMiddleware } from "./csv-upload.middleware";

function runMiddleware(req: Partial<Request>) {
  return new Promise<{ error?: unknown; req: Partial<Request> }>((resolve) => {
    csvUploadMiddleware(req as Request, {} as never, (error?: unknown) => {
      resolve({ error, req });
    });
  });
}

function buildMultipartBody(boundary: string, filename: string, content: string) {
  return Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="${filename}"\r\n` +
      `Content-Type: text/csv\r\n\r\n` +
      `${content}\r\n` +
      `--${boundary}--\r\n`,
    "utf8",
  );
}

test("csvUploadMiddleware accepts valid multipart csv", async () => {
  const boundary = "abc123";
  const req: Partial<Request> = {
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    body: buildMultipartBody(boundary, "transactions.csv", "category,amount,currency,customerEmail,description,reference,transactionDate"),
  };

  const { error, req: updatedReq } = await runMiddleware(req);
  assert.equal(error, undefined);
  assert.equal(updatedReq.uploadedCsv?.filename, "transactions.csv");
  assert.match(updatedReq.uploadedCsv?.content ?? "", /^category,amount,currency/);
});

test("csvUploadMiddleware rejects non-csv filename", async () => {
  const boundary = "abc123";
  const req: Partial<Request> = {
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    body: buildMultipartBody(boundary, "transactions.txt", "a,b,c"),
  };

  const { error } = await runMiddleware(req);
  assert.equal(error instanceof AppError, true);
  assert.equal((error as AppError).statusCode, 400);
  assert.equal((error as AppError).message, "Only .csv files are allowed for import");
});

test("csvUploadMiddleware rejects invalid content type", async () => {
  const req: Partial<Request> = {
    headers: {
      "content-type": "application/json",
    },
    body: Buffer.from("{}"),
  };

  const { error } = await runMiddleware(req);
  assert.equal(error instanceof AppError, true);
  assert.equal((error as AppError).statusCode, 400);
  assert.equal((error as AppError).message, "Content-Type must be multipart/form-data");
});

test("csvUploadMiddleware requires multipart field name to be file", async () => {
  const boundary = "abc123";
  const body = Buffer.from(
    `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="upload"; filename="transactions.csv"\r\n` +
      `Content-Type: text/csv\r\n\r\n` +
      `category,amount,currency,customerEmail,description,reference,transactionDate\r\n` +
      `--${boundary}--\r\n`,
    "utf8",
  );

  const req: Partial<Request> = {
    headers: {
      "content-type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  };

  const { error } = await runMiddleware(req);
  assert.equal(error instanceof AppError, true);
  assert.equal((error as AppError).statusCode, 400);
  assert.equal((error as AppError).message, "CSV file is required in multipart form-data");
});
