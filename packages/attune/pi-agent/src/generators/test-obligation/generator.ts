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
  renderTestObligationArtifact,
} from "../renderers.js"

const testObligationGeneratorRecipeId = "attune-pi-agent.test-obligation-generator"

export interface TestObligationGeneratorSchema {
  readonly name: string
  readonly directory?: string
}

export default function testObligationGenerator(
  tree: GeneratorTree,
  schema: TestObligationGeneratorSchema,
): GeneratorTask {
  const names = toNames(schema.name)
  const directory = schema.directory ?? "obligations/pi-agent"

  writeTextIfChanged(
    tree,
    joinPath(directory, `${names.fileName}.test-obligation.json`),
    renderTestObligationArtifact(schema.name),
  )
}

export const testObligationGeneratorArtifact = (
  schema: TestObligationGeneratorSchema,
): PiGeneratorArtifact => {
  const names = toNames(schema.name)
  const directory = schema.directory ?? "obligations/pi-agent"

  return {
    generatorName: "test-obligation",
    outputPath: joinPath(directory, `${names.fileName}.test-obligation.json`),
    deterministic: true,
    reviewRequired: false,
  }
}

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiTestObligationGeneratorRecipe = defineProjectionRecipe({
  id: "attune-pi-agent.test-obligation-generator",
  title: "Project deterministic Pi test-obligation generator output",
  inputSchema: NamedGeneratorInputSchema,
  outputSchema: PiGeneratorArtifact,
  nxTarget: "attune-pi-agent:test",
  allowedFiles: [
    "packages/attune/pi-agent/src/generators/test-obligation/generator.ts",
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
    id: "attune-pi-agent.test-obligation-generator.handler",
    recipeId: testObligationGeneratorRecipeId,
    sourcePath: "packages/attune/pi-agent/src/generators/test-obligation/generator.ts",
    exportName: "testObligationGeneratorArtifact",
    emitsReceipts: ["attune-pi-agent.test-obligation-generator.projected"],
    handler: (input) => Effect.succeed(testObligationGeneratorArtifact(namedGeneratorInputFromSchema(input))),
  }),
})

export const AttunePiTestObligationGeneratorRecipes = [
  AttunePiTestObligationGeneratorRecipe,
] as const
