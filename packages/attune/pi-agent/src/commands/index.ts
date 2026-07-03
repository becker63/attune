import {
  defineAlchemyResource,
  defineInvocationRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import { AttunePiEvidenceCommandRecipes } from "./attune-evidence.js"
import { AttunePiSpecCommandRecipes } from "./attune-spec.js"

export * from "./attune-spec.js"
export * from "./attune-evidence.js"

const commandSurfaceRecipeId = "attune-pi-agent.command-surface"
const implementationSpecRecipeId = "attune-pi-agent.implementation-spec"
const evidenceCommandRecipeId = "attune-pi-agent.attune-evidence-command"
const orientationCommandRecipeId = "attune-pi-agent.orientation-command"

export const attuneCommandNames = [
  "/attune-spec",
  "/attune-plan",
  "/attune-run",
  "/attune-falsify",
  "/attune-mutants",
  "/attune-properties",
  "/attune-evidence",
  "/attune-review",
  "/attune-status",
] as const

export type AttuneCommandName = (typeof attuneCommandNames)[number]

export const PiCommandSurface = Schema.Struct({
  commandName: Schema.String,
  recipeId: Schema.String,
  evidenceRequired: Schema.Boolean,
})
export type PiCommandSurface = typeof PiCommandSurface.Type

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiCommandCatalogResource = defineAlchemyResource({
  id: "attune-pi-agent.command-catalog.resource",
  kind: "workflow-target",
  alchemyType: "attune:resource:WorkflowTarget",
  programmaticResourceExport: "AttunePiCommandCatalogResource",
  ownerRecipeId: commandSurfaceRecipeId,
  consumedBy: [commandSurfaceRecipeId],
  producedBy: [commandSurfaceRecipeId],
  addressSchema: Schema.Struct({
    packageRoot: Schema.Literal("packages/attune/pi-agent"),
  }),
  stateSchema: Schema.Array(PiCommandSurface),
  modes: ["read", "invoke", "project"],
})

export const attuneCommandSurface = (): PiCommandSurface[] =>
  attuneCommandNames.map((commandName) => ({
    commandName,
    recipeId: commandName === "/attune-evidence"
      ? evidenceCommandRecipeId
      : commandName === "/attune-spec"
        ? implementationSpecRecipeId
        : orientationCommandRecipeId,
    evidenceRequired: true,
  }))

export const AttunePiCommandSurfaceRecipe = defineInvocationRecipe({
  id: "attune-pi-agent.command-surface",
  projectId: "attune-pi-agent",
  title: "Expose Pi commands as evidence-first recipe workflow surfaces",
  inputSchema: Schema.Struct({
    packageRoot: Schema.Literal("packages/attune/pi-agent"),
  }),
  outputSchema: Schema.Array(PiCommandSurface),
  nxTarget: "attune-pi-agent:test",
  entrypoints: [
    "packages/attune/pi-agent/src/commands/index.ts",
    "packages/attune/pi-agent/src/pi-extension.ts",
  ],
  allowedFiles: [
    "packages/attune/pi-agent/src/commands/**",
    "packages/attune/pi-agent/src/pi-extension.ts",
    "packages/attune/pi-agent/src/index.ts",
  ],
  validationEvidence: ["attune-pi-agent:test", "attune-pi-agent:typecheck"],
  io: {
    inputSchema: Schema.Struct({
      packageRoot: Schema.Literal("packages/attune/pi-agent"),
    }),
    outputSchema: Schema.Array(PiCommandSurface),
    inputResources: [AttunePiCommandCatalogResource],
    outputResources: [AttunePiCommandCatalogResource],
  },
  handler: defineRecipeHandler<
    { readonly packageRoot: "packages/attune/pi-agent" },
    PiCommandSurface[]
  >({
    id: "attune-pi-agent.command-surface.handler",
    recipeId: commandSurfaceRecipeId,
    sourcePath: "packages/attune/pi-agent/src/commands/index.ts",
    exportName: "attuneCommandSurface",
    emitsReceipts: ["attune-pi-agent.command-surface.projected"],
    handler: () => Effect.succeed(attuneCommandSurface()),
  }),
  alchemyDag: [
    {
      fromRecipeId: commandSurfaceRecipeId,
      toRecipeId: implementationSpecRecipeId,
      resource: AttunePiCommandCatalogResource,
      kind: "invokes",
      modes: ["invoke", "project"],
    },
    {
      fromRecipeId: commandSurfaceRecipeId,
      toRecipeId: evidenceCommandRecipeId,
      resource: AttunePiCommandCatalogResource,
      kind: "invokes",
      modes: ["invoke", "project"],
    },
    {
      fromRecipeId: commandSurfaceRecipeId,
      toRecipeId: orientationCommandRecipeId,
      resource: AttunePiCommandCatalogResource,
      kind: "invokes",
      modes: ["invoke", "project"],
    },
  ],
})

export const AttunePiCommandRecipes = [
  AttunePiCommandSurfaceRecipe,
  ...AttunePiSpecCommandRecipes,
  ...AttunePiEvidenceCommandRecipes,
] as const
