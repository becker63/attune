export type PackageContractTargetName =
  | "sync-package-contract"
  | "service-conformance"
  | "property"
  | "coverage-conformance"
  | "atom-graph-conformance"
  | "check-generated"

export type PackageContractTargetCategory =
  | "sync"
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
  readonly cacheable: boolean
}

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
  readonly services?: unknown
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

export interface PackageContractDependencySummary {
  readonly packageId: string
  readonly providedServiceIds: readonly string[]
  readonly requiredServiceIds: readonly string[]
  readonly operationServiceEdges: readonly OperationServiceEdge[]
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

const defaultContractFileName = "src/attune.package.ts"

export const packageContractTargetSemantics = [
  {
    targetName: "sync-package-contract",
    category: "sync",
    purpose: "Regenerate the package contract, compile-only assertion shell, type-guidance shell, and provenance records from Nx-owned metadata.",
    reads: ["project.json", "attune.source-bom.json", "src/attune.package.ts"],
    writes: ["src/attune.package.ts", "src/attune.package.typecheck.ts", "attune.source-bom.json"],
    dependsOn: [],
    evidence: ["deterministic generated contract files", "updated Source BOM shard"],
    cacheable: false,
  },
  {
    targetName: "service-conformance",
    category: "conformance",
    purpose: "Check that Effect service ids, required services, and package layer declarations match the package contract.",
    reads: ["src/attune.package.ts", "src/**/*.ts"],
    writes: [],
    dependsOn: ["sync-package-contract"],
    evidence: ["DI service graph summary", "compile-only service assertions"],
    cacheable: true,
  },
  {
    targetName: "property",
    category: "property",
    purpose: "Run Schema-derived package-boundary property tests and persist replayable seeds as evidence.",
    reads: ["src/attune.package.ts", "src/**/*.property.ts"],
    writes: ["coverage/property-evidence.json"],
    dependsOn: ["service-conformance"],
    evidence: ["FastCheck seeds", "Schema arbitrary partitions", "operation law results"],
    cacheable: true,
  },
  {
    targetName: "coverage-conformance",
    category: "coverage",
    purpose: "Compare V8 and property evidence against contract-declared operation, law, and type-guidance coverage.",
    reads: ["src/attune.package.ts", "coverage/**/*"],
    writes: ["coverage/semantic-coverage.json"],
    dependsOn: ["property"],
    evidence: ["operation coverage matrix", "type-guidance partition hits"],
    cacheable: true,
  },
  {
    targetName: "atom-graph-conformance",
    category: "conformance",
    purpose: "Check that declared Reactivity keys and atoms account for operation view movement.",
    reads: ["src/attune.package.ts", "src/**/*atom*.ts", "src/**/*reactivity*.ts"],
    writes: ["coverage/atom-graph-evidence.json"],
    dependsOn: ["service-conformance"],
    evidence: ["operation-to-Reactivity edges", "operation-to-atom edges"],
    cacheable: true,
  },
  {
    targetName: "check-generated",
    category: "generation",
    purpose: "Fail when generated contract, service, atom, or evidence files drift from their Nx generator provenance.",
    reads: ["attune.source-bom.json", "src/**/*.ts"],
    writes: [],
    dependsOn: ["sync-package-contract"],
    evidence: ["Source BOM ownership", "generator options hash", "generated-file diff"],
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

export function summarizePackageContract(contract: PackageContractLike): PackageContractGraphSummary {
  const packageId = packageIdOf(contract)
  return {
    packageId,
    dependencies: summarizePackageContractDependencies(contract),
    atomGraph: summarizePackageContractAtomGraph(contract),
  }
}

export function summarizePackageContractDependencies(
  contract: PackageContractLike,
): PackageContractDependencySummary {
  const operations = operationEntries(contract)
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
      ...stringList(contract.provides),
      ...stringList(contract.layers?.provides),
      ...operationEdges.flatMap((edge) => edge.provides),
    ]),
    requiredServiceIds: uniqueSorted([
      ...stringList(contract.dependencies),
      ...stringList(contract.requires),
      ...stringList(contract.layers?.requires),
      ...operationEdges.flatMap((edge) => edge.requires),
    ]),
    operationServiceEdges: operationEdges,
  }
}

export function summarizePackageContractAtomGraph(
  contract: PackageContractLike,
): PackageContractAtomGraphSummary {
  const operations = operationEntries(contract)
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
      ...operationViewEdges.flatMap((edge) => edge.reactivityKeys),
    ]),
    declaredAtoms: uniqueSorted([
      ...(contract.views?.atoms ?? []),
      ...(contract.atoms ?? []),
      ...operationViewEdges.flatMap((edge) => edge.atoms),
    ]),
    operationViewEdges,
  }
}

export function inferPackageContractTargetSemantics(
  targetNames: readonly PackageContractTargetName[] = packageContractTargetSemantics.map((target) => target.targetName),
): readonly PackageContractTargetSemantics[] {
  const requested = new Set(targetNames)
  return packageContractTargetSemantics.filter((target) => requested.has(target.targetName))
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

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
