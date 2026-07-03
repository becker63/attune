import {
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
import {
  CocoIndexMcpSearchInput,
  CocoIndexMcpSearchResult,
} from "../mcp-schema.js"

export const CocoIndexScaffoldMcpToolRecipeId =
  "cocoindex-effect.scaffold-mcp-tool" as const
const CocoIndexSyncMcpToolsRecipeId =
  "cocoindex-effect.sync-mcp-tools" as const
const CocoIndexSearchToolResourceId = "cocoindex-effect.search-tool" as const
const CocoIndexSearchToolHandlerId =
  "cocoindex-effect.scaffold-mcp-tool.handler" as const
const CocoIndexSearchToolSourcePath =
  "packages/attune/cocoindex-effect/src/cocoindex/tools/search.ts" as const

export const SearchInput = CocoIndexMcpSearchInput
export type SearchInput = typeof SearchInput.Type

export const SearchResult = CocoIndexMcpSearchResult
export type SearchResult = typeof SearchResult.Type

export const searchTool = {
  name: "search",
  input: SearchInput,
  result: SearchResult,
} as const

export const CocoIndexSearchToolAddress = Schema.Struct({
  toolName: Schema.Literal("search"),
})
export type CocoIndexSearchToolAddress = typeof CocoIndexSearchToolAddress.Type

export const CocoIndexSearchToolContract = Schema.Struct({
  name: Schema.Literal("search"),
  inputSchemaBound: Schema.Boolean,
  resultSchemaBound: Schema.Boolean,
})
export type CocoIndexSearchToolContract = typeof CocoIndexSearchToolContract.Type

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexSearchToolResource = defineAlchemyResource({
  id: CocoIndexSearchToolResourceId,
  kind: "schema",
  alchemyType: "attune:resource:Schema",
  ownerRecipeId: CocoIndexScaffoldMcpToolRecipeId,
  producedBy: [CocoIndexScaffoldMcpToolRecipeId],
  consumedBy: [CocoIndexSyncMcpToolsRecipeId],
  addressFields: ["toolName", "sourcePath"],
  addressSchema: CocoIndexSearchToolAddress,
  stateSchema: CocoIndexSearchToolContract,
  modes: ["project", "read"],
})

export const CocoIndexSearchToolHandler = defineRecipeHandler<
  CocoIndexSearchToolAddress,
  CocoIndexSearchToolContract
>({
  id: CocoIndexSearchToolHandlerId,
  recipeId: CocoIndexScaffoldMcpToolRecipeId,
  sourcePath: CocoIndexSearchToolSourcePath,
  exportName: "searchTool",
  handler: () =>
    Effect.succeed({
      name: searchTool.name,
      inputSchemaBound: searchTool.input === SearchInput,
      resultSchemaBound: searchTool.result === SearchResult,
    }),
  emitsReceipts: ["cocoindex-effect.search-tool.contract"],
})

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexScaffoldMcpToolRecipe = defineProjectionRecipe({
  id: CocoIndexScaffoldMcpToolRecipeId,
  projectId: "cocoindex-effect",
  title: "Express the CocoIndex MCP search tool adapter",
  inputSchema: CocoIndexSearchToolAddress,
  outputSchema: CocoIndexSearchToolContract,
  nxTarget: "cocoindex-effect:test",
  allowedFiles: [CocoIndexSearchToolSourcePath],
  validationEvidence: ["cocoindex-effect:test", "cocoindex-effect:typecheck"],
  io: {
    inputSchema: CocoIndexSearchToolAddress,
    outputSchema: CocoIndexSearchToolContract,
    inputResources: [CocoIndexSearchToolResource],
    outputResources: [CocoIndexSearchToolResource],
  },
  handler: CocoIndexSearchToolHandler,
  alchemyDag: [{
    fromRecipeId: CocoIndexScaffoldMcpToolRecipeId,
    toRecipeId: CocoIndexSyncMcpToolsRecipeId,
    resource: CocoIndexSearchToolResource,
    kind: "projects",
    modes: ["project", "read"],
  }],
})

export const CocoIndexSearchToolRecipes = [CocoIndexScaffoldMcpToolRecipe] as const
