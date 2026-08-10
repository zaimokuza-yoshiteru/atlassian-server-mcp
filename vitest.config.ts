import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.mjs"],
    exclude: [
      ...configDefaults.exclude,
      "tests/contract/**",
      "tests/e2e/**",
      "tests/integration/**"
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        // Generated operation manifests; regenerate via pnpm operations:generate.
        "src/operations/**",
        "**/*.d.ts"
      ],
      // Thresholds are a regression floor pinned below the measured baseline
      // (currently lines/statements 83.56, branches 86.90, functions 91.47 —
      // see "Unit coverage gate" in docs/en/test-strategy.md).
      // Raise them as coverage improves.
      thresholds: {
        statements: 79,
        branches: 84,
        functions: 88,
        lines: 79
      }
    }
  }
});
