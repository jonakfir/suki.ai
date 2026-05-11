import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Vitest config for the suki-feat-scan branch.
 *
 * - jsdom environment so client components render under @testing-library/react.
 * - globals: true so `describe`/`it`/`expect` are usable without imports.
 * - setupFiles loads @testing-library/jest-dom matchers and global stubs.
 * - The `@/...` alias mirrors `tsconfig.json` so imports resolve cleanly.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "tests/**/*.{test,spec}.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.spec.{ts,tsx}",
        "src/**/*.d.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
