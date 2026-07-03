import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
export { raw } from "./builder/raw.js"
export { property, type Property } from "./builder/property.js"
export {
  BoundFlow,
  BoundTraversal,
  FlowTraversal,
  MaterializationBuilder,
} from "./builder/traversal.js"
export {
  CpgProgram,
  CpgProgramDefinition,
  GraphWeights,
  type CompiledCpgProgram,
} from "./program/CpgProgram.js"
export { CpgProgramBuilder } from "./program/CpgProgramBuilder.js"
export type { BindingAst, BoundLike, VariableId } from "./program/model.js"
export {
  CpgGraph,
  EdgeKind,
  EvidenceEdge,
  EvidenceGraph,
  EvidenceNode,
  Finding,
  GraphFact,
  GraphAnalysisError,
  GraphMaterializationError,
  NodeKind,
  ProtocolDeviation,
} from "./program/Evidence.js"
export { cpg } from "./generated/cpg.js"
export { nodes } from "./generated/nodes.js"
export { prop } from "./generated/prop.js"
export { generatedSchema } from "./generated/schema.js"
export { traversalPropertyFilters, traversalStepNames } from "./generated/traversal.js"
export type { TraversalSegment } from "./builder/traversal.js"

const JoernEffectPureIndexLocalRecipeId = "joern-effect.pure.index" as const
const JoernEffectPureIndexLocalResourceId = "joern-effect.pure.index.resource" as const
const JoernEffectPureIndexLocalHandlerId = "joern-effect.pure.index.handler" as const
const JoernEffectPureIndexLocalSourcePath = "packages/attune/joern-effect/src/pure/index.ts" as const
const JoernEffectPureIndexLocalSourceSurfaceRecipeId = "joern-effect.source-surface" as const

export const JoernEffectPureIndexLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPureIndexLocalSourcePath),
})
export type JoernEffectPureIndexLocalRecipeInput = typeof JoernEffectPureIndexLocalRecipeInput.Type

export const JoernEffectPureIndexLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPureIndexLocalSourcePath),
})
export type JoernEffectPureIndexLocalRecipeOutput = typeof JoernEffectPureIndexLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPureIndexLocalResource = defineAlchemyResource({
  id: JoernEffectPureIndexLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPureIndexLocalRecipeId,
  producedBy: [JoernEffectPureIndexLocalRecipeId],
  consumedBy: [JoernEffectPureIndexLocalRecipeId, JoernEffectPureIndexLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPureIndexLocalRecipeInput as never,
  stateSchema: JoernEffectPureIndexLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPureIndexLocalHandler = defineRecipeHandler<
  JoernEffectPureIndexLocalRecipeInput,
  JoernEffectPureIndexLocalRecipeOutput
>({
  id: JoernEffectPureIndexLocalHandlerId,
  recipeId: JoernEffectPureIndexLocalRecipeId,
  sourcePath: JoernEffectPureIndexLocalSourcePath,
  exportName: "JoernEffectPureIndexLocalRecipes",
  emitsReceipts: ["joern-effect.pure.index.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPureIndexLocalRecipe = defineRecipe({
  id: JoernEffectPureIndexLocalRecipeId,
  projectId: "joern-effect",
  title: "Express src/pure/index.ts as a file-local recipe",
  inputSchema: JoernEffectPureIndexLocalRecipeInput as never,
  outputSchema: JoernEffectPureIndexLocalRecipeOutput as never,
  nxTarget: "joern-effect:typecheck",
  allowedFiles: [JoernEffectPureIndexLocalSourcePath],
  validationEvidence: ["joern-effect:typecheck"],
  io: {
    inputSchema: JoernEffectPureIndexLocalRecipeInput as never,
    outputSchema: JoernEffectPureIndexLocalRecipeOutput as never,
    inputResources: [JoernEffectPureIndexLocalResource],
    outputResources: [JoernEffectPureIndexLocalResource],
  },
  handler: JoernEffectPureIndexLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPureIndexLocalRecipeId,
      toRecipeId: JoernEffectPureIndexLocalSourceSurfaceRecipeId,
      resource: JoernEffectPureIndexLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPureIndexLocalRecipes = [JoernEffectPureIndexLocalRecipe] as const
