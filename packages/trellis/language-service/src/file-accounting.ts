import * as childProcess from "node:child_process"
import { createHash } from "node:crypto"
import * as fs from "node:fs"
import * as path from "node:path"

import { Effect, Layer, Schema } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineProjectionRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  defineRepairRecipe,
  FileAccountingOracleResultSchema,
  FileInventorySnapshotSchema,
  type FileAccountingOracleResult,
  type FileAccountingTarget,
  type FileInventorySnapshot,
  type FileRole,
} from "@attune/framework-protocol"

import type { TrellisLsDiagnostic } from "./contracts.js"
import {
  FrameworkLanguageServiceProjectId,
  LanguageServiceCliOutput,
  LanguageServiceDiagnosticsResource,
  LanguageServiceFileAccountingResource,
  LanguageServicePacketResource,
  LanguageServiceProjectionInput,
} from "./contracts.js"
import { stableTrellisLsId } from "./ids.js"
import { relativeToWorkspace, type LoadedProject } from "./project-loader.js"

export const LanguageServiceFileAccountingSourcePath = "packages/trellis/language-service/src/file-accounting.ts" as const
const fileAccountingDiagnosticTags = ["file-accounting"] as const

export interface FileAccountingAnalysis {
  readonly snapshot: FileInventorySnapshot
  readonly targets: readonly FileAccountingTarget[]
  readonly diagnostics: readonly TrellisLsDiagnostic[]
  readonly oracle: FileAccountingOracleResult
}

interface RecipePackageOwnershipSummary {
  readonly packageId: string
  readonly sourceRoot: string
  readonly packageRootId: string
  readonly patterns: readonly OwnershipPattern[]
}

interface OwnershipPattern {
  readonly pattern: string
  readonly owner: string
  readonly role?: string
  readonly kind: "package-bootstrap" | "recipe" | "ownership-group" | "generated-marker"
}

interface FileClassification {
  readonly path: string
  readonly role: FileRole
  readonly confidence: number
  readonly reason: string
  readonly sideEffectReason?: string
  readonly trackedGeneratedKind?: "code" | "artifact"
  readonly trackedGeneratedReason?: string
}

const fileAccountingPacketFamilies = new Set([
  "trellis/file-inventory-unclassified",
  "trellis/file-unowned-by-recipe",
  "trellis/source-file-unowned-by-recipe",
  "trellis/side-effect-not-recipe-owned",
  "trellis/test-file-unowned-by-test-recipe",
  "trellis/workflow-not-invocation-recipe",
  "trellis/generated-code-tracked",
  "trellis/generated-output-not-projection-recipe",
  "trellis/diagnostic-logic-not-diagnostic-recipe",
  "trellis/repair-logic-not-repair-recipe",
  "trellis/observation-not-observation-recipe",
  "trellis/lifecycle-not-managed-recipe",
  "trellis/config-not-config-recipe",
  "trellis/nix-not-toolchain-recipe",
  "trellis/sql-not-runtime-recipe",
  "trellis/docs-not-documentation-recipe",
  "trellis/openspec-not-change-recipe",
  "trellis/asset-not-classified",
  "trellis/historical-file-not-quarantined",
])

export const isFileAccountingPacketFamily = (code: string): boolean =>
  fileAccountingPacketFamilies.has(code)

export const analyzeFileAccounting = (
  loaded: LoadedProject,
  input: {
    readonly packetCount?: number
    readonly projectAwareTypeScriptDiagnostics?: number
    readonly missingJudgments?: number
  } = {},
): FileAccountingAnalysis => {
  const trackedFiles = gitTrackedFiles(loaded.workspaceRoot)
  const recipePackages = discoverRecipePackageOwnership(loaded.workspaceRoot)
  const classifications = trackedFiles.map((file) =>
    annotateTrackedGeneratedKind(classifyFile(file, loaded.workspaceRoot), loaded.workspaceRoot)
  )
  const packageRootMapping = Object.fromEntries(
    classifications.map((classification) => [classification.path, packageRootForFile(classification.path)]),
  )
  const inventoryHash = createHash("sha256")
    .update(JSON.stringify(classifications.map((classification) => ({
      path: classification.path,
      role: classification.role,
      packageRootId: packageRootMapping[classification.path],
    })).sort((left, right) => left.path.localeCompare(right.path))))
    .digest("hex")
  const sourceSnapshotId = stableTrellisLsId("packet", [
    "file-inventory-snapshot",
    inventoryHash,
    trackedFiles.length,
  ])
  const snapshot = Schema.decodeUnknownSync(FileInventorySnapshotSchema)({
    sourceSnapshotId,
    trackedFileCount: trackedFiles.length,
    fileRoleClassifications: classifications.map((classification) => ({
      path: classification.path,
      role: classification.role,
      confidence: classification.confidence,
      reason: classification.reason,
    })),
    packageRootMapping,
    generatedClassifications: pathsWithRoles(classifications, ["generated", "projection-output"]),
    configClassifications: pathsWithRoles(classifications, ["configuration", "package-metadata", "schema"]),
    docsClassifications: pathsWithRoles(classifications, ["documentation", "report-projection"]),
    nixClassifications: pathsWithRoles(classifications, ["nix-toolchain"]),
    sqlClassifications: pathsWithRoles(classifications, ["runtime-sql"]),
    openSpecClassifications: pathsWithRoles(classifications, ["openspec"]),
    ignoredExternalClassifications: pathsWithRoles(classifications, ["ignored/external"]),
    historicalClassifications: pathsWithRoles(classifications, ["historical/quarantined"]),
    inventoryHash,
  })
  const targets = classifications.map((classification) =>
    accountingTargetFor(loaded.workspaceRoot, classification, packageRootMapping[classification.path] ?? "workspace", recipePackages)
  )
  const diagnostics = targets.flatMap((target) => {
    const diagnostic = diagnosticForTarget(target, ownersForPath(target.path, recipePackages))
    return diagnostic === undefined ? [] : [diagnostic]
  })
  const accountedFiles = targets.filter(isStrictlyAccounted).length
  const unaccountedFiles = targets.length - accountedFiles
  const ambiguousFiles = targets.filter((target) =>
    target.missingOrAmbiguousOwnershipReason?.includes("ambiguous") === true
  ).length
  const unownedSourceFiles = countUnowned(targets, ["source"])
  const unownedTestFiles = countUnowned(targets, ["test", "fixture"])
  const unownedGeneratedFiles = countUnowned(targets, ["generated", "projection-output"])
  const unownedConfigFiles = countUnowned(targets, ["configuration", "package-metadata", "schema"])
  const unownedDocs = countUnowned(targets, ["documentation", "report-projection"])
  const unownedNixFiles = countUnowned(targets, ["nix-toolchain"])
  const unownedSqlFiles = countUnowned(targets, ["runtime-sql"])
  const unownedOpenSpecFiles = countUnowned(targets, ["openspec"])
  const trackedGeneratedCodeFiles = classifications.filter((classification) =>
    classification.trackedGeneratedKind === "code"
  ).length
  const trackedGeneratedArtifactFiles = classifications.filter((classification) =>
    classification.trackedGeneratedKind === "artifact"
  ).length
  const orphanWorkflowTargets = diagnostics.filter((diagnostic) =>
    diagnostic.code === "trellis/workflow-not-invocation-recipe"
  ).length
  const liveScriptSurfaces = diagnostics.filter((diagnostic) =>
    diagnostic.code === "trellis/package-local-script-reintroduced"
  ).length
  const generatedOutputsWithoutProjectionOwnership = diagnostics.filter((diagnostic) =>
    diagnostic.code === "trellis/generated-output-not-projection-recipe"
  ).length
  const genericRecipesNeedingSpecialization = diagnostics.filter((diagnostic) =>
    [
      "trellis/side-effect-not-recipe-owned",
      "trellis/workflow-not-invocation-recipe",
      "trellis/diagnostic-logic-not-diagnostic-recipe",
      "trellis/repair-logic-not-repair-recipe",
      "trellis/observation-not-observation-recipe",
      "trellis/lifecycle-not-managed-recipe",
    ].includes(diagnostic.code)
  ).length
  const packetCount = input.packetCount ?? diagnostics.length
  const projectAwareTypeScriptDiagnostics = input.projectAwareTypeScriptDiagnostics ?? 0
  const missingJudgments = input.missingJudgments ?? (
    diagnostics.length === 0 && packetCount === 0 && projectAwareTypeScriptDiagnostics === 0 ? 0 : 1
  )
  const promotionAllowed = unaccountedFiles === 0 &&
    ambiguousFiles === 0 &&
    classifications.length === trackedFiles.length &&
    accountedFiles === trackedFiles.length &&
    trackedGeneratedCodeFiles === 0 &&
    trackedGeneratedArtifactFiles === 0 &&
    orphanWorkflowTargets === 0 &&
    liveScriptSurfaces === 0 &&
    generatedOutputsWithoutProjectionOwnership === 0 &&
    genericRecipesNeedingSpecialization === 0 &&
    missingJudgments === 0 &&
    packetCount === 0 &&
    projectAwareTypeScriptDiagnostics === 0
  const oracle = Schema.decodeUnknownSync(FileAccountingOracleResultSchema)({
    trackedFiles: trackedFiles.length,
    classifiedFiles: classifications.length,
    accountedFiles,
    unaccountedFiles,
    ambiguousFiles,
    unownedSourceFiles,
    unownedTestFiles,
    unownedGeneratedFiles,
    unownedConfigFiles,
    unownedDocs,
    unownedNixFiles,
    unownedSqlFiles,
    unownedOpenSpecFiles,
    trackedGeneratedCodeFiles,
    trackedGeneratedArtifactFiles,
    orphanWorkflowTargets,
    liveScriptSurfaces,
    generatedOutputsWithoutProjectionOwnership,
    genericRecipesNeedingSpecialization,
    missingJudgments,
    packetCount,
    projectAwareTypeScriptDiagnostics,
    promotionAllowed,
  })
  return { snapshot, targets, diagnostics, oracle }
}

const pathsWithRoles = (
  classifications: readonly FileClassification[],
  roles: readonly FileRole[],
): readonly string[] => {
  const wanted = new Set(roles)
  return classifications.filter((classification) => wanted.has(classification.role)).map((classification) => classification.path)
}

const countUnowned = (
  targets: readonly FileAccountingTarget[],
  roles: readonly FileRole[],
): number => {
  const wanted = new Set(roles)
  return targets.filter((target) => wanted.has(target.fileRole) && !isStrictlyAccounted(target)).length
}

const uniqueStrings = (values: readonly string[]): readonly string[] =>
  [...new Set(values)].sort()

const languageServiceFileAccountingLayer = defineRecipeLayer({
  id: "trellis-language-service.file-accounting.layer",
  sourcePath: LanguageServiceFileAccountingSourcePath,
  exportName: "languageServiceFileAccountingLayer",
  layer: Layer.empty as never,
  provides: [
    {
      id: "trellis-language-service.file-accounting-filesystem",
      service: "Effect.Platform.FileSystem",
    },
    {
      id: "trellis-language-service.file-accounting-process",
      service: "Effect.Platform.CommandExecutor",
    },
  ],
})

const languageServiceFileAccountingOracleHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceCliOutput
>({
  id: "trellis-language-service.file-accounting-oracle.handler",
  recipeId: "trellis-language-service.file-accounting-oracle",
  sourcePath: LanguageServiceFileAccountingSourcePath,
  exportName: "analyzeFileAccounting",
  layer: languageServiceFileAccountingLayer,
  handler: () =>
    Effect.succeed({
      diagnosticCount: 0,
      fixCount: 0,
      blocking: false,
      schemaVersion: 1,
      invocationModel: "RecipeInvocation",
    }),
})

const languageServiceFileAccountingPacketHandler = defineRecipeHandler<
  LanguageServiceProjectionInput,
  LanguageServiceCliOutput
>({
  id: "trellis-language-service.file-accounting-packet.handler",
  recipeId: "trellis-language-service.file-accounting-packet",
  sourcePath: LanguageServiceFileAccountingSourcePath,
  exportName: "isFileAccountingPacketFamily",
  layer: languageServiceFileAccountingLayer,
  handler: () =>
    Effect.succeed({
      diagnosticCount: 0,
      fixCount: 0,
      blocking: false,
      schemaVersion: 1,
      invocationModel: "RecipeInvocation",
    }),
})

const languageServiceFileAccountingOracleDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.recipe-fact-diagnostics",
  toRecipeId: "trellis-language-service.file-accounting-oracle",
  resource: LanguageServiceFileAccountingResource,
  kind: "projects",
  modes: ["project", "check", "read"],
})

const languageServiceFileAccountingPacketDag = defineAlchemyRecipeDagEdge({
  fromRecipeId: "trellis-language-service.file-accounting-oracle",
  toRecipeId: "trellis-language-service.file-accounting-packet",
  resource: LanguageServicePacketResource,
  kind: "repairs",
  modes: ["project", "read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const LanguageServiceFileAccountingOracleRecipe = defineProjectionRecipe({
  id: "trellis-language-service.file-accounting-oracle",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Render whole-repo git-tracked file-accounting oracle JSON",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceCliOutput,
  allowedFiles: [LanguageServiceFileAccountingSourcePath],
  observedFiles: [LanguageServiceFileAccountingSourcePath],
  affectedFiles: [LanguageServiceFileAccountingSourcePath],
  outputs: ["TrellisLsFileAccountingOutput", "FileInventorySnapshot", "FileAccountingOracleResult"],
  validationEvidence: ["workspace:packetized-architecture-judge"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    inputResources: [LanguageServiceDiagnosticsResource],
    outputResources: [LanguageServiceFileAccountingResource],
  },
  handler: languageServiceFileAccountingOracleHandler,
  alchemyDag: [languageServiceFileAccountingOracleDag],
})

export const LanguageServiceFileAccountingPacketRecipe = defineRepairRecipe({
  id: "trellis-language-service.file-accounting-packet",
  projectId: FrameworkLanguageServiceProjectId,
  title: "Packetize file-accounting ownership failures into grouped repair targets",
  inputSchema: LanguageServiceProjectionInput,
  outputSchema: LanguageServiceCliOutput,
  allowedFiles: [LanguageServiceFileAccountingSourcePath],
  affectedFiles: [LanguageServiceFileAccountingSourcePath],
  validationEvidence: ["workspace:packetized-architecture-judge"],
  io: {
    inputSchema: LanguageServiceProjectionInput,
    outputSchema: LanguageServiceCliOutput,
    inputResources: [LanguageServiceFileAccountingResource],
    outputResources: [LanguageServicePacketResource],
  },
  handler: languageServiceFileAccountingPacketHandler,
  alchemyDag: [languageServiceFileAccountingPacketDag],
})

export const LanguageServiceFileAccountingRecipes = [
  LanguageServiceFileAccountingOracleRecipe,
  LanguageServiceFileAccountingPacketRecipe,
] as const

const isStrictlyAccounted = (target: FileAccountingTarget): boolean =>
  target.currentOwner !== undefined &&
  target.missingOrAmbiguousOwnershipReason === undefined &&
  target.classificationConfidence >= 0.75

const gitTrackedFiles = (workspaceRoot: string): readonly string[] => {
  try {
    return childProcess.execFileSync("git", ["ls-files"], {
      cwd: workspaceRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    })
      .split(/\r?\n/u)
      .filter(Boolean)
      .sort()
  } catch {
    return findFiles(workspaceRoot)
      .map((file) => relativeToWorkspace(workspaceRoot, file))
      .filter((file) => !isIgnoredInventoryPath(file))
      .sort()
  }
}

const classifyFile = (file: string, workspaceRoot: string): FileClassification => {
  const normalized = file.replaceAll(path.sep, "/")
  const absolute = path.join(workspaceRoot, normalized)
  if (!fs.existsSync(absolute) && /(^|\/)src\/attune\.package\.ts$/u.test(normalized)) {
    return { path: normalized, role: "historical/quarantined", confidence: 1, reason: "deleted legacy package-local Attune declaration" }
  }
  if (normalized.startsWith("packages/trellis/language-service/src/upstream-effect/vendor/")) {
    return { path: normalized, role: "ignored/external", confidence: 1, reason: "reviewed vendored upstream Effect language-service source" }
  }
  if (isTrackedBuildOutput(normalized)) {
    return { path: normalized, role: "projection-output", confidence: 1, reason: "tracked build output projection" }
  }
  if (isGeneratedJavaScriptCompanion(normalized, workspaceRoot)) {
    return { path: normalized, role: "projection-output", confidence: 1, reason: "tracked JavaScript/CJS companion generated from TypeScript source" }
  }
  if (hasGeneratedProvenanceMarker(absolute)) {
    return { path: normalized, role: "projection-output", confidence: 1, reason: "generated provenance marker" }
  }
  if (/^openspec\//u.test(normalized)) {
    return { path: normalized, role: "openspec", confidence: 1, reason: "OpenSpec artifact path" }
  }
  if (/^nix\//u.test(normalized) || /(^|\/)flake\.(?:nix|lock)$/u.test(normalized) || /\.nix$/u.test(normalized)) {
    return { path: normalized, role: "nix-toolchain", confidence: 1, reason: "Nix toolchain path or file" }
  }
  if (/^(reports?|coverage|artifacts?)\//iu.test(normalized)) {
    return { path: normalized, role: "report-projection", confidence: 1, reason: "report/projection output path" }
  }
  if (/^session-[^/]+\.md$/iu.test(normalized)) {
    return { path: normalized, role: "historical/quarantined", confidence: 1, reason: "reviewed raw session transcript quarantine" }
  }
  if (/^(docs\/|[^/]*README\.md$)|\/README\.md$/iu.test(normalized) || /\.(md|mdx)$/iu.test(normalized)) {
    return { path: normalized, role: "documentation", confidence: 0.95, reason: "documentation extension or docs path" }
  }
  if (/\.(?:sql)$/iu.test(normalized)) {
    return { path: normalized, role: "runtime-sql", confidence: 1, reason: "SQL runtime file" }
  }
  if (/\/fixtures?\//iu.test(normalized) || /(^|\/)__fixtures__\//iu.test(normalized)) {
    return { path: normalized, role: "fixture", confidence: 1, reason: "fixture path" }
  }
  if (/(^|\/)(test|tests)(\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/u.test(normalized)) {
    return { path: normalized, role: "test", confidence: 1, reason: "test path or test/spec suffix" }
  }
  if (/(^|\/)(generated|__generated__|dist)(\/|$)|\.generated\.[cm]?[jt]sx?$/u.test(normalized)) {
    return { path: normalized, role: "generated", confidence: 1, reason: "generated path or suffix" }
  }
  if (/^packages\/attune\/nx\/src\/executors\/.*\.cjs$/u.test(normalized)) {
    return { path: normalized, role: "projection-output", confidence: 1, reason: "generated executor wrapper projection" }
  }
  if (/(^|\/)schema\/[^/]+\.json$/iu.test(normalized) || /(^|\/)(schema\.json|[^/]+\.schema\.json)$/iu.test(normalized)) {
    return { path: normalized, role: "schema", confidence: 1, reason: "schema metadata file" }
  }
  if (/(^|\/)(package|project)\.json$/u.test(normalized) || /(^|\/)tsconfig(?:\.[^/]+)?\.json$/u.test(normalized)) {
    return { path: normalized, role: "package-metadata", confidence: 1, reason: "package/project/TypeScript metadata file" }
  }
  if (/^\.|(^|\/)(nx\.json|pnpm-workspace\.yaml|package\.json|package-lock\.json|sops\.yaml)$/u.test(normalized) || /\.(json|jsonc|ya?ml|toml)$/iu.test(normalized)) {
    return { path: normalized, role: "configuration", confidence: 0.9, reason: "configuration file extension or root config path" }
  }
  if (/\.(?:png|jpg|jpeg|gif|svg|webp|ico|age|lock)$/iu.test(normalized)) {
    return { path: normalized, role: "asset", confidence: 0.85, reason: "asset-like extension" }
  }
  if (/\.(?:html|css)$/iu.test(normalized)) {
    return { path: normalized, role: "asset", confidence: 1, reason: "web asset extension" }
  }
  if (/\.(?:java|[cm]?[jt]sx?)$/u.test(normalized)) {
    const sideEffectReason = sourceSideEffectReason(absolute)
    return {
      path: normalized,
      role: "source",
      confidence: 0.95,
      reason: sideEffectReason === undefined
        ? "TypeScript/JavaScript source extension"
        : `TypeScript/JavaScript source extension with side effects: ${sideEffectReason}`,
      ...(sideEffectReason === undefined ? {} : { sideEffectReason }),
    }
  }
  return { path: normalized, role: "asset", confidence: 0.6, reason: "fallback asset classification for tracked non-source file" }
}

const annotateTrackedGeneratedKind = (
  classification: FileClassification,
  workspaceRoot: string,
): FileClassification => {
  if (classification.role === "historical/quarantined" || classification.role === "ignored/external") {
    return classification
  }
  const codeReason = trackedGeneratedCodeReason(classification, workspaceRoot)
  if (codeReason !== undefined) {
    return {
      ...classification,
      trackedGeneratedKind: "code",
      trackedGeneratedReason: codeReason,
    }
  }
  const artifactReason = trackedGeneratedArtifactReason(classification, workspaceRoot)
  if (artifactReason !== undefined) {
    return {
      ...classification,
      trackedGeneratedKind: "artifact",
      trackedGeneratedReason: artifactReason,
    }
  }
  return classification
}

const accountingTargetFor = (
  workspaceRoot: string,
  classification: FileClassification,
  packageRootId: string,
  recipePackages: readonly RecipePackageOwnershipSummary[],
): FileAccountingTarget => {
  const owners = [
    ...ownersForPath(classification.path, recipePackages),
    ...generatedOwnerForFile(workspaceRoot, classification),
  ]
  const currentOwner = ownerForClassification(classification, owners)
  const expectedOwnerKind = expectedOwnerKindFor(classification)
  const generatedTrackingReason = trackedGeneratedOwnershipFailureReason(classification)
  const ambiguousReason = ambiguousOwnershipReason(classification, owners)
  const wrongSpecializationReason = generatedTrackingReason ?? (currentOwner === undefined
    ? `missing ${expectedOwnerKind} ownership`
    : ambiguousReason
    ?? broadBootstrapOnlyReason(classification, owners)
    ?? (
      specializationDiagnosticCode(classification.path, classification.role, owners) === undefined
        ? undefined
        : `generic ownership needs specialization: expected ${expectedOwnerKind}`
    ))
  return {
    path: classification.path,
    fileRole: classification.role,
    packageRootId,
    expectedOwnerKind,
    ...(currentOwner === undefined ? {} : { currentOwner }),
    ...(wrongSpecializationReason === undefined ? {} : { missingOrAmbiguousOwnershipReason: wrongSpecializationReason }),
    classificationConfidence: classification.confidence,
    repairability: repairabilityForRole(classification.role),
    risk: riskForRole(classification.role),
  }
}

const ownerForClassification = (
  classification: FileClassification,
  owners: readonly OwnershipPattern[],
): string | undefined => {
  if (classification.role === "ignored/external") return "policy:reviewed-external-vendor"
  if (classification.role === "historical/quarantined") return "policy:historical-quarantine"
  if (owners.length === 0) return undefined
  if (classification.role === "source" && classification.sideEffectReason !== undefined) {
    const focusedSideEffectOwner = owners.find((owner) => isFocusedSideEffectOwner(classification.path, owner))
    if (focusedSideEffectOwner !== undefined) return focusedSideEffectOwner.owner
  }
  if (classification.role === "source" && expectedRecipeRoleFor(classification.path, classification.role) === undefined) {
    const focusedSourceOwner = owners.find((owner) => isFocusedSourceOwner(classification.path, owner))
    if (focusedSourceOwner !== undefined) return focusedSourceOwner.owner
  }
  const role = expectedRecipeRoleFor(classification.path, classification.role)
  const specialized = owners.find((owner) => owner.role === role)
  return specialized?.owner ?? owners[0]?.owner
}

const broadBootstrapOnlyReason = (
  classification: FileClassification,
  owners: readonly OwnershipPattern[],
): string | undefined => {
  if (classification.role !== "source") return undefined
  if (classification.sideEffectReason !== undefined) {
    const sideEffectOwner = owners.find((owner) => isFocusedSideEffectOwner(classification.path, owner))
    return sideEffectOwner === undefined
      ? `side effect is not expressed through focused Recipe or ManagedRecipe ownership: ${classification.sideEffectReason}`
      : undefined
  }
  if (expectedRecipeRoleFor(classification.path, classification.role) !== undefined) return undefined
  if (owners.length === 0) return undefined
  const finalOwner = owners.find((owner) => isFocusedSourceOwner(classification.path, owner))
  return finalOwner === undefined
    ? "broad package/source ownership is bootstrap-only: expected focused Recipe ownership"
    : undefined
}

const ambiguousOwnershipReason = (
  classification: FileClassification,
  owners: readonly OwnershipPattern[],
): string | undefined => {
  if (classification.role === "ignored/external" || classification.role === "historical/quarantined") return undefined
  const finalOwners = uniqueStrings(finalOwnershipCandidatesFor(classification, owners).map((owner) => owner.owner))
  if (finalOwners.length <= 1) return undefined
  const finalPatterns = uniqueStrings(finalOwnershipCandidatesFor(classification, owners).map((owner) => owner.pattern))
  if (finalPatterns.length <= 1) return undefined
  return `ambiguous ownership: ${finalOwners.slice(0, 5).join(", ")}`
}

const finalOwnershipCandidatesFor = (
  classification: FileClassification,
  owners: readonly OwnershipPattern[],
): readonly OwnershipPattern[] => {
  if (owners.length === 0) return []
  const narrowest = (candidates: readonly OwnershipPattern[]) => {
    const exact = candidates.filter((owner) => !owner.pattern.includes("*"))
    const selected = exact.length > 0 ? exact : candidates
    return selected.filter((owner, index) =>
      selected.findIndex((candidate) =>
        candidate.owner === owner.owner && candidate.pattern === owner.pattern
      ) === index
    )
  }
  if (classification.role === "source" && classification.sideEffectReason !== undefined) {
    return narrowest(owners.filter((owner) => isFocusedSideEffectOwner(classification.path, owner)))
  }
  if (classification.role === "source" && expectedRecipeRoleFor(classification.path, classification.role) === undefined) {
    return narrowest(owners.filter((owner) => isFocusedSourceOwner(classification.path, owner)))
  }
  const role = expectedRecipeRoleFor(classification.path, classification.role)
  if (role === undefined) return []
  return narrowest(owners.filter((owner) =>
    owner.role === role && isRoleSpecificFinalOwner(classification, owner)
  ))
}

const isFocusedSourceOwner = (file: string, owner: OwnershipPattern): boolean => {
  if (owner.kind === "generated-marker") return true
  return owner.kind === "recipe" && !isBroadSourcePattern(file, owner.pattern)
}

const isFocusedSideEffectOwner = (file: string, owner: OwnershipPattern): boolean =>
  (owner.role === "managed-recipe" || owner.kind === "recipe") && !isBroadSourcePattern(file, owner.pattern)

const isRoleSpecificFinalOwner = (
  classification: FileClassification,
  owner: OwnershipPattern,
): boolean => {
  if (owner.kind === "package-bootstrap") return false
  if (classification.role === "source") return !isBroadSourcePattern(classification.path, owner.pattern)
  return true
}

const expectedOwnerKindFor = (classification: FileClassification): string => {
  switch (classification.role) {
    case "source":
      if (classification.sideEffectReason !== undefined) return "RecipeOrManagedRecipe"
      return expectedRecipeRoleFor(classification.path, classification.role) ?? "Recipe"
    case "test":
    case "fixture":
      return "TestRecipe"
    case "generated":
    case "projection-output":
      return "ProjectionRecipe"
    case "configuration":
    case "package-metadata":
      return "ConfigRecipe"
    case "nix-toolchain":
      return "ToolchainRecipe"
    case "openspec":
      return "OpenSpecChangeRecipe"
    case "documentation":
    case "report-projection":
      return "DocumentationRecipe"
    case "runtime-sql":
      return "RuntimeRecipe"
    case "schema":
      return "SchemaRecipe"
    case "asset":
      return "AssetPolicy"
    case "historical/quarantined":
      return "HistoricalQuarantinePolicy"
    case "ignored/external":
      return "ReviewedExternalPolicy"
  }
}

const expectedRecipeRoleFor = (file: string, role: FileRole): string | undefined => {
  if (role === "test" || role === "fixture") return "test"
  if (role === "generated" || role === "projection-output") return "projection"
  if (role === "configuration" || role === "package-metadata") return "config"
  if (role === "nix-toolchain") return "toolchain"
  if (role === "openspec") return "openspec"
  if (role === "documentation" || role === "report-projection") return "documentation"
  if (role === "runtime-sql") return "runtime"
  if (role === "schema") return "schema"
  if (role === "asset") return "asset"
  if (/(^|\/)(cli|.*Cli)\.ts$/u.test(file)) return "invocation"
  if (/diagnostic/i.test(path.basename(file))) return "diagnostic"
  if (/repair/i.test(path.basename(file))) return "repair"
  if (/observation|receipt/i.test(path.basename(file))) return "observation"
  if (/lifecycle|alchemy|resource/i.test(path.basename(file))) return "managed-recipe"
  return undefined
}

const diagnosticForTarget = (
  target: FileAccountingTarget,
  owners: readonly OwnershipPattern[],
): TrellisLsDiagnostic | undefined => {
  const classificationDiagnostic = target.classificationConfidence < 0.75
    ? "trellis/file-inventory-unclassified"
    : undefined
  const code = classificationDiagnostic ??
    accountingIssueDiagnosticCode(target) ??
    specializationDiagnosticCode(target.path, target.fileRole, owners)
  if (code === undefined) return undefined
  const repairRecipeId = repairRecipeIdForDiagnosticCode(code)
  const validationTarget = validationTargetForPackageRoot(target.packageRootId)
  const blastRadius = blastRadiusForPackageRoot(target.packageRootId)
  const packetLevel = accountingPacketLevelForTarget(target)
  return {
    id: stableTrellisLsId("diag", [
      "trellis",
      code,
      target.packageRootId,
      target.fileRole,
      target.expectedOwnerKind,
      target.path,
    ]),
    source: "trellis",
    code,
    severity: target.risk === "unsafe" ? "error" : "warning",
    message: `${target.path} is ${target.missingOrAmbiguousOwnershipReason ?? "not accounted for"} (${target.fileRole}, expected ${target.expectedOwnerKind}).`,
    file: target.path,
    repairIds: [],
    tags: [
      ...fileAccountingDiagnosticTags,
      `file-role:${target.fileRole}`,
      `package-root:${target.packageRootId}`,
      `expected-owner:${target.expectedOwnerKind}`,
      `packet-level:${packetLevel}`,
      `repair-recipe:${repairRecipeId}`,
      `validation-target:${validationTarget}`,
      `repairability:${target.repairability}`,
      `risk:${target.risk}`,
      `blast-radius:${blastRadius}`,
      `packet-group:${target.packageRootId}|${target.fileRole}|${target.expectedOwnerKind}|${repairRecipeId}|${validationTarget}|${target.risk}|${blastRadius}`,
    ],
  }
}

const accountingPacketLevelForTarget = (target: FileAccountingTarget): string => {
  const reason = target.missingOrAmbiguousOwnershipReason ?? ""
  if (target.path === "<repository>" || target.packageRootId === "workspace") {
    return "level-0-repo-accounting"
  }
  if (reason.includes("defineRecipePackage") || reason.includes("package/root") || reason.includes("broad package")) {
    return "level-1-package-ownership"
  }
  if (
    target.fileRole === "source" ||
    target.fileRole === "test" ||
    target.fileRole === "fixture" ||
    target.fileRole === "generated" ||
    target.fileRole === "projection-output" ||
    target.fileRole === "documentation" ||
    target.fileRole === "configuration" ||
    target.fileRole === "nix-toolchain" ||
    target.fileRole === "runtime-sql" ||
    target.fileRole === "openspec"
  ) {
    return "level-2-role-ownership"
  }
  return "level-3-residual-manual"
}

const accountingIssueDiagnosticCode = (target: FileAccountingTarget): string | undefined => {
  if (target.missingOrAmbiguousOwnershipReason?.startsWith("ambiguous ownership") === true) {
    return "trellis/file-unowned-by-recipe"
  }
  if (target.missingOrAmbiguousOwnershipReason?.startsWith("tracked generated") === true) {
    return "trellis/generated-code-tracked"
  }
  if (target.missingOrAmbiguousOwnershipReason?.startsWith("side effect is not expressed") === true) {
    return "trellis/side-effect-not-recipe-owned"
  }
  if (target.missingOrAmbiguousOwnershipReason?.startsWith("broad package/source ownership is bootstrap-only") === true) {
    return "trellis/source-file-unowned-by-recipe"
  }
  if (target.currentOwner !== undefined) return undefined
  switch (target.fileRole) {
    case "source":
      return "trellis/source-file-unowned-by-recipe"
    case "test":
    case "fixture":
      return "trellis/test-file-unowned-by-test-recipe"
    case "generated":
    case "projection-output":
      return "trellis/generated-output-not-projection-recipe"
    case "configuration":
    case "package-metadata":
    case "schema":
      return "trellis/config-not-config-recipe"
    case "nix-toolchain":
      return "trellis/nix-not-toolchain-recipe"
    case "runtime-sql":
      return "trellis/sql-not-runtime-recipe"
    case "documentation":
    case "report-projection":
      return "trellis/docs-not-documentation-recipe"
    case "openspec":
      return "trellis/openspec-not-change-recipe"
    case "asset":
      return "trellis/asset-not-classified"
    case "historical/quarantined":
      return "trellis/historical-file-not-quarantined"
    case "ignored/external":
      return undefined
  }
}

const repairRecipeIdForDiagnosticCode = (code: string): string =>
  `trellis-language-service.file-accounting.${code.replace(/^trellis\//u, "").replace(/[^A-Za-z0-9._:-]+/gu, "-")}`

const validationTargetForPackageRoot = (_packageRootId: string): string =>
  "workspace:packetized-architecture-judge"

const blastRadiusForPackageRoot = (packageRootId: string): "package" | "workspace" =>
  packageRootId.startsWith("packages/") ? "package" : "workspace"

const specializationDiagnosticCode = (
  file: string,
  role: FileRole,
  owners: readonly OwnershipPattern[],
): string | undefined => {
  if (role === "ignored/external" || role === "historical/quarantined") return undefined
  if (owners.length === 0) return undefined
  const expectedRole = expectedRecipeRoleFor(file, role)
  if (
    expectedRole === undefined ||
    owners.some((owner) =>
      owner.role === expectedRole &&
      isRoleSpecificFinalOwner({ path: file, role, confidence: 1, reason: "specialization check" }, owner)
    )
  ) return undefined
  if (expectedRole === "invocation") return "trellis/workflow-not-invocation-recipe"
  if (expectedRole === "projection") return "trellis/generated-output-not-projection-recipe"
  if (expectedRole === "test") return "trellis/test-file-unowned-by-test-recipe"
  if (expectedRole === "diagnostic") return "trellis/diagnostic-logic-not-diagnostic-recipe"
  if (expectedRole === "repair") return "trellis/repair-logic-not-repair-recipe"
  if (expectedRole === "observation") return "trellis/observation-not-observation-recipe"
  if (expectedRole === "managed-recipe") return "trellis/lifecycle-not-managed-recipe"
  if (expectedRole === "config") return "trellis/config-not-config-recipe"
  if (expectedRole === "toolchain") return "trellis/nix-not-toolchain-recipe"
  if (expectedRole === "openspec") return "trellis/openspec-not-change-recipe"
  if (expectedRole === "documentation") return "trellis/docs-not-documentation-recipe"
  if (expectedRole === "runtime") return "trellis/sql-not-runtime-recipe"
  if (expectedRole === "asset") return "trellis/asset-not-classified"
  return undefined
}

const generatedOwnerForFile = (
  workspaceRoot: string,
  classification: FileClassification,
): readonly OwnershipPattern[] => {
  if (classification.role !== "generated" && classification.role !== "projection-output") return []
  const absolute = path.join(workspaceRoot, classification.path)
  if (!fs.existsSync(absolute)) return []
  const text = fs.readFileSync(absolute, "utf8").slice(0, 4096)
  const recipe = /@generated\s+by\s+recipe\s+(?<recipeId>[A-Za-z0-9._:-]+)/u.exec(text)?.groups?.recipeId
  const projection = /\bprojection:\s*(?<projectionId>[A-Za-z0-9._:-]+)/u.exec(text)?.groups?.projectionId
  if (recipe === undefined && projection === undefined) return []
  return [{
    pattern: classification.path,
    owner: recipe ?? projection ?? "generated-marker",
    role: "projection",
    kind: "generated-marker",
  }]
}

const repairabilityForRole = (role: FileRole): "deterministic" | "guided" | "manual" | "not-repairable" => {
  switch (role) {
    case "source":
    case "test":
    case "fixture":
    case "generated":
    case "projection-output":
      return "guided"
    case "historical/quarantined":
    case "ignored/external":
      return "manual"
    default:
      return "deterministic"
  }
}

const riskForRole = (role: FileRole): "safe" | "needs-review" | "manual" | "unsafe" => {
  switch (role) {
    case "source":
    case "generated":
    case "projection-output":
    case "runtime-sql":
      return "needs-review"
    case "historical/quarantined":
    case "ignored/external":
      return "manual"
    default:
      return "safe"
  }
}

const discoverRecipePackageOwnership = (workspaceRoot: string): readonly RecipePackageOwnershipSummary[] =>
  findFiles(path.join(workspaceRoot, "packages"))
    .filter((file) => {
      const normalized = file.replaceAll(path.sep, "/")
      return normalized.endsWith("/src/recipes.ts") || normalized.endsWith("/src/recipes/index.ts")
    })
    .flatMap((file) => recipePackageOwnershipFromSource(workspaceRoot, file))

const recipePackageOwnershipFromSource = (
  workspaceRoot: string,
  file: string,
): readonly RecipePackageOwnershipSummary[] => {
  const text = fs.readFileSync(file, "utf8")
  if (!/\bdefineRecipePackage\s*\(/u.test(text)) return []
  const packageId = stringProperty(text, "packageId") ?? path.basename(path.dirname(path.dirname(file)))
  const sourceRoot = stringProperty(text, "sourceRoot") ?? relativeToWorkspace(workspaceRoot, path.dirname(file))
  const packageRootId = packageRootForFile(sourceRoot)
  const declarationPath = relativeToWorkspace(workspaceRoot, file)
  const recipePatterns = recipeOwnershipPatterns(text)
  const localRecipePatterns = packageRootRecipeOwnershipPatterns(workspaceRoot, packageRootId, declarationPath)
  const ownershipPatterns = arrayPropertyValues(text, "files").map((pattern) => ({
    pattern,
    owner: `${packageId}.ownership`,
    kind: "ownership-group" as const,
  }))
  return [{
    packageId,
    sourceRoot,
    packageRootId,
    patterns: [
      {
        pattern: sourceRoot.endsWith("/src") ? `${sourceRoot}/**` : sourceRoot,
        owner: `${packageId}.package`,
        kind: "package-bootstrap",
      },
      {
        pattern: declarationPath,
        owner: `${packageId}.recipe-package-declaration`,
        kind: "recipe",
      },
      ...recipePatterns,
      ...localRecipePatterns,
      ...ownershipPatterns,
    ],
  }]
}

const packageRootRecipeOwnershipPatterns = (
  workspaceRoot: string,
  packageRootId: string,
  declarationPath: string,
): readonly OwnershipPattern[] => {
  const absolutePackageRoot = path.join(workspaceRoot, packageRootId)
  if (!fs.existsSync(absolutePackageRoot)) return []
  return findFiles(absolutePackageRoot)
    .filter((sourceFile) => {
      const relative = relativeToWorkspace(workspaceRoot, sourceFile)
      return relative !== declarationPath &&
        /\.(?:ts|tsx|mts|cts)$/u.test(relative) &&
        !relative.endsWith(".d.ts") &&
        !isIgnoredInventoryPath(relative)
    })
    .flatMap((sourceFile) => recipeOwnershipPatterns(fs.readFileSync(sourceFile, "utf8")))
}

const recipeOwnershipPatterns = (text: string): readonly OwnershipPattern[] => {
  const patterns: OwnershipPattern[] = []
  const constStrings = constStringVariableValuesFor(text)
  const recipePattern = /\bdefine(?<kind>ExternalSchemaManaged|ExternalSchema|ManagedExecutable|Managed|Projection|Diagnostic|Repair|Observation|Invocation|Judge|Documentation|Toolchain|Config|OpenSpecChange|Test|Runtime|Schema|Asset)?Recipe\b\s*(?:<[\s\S]*?>)?\s*\(\s*\{(?<body>[\s\S]*?)\n\s*\}\s*\)/gu
  for (const match of text.matchAll(recipePattern)) {
    const body = match.groups?.body ?? ""
    const id = constStrings.get(identifierProperty(body, "id") ?? "") ??
      stringProperty(body, "id") ??
      "unknown-recipe"
    const role = recipeRoleForDefineKind(match.groups?.kind, id, body)
    const values = [
      ...arrayPropertyValues(body, "allowedFiles", constStrings),
      ...arrayPropertyValues(body, "entrypoints", constStrings),
      ...arrayPropertyValues(body, "outputs", constStrings),
      ...arrayPropertyValues(body, "observedFiles", constStrings),
      ...arrayPropertyValues(body, "affectedFiles", constStrings),
    ]
    for (const pattern of values) {
      patterns.push({
        pattern,
        owner: id,
        kind: "recipe",
        ...(role === undefined ? {} : { role }),
      })
    }
  }
  return patterns
}

const recipeRoleForDefineKind = (kind: string | undefined, id = "", body = ""): string | undefined => {
  switch (kind) {
    case "ExternalSchema":
      return /generated|generation|codegen|code-generation|type-generation/iu.test(`${id}\n${body}`)
        ? "projection"
        : undefined
    case "ExternalSchemaManaged":
    case "ManagedExecutable":
    case "Managed":
      return "managed-recipe"
    case "Projection":
      return "projection"
    case "Diagnostic":
      return "diagnostic"
    case "Repair":
      return "repair"
    case "Observation":
      return "observation"
    case "Invocation":
      return "invocation"
    case "Judge":
      return "judge"
    case "Documentation":
      return "documentation"
    case "Toolchain":
      return "toolchain"
    case "Config":
      return "config"
    case "OpenSpecChange":
      return "openspec"
    case "Test":
      return "test"
    case "Runtime":
      return "runtime"
    case "Schema":
      return "schema"
    case "Asset":
      return "asset"
    default:
      return undefined
  }
}

const stringProperty = (text: string, property: string): string | undefined => {
  const match = new RegExp(`\\b${property}\\s*:\\s*["'](?<value>[^"']+)["']`, "u").exec(text)
  return match?.groups?.value
}

const identifierProperty = (text: string, property: string): string | undefined => {
  const match = new RegExp(`\\b${property}\\s*:\\s*(?<value>[A-Za-z_$][\\w$]*)\\b`, "u").exec(text)
  return match?.groups?.value
}

const constStringVariableValuesFor = (text: string): ReadonlyMap<string, string> => {
  const values = new Map<string, string>()
  const pattern = /\bconst\s+(?<name>[A-Za-z_$][\w$]*)\s*=\s*["'](?<value>[^"']+)["'](?:\s+as\s+const)?/gu
  for (const match of text.matchAll(pattern)) {
    const name = match.groups?.name
    const value = match.groups?.value
    if (name !== undefined && value !== undefined) values.set(name, value)
  }
  return values
}

const arrayPropertyValues = (
  text: string,
  property: string,
  constStrings: ReadonlyMap<string, string> = new Map(),
): readonly string[] => {
  const values: string[] = []
  const pattern = new RegExp(`\\b${property}\\s*:\\s*\\[(?<body>[\\s\\S]*?)\\]`, "gu")
  for (const match of text.matchAll(pattern)) {
    const body = match.groups?.body ?? ""
    for (const literal of body.matchAll(/["'](?<value>[^"']+)["']/gu)) {
      if (literal.groups?.value !== undefined) values.push(literal.groups.value)
    }
    for (const identifier of body.matchAll(/\b(?<value>[A-Za-z_$][\w$]*)\b/gu)) {
      const value = constStrings.get(identifier.groups?.value ?? "")
      if (value !== undefined) values.push(value)
    }
  }
  return values
}

const ownersForPath = (
  file: string,
  recipePackages: readonly RecipePackageOwnershipSummary[],
): readonly OwnershipPattern[] =>
  recipePackages.flatMap((recipePackage) =>
    recipePackage.patterns.filter((pattern) => pathMatchesPattern(file, pattern.pattern))
  )

const packageRootForFile = (file: string): string => {
  const match = /^packages\/(?:(?:attune|canopy|tend|trellis)\/[^/]+|[^/]+)/u.exec(file)
  if (match !== null) return match[0]
  if (file.startsWith("openspec/")) return "openspec"
  if (file.startsWith("docs/")) return "docs"
  if (file.startsWith("nix/")) return "nix"
  if (file.startsWith(".codex/")) return "codex"
  return "workspace"
}

const pathMatchesPattern = (file: string, pattern: string): boolean => {
  const normalizedFile = file.replaceAll(path.sep, "/")
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

const isBroadSourcePattern = (file: string, pattern: string): boolean => {
  const normalizedPattern = pattern.replaceAll(path.sep, "/")
  const packageRoot = packageRootForFile(file)
  const packageScope = /^packages\/[^/]+/u.exec(packageRoot)?.[0]
  return normalizedPattern === `${packageRoot}/**` ||
    normalizedPattern === `${packageRoot}/src/**` ||
    normalizedPattern === `${packageRoot}/src` ||
    (packageScope !== undefined && normalizedPattern === `${packageScope}/**`) ||
    normalizedPattern.startsWith("packages/**") ||
    normalizedPattern === "packages/**" ||
    normalizedPattern === "packages/**/src/**" ||
    normalizedPattern === "**"
}

const trackedGeneratedOwnershipFailureReason = (classification: FileClassification): string | undefined => {
  if (classification.trackedGeneratedKind === "code") {
    return `tracked generated code must leave source control or be quarantined: ${classification.trackedGeneratedReason ?? "generated code candidate"}`
  }
  if (classification.trackedGeneratedKind === "artifact") {
    return `tracked generated artifact needs reviewed projection ownership, fixture ownership, or quarantine: ${classification.trackedGeneratedReason ?? "generated artifact candidate"}`
  }
  return undefined
}

const trackedGeneratedCodeReason = (
  classification: FileClassification,
  workspaceRoot: string,
): string | undefined => {
  const file = classification.path
  const absolute = path.join(workspaceRoot, file)
  if (!isCodeLikeFile(file)) return undefined
  if (isTrackedBuildOutput(file)) return "tracked build output path"
  if (isGeneratedJavaScriptCompanion(file, workspaceRoot)) {
    return "checked-in JavaScript/CJS/MJS companion generated from TypeScript"
  }
  if (hasGeneratedProvenanceMarker(absolute)) return "generated provenance marker"
  if (isGeneratedPathOrSuffix(file)) return "generated path or filename suffix"
  return undefined
}

const trackedGeneratedArtifactReason = (
  classification: FileClassification,
  workspaceRoot: string,
): string | undefined => {
  const file = classification.path
  const absolute = path.join(workspaceRoot, file)
  if (isCodeLikeFile(file)) return undefined
  if (isTrackedBuildOutput(file)) return "tracked build output path"
  if (isGeneratedPathOrSuffix(file)) return "generated path or filename suffix"
  if (hasGeneratedProvenanceMarker(absolute)) return "generated provenance marker"
  return undefined
}

const isCodeLikeFile = (file: string): boolean =>
  /\.(?:[cm]?[jt]sx?|java)$/u.test(file)

const isGeneratedPathOrSuffix = (file: string): boolean =>
  /(^|\/)(generated|__generated__|dist)(\/|$)|\.generated\.[cm]?[jt]sx?$/u.test(file)

const isTrackedBuildOutput = (file: string): boolean =>
  /(^|\/)(dist|out-tsc)(\/|$)/u.test(file) ||
  /^packages\/dist\//u.test(file)

const isGeneratedJavaScriptCompanion = (file: string, workspaceRoot: string): boolean => {
  if (!/^packages\/.+\/src\/.+\.(?:cjs|mjs|js)$/u.test(file)) return false
  const source = file.replace(/\.(?:cjs|mjs|js)$/u, ".ts")
  return fs.existsSync(path.join(workspaceRoot, source))
}

const hasGeneratedProvenanceMarker = (absolute: string): boolean => {
  if (!fs.existsSync(absolute)) return false
  try {
    const stat = fs.statSync(absolute)
    if (!stat.isFile() || stat.size > 5_000_000) return false
    const header = fs.readFileSync(absolute, "utf8").split(/\r?\n/u).slice(0, 12).join("\n")
    return /^[\s/*#<!-]*@generated\s+by\s+recipe\b/mu.test(header) ||
      /^[\s/*#<!-]*projection:\s*[A-Za-z0-9._:-]+/mu.test(header)
  } catch {
    return false
  }
}

const sourceSideEffectReason = (absolute: string): string | undefined => {
  if (!fs.existsSync(absolute)) return undefined
  try {
    const stat = fs.statSync(absolute)
    if (!stat.isFile() || stat.size > 5_000_000) return undefined
    const text = fs.readFileSync(absolute, "utf8")
    const checks: readonly [RegExp, string][] = [
      [/\bfrom\s+["']node:(?:fs|fs\/promises|child_process|process|http|https|net|tls|dgram|worker_threads|readline)["']/u, "Node side-effect module import"],
      [/\bimport\s+[^"']*["'](?:fs|fs\/promises|child_process|pg|postgres|kysely|execa)["']/u, "side-effect module import"],
      [/\b(?:fs|childProcess)\s*\./u, "filesystem or child-process API usage"],
      [/\b(?:writeFileSync|writeFile|mkdirSync|mkdir|rmSync|rm|renameSync|rename|copyFileSync|copyFile|execFileSync|execFile|spawnSync|spawn)\s*\(/u, "filesystem or process mutation call"],
      [/\bprocess\.(?:env|argv|cwd|chdir|exit|stdout|stderr|stdin)\b/u, "process environment or stdio access"],
      [/\bfetch\s*\(|\bnew\s+WebSocket\s*\(|\bcreateServer\s*\(/u, "network boundary usage"],
      [/\b(?:alchemy|ManagedRecipe|resourceKind|lifecycleSubstrates)\b/u, "lifecycle or managed-resource boundary"],
      [/\b(?:generate|codegen|writeGenerated|projection)\b/iu, "generation/projection boundary"],
    ]
    return checks.find(([pattern]) => pattern.test(text))?.[1]
  } catch {
    return undefined
  }
}

const findFiles = (root: string): readonly string[] => {
  if (!fs.existsSync(root)) return []
  const files: string[] = []
  const visit = (directory: string): void => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      if ([".attune", ".git", ".nx", "dist", "node_modules"].includes(entry.name)) continue
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

const isIgnoredInventoryPath = (file: string): boolean =>
  /(^|\/)(node_modules|dist|\.git|\.attune|\.nx)(\/|$)/u.test(file)
