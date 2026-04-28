import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./lib/env";
import { logger } from "./lib/logger";

let httpServer = createServer();

const RETRYABLE_LISTEN_ERRORS = new Set([
  "ENOTSUP",
  "EOPNOTSUPP",
  "EADDRNOTAVAIL",
  "EAFNOSUPPORT",
  "EPERM",
]);

function getListenHosts() {
  const configuredHost = env.HOST?.trim();
  if (!configuredHost) {
    return ["127.0.0.1", "0.0.0.0"];
  }

  return Array.from(new Set([configuredHost, "127.0.0.1", "0.0.0.0"]));
}

async function listenOnHost(port: number, host: string) {
  await new Promise<void>((resolve, reject) => {
    const onError = (error: NodeJS.ErrnoException) => {
      cleanup();
      reject(error);
    };
    const onListening = () => {
      cleanup();
      resolve();
    };
    const cleanup = () => {
      httpServer.off("error", onError);
      httpServer.off("listening", onListening);
    };

    httpServer.once("error", onError);
    httpServer.once("listening", onListening);
    httpServer.listen({ port, host });
  });
}

async function startServer(port: number) {
  const hosts = getListenHosts();
  let lastError: NodeJS.ErrnoException | undefined;

  for (let i = 0; i < hosts.length; i += 1) {
    const host = hosts[i];
    try {
      await listenOnHost(port, host);
      logger.info({ host, port }, "server started");
      return;
    } catch (error) {
      const listenError = error as NodeJS.ErrnoException;
      lastError = listenError;
      const isRetryable = Boolean(
        listenError.code && RETRYABLE_LISTEN_ERRORS.has(listenError.code),
      );
      const hasNextHost = i < hosts.length - 1;

      if (!isRetryable || !hasNextHost) {
        throw listenError;
      }

      logger.warn(
        { host, port, code: listenError.code },
        "failed to bind host, trying next fallback",
      );
    }
  }

  throw (
    lastError ??
    new Error(`unable to bind server on port ${port} for hosts ${hosts.join(", ")}`)
  );
}

(async () => {
  const app = await createApp();
  httpServer = createServer(app);

  if (env.NODE_ENV === "production") {
    const { serveStatic } = await import("./static");
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  await startServer(env.PORT);
})().catch((err: unknown) => {
  logger.error({ err }, "fatal startup error");
  process.exit(1);
});
