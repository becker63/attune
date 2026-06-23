import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@attune/framework-protocol/package-contract",
        replacement: fileURLToPath(new URL("../protocol/src/package-contract/index.ts", import.meta.url)),
      },
      {
        find: "@attune/framework-protocol",
        replacement: fileURLToPath(new URL("../protocol/src/index.ts", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "node",
  },
})
