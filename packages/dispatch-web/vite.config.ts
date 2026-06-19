import { fileURLToPath } from "node:url"

import { foldkit } from "@foldkit/vite-plugin"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [foldkit({ devToolsMcpPort: 9988 })],
  resolve: {
    alias: {
      "@attune/dispatch-core": fileURLToPath(
        new URL("../dispatch-core/src/index.ts", import.meta.url),
      ),
      "@attune/dispatch-feed": fileURLToPath(
        new URL("../dispatch-feed/src/index.ts", import.meta.url),
      ),
      "@attune/dispatch-foldkit": fileURLToPath(
        new URL("../dispatch-foldkit/src/index.ts", import.meta.url),
      ),
      "@attune/dispatch-schema": fileURLToPath(
        new URL("../dispatch-schema/src/index.ts", import.meta.url),
      ),
    },
  },
  optimizeDeps: {
    entries: ["src/entry.ts"],
  },
})
