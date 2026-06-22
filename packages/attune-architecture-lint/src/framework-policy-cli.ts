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
  checkFrameworkNoReportPolicy,
  type FrameworkNoReportDiagnostic,
  type FrameworkNoReportFile,
} from "./framework-no-report-policy.js"

interface WorkspaceFile {
  readonly path: string
  readonly content: string
}

export interface FrameworkPolicyWorkspaceResult {
  readonly importDiagnostics: readonly FrameworkImportBoundaryDiagnostic[]
  readonly noReportDiagnostics: readonly FrameworkNoReportDiagnostic[]
  readonly ratchetDiagnostics: readonly FrameworkFinalRatchetDiagnostic[]
  readonly outputLines: readonly string[]
  readonly exitCode: number
}

export const FrameworkFinalRatchetRuleId = "attune/framework-final-ratchet" as const

export type FrameworkFinalRatchetRuleId = typeof FrameworkFinalRatchetRuleId

export type FrameworkFinalRatchetDiagnosticCode =
  | "missing-package-contract"
  | "missing-package-view-graph"
  | "missing-property-evidence-harness"
  | "operation-missing-reactivity-touch"
  | "dead-reactivity-key"
  | "unobserved-operation-reactivity-key"
  | "derived-atom-direct-reactivity-subscription"
  | "package-local-scripts"
  | "arbitrary-run-commands"
  | "stale-architecture-lint-reference"
  | "expired-migration-waiver"

export interface FrameworkFinalRatchetDiagnostic {
  readonly ruleId: FrameworkFinalRatchetRuleId
  readonly code: FrameworkFinalRatchetDiagnosticCode
  readonly severity: "error"
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
  /(^|\/)(reports?|artifacts?|agent-output|protocol-output|\.attune\/protocol)(\/|$)|\b(protocol[-_. ]?delta|delta[-_. ]?report|obligation[-_. ]?(report|summary|status)|evidence[-_. ]?(summary|report|status)|architecture[-_. ]?(summary|report|status)|cloud[-_. ]?agent[-_. ]?(summary|report|status)|github[-_. ]?(summary|report|status)|linear[-_. ]?(summary|report|status))\b/iu

const policyClockDate = "2026-06-22"

const packageViewGraphPattern = /\bdefinePackageViews\s*\(|\bPackageViews\b/u
const packageContractViewsRegistrationPattern = /\bviews\s*:\s*PackageViews\b/u
const serviceOperationPattern = /\b(?:defineOperation|command|projection|eventFacade|resourceProvider|generator|policyRule|joernTemplate)\s*\(/u
const propertyEvidenceHarnessPattern =
  /\b(PackageProperties|PackageFuzzHandlers|PackageTypeGuidance|PackageFuzzRpcGroup|defineTypeGuidance|propertyFor\s*\(|coverageSearch|evidenceProducer)\b/u
const explicitWaiverPattern = /\bwaivers\s*:\s*\[(?!\s*\]\s*as\s+const)/u
const waiverDatePattern =
  /\b(?:expires|expiresOn|expiresAt|reviewBy|reviewDate)\s*:\s*["'](?<date>\d{4}-\d{2}-\d{2})["']/gu

// TODO(final-ratchet command-surface debt): remove these package-local
// allowances when typed executors/inferred contract targets replace scripts
// and raw nx:run-commands across the migrated packages.
const temporaryCommandSurfaceDebtPackageRoots = new Set([
  "packages/attune-architecture-lint",
  "packages/attune-foldkit",
  "packages/attune-nx",
  "packages/attune-pi-agent",
  "packages/attuned-discovery",
  "packages/cocoindex-effect",
  "packages/effect-oxlint-policy",
  "packages/home-deployment",
  "packages/joern-effect",
  "packages/joern-effect-properties",
  "packages/platform-alchemy-k8s",
])

// TODO(final-ratchet workspace-command debt): these root targets still compose
// legacy command strings during migration; the public surface remains the Nx
// target names while executor replacement is pending.
const temporaryRootRunCommandDebtTargets = new Set([
  "arch:cycles",
  "arch:churn",
  "arch:complexity",
  "arch:deps",
  "arch:duplicates",
  "arch:mutation",
  "arch:policy",
  "arch:scan",
  "arch:types",
  "arch:unused",
  "check",
  "codex-audit-prs",
  "framework-policy-check",
  "lint",
  "package-contracts-check",
  "policy-all",
  "policy-architecture",
  "policy-commit",
  "policy-fast",
  "policy-install-hooks",
  "policy-proof-pressure",
  "policy-push",
  "pr-recovery-audit",
  "pr-verify",
  "shape-conformance",
  "source-bom-check",
  "ts:extended-diagnostics",
  "workspace:complexity",
])

// TODO(final-ratchet framework-project debt): root framework projects are new
// migration scaffolding and still use run-commands for test/typecheck until
// framework/nx owns typed executors for them.
const temporaryFrameworkRunCommandDebtPaths = new Set([
  "framework/language-service/project.json",
  "framework/nx/project.json",
  "framework/protocol/project.json",
  "framework/runtime/project.json",
  "framework/sqlite/project.json",
  "framework/testing/project.json",
])

// TODO(final-ratchet architecture-rename debt): the physical package path and
// temporary framework aliases still reference attune-architecture-lint until
// the dedicated rename agent moves them to attune-architecture.
const temporaryArchitectureLintReferenceDebtPaths = [
  /^packages\/attune-architecture-lint\//u,
  /^openspec\/changes\/standardize-effect-package-contracts\//u,
  /^openspec\/changes\/enforce-nix-agent-policy-gates\//u,
  /^framework\/(?:language-service|nx|protocol|runtime|sqlite|testing)\/vitest\.config\.ts$/u,
  /^framework\/protocol\/src\/(?:builders|descriptors)\/index\.ts$/u,
  /^packages\/[^/]+\/vitest\.config\.ts$/u,
  /^packages\/attune-nx\/(?:test\/tooling-contract-discovery\.test\.ts|tsconfig\.json)$/u,
  /^attune\.(?:generator-shapes|source-bom\.index)\.json$/u,
  /^project\.json$/u,
  /^tsconfig\.base\.json$/u,
]

// TODO(atom-reactivity migration debt): these contracts already expose package
// view atoms, but their current source metadata does not yet model every
// Reactivity key through rich base-atom subscription nodes. Remove entries as
// package-contract sync emits baseAtoms/derivedAtoms/packageViewAtoms metadata.
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

export const checkFrameworkPolicyWorkspace = (root: string): FrameworkPolicyWorkspaceResult => {
  const workspaceRoot = path.resolve(root)
  const files = collectFiles(workspaceRoot)

  const importResultRaw = checkFrameworkImportBoundary({
    files: files
      .filter((file) => sourceFilePattern.test(file.path))
      .map((file): FrameworkImportBoundaryFile => ({ path: file.path, content: file.content })),
  })
  const importDiagnostics = importResultRaw.diagnostics.filter(
    (diagnostic) => !isTemporaryFrameworkPolicyWaiver(diagnostic.filePath, diagnostic.importSource),
  )

  const noReportResult = checkFrameworkNoReportPolicy({
    files: files
      .filter(isProtocolReportCandidate)
      .map((file): FrameworkNoReportFile => ({ path: file.path, content: file.content })),
  })
  const ratchetDiagnostics = checkFinalRatchetPolicy(files)

  const outputLines = [
    ...importDiagnostics.map(formatImportDiagnostic),
    ...noReportResult.diagnostics.map(formatNoReportDiagnostic),
    ...ratchetDiagnostics.map(formatFinalRatchetDiagnostic),
  ]

  return {
    importDiagnostics,
    noReportDiagnostics: noReportResult.diagnostics,
    ratchetDiagnostics,
    outputLines,
    exitCode: outputLines.length > 0 ? 1 : 0,
  }
}

export const runFrameworkPolicyCli = (
  argv: readonly string[] = process.argv,
  writeLine: (line: string) => void = console.log,
): number => {
  const workspaceRoot = path.resolve(argv[2] ?? process.cwd())
  const result = checkFrameworkPolicyWorkspace(workspaceRoot)

  for (const line of result.outputLines) {
    writeLine(line)
  }

  return result.exitCode
}

if (isCliEntryPoint(import.meta.url, process.argv[1])) {
  process.exitCode = runFrameworkPolicyCli()
}

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
        "missing-package-contract",
        `${packageRoot}/package.json`,
        `Active package ${packageRoot} must expose src/attune.package.ts after the package-contract migration.`,
      ))
      continue
    }

    if (
      !packageViewGraphPattern.test(contractFile.content) ||
      !packageContractViewsRegistrationPattern.test(contractFile.content)
    ) {
      diagnostics.push(finalRatchetDiagnostic(
        "missing-package-view-graph",
        contractPath,
        "Package contract must declare PackageViews and register them through views: PackageViews.",
      ))
    }

    if (
      !propertyEvidenceHarnessPattern.test(contractFile.content) &&
      !explicitWaiverPattern.test(contractFile.content)
    ) {
      diagnostics.push(finalRatchetDiagnostic(
        "missing-property-evidence-harness",
        contractPath,
        "Package contract must expose generated property/evidence harness metadata or an explicit local waiver.",
      ))
    }

    diagnostics.push(...checkAtomReactivityConformance(packageRoot, contractFile))
    diagnostics.push(...findExpiredMigrationWaivers(contractFile))
  }

  for (const file of files) {
    diagnostics.push(...checkCommandSurfaceFile(file))
    diagnostics.push(...checkArchitectureLintReferences(file))
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
  if (temporaryCommandSurfaceDebtPackageRoots.has(packageRoot)) return []

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

  const packageRoot = packageRootForManifest(file.path)
  const diagnostics: FrameworkFinalRatchetDiagnostic[] = []

  for (const [targetName, rawTarget] of Object.entries(parsed.targets)) {
    if (!isRecord(rawTarget) || rawTarget.executor !== "nx:run-commands") continue
    if (isTemporaryRunCommandDebt(file.path, packageRoot, targetName)) continue

    diagnostics.push(finalRatchetDiagnostic(
      "arbitrary-run-commands",
      file.path,
      `Target ${targetName} uses nx:run-commands; final package workflows require typed Nx executors or inferred contract-derived targets.`,
    ))
  }

  return diagnostics
}

function isTemporaryRunCommandDebt(
  filePath: string,
  packageRoot: string | undefined,
  targetName: string,
): boolean {
  if (packageRoot !== undefined) return temporaryCommandSurfaceDebtPackageRoots.has(packageRoot)
  if (temporaryFrameworkRunCommandDebtPaths.has(filePath)) return true
  return filePath === "project.json" && temporaryRootRunCommandDebtTargets.has(targetName)
}

function checkArchitectureLintReferences(file: WorkspaceFile): readonly FrameworkFinalRatchetDiagnostic[] {
  if (!file.content.includes("attune-architecture-lint")) return []
  if (temporaryArchitectureLintReferenceDebtPaths.some((pattern) => pattern.test(file.path))) {
    return []
  }

  return [finalRatchetDiagnostic(
    "stale-architecture-lint-reference",
    file.path,
    "Final architecture surfaces must use attune-architecture; attune-architecture-lint may appear only in explicit migration debt notes until the physical rename lands.",
  )]
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

function isTemporaryFrameworkPolicyWaiver(filePath: string, importSource: string): boolean {
  return (
    filePath === "packages/attune-architecture-lint/src/framework-import-boundary.ts" ||
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

function formatFinalRatchetDiagnostic(diagnostic: FrameworkFinalRatchetDiagnostic): string {
  return [
    "ERROR",
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
): FrameworkFinalRatchetDiagnostic {
  return {
    ruleId: FrameworkFinalRatchetRuleId,
    code,
    severity: "error",
    filePath,
    message,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")
}

function isCliEntryPoint(moduleUrl: string, entryPoint: string | undefined): boolean {
  return entryPoint !== undefined && path.resolve(fileURLToPath(moduleUrl)) === path.resolve(entryPoint)
}
