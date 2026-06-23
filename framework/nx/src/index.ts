import {
  hashProtocolValue,
  type AttuneGeneratedArtifactRecord,
  type AttuneProtocolDescriptor,
  type AttuneProtocolOperationDescriptor,
} from "@attune/framework-protocol"
import { Schema } from "effect"

export interface FrameworkNxActionPlan {
  readonly actionId: string
  readonly title: string
  readonly sourcePath: string
  readonly packageId: string
  readonly operationId?: string
  readonly generatorOrTarget: string
  readonly options: Readonly<Record<string, unknown>>
  readonly validationTarget?: string
}

export const FrameworkNxActionPlanSchema = Schema.Struct({
  actionId: Schema.String,
  title: Schema.String,
  sourcePath: Schema.String,
  packageId: Schema.String,
  operationId: Schema.optional(Schema.String),
  generatorOrTarget: Schema.String,
  options: Schema.Record(Schema.String, Schema.Unknown),
  validationTarget: Schema.optional(Schema.String),
})

export const FrameworkNxGeneratedArtifactKindSchema = Schema.Literals([
  "package-harness",
  "operation-registry",
  "property-evidence",
  "atom-view-edges",
  "type-guidance",
] as const)
export type FrameworkNxGeneratedArtifactKind = typeof FrameworkNxGeneratedArtifactKindSchema.Type

export interface FrameworkNxGeneratedArtifact {
  readonly kind: FrameworkNxGeneratedArtifactKind
  readonly path: string
  readonly generatorId: string
  readonly content: string
  readonly contentHash: string
}

export interface FrameworkNxDescriptorHashRecord {
  readonly recordId: string
  readonly protocolId: string
  readonly packageId: string
  readonly sourcePath: string
  readonly descriptorHash: string
  readonly status: "current"
}

export interface FrameworkNxReportOutputFinding {
  readonly path: string
  readonly reason: string
  readonly suggestedTarget: string
}

export interface FrameworkNxMaterializationPlan {
  readonly packageId: string
  readonly protocolId: string
  readonly sourcePath: string
  readonly descriptorHashRecord: FrameworkNxDescriptorHashRecord
  readonly actions: readonly FrameworkNxActionPlan[]
  readonly generatedArtifacts: readonly FrameworkNxGeneratedArtifact[]
  readonly generatedArtifactRecords: readonly AttuneGeneratedArtifactRecord[]
  readonly checkedInReportFindings: readonly FrameworkNxReportOutputFinding[]
}

const generatorTargets = {
  protocolMaterialize: "@attune/framework-nx:protocol-materialize",
  packageHarness: "@attune/framework-nx:package-harness",
  operationRegistry: "@attune/framework-nx:operation-registry",
  propertyEvidence: "@attune/framework-nx:protocol-evidence",
  atomViewEdge: "@attune/framework-nx:atom-view-edge",
  typeGuidance: "@attune/framework-nx:type-guidance",
  frameworkDiagnostics: "workspace:package-contracts-check",
} as const

export const frameworkRepairTargets = {
  workspaceCheck: "workspace:attune-check",
  workspaceRepair: "workspace:attune-repair",
  projectRepair: (project: string): string => `${project}:attune:repair`,
  projectRepairRegistry: (project: string): string => `${project}:attune:repair-registry`,
  projectRepairProperties: (project: string): string => `${project}:attune:repair-properties`,
  projectRepairTypeGuidance: (project: string): string => `${project}:attune:repair-type-guidance`,
  projectRepairEvidence: (project: string): string => `${project}:attune:repair-evidence`,
  projectRepairGenerated: (project: string): string => `${project}:attune:repair-generated`,
} as const

const generatedFileNames: Record<FrameworkNxGeneratedArtifactKind, string> = {
  "package-harness": "attune-package-harness.ts",
  "operation-registry": "attune-operation-registry.ts",
  "property-evidence": "attune-property-evidence.ts",
  "atom-view-edges": "attune-atom-view-edges.ts",
  "type-guidance": "attune-type-guidance.ts",
}

const artifactGeneratorIds: Record<FrameworkNxGeneratedArtifactKind, string> = {
  "package-harness": generatorTargets.packageHarness,
  "operation-registry": generatorTargets.operationRegistry,
  "property-evidence": generatorTargets.propertyEvidence,
  "atom-view-edges": generatorTargets.atomViewEdge,
  "type-guidance": generatorTargets.typeGuidance,
}

const reportPathPatterns = [
  /(^|[/.-])protocol[-.]?delta(s)?([/.-]|$)/i,
  /(^|[/.-])obligation[-.]?report(s)?([/.-]|$)/i,
  /(^|[/.-])evidence[-.]?summar(y|ies)([/.-]|$)/i,
  /(^|[/.-])architecture[-.]?(summar(y|ies)|report(s)?)([/.-]|$)/i,
  /(^|[/.-])generated[-.]?report(s)?([/.-]|$)/i,
  /(^|[/.-])linear[-.]?summar(y|ies)([/.-]|$)/i,
  /(^|[/.-])github[-.]?summar(y|ies)([/.-]|$)/i,
  /(^|[/.-])cloud[-.]?agent[-.]?report(s)?([/.-]|$)/i,
]

export const createFrameworkNxActionPlan = (
  plan: FrameworkNxActionPlan,
): FrameworkNxActionPlan => plan

const validationTargetFor = (packageId: string): string => `${packageId}:check-generated`

const optionalOperation = (operationId: string | undefined): Record<string, string> =>
  operationId === undefined ? {} : { operationId }

export const protocolMaterializeAction = (
  packageId: string,
  sourcePath: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.protocol.materialize",
    title: "Refresh protocol materialization",
    sourcePath,
    packageId,
    generatorOrTarget: generatorTargets.protocolMaterialize,
    options: { packageId },
    validationTarget: validationTargetFor(packageId),
  })

export const operationRegistryAction = (
  packageId: string,
  sourcePath: string,
  operationId?: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.protocol.operation-registry",
    title: "Generate operation registry",
    sourcePath,
    packageId,
    ...optionalOperation(operationId),
    generatorOrTarget: generatorTargets.operationRegistry,
    options: {
      packageId,
      ...optionalOperation(operationId),
    },
    validationTarget: validationTargetFor(packageId),
  })

export const packageHarnessAction = (
  packageId: string,
  sourcePath: string,
  operationId?: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.protocol.package-harness",
    title: "Generate Schema-coded package harness",
    sourcePath,
    packageId,
    ...optionalOperation(operationId),
    generatorOrTarget: generatorTargets.packageHarness,
    options: {
      packageId,
      ...optionalOperation(operationId),
    },
    validationTarget: validationTargetFor(packageId),
  })

export const propertyEvidenceAction = (
  packageId: string,
  sourcePath: string,
  operationId?: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.protocol.property-evidence",
    title: "Generate property evidence scaffold",
    sourcePath,
    packageId,
    ...optionalOperation(operationId),
    generatorOrTarget: generatorTargets.propertyEvidence,
    options: {
      packageId,
      ...optionalOperation(operationId),
    },
    validationTarget: validationTargetFor(packageId),
  })

export const atomViewEdgeAction = (
  packageId: string,
  sourcePath: string,
  operationId?: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.protocol.atom-view-edge",
    title: "Generate missing atom view edge",
    sourcePath,
    packageId,
    ...optionalOperation(operationId),
    generatorOrTarget: generatorTargets.atomViewEdge,
    options: {
      packageId,
      ...optionalOperation(operationId),
    },
    validationTarget: validationTargetFor(packageId),
  })

export const typeGuidanceAction = (
  packageId: string,
  sourcePath: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.protocol.type-guidance",
    title: "Refresh type-guidance partitions",
    sourcePath,
    packageId,
    generatorOrTarget: generatorTargets.typeGuidance,
    options: { packageId },
    validationTarget: validationTargetFor(packageId),
  })

export const frameworkDiagnosticsAction = (
  packageId: string,
  sourcePath: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.protocol.framework-diagnostics",
    title: "Run framework diagnostics",
    sourcePath,
    packageId,
    generatorOrTarget: generatorTargets.frameworkDiagnostics,
    options: { packageId },
    validationTarget: generatorTargets.frameworkDiagnostics,
  })

export const generatedArtifactPath = (
  sourcePath: string,
  kind: FrameworkNxGeneratedArtifactKind,
): string => `${sourceDirectory(sourcePath)}/generated/${generatedFileNames[kind]}`

export const createDescriptorHashRecord = (
  descriptor: AttuneProtocolDescriptor,
): FrameworkNxDescriptorHashRecord => ({
  recordId: `${descriptor.protocolId}:descriptor-hash`,
  protocolId: descriptor.protocolId,
  packageId: descriptor.packageId,
  sourcePath: descriptor.sourcePath,
  descriptorHash: descriptor.descriptorHash,
  status: "current",
})

export const hashGeneratedArtifactContent = (content: string): string =>
  hashProtocolValue(content)

export const createGeneratedArtifact = (
  descriptor: AttuneProtocolDescriptor,
  kind: FrameworkNxGeneratedArtifactKind,
): FrameworkNxGeneratedArtifact => {
  const content = generatedArtifactContent(descriptor, kind)
  return {
    kind,
    path: generatedArtifactPath(descriptor.sourcePath, kind),
    generatorId: artifactGeneratorIds[kind],
    content,
    contentHash: hashGeneratedArtifactContent(content),
  }
}

export const createGeneratedArtifactRecord = (
  descriptor: AttuneProtocolDescriptor,
  artifact: FrameworkNxGeneratedArtifact,
  actualContent?: string,
): AttuneGeneratedArtifactRecord => {
  const actualHash = actualContent === undefined ? undefined : hashGeneratedArtifactContent(actualContent)
  return {
    artifactId: `${descriptor.packageId}:${artifact.kind}`,
    protocolId: descriptor.protocolId,
    packageId: descriptor.packageId,
    path: artifact.path,
    generatorId: artifact.generatorId,
    expectedHash: artifact.contentHash,
    ...(actualHash === undefined ? {} : { actualHash }),
    status: actualHash === undefined
      ? "missing"
      : actualHash === artifact.contentHash
        ? "current"
        : "stale",
  }
}

export const createFrameworkMaterializationPlan = (
  descriptor: AttuneProtocolDescriptor,
  actualGeneratedContent: Readonly<Record<string, string>> = {},
  candidateOutputPaths: readonly string[] = [],
): FrameworkNxMaterializationPlan => {
  const generatedArtifacts = ([
    "package-harness",
    "operation-registry",
    "property-evidence",
    "atom-view-edges",
    "type-guidance",
  ] as const).map((kind) => createGeneratedArtifact(descriptor, kind))

  return {
    packageId: descriptor.packageId,
    protocolId: descriptor.protocolId,
    sourcePath: descriptor.sourcePath,
    descriptorHashRecord: createDescriptorHashRecord(descriptor),
    actions: [
      protocolMaterializeAction(descriptor.packageId, descriptor.sourcePath),
      frameworkDiagnosticsAction(descriptor.packageId, descriptor.sourcePath),
      packageHarnessAction(descriptor.packageId, descriptor.sourcePath),
      operationRegistryAction(descriptor.packageId, descriptor.sourcePath),
      propertyEvidenceAction(descriptor.packageId, descriptor.sourcePath),
      atomViewEdgeAction(descriptor.packageId, descriptor.sourcePath),
      typeGuidanceAction(descriptor.packageId, descriptor.sourcePath),
    ],
    generatedArtifacts,
    generatedArtifactRecords: generatedArtifacts.map((artifact) =>
      createGeneratedArtifactRecord(descriptor, artifact, actualGeneratedContent[artifact.path])
    ),
    checkedInReportFindings: detectCheckedInReportOutputs([
      ...candidateOutputPaths,
      ...generatedArtifacts.map((artifact) => artifact.path),
    ]),
  }
}

export const detectCheckedInReportOutputs = (
  paths: readonly string[],
): readonly FrameworkNxReportOutputFinding[] =>
  paths
    .filter((path) => !isEphemeralOutputPath(path))
    .filter((path) => reportPathPatterns.some((pattern) => pattern.test(path)))
    .map((path) => ({
      path,
      reason: "Protocol reports and summaries must be emitted to stdout, CI artifacts, or gitignored cache paths.",
      suggestedTarget: generatorTargets.frameworkDiagnostics,
    }))

export const hasCheckedInReportOutputs = (paths: readonly string[]): boolean =>
  detectCheckedInReportOutputs(paths).length > 0

const sourceDirectory = (sourcePath: string): string => {
  const normalized = sourcePath.replaceAll("\\", "/")
  const index = normalized.lastIndexOf("/")
  return index === -1 ? "." : normalized.slice(0, index)
}

const isEphemeralOutputPath = (path: string): boolean => {
  const normalized = path.replaceAll("\\", "/")
  return normalized.startsWith(".attune/cache/") ||
    normalized.startsWith(".nx/cache/") ||
    normalized.includes("/.attune/cache/") ||
    normalized.includes("/.nx/cache/")
}

const generatedArtifactContent = (
  descriptor: AttuneProtocolDescriptor,
  kind: FrameworkNxGeneratedArtifactKind,
): string => {
  switch (kind) {
    case "package-harness":
      return packageHarnessContent(descriptor)
    case "operation-registry":
      return operationRegistryContent(descriptor)
    case "property-evidence":
      return propertyEvidenceContent(descriptor)
    case "atom-view-edges":
      return atomViewEdgeContent(descriptor)
    case "type-guidance":
      return typeGuidanceContent(descriptor)
  }
}

const header = (target: string, descriptor: AttuneProtocolDescriptor): string =>
  [
    `// Generated by ${target}.`,
    `// Source: ${descriptor.sourcePath}`,
    `// Descriptor: ${descriptor.descriptorHash}`,
    "",
  ].join("\n")

const packageHarnessContent = (descriptor: AttuneProtocolDescriptor): string =>
  `${header(generatorTargets.packageHarness, descriptor)}import {
  createPackageHarnessClient,
  defineEvidenceProducer,
  definePackageEvidenceProducerMap,
  definePackageHarnessHandlers,
  propertyRunEvidence,
  publicAccessorHandler,
} from "@attune/framework-testing"
import {
  PackageContract,
  PackageTestLayer,
} from "../attune.package.js"

export const PackageHarnessOperationIds = ${tsLiteral(descriptor.operations.map((operation) => operation.id))} as const

export const PackageHarnessProtocol = ${tsLiteral({
    packageId: descriptor.packageId,
    protocolId: descriptor.protocolId,
    descriptorHash: descriptor.descriptorHash,
    controls: [
      "reset",
      "snapshot",
      "observe",
      "flush-evidence",
      "replay-counterexample",
      "get-coverage",
      "get-atom-graph",
    ],
    operations: descriptor.operations.map((operation) => ({
      operationId: operation.id,
      operationKind: operation.kind,
      rpcId: `${descriptor.packageId}.operation.${operation.id}`,
      payloadSchema: `${descriptor.packageId}.${operation.id}.input`,
      successSchema: `${descriptor.packageId}.${operation.id}.output`,
      ...(operation.errorSchema === undefined
        ? {}
        : { errorSchema: `${descriptor.packageId}.${operation.id}.error` }),
      evidenceSchema: `${descriptor.packageId}.${operation.id}.evidence`,
      replaySchema: `${descriptor.packageId}.${operation.id}.replay`,
    })),
    effectRpcBackend: {
      adapter: "@effect/rpc",
      status: "optional",
      reason: "Schema-coded harness protocol is the root; runtime RPC remains a future backend.",
    },
  })} as const

export const PackageHarnessHandlers = definePackageHarnessHandlers(PackageContract, {
${descriptor.operations.map((operation) => `  ${JSON.stringify(operation.id)}: publicAccessorHandler(${JSON.stringify(operation.id)}),`).join("\n")}
} as const)
export type PackageHarnessHandlers = typeof PackageHarnessHandlers

export const PackageHarnessEvidenceProducers = definePackageEvidenceProducerMap(PackageContract, {
${descriptor.operations.map((operation) => `  ${JSON.stringify(operation.id)}: defineEvidenceProducer({
    id: ${JSON.stringify(`${operation.id}.property-evidence`)},
    operationId: ${JSON.stringify(operation.id)},
    produce: (context) => [
      propertyRunEvidence(context, ${JSON.stringify(operation.id)}, {
        harness: "schema-coded-package-harness",
        rpcId: ${JSON.stringify(`${descriptor.packageId}.operation.${operation.id}`)},
        laws: ${tsLiteral(operation.laws ?? [])},
      }),
    ],
  }),`).join("\n")}
} as const)
export type PackageHarnessEvidenceProducers = typeof PackageHarnessEvidenceProducers

export const PackageHarnessClient = createPackageHarnessClient({
  contract: PackageContract,
  packageTestLayer: PackageTestLayer,
  handlers: PackageHarnessHandlers,
  evidenceProducers: PackageHarnessEvidenceProducers,
})
export type PackageHarnessClient = typeof PackageHarnessClient
`

const operationRegistryContent = (descriptor: AttuneProtocolDescriptor): string =>
  `${header(generatorTargets.operationRegistry, descriptor)}export const OperationRegistry = ${tsLiteral({
    packageId: descriptor.packageId,
    protocolId: descriptor.protocolId,
    descriptorHash: descriptor.descriptorHash,
    operations: descriptor.operations.map((operation) => ({
      id: operation.id,
      kind: operation.kind,
      inputSchema: operation.inputSchema,
      outputSchema: operation.outputSchema,
      ...(operation.errorSchema === undefined ? {} : { errorSchema: operation.errorSchema }),
      laws: operation.laws ?? [],
      views: normalizeViews(operation),
    })),
  })} as const

export type OperationRegistry = typeof OperationRegistry
`

const propertyEvidenceContent = (descriptor: AttuneProtocolDescriptor): string =>
  `${header(generatorTargets.propertyEvidence, descriptor)}export const PropertyEvidenceScaffold = ${tsLiteral({
    packageId: descriptor.packageId,
    protocolId: descriptor.protocolId,
    descriptorHash: descriptor.descriptorHash,
    evidenceKinds: ["schema-decode", "property-run", "law-observed", "atom-movement"],
    operations: descriptor.operations.map((operation) => ({
      operationId: operation.id,
      operationKind: operation.kind,
      requiredEvidence: [
        "schema-decode",
        "property-run",
        ...((operation.laws?.length ?? 0) > 0 ? ["law-observed"] : []),
        ...(hasTouchedViews(operation) ? ["atom-movement", "reactivity-key"] : []),
      ],
      laws: operation.laws ?? [],
      views: normalizeViews(operation),
    })),
  })} as const

export type PropertyEvidenceScaffold = typeof PropertyEvidenceScaffold
`

const atomViewEdgeContent = (descriptor: AttuneProtocolDescriptor): string =>
  `${header(generatorTargets.atomViewEdge, descriptor)}export const AtomViewEdges = ${tsLiteral({
    packageId: descriptor.packageId,
    protocolId: descriptor.protocolId,
    descriptorHash: descriptor.descriptorHash,
    reactivityKeys: descriptor.views.reactivityKeys,
    atoms: descriptor.views.atoms,
    edges: descriptor.operations.flatMap(operationViewEdges),
  })} as const

export type AtomViewEdges = typeof AtomViewEdges
`

const typeGuidanceContent = (descriptor: AttuneProtocolDescriptor): string =>
  `${header(generatorTargets.typeGuidance, descriptor)}export const PackageTypeGuidance = ${tsLiteral({
    packageId: descriptor.packageId,
    protocolId: descriptor.protocolId,
    descriptorHash: descriptor.descriptorHash,
    sourceLabels: [
      "contract.operation",
      "effect-schema.ast",
      "inferred-law",
      "atom-view-edge",
    ],
    operations: Object.fromEntries(
      descriptor.operations.map((operation) => [
        operation.id,
        {
          operationId: operation.id,
          operationKind: operation.kind,
          sourceLabels: ["contract.operation", `${operation.kind}.metadata`],
          schemaSources: [
            { id: `${operation.id}.input`, schema: operation.inputSchema, role: "input" },
            { id: `${operation.id}.output`, schema: operation.outputSchema, role: "output" },
            ...(operation.errorSchema === undefined
              ? []
              : [{ id: `${operation.id}.error`, schema: operation.errorSchema, role: "error" }]),
          ],
          partitions: [
            `${operation.id}.input`,
            `${operation.id}.output`,
            ...((operation.laws ?? []).map((law) => `${operation.id}.law.${law}`)),
            ...((operation.views?.reactivityKeys ?? []).map((key) => `${operation.id}.reactivity.${key}`)),
            ...((operation.views?.atoms ?? []).map((atom) => `${operation.id}.atom.${atom}`)),
          ],
          coverageSearch: [
            `${operation.id}.${operation.kind}.schema-branches`,
            ...(hasTouchedViews(operation) ? [`${operation.id}.atom-graph-movement`] : []),
          ],
        },
      ]),
    ),
  })} as const

export type PackageTypeGuidance = typeof PackageTypeGuidance
`

const normalizeViews = (
  operation: AttuneProtocolOperationDescriptor,
): { readonly reactivityKeys: readonly string[]; readonly atoms: readonly string[] } => ({
  reactivityKeys: operation.views?.reactivityKeys ?? [],
  atoms: operation.views?.atoms ?? [],
})

const hasTouchedViews = (operation: AttuneProtocolOperationDescriptor): boolean =>
  (operation.views?.reactivityKeys?.length ?? 0) > 0 ||
  (operation.views?.atoms?.length ?? 0) > 0

const operationViewEdges = (
  operation: AttuneProtocolOperationDescriptor,
): readonly {
  readonly operationId: string
  readonly reactivityKey?: string
  readonly atomId?: string
}[] => {
  const keys = operation.views?.reactivityKeys ?? []
  const atoms = operation.views?.atoms ?? []

  if (keys.length === 0) {
    return atoms.map((atomId) => ({
      operationId: operation.id,
      atomId,
    }))
  }

  if (atoms.length === 0) {
    return keys.map((reactivityKey) => ({
      operationId: operation.id,
      reactivityKey,
    }))
  }

  return keys.flatMap((reactivityKey) =>
    atoms.map((atomId) => ({
      operationId: operation.id,
      reactivityKey,
      atomId,
    }))
  )
}

const tsLiteral = (value: unknown): string =>
  JSON.stringify(value, null, 2)
