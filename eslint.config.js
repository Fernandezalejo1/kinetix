// ESLint config flat (ESLint 9+/10). Lint real: TS + React hooks + base rules.
// Se excluye dist/, android/ (generados) y los archivos de scripts node.
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  { ignores: ["dist/**", "android/**", "node_modules/**", "scripts/**", "server.ts", "public/sw.js"] },
  {
    files: ["src/**/*.{ts,tsx}", "tests/**/*.ts"],
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
  }
);