import { defineRecipePackage } from "@attune/framework-protocol"

import { ArchitectureCliRecipes } from "./cli.js"
import { ArchitectureCommandSurfaceConformanceRecipes } from "./command-surface-conformance.js"
import { ArchitectureAtomImplementationPolicyRecipes } from "./framework-atom-implementation-policy.js"
import { ArchitectureFrameworkImportBoundaryRecipes } from "./framework-import-boundary.js"
import { ArchitectureNoReportPolicyRecipes } from "./framework-no-report-policy.js"
import { ArchitectureFrameworkPolicyRecipes } from "./framework-policy-cli.js"
import { ArchitectureRecipeRepairRecipes } from "./recipe-repair-cli.js"
import { ArchitectureChurnComplexityRecipes } from "./internal/checks/ChurnComplexityCli.js"
import { ArchitecturePacketizedJudgeRecipes } from "./internal/checks/PacketizedArchitectureJudgeCli.js"
import { ArchitecturePrCompletionAuditRecipes } from "./internal/checks/PrCompletionAuditCli.js"
import { ArchitecturePrRecoveryAuditRecipes } from "./internal/checks/PrRecoveryAuditCli.js"
import { ArchitectureToolVersionsRecipes } from "./internal/checks/ToolVersionsCli.js"
import { ArchitectureTypeScriptDiagnosticsRecipes } from "./internal/checks/TypeScriptExtendedDiagnosticsCli.js"
import { ArchitectureWorkspaceScanRecipes } from "./internal/checks/WorkspaceScanCli.js"

export const AttuneArchitectureRecipes = [
  ...ArchitectureCommandSurfaceConformanceRecipes,
  ...ArchitectureFrameworkImportBoundaryRecipes,
  ...ArchitectureAtomImplementationPolicyRecipes,
  ...ArchitectureNoReportPolicyRecipes,
  ...ArchitectureFrameworkPolicyRecipes,
  ...ArchitectureToolVersionsRecipes,
  ...ArchitectureWorkspaceScanRecipes,
  ...ArchitecturePacketizedJudgeRecipes,
  ...ArchitectureCliRecipes,
  ...ArchitectureTypeScriptDiagnosticsRecipes,
  ...ArchitectureChurnComplexityRecipes,
  ...ArchitecturePrCompletionAuditRecipes,
  ...ArchitecturePrRecoveryAuditRecipes,
  ...ArchitectureRecipeRepairRecipes,
] as const

// @attune-packet-target generated-runtime-projection eligible
export const ArchitectureRecipePackage = defineRecipePackage({
  packageId: "attune-architecture",
  kind: "architecture-policy",
  title: "Trellis architecture policy and source-check recipes",
  sourceRoot: "packages/trellis/architecture/src",
  recipes: AttuneArchitectureRecipes,
  ownership: [
    {
      id: "architecture-policy-core",
      title: "Architecture policy modules with file-local recipe expression",
      files: [
        "packages/trellis/architecture/src/command-surface-conformance.ts",
        "packages/trellis/architecture/src/framework-atom-implementation-policy.ts",
        "packages/trellis/architecture/src/framework-import-boundary.ts",
        "packages/trellis/architecture/src/framework-no-report-policy.ts",
        "packages/trellis/architecture/src/framework-policy-cli.ts",
        "packages/trellis/architecture/src/index.ts",
      ],
      recipeIds: [
        ...ArchitectureCommandSurfaceConformanceRecipes,
        ...ArchitectureAtomImplementationPolicyRecipes,
        ...ArchitectureFrameworkImportBoundaryRecipes,
        ...ArchitectureNoReportPolicyRecipes,
        ...ArchitectureFrameworkPolicyRecipes,
      ].map((recipe) => recipe.id),
    },
    {
      id: "architecture-invocation-surfaces",
      title: "Architecture CLI and workspace invocation surfaces",
      files: [
        "packages/trellis/architecture/src/cli.ts",
        "packages/trellis/architecture/src/internal/checks/ChurnComplexityCli.ts",
        "packages/trellis/architecture/src/internal/checks/PacketizedArchitectureJudgeCli.ts",
        "packages/trellis/architecture/src/internal/checks/PrCompletionAuditCli.ts",
        "packages/trellis/architecture/src/internal/checks/PrRecoveryAuditCli.ts",
        "packages/trellis/architecture/src/internal/checks/ToolVersionsCli.ts",
        "packages/trellis/architecture/src/internal/checks/TypeScriptExtendedDiagnosticsCli.ts",
        "packages/trellis/architecture/src/internal/checks/WorkspaceScanCli.ts",
        "packages/trellis/architecture/src/recipe-repair-cli.ts",
      ],
      recipeIds: [
        ...ArchitectureCliRecipes,
        ...ArchitectureChurnComplexityRecipes,
        ...ArchitecturePacketizedJudgeRecipes,
        ...ArchitecturePrCompletionAuditRecipes,
        ...ArchitecturePrRecoveryAuditRecipes,
        ...ArchitectureToolVersionsRecipes,
        ...ArchitectureTypeScriptDiagnosticsRecipes,
        ...ArchitectureWorkspaceScanRecipes,
        ...ArchitectureRecipeRepairRecipes,
      ].map((recipe) => recipe.id),
    },
    {
      id: "architecture-test-source",
      title: "Architecture policy test evidence",
      files: ["packages/trellis/architecture/test/**"],
      recipeIds: ArchitectureFrameworkPolicyRecipes.map((recipe) => recipe.id),
    },
  ],
})
