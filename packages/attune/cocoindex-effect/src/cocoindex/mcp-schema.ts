import {
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

export const CocoIndexGeneratedSurfaceCheckRecipeId =
  "cocoindex-effect.generated-surface-check" as const
const CocoIndexEnsureIndexedRecipeId =
  "cocoindex-effect.ensure-indexed" as const
const CocoIndexMcpSchemaSnapshotResourceId =
  "cocoindex-effect.mcp-schema-snapshot" as const
const CocoIndexGeneratedSurfaceCheckHandlerId =
  "cocoindex-effect.generated-surface-check.handler" as const
const CocoIndexMcpSchemaSourcePath =
  "packages/attune/cocoindex-effect/src/cocoindex/mcp-schema.ts" as const

export const CocoIndexCodeMcpToolName = Schema.Literal("search")
export type CocoIndexCodeMcpToolName = typeof CocoIndexCodeMcpToolName.Type

export const CocoIndexMcpSearchInput = Schema.Struct({
  query: Schema.String,
  limit: Schema.optional(Schema.Number),
  offset: Schema.optional(Schema.Number),
  refresh_index: Schema.optional(Schema.Boolean),
  languages: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
  paths: Schema.optional(Schema.NullOr(Schema.Array(Schema.String))),
})
export type CocoIndexMcpSearchInput = typeof CocoIndexMcpSearchInput.Type

export const CocoIndexCodeChunkResult = Schema.Struct({
  file_path: Schema.String,
  language: Schema.String,
  content: Schema.String,
  start_line: Schema.Number,
  end_line: Schema.Number,
  score: Schema.Number,
})
export type CocoIndexCodeChunkResult = typeof CocoIndexCodeChunkResult.Type

export const CocoIndexMcpSearchResult = Schema.Struct({
  success: Schema.Boolean,
  results: Schema.Array(CocoIndexCodeChunkResult),
  total_returned: Schema.Number,
  offset: Schema.Number,
  message: Schema.optional(Schema.NullOr(Schema.String)),
})
export type CocoIndexMcpSearchResult = typeof CocoIndexMcpSearchResult.Type

export const CocoIndexCodeMcpSchemaSnapshot = {
  repository: "https://github.com/cocoindex-io/cocoindex-code",
  command: "ccc mcp",
  tool: "search",
  sourceFiles: [
    "src/cocoindex_code/server.py",
    "src/cocoindex_code/protocol.py",
  ],
} as const

export const CocoIndexMcpSchemaSnapshotAddress = Schema.Struct({
  tool: CocoIndexCodeMcpToolName,
})
export type CocoIndexMcpSchemaSnapshotAddress =
  typeof CocoIndexMcpSchemaSnapshotAddress.Type

export const CocoIndexMcpSchemaSnapshotState = Schema.Struct({
  repository: Schema.String,
  command: Schema.String,
  tool: CocoIndexCodeMcpToolName,
  sourceFiles: Schema.Array(Schema.String),
  inputSchemaBound: Schema.Boolean,
  resultSchemaBound: Schema.Boolean,
})
export type CocoIndexMcpSchemaSnapshotState =
  typeof CocoIndexMcpSchemaSnapshotState.Type

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexMcpSchemaSnapshotResource = defineAlchemyResource({
  id: CocoIndexMcpSchemaSnapshotResourceId,
  kind: "schema",
  alchemyType: "attune:resource:Schema",
  ownerRecipeId: CocoIndexGeneratedSurfaceCheckRecipeId,
  producedBy: [CocoIndexGeneratedSurfaceCheckRecipeId],
  consumedBy: [CocoIndexEnsureIndexedRecipeId],
  addressFields: ["sourcePath", "tool"],
  addressSchema: CocoIndexMcpSchemaSnapshotAddress,
  stateSchema: CocoIndexMcpSchemaSnapshotState,
  modes: ["check", "read", "observe"],
})

export const CocoIndexGeneratedSurfaceCheckHandler = defineRecipeHandler<
  CocoIndexMcpSchemaSnapshotAddress,
  CocoIndexMcpSchemaSnapshotState
>({
  id: CocoIndexGeneratedSurfaceCheckHandlerId,
  recipeId: CocoIndexGeneratedSurfaceCheckRecipeId,
  sourcePath: CocoIndexMcpSchemaSourcePath,
  exportName: "CocoIndexCodeMcpSchemaSnapshot",
  handler: () =>
    Effect.succeed({
      ...CocoIndexCodeMcpSchemaSnapshot,
      inputSchemaBound: CocoIndexMcpSearchInput !== undefined,
      resultSchemaBound: CocoIndexMcpSearchResult !== undefined,
    }),
  emitsReceipts: ["cocoindex-effect.generated-surface.checked"],
})

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexGeneratedSurfaceCheckRecipe = defineProjectionRecipe({
  id: CocoIndexGeneratedSurfaceCheckRecipeId,
  projectId: "cocoindex-effect",
  title: "Validate live CocoIndex MCP schema and registry freshness",
  inputSchema: CocoIndexMcpSchemaSnapshotAddress,
  outputSchema: CocoIndexMcpSchemaSnapshotState,
  nxTarget: "cocoindex-effect:test",
  allowedFiles: [CocoIndexMcpSchemaSourcePath],
  validationEvidence: ["cocoindex-effect:test", "cocoindex-effect:typecheck"],
  io: {
    inputSchema: CocoIndexMcpSchemaSnapshotAddress,
    outputSchema: CocoIndexMcpSchemaSnapshotState,
    inputResources: [CocoIndexMcpSchemaSnapshotResource],
    outputResources: [CocoIndexMcpSchemaSnapshotResource],
  },
  handler: CocoIndexGeneratedSurfaceCheckHandler,
  alchemyDag: [{
    fromRecipeId: CocoIndexGeneratedSurfaceCheckRecipeId,
    toRecipeId: CocoIndexEnsureIndexedRecipeId,
    resource: CocoIndexMcpSchemaSnapshotResource,
    kind: "validates",
    modes: ["check", "read"],
  }],
})

export const CocoIndexMcpSchemaRecipes = [
  CocoIndexGeneratedSurfaceCheckRecipe,
] as const
