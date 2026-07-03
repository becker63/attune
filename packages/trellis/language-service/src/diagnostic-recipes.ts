import * as fs from "node:fs"
import * as path from "node:path"

import { Effect, Layer } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineDiagnosticRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  NxTargetConformance,
  type NxTargetProjection,
  type ProgramDiagnostic,
  type RecipePackageDefinition,
} from "@attune/framework-protocol"
import {
  diagnosticsForProgramFacts,
  type ProgramDiagnosticsApi,
  type ProgramFactProjectionInput,
} from "@attune/framework-runtime"

import type {
  TrellisLsDiagnostic,
  TrellisLsProfile,
} from "./contracts.js"
import { analyzeFileAccounting } from "./file-accounting.js"
import { stableTrellisLsId } from "./ids.js"
import { relativeToWorkspace, type LoadedProject } from "./project-loader.js"
import { analyzeSourceExpression } from "./source-expression.js"
import {
  FrameworkLanguageServiceProjectId,
  LanguageServiceCliOutput,
  LanguageServiceDiagnosticsResource,
  LanguageServiceProjectionInput,
  LanguageServiceWorkspaceResource,
} from "./contracts.js"

export const LanguageServiceDiagnosticRecipesSourcePath = "packages/trellis/language-service/src/diagnostic-recipes.ts" as const
const packageLocalScriptDiagnosticTags = ["no-compat", "workflow-surface"] as const
const rawPostgresDiagnosticTags = ["db-boundary", "receipt-spine"] as const
const programFactDiagnosticBaseTags = ["program-facts"] as const
const generatedArtifactMissingOwnerTags = ["generated", "recipe-ownership", "projection-recipe"] as const
const generatedArtifactStaleTags = ["generated", "freshness", "projection-recipe"] as const
const authoredAttunePackageTags = ["recipe-only-source", "attune-package", "legacy-project-facts"] as const
const legacyAbstractionTags = ["recipe-only-source", "legacy-project-facts"] as const

export const collectTrellisDiagnostics = (
  loaded: LoadedProject,
  input: {
    readonly profile?: TrellisLsProfile
    readonly recipePackages?: readonly RecipePackageDefinition[]
    readonly programDiagnostics?: ProgramDiagnosticsApi
    readonly programFactSourcePaths?: readonly string[]
    readonly programFactProjectionInputs?: readonly ProgramFactProjectionInput[]
    readonly nxTargetProjections?: readonly NxTargetProjection[]
  } = {},
): readonly TrellisLsDiagnostic[] => [
  ...collectProgramFactDiagnostics(loaded, input),
  ...collectPackageLocalScriptDiagnostics(loaded),
  ...collectRawPostgresDiagnostics(loaded),
  ...collectGeneratedArtifactDiagnostics(
    loaded,
    input.recipePackages ?? [],
  ),
  ...collectNxTargetDiagnostics(loaded, input.nxTargetProjections ?? []),
  ...collectManagedRecipeDiagnostics(loaded),
  ...collectPrivateLedgerDiagnostics(loaded),
  ...collectTendLinkageDiagnostics(loaded),
  ...(input.profile === "recipe-only-source"
    ? collectRecipeOnlySourceDiagnostics(
      loaded,
      input.recipePackages ?? [],
    )
    : []),
  ...(input.profile === "recipe-only-source"
    ? analyzeFileAccounting(loaded).diagnostics
    : []),
  ...(input.profile === "recipe-only-source"
    ? analyzeSourceExpression(loaded).diagnostics
    : []),
]

const collectPackageLocalScriptDiagnostics = (
  loaded: LoadedProject,
): readonly TrellisLsDiagnostic[] => {
  const scriptFiles = findFiles(path.join(loaded.workspaceRoot, "packages"))
    .filter((file) => /\/scripts\//u.test(file.replaceAll(path.sep, "/")))
  return scriptFiles.map((file) => {
    const relativeFile = relativeToWorkspace(loaded.workspaceRoot, file)
    return {
      id: stableTrellisLsId("diag", [
        "trellis",
        "trellis/package-local-script-reintroduced",
        relativeFile,
      ]),
      source: "trellis",
      code: "trellis/package-local-script-reintroduced",
      severity: "error",
      message: "Package-local script workflow was reintroduced after no-compat cleanup.",
      file: relativeFile,
      repairIds: [],
      tags: packageLocalScriptDiagnosticTags,
    }
  })
}

const collectRawPostgresDiagnostics = (
  loaded: LoadedProject,
): readonly TrellisLsDiagnostic[] => {
  const diagnostics: TrellisLsDiagnostic[] = []
  for (const file of loaded.fileNames) {
    if (isAllowedRuntimeDbBoundary(file)) continue
    if (!fs.existsSync(file)) continue
    const text = fs.readFileSync(file, "utf8")
    const match = /from\s+["'](?:pg|postgres)["']|require\(["'](?:pg|postgres)["']\)/u.exec(text)
    if (match === null) continue
    const relativeFile = relativeToWorkspace(loaded.workspaceRoot, file)
    diagnostics.push({
      id: stableTrellisLsId("diag", [
        "trellis",
        "trellis/raw-pg-outside-runtime",
        relativeFile,
        match.index,
      ]),
      source: "trellis",
      code: "trellis/raw-pg-outside-runtime",
      severity: "error",
      message: "Raw Postgres access is outside the framework runtime DB boundary.",
      file: relativeFile,
      repairIds: [],
      tags: rawPostgresDiagnosticTags,
    })
  }
  return diagnostics
}

const collectProgramFactDiagnostics = (
  loaded: LoadedProject,
  input: {
    readonly programDiagnostics?: ProgramDiagnosticsApi
    readonly programFactSourcePaths?: readonly string[]
    readonly programFactProjectionInputs?: readonly ProgramFactProjectionInput[]
  },
): readonly TrellisLsDiagnostic[] => [
  ...(input.programFactProjectionInputs ?? [])
    .flatMap((projectionInput) => diagnosticsForProgramFacts(projectionInput))
    .map((diagnostic) => programDiagnosticToTrellis(loaded, diagnostic)),
  ...(input.programDiagnostics === undefined
    ? []
    : (input.programFactSourcePaths ?? loaded.fileNames.map((file) =>
      relativeToWorkspace(loaded.workspaceRoot, file)
    )).flatMap((sourcePath) =>
      Effect.runSync(input.programDiagnostics!.diagnosticsForFile(sourcePath))
        .map((diagnostic) => programDiagnosticToTrellis(loaded, diagnostic))
    )),
]

const programDiagnosticToTrellis = (
  loaded: LoadedProject,
  diagnostic: ProgramDiagnostic,
): TrellisLsDiagnostic => {
  const code = trellisCodeForProgramDiagnostic(diagnostic.code)
  return {
    id: stableTrellisLsId("diag", [
      "trellis",
      code,
      diagnostic.projectId,
      diagnostic.sourcePath,
      diagnostic.diagnosticRequirementId ?? "",
      diagnostic.explanation,
    ]),
    source: "trellis",
    code,
    severity: diagnostic.severity === "info" ? "suggestion" : diagnostic.severity,
    message: diagnostic.explanation,
    file: normalizeDiagnosticFile(loaded, diagnostic.sourcePath),
    ...(diagnostic.range === undefined
      ? {}
      : {
        span: {
          start: diagnostic.range.start,
          end: diagnostic.range.end,
          startLine: 1,
          startColumn: diagnostic.range.start + 1,
          endLine: 1,
          endColumn: diagnostic.range.end + 1,
        },
      }),
    repairIds: [],
    tags: [...programFactDiagnosticBaseTags, diagnostic.code],
  }
}

const trellisCodeForProgramDiagnostic = (code: string): string => {
  if (code === "attune/program-facts/stale-generated-source") return "trellis/generated-artifact-stale"
  if (code === "attune/program-facts/missing-observation") return "trellis/operation-missing-observation"
  if (code === "attune/program-facts/blocked-observation") return "trellis/operation-missing-observation"
  if (code === "attune/program-facts/waiver-issue") return "trellis/diagnostic-waiver-issue"
  if (code === "attune/program-facts/weak-oracle") return "trellis/weak-oracle"
  if (code === "attune/program-facts/high-rejection-filter") return "trellis/high-rejection-filter"
  return code.startsWith("trellis/") ? code : `trellis/${code.replace(/^attune\//u, "").replaceAll("/", "-")}`
}

const normalizeDiagnosticFile = (
  loaded: LoadedProject,
  sourcePath: string,
): string => path.isAbsolute(sourcePath)
  ? relativeToWorkspace(loaded.workspaceRoot, sourcePath)
  : sourcePath.replaceAll(path.sep, "/")

const collectGeneratedArtifactDiagnostics = (
  loaded: LoadedProject,
  recipePackages: readonly RecipePackageDefinition[],
): readonly TrellisLsDiagnostic[] => {
  const diagnostics: TrellisLsDiagnostic[] = []
  for (const file of loaded.fileNames) {
    const relativeFile = relativeToWorkspace(loaded.workspaceRoot, file)
    if (!isGeneratedSourcePath(relativeFile) || !fs.existsSync(file)) continue
    const text = fs.readFileSync(file, "utf8")
    if (!hasGeneratedOwner(text) && !isOwnedByRoleInPackages(recipePackages, relativeFile, "projection")) {
      diagnostics.push({
        id: stableTrellisLsId("diag", [
          "trellis",
          "trellis/generated-artifact-missing-owner",
          relativeFile,
        ]),
        source: "trellis",
        code: "trellis/generated-artifact-missing-owner",
        severity: "warning",
        message: "Generated artifact has no visible recipe or ProjectionRecipe owner.",
        file: relativeFile,
        repairIds: [],
        tags: generatedArtifactMissingOwnerTags,
      })
    }

    const hashMarker = generatedHashMarker(text)
    if (hashMarker !== undefined && hashMarker.expected !== hashMarker.actual) {
      diagnostics.push({
        id: stableTrellisLsId("diag", [
          "trellis",
          "trellis/generated-artifact-stale",
          relativeFile,
          hashMarker.expected,
          hashMarker.actual,
        ]),
        source: "trellis",
        code: "trellis/generated-artifact-stale",
        severity: "warning",
        message: `Generated artifact hash is stale: expected ${hashMarker.expected}, got ${hashMarker.actual}.`,
        file: relativeFile,
        repairIds: [],
        tags: generatedArtifactStaleTags,
      })
    }
  }
  return diagnostics
}

const collectNxTargetDiagnostics = (
  loaded: LoadedProject,
  projections: readonly NxTargetProjection[],
): readonly TrellisLsDiagnostic[] => {
  if (loaded.workspacePath === undefined) return []
  return findFiles(path.resolve(loaded.workspaceRoot, loaded.workspacePath))
    .filter((file) => file.replaceAll(path.sep, "/").endsWith("/project.json"))
    .flatMap((file) => {
      const relativeFile = relativeToWorkspace(loaded.workspaceRoot, file)
      const project = readJsonObject(file)
      const projectName = typeof project.name === "string"
        ? project.name
        : path.basename(path.dirname(file))
      return NxTargetConformance.checkProjectJson({
        projectName,
        projectJson: project,
        projections,
      }).flatMap((record) => {
        if (record.status !== "orphaned") return []
        return [
          projectJsonDiagnostic(
            "trellis/orphan-public-nx-target",
            `Public Nx target ${projectName}:${record.targetName} has no recipe or projection owner.`,
            relativeFile,
            ["nx", "recipe-ownership"],
          ),
          ...(["check", "repair"].includes(record.targetName)
            ? [projectJsonDiagnostic(
              "trellis/target-missing-recipe-invocation",
              `Public Nx target ${projectName}:${record.targetName} is not linked to a RecipeInvocation owner.`,
              relativeFile,
              ["nx", "recipe-invocation"],
            )]
            : []),
        ]
      })
    })
}

const collectManagedRecipeDiagnostics = (
  loaded: LoadedProject,
): readonly TrellisLsDiagnostic[] => {
  const diagnostics: TrellisLsDiagnostic[] = []
  for (const file of loaded.fileNames) {
    const relativeFile = relativeToWorkspace(loaded.workspaceRoot, file)
    if (isTestSourceFile(relativeFile)) continue
    if (!fs.existsSync(file)) continue
    const text = fs.readFileSync(file, "utf8")
    if (!/\bdefineManagedRecipe\s*\(/u.test(text)) continue
    if (!/\blifecycleSubstrates\b/u.test(text)) {
      diagnostics.push(sourceDiagnostic(
        "trellis/managed-recipe-missing-substrate",
        "ManagedRecipe is missing lifecycleSubstrates metadata.",
        relativeFile,
        ["managed-recipe", "alchemy"],
      ))
    }
    if (!/\b(?:observedState|RecipeObservation|observationKind)\b/u.test(text)) {
      diagnostics.push(sourceDiagnostic(
        "trellis/managed-recipe-missing-observation",
        "ManagedRecipe is missing observation metadata or emission ownership.",
        relativeFile,
        ["managed-recipe", "observation"],
      ))
    }
    if (/\blifecycle\s*:\s*\[[^\]]*(?:destroy|apply|prune)/su.test(text) && !/\bhumanReviewRequired\s*:\s*true\b/u.test(text)) {
      diagnostics.push(sourceDiagnostic(
        "trellis/destructive-lifecycle-missing-review-gate",
        "Destructive ManagedRecipe lifecycle action is missing a human review gate.",
        relativeFile,
        ["managed-recipe", "review-gate"],
      ))
    }
    if (!/\balchemy\b/iu.test(text)) {
      diagnostics.push(sourceDiagnostic(
        "trellis/alchemy-provenance-missing",
        "ManagedRecipe lifecycle metadata does not name Alchemy provenance.",
        relativeFile,
        ["managed-recipe", "alchemy"],
      ))
    }
  }
  return diagnostics
}

const collectPrivateLedgerDiagnostics = (
  loaded: LoadedProject,
): readonly TrellisLsDiagnostic[] => {
  const diagnostics: TrellisLsDiagnostic[] = []
  for (const file of loaded.fileNames) {
    const relativeFile = relativeToWorkspace(loaded.workspaceRoot, file)
    if (isTestSourceFile(relativeFile)) continue
    if (!fs.existsSync(file)) continue
    const text = fs.readFileSync(file, "utf8")
    if (
      hasPrivateLedgerDeclaration(text) &&
      !/\b(?:recipeId|runId|receiptId|observationId)\b/u.test(text)
    ) {
      diagnostics.push(sourceDiagnostic(
        "trellis/private-ledger-without-recipe-linkage",
        "Private ledger-like state is missing recipe/run/receipt/observation linkage.",
        relativeFile,
        ["db-boundary", "receipt-spine", "private-ledger"],
      ))
    }
    if (
      /\b(?:recordOperation|appendOperation|insertOperation|writeOperation)\b/u.test(text) &&
      !/\b(?:RecipeReceiptStore|RecipeObservation|receiptId|observationId)\b/u.test(text)
    ) {
      diagnostics.push(sourceDiagnostic(
        "trellis/operation-missing-receipt",
        "Durable operation write is missing RecipeReceiptStore or RecipeObservation linkage.",
        relativeFile,
        ["db-boundary", "receipt-spine"],
      ))
    }
  }
  return diagnostics
}

const collectTendLinkageDiagnostics = (
  loaded: LoadedProject,
): readonly TrellisLsDiagnostic[] => {
  const diagnostics: TrellisLsDiagnostic[] = []
  for (const file of loaded.fileNames) {
    const relativeFile = relativeToWorkspace(loaded.workspaceRoot, file)
    if (!relativeFile.startsWith("packages/tend/") || !fs.existsSync(file)) continue
    if (isTestSourceFile(relativeFile) || /\/fixtures\//u.test(relativeFile)) continue
    const text = fs.readFileSync(file, "utf8")
    if (/\b(?:TendSessionSchema\s*=\s*Schema\.Struct|export\s+type\s+TendSession\b|export\s+interface\s+TendSession\b|session\s*=\s*\{)\b/u.test(text) && !/\brecipeId\b/u.test(text)) {
      diagnostics.push(sourceDiagnostic(
        "trellis/tend-session-missing-recipe-id",
        "Tend session state is missing recipeId linkage.",
        relativeFile,
        ["tend", "recipe-linkage"],
      ))
    }
    if (/\b(?:TendCommandObservationSchema\s*=\s*Schema\.Struct|export\s+type\s+TendCommandObservation\b|export\s+interface\s+TendCommandObservation\b|commandObservationId\b)\b/u.test(text) && !/\bobservationId\b/u.test(text)) {
      diagnostics.push(sourceDiagnostic(
        "trellis/tend-command-missing-observation-id",
        "Tend command state is missing observationId linkage.",
        relativeFile,
        ["tend", "observation-linkage"],
      ))
    }
    if (/\b(?:BenchmarkReport|reportId|report\s*:)\b/u.test(text) && !/\b(?:receiptId|RecipeReceipt)\b/u.test(text)) {
      diagnostics.push(sourceDiagnostic(
        "trellis/tend-report-not-derived-from-receipts",
        "Tend report state is not visibly derived from recipe receipts.",
        relativeFile,
        ["tend", "receipt-spine"],
      ))
    }
    if (
      (/\b(?:interface|type)\s+\w*Packet\w*\b/u.test(text) ||
        /\bconst\s+\w*Packet\w*Schema\b/u.test(text)) &&
      !/\bfrom\s+["']@attune\/framework-protocol["']/u.test(text) &&
      !relativeFile.endsWith("/packet-links.ts")
    ) {
      diagnostics.push(sourceDiagnostic(
        "trellis/tend-owned-packet-ontology",
        "Tend defines packet ontology instead of importing Trellis/framework packet protocol.",
        relativeFile,
        ["tend", "packet-ontology", "framework-protocol"],
      ))
    }
    if (
      /\b(?:MigrationJudgment|JudgeRef|hiddenJudge|finalJudge|judgeInput)\b/u.test(text) &&
      !/\bfrom\s+["']@attune\/framework-protocol["']/u.test(text)
    ) {
      diagnostics.push(sourceDiagnostic(
        "trellis/tend-owned-judge-ontology",
        "Tend defines judge semantics instead of consuming Trellis/framework judge handlers.",
        relativeFile,
        ["tend", "judge-ontology", "framework-protocol"],
      ))
    }
    if (
      /\b(?:selectedTarget|targetDiagnosticPacket|packetApply|packetPrompt|packetQueue)\b/u.test(text) &&
      !/\b(?:normalizeTendPacketProtocolLinkedSummary|packetReceiptPayloadFromObservation)\b/u.test(text)
    ) {
      diagnostics.push(sourceDiagnostic(
        "trellis/tend-packet-helper-semantics",
        "Tend packet helper semantics must be projections over Trellis packet handlers.",
        relativeFile,
        ["tend", "packet-handler", "projection-only"],
      ))
    }
  }
  return diagnostics
}

const collectRecipeOnlySourceDiagnostics = (
  loaded: LoadedProject,
  recipePackages: readonly RecipePackageDefinition[],
): readonly TrellisLsDiagnostic[] => [
  ...collectAuthoredAttunePackageDiagnostics(loaded),
  ...collectLegacyAbstractionDiagnostics(loaded),
  ...recipePackages.flatMap((recipePackage) =>
    collectRecipePackageOwnershipDiagnostics(loaded, recipePackage)
  ),
]

const collectAuthoredAttunePackageDiagnostics = (
  loaded: LoadedProject,
): readonly TrellisLsDiagnostic[] =>
  findFiles(path.join(loaded.workspaceRoot, "packages"))
    .filter((file) => file.replaceAll(path.sep, "/").endsWith("/src/attune.package.ts"))
    .map((file) => {
      const relativeFile = relativeToWorkspace(loaded.workspaceRoot, file)
      return {
        id: stableTrellisLsId("diag", [
          "trellis",
          "trellis/authored-attune-package-file",
          relativeFile,
        ]),
        source: "trellis",
        code: "trellis/authored-attune-package-file",
        severity: "error",
        message: "Authored attune.package.ts is legacy LegacyPackageFacts scaffolding; package truth should live in recipe package declarations.",
        file: relativeFile,
        repairIds: [],
        tags: authoredAttunePackageTags,
      } satisfies TrellisLsDiagnostic
    })

const collectLegacyAbstractionDiagnostics = (
  loaded: LoadedProject,
): readonly TrellisLsDiagnostic[] => {
  const diagnostics: TrellisLsDiagnostic[] = []
  for (const file of loaded.fileNames) {
    if (!fs.existsSync(file)) continue
    const text = fs.readFileSync(file, "utf8")
    const match = legacyPackageFactsPattern.exec(text)
    if (match === null) continue
    const relativeFile = relativeToWorkspace(loaded.workspaceRoot, file)
    diagnostics.push({
      id: stableTrellisLsId("diag", [
        "trellis",
        "trellis/source-uses-legacy-abstraction",
        relativeFile,
        match[1] ?? "",
        match.index,
      ]),
      source: "trellis",
      code: "trellis/source-uses-legacy-abstraction",
      severity: "error",
      message: "Source uses legacy package facts abstraction as authored truth instead of recipe package metadata.",
      file: relativeFile,
      repairIds: [],
      tags: legacyAbstractionTags,
    })
  }
  return diagnostics
}

const legacyPackageFactsPattern = new RegExp([
  "\\b(",
  [
    ["defineAttune", "Project", "Facts"].join(""),
    ["Project", "Facts"].join(""),
    ["Project", "RuntimeRoots"].join(""),
  ].join("|"),
  ")\\b",
].join(""), "u")

const collectRecipePackageOwnershipDiagnostics = (
  loaded: LoadedProject,
  recipePackage: RecipePackageDefinition,
): readonly TrellisLsDiagnostic[] => {
  const sourceRoot = path.resolve(loaded.workspaceRoot, recipePackage.sourceRoot)
  if (!fs.existsSync(sourceRoot)) return []
  const files = findFiles(sourceRoot)
    .filter((file) => /\.[cm]?tsx?$/u.test(file))
    .filter((file) => !file.endsWith(".d.ts"))

  const ownershipPatterns = recipeOwnershipPatterns(recipePackage)
  const diagnostics: TrellisLsDiagnostic[] = []
  for (const file of files) {
    const relativeFile = relativeToWorkspace(loaded.workspaceRoot, file)
    if (!isMeaningfulSourceFile(relativeFile)) continue
    if (!ownershipPatterns.some((pattern) => pathMatchesPattern(relativeFile, pattern))) {
      diagnostics.push(recipeOnlyDiagnostic(
        "trellis/source-file-unowned-by-recipe",
        "Source file is not owned by any Recipe-family declaration.",
        relativeFile,
        ["recipe-only-source", "source-ownership"],
      ))
      continue
    }

    const roleDiagnostic = roleOwnershipDiagnostic(recipePackage, relativeFile)
    if (roleDiagnostic !== undefined) diagnostics.push(roleDiagnostic)
  }
  return diagnostics
}

const roleOwnershipDiagnostic = (
  recipePackage: RecipePackageDefinition,
  relativeFile: string,
): TrellisLsDiagnostic | undefined => {
  const normalized = relativeFile.replaceAll(path.sep, "/")
  if (/(^|\/)(cli|.*Cli)\.ts$/u.test(normalized) && !isOwnedByRole(recipePackage, relativeFile, "invocation")) {
    return recipeOnlyDiagnostic("trellis/workflow-not-invocation-recipe", "Workflow entrypoint is not owned by an InvocationRecipe.", relativeFile, [
      "recipe-only-source",
      "invocation-recipe",
    ])
  }
  if (/(^|\/)(generated|__generated__)(\/|$)|\.generated\.[cm]?[jt]sx?$/u.test(normalized) && !isOwnedByRole(recipePackage, relativeFile, "projection")) {
    return recipeOnlyDiagnostic("trellis/generated-output-not-projection-recipe", "Generated output is not owned by a ProjectionRecipe.", relativeFile, [
      "recipe-only-source",
      "projection-recipe",
    ])
  }
  if (/diagnostic/i.test(path.basename(normalized)) && !isOwnedByRole(recipePackage, relativeFile, "diagnostic")) {
    return recipeOnlyDiagnostic("trellis/diagnostic-logic-not-diagnostic-recipe", "Diagnostic logic is not owned by a DiagnosticRecipe.", relativeFile, [
      "recipe-only-source",
      "diagnostic-recipe",
    ])
  }
  if (/repair/i.test(path.basename(normalized)) && !isOwnedByRole(recipePackage, relativeFile, "repair")) {
    return recipeOnlyDiagnostic("trellis/repair-logic-not-repair-recipe", "Repair logic is not owned by a RepairRecipe.", relativeFile, [
      "recipe-only-source",
      "repair-recipe",
    ])
  }
  if (/observation|receipt/i.test(path.basename(normalized)) && !isOwnedByRole(recipePackage, relativeFile, "observation")) {
    return recipeOnlyDiagnostic("trellis/observation-not-observation-recipe", "Observation emission is not owned by an ObservationRecipe.", relativeFile, [
      "recipe-only-source",
      "observation-recipe",
    ])
  }
  return undefined
}

const recipeOnlyDiagnostic = (
  code: string,
  message: string,
  relativeFile: string,
  tags: readonly string[],
): TrellisLsDiagnostic => ({
  id: stableTrellisLsId("diag", ["trellis", code, relativeFile]),
  source: "trellis",
  code,
  severity: "error",
  message,
  file: relativeFile,
  repairIds: [],
  tags: [...tags],
})

const sourceDiagnostic = (
  code: string,
  message: string,
  relativeFile: string,
  tags: readonly string[],
): TrellisLsDiagnostic => ({
  id: stableTrellisLsId("diag", ["trellis", code, relativeFile]),
  source: "trellis",
  code,
  severity: "error",
  message,
  file: relativeFile,
  repairIds: [],
  tags: [...tags],
})

const projectJsonDiagnostic = (
  code: string,
  message: string,
  relativeFile: string,
  tags: readonly string[],
): TrellisLsDiagnostic => ({
  id: stableTrellisLsId("diag", ["trellis", code, relativeFile, message]),
  source: "trellis",
  code,
  severity: "error",
  message,
  file: relativeFile,
  repairIds: [],
  tags: [...tags],
})

const recipeOwnershipPatterns = (
  recipePackage: RecipePackageDefinition,
): readonly string[] => [
  ...recipePackage.recipes.flatMap((recipe) => [
    ...(recipe.sourcePath === undefined ? [] : [recipe.sourcePath]),
    ...(recipe.allowedFiles ?? []),
    ...("entrypoints" in recipe && Array.isArray(recipe.entrypoints) ? recipe.entrypoints : []),
    ...("outputs" in recipe && Array.isArray(recipe.outputs) ? recipe.outputs : []),
    ...("observedFiles" in recipe && Array.isArray(recipe.observedFiles) ? recipe.observedFiles : []),
    ...("affectedFiles" in recipe && Array.isArray(recipe.affectedFiles) ? recipe.affectedFiles : []),
  ]),
  ...(recipePackage.ownership ?? []).flatMap((group) => group.files),
]

const isOwnedByRole = (
  recipePackage: RecipePackageDefinition,
  relativeFile: string,
  role: string,
): boolean =>
  recipePackage.recipes.some((recipe) =>
    "recipeRole" in recipe &&
    recipe.recipeRole === role &&
    recipeOwnershipPatterns({ ...recipePackage, recipes: [recipe] })
      .some((pattern) => pathMatchesPattern(relativeFile, pattern))
  )

const isOwnedByRoleInPackages = (
  recipePackages: readonly RecipePackageDefinition[],
  relativeFile: string,
  role: string,
): boolean => recipePackages.some((recipePackage) => isOwnedByRole(recipePackage, relativeFile, role))

const isMeaningfulSourceFile = (relativeFile: string): boolean =>
  !relativeFile.includes("/node_modules/") &&
  !relativeFile.includes("/dist/") &&
  !isTestSourceFile(relativeFile)

const isTestSourceFile = (relativeFile: string): boolean =>
  relativeFile.endsWith(".test.ts") ||
  relativeFile.endsWith(".test.tsx") ||
  relativeFile.includes("/test/") ||
  relativeFile.includes("/tests/")

const pathMatchesPattern = (relativeFile: string, pattern: string): boolean => {
  const normalizedFile = relativeFile.replaceAll(path.sep, "/")
  const normalizedPattern = pattern.replaceAll(path.sep, "/")
  if (normalizedPattern.endsWith("/**")) {
    return normalizedFile.startsWith(normalizedPattern.slice(0, -3))
  }
  if (normalizedPattern.includes("*")) {
    const escaped = normalizedPattern
      .split("*")
      .map((part) => part.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"))
      .join(".*")
    return new RegExp(`^${escaped}$`, "u").test(normalizedFile)
  }
  return normalizedFile === normalizedPattern
}

const isGeneratedSourcePath = (relativeFile: string): boolean =>
  /(^|\/)(generated|__generated__)(\/|$)|\.generated\.[cm]?[jt]sx?$/u.test(relativeFile.replaceAll(path.sep, "/"))

const hasGeneratedOwner = (text: string): boolean =>
  /@generated\s+by\s+recipe|ownerRecipeId|projectionId|RecipeOwner:/iu.test(text)

const hasPrivateLedgerDeclaration = (text: string): boolean =>
  /\b(?:const|let|class|interface|type)\s+\w*Ledger\b/u.test(text)

const generatedHashMarker = (
  text: string,
): { readonly expected: string; readonly actual: string } | undefined => {
  const marker = /@generated-hash\s+expected=(?<expected>[A-Za-z0-9._-]+)\s+actual=(?<actual>[A-Za-z0-9._-]+)/u.exec(text)
  if (marker?.groups?.expected !== undefined && marker.groups.actual !== undefined) {
    return {
      expected: marker.groups.expected,
      actual: marker.groups.actual,
    }
  }
  return undefined
}

const readJsonObject = (file: string): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as unknown
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const isAllowedRuntimeDbBoundary = (file: string): boolean => {
  const normalized = file.replaceAll(path.sep, "/")
  return normalized.includes("/packages/trellis/runtime/src/") ||
    normalized.includes("/packages/trellis/runtime/test/")
}

const findFiles = (root: string): readonly string[] => {
  if (!fs.existsSync(root)) return []
  const files: string[] = []
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === "dist" || entry.name === ".git" || entry.name === ".attune") continue
      const fullPath = path.join(directory, entry.name)
      if (entry.isDirectory()) {
        visit(fullPath)
      } else {
        files.push(fullPath)
      }
    }
  }
  visit(root)
  return files
}

const languageServiceRecipeFactDiagnosticsLayer = defineRecipeLayer({
  id: "trellis-language-service.recipe-fact-diagnostics.layer",
  sourcePath: LanguageServiceDiagnosticRecipesSourcePath,
  exportName: "languageServiceRecipeFactDiagnosticsLayer",
  layer: Layer.empty as never,
  provides: [{
    id: "trellis-language-service.recipe-fact-diagnostics-filesystem",
    service: "Effect.Platform.FileSystem",
  }],
})

const languageServiceRecipeFactDiagnosticsHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceCliOutput
>({
  id: "trellis-language-service.recipe-fact-diagnostics.handler",
  recipeId: "trellis-language-service.recipe-fact-diagnostics",
  sourcePath: LanguageServiceDiagnosticRecipesSourcePath,
  exportName: "collectTrellisDiagnostics",
  layer: languageServiceRecipeFactDiagnosticsLayer,
  handler: () =>
    Effect.succeed({
      diagnosticCount: 0,
      fixCount: 0,
      blocking: false,
      schemaVersion: 1,
      invocationModel: "RecipeInvocation",
    }),
})

const languageServiceRecipeFactDiagnosticsDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.workspace-inventory",
  toRecipeId: "trellis-language-service.recipe-fact-diagnostics",
  resource: LanguageServiceDiagnosticsResource,
  kind: "diagnoses",
  modes: ["observe", "read"],
})

export const LanguageServiceRecipeFactDiagnosticsRecipe = defineDiagnosticRecipe({
  id: "trellis-language-service.recipe-fact-diagnostics",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Project recipe, generated artifact, Nx, DB, and Tend facts into diagnostics",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceCliOutput,
  sourcePath: LanguageServiceDiagnosticRecipesSourcePath,
  allowedFiles: [LanguageServiceDiagnosticRecipesSourcePath],
  observedFiles: [LanguageServiceDiagnosticRecipesSourcePath],
  validationEvidence: ["framework-language-service:test"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    inputResources: [LanguageServiceWorkspaceResource],
    outputResources: [LanguageServiceDiagnosticsResource],
  },
  handler: languageServiceRecipeFactDiagnosticsHandler,
  alchemyDag: [languageServiceRecipeFactDiagnosticsDag],
})

export const LanguageServiceDiagnosticRecipes = [LanguageServiceRecipeFactDiagnosticsRecipe] as const
