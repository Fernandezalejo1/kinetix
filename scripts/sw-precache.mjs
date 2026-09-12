// Genera dist/precache-manifest.json con los assets hasheados (JS/CSS/otros)
// de Vite que vale la pena precachear en install(), para que toda pantalla
// funcione offline desde el primer uso.
//
// IMPORTANTE: los videos de ejercicios y demás media pesada NO se precachean.
// El fetch handler del service worker ya los saltea ("load on demand"), así que
// incluirlos acá solo gastaba datos del usuario, llenaba la cuota de Cache
// Storage y podía cancelar la instalación completa del SW si una descarga
// fallaba. Ver selectPrecacheFiles().
// También parchea dist/sw.js: reescribe BUILD_VERSION con un hash del
// contenido, de modo que cada build con cambios invalida los caches viejos
// al activarse (si los nombres de caché no cambian, activate() conserva los
// caches de la versión anterior y mezcla contenido viejo).

import { createHash } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readdirSync, statSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const ASSETS = join(DIST, "assets");
const OUT = join(DIST, "precache-manifest.json");
const SW_FILE = join(DIST, "sw.js");

/** Tipos que sí se precachean: código y estáticos livianos. */
export const PRECACHE_EXT = /\.(js|css|woff2?|ttf|png|svg|json|webp)$/i;
/** Media que se sirve on-demand desde la red (nunca desde el precache). */
export const ON_DEMAND_EXT = /\.(mp4|webm|mov|m4v|gif|avif)$/i;
/** Tope por archivo: ningún asset individual que supere esto entra al precache. */
export const MAX_PRECACHE_BYTES = 1_500_000;

/**
 * Clasifica los assets del build para el precache del service worker.
 * @param {{ path: string, bytes: number }[]} entries
 * @returns {{ included: string[], excluded: { path: string, reason: string }[] }}
 */
export function selectPrecacheFiles(entries) {
  const included = [];
  const excluded = [];
  for (const { path, bytes } of entries) {
    if (ON_DEMAND_EXT.test(path) || path.startsWith("/assets/exercises/")) {
      excluded.push({ path, reason: "on-demand media" });
    } else if (!PRECACHE_EXT.test(path)) {
      excluded.push({ path, reason: "unsupported type" });
    } else if (bytes > MAX_PRECACHE_BYTES) {
      excluded.push({ path, reason: `too large (${Math.round(bytes / 1024)} KB)` });
    } else {
      included.push(path);
    }
  }
  return { included: included.sort(), excluded };
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) out.push(...walk(full));
    else out.push({ path: "/" + relative(DIST, full).split(sep).join("/"), bytes: stat.size });
  }
  return out;
}

function run() {
  if (!existsSync(ASSETS)) {
    console.error("dist/assets no existe; ejecutá vite build antes.");
    process.exit(1);
  }

  const { included: files, excluded } = selectPrecacheFiles(walk(ASSETS));

  writeFileSync(OUT, JSON.stringify(files, null, 2), "utf8");

  // Digest real del contenido: ante cualquier cambio en los assets, el SW que
  // se sirve cambia de bytes y el navegador detecta la actualización.
  const hash = createHash("sha256");
  for (const file of files) hash.update(file).update(readFileSync(join(DIST, file.slice(1))));
  hash.update(readFileSync(join(DIST, "index.html")));
  const version = hash.digest("hex").slice(0, 12);

  if (existsSync(SW_FILE)) {
    const sw = readFileSync(SW_FILE, "utf8");
    const bumped = sw.replace(/const BUILD_VERSION = '[^']*';/, `const BUILD_VERSION = '${version}';`);
    if (bumped === sw) {
      console.warn(`sw-precache: no se encontró el marcador BUILD_VERSION en ${SW_FILE}; no se pudo actualizar la versión.`);
    } else {
      writeFileSync(SW_FILE, bumped, "utf8");
    }
  } else {
    console.warn(`sw-precache: ${SW_FILE} no existe; la versión quedará en '${version}' solo en manifest.`);
  }

  const totalBytes = files.reduce((sum, file) => sum + statSync(join(DIST, file.slice(1))).size, 0);
  const skippedBytes = excluded.reduce((sum, item) => {
    const full = join(DIST, item.path.slice(1));
    return sum + (existsSync(full) ? statSync(full).size : 0);
  }, 0);
  console.log(`sw-precache: ${files.length} assets precacheados (${(totalBytes / 1024 / 1024).toFixed(1)} MB) → ${relative(process.cwd(), OUT)}`);
  console.log(`sw-precache: ${excluded.length} assets fuera del precache (${(skippedBytes / 1024 / 1024).toFixed(1)} MB on-demand)`);
  console.log(`sw-precache: BUILD_VERSION → '${version}' en ${relative(process.cwd(), SW_FILE)}`);
}

// Solo corre cuando se ejecuta como script (no al importarlo desde tests).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run();
}