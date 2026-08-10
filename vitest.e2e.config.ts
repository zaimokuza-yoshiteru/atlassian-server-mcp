import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

const product = process.env.E2E_PRODUCT ?? "unknown";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/e2e/**/*.e2e.test.ts"],
    setupFiles: ["tests/e2e/setup.ts"],
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 180_000,
    hookTimeout: 60_000,
    reporters: [
      "verbose",
      ["json", { outputFile: resolve(`.e2e-state/${product}/run-report.json`) }]
    ]
  }
});
