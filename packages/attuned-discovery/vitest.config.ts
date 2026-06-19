import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

const effectEntry = fileURLToPath(
  new URL("../../node_modules/.pnpm/effect@4.0.0-beta.78/node_modules/effect/dist/index.js", import.meta.url),
)

export default defineConfig({
  resolve: {
    alias: {
      effect: effectEntry,
    },
  },
  test: {
    exclude: ["node_modules/**", "dist/**"],
    globals: true,
    include: ["test/**/*.test.ts"],
  },
})
