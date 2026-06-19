import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: {
      effect:
        "C:/Users/johns/Documents/Codex/2026-06-10/files-mentioned-by-the-user-you/attune/node_modules/.pnpm/effect@4.0.0-beta.78/node_modules/effect/dist/index.js",
    },
  },
  test: {
    exclude: ["node_modules/**", "dist/**"],
    globals: true,
    include: ["test/**/*.test.ts"],
  },
})
