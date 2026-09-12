import { describe, expect, it } from "vitest";
import { MAX_PRECACHE_BYTES, selectPrecacheFiles } from "../scripts/sw-precache.mjs";

// El manifiesto del service worker definía antes "precachear TODO lo hasheado",
// incluidos 78 videos de ejercicios (~57 MB). Eso gastaba datos del usuario y
// podía cancelar la instalación completa del SW si una descarga fallaba, aun
// cuando el fetch handler nunca los servía desde caché. Estos tests fijan la
// regla: la media pesada y los archivos enormes quedan fuera.
describe("selectPrecacheFiles", () => {
  it("excluye los videos de ejercicios aunque sean assets válidos del build", () => {
    const { included, excluded } = selectPrecacheFiles([
      { path: "/assets/index-abc.js", bytes: 660_000 },
      { path: "/assets/index-abc.css", bytes: 18_000 },
      { path: "/assets/exercises/air-bike.mp4", bytes: 400_000 },
      { path: "/assets/exercises/barbell-curl.mp4", bytes: 420_000 },
    ]);

    expect(included).toEqual(["/assets/index-abc.css", "/assets/index-abc.js"]);
    expect(included.some((p: string) => p.endsWith(".mp4"))).toBe(false);
    expect(excluded.filter((e: { reason: string }) => e.reason === "on-demand media")).toHaveLength(2);
  });

  it("excluye media pesada fuera de /assets/exercises y archivos que superan el tope", () => {
    const { included, excluded } = selectPrecacheFiles([
      { path: "/assets/hero.webm", bytes: 10_000 },
      { path: "/assets/animated.gif", bytes: 200_000 },
      { path: "/assets/huge-map.json", bytes: MAX_PRECACHE_BYTES + 1 },
      { path: "/assets/font.woff2", bytes: 30_000 },
    ]);

    expect(included).toEqual(["/assets/font.woff2"]);
    expect(excluded).toHaveLength(3);
    const oversized = excluded.find((e: { path: string }) => e.path.endsWith(".json"));
    expect(oversized).toBeDefined();
    expect(oversized?.reason).toContain("too large");
    expect(excluded.filter((e: { reason: string }) => e.reason === "on-demand media")).toHaveLength(2);
  });

  it("deja pasar código y estáticos livianos ordenados", () => {
    const { included, excluded } = selectPrecacheFiles([
      { path: "/assets/b.js", bytes: 100 },
      { path: "/assets/a.js", bytes: 100 },
      { path: "/assets/favicon.svg", bytes: 100 },
    ]);

    expect(included).toEqual(["/assets/a.js", "/assets/b.js", "/assets/favicon.svg"]);
    expect(excluded).toEqual([]);
  });
});
