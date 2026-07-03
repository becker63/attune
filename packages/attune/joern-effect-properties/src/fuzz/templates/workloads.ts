import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
import fc from "fast-check"
import type { SemanticMutationPlan, SemanticCasePlan } from "../services/mutator.js"
import type {
  SemanticMutationKind,
  SemanticMutationStep,
  SemanticProjectSeed,
} from "../domain/model.js"

export const semanticMutationKinds: readonly SemanticMutationKind[] = [
  "function-wrap",
  "async-boundary",
  "generic-decode",
  "object-destructure",
  "optional-chain",
  "jsx-prop-flow",
  "module-split",
  "source-sink-flow",
]

const identifier = fc
  .tuple(
    fc.constantFrom("alpha", "beta", "decode", "flow", "module", "props", "source", "sink"),
    fc.integer({ max: 10_000, min: 0 }),
  )
  .map(([prefix, index]) => `${prefix}${index}`)

const replayPath = fc
  .array(fc.integer({ max: 20, min: 0 }), { maxLength: 5 })
  .map((parts) => parts.join(":"))

const kindsForSeed = (seed: SemanticProjectSeed): readonly SemanticMutationKind[] => {
  const hasTypeSyntax = seed.files.some((file) => file.syntaxFlavor === "ts" || file.syntaxFlavor === "tsx")
  const hasJsxSyntax = seed.files.some((file) => file.syntaxFlavor === "jsx" || file.syntaxFlavor === "tsx")
  return semanticMutationKinds.filter((kind) => {
    if (kind === "generic-decode") {return hasTypeSyntax}
    if (kind === "jsx-prop-flow") {return hasJsxSyntax}
    return true
  })
}

export const semanticMutationStepArbitrary = (
  seed: SemanticProjectSeed,
): fc.Arbitrary<SemanticMutationStep> => {
  const allowedKinds = kindsForSeed(seed)
  const targetFiles = seed.files.map((file) => file.path)
  const targetFile = targetFiles.length === 0
    ? fc.constant(seed.entrypoint)
    : fc.constantFrom(...targetFiles)
  return fc.record({
    kind: fc.constantFrom(...allowedKinds),
    params: identifier.map((name) => ({ name, value: name })),
    targetFile,
  })
}

export const semanticMutationPlanArbitrary = (
  seed: SemanticProjectSeed,
  maxMutators = 4,
): fc.Arbitrary<SemanticMutationPlan> =>
  fc.record({
    planId: identifier.map((suffix) => `${seed.id}-${suffix}`),
    replay: fc.record({
      fastCheckPath: replayPath,
      fastCheckSeed: fc.integer({ max: 2_147_483_647, min: 1 }),
    }),
    steps: fc.array(semanticMutationStepArbitrary(seed), { maxLength: maxMutators }),
  })

export const semanticCasePlanArbitrary = (
  seeds: readonly SemanticProjectSeed[],
  maxMutators = 4,
): fc.Arbitrary<SemanticCasePlan> =>
  fc.constantFrom(...seeds).chain((seed) =>
    semanticMutationPlanArbitrary(seed, maxMutators).map((plan) => ({
      caseId: `${seed.id}-${plan.replay?.fastCheckSeed ?? "replay"}-${plan.planId}`,
      plan,
      seed,
    })),
  )

export const mutationKinds = semanticMutationKinds
export const mutationStepArbitrary = semanticMutationStepArbitrary
export const mutationPlanArbitrary = semanticMutationPlanArbitrary
export const casePlanArbitrary = semanticCasePlanArbitrary

const JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeId = "joern-effect-properties.fuzz.templates.workloads" as const
const JoernEffectPropertiesFuzzTemplatesWorkloadsLocalResourceId = "joern-effect-properties.fuzz.templates.workloads.resource" as const
const JoernEffectPropertiesFuzzTemplatesWorkloadsLocalHandlerId = "joern-effect-properties.fuzz.templates.workloads.handler" as const
const JoernEffectPropertiesFuzzTemplatesWorkloadsLocalSourcePath = "packages/attune/joern-effect-properties/src/fuzz/templates/workloads.ts" as const
const JoernEffectPropertiesFuzzTemplatesWorkloadsLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesFuzzTemplatesWorkloadsLocalSourcePath),
})
export type JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeInput = typeof JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeInput.Type

export const JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesFuzzTemplatesWorkloadsLocalSourcePath),
})
export type JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeOutput = typeof JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesFuzzTemplatesWorkloadsLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesFuzzTemplatesWorkloadsLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeId,
  producedBy: [JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeId],
  consumedBy: [JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeId, JoernEffectPropertiesFuzzTemplatesWorkloadsLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesFuzzTemplatesWorkloadsLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeInput,
  JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeOutput
>({
  id: JoernEffectPropertiesFuzzTemplatesWorkloadsLocalHandlerId,
  recipeId: JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeId,
  sourcePath: JoernEffectPropertiesFuzzTemplatesWorkloadsLocalSourcePath,
  exportName: "JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipes",
  emitsReceipts: ["joern-effect-properties.fuzz.templates.workloads.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/fuzz/templates/workloads.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesFuzzTemplatesWorkloadsLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesFuzzTemplatesWorkloadsLocalResource],
    outputResources: [JoernEffectPropertiesFuzzTemplatesWorkloadsLocalResource],
  },
  handler: JoernEffectPropertiesFuzzTemplatesWorkloadsLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipeId,
      toRecipeId: JoernEffectPropertiesFuzzTemplatesWorkloadsLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesFuzzTemplatesWorkloadsLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipes = [JoernEffectPropertiesFuzzTemplatesWorkloadsLocalRecipe] as const
