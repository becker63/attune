import { createRequire } from "node:module"
import { defineConfig } from "vitest/config"

const require = createRequire(new URL("./package.json", import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      effect: require.resolve("effect"),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
})
