import { Effect, Schema } from "effect"

import type {
  AnyRecipeDefinition,
  FrameworkProtocolRecipeHelpers,
} from "../recipes/index.js"

export * from "../project-facts/diagnostic-rules.js"

export const DiagnosticRulesIndexRecipeInput = Schema.Struct({
  sourcePath: Schema.String,
})
export type DiagnosticRulesIndexRecipeInput =
  typeof DiagnosticRulesIndexRecipeInput.Type

export const DiagnosticRulesIndexRecipeOutput = Schema.Struct({
  sourcePath: Schema.String,
  forwardsProjectFactRules: Schema.Boolean,
})
export type DiagnosticRulesIndexRecipeOutput =
  typeof DiagnosticRulesIndexRecipeOutput.Type

export const summarizeDiagnosticRulesIndex = (
  input: DiagnosticRulesIndexRecipeInput,
): DiagnosticRulesIndexRecipeOutput => ({
  sourcePath: input.sourcePath,
  forwardsProjectFactRules: true,
})

export const DiagnosticRulesIndexRecipes = (
  helpers: FrameworkProtocolRecipeHelpers,
): readonly AnyRecipeDefinition[] => {
  const DiagnosticRulesIndexRecipeId =
    "framework-protocol.diagnostic-rules.index" as const
  const DiagnosticRulesIndexSourcePath =
    "packages/trellis/protocol/src/diagnostic-rules/index.ts" as const
// @attune-packet-target generated-runtime-projection eligible
  const DiagnosticRulesIndexSource = helpers.defineAlchemyResource({
    id: "framework-protocol.diagnostic-rules.index.source",
    kind: "file",
    alchemyType: "attune:resource:ProtocolSourceFile",
    addressSchema: DiagnosticRulesIndexRecipeInput,
    stateSchema: DiagnosticRulesIndexRecipeInput,
    modes: ["read"],
    consumedBy: [DiagnosticRulesIndexRecipeId],
  })
// @attune-packet-target generated-runtime-projection eligible
  const DiagnosticRulesIndexSurface = helpers.defineAlchemyResource({
    id: "framework-protocol.diagnostic-rules.index.surface",
    kind: "schema",
    alchemyType: "attune:resource:DiagnosticRulesIndexSurface",
    addressSchema: DiagnosticRulesIndexRecipeInput,
    stateSchema: DiagnosticRulesIndexRecipeOutput,
    modes: ["project", "read"],
    ownerRecipeId: DiagnosticRulesIndexRecipeId,
    producedBy: [DiagnosticRulesIndexRecipeId],
  })
  const DiagnosticRulesIndexHandler = helpers.defineRecipeHandler<
    DiagnosticRulesIndexRecipeInput,
    DiagnosticRulesIndexRecipeOutput,
    never,
    never
  >({
    id: "framework-protocol.diagnostic-rules.index.handler",
    recipeId: DiagnosticRulesIndexRecipeId,
    sourcePath: DiagnosticRulesIndexSourcePath,
    exportName: "summarizeDiagnosticRulesIndex",
    emitsReceipts: ["framework-protocol.diagnostic-rules.index"],
    handler: (input) => Effect.succeed(summarizeDiagnosticRulesIndex(input)),
  })

  return [
    helpers.defineSchemaRecipe({
      id: DiagnosticRulesIndexRecipeId,
      projectId: "framework-protocol",
      title: "Expose the diagnostic-rules protocol facade",
      inputSchema: DiagnosticRulesIndexRecipeInput,
      outputSchema: DiagnosticRulesIndexRecipeOutput,
      io: {
        inputSchema: DiagnosticRulesIndexRecipeInput,
        outputSchema: DiagnosticRulesIndexRecipeOutput,
        inputResources: [DiagnosticRulesIndexSource],
        outputResources: [DiagnosticRulesIndexSurface],
      },
      handler: DiagnosticRulesIndexHandler,
      alchemyDag: [{
        fromRecipeId: "framework-protocol.root",
        toRecipeId: DiagnosticRulesIndexRecipeId,
        resource: "framework-protocol.diagnostic-rules.index.surface",
        kind: "projects",
        modes: ["project", "read"],
      }],
      allowedFiles: [DiagnosticRulesIndexSourcePath],
      validationEvidence: ["framework-protocol:typecheck"],
    }),
  ] as const
}
