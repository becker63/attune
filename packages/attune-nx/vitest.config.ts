import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const architectureProjectFacts = fileURLToPath(
  new URL("../../framework/protocol/src/project-facts/index.ts", import.meta.url),
)
const frameworkProtocol = fileURLToPath(
  new URL("../../framework/protocol/src/index.ts", import.meta.url),
)
const attunedDiscovery = fileURLToPath(
  new URL("../attuned-discovery/src/index.ts", import.meta.url),
)
const cocoindexEffect = fileURLToPath(
  new URL("../cocoindex-effect/src/index.ts", import.meta.url),
)
const foldkitUi = fileURLToPath(
  new URL("../attune-foldkit/src/index.ts", import.meta.url),
)
const piAgent = fileURLToPath(
  new URL("../attune-pi-agent/src/index.ts", import.meta.url),
)

export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@attune/framework-protocol/project-facts",
        replacement: architectureProjectFacts,
      },
      {
        find: "@attune/framework-protocol",
        replacement: frameworkProtocol,
      },
      {
        find: "@attune/architecture",
        replacement: architectureProjectFacts,
      },
      {
        find: "@attune/attuned-discovery",
        replacement: attunedDiscovery,
      },
      {
        find: "@attune/cocoindex-effect",
        replacement: cocoindexEffect,
      },
      {
        find: "@attune/foldkit-ui",
        replacement: foldkitUi,
      },
      {
        find: "@attune/pi-agent",
        replacement: piAgent,
      },
    ],
  },
})
