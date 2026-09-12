// ESLint config flat (ESLint 9+/10). Lint real: TS + React hooks + base rules.
// Se excluye dist/, android/ (generados) y public/sw.js (service worker plano).
// P3: server.ts y scripts/ SÍ se lintean (superficie HTTP + pipeline de precache).
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

// Globals Node para scripts .mjs (sin depender del paquete `globals`).
const nodeGlobals = {
  process: "readonly",
  console: "readonly",
  Buffer: "readonly",
  __dirname: "readonly",
  __filename: "readonly",
  module: "readonly",
  require: "readonly",
  exports: "readonly",
  URL: "readonly",
  URLSearchParams: "readonly",
  fetch: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  setImmediate: "readonly",
  clearImmediate: "readonly",
  queueMicrotask: "readonly",
  structuredClone: "readonly",
  performance: "readonly",
  crypto: "readonly",
  TextEncoder: "readonly",
  TextDecoder: "readonly",
  AbortController: "readonly",
  FormData: "readonly",
  Blob: "readonly",
  File: "readonly",
};

export default tseslint.config(
  { ignores: ["dist/**", "android/**", "node_modules/**", "public/sw.js"] },
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.ts", "scripts/**/*.ts"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      // Reglas ruidosas del set "recommended" que producen falsos positivos
      // en este codebase: se desactivan para que el lint sea accionable.
      "no-useless-assignment": "off",
      "no-empty": ["warn", { allowEmptyCatch: true }],
      "no-unused-vars": "off",
      "prefer-const": "off",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      // Solo las dos reglas clásicas de hooks (lo accionable). Las reglas
      // "React Compiler" de react-hooks v7 generan muchos falsos positivos
      // en un codebase existente y ya se cubren con tsc + peer review.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  // P3: superficie Node (server Express + scripts de build/verify).
  {
    files: ["server.ts"],
    extends: [...tseslint.configs.recommended],
    languageOptions: { globals: nodeGlobals },
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    files: ["scripts/**/*.mjs"],
    extends: [js.configs.recommended],
    languageOptions: { ecmaVersion: "latest", sourceType: "module", globals: nodeGlobals },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  }
);