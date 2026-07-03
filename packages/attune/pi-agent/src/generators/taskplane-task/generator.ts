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
  renderTaskplaneTaskArtifact,
} from "../renderers.js"

const taskplaneTaskGeneratorRecipeId = "attune-pi-agent.taskplane-task-generator"

export interface TaskplaneTaskGeneratorSchema {
  readonly name: string
  readonly directory?: string
}

export default function taskplaneTaskGenerator(
  tree: GeneratorTree,
  schema: TaskplaneTaskGeneratorSchema,
): GeneratorTask {
  const names = toNames(schema.name)
  const directory = schema.directory ?? "taskplane/pi-agent"

  writeTextIfChanged(
    tree,
    joinPath(directory, `${names.fileName}.taskplane-task.json`),
    renderTaskplaneTaskArtifact(schema.name),
  )
}

export const taskplaneTaskGeneratorArtifact = (
  schema: TaskplaneTaskGeneratorSchema,
): PiGeneratorArtifact => {
  const names = toNames(schema.name)
  const directory = schema.directory ?? "taskplane/pi-agent"

  return {
    generatorName: "taskplane-task",
    outputPath: joinPath(directory, `${names.fileName}.taskplane-task.json`),
    deterministic: true,
    reviewRequired: true,
  }
}

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiTaskplaneTaskGeneratorRecipe = defineProjectionRecipe({
  id: "attune-pi-agent.taskplane-task-generator",
  title: "Project deterministic Pi Taskplane task generator output",
  inputSchema: NamedGeneratorInputSchema,
  outputSchema: PiGeneratorArtifact,
  nxTarget: "attune-pi-agent:test",
  allowedFiles: [
    "packages/attune/pi-agent/src/generators/taskplane-task/generator.ts",
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
    id: "attune-pi-agent.taskplane-task-generator.handler",
    recipeId: taskplaneTaskGeneratorRecipeId,
    sourcePath: "packages/attune/pi-agent/src/generators/taskplane-task/generator.ts",
    exportName: "taskplaneTaskGeneratorArtifact",
    emitsReceipts: ["attune-pi-agent.taskplane-task-generator.projected"],
    handler: (input) => Effect.succeed(taskplaneTaskGeneratorArtifact(namedGeneratorInputFromSchema(input))),
  }),
})

export const AttunePiTaskplaneTaskGeneratorRecipes = [
  AttunePiTaskplaneTaskGeneratorRecipe,
] as const
