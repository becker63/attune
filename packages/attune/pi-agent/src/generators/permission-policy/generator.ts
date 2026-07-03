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
  renderPermissionPolicyArtifact,
} from "../renderers.js"

const permissionPolicyGeneratorRecipeId = "attune-pi-agent.permission-policy-generator"

export interface PermissionPolicyGeneratorSchema {
  readonly name: string
  readonly directory?: string
}

export default function permissionPolicyGenerator(
  tree: GeneratorTree,
  schema: PermissionPolicyGeneratorSchema,
): GeneratorTask {
  const names = toNames(schema.name)
  const directory = schema.directory ?? "policies/pi-agent"

  writeTextIfChanged(
    tree,
    joinPath(directory, `${names.fileName}.pi-policy.json`),
    renderPermissionPolicyArtifact(schema.name),
  )
}

export const permissionPolicyGeneratorArtifact = (
  schema: PermissionPolicyGeneratorSchema,
): PiGeneratorArtifact => {
  const names = toNames(schema.name)
  const directory = schema.directory ?? "policies/pi-agent"

  return {
    generatorName: "permission-policy",
    outputPath: joinPath(directory, `${names.fileName}.pi-policy.json`),
    deterministic: true,
    reviewRequired: true,
  }
}

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiPermissionPolicyGeneratorRecipe = defineProjectionRecipe({
  id: "attune-pi-agent.permission-policy-generator",
  title: "Project deterministic Pi permission policy generator output",
  inputSchema: NamedGeneratorInputSchema,
  outputSchema: PiGeneratorArtifact,
  nxTarget: "attune-pi-agent:test",
  allowedFiles: [
    "packages/attune/pi-agent/src/generators/permission-policy/generator.ts",
    "packages/attune/pi-agent/src/generators/renderers.ts",
    "packages/attune/pi-agent/src/permissions/default-profile.ts",
  ],
  validationEvidence: ["attune-pi-agent:test", "attune-pi-agent:build"],
  io: {
    inputSchema: NamedGeneratorInputSchema,
    outputSchema: PiGeneratorArtifact,
    inputResources: [AttunePiGeneratorInputResource],
    outputResources: [AttunePiGeneratorArtifactResource],
  },
  handler: defineRecipeHandler<typeof NamedGeneratorInputSchema.Type, PiGeneratorArtifact>({
    id: "attune-pi-agent.permission-policy-generator.handler",
    recipeId: permissionPolicyGeneratorRecipeId,
    sourcePath: "packages/attune/pi-agent/src/generators/permission-policy/generator.ts",
    exportName: "permissionPolicyGeneratorArtifact",
    emitsReceipts: ["attune-pi-agent.permission-policy-generator.projected"],
    handler: (input) => Effect.succeed(permissionPolicyGeneratorArtifact(namedGeneratorInputFromSchema(input))),
  }),
})

export const AttunePiPermissionPolicyGeneratorRecipes = [
  AttunePiPermissionPolicyGeneratorRecipe,
] as const
