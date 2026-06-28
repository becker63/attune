import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@attune/architecture": fileURLToPath(
        new URL("../../trellis/architecture/src/index.ts", import.meta.url),
      ),
      "@attune/framework-protocol": fileURLToPath(
        new URL("../../trellis/protocol/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
  },
})
