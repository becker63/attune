import { Effect } from "effect"
import {
  descriptorFromPackageContract,
  type AttuneGeneratedArtifactRecord,
  type AttuneProtocolDelta,
  type AttuneProtocolDescriptor,
} from "@attune/framework-protocol"
import * as ts from "typescript"

type DescriptorPackageContractInput = Parameters<typeof descriptorFromPackageContract>[0]["contract"]

export type PackageContractTargetName =
  | "sync-package-contract"
  | "protocol-materialize"
  | "framework-diagnostics"
  | "service-conformance"
  | "property"
  | "coverage-conformance"
  | "atom-graph-conformance"
  | "check-generated"

export type PackageContractTargetCategory =
  | "sync"
  | "materialization"
  | "diagnostics"
  | "conformance"
  | "property"
  | "coverage"
  | "generation"

export interface PackageContractTargetSemantics {
  readonly targetName: PackageContractTargetName
  readonly category: PackageContractTargetCategory
  readonly purpose: string
  readonly reads: readonly string[]
  readonly writes: readonly string[]
  readonly dependsOn: readonly PackageContractTargetName[]
  readonly evidence: readonly string[]
  readonly affectedBy: readonly PackageContractAffectedChangeKind[]
  readonly runtimeInputs: readonly PackageContractRuntimeInputName[]
  readonly cacheable: boolean
}

export type PackageContractAffectedChangeKind =
  | "package-contract"
  | "schema"
  | "service"
  | "reactivity-key"
  | "atom-graph"
  | "generated-artifact"
  | "runtime-delta"
  | "waiver"
  | "coverage"

export type PackageContractRuntimeInputName =
  | "descriptor-hash"
  | "generated-artifact-hash"
  | "internal-protocol-delta"
  | "repair-action"
  | "runtime-diagnostic"
  | "waiver-state"
  | "evidence-state"

export interface NxProjectLike {
  readonly name?: string
  readonly root?: string
  readonly sourceRoot?: string
  readonly targets?: Readonly<Record<string, unknown>>
  readonly tags?: readonly string[]
  readonly metadata?: {
    readonly attune?: {
      readonly active?: boolean
    }
    readonly [key: string]: unknown
  }
}

export type NxProjectMapLike = Readonly<Record<string, NxProjectLike>>

export type PackageContractDiscoveryStatus =
  | "present"
  | "missing"
  | "invalid-project-root"
  | "inactive"

export interface PackageContractMetadataStub {
  readonly packageId: string
  readonly projectName: string
  readonly projectRoot: string
  readonly sourceRoot: string
  readonly contractPath: string
}

export interface PackageContractDiscoveryEntry {
  readonly projectName: string
  readonly projectRoot: string | null
  readonly sourceRoot: string | null
  readonly contractPath: string | null
  readonly status: PackageContractDiscoveryStatus
  readonly reason: string | null
  readonly metadata: PackageContractMetadataStub | null
}

export interface PackageContractDiscoveryOptions {
  readonly contractFileName?: string
  readonly existingFiles?: Iterable<string>
  readonly includeInactive?: boolean
}

export interface PackageContractDiscovery {
  readonly projects: readonly PackageContractDiscoveryEntry[]
  readonly activeProjectRoots: readonly string[]
  readonly presentContracts: readonly string[]
  readonly missingContracts: readonly PackageContractDiscoveryEntry[]
  readonly invalidProjects: readonly PackageContractDiscoveryEntry[]
}

export interface PackageContractLayerLike {
  readonly provides?: unknown
  readonly requires?: unknown
  readonly metadata?: {
    readonly packageId?: unknown
    readonly role?: unknown
    readonly [key: string]: unknown
  }
  readonly [key: string]: unknown
}

export interface PackageContractModuleLike {
  readonly PackageContract?: unknown
  readonly PackageLayer?: unknown
  readonly PackageTestLayer?: unknown
}

export interface PackageContractSourceFile {
  readonly path: string
  readonly text: string
}

export interface PackageContractStaticViewDiscovery {
  readonly sourcePath: string
  readonly reactivityKeys: readonly string[]
  readonly atoms: readonly string[]
}

export interface PackageContractOperationLike {
  readonly id?: string
  readonly kind?: string
  readonly service?: string
  readonly services?: unknown
  readonly dependencies?: unknown
  readonly requires?: unknown
  readonly provides?: unknown
  readonly views?: {
    readonly reactivityKeys?: readonly string[]
    readonly atoms?: readonly string[]
  }
  readonly metadata?: {
    readonly dependencies?: unknown
    readonly requires?: unknown
    readonly provides?: unknown
    readonly services?: unknown
    readonly views?: {
      readonly reactivityKeys?: readonly string[]
      readonly atoms?: readonly string[]
    }
    readonly [key: string]: unknown
  }
  readonly [key: string]: unknown
}

export interface PackageContractLike {
  readonly packageId?: string
  readonly id?: string
  readonly packageKind?: string
  readonly services?: unknown
  readonly packageServices?: unknown
  readonly providedServices?: unknown
  readonly requiredServices?: unknown
  readonly dependencies?: unknown
  readonly requires?: unknown
  readonly provides?: unknown
  readonly layers?: {
    readonly requires?: unknown
    readonly provides?: unknown
  }
  readonly views?: {
    readonly reactivityKeys?: readonly string[]
    readonly atoms?: readonly string[]
  }
  readonly reactivityKeys?: readonly string[]
  readonly atoms?: readonly string[]
  readonly operations?: readonly PackageContractOperationLike[] | Readonly<Record<string, PackageContractOperationLike>>
  readonly [key: string]: unknown
}

export interface PackageContractSummaryOptions {
  readonly layers?: readonly unknown[]
  readonly packageLayer?: unknown
  readonly packageTestLayer?: unknown
  readonly sourceFiles?: readonly PackageContractSourceFile[]
  readonly sourceDiscoveries?: readonly PackageContractStaticViewDiscovery[]
}

export interface PackageContractDependencySummary {
  readonly packageId: string
  readonly providedServiceIds: readonly string[]
  readonly requiredServiceIds: readonly string[]
  readonly layerServiceEdges: readonly LayerServiceEdge[]
  readonly operationServiceEdges: readonly OperationServiceEdge[]
}

export interface LayerServiceEdge {
  readonly layerId: string
  readonly provides: readonly string[]
  readonly requires: readonly string[]
}

export interface OperationServiceEdge {
  readonly operationId: string
  readonly provides: readonly string[]
  readonly requires: readonly string[]
}

export interface PackageContractAtomGraphSummary {
  readonly packageId: string
  readonly declaredReactivityKeys: readonly string[]
  readonly declaredAtoms: readonly string[]
  readonly sourceDiscoveredReactivityKeys: readonly string[]
  readonly sourceDiscoveredAtoms: readonly string[]
  readonly sourceViewFiles: readonly string[]
  readonly operationViewEdges: readonly OperationViewEdge[]
}

export interface OperationViewEdge {
  readonly operationId: string
  readonly reactivityKeys: readonly string[]
  readonly atoms: readonly string[]
}

export interface PackageContractGraphSummary {
  readonly packageId: string
  readonly dependencies: PackageContractDependencySummary
  readonly atomGraph: PackageContractAtomGraphSummary
}

export interface PackageContractGraphNodeInput {
  readonly projectName: string
  readonly projectRoot: string
  readonly sourceRoot?: string
  readonly contractPath: string
  readonly module: PackageContractModuleLike
  readonly sourceFiles?: readonly PackageContractSourceFile[]
  readonly runtime?: PackageContractRuntimeFacts
}

export interface PackageContractGraphNodeMetadata {
  readonly projectName: string
  readonly projectRoot: string
  readonly sourceRoot: string
  readonly contractPath: string
  readonly packageId: string
  readonly packageKind: string
  readonly protocolId: string
  readonly descriptorHash: string
  readonly operationIds: readonly string[]
  readonly operationCount: number
  readonly dependencies: PackageContractDependencySummary
  readonly atomGraph: PackageContractAtomGraphSummary
  readonly targetSemantics: readonly PackageContractTargetSemantics[]
  readonly runtime: PackageContractRuntimeFacts | null
}

export interface PackageContractServiceOwner {
  readonly serviceId: string
  readonly projectName: string
  readonly packageId: string
}

export interface PackageContractGraphDependencyEdge {
  readonly type: "attune-di"
  readonly sourceProjectName: string
  readonly sourcePackageId: string
  readonly targetProjectName: string
  readonly targetPackageId: string
  readonly serviceIds: readonly string[]
  readonly operationIds: readonly string[]
  readonly layerIds: readonly string[]
}

export interface PackageContractUnresolvedServiceRequirement {
  readonly projectName: string
  readonly packageId: string
  readonly serviceId: string
  readonly operationIds: readonly string[]
  readonly layerIds: readonly string[]
}

export interface PackageContractWorkspaceGraphMetadata {
  readonly projects: readonly PackageContractGraphNodeMetadata[]
  readonly projectMetadata: Readonly<Record<string, {
    readonly attune: {
      readonly packageContract: PackageContractGraphNodeMetadata
    }
  }>>
  readonly serviceOwners: readonly PackageContractServiceOwner[]
  readonly dependencyEdges: readonly PackageContractGraphDependencyEdge[]
  readonly unresolvedServiceRequirements: readonly PackageContractUnresolvedServiceRequirement[]
}

export interface PackageContractAffectedChange {
  readonly projectName?: string
  readonly packageId?: string
  readonly kind: PackageContractAffectedChangeKind
  readonly serviceIds?: readonly string[]
  readonly reactivityKeys?: readonly string[]
  readonly atoms?: readonly string[]
}

export interface PackageContractAffectedTarget {
  readonly projectName: string
  readonly packageId: string
  readonly targetName: PackageContractTargetName
  readonly reason: string
  readonly changeKind: PackageContractAffectedChangeKind
  readonly propagatedFromProjectName?: string
  readonly runtimeInputs: readonly PackageContractRuntimeInputName[]
}

export type PackageContractWorkerIsolationLevel =
  | "main-thread"
  | "worker-thread"
  | "process"
  | "container"

export type PackageContractResourceTier =
  | "commit"
  | "push"
  | "proof-pressure"
  | "nightly"

export interface PackageContractSeedRange {
  readonly start: number
  readonly end: number
}

export interface PackageContractWorkerShardMetadata {
  readonly targetName: string
  readonly packageId: string
  readonly operationId: string
  readonly propertyId: string
  readonly shardId: string
  readonly shardIndex: number
  readonly shardCount: number
  readonly seedRange: PackageContractSeedRange
  readonly coverageCorpus: string
  readonly workerCount: number
  readonly timeoutMs: number
  readonly isolationLevel: PackageContractWorkerIsolationLevel
  readonly resourceTier: PackageContractResourceTier
  readonly randomSource: "main-thread" | "worker"
  readonly evidenceOutput: string
}

export interface PackageContractWorkerShardOptions {
  readonly operationIds?: readonly string[]
  readonly shardCount?: number
  readonly seedsPerShard?: number
  readonly seedStart?: number
  readonly coverageCorpus?: string
  readonly workerCount?: number
  readonly timeoutMs?: number
  readonly isolationLevel?: PackageContractWorkerIsolationLevel
  readonly resourceTier?: PackageContractResourceTier
  readonly randomSource?: "main-thread" | "worker"
}

export interface PackageContractMergeTargetMetadata {
  readonly targetName: "property-evidence-merge" | "atom-graph-coverage-merge"
  readonly packageId: string
  readonly reads: readonly string[]
  readonly writes: readonly string[]
  readonly dependsOn: readonly string[]
  readonly deterministicOrder: readonly string[]
  readonly evidence: readonly string[]
}

export interface PackageContractShardSummary {
  readonly packageId: string
  readonly operationId?: string
  readonly shardId: string
  readonly workerId?: string
  readonly propertyEvidenceArtifacts?: readonly string[]
  readonly atomGraphCoverageArtifacts?: readonly string[]
  readonly status?: string
}

export interface PackageContractMergedShardSummary {
  readonly packageId: string
  readonly shardIds: readonly string[]
  readonly workerIds: readonly string[]
  readonly propertyEvidenceArtifacts: readonly string[]
  readonly atomGraphCoverageArtifacts: readonly string[]
  readonly statuses: readonly string[]
}

export interface PackageProtocolRuntimeSummaryLike {
  readonly packageId: string
  readonly protocolId: string
  readonly descriptorHash?: string
  readonly operationCount: number
  readonly obligationCount: number
  readonly evidenceCount: number
  readonly evidenceRunCount?: number
  readonly replayMetadataCount?: number
  readonly coverageFeedbackCount?: number
  readonly activeWaiverCount?: number
  readonly waiverIssueCount?: number
  readonly staleGeneratedArtifactCount: number
}

export interface PackageContractGeneratedArtifactHashSummary {
  readonly artifactId: string
  readonly path: string
  readonly generatorId: string
  readonly expectedHash: string
  readonly actualHash: string | null
  readonly status: AttuneGeneratedArtifactRecord["status"]
}

export interface PackageContractRuntimeFacts {
  readonly packageId: string
  readonly protocolId: string
  readonly descriptorHash: string | null
  readonly operationCount: number
  readonly obligationCount: number
  readonly evidenceCount: number
  readonly staleGeneratedArtifactCount: number
  readonly evidenceRunCount: number
  readonly replayMetadataCount: number
  readonly coverageFeedbackCount: number
  readonly activeWaiverCount: number
  readonly waiverIssueCount: number
  readonly deltaCount: number
  readonly deltaKinds: readonly AttuneProtocolDelta["kind"][]
  readonly repairTargets: readonly string[]
  readonly diagnosticCodes: readonly string[]
  readonly generatedArtifactHashes: readonly PackageContractGeneratedArtifactHashSummary[]
}

export interface PackageContractRuntimeQueryLike {
  readonly getPackageSummary: (
    packageId: string,
  ) => Effect.Effect<PackageProtocolRuntimeSummaryLike, unknown, never>
  readonly listDeltas: (
    packageId: string,
  ) => Effect.Effect<readonly AttuneProtocolDelta[], unknown, never>
  readonly getPackageEvidenceState?: (
    packageId: string,
  ) => Effect.Effect<{
    readonly generatedArtifacts: readonly AttuneGeneratedArtifactRecord[]
  }, unknown, never>
  readonly getDiagnosticsForFile?: (
    sourcePath: string,
  ) => Effect.Effect<readonly { readonly code: string }[], unknown, never>
}

export interface PackageContractRuntimeFactOptions {
  readonly generatedArtifacts?: readonly AttuneGeneratedArtifactRecord[]
  readonly sourcePath?: string
  readonly diagnostics?: readonly { readonly code: string }[]
}

export class PackageContractGraphError extends Error {
  readonly projectName: string
  readonly contractPath: string

  constructor(input: {
    readonly projectName: string
    readonly contractPath: string
    readonly reason: string
  }) {
    super(`Could not derive package contract graph for ${input.projectName} (${input.contractPath}): ${input.reason}`)
    this.name = "PackageContractGraphError"
    this.projectName = input.projectName
    this.contractPath = input.contractPath
  }
}

const defaultContractFileName = "src/attune.package.ts"

export const packageContractTargetSemantics = [
  {
    targetName: "sync-package-contract",
    category: "sync",
    purpose: "Regenerate the package contract, generated companion shells, central compile-only assertion aggregate, and provenance records from Nx-owned metadata.",
    reads: ["project.json", "attune.source-bom.json", "src/attune.package.ts"],
    writes: [
      "src/attune.package.ts",
      ".attune/cache/typecheck/package-contracts.typecheck.ts",
      "attune.source-bom.json",
    ],
    dependsOn: [],
    evidence: ["deterministic generated contract files", "updated Source BOM shard"],
    affectedBy: ["package-contract", "schema", "service", "reactivity-key", "atom-graph"],
    runtimeInputs: [],
    cacheable: false,
  },
  {
    targetName: "protocol-materialize",
    category: "materialization",
    purpose: "Materialize protocol descriptors, descriptor hashes, obligations, generated artifact expectations, and local runtime cache state from package contracts.",
    reads: ["src/attune.package.ts", "src/**/*.ts", ".attune/cache/protocol/**/*"],
    writes: [".attune/cache/protocol/**/*", "src/generated/attune-*.ts"],
    dependsOn: ["sync-package-contract"],
    evidence: ["protocol descriptor hash", "generated artifact hash records", "obligation derivation"],
    affectedBy: ["package-contract", "schema", "service", "reactivity-key", "atom-graph", "generated-artifact"],
    runtimeInputs: ["descriptor-hash", "generated-artifact-hash"],
    cacheable: true,
  },
  {
    targetName: "framework-diagnostics",
    category: "diagnostics",
    purpose: "Project ProtocolQuery diagnostics, internal deltas, waiver state, and repair actions into Nx check output.",
    reads: ["src/attune.package.ts", ".attune/cache/protocol/**/*"],
    writes: [],
    dependsOn: ["protocol-materialize"],
    evidence: ["ProtocolDelta diagnostics", "repair actions", "waiver state"],
    affectedBy: ["runtime-delta", "waiver", "generated-artifact", "coverage"],
    runtimeInputs: ["internal-protocol-delta", "repair-action", "runtime-diagnostic", "waiver-state"],
    cacheable: true,
  },
  {
    targetName: "service-conformance",
    category: "conformance",
    purpose: "Check that Effect service ids, required services, and package layer declarations match the package contract.",
    reads: ["src/attune.package.ts", "src/**/*.ts"],
    writes: [],
    dependsOn: ["protocol-materialize"],
    evidence: ["DI service graph summary", "compile-only service assertions"],
    affectedBy: ["package-contract", "schema", "service", "runtime-delta"],
    runtimeInputs: ["descriptor-hash", "internal-protocol-delta"],
    cacheable: true,
  },
  {
    targetName: "property",
    category: "property",
    purpose: "Run Schema-derived package-boundary property tests and persist replayable seeds as evidence.",
    reads: ["src/attune.package.ts", "src/**/*.property.ts"],
    writes: [".attune/cache/property-evidence/**/*.json"],
    dependsOn: ["service-conformance"],
    evidence: ["FastCheck seeds", "Schema arbitrary partitions", "operation law results"],
    affectedBy: ["package-contract", "schema", "service", "reactivity-key", "atom-graph", "runtime-delta"],
    runtimeInputs: ["descriptor-hash", "evidence-state", "internal-protocol-delta"],
    cacheable: true,
  },
  {
    targetName: "coverage-conformance",
    category: "coverage",
    purpose: "Compare V8 and property evidence against contract-declared operation, law, and type-guidance coverage.",
    reads: ["src/attune.package.ts", ".attune/cache/property-evidence/**/*", ".attune/cache/coverage/**/*"],
    writes: [".attune/cache/coverage/semantic-coverage.json"],
    dependsOn: ["property"],
    evidence: ["operation coverage matrix", "type-guidance partition hits"],
    affectedBy: ["package-contract", "schema", "service", "reactivity-key", "atom-graph", "coverage"],
    runtimeInputs: ["evidence-state", "runtime-diagnostic"],
    cacheable: true,
  },
  {
    targetName: "atom-graph-conformance",
    category: "conformance",
    purpose: "Check that declared Reactivity keys and atoms account for operation view movement.",
    reads: ["src/attune.package.ts", "src/**/*atom*.ts", "src/**/*reactivity*.ts"],
    writes: [".attune/cache/atom-graph-evidence.json"],
    dependsOn: ["service-conformance"],
    evidence: ["operation-to-Reactivity edges", "operation-to-atom edges"],
    affectedBy: ["package-contract", "reactivity-key", "atom-graph", "runtime-delta"],
    runtimeInputs: ["descriptor-hash", "evidence-state", "runtime-diagnostic"],
    cacheable: true,
  },
  {
    targetName: "check-generated",
    category: "generation",
    purpose: "Fail when generated contract, service, atom, or evidence files drift from their Nx generator provenance.",
    reads: ["attune.source-bom.json", "src/**/*.ts", ".attune/cache/protocol/**/*"],
    writes: [],
    dependsOn: ["protocol-materialize"],
    evidence: ["Source BOM ownership", "generator options hash", "generated-file diff"],
    affectedBy: ["package-contract", "generated-artifact", "runtime-delta"],
    runtimeInputs: ["generated-artifact-hash", "internal-protocol-delta", "repair-action"],
    cacheable: true,
  },
] as const satisfies readonly PackageContractTargetSemantics[]

export function discoverPackageContracts(
  projects: NxProjectMapLike,
  options: PackageContractDiscoveryOptions = {},
): PackageContractDiscovery {
  const contractFileName = normalizeRelativePath(options.contractFileName ?? defaultContractFileName)
  const knownFiles = options.existingFiles === undefined ? null : new Set([...options.existingFiles].map(normalizeRelativePath))
  const entries = Object.entries(projects)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([projectName, project]) => discoverProjectContract(projectName, project, contractFileName, knownFiles, options.includeInactive ?? false))

  const activeEntries = entries.filter((entry) => entry.status !== "inactive")

  return {
    projects: entries,
    activeProjectRoots: activeEntries
      .map((entry) => entry.projectRoot)
      .filter((root): root is string => root !== null),
    presentContracts: activeEntries
      .filter((entry) => entry.status === "present")
      .map((entry) => entry.contractPath)
      .filter((path): path is string => path !== null),
    missingContracts: activeEntries.filter((entry) => entry.status === "missing"),
    invalidProjects: activeEntries.filter((entry) => entry.status === "invalid-project-root"),
  }
}

export function summarizePackageContract(
  contract: PackageContractLike,
  options: PackageContractSummaryOptions = {},
): PackageContractGraphSummary {
  const packageId = packageIdOf(contract)
  return {
    packageId,
    dependencies: summarizePackageContractDependencies(contract, options),
    atomGraph: summarizePackageContractAtomGraph(contract, options),
  }
}

export function summarizePackageContractDependencies(
  contract: PackageContractLike,
  options: PackageContractSummaryOptions = {},
): PackageContractDependencySummary {
  const operations = operationEntries(contract)
  const layerServiceEdges = layerInputs(contract, options).flatMap((layer, index) =>
    layerServiceEdge(layer, `layer:${index}`)
  )
  const operationEdges = operations.map((operation) => {
    const provides = uniqueSorted([
      ...stringList(operation.service),
      ...stringList(operation.services),
      ...stringList(operation.provides),
      ...stringList(operation.metadata?.services),
      ...stringList(operation.metadata?.provides),
    ])
    const requires = uniqueSorted([
      ...stringList(operation.dependencies),
      ...stringList(operation.requires),
      ...stringList(operation.metadata?.dependencies),
      ...stringList(operation.metadata?.requires),
    ])
    return {
      operationId: operation.id ?? "<anonymous>",
      provides,
      requires,
    }
  })

  return {
    packageId: packageIdOf(contract),
    providedServiceIds: uniqueSorted([
      ...stringList(contract.services),
      ...stringList(contract.packageServices),
      ...stringList(contract.providedServices),
      ...stringList(contract.provides),
      ...stringList(contract.layers?.provides),
      ...layerServiceEdges.flatMap((edge) => edge.provides),
      ...operationEdges.flatMap((edge) => edge.provides),
    ]),
    requiredServiceIds: uniqueSorted([
      ...stringList(contract.dependencies),
      ...stringList(contract.requiredServices),
      ...stringList(contract.requires),
      ...stringList(contract.layers?.requires),
      ...layerServiceEdges.flatMap((edge) => edge.requires),
      ...operationEdges.flatMap((edge) => edge.requires),
    ]),
    layerServiceEdges,
    operationServiceEdges: operationEdges,
  }
}

export function summarizePackageContractAtomGraph(
  contract: PackageContractLike,
  options: PackageContractSummaryOptions = {},
): PackageContractAtomGraphSummary {
  const operations = operationEntries(contract)
  const sourceDiscoveries = sourceViewDiscoveries(options)
  const operationViewEdges = operations.map((operation) => {
    const operationViews = operation.views ?? operation.metadata?.views
    return {
      operationId: operation.id ?? "<anonymous>",
      reactivityKeys: uniqueSorted(operationViews?.reactivityKeys ?? []),
      atoms: uniqueSorted(operationViews?.atoms ?? []),
    }
  })

  return {
    packageId: packageIdOf(contract),
    declaredReactivityKeys: uniqueSorted([
      ...(contract.views?.reactivityKeys ?? []),
      ...(contract.reactivityKeys ?? []),
      ...sourceDiscoveries.flatMap((discovery) => discovery.reactivityKeys),
      ...operationViewEdges.flatMap((edge) => edge.reactivityKeys),
    ]),
    declaredAtoms: uniqueSorted([
      ...(contract.views?.atoms ?? []),
      ...(contract.atoms ?? []),
      ...sourceDiscoveries.flatMap((discovery) => discovery.atoms),
      ...operationViewEdges.flatMap((edge) => edge.atoms),
    ]),
    sourceDiscoveredReactivityKeys: uniqueSorted(
      sourceDiscoveries.flatMap((discovery) => discovery.reactivityKeys),
    ),
    sourceDiscoveredAtoms: uniqueSorted(
      sourceDiscoveries.flatMap((discovery) => discovery.atoms),
    ),
    sourceViewFiles: uniqueSorted(
      sourceDiscoveries
        .filter((discovery) => discovery.reactivityKeys.length > 0 || discovery.atoms.length > 0)
        .map((discovery) => discovery.sourcePath),
    ),
    operationViewEdges,
  }
}

export function summarizePackageContractModule(
  module: PackageContractModuleLike,
  options: Omit<PackageContractSummaryOptions, "packageLayer" | "packageTestLayer"> = {},
): PackageContractGraphSummary {
  const contract = packageContractFromModule(module, "<unknown-project>", "<unknown-contract>")
  return summarizePackageContract(contract, {
    ...options,
    packageLayer: module.PackageLayer,
    packageTestLayer: module.PackageTestLayer,
  })
}

export function discoverPackageContractSourceViews(
  source: PackageContractSourceFile,
): PackageContractStaticViewDiscovery {
  const sourceFile = ts.createSourceFile(
    source.path,
    source.text,
    ts.ScriptTarget.Latest,
    true,
    source.path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  )
  const variableArrays = collectStringArrayVariables(sourceFile)
  const reactivityKeys: string[] = []
  const atoms: string[] = []

  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAssignment(node)) {
      const propertyName = propertyNameText(node.name)
      if (propertyName === "reactivityKeys") {
        reactivityKeys.push(...stringArrayValues(node.initializer, variableArrays))
      }
      if (propertyName === "atoms") {
        atoms.push(...stringArrayValues(node.initializer, variableArrays))
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)

  return {
    sourcePath: normalizeRelativePath(source.path),
    reactivityKeys: uniqueSorted(reactivityKeys),
    atoms: uniqueSorted(atoms),
  }
}

export function createPackageContractGraphNode(
  input: PackageContractGraphNodeInput,
): PackageContractGraphNodeMetadata {
  const contract = packageContractFromModule(input.module, input.projectName, input.contractPath)
  const descriptor = descriptorForGraph(input.projectName, input.contractPath, contract)
  const summary = summarizePackageContract(contract, {
    packageLayer: input.module.PackageLayer,
    packageTestLayer: input.module.PackageTestLayer,
    ...(input.sourceFiles === undefined ? {} : { sourceFiles: input.sourceFiles }),
  })

  return {
    projectName: input.projectName,
    projectRoot: normalizeRelativePath(input.projectRoot),
    sourceRoot: normalizeRelativePath(input.sourceRoot ?? `${input.projectRoot}/src`),
    contractPath: normalizeRelativePath(input.contractPath),
    packageId: descriptor.packageId,
    packageKind: descriptor.packageKind,
    protocolId: descriptor.protocolId,
    descriptorHash: descriptor.descriptorHash,
    operationIds: uniqueSorted(descriptor.operations.map((operation) => operation.id)),
    operationCount: descriptor.operations.length,
    dependencies: summary.dependencies,
    atomGraph: summary.atomGraph,
    targetSemantics: packageContractTargetSemantics,
    runtime: input.runtime ?? null,
  }
}

export function derivePackageContractWorkspaceGraph(
  inputs: readonly PackageContractGraphNodeInput[],
): PackageContractWorkspaceGraphMetadata {
  const projects = inputs.map(createPackageContractGraphNode)
  const serviceOwners = serviceOwnersFor(projects)
  const ownerByService = new Map(serviceOwners.map((owner) => [owner.serviceId, owner]))
  const dependencyEdges: PackageContractGraphDependencyEdge[] = []
  const unresolvedServiceRequirements: PackageContractUnresolvedServiceRequirement[] = []

  for (const project of projects) {
    const serviceGroups = groupRequiredServices(project)
    for (const [serviceId, requirement] of serviceGroups) {
      const owner = ownerByService.get(serviceId)
      if (owner === undefined) {
        unresolvedServiceRequirements.push({
          projectName: project.projectName,
          packageId: project.packageId,
          serviceId,
          operationIds: uniqueSorted(requirement.operationIds),
          layerIds: uniqueSorted(requirement.layerIds),
        })
        continue
      }
      if (owner.projectName === project.projectName) continue

      dependencyEdges.push({
        type: "attune-di",
        sourceProjectName: project.projectName,
        sourcePackageId: project.packageId,
        targetProjectName: owner.projectName,
        targetPackageId: owner.packageId,
        serviceIds: [serviceId],
        operationIds: uniqueSorted(requirement.operationIds),
        layerIds: uniqueSorted(requirement.layerIds),
      })
    }
  }

  return {
    projects,
    projectMetadata: Object.fromEntries(
      projects.map((project) => [
        project.projectName,
        {
          attune: {
            packageContract: project,
          },
        },
      ]),
    ),
    serviceOwners,
    dependencyEdges: dependencyEdges.sort(compareDependencyEdges),
    unresolvedServiceRequirements: unresolvedServiceRequirements.sort(compareUnresolvedRequirements),
  }
}

export function descriptorFromPackageContractModule(
  module: PackageContractModuleLike,
  sourcePath: string,
): AttuneProtocolDescriptor {
  const contract = packageContractFromModule(module, "<unknown-project>", sourcePath)
  return descriptorFromPackageContract({
    sourcePath: normalizeRelativePath(sourcePath),
    contract: contract as unknown as DescriptorPackageContractInput,
  })
}

export function summarizePackageContractRuntimeFacts(
  summary: PackageProtocolRuntimeSummaryLike,
  deltas: readonly AttuneProtocolDelta[] = [],
  options: PackageContractRuntimeFactOptions = {},
): PackageContractRuntimeFacts {
  const diagnostics = options.diagnostics ?? []
  return {
    packageId: summary.packageId,
    protocolId: summary.protocolId,
    descriptorHash: summary.descriptorHash ?? null,
    operationCount: summary.operationCount,
    obligationCount: summary.obligationCount,
    evidenceCount: summary.evidenceCount,
    evidenceRunCount: summary.evidenceRunCount ?? 0,
    replayMetadataCount: summary.replayMetadataCount ?? 0,
    coverageFeedbackCount: summary.coverageFeedbackCount ?? 0,
    activeWaiverCount: summary.activeWaiverCount ?? 0,
    waiverIssueCount: summary.waiverIssueCount ?? 0,
    staleGeneratedArtifactCount: summary.staleGeneratedArtifactCount,
    deltaCount: deltas.length,
    deltaKinds: uniqueSorted(deltas.map((delta) => delta.kind)) as readonly AttuneProtocolDelta["kind"][],
    repairTargets: uniqueSorted(
      deltas.flatMap((delta) =>
        delta.repairActions
          .map((action) => action.target)
          .filter((target): target is string => typeof target === "string" && target.length > 0)
      ),
    ),
    diagnosticCodes: uniqueSorted(diagnostics.map((diagnostic) => diagnostic.code)),
    generatedArtifactHashes: (options.generatedArtifacts ?? []).map((artifact) => ({
      artifactId: artifact.artifactId,
      path: artifact.path,
      generatorId: artifact.generatorId,
      expectedHash: artifact.expectedHash,
      actualHash: artifact.actualHash ?? null,
      status: artifact.status,
    })),
  }
}

export async function readPackageContractRuntimeFacts(
  query: PackageContractRuntimeQueryLike,
  packageId: string,
  options: PackageContractRuntimeFactOptions = {},
): Promise<PackageContractRuntimeFacts> {
  const [summary, deltas, evidenceState, diagnostics] = await Promise.all([
    Effect.runPromise(query.getPackageSummary(packageId)),
    Effect.runPromise(query.listDeltas(packageId)),
    query.getPackageEvidenceState === undefined
      ? Promise.resolve(null)
      : Effect.runPromise(query.getPackageEvidenceState(packageId)),
    query.getDiagnosticsForFile === undefined || options.sourcePath === undefined
      ? Promise.resolve(options.diagnostics ?? [])
      : Effect.runPromise(query.getDiagnosticsForFile(options.sourcePath)),
  ])
  const runtimeOptions: PackageContractRuntimeFactOptions = {
    ...options,
    diagnostics,
  }
  const generatedArtifacts = evidenceState?.generatedArtifacts ?? options.generatedArtifacts
  return summarizePackageContractRuntimeFacts(
    summary,
    deltas,
    generatedArtifacts === undefined ? runtimeOptions : { ...runtimeOptions, generatedArtifacts },
  )
}

export function inferPackageContractTargetSemantics(
  targetNames: readonly PackageContractTargetName[] = packageContractTargetSemantics.map((target) => target.targetName),
): readonly PackageContractTargetSemantics[] {
  const requested = new Set(targetNames)
  return packageContractTargetSemantics.filter((target) => requested.has(target.targetName))
}

export function derivePackageContractAffectedTargets(
  graph: PackageContractWorkspaceGraphMetadata,
  changes: readonly PackageContractAffectedChange[],
): readonly PackageContractAffectedTarget[] {
  const targets: PackageContractAffectedTarget[] = []
  const projectByName = new Map(graph.projects.map((project) => [project.projectName, project]))
  const projectByPackage = new Map(graph.projects.map((project) => [project.packageId, project]))

  for (const change of changes) {
    const directProject = directProjectForChange(change, projectByName, projectByPackage)
    if (directProject !== undefined) {
      targets.push(...affectedTargetsForProject(directProject, change, affectedReasonFor(change, directProject)))
    }
    targets.push(...servicePropagationTargetsForChange(graph, change, directProject, projectByName))
  }

  return uniqueAffectedTargets(targets)
}

function affectedTargetsForProject(
  project: PackageContractGraphNodeMetadata,
  change: PackageContractAffectedChange,
  reason: string,
  propagatedFromProjectName?: string,
): readonly PackageContractAffectedTarget[] {
  return targetsForChange(change.kind, project).map((target) => ({
    projectName: project.projectName,
    packageId: project.packageId,
    targetName: target.targetName,
    reason,
    changeKind: change.kind,
    ...(propagatedFromProjectName === undefined ? {} : { propagatedFromProjectName }),
    runtimeInputs: target.runtimeInputs,
  }))
}

function servicePropagationTargetsForChange(
  graph: PackageContractWorkspaceGraphMetadata,
  change: PackageContractAffectedChange,
  directProject: PackageContractGraphNodeMetadata | undefined,
  projectByName: ReadonlyMap<string, PackageContractGraphNodeMetadata>,
): readonly PackageContractAffectedTarget[] {
  if (change.kind !== "service") return []

  const serviceIds = new Set(change.serviceIds ?? directProject?.dependencies.providedServiceIds ?? [])
  return graph.dependencyEdges.flatMap((edge) => {
    if (!serviceEdgeMatchesChange(edge, directProject, serviceIds)) return []
    const consumer = projectByName.get(edge.sourceProjectName)
    if (consumer === undefined) return []

    return affectedTargetsForProject(
      consumer,
      change,
      `DI service dependency changed through ${edge.serviceIds.join(", ")}`,
      edge.targetProjectName,
    )
  })
}

function serviceEdgeMatchesChange(
  edge: PackageContractGraphDependencyEdge,
  directProject: PackageContractGraphNodeMetadata | undefined,
  serviceIds: ReadonlySet<string>,
): boolean {
  if (directProject !== undefined && edge.targetProjectName !== directProject.projectName) return false
  return serviceIds.size === 0 || edge.serviceIds.some((serviceId) => serviceIds.has(serviceId))
}

export function inferWorkerizedPropertyShardMetadata(
  project: PackageContractGraphNodeMetadata,
  options: PackageContractWorkerShardOptions = {},
): readonly PackageContractWorkerShardMetadata[] {
  const operationIds = uniqueSorted(options.operationIds ?? project.operationIds)
  const shardCount = positiveInteger(options.shardCount, 1)
  const seedsPerShard = positiveInteger(options.seedsPerShard, 100)
  const seedStart = nonNegativeInteger(options.seedStart, 0)
  const workerCount = positiveInteger(options.workerCount, 1)
  const timeoutMs = positiveInteger(options.timeoutMs, 30_000)
  const coverageCorpus = options.coverageCorpus ?? `.attune/cache/property-evidence/${project.packageId}/corpus.json`
  const isolationLevel = options.isolationLevel ?? "worker-thread"
  const resourceTier = options.resourceTier ?? "commit"
  const randomSource = options.randomSource ?? "worker"

  return operationIds.flatMap((operationId) =>
    Array.from({ length: shardCount }, (_, shardIndex) => {
      const shardSeedStart = seedStart + shardIndex * seedsPerShard
      const shardSeedEnd = shardSeedStart + seedsPerShard - 1
      const shardId = `shard-${shardIndex}-of-${shardCount}`
      return {
        targetName: `property:${operationId}:${shardId}`,
        packageId: project.packageId,
        operationId,
        propertyId: `${project.packageId}.${operationId}.property`,
        shardId,
        shardIndex,
        shardCount,
        seedRange: {
          start: shardSeedStart,
          end: shardSeedEnd,
        },
        coverageCorpus,
        workerCount,
        timeoutMs,
        isolationLevel,
        resourceTier,
        randomSource,
        evidenceOutput: `.attune/cache/property-evidence/${project.packageId}/${operationId}/${shardId}.json`,
      }
    })
  )
}

export function inferDeterministicMergeTargetMetadata(
  project: PackageContractGraphNodeMetadata,
): readonly PackageContractMergeTargetMetadata[] {
  const shardPattern = `.attune/cache/property-evidence/${project.packageId}/**/*.json`
  return [
    {
      targetName: "property-evidence-merge",
      packageId: project.packageId,
      reads: [shardPattern],
      writes: [`.attune/cache/property-evidence/${project.packageId}/merged.json`],
      dependsOn: project.operationIds.map((operationId) => `property:${operationId}:*`),
      deterministicOrder: ["packageId", "operationId", "shardId", "workerId"],
      evidence: ["merged property evidence", "replay seed index"],
    },
    {
      targetName: "atom-graph-coverage-merge",
      packageId: project.packageId,
      reads: [shardPattern],
      writes: [`.attune/cache/atom-graph/${project.packageId}/coverage-summary.json`],
      dependsOn: ["property-evidence-merge", "atom-graph-conformance"],
      deterministicOrder: ["packageId", "operationId", "shardId", "workerId", "atomGraphEdge"],
      evidence: ["merged atom graph coverage summary", "missing graph edge diagnostics"],
    },
  ]
}

export function mergePackageContractShardSummaries(
  shards: readonly PackageContractShardSummary[],
): readonly PackageContractMergedShardSummary[] {
  const groups = new Map<string, PackageContractShardSummary[]>()
  for (const shard of shards) {
    const group = groups.get(shard.packageId) ?? []
    group.push(shard)
    groups.set(shard.packageId, group)
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([packageId, group]) => {
      const ordered = group.toSorted(compareShardSummaries)
      return {
        packageId,
        shardIds: uniqueSorted(ordered.map((shard) => shard.shardId)),
        workerIds: uniqueSorted(
          ordered
            .map((shard) => shard.workerId)
            .filter((workerId): workerId is string => workerId !== undefined),
        ),
        propertyEvidenceArtifacts: uniqueSorted(
          ordered.flatMap((shard) => shard.propertyEvidenceArtifacts ?? []),
        ),
        atomGraphCoverageArtifacts: uniqueSorted(
          ordered.flatMap((shard) => shard.atomGraphCoverageArtifacts ?? []),
        ),
        statuses: uniqueSorted(
          ordered
            .map((shard) => shard.status)
            .filter((status): status is string => status !== undefined),
        ),
      }
    })
}

function discoverProjectContract(
  projectName: string,
  project: NxProjectLike,
  contractFileName: string,
  knownFiles: ReadonlySet<string> | null,
  includeInactive: boolean,
): PackageContractDiscoveryEntry {
  if (project.metadata?.attune?.active === false && !includeInactive) {
    return {
      projectName,
      projectRoot: normalizeProjectRoot(project.root),
      sourceRoot: normalizeProjectRoot(project.sourceRoot),
      contractPath: null,
      status: "inactive",
      reason: "project is explicitly marked inactive",
      metadata: null,
    }
  }

  const root = normalizeProjectRoot(project.root)
  if (root === null) {
    return {
      projectName,
      projectRoot: null,
      sourceRoot: normalizeProjectRoot(project.sourceRoot),
      contractPath: null,
      status: "invalid-project-root",
      reason: "project root is missing or empty",
      metadata: null,
    }
  }

  const sourceRoot = normalizeProjectRoot(project.sourceRoot) ?? `${root}/src`
  const contractPath = `${root}/${contractFileName}`
  const exists = knownFiles === null || knownFiles.has(contractPath)

  return {
    projectName,
    projectRoot: root,
    sourceRoot,
    contractPath,
    status: exists ? "present" : "missing",
    reason: exists ? null : "src/attune.package.ts was not found for active project",
    metadata: {
      packageId: project.name ?? projectName,
      projectName,
      projectRoot: root,
      sourceRoot,
      contractPath,
    },
  }
}

function packageContractFromModule(
  module: PackageContractModuleLike,
  projectName: string,
  contractPath: string,
): PackageContractLike {
  if (isRecord(module.PackageContract)) {
    return module.PackageContract
  }

  throw new PackageContractGraphError({
    projectName,
    contractPath,
    reason: "PackageContract export is missing or is not an object",
  })
}

function descriptorForGraph(
  projectName: string,
  contractPath: string,
  contract: PackageContractLike,
): AttuneProtocolDescriptor {
  try {
    return descriptorFromPackageContract({
      sourcePath: normalizeRelativePath(contractPath),
      contract: contract as unknown as DescriptorPackageContractInput,
    })
  } catch (error) {
    throw new PackageContractGraphError({
      projectName,
      contractPath,
      reason: errorMessage(error),
    })
  }
}

function layerInputs(
  contract: PackageContractLike,
  options: PackageContractSummaryOptions,
): readonly unknown[] {
  return [
    contract.layers,
    options.packageLayer,
    options.packageTestLayer,
    ...(options.layers ?? []),
  ].filter((layer) => layer !== undefined)
}

function layerServiceEdge(layer: unknown, fallbackLayerId: string): readonly LayerServiceEdge[] {
  if (!isRecord(layer)) return []

  const provides = uniqueSorted(stringList(layer.provides))
  const requires = uniqueSorted(stringList(layer.requires))
  if (provides.length === 0 && requires.length === 0) return []

  const metadata = isRecord(layer.metadata) ? layer.metadata : {}
  const layerId = typeof metadata.role === "string" && metadata.role.length > 0
    ? metadata.role
    : fallbackLayerId

  return [{
    layerId,
    provides,
    requires,
  }]
}

function sourceViewDiscoveries(
  options: PackageContractSummaryOptions,
): readonly PackageContractStaticViewDiscovery[] {
  return [
    ...(options.sourceDiscoveries ?? []),
    ...(options.sourceFiles ?? []).map(discoverPackageContractSourceViews),
  ]
}

function collectStringArrayVariables(
  sourceFile: ts.SourceFile,
): ReadonlyMap<string, readonly string[]> {
  const variableArrays = new Map<string, readonly string[]>()

  const visit = (node: ts.Node): void => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer !== undefined) {
      const values = stringArrayValues(node.initializer, variableArrays)
      if (values.length > 0) {
        variableArrays.set(node.name.text, values)
      }
    }
    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return variableArrays
}

function stringArrayValues(
  expression: ts.Expression,
  variableArrays: ReadonlyMap<string, readonly string[]>,
): readonly string[] {
  const unwrapped = unwrapExpression(expression)

  if (ts.isArrayLiteralExpression(unwrapped)) {
    return uniqueSorted(
      unwrapped.elements.flatMap((element) => {
        if (ts.isSpreadElement(element)) {
          return stringArrayValues(element.expression, variableArrays)
        }
        if (isStringLiteralLike(element)) {
          return [element.text]
        }
        if (ts.isIdentifier(element)) {
          return variableArrays.get(element.text) ?? []
        }
        return []
      }),
    )
  }

  if (ts.isIdentifier(unwrapped)) {
    return variableArrays.get(unwrapped.text) ?? []
  }

  return []
}

function unwrapExpression(expression: ts.Expression): ts.Expression {
  let current = expression
  while (
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current)
  ) {
    current = current.expression
  }
  return current
}

function propertyNameText(name: ts.PropertyName): string | null {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text
  }
  return null
}

function isStringLiteralLike(node: ts.Node): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)
}

function serviceOwnersFor(
  projects: readonly PackageContractGraphNodeMetadata[],
): readonly PackageContractServiceOwner[] {
  return projects
    .flatMap((project) =>
      project.dependencies.providedServiceIds.map((serviceId) => ({
        serviceId,
        projectName: project.projectName,
        packageId: project.packageId,
      }))
    )
    .sort((left, right) =>
      left.serviceId.localeCompare(right.serviceId) ||
      left.projectName.localeCompare(right.projectName)
    )
}

interface ServiceRequirementGroup {
  readonly operationIds: string[]
  readonly layerIds: string[]
}

function groupRequiredServices(
  project: PackageContractGraphNodeMetadata,
): ReadonlyMap<string, ServiceRequirementGroup> {
  const groups = new Map<string, ServiceRequirementGroup>()
  const ensureGroup = (serviceId: string): ServiceRequirementGroup => {
    const existing = groups.get(serviceId)
    if (existing !== undefined) return existing

    const created = { operationIds: [], layerIds: [] }
    groups.set(serviceId, created)
    return created
  }

  for (const serviceId of project.dependencies.requiredServiceIds) {
    ensureGroup(serviceId)
  }
  for (const edge of project.dependencies.operationServiceEdges) {
    for (const serviceId of edge.requires) {
      ensureGroup(serviceId).operationIds.push(edge.operationId)
    }
  }
  for (const edge of project.dependencies.layerServiceEdges) {
    for (const serviceId of edge.requires) {
      ensureGroup(serviceId).layerIds.push(edge.layerId)
    }
  }

  return groups
}

function compareDependencyEdges(
  left: PackageContractGraphDependencyEdge,
  right: PackageContractGraphDependencyEdge,
): number {
  return left.sourceProjectName.localeCompare(right.sourceProjectName) ||
    left.targetProjectName.localeCompare(right.targetProjectName) ||
    left.serviceIds.join(",").localeCompare(right.serviceIds.join(","))
}

function compareUnresolvedRequirements(
  left: PackageContractUnresolvedServiceRequirement,
  right: PackageContractUnresolvedServiceRequirement,
): number {
  return left.projectName.localeCompare(right.projectName) ||
    left.serviceId.localeCompare(right.serviceId)
}

function directProjectForChange(
  change: PackageContractAffectedChange,
  projectByName: ReadonlyMap<string, PackageContractGraphNodeMetadata>,
  projectByPackage: ReadonlyMap<string, PackageContractGraphNodeMetadata>,
): PackageContractGraphNodeMetadata | undefined {
  if (change.projectName !== undefined) {
    return projectByName.get(change.projectName)
  }
  if (change.packageId !== undefined) {
    return projectByPackage.get(change.packageId)
  }

  if (change.reactivityKeys !== undefined || change.atoms !== undefined) {
    const reactivityKeys = new Set(change.reactivityKeys ?? [])
    const atoms = new Set(change.atoms ?? [])
    return [...projectByName.values()].find((project) =>
      project.atomGraph.declaredReactivityKeys.some((key) => reactivityKeys.has(key)) ||
      project.atomGraph.declaredAtoms.some((atom) => atoms.has(atom))
    )
  }

  return undefined
}

function targetsForChange(
  changeKind: PackageContractAffectedChangeKind,
  project: PackageContractGraphNodeMetadata,
): readonly PackageContractTargetSemantics[] {
  const affected = packageContractTargetSemantics.filter((target) =>
    (target.affectedBy as readonly PackageContractAffectedChangeKind[]).includes(changeKind)
  )

  if (changeKind === "reactivity-key") {
    return affected.filter((target) =>
      target.targetName === "property" ||
      target.targetName === "coverage-conformance" ||
      target.targetName === "atom-graph-conformance" ||
      target.targetName === "protocol-materialize"
    )
  }

  if (changeKind === "atom-graph" && project.atomGraph.declaredAtoms.length === 0) {
    return affected.filter((target) => target.targetName !== "atom-graph-conformance")
  }

  return affected
}

function affectedReasonFor(
  change: PackageContractAffectedChange,
  project: PackageContractGraphNodeMetadata,
): string {
  switch (change.kind) {
    case "schema":
      return "operation schema changed; property and coverage conformance must refresh"
    case "service":
      return "service contract changed; DI conformance and dependent property targets must refresh"
    case "reactivity-key":
      return "Reactivity key changed; atom graph and semantic coverage must refresh"
    case "atom-graph":
      return "atom graph changed; view movement conformance must refresh"
    case "generated-artifact":
      return "generated artifact hash changed; materialization checks must refresh"
    case "runtime-delta":
      return "Protocol runtime delta changed; framework diagnostics must refresh"
    case "waiver":
      return "waiver state changed; framework diagnostics must refresh"
    case "coverage":
      return "coverage evidence changed; coverage diagnostics must refresh"
    case "package-contract":
      return `package contract changed for ${project.packageId}`
  }
}

function uniqueAffectedTargets(
  targets: readonly PackageContractAffectedTarget[],
): readonly PackageContractAffectedTarget[] {
  const byKey = new Map<string, PackageContractAffectedTarget>()
  for (const target of targets) {
    const key = [
      target.projectName,
      target.targetName,
      target.changeKind,
      target.propagatedFromProjectName ?? "",
    ].join(":")
    const existing = byKey.get(key)
    if (existing === undefined) {
      byKey.set(key, target)
      continue
    }
    byKey.set(key, {
      ...existing,
      runtimeInputs: uniqueSorted([
        ...existing.runtimeInputs,
        ...target.runtimeInputs,
      ]) as readonly PackageContractRuntimeInputName[],
    })
  }

  return [...byKey.values()].sort((left, right) =>
    left.projectName.localeCompare(right.projectName) ||
    left.targetName.localeCompare(right.targetName) ||
    left.changeKind.localeCompare(right.changeKind)
  )
}

function compareShardSummaries(
  left: PackageContractShardSummary,
  right: PackageContractShardSummary,
): number {
  return left.packageId.localeCompare(right.packageId) ||
    (left.operationId ?? "").localeCompare(right.operationId ?? "") ||
    left.shardId.localeCompare(right.shardId) ||
    (left.workerId ?? "").localeCompare(right.workerId ?? "")
}

function operationEntries(contract: PackageContractLike): readonly PackageContractOperationLike[] {
  if (Array.isArray(contract.operations)) {
    return contract.operations
  }
  if (isRecord(contract.operations)) {
    return Object.entries(contract.operations).map(([id, operation]) => ({
      id,
      ...(isRecord(operation) ? operation : {}),
    }))
  }
  return []
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function packageIdOf(contract: PackageContractLike): string {
  return contract.packageId ?? contract.id ?? "<unknown-package>"
}

function normalizeProjectRoot(root: string | undefined): string | null {
  if (root === undefined || root.trim() === "") {
    return null
  }
  return normalizeRelativePath(root)
}

function normalizeRelativePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\.\/+/, "").replace(/\/+$/, "")
}

function stringList(value: unknown): readonly string[] {
  if (typeof value === "string" && value.length > 0) {
    return [value]
  }
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0)
  }
  if (isRecord(value)) {
    if (Array.isArray(value.services)) {
      return stringList(value.services)
    }
    if (Array.isArray(value.serviceIds)) {
      return stringList(value.serviceIds)
    }
    return Object.keys(value)
  }
  return []
}

function uniqueSorted(values: Iterable<string>): readonly string[] {
  return [...new Set([...values].filter((value) => value.length > 0))].sort()
}

function positiveInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && value !== undefined && value > 0 ? value : fallback
}

function nonNegativeInteger(value: number | undefined, fallback: number): number {
  return Number.isInteger(value) && value !== undefined && value >= 0 ? value : fallback
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
