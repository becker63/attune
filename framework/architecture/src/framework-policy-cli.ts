#!/usr/bin/env node
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

import {
  checkFrameworkImportBoundary,
  type FrameworkImportBoundaryDiagnostic,
  type FrameworkImportBoundaryFile,
} from "./framework-import-boundary.js"
import {
  checkAtomImplementationPolicy,
  type AtomImplementationPolicyDiagnostic,
  type AtomImplementationPolicyFile,
} from "./framework-atom-implementation-policy.js"
import {
  checkFrameworkNoReportPolicy,
  type FrameworkNoReportDiagnostic,
  type FrameworkNoReportFile,
} from "./framework-no-report-policy.js"
import { CanonicalDiagnosticRuleIds, isDiagnosticRuleAllowedForSymbol, type DiagnosticRuleId } from "../../protocol/src/project-facts/index.js"

interface WorkspaceFile {
  readonly path: string
  readonly content: string
}

export type FrameworkPolicyCheck =
  | "all"
  | "import-boundary"
  | "no-report"
  | "atom-graph"
  | "property-evidence"
  | "coverage-conformance"
  | "policy-surface"
  | "final-ratchet"

export interface FrameworkPolicyWorkspaceOptions {
  readonly checks?: readonly FrameworkPolicyCheck[]
}

export interface FrameworkPolicyWorkspaceResult {
  readonly importDiagnostics: readonly FrameworkImportBoundaryDiagnostic[]
  readonly atomImplementationDiagnostics: readonly AtomImplementationPolicyDiagnostic[]
  readonly noReportDiagnostics: readonly FrameworkNoReportDiagnostic[]
  readonly ratchetDiagnostics: readonly FrameworkFinalRatchetDiagnostic[]
  readonly outputLines: readonly string[]
  readonly exitCode: number
}

export const FrameworkFinalRatchetRuleId = "attune/framework-final-ratchet" as const
export const PackageLocalAttuneSurfaceRuleId = "attune/package-local-surface/one-attune-file" as const

export type FrameworkFinalRatchetRuleId =
  | typeof FrameworkFinalRatchetRuleId
  | typeof PackageLocalAttuneSurfaceRuleId

export type FrameworkFinalRatchetDiagnosticCode =
  | "missing-project-facts"
  | "missing-package-view-graph"
  | "missing-property-evidence-harness"
  | "operation-missing-reactivity-touch"
  | "dead-reactivity-key"
  | "unobserved-operation-reactivity-key"
  | "derived-atom-direct-reactivity-subscription"
  | "missing-coverage-conformance"
  | "worker-target-metadata"
  | "package-local-scripts"
  | "arbitrary-run-commands"
  | "stale-architecture-lint-reference"
  | "stale-policy-architecture-guidance"
  | "expired-migration-waiver"
  | "duplicate-operation-id"
  | "invalid-law-id"
  | "invalid-view-reference"
  | "hidden-configuration-without-waiver"
  | "migration-only-alias"
  | "stale-generated-file"
  | "manual-derived-truth"
  | "old-ontology-runtime-object"
  | "old-ontology-diagnostic-copy"
  | "old-ontology-active-doc"
  | "old-authored-project-api"
  | "project-facts-too-large"
  | "package-local-attune-companion"
  | "package-local-attune-companion-import"

export interface FrameworkFinalRatchetDiagnostic {
  readonly ruleId: FrameworkFinalRatchetRuleId
  readonly code: FrameworkFinalRatchetDiagnosticCode
  readonly severity: "error" | "warning"
  readonly filePath: string
  readonly message: string
}

const sourceFilePattern = /\.(cjs|cts|js|jsx|mjs|mts|ts|tsx)$/u
const reportFilePattern = /\.(json|jsonc|md|mdx|txt)$/u
const ignoredDirs = new Set([
  ".git",
  ".nx",
  "coverage",
  "dist",
  "node_modules",
  "tmp",
  "temp",
])

const reportPathPattern =
  /(^|\/)(reports?|artifacts?|agent-output|protocol-output|\.attune\/protocol)(\/|$)|\b(protocol[-_. ]?delta|delta[-_. ]?report|obligation[-_. ]?(report|summary|status)|evidence[-_. ]?(summary|report|status)|architecture[-_. ]?(summary|report|status)|cloud[-_. ]?agent[-_. ]?(summary|report|status)|github[-_. ]?(summary|report|status)|linear[-_. ]?(summary|report|status)|(fuzz|fuzzer|property|proof|run)[-_. ]?(report|summary|status)|(report|summary|status)[-_. ]?(fuzz|fuzzer|property|proof|run))\b/iu

const policyClockDate = "2026-06-22"

const packageViewGraphPattern = /\bdefinePackageViews\s*\(|\bPackageViews\b/u
const packageContractViewsRegistrationPattern = /\bviews\s*:\s*PackageViews\b/u
const serviceOperationPattern = /\b(?:defineOperation|command|projection|eventFacade|resourceProvider|generator|policyRule|joernTemplate)\s*\(/u
const propertyEvidenceHarnessPattern =
  /\b(PackageProperties|PackageFuzzHandlers|PackageTypeGuidance|PackageFuzzRpcGroup|defineTypeGuidance|propertyFor\s*\(|coverageSearch|evidenceProducer)\b/u
const coverageConformancePattern =
  /\b(PackageTypeGuidance|defineTypeGuidance|coverageSearch|coverageExpectations|coverageConformance)\b/u
const explicitWaiverPattern = /\bwaivers\s*:\s*\[(?!\s*\]\s*as\s+const)/u
const waiverDatePattern =
  /\b(?:expires|expiresOn|expiresAt|reviewBy|reviewDate)\s*:\s*["'](?<date>\d{4}-\d{2}-\d{2})["']/gu
const stalePolicyArchitectureTargetPattern = /\bworkspace:policy-architecture\b/u
const hiddenConfigurationPattern =
  /\b(?:hiddenConfiguration|hiddenConfig|hiddenConfigurationDependencies|hiddenConfigDependencies)\s*:\s*(?:true|\[|\{)/u
const hiddenConfigurationWaiverPattern = /\bcategory\s*:\s*["']hidden-configuration["']/u
const migrationOnlyAliasPattern =
  /\b(?:migrationOnlyAlias|migrationAlias|compatibilityExport|diagnosticsOnlyException|reportOnlyException)\s*:\s*true\b/u
const staleGeneratedMarkerPattern =
  /\b(?:attune-stale-generated|staleGenerated|generatedArtifactStale|needs-regeneration)\b/u
const manualDerivedTruthMarkerPattern =
  /\b(?:attune-manual-derived-truth|manualProtocolTruth|manualDerivedTruth|derivedTruth\s*:\s*["']manual["'])\b/u
const oldOntologyRuntimeObjectPattern =
  /\b(?:export\s+)?(?:interface|type|class|const)\s+ProgramIndex(?<name>PackageContract|ProtocolDescriptor|Protocol|Operation|PackageView|Law|Obligation|Evidence|Delta|TypeGuidance|SourceBOM|SourceBom|GeneratorShape|FuzzHandler|PropertyMap|RpcGroup)\b/u
const oldOntologyRuntimeTablePattern =
  /\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?<name>package_contract|protocol_descriptor|protocol|operation|package_view|view|law|obligation|evidence|delta|type_guidance|source_bom|generator_shape|fuzz_handler|property_map|rpc_group)\b/iu
const oldOntologyActiveDocNounPattern =
  /\b(?<term>package[- ]contracts?|protocol(?:store|delta)?|operations?|package[- ]views?|view roots?|view graph|operation-to-view|laws?|obligations?|evidence|deltas?|source[- ]bom|generator[- ]shapes?|type[- ]guidance|fuzz handlers?|property maps?|rpc groups?|generated companions?)\b/iu
const diagnosticMessageLinePattern = /\bmessage\s*:/u
const oldAuthoredDeclarationApiPattern =
  /\b(?<name>PackageDeclaration|PackageViewRoots|defineAttunePackageDeclaration|PackageContractSchema)\b/gu
const authoredProjectFactsPattern =
  /\b(?:ProjectFacts|defineAttuneProjectFacts)\b/u
const activeOperatingDocPaths = new Set([
  "AGENTS.md",
  "docs/attuned/Attune Framework Operating Surface.md",
  "docs/attuned/Attune Framework Core Primitives.md",
  "docs/codex-migration-goal.md",
  "docs/platform/codex-cloud-environment.md",
])
const packageDeclarationWarningLineThreshold = 180
const packageDeclarationErrorLineThreshold = 260
const packageLocalAttuneCompanionNames = [
  "src/attune.contract.generated.ts",
  "src/attune.generated.ts",
  "src/attune.package.typecheck.ts",
  "attune.source-bom.json",
] as const
const packageLocalAttuneCompanionImportPattern =
  /\b(?:from\s+|import\s*\(\s*|require\s*\(\s*|import\s+(?:type\s+)?)(?<quote>["'])(?<source>\.{1,2}\/[^"']*attune\.(?:contract\.generated|generated|package\.typecheck)(?:\.[cm]?[jt]sx?)?)\k<quote>/gu
const oneFileSurfaceCompletedRoots = new Set([
  "framework/architecture",
  "packages/attune-nx",
  "packages/attune-pi-agent",
  "packages/attune-foldkit",
  "packages/attuned-discovery",
  "packages/cocoindex-effect",
  "packages/home-deployment",
  "packages/joern-effect",
  "packages/joern-effect-properties",
  "packages/platform-alchemy-k8s",
  "framework/oxlint-policy",
])

const staleArchitecturePackageIdentity = ["attune-architecture", "lint"].join("-")

// Historical OpenSpec records may mention the old architecture package
// identity. Active package, framework, config, and docs surfaces must not.
const historicalArchitectureLintReferencePaths = [
  /^openspec\/changes\/standardize-effect-package-contracts\//u,
  /^openspec\/changes\/enforce-nix-agent-policy-gates\//u,
]

// TODO(atom-reactivity migration debt): these contracts already expose package
// view atoms, but their current source metadata does not yet model every
// Reactivity key through rich base-atom subscription nodes. Remove entries as
// project-facts sync emits baseAtoms/derivedAtoms/packageViewAtoms metadata.
const temporaryAtomReactivityDebt = [
  {
    packageRoot: "packages/attuned-discovery",
    code: "unobserved-operation-reactivity-key",
    id: "event-facade:attuned-discovery.event-log.appended",
  },
  {
    packageRoot: "packages/attuned-discovery",
    code: "unobserved-operation-reactivity-key",
    id: "domain-event-codecs:attuned-discovery.domain-codec.changed",
  },
  {
    packageRoot: "packages/joern-effect",
    code: "derived-atom-direct-reactivity-subscription",
    id: "joern-runtime-view-atoms:joernRuntimeAtom",
  },
  {
    packageRoot: "packages/joern-effect",
    code: "derived-atom-direct-reactivity-subscription",
    id: "joern-runtime-view-atoms:cpgProgramBuilderAtom",
  },
  {
    packageRoot: "packages/joern-effect",
    code: "derived-atom-direct-reactivity-subscription",
    id: "generated-dsl-view-atoms:traversalDslAtom",
  },
] as const

const meaningfulMutationOperationKinds = new Set([
  "command",
  "projection",
  "event-facade",
  "resource-provider",
  "generator",
])

interface PackageAtomGraph {
  readonly reactivityKeys: readonly string[]
  readonly atoms: readonly string[]
  readonly baseAtoms: readonly AtomGraphNode[]
  readonly derivedAtoms: readonly AtomGraphNode[]
  readonly packageViewAtoms: readonly AtomGraphNode[]
}

interface AtomGraphNode {
  readonly id: string
  readonly reads: readonly string[]
  readonly refreshesOn: readonly string[]
}

interface OperationViewMetadata {
  readonly id: string
  readonly kind: string
  readonly reactivityKeys: readonly string[]
  readonly atoms: readonly string[]
  readonly baseAtoms: readonly string[]
  readonly derivedAtoms: readonly string[]
  readonly packageViewAtoms: readonly string[]
  readonly subscribesTo: readonly string[]
  readonly hasAnyViewTouch: boolean
  readonly hasUnknownReactivityKeys: boolean
  readonly hasUnknownAtoms: boolean
  readonly hasDirectDurableRead: boolean
}

export const checkFrameworkPolicyWorkspace = (
  root: string,
  options: FrameworkPolicyWorkspaceOptions = {},
): FrameworkPolicyWorkspaceResult => {
  const workspaceRoot = path.resolve(root)
  const files = collectFiles(workspaceRoot)
  const selectedChecks = normalizePolicyChecks(options.checks)

  const importResultRaw = checkFrameworkImportBoundary({
    files: files
      .filter((file) => sourceFilePattern.test(file.path))
      .map((file): FrameworkImportBoundaryFile => ({ path: file.path, content: file.content })),
  })
  const importDiagnostics = isPolicyCheckEnabled(selectedChecks, "import-boundary")
    ? importResultRaw.diagnostics.filter(
      (diagnostic) => !isTemporaryFrameworkPolicyWaiver(diagnostic.filePath, diagnostic.importSource),
    )
    : []

  const atomImplementationResult = checkAtomImplementationPolicy({
    files: files
      .filter((file) => sourceFilePattern.test(file.path))
      .map((file): AtomImplementationPolicyFile => ({ path: file.path, content: file.content })),
  })
  const atomImplementationDiagnostics = isPolicyCheckEnabled(selectedChecks, "atom-graph")
    ? atomImplementationResult.diagnostics
    : []
  const noReportResult = checkFrameworkNoReportPolicy({
    files: files
      .filter(isProtocolReportCandidate)
      .map((file): FrameworkNoReportFile => ({ path: file.path, content: file.content })),
  })
  const noReportDiagnostics = isPolicyCheckEnabled(selectedChecks, "no-report")
    ? noReportResult.diagnostics
    : []
  const ratchetDiagnostics = checkFinalRatchetPolicy(files)
    .filter((diagnostic) => isRatchetDiagnosticEnabled(selectedChecks, diagnostic.code))

  const outputLines = [
    ...importDiagnostics.map(formatImportDiagnostic),
    ...atomImplementationDiagnostics.map(formatAtomImplementationDiagnostic),
    ...noReportDiagnostics.map(formatNoReportDiagnostic),
    ...ratchetDiagnostics.map(formatFinalRatchetDiagnostic),
  ]
  const hasError =
    importDiagnostics.length > 0 ||
    atomImplementationDiagnostics.length > 0 ||
    noReportDiagnostics.length > 0 ||
    ratchetDiagnostics.some((diagnostic) => diagnostic.severity === "error")

  return {
    importDiagnostics,
    atomImplementationDiagnostics,
    noReportDiagnostics,
    ratchetDiagnostics,
    outputLines,
    exitCode: hasError ? 1 : 0,
  }
}

export const runFrameworkPolicyCli = (
  argv: readonly string[] = process.argv,
  writeLine: (line: string) => void = console.log,
): number => {
  const cliOptions = parseFrameworkPolicyCliArgs(argv.slice(2))
  const result = checkFrameworkPolicyWorkspace(
    cliOptions.workspaceRoot,
    cliOptions.checks === undefined ? {} : { checks: cliOptions.checks },
  )

  for (const line of result.outputLines) {
    writeLine(line)
  }

  return result.exitCode
}

interface FrameworkPolicyCliOptions {
  readonly workspaceRoot: string
  readonly checks: readonly FrameworkPolicyCheck[] | undefined
}

const parseFrameworkPolicyCliArgs = (args: readonly string[]): FrameworkPolicyCliOptions => {
  let workspaceRoot: string | undefined
  const checks: FrameworkPolicyCheck[] = []

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === undefined) continue

    if (arg === "--only" || arg === "--check") {
      const next = args[index + 1]
      if (next !== undefined) checks.push(...parsePolicyCheckList(next))
      index += 1
      continue
    }

    if (arg.startsWith("--only=") || arg.startsWith("--check=")) {
      checks.push(...parsePolicyCheckList(arg.slice(arg.indexOf("=") + 1)))
      continue
    }

    if (!arg.startsWith("--") && workspaceRoot === undefined) {
      workspaceRoot = arg
    }
  }

  return {
    workspaceRoot: path.resolve(workspaceRoot ?? process.cwd()),
    checks: checks.length === 0 ? undefined : checks,
  }
}

function parsePolicyCheckList(value: string): readonly FrameworkPolicyCheck[] {
  return value.split(",").map((entry) => parsePolicyCheck(entry.trim())).filter(
    (entry): entry is FrameworkPolicyCheck => entry !== undefined,
  )
}

function parsePolicyCheck(value: string): FrameworkPolicyCheck | undefined {
  switch (value) {
    case "all":
    case "import-boundary":
    case "no-report":
    case "atom-graph":
    case "property-evidence":
    case "coverage-conformance":
    case "policy-surface":
    case "final-ratchet":
      return value
    case "atom-graph-conformance":
      return "atom-graph"
    default:
      return undefined
  }
}

function normalizePolicyChecks(checks: readonly FrameworkPolicyCheck[] | undefined): ReadonlySet<FrameworkPolicyCheck> {
  return new Set(checks === undefined || checks.length === 0 ? ["all"] : checks)
}

function isPolicyCheckEnabled(
  checks: ReadonlySet<FrameworkPolicyCheck>,
  check: FrameworkPolicyCheck,
): boolean {
  return checks.has("all") || checks.has(check)
}

function isRatchetDiagnosticEnabled(
  checks: ReadonlySet<FrameworkPolicyCheck>,
  code: FrameworkFinalRatchetDiagnosticCode,
): boolean {
  if (checks.has("all") || checks.has("final-ratchet")) return true

  if (checks.has("atom-graph") && atomGraphDiagnosticCodes.has(code)) return true
  if (checks.has("property-evidence") && propertyEvidenceDiagnosticCodes.has(code)) return true
  if (checks.has("coverage-conformance") && coverageConformanceDiagnosticCodes.has(code)) return true
  return checks.has("policy-surface") && policySurfaceDiagnosticCodes.has(code)
}

const atomGraphDiagnosticCodes = new Set<FrameworkFinalRatchetDiagnosticCode>([
  "missing-project-facts",
  "missing-package-view-graph",
  "operation-missing-reactivity-touch",
  "dead-reactivity-key",
  "unobserved-operation-reactivity-key",
  "derived-atom-direct-reactivity-subscription",
])

const propertyEvidenceDiagnosticCodes = new Set<FrameworkFinalRatchetDiagnosticCode>([
  "missing-project-facts",
  "missing-property-evidence-harness",
  "worker-target-metadata",
])

const coverageConformanceDiagnosticCodes = new Set<FrameworkFinalRatchetDiagnosticCode>([
  "missing-project-facts",
  "missing-coverage-conformance",
])

const policySurfaceDiagnosticCodes = new Set<FrameworkFinalRatchetDiagnosticCode>([
  "package-local-scripts",
  "arbitrary-run-commands",
  "stale-architecture-lint-reference",
  "stale-policy-architecture-guidance",
  "expired-migration-waiver",
  "duplicate-operation-id",
  "invalid-law-id",
  "invalid-view-reference",
  "hidden-configuration-without-waiver",
  "migration-only-alias",
  "stale-generated-file",
  "manual-derived-truth",
  "old-ontology-runtime-object",
  "old-ontology-diagnostic-copy",
  "old-ontology-active-doc",
  "old-authored-project-api",
  "project-facts-too-large",
  "package-local-attune-companion",
])

function collectFiles(root: string): readonly WorkspaceFile[] {
  const out: WorkspaceFile[] = []

  const visit = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ignoredDirs.has(entry.name)) continue

      const absolutePath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        visit(absolutePath)
        continue
      }

      if (!entry.isFile()) continue
      const relativePath = path.relative(root, absolutePath).split(path.sep).join("/")
      if (!sourceFilePattern.test(relativePath) && !reportFilePattern.test(relativePath)) continue

      out.push({
        path: relativePath,
        content: fs.readFileSync(absolutePath, "utf8"),
      })
    }
  }

  visit(root)
  return out
}

function isProtocolReportCandidate(file: WorkspaceFile): boolean {
  const normalizedPath = file.path.replaceAll("\\", "/")
  if (normalizedPath.startsWith(".attune/cache/") || normalizedPath.startsWith(".nx/cache/")) {
    return true
  }

  return reportFilePattern.test(normalizedPath) && reportPathPattern.test(normalizedPath)
}

function checkFinalRatchetPolicy(files: readonly WorkspaceFile[]): readonly FrameworkFinalRatchetDiagnostic[] {
  const diagnostics: FrameworkFinalRatchetDiagnostic[] = []
  const filesByPath = new Map(files.map((file) => [file.path, file]))
  const activePackageRoots = findActivePackageRoots(files)

  for (const packageRoot of activePackageRoots) {
    const contractPath = `${packageRoot}/src/attune.package.ts`
    const contractFile = filesByPath.get(contractPath)

    if (contractFile === undefined) {
      diagnostics.push(finalRatchetDiagnostic(
        "missing-project-facts",
        `${packageRoot}/package.json`,
        `Active package ${packageRoot} must expose src/attune.package.ts after the project-facts migration.`,
      ))
      continue
    }

    const semanticContractFile = findSemanticPackageContractFile(packageRoot, contractFile, filesByPath)

    if (!isAuthoredProjectFactsFile(contractFile)) {
      if (
        !packageViewGraphPattern.test(semanticContractFile.content) ||
        !packageContractViewsRegistrationPattern.test(semanticContractFile.content)
      ) {
        diagnostics.push(finalRatchetDiagnostic(
          "missing-package-view-graph",
          contractPath,
          "Legacy project facts must declare PackageViews and register them through views: PackageViews while it remains compatibility input.",
        ))
      }

      if (
        !propertyEvidenceHarnessPattern.test(semanticContractFile.content) &&
        !explicitWaiverPattern.test(semanticContractFile.content)
      ) {
        diagnostics.push(finalRatchetDiagnostic(
          "missing-property-evidence-harness",
          contractPath,
          "Legacy project facts must expose generated property/evidence harness metadata or an explicit local waiver while it remains compatibility input.",
        ))
      }

      if (
        !coverageConformancePattern.test(semanticContractFile.content) &&
        !explicitWaiverPattern.test(semanticContractFile.content)
      ) {
        diagnostics.push(finalRatchetDiagnostic(
          "missing-coverage-conformance",
          contractPath,
          "Legacy project facts must expose PackageTypeGuidance, coverageSearch, or coverage expectations while it remains compatibility input.",
        ))
      }

      diagnostics.push(...checkPackageContractResidualPolicy(packageRoot, semanticContractFile))
      diagnostics.push(...checkAtomReactivityConformance(packageRoot, semanticContractFile))
    }

    diagnostics.push(...checkPackageLocalAttuneSurface(packageRoot, filesByPath))
    diagnostics.push(...checkAuthoredProjectFactsSurface(packageRoot, contractFile))
    diagnostics.push(...checkProjectFactsSize(packageRoot, contractFile))
    diagnostics.push(...findExpiredMigrationWaivers(contractFile))
  }

  for (const packageRoot of findAuthoredAttuneRoots(files)) {
    if (activePackageRoots.includes(packageRoot)) continue
    const filesByPath = new Map(files.map((file) => [file.path, file]))
    diagnostics.push(...checkPackageLocalAttuneSurface(packageRoot, filesByPath))
  }

  for (const file of files) {
    diagnostics.push(...checkCommandSurfaceFile(file))
    diagnostics.push(...checkArchitectureLintReferences(file))
    diagnostics.push(...checkPolicyArchitectureGuidance(file))
    diagnostics.push(...checkWorkerTargetMetadata(file))
    diagnostics.push(...checkFinalCleanupFile(file))
    diagnostics.push(...checkMechanicalProgramOntologyFile(file))
    diagnostics.push(...checkActiveOperatingDocFile(file))
    diagnostics.push(...checkPackageLocalAttuneCompanionImports(file, filesByPath))
  }

  return diagnostics
}

function findSemanticPackageContractFile(
  packageRoot: string,
  contractFile: WorkspaceFile,
  filesByPath: ReadonlyMap<string, WorkspaceFile>,
): WorkspaceFile {
  const packageLocalGeneratedContract = filesByPath.get(`${packageRoot}/src/attune.contract.generated.ts`)
  if (packageLocalGeneratedContract !== undefined) return packageLocalGeneratedContract

  return contractFile
}

function isAuthoredProjectFactsFile(file: WorkspaceFile): boolean {
  return authoredProjectFactsPattern.test(file.content)
}

function checkPackageLocalAttuneSurface(
  packageRoot: string,
  filesByPath: ReadonlyMap<string, WorkspaceFile>,
): readonly FrameworkFinalRatchetDiagnostic[] {
  const companionPaths = packageLocalAttuneCompanionNames
    .map((name) => `${packageRoot}/${name}`)
    .filter((candidatePath) => filesByPath.has(candidatePath))

  if (companionPaths.length === 0) return []

  const parity = packageLocalAttuneSurfaceParity(packageRoot, companionPaths, filesByPath)
  const severity = oneFileSurfaceCompletedRoots.has(packageRoot) && parity.complete
    ? "error"
    : "warning"

  return [finalRatchetDiagnostic(
    "package-local-attune-companion",
    `${packageRoot}/src/attune.package.ts`,
    [
      `Package ${packageRoot} still has package-local Attune companion files: ${companionPaths.join(", ")}.`,
      "The final package-local Attune surface is src/attune.package.ts only.",
      "Move generated contract companions, generated registries, typecheck assertions, and Source BOM shards to framework-owned cache/projection state.",
      parity.complete
        ? "Program-index replacement paths exist for the remaining companion files."
        : `Replacement paths are not complete yet: ${parity.missingReplacements.join(", ")}.`,
      `Run nx run ${projectNameForRoot(packageRoot, filesByPath)}:attune-repair or workspace:attune-repair when the repair target supports this root.`,
    ].join(" "),
    severity,
  )]
}

function packageLocalAttuneSurfaceParity(
  packageRoot: string,
  companionPaths: readonly string[],
  filesByPath: ReadonlyMap<string, WorkspaceFile>,
): { readonly complete: boolean; readonly missingReplacements: readonly string[] } {
  const projectName = projectNameForRoot(packageRoot, filesByPath)
  const missingReplacements = companionPaths.flatMap((companionPath) =>
    packageLocalCompanionReplacementExists(packageRoot, projectName, companionPath, filesByPath)
      ? []
      : [packageLocalCompanionReplacementLabel(projectName, companionPath)]
  )
  return {
    complete: missingReplacements.length === 0,
    missingReplacements,
  }
}

function packageLocalCompanionReplacementExists(
  packageRoot: string,
  projectName: string,
  companionPath: string,
  filesByPath: ReadonlyMap<string, WorkspaceFile>,
): boolean {
  if (companionPath.endsWith("/src/attune.contract.generated.ts")) {
    return projectFactsReplacementExists(packageRoot, filesByPath)
  }
  if (companionPath.endsWith("/src/attune.generated.ts")) {
    return projectFactsReplacementExists(packageRoot, filesByPath)
  }
  if (companionPath.endsWith("/src/attune.package.typecheck.ts")) {
    return projectFactsReplacementExists(packageRoot, filesByPath)
  }
  if (companionPath.endsWith("/attune.source-bom.json")) {
    return sourceOwnershipProjectionExists(packageRoot, projectName, filesByPath)
  }
  return false
}

function packageLocalCompanionReplacementLabel(
  projectName: string,
  companionPath: string,
): string {
  if (companionPath.endsWith("/src/attune.contract.generated.ts")) {
    return `program-index project facts for ${projectName}`
  }
  if (companionPath.endsWith("/src/attune.generated.ts")) {
    return `program-index artifact and observation facts for ${projectName}`
  }
  if (companionPath.endsWith("/src/attune.package.typecheck.ts")) {
    return `program-index symbol/schema/edge facts for ${projectName}`
  }
  if (companionPath.endsWith("/attune.source-bom.json")) {
    return `framework/cache source ownership projection for ${projectName}`
  }
  return `mechanical replacement for ${companionPath}`
}

function projectFactsReplacementExists(
  packageRoot: string,
  filesByPath: ReadonlyMap<string, WorkspaceFile>,
): boolean {
  const projectFactsFile = filesByPath.get(`${packageRoot}/src/attune.package.ts`)
  return projectFactsFile !== undefined && isAuthoredProjectFactsFile(projectFactsFile)
}

function sourceOwnershipProjectionExists(
  packageRoot: string,
  projectName: string,
  filesByPath: ReadonlyMap<string, WorkspaceFile>,
): boolean {
  const indexFile = filesByPath.get("attune.source-bom.index.json")
  if (indexFile === undefined) return false
  const index = parseJsonRecord(indexFile.content)
  const shards = Array.isArray(index?.shards) ? index.shards : []
  return shards.some((entry) => {
    if (!isRecord(entry)) return false
    if (entry.project !== projectName || entry.projectRoot !== packageRoot) return false
    const shard = typeof entry.shard === "string" ? entry.shard : ""
    return (
      (
        shard === `.attune/cache/source-bom/${projectName}.json` ||
        shard === `framework/architecture/src/generated/source-bom/${projectName}.json`
      ) &&
      filesByPath.has(shard)
    )
  })
}

function checkPackageLocalAttuneCompanionImports(
  file: WorkspaceFile,
  filesByPath: ReadonlyMap<string, WorkspaceFile>,
): readonly FrameworkFinalRatchetDiagnostic[] {
  if (file.path.startsWith("framework/architecture/src/generated/")) return []

  const packageRoot = packageRootForSourceFile(file.path)
  if (packageRoot === undefined) return []

  const diagnostics: FrameworkFinalRatchetDiagnostic[] = []
  packageLocalAttuneCompanionImportPattern.lastIndex = 0

  for (const match of file.content.matchAll(packageLocalAttuneCompanionImportPattern)) {
    const importSource = match.groups?.source
    if (importSource === undefined) continue

    const companionPath = packageLocalGeneratedCompanionPath(file.path, importSource, packageRoot)
    if (companionPath === undefined) continue

    const projectName = projectNameForRoot(packageRoot, filesByPath)
    const hasReplacement = packageLocalCompanionReplacementExists(packageRoot, projectName, companionPath, filesByPath)
    const replacementLabel = packageLocalCompanionReplacementLabel(projectName, companionPath)
    const severity = oneFileSurfaceCompletedRoots.has(packageRoot) && hasReplacement
      ? "error"
      : "warning"
    const replacementText = hasReplacement
      ? `Use ${replacementLabel} or the program-index repair target instead.`
      : `Replacement path is not complete yet: ${replacementLabel}.`

    diagnostics.push(finalRatchetDiagnostic(
      "package-local-attune-companion-import",
      file.path,
      [
        `Package source ${file.path} imports project-local generated compatibility artifact ${companionPath}.`,
        "Migrated package source must depend on authored source and framework-owned generated/projection paths, not project-local generated companions.",
        replacementText,
        `Run nx run ${projectName}:attune-repair or workspace:attune-repair when the repair target supports this root.`,
      ].join(" "),
      severity,
    ))
  }

  return diagnostics
}

function packageLocalGeneratedCompanionPath(
  filePath: string,
  importSource: string,
  packageRoot: string,
): string | undefined {
  const resolvedImport = normalizePath(path.posix.normalize(path.posix.join(path.posix.dirname(filePath), importSource)))
  const companionPath = /\.[cm]?[jt]sx?$/u.test(resolvedImport)
    ? resolvedImport.replace(/\.[cm]?[jt]sx?$/u, ".ts")
    : `${resolvedImport}.ts`
  return packageLocalAttuneCompanionNames
    .map((name) => `${packageRoot}/${name}`)
    .find((candidatePath) => candidatePath === companionPath)
}

function packageRootForSourceFile(filePath: string): string | undefined {
  const normalizedPath = normalizePath(filePath)
  const match = /^(?<root>packages\/[^/]+|framework\/(?:architecture|oxlint-policy))\/src\//u.exec(normalizedPath)
  return match?.groups?.root
}

function checkProjectFactsSize(
  packageRoot: string,
  contractFile: WorkspaceFile,
): readonly FrameworkFinalRatchetDiagnostic[] {
  const lineCount = contractFile.content.split(/\r?\n/u).length
  if (lineCount <= packageDeclarationWarningLineThreshold) return []

  const severity = "warning" as const
  const threshold =
    lineCount > packageDeclarationErrorLineThreshold
      ? packageDeclarationErrorLineThreshold
      : packageDeclarationWarningLineThreshold

  return [finalRatchetDiagnostic(
    "project-facts-too-large",
    contractFile.path,
    [
      `Project facts ${packageRoot}/src/attune.package.ts has ${lineCount} lines and exceeds the staged ${threshold} line threshold.`,
      "Move derived handlers, observation partition data, repair descriptors, coverage search plans, and artifact freshness metadata into generated/cache materialization or program-index projections.",
      `Run nx run ${projectNameFromPackageRoot(packageRoot)}:attune-repair or workspace:attune-repair when available.`,
    ].join(" "),
    severity,
  )]
}

function checkAuthoredProjectFactsSurface(
  packageRoot: string,
  contractFile: WorkspaceFile,
): readonly FrameworkFinalRatchetDiagnostic[] {
  const diagnostics: FrameworkFinalRatchetDiagnostic[] = []
  oldAuthoredDeclarationApiPattern.lastIndex = 0

  for (const match of contractFile.content.matchAll(oldAuthoredDeclarationApiPattern)) {
    const name = match.groups?.name ?? match[0]
    diagnostics.push(finalRatchetDiagnostic(
      "old-authored-project-api",
      contractFile.path,
      [
        `Authored project facts for ${packageRoot} still expose old declaration API ${name}.`,
        "Use ProjectFacts, ProjectRuntimeRoots, defineAttuneProjectFacts, symbols, and edges as the active package source vocabulary.",
      ].join(" "),
    ))
  }

  return diagnostics
}

function checkPackageContractResidualPolicy(
  packageRoot: string,
  contractFile: WorkspaceFile,
): readonly FrameworkFinalRatchetDiagnostic[] {
  const diagnostics: FrameworkFinalRatchetDiagnostic[] = []
  const operations = extractSourceOperationPolicyMetadata(contractFile.content)
  const graph = extractPackageAtomGraph(contractFile.content)

  diagnostics.push(...findDuplicateSourceOperationIds(contractFile.path, operations))
  diagnostics.push(...findInvalidSourceDiagnosticRuleIds(contractFile.path, operations))
  diagnostics.push(...findInvalidSourceViewReferences(contractFile.path, operations, graph))

  if (hiddenConfigurationPattern.test(contractFile.content) && !hiddenConfigurationWaiverPattern.test(contractFile.content)) {
    diagnostics.push(finalRatchetDiagnostic(
      "hidden-configuration-without-waiver",
      contractFile.path,
      `Package ${packageRoot} declares hidden configuration dependencies without a hidden-configuration waiver.`,
    ))
  }

  if (migrationOnlyAliasPattern.test(contractFile.content)) {
    diagnostics.push(finalRatchetDiagnostic(
      "migration-only-alias",
      contractFile.path,
      `Package ${packageRoot} still declares a migration-only alias, compatibility export, or report-only exception marker after final ratchet.`,
    ))
  }

  return diagnostics
}

interface SourceOperationPolicyMetadata {
  readonly id: string
  readonly kind: string
  readonly laws: readonly string[]
  readonly reactivityKeys: readonly string[]
  readonly atoms: readonly string[]
}

function extractSourceOperationPolicyMetadata(content: string): readonly SourceOperationPolicyMetadata[] {
  return extractCallArguments(content, "defineOperation")
    .map((operationBlock): SourceOperationPolicyMetadata | undefined => {
      const id = extractFirstStringProperty(operationBlock, "id")
      const kind = extractFirstStringProperty(operationBlock, "kind")
      if (id === undefined || kind === undefined) return undefined

      return {
        id,
        kind,
        laws: extractStringArrayValues(operationBlock, "laws"),
        reactivityKeys: extractStringArrayValues(operationBlock, "reactivityKeys"),
        atoms: extractStringArrayValues(operationBlock, "atoms"),
      }
    })
    .filter((operation): operation is SourceOperationPolicyMetadata => operation !== undefined)
}

function findDuplicateSourceOperationIds(
  filePath: string,
  operations: readonly SourceOperationPolicyMetadata[],
): readonly FrameworkFinalRatchetDiagnostic[] {
  const seen = new Set<string>()
  const duplicateIds = new Set<string>()

  for (const operation of operations) {
    if (seen.has(operation.id)) duplicateIds.add(operation.id)
    seen.add(operation.id)
  }

  return [...duplicateIds].map((operationId) => finalRatchetDiagnostic(
    "duplicate-operation-id",
    filePath,
    `Package contract declares duplicate operation id ${operationId}; operation ids must be unique before generated harnesses and ledgers can be trusted.`,
  ))
}

function findInvalidSourceDiagnosticRuleIds(
  filePath: string,
  operations: readonly SourceOperationPolicyMetadata[],
): readonly FrameworkFinalRatchetDiagnostic[] {
  const canonicalDiagnosticRuleIds = new Set<string>(CanonicalDiagnosticRuleIds)
  const diagnostics: FrameworkFinalRatchetDiagnostic[] = []

  for (const operation of operations) {
    for (const lawId of operation.laws) {
      if (!canonicalDiagnosticRuleIds.has(lawId)) {
        diagnostics.push(finalRatchetDiagnostic(
          "invalid-law-id",
          filePath,
          `Operation ${operation.id} declares unknown law id ${lawId}.`,
        ))
        continue
      }

      if (!isDiagnosticRuleAllowedForSymbol(lawId as DiagnosticRuleId, {
        id: operation.id,
        kind: operation.kind,
        views: {
          reactivityKeys: operation.reactivityKeys,
          atoms: operation.atoms,
        },
      } as Parameters<typeof isDiagnosticRuleAllowedForSymbol>[1])) {
        diagnostics.push(finalRatchetDiagnostic(
          "invalid-law-id",
          filePath,
          `Operation ${operation.id} declares law ${lawId}, which is not allowed for ${operation.kind} metadata.`,
        ))
      }
    }
  }

  return diagnostics
}

function findInvalidSourceViewReferences(
  filePath: string,
  operations: readonly SourceOperationPolicyMetadata[],
  graph: PackageAtomGraph,
): readonly FrameworkFinalRatchetDiagnostic[] {
  const reactivityKeys = new Set(graph.reactivityKeys)
  const atoms = new Set([
    ...graph.atoms,
    ...graph.baseAtoms.map((atom) => atom.id),
    ...graph.derivedAtoms.map((atom) => atom.id),
    ...graph.packageViewAtoms.map((atom) => atom.id),
  ])
  const diagnostics: FrameworkFinalRatchetDiagnostic[] = []

  for (const operation of operations) {
    for (const key of operation.reactivityKeys) {
      if (reactivityKeys.has(key)) continue
      diagnostics.push(finalRatchetDiagnostic(
        "invalid-view-reference",
        filePath,
        `Operation ${operation.id} touches unknown Reactivity key ${key}.`,
      ))
    }

    for (const atom of operation.atoms) {
      if (atoms.has(atom)) continue
      diagnostics.push(finalRatchetDiagnostic(
        "invalid-view-reference",
        filePath,
        `Operation ${operation.id} touches unknown atom ${atom}.`,
      ))
    }
  }

  return diagnostics
}

function findActivePackageRoots(files: readonly WorkspaceFile[]): readonly string[] {
  const roots = new Set<string>()

  for (const file of files) {
    const match = /^packages\/(?<packageName>[^/]+)\/(?:package|project)\.json$/u.exec(file.path)
    const packageName = match?.groups?.packageName
    if (packageName !== undefined) roots.add(`packages/${packageName}`)
  }

  return [...roots].sort()
}

function findAuthoredAttuneRoots(files: readonly WorkspaceFile[]): readonly string[] {
  const roots = new Set<string>()

  for (const file of files) {
    const match = /^(?<root>(?:packages|framework)\/[^/]+)\/src\/attune\.package\.ts$/u.exec(file.path)
    const root = match?.groups?.root
    if (root !== undefined) roots.add(root)
  }

  return [...roots].sort()
}

function projectNameFromPackageRoot(packageRoot: string): string {
  return packageRoot.split("/").at(-1) ?? packageRoot
}

function projectNameForRoot(
  packageRoot: string,
  filesByPath: ReadonlyMap<string, WorkspaceFile>,
): string {
  const projectFile = filesByPath.get(`${packageRoot}/project.json`)
  if (projectFile !== undefined) {
    const project = parseJsonObject(projectFile)
    if (typeof project?.name === "string") return project.name
  }

  return projectNameFromPackageRoot(packageRoot)
}

function checkAtomReactivityConformance(
  packageRoot: string,
  contractFile: WorkspaceFile,
): readonly FrameworkFinalRatchetDiagnostic[] {
  const diagnostics: FrameworkFinalRatchetDiagnostic[] = []
  const graph = extractPackageAtomGraph(contractFile.content)
  const operations = extractOperationViewMetadata(contractFile.content)
  const hasServiceOperations = operations.length > 0 || serviceOperationPattern.test(contractFile.content)

  if (hasServiceOperations && graph.reactivityKeys.length === 0 && graph.atoms.length === 0) {
    diagnostics.push(finalRatchetDiagnostic(
      "missing-package-view-graph",
      contractFile.path,
      "Active packages with service operations must declare Reactivity keys and package view atoms in PackageViews.",
    ))
  }

  for (const operation of operations) {
    if (meaningfulMutationOperationKinds.has(operation.kind) && !operation.hasAnyViewTouch) {
      pushDiagnostic(diagnostics, atomReactivityDiagnostic(
        packageRoot,
        "operation-missing-reactivity-touch",
        contractFile.path,
        operation.id,
        `Operation ${operation.id} has ${operation.kind} semantics and must touch at least one Reactivity key, base atom, derived atom, or package view atom.`,
      ))
    }
  }

  if (hasDetectableSubscriptionMetadata(graph, operations)) {
    diagnostics.push(...findDeadReactivityKeyDiagnostics(packageRoot, contractFile.path, graph, operations))
    diagnostics.push(...findUnobservedOperationKeyDiagnostics(packageRoot, contractFile.path, graph, operations))
  }

  for (const operation of operations) {
    if (operation.derivedAtoms.length === 0 || operation.subscribesTo.length === 0 || operation.hasDirectDurableRead) {
      continue
    }

    for (const atomId of operation.derivedAtoms) {
      pushDiagnostic(diagnostics, atomReactivityDiagnostic(
        packageRoot,
        "derived-atom-direct-reactivity-subscription",
        contractFile.path,
        `${operation.id}:${atomId}`,
        `Derived atom ${atomId} in operation ${operation.id} subscribes directly to Reactivity keys; derived atoms must compose base atoms unless they directly read durable package facts.`,
      ))
    }
  }

  return diagnostics
}

function findDeadReactivityKeyDiagnostics(
  packageRoot: string,
  filePath: string,
  graph: PackageAtomGraph,
  operations: readonly OperationViewMetadata[],
): readonly FrameworkFinalRatchetDiagnostic[] {
  const subscribedKeys = new Set([
    ...graph.baseAtoms.flatMap((atom) => atom.refreshesOn),
    ...operations.flatMap((operation) => operation.subscribesTo),
  ])

  return graph.reactivityKeys
    .filter((reactivityKey) => !subscribedKeys.has(reactivityKey))
    .map((reactivityKey) =>
      atomReactivityDiagnostic(
        packageRoot,
        "dead-reactivity-key",
        filePath,
        reactivityKey,
        `Reactivity key ${reactivityKey} is declared but no detectable base atom metadata subscribes to it.`,
      )
    )
    .filter((diagnostic): diagnostic is FrameworkFinalRatchetDiagnostic => diagnostic !== undefined)
}

function findUnobservedOperationKeyDiagnostics(
  packageRoot: string,
  filePath: string,
  graph: PackageAtomGraph,
  operations: readonly OperationViewMetadata[],
): readonly FrameworkFinalRatchetDiagnostic[] {
  const diagnostics: FrameworkFinalRatchetDiagnostic[] = []
  const reachableAtomsByKey = reachableAtomsByReactivityKey(graph)

  for (const operation of operations) {
    if (!meaningfulMutationOperationKinds.has(operation.kind)) continue

    for (const reactivityKey of operation.reactivityKeys) {
      if ((reachableAtomsByKey.get(reactivityKey)?.packageViewAtoms.length ?? 0) > 0) continue

      pushDiagnostic(diagnostics, atomReactivityDiagnostic(
        packageRoot,
        "unobserved-operation-reactivity-key",
        filePath,
        `${operation.id}:${reactivityKey}`,
        `Operation ${operation.id} touches Reactivity key ${reactivityKey}, but no base atom to package view atom path is detectable.`,
      ))
    }
  }

  return diagnostics
}

function reachableAtomsByReactivityKey(
  graph: PackageAtomGraph,
): ReadonlyMap<string, { readonly baseAtoms: readonly string[]; readonly derivedAtoms: readonly string[]; readonly packageViewAtoms: readonly string[] }> {
  const derivedReads = new Map(graph.derivedAtoms.map((atom) => [atom.id, atom.reads]))
  const viewReads = new Map(graph.packageViewAtoms.map((atom) => [atom.id, atom.reads]))
  const result = new Map<string, { readonly baseAtoms: readonly string[]; readonly derivedAtoms: readonly string[]; readonly packageViewAtoms: readonly string[] }>()

  for (const reactivityKey of graph.reactivityKeys) {
    const baseAtoms = graph.baseAtoms
      .filter((atom) => atom.refreshesOn.includes(reactivityKey))
      .map((atom) => atom.id)
    const derivedAtoms = [...reachableFrom(baseAtoms, derivedReads)]
    const packageViewAtoms = graph.packageViewAtoms
      .filter((atom) =>
        atom.reads.some((read) => baseAtoms.includes(read) || derivedAtoms.includes(read)) ||
        reachableFrom(atom.reads, derivedReads).some((read) => baseAtoms.includes(read) || derivedAtoms.includes(read))
      )
      .map((atom) => atom.id)

    result.set(reactivityKey, { baseAtoms, derivedAtoms, packageViewAtoms })
  }

  for (const [reactivityKey, reachable] of result) {
    const viewAtoms = new Set(reachable.packageViewAtoms)
    for (const [atomId, reads] of viewReads) {
      if (viewAtoms.has(atomId)) continue
      if (reads.some((read) => reachable.baseAtoms.includes(read) || reachable.derivedAtoms.includes(read))) {
        viewAtoms.add(atomId)
      }
    }
    result.set(reactivityKey, { ...reachable, packageViewAtoms: [...viewAtoms] })
  }

  return result
}

function reachableFrom(startIds: readonly string[], edges: ReadonlyMap<string, readonly string[]>): readonly string[] {
  const reachable = new Set<string>()
  let changed = true

  while (changed) {
    changed = false
    for (const [atomId, reads] of edges) {
      if (reachable.has(atomId)) continue
      if (reads.some((read) => startIds.includes(read) || reachable.has(read))) {
        reachable.add(atomId)
        changed = true
      }
    }
  }

  return [...reachable]
}

function hasDetectableSubscriptionMetadata(
  graph: PackageAtomGraph,
  operations: readonly OperationViewMetadata[],
): boolean {
  return (
    graph.baseAtoms.some((atom) => atom.refreshesOn.length > 0) ||
    operations.some((operation) => operation.subscribesTo.length > 0)
  )
}

function extractPackageAtomGraph(content: string): PackageAtomGraph {
  const viewsBlock = extractFirstCallArgument(content, "definePackageViews") ?? ""

  return {
    reactivityKeys: extractStringArrayValues(viewsBlock, "reactivityKeys"),
    atoms: extractStringArrayValues(viewsBlock, "atoms"),
    baseAtoms: [
      ...extractAtomNodes(viewsBlock, "baseAtoms"),
      ...extractAtomOperationNodes(content),
    ],
    derivedAtoms: extractAtomNodes(viewsBlock, "derivedAtoms"),
    packageViewAtoms: extractAtomNodes(viewsBlock, "packageViewAtoms"),
  }
}

function extractOperationViewMetadata(content: string): readonly OperationViewMetadata[] {
  return extractCallArguments(content, "defineOperation")
    .map((operationBlock): OperationViewMetadata | undefined => {
      const id = extractFirstStringProperty(operationBlock, "id")
      const kind = extractFirstStringProperty(operationBlock, "kind")
      if (id === undefined || kind === undefined) return undefined

      const reactivityKeys = extractStringArrayValues(operationBlock, "reactivityKeys")
      const atoms = extractStringArrayValues(operationBlock, "atoms")
      const baseAtoms = extractStringArrayValues(operationBlock, "baseAtoms")
      const derivedAtoms = extractStringArrayValues(operationBlock, "derivedAtoms")
      const packageViewAtoms = extractStringArrayValues(operationBlock, "packageViewAtoms")
      const subscribesTo = extractStringArrayValues(operationBlock, "subscribesTo")
      const hasUnknownReactivityKeys = hasNonLiteralFieldReference(operationBlock, "reactivityKeys")
      const hasUnknownAtoms = (
        hasNonLiteralFieldReference(operationBlock, "atoms") ||
        hasNonLiteralFieldReference(operationBlock, "baseAtoms") ||
        hasNonLiteralFieldReference(operationBlock, "derivedAtoms") ||
        hasNonLiteralFieldReference(operationBlock, "packageViewAtoms")
      )

      return {
        id,
        kind,
        reactivityKeys,
        atoms,
        baseAtoms,
        derivedAtoms,
        packageViewAtoms,
        subscribesTo,
        hasAnyViewTouch: (
          reactivityKeys.length > 0 ||
          atoms.length > 0 ||
          baseAtoms.length > 0 ||
          derivedAtoms.length > 0 ||
          packageViewAtoms.length > 0 ||
          hasUnknownReactivityKeys ||
          hasUnknownAtoms
        ),
        hasUnknownReactivityKeys,
        hasUnknownAtoms,
        hasDirectDurableRead: /\b(?:directDurableRead|readsDurableFacts|readsDurablePackageFacts)\s*:\s*true\b/u.test(operationBlock),
      }
    })
    .filter((operation): operation is OperationViewMetadata => operation !== undefined)
}

function extractAtomOperationNodes(content: string): readonly AtomGraphNode[] {
  return extractOperationViewMetadata(content).flatMap((operation) =>
    operation.baseAtoms.map((id) => ({
      id,
      reads: [],
      refreshesOn: operation.subscribesTo,
    }))
  )
}

function extractAtomNodes(block: string, field: string): readonly AtomGraphNode[] {
  const arrayContent = extractArrayContent(block, field)
  if (arrayContent === undefined) return []

  const objectBlocks = extractObjectBlocks(arrayContent)
  if (objectBlocks.length === 0) {
    return extractStringLiterals(arrayContent).map((id) => ({ id, reads: [], refreshesOn: [] }))
  }

  return objectBlocks
    .map((objectBlock): AtomGraphNode | undefined => {
      const id = extractFirstStringProperty(objectBlock, "id")
      if (id === undefined) return undefined

      return {
        id,
        reads: extractStringArrayValues(objectBlock, "reads"),
        refreshesOn: [
          ...extractStringArrayValues(objectBlock, "refreshesOn"),
          ...extractStringArrayValues(objectBlock, "subscribesTo"),
        ],
      }
    })
    .filter((atom): atom is AtomGraphNode => atom !== undefined)
}

function extractFirstCallArgument(content: string, functionName: string): string | undefined {
  return extractCallArguments(content, functionName)[0]
}

function extractCallArguments(content: string, functionName: string): readonly string[] {
  const calls: string[] = []
  let searchIndex = 0

  while (searchIndex < content.length) {
    const functionIndex = content.indexOf(functionName, searchIndex)
    if (functionIndex === -1) break

    const openParenIndex = content.indexOf("(", functionIndex + functionName.length)
    if (openParenIndex === -1) break
    if (!/^\s*$/u.test(content.slice(functionIndex + functionName.length, openParenIndex))) {
      searchIndex = functionIndex + functionName.length
      continue
    }

    const closeParenIndex = findMatchingDelimiter(content, openParenIndex, "(", ")")
    if (closeParenIndex === undefined) break

    calls.push(content.slice(openParenIndex + 1, closeParenIndex))
    searchIndex = closeParenIndex + 1
  }

  return calls
}

function extractStringArrayValues(block: string, field: string): readonly string[] {
  const arrayContent = extractArrayContent(block, field)
  return arrayContent === undefined ? [] : extractStringLiterals(arrayContent)
}

function extractArrayContent(block: string, field: string): string | undefined {
  const match = new RegExp(`\\b${escapeRegExp(field)}\\s*:`, "u").exec(block)
  if (match === null) return undefined

  const openBracketIndex = block.indexOf("[", match.index + match[0].length)
  if (openBracketIndex === -1) return undefined
  const prefix = block.slice(match.index + match[0].length, openBracketIndex)
  if (!/^\s*$/u.test(prefix)) return undefined

  const closeBracketIndex = findMatchingDelimiter(block, openBracketIndex, "[", "]")
  return closeBracketIndex === undefined ? undefined : block.slice(openBracketIndex + 1, closeBracketIndex)
}

function hasNonLiteralFieldReference(block: string, field: string): boolean {
  const match = new RegExp(`\\b${escapeRegExp(field)}\\s*:`, "u").exec(block)
  if (match === null) return false

  const afterField = block.slice(match.index + match[0].length).trimStart()
  return afterField.length > 0 && !afterField.startsWith("[")
}

function extractFirstStringProperty(block: string, field: string): string | undefined {
  const match = new RegExp(`\\b${escapeRegExp(field)}\\s*:\\s*["'](?<value>[^"']+)["']`, "u").exec(block)
  return match?.groups?.value
}

function extractStringLiterals(block: string): readonly string[] {
  return [...block.matchAll(/["'](?<value>[^"']+)["']/gu)]
    .map((match) => match.groups?.value)
    .filter((value): value is string => value !== undefined)
}

function extractObjectBlocks(block: string): readonly string[] {
  const objectBlocks: string[] = []
  let searchIndex = 0

  while (searchIndex < block.length) {
    const openBraceIndex = block.indexOf("{", searchIndex)
    if (openBraceIndex === -1) break

    const closeBraceIndex = findMatchingDelimiter(block, openBraceIndex, "{", "}")
    if (closeBraceIndex === undefined) break

    objectBlocks.push(block.slice(openBraceIndex + 1, closeBraceIndex))
    searchIndex = closeBraceIndex + 1
  }

  return objectBlocks
}

function findMatchingDelimiter(
  text: string,
  openIndex: number,
  open: string,
  close: string,
): number | undefined {
  let depth = 0
  const quoteState: QuoteScanState = { escaped: false, quote: undefined }

  for (let index = openIndex; index < text.length; index += 1) {
    const char = text[index]
    if (char === undefined) continue

    if (consumeQuotedCharacter(char, quoteState)) continue

    const quote = quoteDelimiter(char)
    if (quote !== undefined) {
      quoteState.quote = quote
      continue
    }

    depth = nextDelimiterDepth(char, open, close, depth)
    if (char === close && depth === 0) return index
  }

  return undefined
}

interface QuoteScanState {
  quote: '"' | "'" | "`" | undefined
  escaped: boolean
}

function consumeQuotedCharacter(char: string, state: QuoteScanState): boolean {
  if (state.quote === undefined) return false
  if (state.escaped) {
    state.escaped = false
    return true
  }
  if (char === "\\") {
    state.escaped = true
    return true
  }
  if (char === state.quote) state.quote = undefined
  return true
}

function quoteDelimiter(char: string): QuoteScanState["quote"] {
  if (char === "\"" || char === "'" || char === "`") return char
  return undefined
}

function nextDelimiterDepth(char: string, open: string, close: string, depth: number): number {
  if (char === open) return depth + 1
  if (char === close) return depth - 1
  return depth
}

function atomReactivityDiagnostic(
  packageRoot: string,
  code: FrameworkFinalRatchetDiagnosticCode,
  filePath: string,
  id: string,
  message: string,
): FrameworkFinalRatchetDiagnostic | undefined {
  if (isTemporaryAtomReactivityDebt(packageRoot, code, id)) {
    return undefined
  }

  return finalRatchetDiagnostic(code, filePath, message)
}

function isTemporaryAtomReactivityDebt(
  packageRoot: string,
  code: FrameworkFinalRatchetDiagnosticCode,
  id: string,
): boolean {
  return temporaryAtomReactivityDebt.some((debt) =>
    debt.packageRoot === packageRoot &&
    debt.code === code &&
    debt.id === id
  )
}

function pushDiagnostic(
  diagnostics: FrameworkFinalRatchetDiagnostic[],
  diagnostic: FrameworkFinalRatchetDiagnostic | undefined,
): void {
  if (diagnostic !== undefined) diagnostics.push(diagnostic)
}

function checkCommandSurfaceFile(file: WorkspaceFile): readonly FrameworkFinalRatchetDiagnostic[] {
  if (file.path.endsWith("/package.json")) {
    return checkPackageJsonScripts(file)
  }

  if (file.path === "project.json" || file.path.endsWith("/project.json")) {
    return checkProjectJsonRunCommands(file)
  }

  return []
}

function checkPackageJsonScripts(file: WorkspaceFile): readonly FrameworkFinalRatchetDiagnostic[] {
  const packageRoot = packageRootForManifest(file.path)
  if (packageRoot === undefined) return []

  const parsed = parseJsonObject(file)
  if (parsed === undefined || !isRecord(parsed.scripts) || Object.keys(parsed.scripts).length === 0) {
    return []
  }

  return [finalRatchetDiagnostic(
    "package-local-scripts",
    file.path,
    "Migrated packages must remove package-local scripts and expose workflows through typed Nx executors or inferred contract targets.",
  )]
}

function checkProjectJsonRunCommands(file: WorkspaceFile): readonly FrameworkFinalRatchetDiagnostic[] {
  const parsed = parseJsonObject(file)
  if (parsed === undefined || !isRecord(parsed.targets)) return []

  const diagnostics: FrameworkFinalRatchetDiagnostic[] = []

  for (const [targetName, rawTarget] of Object.entries(parsed.targets)) {
    if (!isRecord(rawTarget) || rawTarget.executor !== "nx:run-commands") continue

    diagnostics.push(finalRatchetDiagnostic(
      "arbitrary-run-commands",
      file.path,
      `Target ${targetName} uses nx:run-commands; final package workflows require typed Nx executors or inferred contract-derived targets.`,
    ))
  }

  return diagnostics
}

function checkArchitectureLintReferences(file: WorkspaceFile): readonly FrameworkFinalRatchetDiagnostic[] {
  if (!file.content.includes(staleArchitecturePackageIdentity)) return []
  if (historicalArchitectureLintReferencePaths.some((pattern) => pattern.test(file.path))) {
    return []
  }

  return [finalRatchetDiagnostic(
    "stale-architecture-lint-reference",
    file.path,
    "Final architecture surfaces must use attune-architecture; the legacy architecture package identity may appear only in historical migration notes.",
  )]
}

function checkPolicyArchitectureGuidance(file: WorkspaceFile): readonly FrameworkFinalRatchetDiagnostic[] {
  if (!/\.(json|jsonc|md|mdx|txt)$/u.test(file.path)) return []
  if (!stalePolicyArchitectureTargetPattern.test(file.content)) return []
  if (historicalArchitectureLintReferencePaths.some((pattern) => pattern.test(file.path))) return []

  return file.content
    .split(/\r?\n/u)
    .flatMap((line, index) => {
      if (!stalePolicyArchitectureTargetPattern.test(line) || isInternalPolicyArchitectureGuidance(line)) {
        return []
      }

      return [finalRatchetDiagnostic(
        "stale-policy-architecture-guidance",
        file.path,
        `Line ${index + 1} promotes workspace:policy-architecture; public policy guidance must route through workspace:policy-fast, workspace:policy-proof-pressure, or focused diagnostic targets.`,
      )]
    })
}

function isInternalPolicyArchitectureGuidance(line: string): boolean {
  return /\b(internal|compatibility|do not promote|must not promote|stale|historical|MUST NOT|SHALL NOT)\b/u.test(line)
}

function checkWorkerTargetMetadata(file: WorkspaceFile): readonly FrameworkFinalRatchetDiagnostic[] {
  if (file.path !== "project.json" && !file.path.endsWith("/project.json")) return []

  const parsed = parseJsonObject(file)
  if (parsed === undefined || !isRecord(parsed.targets)) return []

  const diagnostics: FrameworkFinalRatchetDiagnostic[] = []
  for (const [targetName, rawTarget] of Object.entries(parsed.targets)) {
    if (!isRecord(rawTarget) || !isWorkerizedTarget(targetName, rawTarget)) continue

    const missing = missingWorkerMetadataFields(rawTarget)
    if (missing.length === 0) continue

    diagnostics.push(finalRatchetDiagnostic(
      "worker-target-metadata",
      file.path,
      `Workerized target ${targetName} must declare ${missing.join(", ")} through Nx target options or target metadata.`,
    ))
  }

  return diagnostics
}

function checkFinalCleanupFile(file: WorkspaceFile): readonly FrameworkFinalRatchetDiagnostic[] {
  const diagnostics: FrameworkFinalRatchetDiagnostic[] = []

  if (
    isGeneratedArtifactPath(file.path) &&
    staleGeneratedMarkerPattern.test(file.content) &&
    !isGeneratedCleanupExemptPath(file.path)
  ) {
    diagnostics.push(finalRatchetDiagnostic(
      "stale-generated-file",
      file.path,
      "Generated source or generated compatibility views must be refreshed before the final ratchet; stale generated markers are not allowed as checked-in truth.",
    ))
  }

  if (manualDerivedTruthMarkerPattern.test(file.content) && isDerivedTruthFilePath(file.path)) {
    diagnostics.push(finalRatchetDiagnostic(
      "manual-derived-truth",
      file.path,
      "Source BOM, generator-shape, waiver, coverage, and protocol summary facts must be generated or projected, not maintained as manual derived truth.",
    ))
  }

  return diagnostics
}

function checkMechanicalProgramOntologyFile(file: WorkspaceFile): readonly FrameworkFinalRatchetDiagnostic[] {
  if (!isPrimaryProgramIndexPath(file.path)) return []

  const diagnostics: FrameworkFinalRatchetDiagnostic[] = []
  const lines = file.content.split(/\r?\n/u)

  for (const [lineIndex, line] of lines.entries()) {
    const objectMatch = oldOntologyRuntimeObjectPattern.exec(line)
    if (objectMatch !== null) {
      diagnostics.push(oldOntologyRuntimeObjectDiagnostic(
        file.path,
        lineIndex + 1,
        objectMatch.groups?.name ?? "old ontology object",
      ))
    }

    const tableMatch = oldOntologyRuntimeTablePattern.exec(line)
    if (tableMatch !== null) {
      diagnostics.push(oldOntologyRuntimeObjectDiagnostic(
        file.path,
        lineIndex + 1,
        tableMatch.groups?.name ?? "old ontology table",
      ))
    }

    const diagnosticCopyMatch = oldOntologyActiveDocNounPattern.exec(line)
    if (
      diagnosticMessageLinePattern.test(line) &&
      diagnosticCopyMatch !== null &&
      !isOldOntologyActiveDocContextAllowed(line, "", "")
    ) {
      diagnostics.push(oldOntologyDiagnosticCopyDiagnostic(
        file.path,
        lineIndex + 1,
        diagnosticCopyMatch.groups?.term ?? "old ontology noun",
      ))
    }
  }

  return diagnostics
}

function isPrimaryProgramIndexPath(filePath: string): boolean {
  return (
    filePath === "framework/sqlite/src/ProgramIndex.ts" ||
    filePath === "framework/runtime/src/ProgramIndexProjection.ts" ||
    filePath === "framework/nx/src/ProgramGraphIndex.ts"
  )
}

function oldOntologyRuntimeObjectDiagnostic(
  filePath: string,
  line: number,
  name: string,
): FrameworkFinalRatchetDiagnostic {
  return finalRatchetDiagnostic(
    "old-ontology-runtime-object",
    filePath,
    [
      `Line ${line} adds ${name} as a program-index runtime object.`,
      "Use mechanical facts instead: project, target, source_file, symbol, schema_descriptor, edge, artifact, observation, diagnostic, repair, or invalidation.",
      "Old ontology terms may appear only as compatibility source metadata, legacy-adapter labels, historical context, or future-delete plans.",
    ].join(" "),
  )
}

function oldOntologyDiagnosticCopyDiagnostic(
  filePath: string,
  line: number,
  term: string,
): FrameworkFinalRatchetDiagnostic {
  return finalRatchetDiagnostic(
    "old-ontology-diagnostic-copy",
    filePath,
    [
      `Line ${line} uses ${term} in primary program-index diagnostic copy.`,
      "Diagnostics must name the mechanical fact first: project, source_file, symbol, schema_descriptor, edge, artifact, observation, diagnostic, repair, or invalidation.",
      "Old labels are allowed only when the same diagnostic frames them as legacy compatibility, historical context, or deletion/quarantine work.",
    ].join(" "),
  )
}

function checkActiveOperatingDocFile(file: WorkspaceFile): readonly FrameworkFinalRatchetDiagnostic[] {
  if (!activeOperatingDocPaths.has(file.path)) return []

  const diagnostics: FrameworkFinalRatchetDiagnostic[] = []
  const lines = file.content.split(/\r?\n/u)
  let previousNonEmptyLine = ""
  let fenceIntroLine = ""
  let inFence = false

  for (const [lineIndex, line] of lines.entries()) {
    const trimmed = line.trim()
    if (trimmed.startsWith("```")) {
      inFence = !inFence
      fenceIntroLine = inFence ? previousNonEmptyLine : ""
      if (trimmed !== "") previousNonEmptyLine = trimmed
      continue
    }

    const match = oldOntologyActiveDocNounPattern.exec(line)
    if (
      match !== null &&
      !isOldOntologyActiveDocContextAllowed(line, previousNonEmptyLine, inFence ? fenceIntroLine : "")
    ) {
      diagnostics.push(oldOntologyActiveDocDiagnostic(
        file.path,
        lineIndex + 1,
        match.groups?.term ?? "old ontology noun",
      ))
    }

    if (trimmed !== "") previousNonEmptyLine = trimmed
  }

  return diagnostics
}

function isOldOntologyActiveDocContextAllowed(
  line: string,
  previousNonEmptyLine: string,
  fenceIntroLine: string,
): boolean {
  const context = `${line} ${previousNonEmptyLine} ${fenceIntroLine}`.toLowerCase()
  return /\b(?:compatibility|legacy|migration|migrat(?:e|ion)|temporary|transitional|scaffolding|archive|historical|delete|deletion|quarantine|do not|must not|not source truth|not final|negative list)\b/u.test(context)
}

function oldOntologyActiveDocDiagnostic(
  filePath: string,
  line: number,
  term: string,
): FrameworkFinalRatchetDiagnostic {
  return finalRatchetDiagnostic(
    "old-ontology-active-doc",
    filePath,
    [
      `Line ${line} teaches ${term} in an active operating doc.`,
      "Use mechanical program facts as the primary vocabulary: project, target, source_file, symbol, schema_descriptor, edge, artifact, observation, diagnostic, repair, and invalidation.",
      "Old ontology nouns in active docs must be explicitly framed as legacy compatibility, historical/archive context, or deletion/quarantine work.",
    ].join(" "),
  )
}

function isGeneratedCleanupExemptPath(filePath: string): boolean {
  return filePath.startsWith("openspec/changes/standardize-effect-package-contracts/")
}

function isGeneratedArtifactPath(filePath: string): boolean {
  return /(^|\/)(generated|__generated__)(\/|$)|\.generated\.[cm]?[jt]sx?$/u.test(filePath)
}

function isDerivedTruthFilePath(filePath: string): boolean {
  return (
    filePath === "attune.generator-shapes.json" ||
    filePath === "attune.source-bom.index.json" ||
    /(^|\/)attune\.source-bom\.json$/u.test(filePath) ||
    /(^|\/)(reports?|artifacts?|protocol-output)(\/|$)/u.test(filePath)
  )
}

function isWorkerizedTarget(targetName: string, target: Record<string, unknown>): boolean {
  const options = readRecord(target.options)
  if (isRecord(options.workerBudget)) return true
  if (options.tool === "worker-fuzz") return true

  const targetText = JSON.stringify({
    executor: target.executor,
    metadata: target.metadata,
    options,
    targetName,
  }).toLowerCase()

  return (
    /\bworker(?:ized|s)?\b/u.test(targetName) ||
    targetText.includes("@fast-check/worker") ||
    targetText.includes("worker-fuzz") ||
    /(?:^|[^a-z])--workers(?:[^a-z]|$)/u.test(targetText) ||
    /_workers\b/u.test(targetText)
  )
}

function missingWorkerMetadataFields(target: Record<string, unknown>): readonly string[] {
  const workerMetadata = workerMetadataRecords(target)
  const missing: string[] = []

  if (!hasMetadataField(workerMetadata, ["maxWorkers", "workerCount", "workers"])) {
    missing.push("worker count")
  }

  if (!hasMetadataField(workerMetadata, ["timeoutSeconds", "timeoutMs", "timeout"])) {
    missing.push("timeout")
  }

  if (!hasMetadataField(workerMetadata, ["isolationLevel", "isolation"])) {
    missing.push("isolation level")
  }

  if (!hasMetadataField(workerMetadata, ["seedRange", "seedStart", "seed"])) {
    missing.push("seed range")
  }

  if (!hasShardMetadata(workerMetadata)) {
    missing.push("shard id/count")
  }

  if (!hasMetadataField(workerMetadata, ["randomSource"])) {
    missing.push("random source")
  }

  return missing
}

function workerMetadataRecords(target: Record<string, unknown>): readonly Record<string, unknown>[] {
  const options = readRecord(target.options)
  const metadata = readRecord(target.metadata)
  const attuneMetadata = readRecord(metadata.attune)
  const workerBudget = readRecord(options.workerBudget)

  return [
    options,
    workerBudget,
    readRecord(options.worker),
    readRecord(metadata.worker),
    readRecord(attuneMetadata.worker),
  ]
}

function hasShardMetadata(records: readonly Record<string, unknown>[]): boolean {
  return records.some((record) =>
    hasMetadataValue(record.shardId) ||
    (
      (hasMetadataValue(record.shardCount) || hasMetadataValue(record.totalShards)) &&
      (hasMetadataValue(record.shardIndex) || hasMetadataValue(record.shard))
    )
  )
}

function hasMetadataField(
  records: readonly Record<string, unknown>[],
  fields: readonly string[],
): boolean {
  return records.some((record) => fields.some((field) => hasMetadataValue(record[field])))
}

function hasMetadataValue(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0
  if (typeof value === "number") return Number.isFinite(value)
  if (typeof value === "boolean") return true
  if (Array.isArray(value)) return value.length > 0
  return isRecord(value) && Object.keys(value).length > 0
}

function findExpiredMigrationWaivers(file: WorkspaceFile): readonly FrameworkFinalRatchetDiagnostic[] {
  const diagnostics: FrameworkFinalRatchetDiagnostic[] = []
  waiverDatePattern.lastIndex = 0

  for (const match of file.content.matchAll(waiverDatePattern)) {
    const date = match.groups?.date
    if (date === undefined || date > policyClockDate) continue

    diagnostics.push(finalRatchetDiagnostic(
      "expired-migration-waiver",
      file.path,
      `Temporary migration waiver date ${date} has expired as of ${policyClockDate}; remove the waiver or reclassify it as a genuine architecture exception with owner and review date.`,
    ))
  }

  return diagnostics
}

function packageRootForManifest(filePath: string): string | undefined {
  const match = /^(?<packageRoot>packages\/[^/]+)\/(?:package|project)\.json$/u.exec(filePath)
  return match?.groups?.packageRoot
}

function parseJsonObject(file: WorkspaceFile): Record<string, unknown> | undefined {
  let parsed: unknown
  try {
    parsed = JSON.parse(file.content)
  } catch {
    return undefined
  }

  return isRecord(parsed) ? parsed : undefined
}

function readRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {}
}

function isTemporaryFrameworkPolicyWaiver(filePath: string, importSource: string): boolean {
  return (
    filePath === "framework/architecture/src/framework-import-boundary.ts" ||
    (
      filePath === "packages/attuned-discovery/src/memory/schema.ts" &&
      importSource === "drizzle-orm/pg-core"
    )
  )
}

function formatImportDiagnostic(diagnostic: FrameworkImportBoundaryDiagnostic): string {
  return [
    "ERROR",
    diagnostic.ruleId,
    diagnostic.code,
    diagnostic.filePath,
    diagnostic.message,
  ].join(" ")
}

function formatNoReportDiagnostic(diagnostic: FrameworkNoReportDiagnostic): string {
  return [
    "ERROR",
    diagnostic.ruleId,
    diagnostic.category,
    diagnostic.filePath,
    diagnostic.message,
  ].join(" ")
}

function formatAtomImplementationDiagnostic(diagnostic: AtomImplementationPolicyDiagnostic): string {
  return [
    "ERROR",
    diagnostic.ruleId,
    diagnostic.code,
    `${diagnostic.filePath}:${diagnostic.line}:${diagnostic.column}`,
    diagnostic.message,
  ].join(" ")
}

function formatFinalRatchetDiagnostic(diagnostic: FrameworkFinalRatchetDiagnostic): string {
  return [
    diagnostic.severity.toUpperCase(),
    diagnostic.ruleId,
    diagnostic.code,
    diagnostic.filePath,
    diagnostic.message,
  ].join(" ")
}

function finalRatchetDiagnostic(
  code: FrameworkFinalRatchetDiagnosticCode,
  filePath: string,
  message: string,
  severity: FrameworkFinalRatchetDiagnostic["severity"] = "error",
): FrameworkFinalRatchetDiagnostic {
  return {
    ruleId: code === "package-local-attune-companion"
      ? PackageLocalAttuneSurfaceRuleId
      : FrameworkFinalRatchetRuleId,
    code,
    severity,
    filePath,
    message,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseJsonRecord(content: string): Record<string, unknown> | undefined {
  try {
    const value = JSON.parse(content) as unknown
    return isRecord(value) ? value : undefined
  } catch {
    return undefined
  }
}

function normalizePath(value: string): string {
  return value.replaceAll("\\", "/")
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")
}

function isCliEntryPoint(moduleUrl: string, entryPoint: string | undefined): boolean {
  return entryPoint !== undefined && path.resolve(fileURLToPath(moduleUrl)) === path.resolve(entryPoint)
}

if (isCliEntryPoint(import.meta.url, process.argv[1])) {
  process.exitCode = runFrameworkPolicyCli()
}
