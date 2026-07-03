import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineRecipeHandler,
  defineSchemaRecipe,
} from "@attune/framework-protocol"
import { Data, Effect, Schema } from "effect"

export const CocoIndexErrorSourcePath =
  "packages/attune/cocoindex-effect/src/errors.ts" as const

export const CocoIndexErrorTaxonomyInput = Schema.Struct({
  packageRoot: Schema.Literal("packages/attune/cocoindex-effect"),
})
export type CocoIndexErrorTaxonomyInput = typeof CocoIndexErrorTaxonomyInput.Type

export const CocoIndexErrorTag = Schema.Literals([
  "CocoIndexCommandError",
  "CocoIndexDecodeError",
  "CocoIndexAnchorNotFound",
  "CocoIndexMcpProtocolError",
] as const)
export type CocoIndexErrorTag = typeof CocoIndexErrorTag.Type

export const CocoIndexErrorTaxonomyReport = Schema.Struct({
  packageRoot: Schema.Literal("packages/attune/cocoindex-effect"),
  tags: Schema.Array(CocoIndexErrorTag),
  effectTaggedErrors: Schema.Boolean,
})
export type CocoIndexErrorTaxonomyReport =
  typeof CocoIndexErrorTaxonomyReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexErrorTaxonomyResource = defineAlchemyResource({
  id: "cocoindex-effect.error-taxonomy",
  kind: "schema",
  alchemyType: "attune:resource:ErrorTaxonomy",
  ownerRecipeId: "cocoindex-effect.error-taxonomy",
  producedBy: ["cocoindex-effect.error-taxonomy"],
  consumedBy: [
    "cocoindex-effect.client-contract",
    "cocoindex-effect.ensure-indexed",
    "cocoindex-effect.mcp-stdio",
  ],
  addressSchema: CocoIndexErrorTaxonomyInput,
  stateSchema: CocoIndexErrorTaxonomyReport,
  modes: ["read", "check", "observe"],
})

export class CocoIndexCommandError extends Data.TaggedError("CocoIndexCommandError")<{
  readonly message: string
  readonly operation: string
  readonly exitCode?: number
  readonly stderr?: string
  readonly cause?: unknown
}> {}

export class CocoIndexDecodeError extends Data.TaggedError("CocoIndexDecodeError")<{
  readonly message: string
  readonly operation: string
  readonly payload: unknown
  readonly cause?: unknown
}> {}

export class CocoIndexAnchorNotFound extends Data.TaggedError("CocoIndexAnchorNotFound")<{
  readonly repoSnapshotId: string
  readonly anchorId: string
}> {}

export class CocoIndexMcpProtocolError extends Data.TaggedError("CocoIndexMcpProtocolError")<{
  readonly message: string
  readonly method: string
  readonly payload?: unknown
  readonly cause?: unknown
}> {}

export type CocoIndexError =
  | CocoIndexCommandError
  | CocoIndexDecodeError
  | CocoIndexAnchorNotFound
  | CocoIndexMcpProtocolError

const CocoIndexErrorTaxonomyTags = [
  "CocoIndexCommandError",
  "CocoIndexDecodeError",
  "CocoIndexAnchorNotFound",
  "CocoIndexMcpProtocolError",
] as const

export const describeCocoIndexErrorTaxonomy = (): CocoIndexErrorTaxonomyReport => ({
  packageRoot: "packages/attune/cocoindex-effect",
  tags: [...CocoIndexErrorTaxonomyTags],
  effectTaggedErrors: true,
})

export const CocoIndexErrorTaxonomyHandler = defineRecipeHandler<
  CocoIndexErrorTaxonomyInput,
  CocoIndexErrorTaxonomyReport
>({
  id: "cocoindex-effect.error-taxonomy.handler",
  recipeId: "cocoindex-effect.error-taxonomy",
  sourcePath: CocoIndexErrorSourcePath,
  exportName: "describeCocoIndexErrorTaxonomy",
  handler: () => Effect.succeed(describeCocoIndexErrorTaxonomy()),
  emitsReceipts: ["cocoindex-effect.error-taxonomy"],
})

export const CocoIndexErrorTaxonomyDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: "cocoindex-effect.error-taxonomy",
  toRecipeId: "cocoindex-effect.client-contract",
  resource: CocoIndexErrorTaxonomyResource,
  kind: "projects",
  modes: ["read", "check", "observe"],
})

export const CocoIndexErrorTaxonomyRecipe = defineSchemaRecipe({
  id: "cocoindex-effect.error-taxonomy",
  projectId: "cocoindex-effect",
  title: "Expose CocoIndex Effect error taxonomy",
  inputSchema: CocoIndexErrorTaxonomyInput,
  outputSchema: CocoIndexErrorTaxonomyReport,
  nxTarget: "cocoindex-effect:typecheck",
  allowedFiles: [CocoIndexErrorSourcePath],
  validationEvidence: ["cocoindex-effect:typecheck", "cocoindex-effect:test"],
  io: {
    inputSchema: CocoIndexErrorTaxonomyInput,
    outputSchema: CocoIndexErrorTaxonomyReport,
    inputResources: [CocoIndexErrorTaxonomyResource],
    outputResources: [CocoIndexErrorTaxonomyResource],
  },
  handler: CocoIndexErrorTaxonomyHandler,
  alchemyDag: [CocoIndexErrorTaxonomyDagEdge],
})

export const CocoIndexErrorRecipes = [CocoIndexErrorTaxonomyRecipe] as const
