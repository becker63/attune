import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Context, Effect, Schema } from "effect"

export type CpgProgramBuilderService = {
  readonly state: unknown
  readonly bindTraversal: (name: string, traversal: unknown) => unknown
  readonly bindFlow: (name: string, flow: unknown) => unknown
  readonly bindMaterializedGraph: (name: string, materialization: unknown) => unknown
  readonly bindGraphPath: (name: string, path: unknown) => unknown
  readonly bindGraphFact: (name: string, fact: unknown) => unknown
  readonly rows: (traversal: unknown, selection: unknown) => unknown
}

export class CpgProgramBuilder extends Context.Tag(
  "joern-effect/CpgProgramBuilder",
)<CpgProgramBuilder, CpgProgramBuilderService>() {}

const JoernEffectPureProgramCpgProgramBuilderLocalRecipeId = "joern-effect.pure.program.cpg-program-builder" as const
const JoernEffectPureProgramCpgProgramBuilderLocalResourceId = "joern-effect.pure.program.cpg-program-builder.resource" as const
const JoernEffectPureProgramCpgProgramBuilderLocalHandlerId = "joern-effect.pure.program.cpg-program-builder.handler" as const
const JoernEffectPureProgramCpgProgramBuilderLocalSourcePath = "packages/attune/joern-effect/src/pure/program/CpgProgramBuilder.ts" as const
const JoernEffectPureProgramCpgProgramBuilderLocalSourceSurfaceRecipeId = "joern-effect.source-surface" as const

export const JoernEffectPureProgramCpgProgramBuilderLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPureProgramCpgProgramBuilderLocalSourcePath),
})
export type JoernEffectPureProgramCpgProgramBuilderLocalRecipeInput = typeof JoernEffectPureProgramCpgProgramBuilderLocalRecipeInput.Type

export const JoernEffectPureProgramCpgProgramBuilderLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPureProgramCpgProgramBuilderLocalSourcePath),
})
export type JoernEffectPureProgramCpgProgramBuilderLocalRecipeOutput = typeof JoernEffectPureProgramCpgProgramBuilderLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPureProgramCpgProgramBuilderLocalResource = defineAlchemyResource({
  id: JoernEffectPureProgramCpgProgramBuilderLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPureProgramCpgProgramBuilderLocalRecipeId,
  producedBy: [JoernEffectPureProgramCpgProgramBuilderLocalRecipeId],
  consumedBy: [JoernEffectPureProgramCpgProgramBuilderLocalRecipeId, JoernEffectPureProgramCpgProgramBuilderLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPureProgramCpgProgramBuilderLocalRecipeInput as never,
  stateSchema: JoernEffectPureProgramCpgProgramBuilderLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPureProgramCpgProgramBuilderLocalHandler = defineRecipeHandler<
  JoernEffectPureProgramCpgProgramBuilderLocalRecipeInput,
  JoernEffectPureProgramCpgProgramBuilderLocalRecipeOutput
>({
  id: JoernEffectPureProgramCpgProgramBuilderLocalHandlerId,
  recipeId: JoernEffectPureProgramCpgProgramBuilderLocalRecipeId,
  sourcePath: JoernEffectPureProgramCpgProgramBuilderLocalSourcePath,
  exportName: "JoernEffectPureProgramCpgProgramBuilderLocalRecipes",
  emitsReceipts: ["joern-effect.pure.program.cpg-program-builder.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPureProgramCpgProgramBuilderLocalRecipe = defineRecipe({
  id: JoernEffectPureProgramCpgProgramBuilderLocalRecipeId,
  projectId: "joern-effect",
  title: "Express src/pure/program/CpgProgramBuilder.ts as a file-local recipe",
  inputSchema: JoernEffectPureProgramCpgProgramBuilderLocalRecipeInput as never,
  outputSchema: JoernEffectPureProgramCpgProgramBuilderLocalRecipeOutput as never,
  nxTarget: "joern-effect:typecheck",
  allowedFiles: [JoernEffectPureProgramCpgProgramBuilderLocalSourcePath],
  validationEvidence: ["joern-effect:typecheck"],
  io: {
    inputSchema: JoernEffectPureProgramCpgProgramBuilderLocalRecipeInput as never,
    outputSchema: JoernEffectPureProgramCpgProgramBuilderLocalRecipeOutput as never,
    inputResources: [JoernEffectPureProgramCpgProgramBuilderLocalResource],
    outputResources: [JoernEffectPureProgramCpgProgramBuilderLocalResource],
  },
  handler: JoernEffectPureProgramCpgProgramBuilderLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPureProgramCpgProgramBuilderLocalRecipeId,
      toRecipeId: JoernEffectPureProgramCpgProgramBuilderLocalSourceSurfaceRecipeId,
      resource: JoernEffectPureProgramCpgProgramBuilderLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPureProgramCpgProgramBuilderLocalRecipes = [JoernEffectPureProgramCpgProgramBuilderLocalRecipe] as const
