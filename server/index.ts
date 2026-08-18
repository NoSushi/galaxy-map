import express, { type Request, Response, NextFunction } from "express";
import compression from "compression";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

app.set("trust proxy", 1);
neonConfig.webSocketConstructor = ws;
const sessionPool = new Pool({ connectionString: process.env.CUSTOM_DATABASE_URL || process.env.DATABASE_URL });
const PgSession = connectPgSimple(session);
app.use(session({
  store: new PgSession({ pool: sessionPool as any, tableName: "session", createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || "dev-only-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    // On Replit the preview runs the app in a cross-site iframe, so the
    // cookie must be SameSite=None + Secure or browsers drop it. On external
    // hosting the site is visited directly (same-site), where Lax is correct
    // and works even if the host's proxy doesn't forward the https protocol
    // (SameSite=None REQUIRES the Secure flag, which "auto" only sets when
    // the proxy forwards X-Forwarded-Proto: https).
    secure: "auto",
    sameSite: process.env.REPL_ID ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
}));

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(compression());

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

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

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
