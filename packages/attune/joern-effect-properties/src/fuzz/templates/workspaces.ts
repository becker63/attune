import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
import { defaultFuzzResources } from "../config/resources.js"

export type WorkspaceTemplate = Readonly<{
  readonly id: string
  readonly tags: readonly string[]
  readonly tmpfsSize: string
  readonly title: string
}>

const workspaceTags = (values: readonly string[]): readonly string[] => values

export const workspaceTemplates: readonly WorkspaceTemplate[] = [
  {
    id: "nix2container-arion-dev-shm",
    tags: workspaceTags(["nix", "arion", "oci", "tmpfs"]),
    tmpfsSize: defaultFuzzResources.tmpfsSize,
    title: "Arion/nix2container memory-backed property workspace",
  },
]

const JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeId = "joern-effect-properties.fuzz.templates.workspaces" as const
const JoernEffectPropertiesFuzzTemplatesWorkspacesLocalResourceId = "joern-effect-properties.fuzz.templates.workspaces.resource" as const
const JoernEffectPropertiesFuzzTemplatesWorkspacesLocalHandlerId = "joern-effect-properties.fuzz.templates.workspaces.handler" as const
const JoernEffectPropertiesFuzzTemplatesWorkspacesLocalSourcePath = "packages/attune/joern-effect-properties/src/fuzz/templates/workspaces.ts" as const
const JoernEffectPropertiesFuzzTemplatesWorkspacesLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesFuzzTemplatesWorkspacesLocalSourcePath),
})
export type JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeInput = typeof JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeInput.Type

export const JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesFuzzTemplatesWorkspacesLocalSourcePath),
})
export type JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeOutput = typeof JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesFuzzTemplatesWorkspacesLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesFuzzTemplatesWorkspacesLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeId,
  producedBy: [JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeId],
  consumedBy: [JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeId, JoernEffectPropertiesFuzzTemplatesWorkspacesLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesFuzzTemplatesWorkspacesLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeInput,
  JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeOutput
>({
  id: JoernEffectPropertiesFuzzTemplatesWorkspacesLocalHandlerId,
  recipeId: JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeId,
  sourcePath: JoernEffectPropertiesFuzzTemplatesWorkspacesLocalSourcePath,
  exportName: "JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipes",
  emitsReceipts: ["joern-effect-properties.fuzz.templates.workspaces.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/fuzz/templates/workspaces.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesFuzzTemplatesWorkspacesLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesFuzzTemplatesWorkspacesLocalResource],
    outputResources: [JoernEffectPropertiesFuzzTemplatesWorkspacesLocalResource],
  },
  handler: JoernEffectPropertiesFuzzTemplatesWorkspacesLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipeId,
      toRecipeId: JoernEffectPropertiesFuzzTemplatesWorkspacesLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesFuzzTemplatesWorkspacesLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipes = [JoernEffectPropertiesFuzzTemplatesWorkspacesLocalRecipe] as const
