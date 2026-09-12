import { afterEach, describe, expect, it } from "vitest";
import { AddressInfo } from "net";
import { createApp } from "../server";

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = originalNodeEnv;
});

/** Levanta createApp() con un NODE_ENV dado y devuelve los headers de /api/health. */
async function headersWithEnv(nodeEnv: string | undefined) {
  if (nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = nodeEnv;

  const app = createApp();
  const server = app.listen(0, "127.0.0.1");
  try {
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}/api/health`);
    return {
      csp: res.headers.get("content-security-policy"),
      nosniff: res.headers.get("x-content-type-options"),
      hsts: res.headers.get("strict-transport-security"),
      poweredBy: res.headers.get("x-powered-by"),
      coop: res.headers.get("cross-origin-opener-policy"),
      frame: res.headers.get("x-frame-options"),
    };
  } finally {
    await new Promise<void>((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())));
  }
}

describe("security headers del server local", () => {
  it("aplica la CSP estricta en producción", async () => {
    const { csp, nosniff } = await headersWithEnv("production");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("form-action 'self'");
    expect(nosniff).toBe("nosniff");
  });

  it("no envía CSP en desarrollo para no romper Vite HMR / React Refresh", async () => {
    const { csp, nosniff } = await headersWithEnv("development");
    expect(csp).toBeNull();
    // El resto de los headers defensivos sigue activo en dev.
    expect(nosniff).toBe("nosniff");
  });

  it("P3: HSTS + COOP + DENY siempre; sin X-Powered-By", async () => {
    for (const env of ["production", "development"]) {
      const h = await headersWithEnv(env);
      expect(h.hsts).toContain("max-age=31536000");
      expect(h.coop).toBe("same-origin");
      expect(h.frame).toBe("DENY");
      expect(h.poweredBy).toBeNull();
    }
  });
});
