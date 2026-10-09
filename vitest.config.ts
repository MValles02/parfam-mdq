import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    include: ["tests/integration/**/*.int.test.ts"],
    setupFiles: ["tests/integration/setup.ts"],
    // Integration tests share one Postgres database and the same fixture pids.
    fileParallelism: false,
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
