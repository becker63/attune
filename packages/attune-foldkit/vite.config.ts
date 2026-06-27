import { fileURLToPath } from "node:url"

import { foldkit } from "@foldkit/vite-plugin"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [foldkit({ devToolsMcpPort: 9988 })],
  resolve: {
    alias: {
      "@attune/foldkit-ui": fileURLToPath(
        new URL("./src/index.ts", import.meta.url),
      ),
    },
  },
  optimizeDeps: {
    entries: ["src/entry.ts"],
  },
})
