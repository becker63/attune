import { defineRecipe } from "@attune/framework-protocol"
import { Schema } from "effect"

export const ArchitecturePolicyScanInput = Schema.Struct({
  workspaceRoot: Schema.String,
  policyManifestPath: Schema.optional(Schema.String),
})
export type ArchitecturePolicyScanInput = typeof ArchitecturePolicyScanInput.Type

export const ArchitecturePolicyDiagnostic = Schema.Struct({
  ruleId: Schema.String,
  severity: Schema.Literals(["error", "warning"] as const),
  filePath: Schema.String,
  message: Schema.String,
})
export type ArchitecturePolicyDiagnostic = typeof ArchitecturePolicyDiagnostic.Type

export const ArchitecturePolicyScanResult = Schema.Struct({
  diagnostics: Schema.Array(ArchitecturePolicyDiagnostic),
  exitCode: Schema.Number,
})
export type ArchitecturePolicyScanResult = typeof ArchitecturePolicyScanResult.Type

export const ArchitectureConformanceInput = Schema.Struct({
  projectId: Schema.String,
  sourceRoot: Schema.String,
})
export type ArchitectureConformanceInput = typeof ArchitectureConformanceInput.Type

export const ArchitectureConformanceResult = Schema.Struct({
  ok: Schema.Boolean,
  findings: Schema.Array(ArchitecturePolicyDiagnostic),
})
export type ArchitectureConformanceResult = typeof ArchitectureConformanceResult.Type

export const AttuneArchitectureRecipes = [
  defineRecipe({
    id: "attune-architecture.workspace-policy",
    projectId: "attune-architecture",
    title: "Scan workspace architecture policy",
    inputSchema: ArchitecturePolicyScanInput,
    outputSchema: ArchitecturePolicyScanResult,
    nxTarget: "attune-architecture:test",
    sourcePath: "framework/architecture/src/recipes.ts",
    allowedFiles: ["framework/architecture/**"],
    validationEvidence: ["attune-architecture:test"],
  }),
  defineRecipe({
    id: "attune-architecture.command-surface-conformance",
    projectId: "attune-architecture",
    title: "Validate public command surface conformance",
    inputSchema: ArchitectureConformanceInput,
    outputSchema: ArchitectureConformanceResult,
    dependencies: [{ recipeId: "attune-architecture.workspace-policy" }],
    nxTarget: "attune-architecture:test",
    sourcePath: "framework/architecture/src/recipes.ts",
    allowedFiles: ["framework/architecture/**", "project.json", "nx.json"],
    validationEvidence: ["attune-architecture:test", "workspace:policy-fast"],
  }),
  defineRecipe({
    id: "attune-architecture.artifact-ownership-quarantine",
    projectId: "attune-architecture",
    title: "Report legacy artifact ownership as quarantine evidence",
    inputSchema: ArchitecturePolicyScanInput,
    outputSchema: ArchitecturePolicyScanResult,
    dependencies: [{ recipeId: "attune-architecture.workspace-policy" }],
    nxTarget: "attune-architecture:test",
    sourcePath: "framework/architecture/src/recipes.ts",
    allowedFiles: ["framework/architecture/**", "**/attune.artifact-ownership.json"],
    validationEvidence: ["attune-architecture:test", "workspace:framework-policy-check"],
  }),
] as const
