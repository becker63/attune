import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "joern-effect": fileURLToPath(new URL("./src/index.ts", import.meta.url)),
    },
  },
  test: {
    exclude: ["packages/**", "node_modules/**", "dist/**"],
    globals: true,
    include: ["test/**/*.test.ts", "harness/**/*.test.ts"],
  },
})
