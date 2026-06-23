import { createRequire } from "node:module"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const require = createRequire(new URL("../../framework/architecture/package.json", import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@attune/architecture": fileURLToPath(
        new URL("../../framework/architecture/src/index.ts", import.meta.url),
      ),
      "@attune/framework-protocol": fileURLToPath(
        new URL("../protocol/src/index.ts", import.meta.url),
      ),
      effect: require.resolve("effect"),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
})
