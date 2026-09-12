// Guarda de CI/local: dist/precache-manifest.json debe existir y NO volver a
// listar media pesada (mp4/webm/mov/m4v/gif/avif). Sin dependencias; corre
// tras sw-precache.mjs en cada build. Si alguien reintroduce videos en el
// precache, el build falla antes de publicarse.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const manifestPath = fileURLToPath(new URL("../dist/precache-manifest.json", import.meta.url));

let files;
try {
  files = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch (error) {
  console.error(`verify-manifest: no pude leer ${manifestPath} (${error.message}). Corré vite build + sw-precache antes.`);
  process.exit(1);
}

if (!Array.isArray(files) || !files.length) {
  console.error("verify-manifest: manifiesto vacío o inválido");
  process.exit(1);
}

const media = files.filter((file) => /\.(mp4|webm|mov|m4v|gif|avif)$/i.test(file));
if (media.length) {
  console.error(`verify-manifest: el precache vuelve a listar ${media.length} archivos de media pesada (p. ej. ${media[0]}). Excluí la media en selectPrecacheFiles().`);
  process.exit(1);
}

console.log(`verify-manifest: OK - ${files.length} assets precacheados, 0 media pesada`);