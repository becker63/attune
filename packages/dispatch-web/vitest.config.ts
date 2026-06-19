import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    exclude: ["node_modules/**", "dist/**"],
    globals: true,
    include: ["src/**/*.test.ts"],
  },
})
