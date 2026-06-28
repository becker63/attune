import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@attune/framework-protocol": fileURLToPath(
        new URL("../../../framework/protocol/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    exclude: ["node_modules/**", "dist/**"],
    include: ["test/**/*.test.ts"],
  },
})
