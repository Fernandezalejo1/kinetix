import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { AddressInfo } from "net";
import { build as viteBuild } from "vite";
import { createApp, mountApp } from "../server";

const DIST_INDEX = path.resolve(__dirname, "..", "dist", "index.html");

// Smoke E2E corto y sin navegador: construye la app (si hace falta), la sirve
// con el server de producción y verifica que el HTML + un asset del bundle
// responden 200. Detecta roturas de build/empaquetado que tsc no ve.
describe("E2E smoke (build de producción)", () => {
  let server: Awaited<ReturnType<typeof createApp>> | null = null;
  let httpServer: ReturnType<typeof createApp> extends never ? never : any = null;
  let base = "";

  beforeAll(async () => {
    if (!existsSync(DIST_INDEX)) {
      // CI tampoco: asegura que el test es auto-suficiente.
      await viteBuild({ logLevel: "silent" });
    }
    const html = readFileSync(DIST_INDEX, "utf8");
    expect(html).toContain("<div id=\"root\">");

    process.env.NODE_ENV = "production";
    const app = createApp();
    await mountApp(app as any);
    httpServer = app.listen(0, "127.0.0.1");
    await new Promise<void>((r) => httpServer.once("listening", () => r()));
    const port = (httpServer.address() as AddressInfo).port;
    base = `http://127.0.0.1:${port}`;
  }, 60000);

  afterAll(async () => {
    httpServer?.close();
    process.env.NODE_ENV = "test";
  });

  it("sirve el index.html de la SPA", async () => {
    const res = await fetch(`${base}/`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("KINETIX");
  });

  it("sirve el bundle JS del build (assets presentes)", async () => {
    const html = readFileSync(DIST_INDEX, "utf8");
    const m = html.match(/\/assets\/index-[A-Za-z0-9_-]+\.js/);
    expect(m, "index.html debe referenciar el bundle generado").not.toBeNull();
    const res = await fetch(`${base}${m![0]}`);
    expect(res.status).toBe(200);
  });

  it("responde correctamente el healthcheck", async () => {
    const res = await fetch(`${base}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  it("hace SPA fallback para rutas deep (refresh)", async () => {
    const res = await fetch(`${base}/programas/cualquiera`);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
  });
});