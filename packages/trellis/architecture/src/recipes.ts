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

export const ArchitectureScriptPipelineInput = Schema.Struct({
  workspaceRoot: Schema.String,
  recipeId: Schema.String,
})
export type ArchitectureScriptPipelineInput = typeof ArchitectureScriptPipelineInput.Type

export const ArchitectureScriptPipelineOutput = Schema.Struct({
  scriptPath: Schema.String,
  validationTargets: Schema.Array(Schema.String),
})
export type ArchitectureScriptPipelineOutput = typeof ArchitectureScriptPipelineOutput.Type

export const AttuneArchitectureRecipes = [
  defineRecipe({
    id: "attune-architecture.workspace-policy",
    projectId: "attune-architecture",
    title: "Scan workspace architecture policy",
    inputSchema: ArchitecturePolicyScanInput,
    outputSchema: ArchitecturePolicyScanResult,
    nxTarget: "attune-architecture:test",
    sourcePath: "packages/trellis/architecture/src/recipes.ts",
    allowedFiles: ["packages/trellis/architecture/**"],
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
    sourcePath: "packages/trellis/architecture/src/recipes.ts",
    allowedFiles: ["packages/trellis/architecture/**", "project.json", "nx.json"],
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
    sourcePath: "packages/trellis/architecture/src/recipes.ts",
    allowedFiles: ["packages/trellis/architecture/**", "**/attune.artifact-ownership.json"],
    validationEvidence: ["attune-architecture:test", "workspace:framework-policy-check"],
  }),
  defineRecipe({
    id: "attune-architecture.tool-version-audit",
    projectId: "attune-architecture",
    title: "Audit pinned tool versions through the architecture script pipeline",
    inputSchema: ArchitectureScriptPipelineInput,
    outputSchema: ArchitectureScriptPipelineOutput,
    dependencies: [{ recipeId: "attune-architecture.workspace-policy" }],
    nxTarget: "workspace:tool-versions",
    sourcePath: "packages/trellis/architecture/src/recipes.ts",
    allowedFiles: ["packages/trellis/architecture/scripts/tool-versions.mjs", "flake.nix", "package.json"],
    validationEvidence: ["workspace:tool-versions"],
  }),
  defineRecipe({
    id: "attune-architecture.workspace-scan",
    projectId: "attune-architecture",
    title: "Run the workspace architecture scan script as a recipe-backed check",
    inputSchema: ArchitectureScriptPipelineInput,
    outputSchema: ArchitectureScriptPipelineOutput,
    dependencies: [{ recipeId: "attune-architecture.workspace-policy" }],
    nxTarget: "workspace:arch:scan",
    sourcePath: "packages/trellis/architecture/src/recipes.ts",
    allowedFiles: ["packages/trellis/architecture/scripts/scan.mjs", "packages/**", "project.json"],
    validationEvidence: ["workspace:arch:scan", "workspace:policy-fast"],
  }),
  defineRecipe({
    id: "attune-architecture.typescript-diagnostics",
    projectId: "attune-architecture",
    title: "Collect TypeScript extended diagnostics as recipe evidence",
    inputSchema: ArchitectureScriptPipelineInput,
    outputSchema: ArchitectureScriptPipelineOutput,
    dependencies: [{ recipeId: "attune-architecture.workspace-policy" }],
    nxTarget: "workspace:arch:types",
    sourcePath: "packages/trellis/architecture/src/recipes.ts",
    allowedFiles: ["packages/trellis/architecture/scripts/ts-extended-diagnostics.mjs", "packages/**", "tsconfig.base.json"],
    validationEvidence: ["workspace:arch:types", "workspace:policy-fast"],
  }),
  defineRecipe({
    id: "attune-architecture.churn-complexity",
    projectId: "attune-architecture",
    title: "Summarize churn and complexity pressure as recipe evidence",
    inputSchema: ArchitectureScriptPipelineInput,
    outputSchema: ArchitectureScriptPipelineOutput,
    dependencies: [{ recipeId: "attune-architecture.workspace-policy" }],
    nxTarget: "workspace:arch:churn",
    sourcePath: "packages/trellis/architecture/src/recipes.ts",
    allowedFiles: ["packages/trellis/architecture/scripts/churn-complexity.mjs", "packages/**"],
    validationEvidence: ["workspace:arch:churn", "workspace:policy-fast"],
  }),
  defineRecipe({
    id: "attune-architecture.pr-completion-audit",
    projectId: "attune-architecture",
    title: "Verify PR completion state through a recipe-backed Codex audit",
    inputSchema: ArchitectureScriptPipelineInput,
    outputSchema: ArchitectureScriptPipelineOutput,
    dependencies: [{ recipeId: "attune-architecture.workspace-policy" }],
    nxTarget: "workspace:policy-fast",
    sourcePath: "packages/trellis/architecture/src/recipes.ts",
    allowedFiles: ["packages/trellis/architecture/scripts/verify-pr-completion.mjs", "project.json"],
    validationEvidence: ["workspace:policy-fast"],
  }),
  defineRecipe({
    id: "attune-architecture.pr-recovery-audit",
    projectId: "attune-architecture",
    title: "Audit PR recovery signals through a recipe-backed Codex script",
    inputSchema: ArchitectureScriptPipelineInput,
    outputSchema: ArchitectureScriptPipelineOutput,
    dependencies: [{ recipeId: "attune-architecture.pr-completion-audit" }],
    nxTarget: "workspace:codex-audit-prs",
    sourcePath: "packages/trellis/architecture/src/recipes.ts",
    allowedFiles: ["packages/trellis/architecture/scripts/audit-pr-recovery.mjs", "project.json"],
    validationEvidence: ["workspace:codex-audit-prs"],
  }),
] as const
