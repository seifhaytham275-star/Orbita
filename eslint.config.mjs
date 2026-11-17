import path from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import { globalIgnores } from "eslint/config";

const compat = new FlatCompat({
  baseDirectory: path.dirname(fileURLToPath(import.meta.url))
});

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "admin-console/**"]),
  {
    files: ["desktop/**/*.cjs"],
    rules: {
      // Electron's main process is intentionally written as CommonJS.
      "@typescript-eslint/no-require-imports": "off"
    }
  }
];
