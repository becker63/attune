import {
  defineAlchemyResource,
  defineDocumentationRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

const documentationRecipeId = "attune-pi-agent.documentation-surface"
const commandSurfaceRecipeId = "attune-pi-agent.command-surface"

export const AttunePiDocumentationInput = Schema.Struct({
  docsRoot: Schema.Literal("packages/attune/pi-agent/docs"),
})

export const AttunePiDocumentationReport = Schema.Struct({
  recipeId: Schema.String,
  docsRoot: Schema.String,
  falsificationLoopDocumented: Schema.Boolean,
})
export type AttunePiDocumentationReport = typeof AttunePiDocumentationReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiDocumentationResource = defineAlchemyResource({
  id: "attune-pi-agent.documentation.resource",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: documentationRecipeId,
  producedBy: [documentationRecipeId],
  consumedBy: [commandSurfaceRecipeId],
  addressSchema: AttunePiDocumentationInput,
  stateSchema: AttunePiDocumentationReport,
  modes: ["read", "project"],
})

export const attunePiDocumentationReport = (
  input: typeof AttunePiDocumentationInput.Type,
): AttunePiDocumentationReport => ({
  recipeId: documentationRecipeId,
  docsRoot: input.docsRoot,
  falsificationLoopDocumented: true,
})

export const AttunePiDocumentationRecipe = defineDocumentationRecipe({
  id: "attune-pi-agent.documentation-surface",
  projectId: "attune-pi-agent",
  title: "Own Pi agent design and falsification-loop documentation",
  inputSchema: AttunePiDocumentationInput,
  outputSchema: AttunePiDocumentationReport,
  nxTarget: "attune-pi-agent:test",
  allowedFiles: [
    "packages/attune/pi-agent/src/documentation-recipes.ts",
    "packages/attune/pi-agent/docs/**",
  ],
  validationEvidence: ["attune-pi-agent:test"],
  io: {
    inputSchema: AttunePiDocumentationInput,
    outputSchema: AttunePiDocumentationReport,
    inputResources: [AttunePiDocumentationResource],
    outputResources: [AttunePiDocumentationResource],
  },
  handler: defineRecipeHandler<
    typeof AttunePiDocumentationInput.Type,
    AttunePiDocumentationReport
  >({
    id: "attune-pi-agent.documentation-surface.handler",
    recipeId: documentationRecipeId,
    sourcePath: "packages/attune/pi-agent/src/documentation-recipes.ts",
    exportName: "attunePiDocumentationReport",
    emitsReceipts: ["attune-pi-agent.documentation.projected"],
    handler: (input) => Effect.succeed(attunePiDocumentationReport(input)),
  }),
  alchemyDag: [{
    fromRecipeId: documentationRecipeId,
    toRecipeId: commandSurfaceRecipeId,
    resource: AttunePiDocumentationResource,
    kind: "projects",
    modes: ["read", "project"],
  }],
})

export const AttunePiDocumentationRecipes = [
  AttunePiDocumentationRecipe,
] as const
