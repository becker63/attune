import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const require = createRequire(new URL("../../packages/attune-architecture-lint/package.json", import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@attune/architecture": fileURLToPath(
        new URL("../../packages/attune-architecture-lint/src/index.ts", import.meta.url),
      ),
      effect: require.resolve("effect"),
    },
  },
  test: {
    environment: "node",
    include: ["framework/protocol/test/**/*.test.ts"],
  },
})
