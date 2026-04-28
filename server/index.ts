import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { createServer } from "http";
import { env } from "./lib/env";

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      log(logLine);
    }
  });

  next();
});

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
      log(`serving on http://${host}:${port}`);
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

      log(
        `failed to bind ${host}:${port} (${listenError.code}), trying next host`,
        "server",
      );
    }
  }

  throw (
    lastError ??
    new Error(`unable to bind server on port ${port} for hosts ${hosts.join(", ")}`)
  );
}

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });

  if (env.NODE_ENV === "production") {
    const { serveStatic } = await import("./static");
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  await startServer(env.PORT);
})();
