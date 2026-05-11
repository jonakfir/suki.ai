/**
 * Global test setup.
 *
 * - Wires @testing-library/jest-dom matchers into Vitest's `expect`.
 * - Installs a default `fetch` stub so tests that forget to mock it fail
 *   loudly instead of leaking real network calls.
 * - Provides `TextEncoder`/`TextDecoder` polyfills for jsdom < 23 (no-op
 *   when already defined by the runtime).
 */
import "@testing-library/jest-dom/vitest";
import { afterEach, beforeEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

// Hard-fail any unmocked fetch — tests that need fetch must vi.spyOn it.
beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => {
      throw new Error(
        "Unmocked fetch call. vi.spyOn(global, 'fetch') or vi.stubGlobal('fetch', ...) before the test."
      );
    })
  );
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// jsdom polyfills for older Node TextEncoder edge cases — only patch if absent.
if (typeof globalThis.TextEncoder === "undefined") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { TextEncoder, TextDecoder } = require("node:util");
  (globalThis as unknown as { TextEncoder: unknown }).TextEncoder = TextEncoder;
  (globalThis as unknown as { TextDecoder: unknown }).TextDecoder = TextDecoder;
}
