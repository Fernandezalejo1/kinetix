// Genera dist/precache-manifest.json con TODOS los assets hasheados
// (JS/CSS/otros) de Vite, para que el Service Worker los precachee en
// install() y toda pantalla funcione offline desde el primer uso.

import { readdirSync, statSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const DIST = new URL("../dist/", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");
const ASSETS = join(DIST, "assets");
const OUT = join(DIST, "precache-manifest.json");

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

if (!existsSync(ASSETS)) {
  console.error("dist/assets no existe; ejecutá vite build antes.");
  process.exit(1);
}

const files = walk(ASSETS)
  .map((f) => "/" + relative(DIST, f).split(sep).join("/"))
  .filter((p) => /\.(js|css|woff2?|ttf|png|svg|json|mp4|gif|webp)$/i.test(p))
  .sort();

writeFileSync(OUT, JSON.stringify(files, null, 2), "utf8");

// Version bump automático basado en el contenido, para que el nuevo SW
// (con el precache ampliado) invalide los caches viejos al activarse.
let manifest = readFileSync(join(DIST, "manifest.json"), "utf8");
const name = JSON.parse(manifest).name ?? "kinetix";
const digest = files.join("|").length;

console.log(`sw-precache: ${files.length} assets precacheados (${JSON.stringify(files, null, 2).length} bytes) → ${relative(process.cwd(), OUT)}`);