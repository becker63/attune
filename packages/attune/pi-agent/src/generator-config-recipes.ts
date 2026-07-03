import {
  defineAlchemyResource,
  defineConfigRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import {
  AttunePiGeneratorArtifactResource,
  PiGeneratorArtifact,
  piGeneratorArtifacts,
} from "./generators/renderers.js"

const generatorConfigRecipeId = "attune-pi-agent.generator-config"
const generatorArtifactsRecipeId = "attune-pi-agent.generator-artifacts"

export const AttunePiGeneratorConfigInput = Schema.Struct({
  configPath: Schema.Literal("packages/attune/pi-agent/generators.json"),
})

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiGeneratorConfigResource = defineAlchemyResource({
  id: "attune-pi-agent.generator-config.resource",
  kind: "configuration",
  alchemyType: "attune:resource:Configuration",
  ownerRecipeId: generatorConfigRecipeId,
  consumedBy: [generatorConfigRecipeId, generatorArtifactsRecipeId],
  producedBy: [generatorConfigRecipeId],
  addressSchema: AttunePiGeneratorConfigInput,
  stateSchema: Schema.Array(PiGeneratorArtifact),
  modes: ["read", "project"],
})

export const attunePiGeneratorConfigArtifacts = (): PiGeneratorArtifact[] =>
  piGeneratorArtifacts({ name: "attune-pi-agent" })

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiGeneratorConfigRecipe = defineConfigRecipe({
  id: "attune-pi-agent.generator-config",
  title: "Own Pi generator registry configuration",
  inputSchema: AttunePiGeneratorConfigInput,
  outputSchema: Schema.Array(PiGeneratorArtifact),
  nxTarget: "attune-pi-agent:test",
  allowedFiles: [
    "packages/attune/pi-agent/src/generator-config-recipes.ts",
    "packages/attune/pi-agent/generators.json",
  ],
  validationEvidence: ["attune-pi-agent:test", "attune-pi-agent:build"],
  io: {
    inputSchema: AttunePiGeneratorConfigInput,
    outputSchema: Schema.Array(PiGeneratorArtifact),
    inputResources: [AttunePiGeneratorConfigResource],
    outputResources: [AttunePiGeneratorArtifactResource],
  },
  handler: defineRecipeHandler<
    typeof AttunePiGeneratorConfigInput.Type,
    PiGeneratorArtifact[]
  >({
    id: "attune-pi-agent.generator-config.handler",
    recipeId: generatorConfigRecipeId,
    sourcePath: "packages/attune/pi-agent/src/generator-config-recipes.ts",
    exportName: "attunePiGeneratorConfigArtifacts",
    emitsReceipts: ["attune-pi-agent.generator-config.projected"],
    handler: () => Effect.succeed(attunePiGeneratorConfigArtifacts()),
  }),
  alchemyDag: [{
    fromRecipeId: generatorConfigRecipeId,
    toRecipeId: generatorArtifactsRecipeId,
    resource: AttunePiGeneratorConfigResource,
    kind: "projects",
    modes: ["read", "project"],
  }],
})

export const AttunePiGeneratorConfigRecipes = [
  AttunePiGeneratorConfigRecipe,
] as const
