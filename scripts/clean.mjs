import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
for (const target of ["dist", "server.js"]) {
  rmSync(path.join(root, target), { recursive: true, force: true });
}
console.log("cleaned");