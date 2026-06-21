import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

export default defineConfig({
  resolve: {
    alias: {
      "@attune/attuned-discovery": fileURLToPath(
        new URL("../attuned-discovery/src/index.ts", import.meta.url),
      ),
    },
  },
  test: {
    environment: "happy-dom",
    exclude: ["node_modules/**", "dist/**"],
    globals: true,
    include: ["test/**/*.test.ts"],
    server: {
      deps: {
        inline: ["foldkit"],
      },
    },
    setupFiles: ["test/vitest-setup.ts"],
  },
})
