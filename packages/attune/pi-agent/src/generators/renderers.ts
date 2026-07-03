import {
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import { defaultAttunePiPermissionProfile } from "../permissions/default-profile.js"
import type { PermissionProfile } from "../schema/permission-profile.js"
import { toNames } from "./internal/names.js"

const generatorArtifactsRecipeId = "attune-pi-agent.generator-artifacts"
const specGeneratorRecipeId = "attune-pi-agent.spec-generator"
const permissionPolicyGeneratorRecipeId = "attune-pi-agent.permission-policy-generator"
const testObligationGeneratorRecipeId = "attune-pi-agent.test-obligation-generator"
const taskplaneTaskGeneratorRecipeId = "attune-pi-agent.taskplane-task-generator"

export interface NamedGeneratorInput {
  readonly name: string
  readonly directory?: string
}

export const NamedGeneratorInputSchema = Schema.Struct({
  name: Schema.String,
  directory: Schema.optional(Schema.String),
})

export const namedGeneratorInputFromSchema = (
  input: typeof NamedGeneratorInputSchema.Type,
): NamedGeneratorInput => ({
  name: input.name,
  ...(input.directory === undefined ? {} : { directory: input.directory }),
})

export const PiGeneratorArtifact = Schema.Struct({
  generatorName: Schema.String,
  outputPath: Schema.String,
  deterministic: Schema.Boolean,
  reviewRequired: Schema.Boolean,
})
export type PiGeneratorArtifact = typeof PiGeneratorArtifact.Type

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiGeneratorInputResource = defineAlchemyResource({
  id: "attune-pi-agent.generator-input.resource",
  kind: "schema",
  alchemyType: "attune:resource:Schema",
  ownerRecipeId: generatorArtifactsRecipeId,
  consumedBy: [
    generatorArtifactsRecipeId,
    specGeneratorRecipeId,
    permissionPolicyGeneratorRecipeId,
    testObligationGeneratorRecipeId,
    taskplaneTaskGeneratorRecipeId,
  ],
  addressFields: ["name", "directory"],
  addressSchema: NamedGeneratorInputSchema,
  stateSchema: NamedGeneratorInputSchema,
  modes: ["read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiGeneratorArtifactResource = defineAlchemyResource({
  id: "attune-pi-agent.generator-artifact.resource",
  kind: "generated-directory",
  alchemyType: "attune:resource:GeneratedDirectory",
  programmaticResourceExport: "AttunePiGeneratorArtifactResource",
  ownerRecipeId: generatorArtifactsRecipeId,
  producedBy: [
    generatorArtifactsRecipeId,
    specGeneratorRecipeId,
    permissionPolicyGeneratorRecipeId,
    testObligationGeneratorRecipeId,
    taskplaneTaskGeneratorRecipeId,
  ],
  addressFields: ["outputPath"],
  addressSchema: Schema.Struct({
    outputPath: Schema.String,
  }),
  stateSchema: Schema.Array(PiGeneratorArtifact),
  modes: ["project", "write", "observe"],
})

export const stableJson = (value: unknown): string =>
  `${JSON.stringify(sortJson(value), null, 2)}\n`

export const renderImplementationSpecDraft = (name: string): string => {
  const names = toNames(name)

  return stableJson({
    id: names.fileName,
    title: `${names.title} Implementation Spec`,
    intent: "Describe the bounded implementation objective.",
    scope: ["Define the subsystem slice this run may change."],
    nonGoals: ["Do not deploy, merge, or touch secrets."],
    affectedPackages: [],
    boundaries: [
      {
        id: "repo-local",
        description: "Operate inside the Attune repository unless explicitly permitted.",
      },
    ],
    tasks: [],
    testObligations: [],
    propertyObligations: [],
    mutationObligations: [],
    snapshotObligations: [],
    validationCommands: [],
    reviewGates: [
      {
        id: "human-pr-review",
        description: "Human review is required before merge.",
        requiredBefore: "merge",
      },
    ],
    forbiddenActions: [
      {
        id: "no-secrets",
        action: "mutate .env*, *.env, *.env.*, or ~/.ssh/*",
        reason: "The Pi agent must not mutate secrets-adjacent material.",
      },
    ],
    permissionProfile: defaultAttunePiPermissionProfile,
    artifactPolicy: {
      root: `.attune-runs/${names.fileName}`,
      ignoredByGit: true,
      promoteSelectedArtifactsOnly: true,
      requiredFiles: [
        "spec.json",
        "plan.md",
        "events.jsonl",
        "evidence-matrix.md",
        "summary.md",
      ],
    },
  })
}

export const renderPermissionPolicyArtifact = (
  name: string,
  profile: PermissionProfile = defaultAttunePiPermissionProfile,
): string => {
  const names = toNames(name)

  return stableJson({
    id: names.fileName,
    generatedBy: "@attune/pi-agent:permission-policy",
    profile,
  })
}

export const renderTestObligationArtifact = (name: string): string => {
  const names = toNames(name)

  return stableJson({
    id: names.fileName,
    claim: `${names.title} behavior is covered by deterministic tests.`,
    kind: "unit",
    target: "packages/<package>",
    commands: ["NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec nx run <project>:test"],
    requiredEvidence: ["passing test output"],
    failureClassification: "implementation-bug",
  })
}

export const renderTaskplaneTaskArtifact = (name: string): string => {
  const names = toNames(name)

  return stableJson({
    id: names.fileName,
    generatedBy: "@attune/pi-agent:taskplane-task",
    adapter: "taskplane",
    status: "future-adapter-placeholder",
    title: names.title,
    boundaries: ["repo-local", "no-secrets", "no-deploy"],
  })
}

const sortJson = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortJson)
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortJson(nested)]),
    )
  }

  return value
}

export const piGeneratorArtifacts = (
  input: NamedGeneratorInput,
): PiGeneratorArtifact[] => {
  const names = toNames(input.name)

  return [
    {
      generatorName: "spec",
      outputPath: `${input.directory ?? "specs/pi-agent"}/${names.fileName}.implementation-spec.json`,
      deterministic: true,
      reviewRequired: true,
    },
    {
      generatorName: "permission-policy",
      outputPath: `${input.directory ?? "policies/pi-agent"}/${names.fileName}.pi-policy.json`,
      deterministic: true,
      reviewRequired: true,
    },
    {
      generatorName: "test-obligation",
      outputPath: `${input.directory ?? "obligations/pi-agent"}/${names.fileName}.test-obligation.json`,
      deterministic: true,
      reviewRequired: false,
    },
    {
      generatorName: "taskplane-task",
      outputPath: `${input.directory ?? "taskplane/pi-agent"}/${names.fileName}.taskplane-task.json`,
      deterministic: true,
      reviewRequired: true,
    },
  ]
}

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiGeneratorArtifactsRecipe = defineProjectionRecipe({
  id: "attune-pi-agent.generator-artifacts",
  title: "Generate deterministic Pi spec, permission, obligation, and task artifact plans",
  inputSchema: NamedGeneratorInputSchema,
  outputSchema: Schema.Array(PiGeneratorArtifact),
  nxTarget: "attune-pi-agent:test",
  allowedFiles: [
    "packages/attune/pi-agent/src/generators/**",
    "packages/attune/pi-agent/generators.json",
  ],
  validationEvidence: ["attune-pi-agent:test", "attune-pi-agent:build"],
  io: {
    inputSchema: NamedGeneratorInputSchema,
    outputSchema: Schema.Array(PiGeneratorArtifact),
    inputResources: [AttunePiGeneratorInputResource],
    outputResources: [AttunePiGeneratorArtifactResource],
  },
  handler: defineRecipeHandler<
    typeof NamedGeneratorInputSchema.Type,
    PiGeneratorArtifact[]
  >({
    id: "attune-pi-agent.generator-artifacts.handler",
    recipeId: generatorArtifactsRecipeId,
    sourcePath: "packages/attune/pi-agent/src/generators/renderers.ts",
    exportName: "piGeneratorArtifacts",
    emitsReceipts: ["attune-pi-agent.generator-artifacts.projected"],
    handler: (input) => Effect.succeed(piGeneratorArtifacts(namedGeneratorInputFromSchema(input))),
  }),
  alchemyDag: [
    {
      fromRecipeId: generatorArtifactsRecipeId,
      toRecipeId: specGeneratorRecipeId,
      resource: AttunePiGeneratorArtifactResource,
      kind: "projects",
      modes: ["project", "write"],
    },
    {
      fromRecipeId: generatorArtifactsRecipeId,
      toRecipeId: permissionPolicyGeneratorRecipeId,
      resource: AttunePiGeneratorArtifactResource,
      kind: "projects",
      modes: ["project", "write"],
    },
    {
      fromRecipeId: generatorArtifactsRecipeId,
      toRecipeId: testObligationGeneratorRecipeId,
      resource: AttunePiGeneratorArtifactResource,
      kind: "projects",
      modes: ["project", "write"],
    },
    {
      fromRecipeId: generatorArtifactsRecipeId,
      toRecipeId: taskplaneTaskGeneratorRecipeId,
      resource: AttunePiGeneratorArtifactResource,
      kind: "projects",
      modes: ["project", "write"],
    },
  ],
})

export const AttunePiGeneratorRendererRecipes = [
  AttunePiGeneratorArtifactsRecipe,
] as const
