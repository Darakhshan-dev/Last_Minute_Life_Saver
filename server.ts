import path from "path";
import fs from "fs";
import express from "express";
import { createServer as createViteServer } from "vite";
import appImport from "./backend/src/app";
import { geminiService } from "./backend/src/services/geminiService";
import "./backend/src/services/firebaseAdmin";
import { startPushNotificationScheduler } from "./backend/src/services/pushNotificationService";

// Handle ESM/CommonJS default export interoperability gracefully
const app = (appImport as any).default || appImport;

const PORT = 3000;
const LOG_PATH = path.resolve(process.cwd(), "startup.log");

function logToFile(message: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  fs.appendFileSync(LOG_PATH, line);
  console.log(line.trim());
}

// Clear startup log on launch
try {
  fs.writeFileSync(LOG_PATH, "");
} catch (e) {}

logToFile("Server process loaded. Starting initialization.");

async function startServer() {
  logToFile("startServer() invoked.");
  // Mount Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    logToFile("Development mode detected. Initializing Vite...");
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      logToFile("Vite server created successfully.");
      app.use(vite.middlewares);
      logToFile("Vite middlewares mounted.");

      // Serve transformed index.html for non-API client routes in development
      app.get("*", async (req, res, next) => {
        const url = req.originalUrl;
        
        // Exclude API routes
        if (url.startsWith("/api/")) {
          return next();
        }

        // Exclude Vite internal and asset requests (JS, CSS, images, hot-update, etc.)
        const ext = path.extname(url);
        if (
          url.includes("/@vite/") ||
          url.includes("/@fs/") ||
          url.includes("/@id/") ||
          url.includes("hot-update.json") ||
          (ext !== "" && !url.endsWith(".html"))
        ) {
          return next();
        }

        // Only serve index.html for document requests (e.g., text/html)
        const acceptHeader = req.headers.accept || "";
        if (acceptHeader && !acceptHeader.includes("text/html") && !acceptHeader.includes("*/*")) {
          return next();
        }

        try {
          const indexHtmlPath = path.resolve(process.cwd(), "frontend", "index.html");
          let html = fs.readFileSync(indexHtmlPath, "utf-8");
          html = await vite.transformIndexHtml(url, html);
          res.status(200).set({ "Content-Type": "text/html" }).end(html);
        } catch (e) {
          next(e);
        }
      });

      logToFile("Catch-all development routes configured.");
    } catch (viteError) {
      logToFile(`CRITICAL ERROR initializing Vite: ${viteError}`);
      throw viteError;
    }
  } else {
    logToFile("Production mode detected.");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    logToFile(`Static assets configured for path: ${distPath}`);
  }

  logToFile(`Attempting to bind Express to port ${PORT}...`);
  try {
    app.listen(PORT, "0.0.0.0", () => {
      logToFile(`Express server successfully listening on http://0.0.0.0:${PORT}`);
      
      if (process.env.NODE_ENV !== "production") {
  geminiService.runStartupSelfCheck().then((result) => {
    if (result.success) {
      logToFile("Gemini API Startup Check: Connection is active and healthy.");
    } else {
      logToFile(`Gemini API Startup Check: WARNING - Fallback active. Error: ${result.error}`);
    }
  }).catch((checkError) => {
    logToFile(`Gemini API Startup Check: FAILED to run self check: ${checkError}`);
  });
}
      startPushNotificationScheduler().catch((err) =>
    console.error("[Push Scheduler] Failed to start:", err)
  );
    });
  } catch (listenError) {
    logToFile(`CRITICAL ERROR on app.listen: ${listenError}`);
    throw listenError;
  }
}

startServer().catch((err) => {
  logToFile(`CRITICAL ERROR in startServer: ${err?.stack || err}`);
});

