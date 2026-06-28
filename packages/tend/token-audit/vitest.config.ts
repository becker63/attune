import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@attune/framework-protocol": fileURLToPath(
        new URL("../../trellis/protocol/src/index.ts", import.meta.url),
      ),
      "@attune/tend-core": fileURLToPath(
        new URL("../core/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    exclude: ["node_modules/**", "dist/**"],
    include: ["test/**/*.test.ts"],
  },
})
