import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "joern-effect": fileURLToPath(new URL("../joern-effect/src/index.ts", import.meta.url)),
    },
  },
  test: {
    exclude: ["node_modules/**", "dist/**"],
    globals: true,
    include: ["test/**/*.test.ts"],
    hookTimeout: 300_000,
    testTimeout: 300_000,
  },
})
