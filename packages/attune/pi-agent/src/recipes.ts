import { RecipeReceiptSchema, defineRecipe } from "@attune/framework-protocol"
import { Schema as S } from "effect"

import {
  EvidenceMatrix,
  ImplementationSpec,
  PermissionCheck,
  PermissionProfile,
} from "./schema/index.js"

export const PiGeneratorArtifact = S.Struct({
  generatorName: S.String,
  outputPath: S.String,
  deterministic: S.Boolean,
  reviewRequired: S.Boolean,
})
export type PiGeneratorArtifact = typeof PiGeneratorArtifact.Type

export const PiCommandSurface = S.Struct({
  commandName: S.String,
  recipeId: S.String,
  evidenceRequired: S.Boolean,
})
export type PiCommandSurface = typeof PiCommandSurface.Type

export const AttunePiAgentRecipes = [
  defineRecipe({
    id: "attune-pi-agent.implementation-spec",
    projectId: "attune-pi-agent",
    title: "Decode Pi implementation specs into bounded recipe inputs",
    inputSchema: ImplementationSpec,
    outputSchema: ImplementationSpec,
    nxTarget: "attune-pi-agent:test",
    sourcePath: "packages/attune/pi-agent/src/recipes.ts",
    allowedFiles: ["packages/attune/pi-agent/src/schema/**", "packages/attune/pi-agent/src/pi/**"],
    validationEvidence: ["attune-pi-agent:test", "attune-pi-agent:typecheck"],
  }),
  defineRecipe({
    id: "attune-pi-agent.permission-profile",
    projectId: "attune-pi-agent",
    title: "Classify Pi permission decisions before command execution",
    inputSchema: PermissionProfile,
    outputSchema: PermissionCheck,
    dependencies: [{ recipeId: "attune-pi-agent.implementation-spec" }],
    nxTarget: "attune-pi-agent:test",
    sourcePath: "packages/attune/pi-agent/src/recipes.ts",
    allowedFiles: ["packages/attune/pi-agent/src/permissions/**", "packages/attune/pi-agent/src/schema/**"],
    validationEvidence: ["attune-pi-agent:test", "attune-pi-agent:proof"],
  }),
  defineRecipe({
    id: "attune-pi-agent.evidence-matrix",
    projectId: "attune-pi-agent",
    title: "Render evidence matrices from recipe receipts and Pi claims",
    inputSchema: EvidenceMatrix,
    outputSchema: S.Struct({
      receipt: RecipeReceiptSchema,
      matrix: EvidenceMatrix,
    }),
    dependencies: [{ recipeId: "attune-pi-agent.implementation-spec" }],
    nxTarget: "attune-pi-agent:test",
    sourcePath: "packages/attune/pi-agent/src/recipes.ts",
    allowedFiles: ["packages/attune/pi-agent/src/artifacts/**", "packages/attune/pi-agent/src/schema/**"],
    validationEvidence: ["attune-pi-agent:test"],
  }),
  defineRecipe({
    id: "attune-pi-agent.generator-artifacts",
    projectId: "attune-pi-agent",
    title: "Generate deterministic Pi spec, permission, obligation, and task artifacts",
    inputSchema: S.Array(PiGeneratorArtifact),
    outputSchema: S.Array(PiGeneratorArtifact),
    dependencies: [{ recipeId: "attune-pi-agent.evidence-matrix" }],
    nxTarget: "attune-pi-agent:test",
    sourcePath: "packages/attune/pi-agent/src/recipes.ts",
    allowedFiles: ["packages/attune/pi-agent/src/generators/**", "packages/attune/pi-agent/generators.json"],
    validationEvidence: ["attune-pi-agent:test", "attune-pi-agent:build"],
  }),
  defineRecipe({
    id: "attune-pi-agent.command-surface",
    projectId: "attune-pi-agent",
    title: "Expose Pi commands as evidence-first recipe workflow surfaces",
    inputSchema: S.Array(PiCommandSurface),
    outputSchema: S.Array(PiCommandSurface),
    dependencies: [
      { recipeId: "attune-pi-agent.permission-profile" },
      { recipeId: "attune-pi-agent.generator-artifacts" },
    ],
    nxTarget: "attune-pi-agent:test",
    sourcePath: "packages/attune/pi-agent/src/recipes.ts",
    allowedFiles: ["packages/attune/pi-agent/src/commands/**", "packages/attune/pi-agent/src/index.ts"],
    validationEvidence: ["attune-pi-agent:test", "attune-pi-agent:typecheck"],
  }),
] as const
