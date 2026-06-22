import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

const require = createRequire(import.meta.url)

export default defineConfig({
  resolve: {
    alias: {
      "@attune/architecture": fileURLToPath(
        new URL("../attune-architecture/src/index.ts", import.meta.url),
      ),
      "@attune/framework-protocol": fileURLToPath(
        new URL("../../framework/protocol/src/index.ts", import.meta.url),
      ),
      effect: require.resolve("effect"),
    },
  },
  test: {
    exclude: ["node_modules/**", "dist/**"],
    globals: true,
    include: ["test/**/*.test.ts"],
  },
})
