import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Resolves the `@/*` path alias (mirrors tsconfig.json) so tests can import
// source modules the same way the app does.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
