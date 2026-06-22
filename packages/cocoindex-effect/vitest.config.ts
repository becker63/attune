import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@attune/architecture": fileURLToPath(
        new URL("../attune-architecture/src/index.ts", import.meta.url),
      ),
      "@attune/framework-protocol": fileURLToPath(
        new URL("../../framework/protocol/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
  },
})
