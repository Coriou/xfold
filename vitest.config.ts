import path from "node:path";
import { defineConfig } from "vitest/config";

// Vitest config — pure-function unit tests live next to source as `*.test.ts`.
// We use the `node` environment because the insights engine and other lib
// modules don't depend on the DOM. If we ever need to test React components,
// add a separate config or switch to `jsdom`.
export default defineConfig({
  test: {
    environment: "node",
    // Force explicit `import { describe, it, expect } from "vitest"` —
    // matches the project's "no implicit globals" stance.
    globals: false,
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**"],
      exclude: ["src/lib/**/__fixtures/**", "src/lib/**/*.test.ts"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
