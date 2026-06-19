import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      "@attune/dispatch-core": fileURLToPath(
        new URL("../dispatch-core/src/index.ts", import.meta.url),
      ),
      "@attune/dispatch-schema": fileURLToPath(
        new URL("../dispatch-schema/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    exclude: ["node_modules/**", "dist/**"],
    globals: true,
    include: ["test/**/*.test.ts"],
  },
})
