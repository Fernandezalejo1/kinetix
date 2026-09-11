import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

// Detecta si server.ts se ejecutó directamente (npm run dev / node dist/server.cjs)
// en lugar de ser importado (ej: tests). Funciona en ESM (tsx) y CJS (esbuild).
const isEntryFile = (() => {
  try {
    const req = (globalThis as any).require;
    if (typeof req !== "undefined" && req.main === module) return true;
  } catch {}
  const entry = process.argv[1] || "";
  const base = path.basename(entry);
  return base === "server.ts" || base === "server.cjs" || base === "server.js";
})();

export const createApp = () => {
  const app = express();

  // Security headers (self-host / dev). En produccion (Vercel) se
  // aplican via vercel.json; aqui cubrimos el modo servidor local.
  app.use((_req, res, next) => {
    res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; font-src 'self' data:; connect-src 'self'; media-src 'self' blob:; object-src 'none'; frame-ancestors 'none'; base-uri 'self'");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  // Health endpoint
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return app;
};

/** Monta las rutas estáticas/SPA: middleware Vite (dev) o dist/ (producción). */
export const mountApp = async (app: express.Express) => {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("/*splat", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
};

export const startServer = async (port = Number(process.env.KINETIX_PORT || 3000)) => {
  const host = process.env.KINETIX_HOST || "127.0.0.1";
  const app = createApp();
  await mountApp(app);
  return app.listen(port, host, () => {
    console.log(`KINETIX Server running on http://${host}:${port}`);
  });
};

if (isEntryFile) {
  startServer().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}