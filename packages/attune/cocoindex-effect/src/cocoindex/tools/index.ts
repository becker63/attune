import {
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
export * from "./search.js"
import {
  CocoIndexSearchToolResource,
  searchTool,
} from "./search.js"

export const CocoIndexSyncMcpToolsRecipeId =
  "cocoindex-effect.sync-mcp-tools" as const
const CocoIndexGeneratedSurfaceCheckRecipeId =
  "cocoindex-effect.generated-surface-check" as const
const CocoIndexToolRegistryResourceId =
  "cocoindex-effect.tool-registry" as const
const CocoIndexToolRegistryHandlerId =
  "cocoindex-effect.sync-mcp-tools.handler" as const
const CocoIndexToolRegistrySourcePath =
  "packages/attune/cocoindex-effect/src/cocoindex/tools/index.ts" as const

export const cocoindexMcpTools = [searchTool] as const

export type CocoIndexMcpTool = (typeof cocoindexMcpTools)[number]

export const CocoIndexToolRegistryAddress = Schema.Struct({
  packageRoot: Schema.Literal("packages/attune/cocoindex-effect"),
  registryPath: Schema.Literal(CocoIndexToolRegistrySourcePath),
})
export type CocoIndexToolRegistryAddress = typeof CocoIndexToolRegistryAddress.Type

export const CocoIndexToolRegistryState = Schema.Struct({
  toolNames: Schema.Array(Schema.String),
  count: Schema.Number,
})
export type CocoIndexToolRegistryState = typeof CocoIndexToolRegistryState.Type

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexToolRegistryResource = defineAlchemyResource({
  id: CocoIndexToolRegistryResourceId,
  kind: "schema",
  alchemyType: "attune:resource:Schema",
  ownerRecipeId: CocoIndexSyncMcpToolsRecipeId,
  producedBy: [CocoIndexSyncMcpToolsRecipeId],
  consumedBy: [CocoIndexGeneratedSurfaceCheckRecipeId],
  addressFields: ["registryPath"],
  addressSchema: CocoIndexToolRegistryAddress,
  stateSchema: CocoIndexToolRegistryState,
  modes: ["project", "read", "check"],
})

export const CocoIndexToolRegistryHandler = defineRecipeHandler<
  CocoIndexToolRegistryAddress,
  CocoIndexToolRegistryState
>({
  id: CocoIndexToolRegistryHandlerId,
  recipeId: CocoIndexSyncMcpToolsRecipeId,
  sourcePath: CocoIndexToolRegistrySourcePath,
  exportName: "cocoindexMcpTools",
  handler: () =>
    Effect.succeed({
      toolNames: cocoindexMcpTools.map((tool) => tool.name),
      count: cocoindexMcpTools.length,
    }),
  emitsReceipts: ["cocoindex-effect.tool-registry"],
})

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexSyncMcpToolsRecipe = defineProjectionRecipe({
  id: CocoIndexSyncMcpToolsRecipeId,
  projectId: "cocoindex-effect",
  title: "Project the CocoIndex MCP tool registry",
  inputSchema: CocoIndexToolRegistryAddress,
  outputSchema: CocoIndexToolRegistryState,
  nxTarget: "cocoindex-effect:test",
  allowedFiles: [
    "packages/attune/cocoindex-effect/src/cocoindex/tools/index.ts",
    "packages/attune/cocoindex-effect/src/cocoindex/tools/search.ts",
    ".attune/cache/generated/cocoindex-effect/cocoindex/tools/**",
  ],
  validationEvidence: ["cocoindex-effect:test", "cocoindex-effect:typecheck"],
  io: {
    inputSchema: CocoIndexToolRegistryAddress,
    outputSchema: CocoIndexToolRegistryState,
    inputResources: [CocoIndexSearchToolResource],
    outputResources: [CocoIndexToolRegistryResource],
  },
  handler: CocoIndexToolRegistryHandler,
  alchemyDag: [{
    fromRecipeId: CocoIndexSyncMcpToolsRecipeId,
    toRecipeId: CocoIndexGeneratedSurfaceCheckRecipeId,
    resource: CocoIndexToolRegistryResource,
    kind: "validates",
    modes: ["check", "read"],
  }],
})

export const CocoIndexToolRegistryRecipes = [CocoIndexSyncMcpToolsRecipe] as const
