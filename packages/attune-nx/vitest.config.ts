import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const architectureContract = fileURLToPath(
  new URL("../attune-architecture/src/package-contract/index.ts", import.meta.url),
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
    alias: {
      "@attune/architecture": architectureContract,
      "@attune/framework-protocol": frameworkProtocol,
      "@attune/attuned-discovery": attunedDiscovery,
      "@attune/cocoindex-effect": cocoindexEffect,
      "@attune/foldkit-ui": foldkitUi,
      "@attune/pi-agent": piAgent,
    },
  },
})
