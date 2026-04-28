import assert from "node:assert/strict";
import test from "node:test";
import { parseEnv } from "./env.schema";

const baseEnv = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/challenge",
  REDIS_URL: "redis://localhost:6379",
};

test("parseEnv applies defaults for NODE_ENV and PORT", () => {
  const parsed = parseEnv(baseEnv);

  assert.equal(parsed.NODE_ENV, "development");
  assert.equal(parsed.PORT, 5000);
});

test("parseEnv coerces optional typed values", () => {
  const parsed = parseEnv({
    ...baseEnv,
    NODE_ENV: "test",
    PORT: "8080",
    HOST: " 127.0.0.1 ",
    MAIL_PORT: "587",
    MAIL_SECURE: "false",
    MAIL_USER: "",
  });

  assert.equal(parsed.NODE_ENV, "test");
  assert.equal(parsed.PORT, 8080);
  assert.equal(parsed.HOST, "127.0.0.1");
  assert.equal(parsed.MAIL_PORT, 587);
  assert.equal(parsed.MAIL_SECURE, false);
  assert.equal(parsed.MAIL_USER, undefined);
});

test("parseEnv rejects malformed required and typed values", () => {
  assert.throws(() =>
    parseEnv({
      ...baseEnv,
      DATABASE_URL: "not-a-url",
    }),
  );

  assert.throws(() =>
    parseEnv({
      ...baseEnv,
      MAIL_SECURE: "sometimes",
    }),
  );
});
