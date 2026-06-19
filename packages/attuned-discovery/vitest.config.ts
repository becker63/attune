import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

const effectRoot = fileURLToPath(
  new URL(
    "../../node_modules/.pnpm/effect@4.0.0-beta.78/node_modules/effect/",
    import.meta.url,
  ),
)

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^effect\/unstable\/reactivity$/,
        replacement: `${effectRoot}dist/unstable/reactivity/index.js`,
      },
      {
        find: /^effect$/,
        replacement: `${effectRoot}dist/index.js`,
      },
    ],
  },
  test: {
    exclude: ["node_modules/**", "dist/**"],
    globals: true,
    include: ["test/**/*.test.ts"],
  },
})
