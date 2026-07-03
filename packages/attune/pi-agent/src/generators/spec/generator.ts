import {
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect } from "effect"

import { toNames } from "../internal/names.js"
import { joinPath, type GeneratorTask, type GeneratorTree, writeTextIfChanged } from "../internal/tree.js"
import {
  AttunePiGeneratorArtifactResource,
  AttunePiGeneratorInputResource,
  NamedGeneratorInputSchema,
  PiGeneratorArtifact,
  namedGeneratorInputFromSchema,
  renderImplementationSpecDraft,
} from "../renderers.js"

const specGeneratorRecipeId = "attune-pi-agent.spec-generator"

export interface SpecGeneratorSchema {
  readonly name: string
  readonly directory?: string
}

export default function specGenerator(
  tree: GeneratorTree,
  schema: SpecGeneratorSchema,
): GeneratorTask {
  const names = toNames(schema.name)
  const directory = schema.directory ?? "specs/pi-agent"

  writeTextIfChanged(
    tree,
    joinPath(directory, `${names.fileName}.implementation-spec.json`),
    renderImplementationSpecDraft(schema.name),
  )
}

export const specGeneratorArtifact = (
  schema: SpecGeneratorSchema,
): PiGeneratorArtifact => {
  const names = toNames(schema.name)
  const directory = schema.directory ?? "specs/pi-agent"

  return {
    generatorName: "spec",
    outputPath: joinPath(directory, `${names.fileName}.implementation-spec.json`),
    deterministic: true,
    reviewRequired: true,
  }
}

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiSpecGeneratorRecipe = defineProjectionRecipe({
  id: "attune-pi-agent.spec-generator",
  title: "Project deterministic Pi implementation spec generator output",
  inputSchema: NamedGeneratorInputSchema,
  outputSchema: PiGeneratorArtifact,
  nxTarget: "attune-pi-agent:test",
  allowedFiles: [
    "packages/attune/pi-agent/src/generators/spec/generator.ts",
    "packages/attune/pi-agent/src/generators/renderers.ts",
  ],
  validationEvidence: ["attune-pi-agent:test", "attune-pi-agent:build"],
  io: {
    inputSchema: NamedGeneratorInputSchema,
    outputSchema: PiGeneratorArtifact,
    inputResources: [AttunePiGeneratorInputResource],
    outputResources: [AttunePiGeneratorArtifactResource],
  },
  handler: defineRecipeHandler<typeof NamedGeneratorInputSchema.Type, PiGeneratorArtifact>({
    id: "attune-pi-agent.spec-generator.handler",
    recipeId: specGeneratorRecipeId,
    sourcePath: "packages/attune/pi-agent/src/generators/spec/generator.ts",
    exportName: "specGeneratorArtifact",
    emitsReceipts: ["attune-pi-agent.spec-generator.projected"],
    handler: (input) => Effect.succeed(specGeneratorArtifact(namedGeneratorInputFromSchema(input))),
  }),
})

export const AttunePiSpecGeneratorRecipes = [
  AttunePiSpecGeneratorRecipe,
] as const
