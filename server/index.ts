import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupAuth } from "./auth";
import { serveStatic } from "./static";
import { createServer } from "http";
import path from "path";
import fs from "fs";
import { streamFromObjectStorage, migrateLocalFilesToObjectStorage } from "./objectStorage";

const app = express();

const staticOptions = {
  setHeaders: (res: any, filePath: string) => {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".mov") {
      res.setHeader("Content-Type", "video/mp4");
    } else if (ext === ".mp4") {
      res.setHeader("Content-Type", "video/mp4");
    } else if (ext === ".webm") {
      res.setHeader("Content-Type", "video/webm");
    } else if (ext === ".ogg" || ext === ".ogv") {
      res.setHeader("Content-Type", "video/ogg");
    }
  },
};

// Subdirectories that contain user-uploaded files (backed up in GCS).
// Top-level static build assets (logo, hero-bg, etc.) are always on disk.
const GCS_BACKED_DIRS = new Set(["banners", "addons", "campings"]);

// Serve local files first (works in dev and for any locally-cached files).
// If the file is not on disk (ephemeral container after restart), fall back
// to streaming from Replit Object Storage so uploads survive deployments.
function makeMediaMiddleware(prefix: "images" | "uploads") {
  const localDir = path.join(process.cwd(), "public", prefix);
  const staticMw = express.static(localDir, staticOptions);

  return [
    staticMw,
    async (req: Request, res: Response, next: NextFunction) => {
      // Only reached when express.static called next() (file not on disk).
      // Only attempt GCS for user-upload subdirectories, not build assets.
      const firstSegment = req.path.split("/").filter(Boolean)[0] ?? "";
      if (!GCS_BACKED_DIRS.has(firstSegment)) return next();

      const gcsSubpath = `${prefix}${req.path}`;
      try {
        const served = await streamFromObjectStorage(gcsSubpath, res);
        if (!served) next();
      } catch {
        next();
      }
    },
  ];
}

app.use("/images",  makeMediaMiddleware("images"));
app.use("/uploads", makeMediaMiddleware("uploads"));
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    limit: "15mb",
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
  setupAuth(app);
  await registerRoutes(httpServer, app);

  // Migrate all existing local media files to GCS on startup (non-blocking).
  // This fixes already-uploaded files that disappeared in production after a container restart.
  migrateLocalFilesToObjectStorage(path.join(process.cwd(), "public")).catch((e) =>
    console.error("[gcs] Startup migration error:", e.message)
  );

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV !== "development") {
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
