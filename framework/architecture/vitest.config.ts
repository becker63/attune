import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@attune/attuned-discovery",
        replacement: fileURLToPath(new URL("../../packages/attuned-discovery/src/index.ts", import.meta.url)),
      },
      {
        find: "@attune/framework-nx",
        replacement: fileURLToPath(new URL("../nx/src/index.ts", import.meta.url)),
      },
      {
        find: "@attune/framework-protocol/project-facts",
        replacement: fileURLToPath(new URL("../protocol/src/project-facts/index.ts", import.meta.url)),
      },
      {
        find: "@attune/framework-protocol",
        replacement: fileURLToPath(new URL("../protocol/src/index.ts", import.meta.url)),
      },
      {
        find: "@attune/framework-runtime",
        replacement: fileURLToPath(new URL("../runtime/src/index.ts", import.meta.url)),
      },
      {
        find: "@attune/framework-sqlite",
        replacement: fileURLToPath(new URL("../sqlite/src/index.ts", import.meta.url)),
      },
      {
        find: "joern-effect/package-effect",
        replacement: fileURLToPath(new URL("../../packages/joern-effect/node_modules/effect/dist/esm/index.js", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "node",
  },
})
