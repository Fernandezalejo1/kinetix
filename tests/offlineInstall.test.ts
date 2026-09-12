import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";

describe("offline installation", () => {
  it("rejects a partial download so the current worker remains active", async () => {
    const handlers: Record<string, (event: { waitUntil: (promise: Promise<void>) => void }) => void> = {};
    runInNewContext(readFileSync("public/sw.js", "utf8"), {
      self: { addEventListener: (name: string, handler: (event: { waitUntil: (promise: Promise<void>) => void }) => void) => { handlers[name] = handler; } },
      caches: { open: async () => ({ addAll: async (urls: string[]) => {
        if (urls.includes('/assets/broken.js')) throw new Error('download failed');
      } }) },
      fetch: async () => ({ ok: true, json: async () => ['/assets/broken.js'] }),
    });
    let installation: Promise<void>;
    handlers.install({ waitUntil: (promise: Promise<void>) => { installation = promise; } });
    await expect(installation!).rejects.toThrow('download failed');
  });

  it("nunca precachea media pesada aunque el manifiesto la liste (defensa en profundidad)", async () => {
    const handlers: Record<string, (event: { waitUntil: (promise: Promise<void>) => void }) => void> = {};
    const cached: string[] = [];
    runInNewContext(readFileSync("public/sw.js", "utf8"), {
      self: { addEventListener: (name: string, handler: (event: { waitUntil: (promise: Promise<void>) => void }) => void) => { handlers[name] = handler; } },
      caches: { open: async () => ({ addAll: async (urls: string[]) => { cached.push(...urls); } }) },
      fetch: async () => ({ ok: true, json: async () => ["/assets/index-abc.js", "/assets/exercises/air-bike.mp4"] }),
    });
    let installation: Promise<void>;
    handlers.install({ waitUntil: (promise: Promise<void>) => { installation = promise; } });
    await installation!;
    expect(cached).toContain("/assets/index-abc.js");
    expect(cached.some((url) => url.endsWith(".mp4"))).toBe(false);
  });

  it("cachea media en el primer uso y la sirve desde caché (offline después de verse)", async () => {
    const handlers: Record<string, (event: unknown) => void> = {};
    const store = new Map<string, unknown>();
    const cacheObj = {
      match: async (request: { url: string }) => (store.has(request.url) ? store.get(request.url) : undefined),
      put: async (request: { url: string }, response: unknown) => { store.set(request.url, response); },
      keys: async () => [...store.keys()].map((url) => ({ url })),
      delete: async (key: { url: string }) => { store.delete(key.url); return true; },
    };
    let networkCalls = 0;
    runInNewContext(readFileSync("public/sw.js", "utf8"), {
      self: { location: { origin: "https://kinetix.local" }, addEventListener: (name: string, handler: (event: unknown) => void) => { handlers[name] = handler; } },
      caches: { open: async () => cacheObj },
      fetch: async () => { networkCalls++; return { status: 200, clone: () => "cached-media", headers: { get: () => undefined } }; },
      Response: { error: () => Object.assign(new Error("network error"), { isMediaError: true }) },
      URL: globalThis.URL,
    });

    const makeEvent = () => ({
      request: {
        method: "GET",
        url: "https://kinetix.local/assets/exercises/air-bike.mp4",
        headers: { get: () => undefined },
      },
      respondWith: undefined as unknown,
    });

    const first = makeEvent();
    first.respondWith = (promise: Promise<unknown>) => { first.respondWith = promise; };
    handlers.fetch(first);
    const firstResponse = await first.respondWith;
    expect((firstResponse as { status: number }).status).toBe(200);
    expect(networkCalls).toBe(1);
    expect(store.has("https://kinetix.local/assets/exercises/air-bike.mp4")).toBe(true);

    const second = makeEvent();
    second.respondWith = (promise: Promise<unknown>) => { second.respondWith = promise; };
    handlers.fetch(second);
    const secondResponse = await second.respondWith;
    expect(secondResponse).toBe("cached-media");
    expect(networkCalls).toBe(1);
  });
});
