import {
  hashProtocolValue,
  type AttuneGeneratedArtifactRecord,
  type AttuneProtocolDiagnostic,
  type AttuneProtocolDescriptor,
  type AttuneProtocolOperationDescriptor,
} from "@attune/framework-protocol"
import type { ProgramIndexViewRow } from "@attune/framework-sqlite"
import { Schema } from "effect"

export * from "./ProgramGraphIndex.js"

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

export interface AttuneRepairPlan {
  readonly diagnosticId: string
  readonly safety: "safe" | "needs-review" | "manual-only"
  readonly target: string
  readonly command: string
  readonly generator?: string
  readonly route?: string
  readonly repairKind: string
  readonly changes: readonly {
    readonly path: string
    readonly kind: "create" | "update" | "delete" | "regenerate"
    readonly generated: boolean
  }[]
  readonly doNotEdit?: readonly string[]
  readonly validateAfter?: readonly string[]
  readonly explanation: string
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

export const AttuneRepairPlanSchema = Schema.Struct({
  diagnosticId: Schema.String,
  safety: Schema.Literals(["safe", "needs-review", "manual-only"] as const),
  target: Schema.String,
  command: Schema.String,
  generator: Schema.optional(Schema.String),
  route: Schema.optional(Schema.String),
  repairKind: Schema.String,
  changes: Schema.Array(Schema.Struct({
    path: Schema.String,
    kind: Schema.Literals(["create", "update", "delete", "regenerate"] as const),
    generated: Schema.Boolean,
  })),
  doNotEdit: Schema.optional(Schema.Array(Schema.String)),
  validateAfter: Schema.optional(Schema.Array(Schema.String)),
  explanation: Schema.String,
})

export const FrameworkNxGeneratedArtifactKindSchema = Schema.Literals([
  "program-harness",
  "symbol-registry",
  "observation-scaffold",
  "atom-projection-edges",
  "schema-observations",
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
  programHarness: "@attune/framework-nx:program-harness",
  symbolRegistry: "@attune/framework-nx:symbol-registry",
  observationScaffold: "@attune/framework-nx:observation-scaffold",
  atomProjectionEdge: "@attune/framework-nx:atom-projection-edge",
  schemaObservations: "@attune/framework-nx:schema-observations",
  frameworkDiagnostics: "workspace:attune-check",
  packageContract: "@attune/nx:package-contract",
  effectService: "@attune/nx:effect-service",
  joernTemplate: "@attune/nx:joern-template",
  cocoindexMcpTool: "@attune/nx:cocoindex-mcp-tool",
} as const

export const frameworkRepairTargets = {
  workspaceCheck: "workspace:attune-check",
  workspaceRepair: "workspace:attune-repair",
  projectCheck: (project: string): string => `${project}:attune-check`,
  projectRepair: (project: string): string => `${project}:attune-repair`,
  internalProjectRepairSymbolRegistry: (project: string): string => `${project}:attune:repair-symbol-registry`,
  internalProjectRepairPropertyObservations: (project: string): string =>
    `${project}:attune:repair-property-observations`,
  internalProjectRepairSchemaObservations: (project: string): string => `${project}:attune:repair-schema-observations`,
  internalProjectRepairObservations: (project: string): string => `${project}:attune:repair-observations`,
  internalProjectRepairArtifactFreshness: (project: string): string =>
    `${project}:attune:repair-artifact-freshness`,
} as const

const repairRoutes = {
  "attune/program-index/missing-project-facts": {
    generator: generatorTargets.packageContract,
    repairKind: "project-facts",
    changePath: "src/attune.package.ts",
  },
  "attune/program-index/stale-project-facts": {
    generator: generatorTargets.packageContract,
    repairKind: "project-facts",
    changePath: "src/attune.package.ts",
  },
  "attune/program-index/missing-symbol-registry": {
    generator: generatorTargets.symbolRegistry,
    repairKind: "symbol-registry",
    changePath: ".attune/cache/generated/<project>/attune-symbol-registry.ts",
  },
  "attune/program-index/missing-observation-scaffold": {
    generator: generatorTargets.observationScaffold,
    repairKind: "observation-scaffold",
    changePath: ".attune/cache/generated/<project>/attune-observation-scaffold.ts",
  },
  "attune/program-index/missing-schema-observations": {
    generator: generatorTargets.schemaObservations,
    repairKind: "schema-observations",
    changePath: ".attune/cache/generated/<project>/attune-schema-observations.ts",
  },
  "attune/program-index/missing-effect-service-boundary": {
    generator: generatorTargets.effectService,
    repairKind: "effect-service",
    changePath: "src/<service>.ts",
  },
  "attune/program-index/missing-atom-projection-edge": {
    generator: generatorTargets.atomProjectionEdge,
    repairKind: "atom-projection-edge",
    changePath: ".attune/cache/generated/<project>/attune-atom-projection-edges.ts",
  },
  "attune/program-index/missing-joern-template": {
    generator: generatorTargets.joernTemplate,
    repairKind: "joern-template",
    changePath: "src/templates/<template>.ts",
  },
  "attune/program-index/missing-cocoindex-tool": {
    generator: generatorTargets.cocoindexMcpTool,
    repairKind: "cocoindex-tool",
    changePath: "src/tools/<tool>.ts",
  },
} as const

const generatedFileNames: Record<FrameworkNxGeneratedArtifactKind, string> = {
  "program-harness": "attune-program-harness.ts",
  "symbol-registry": "attune-symbol-registry.ts",
  "observation-scaffold": "attune-observation-scaffold.ts",
  "atom-projection-edges": "attune-atom-projection-edges.ts",
  "schema-observations": "attune-schema-observations.ts",
}

const artifactGeneratorIds: Record<FrameworkNxGeneratedArtifactKind, string> = {
  "program-harness": generatorTargets.programHarness,
  "symbol-registry": generatorTargets.symbolRegistry,
  "observation-scaffold": generatorTargets.observationScaffold,
  "atom-projection-edges": generatorTargets.atomProjectionEdge,
  "schema-observations": generatorTargets.schemaObservations,
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

export const symbolRegistryAction = (
  packageId: string,
  sourcePath: string,
  operationId?: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.program.symbol-registry",
    title: "Generate symbol registry",
    sourcePath,
    packageId,
    ...optionalOperation(operationId),
    generatorOrTarget: generatorTargets.symbolRegistry,
    options: {
      packageId,
      ...optionalOperation(operationId),
    },
    validationTarget: validationTargetFor(packageId),
  })

export const programHarnessAction = (
  packageId: string,
  sourcePath: string,
  operationId?: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.protocol.program-harness",
    title: "Generate Schema-coded package harness",
    sourcePath,
    packageId,
    ...optionalOperation(operationId),
    generatorOrTarget: generatorTargets.programHarness,
    options: {
      packageId,
      ...optionalOperation(operationId),
    },
    validationTarget: validationTargetFor(packageId),
  })

export const observationScaffoldAction = (
  packageId: string,
  sourcePath: string,
  operationId?: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.program.observation-scaffold",
    title: "Generate observation scaffold",
    sourcePath,
    packageId,
    ...optionalOperation(operationId),
    generatorOrTarget: generatorTargets.observationScaffold,
    options: {
      packageId,
      ...optionalOperation(operationId),
    },
    validationTarget: validationTargetFor(packageId),
  })

export const atomProjectionEdgeAction = (
  packageId: string,
  sourcePath: string,
  operationId?: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.program.atom-projection-edge",
    title: "Generate missing atom projection edge",
    sourcePath,
    packageId,
    ...optionalOperation(operationId),
    generatorOrTarget: generatorTargets.atomProjectionEdge,
    options: {
      packageId,
      ...optionalOperation(operationId),
    },
    validationTarget: validationTargetFor(packageId),
  })

export const schemaObservationsAction = (
  packageId: string,
  sourcePath: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.program.schema-observations",
    title: "Refresh schema observations",
    sourcePath,
    packageId,
    generatorOrTarget: generatorTargets.schemaObservations,
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
  packageId = projectNameFromSourcePath(sourcePath),
): string => `.attune/cache/generated/${packageId}/${generatedFileNames[kind]}`

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
    path: generatedArtifactPath(descriptor.sourcePath, kind, descriptor.packageId),
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
    "program-harness",
    "symbol-registry",
    "observation-scaffold",
    "atom-projection-edges",
    "schema-observations",
  ] as const).map((kind) => createGeneratedArtifact(descriptor, kind))

  return {
    packageId: descriptor.packageId,
    protocolId: descriptor.protocolId,
    sourcePath: descriptor.sourcePath,
    descriptorHashRecord: createDescriptorHashRecord(descriptor),
    actions: [
      protocolMaterializeAction(descriptor.packageId, descriptor.sourcePath),
      frameworkDiagnosticsAction(descriptor.packageId, descriptor.sourcePath),
      programHarnessAction(descriptor.packageId, descriptor.sourcePath),
      symbolRegistryAction(descriptor.packageId, descriptor.sourcePath),
      observationScaffoldAction(descriptor.packageId, descriptor.sourcePath),
      atomProjectionEdgeAction(descriptor.packageId, descriptor.sourcePath),
      schemaObservationsAction(descriptor.packageId, descriptor.sourcePath),
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
      suggestedTarget: frameworkRepairTargets.workspaceCheck,
    }))

export const hasCheckedInReportOutputs = (paths: readonly string[]): boolean =>
  detectCheckedInReportOutputs(paths).length > 0

const projectNameFromSourcePath = (sourcePath: string): string => {
  const normalized = sourcePath.replaceAll("\\", "/")
  const match = /^(?:packages|framework)\/(?<project>[^/]+)\//u.exec(normalized)
  return match?.groups?.project ?? "workspace"
}

export const repairPlanForDiagnostic = (
  diagnostic: Pick<AttuneProtocolDiagnostic, "code" | "packageId" | "sourcePath" | "explanation"> & {
    readonly diagnosticId?: string
  },
): AttuneRepairPlan | undefined => {
  const route = repairRoutes[diagnostic.code as keyof typeof repairRoutes]
  if (route === undefined) return undefined

  const target = frameworkRepairTargets.projectRepair(diagnostic.packageId)
  const changePath = route.changePath.replace("<project>", diagnostic.packageId)

  return {
    diagnosticId: diagnostic.diagnosticId ?? diagnostic.code,
    safety: "safe",
    target,
    command: `nx run ${target} --diagnostic ${diagnostic.diagnosticId ?? diagnostic.code}`,
    generator: route.generator,
    repairKind: route.repairKind,
    changes: [{
      path: changePath,
      kind: route.repairKind === "project-facts" ? "update" : "regenerate",
      generated: changePath.includes(".attune/cache/") || changePath.includes(".generated."),
    }],
    doNotEdit: [
      "src/attune.generated.ts",
      "src/attune.contract.generated.ts",
      "framework-owned package-contract typecheck aggregate",
      "attune.source-bom.json",
    ],
    validateAfter: [
      frameworkRepairTargets.projectCheck(diagnostic.packageId),
      `${diagnostic.packageId}:typecheck`,
      `${diagnostic.packageId}:test`,
    ],
    explanation: diagnostic.explanation,
  }
}

export const repairPlanFromProgramIndexRow = (
  row: ProgramIndexViewRow,
): AttuneRepairPlan | undefined => {
  const diagnosticId = stringValue(row, "diagnostic_id")
  if (diagnosticId.length === 0) return undefined

  const projectId = stringValue(row, "project_id", "workspace")
  const safety = repairSafety(row["safety"] ?? null)
  const target = stringValue(row, "nx_target", projectId === "workspace"
    ? frameworkRepairTargets.workspaceRepair
    : frameworkRepairTargets.projectRepair(projectId))
  const repairKind = stringValue(row, "repair_kind", "program-index-repair")
  const route = stringValue(row, "route")
  const payload = jsonValue(row, "payload_json")
  const validationAfter = stringArrayValue(row, "validation_after_targets_json")
  const changePath = repairChangePath(row, payload)

  return {
    diagnosticId,
    safety,
    target,
    command: `nx run ${target} --diagnostic ${diagnosticId}`,
    ...(route.length === 0 ? {} : { route }),
    repairKind,
    changes: [{
      path: changePath,
      kind: repairChangeKind(repairKind, safety),
      generated: isGeneratedRepairPath(changePath),
    }],
    doNotEdit: [
      ".attune/cache/program-index.sqlite",
      "framework-owned generated artifacts unless the repair route writes them",
    ],
    validateAfter: validationAfter.length === 0 ? [target] : validationAfter,
    explanation: stringValue(row, "message", "Program-index repair row is repairable."),
  }
}

const stringValue = (
  row: ProgramIndexViewRow,
  key: string,
  fallback = "",
): string => {
  const value = row[key]
  return typeof value === "string" && value.length > 0 ? value : fallback
}

const repairSafety = (value: ProgramIndexViewRow[string]): AttuneRepairPlan["safety"] =>
  value === "safe" || value === "needs-review" || value === "manual-only"
    ? value
    : "needs-review"

const jsonValue = (
  row: ProgramIndexViewRow,
  key: string,
): unknown | undefined => {
  const value = row[key]
  if (typeof value !== "string" || value.length === 0) return undefined
  try {
    return JSON.parse(value) as unknown
  } catch {
    return value
  }
}

const stringArrayValue = (
  row: ProgramIndexViewRow,
  key: string,
): readonly string[] => {
  const value = jsonValue(row, key)
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === "string")
}

const repairChangePath = (
  row: ProgramIndexViewRow,
  payload: unknown,
): string => {
  const payloadPath = pathFromRepairPayload(payload)
  if (payloadPath.length > 0) return payloadPath
  return stringValue(row, "path", "program-index repair row")
}

const pathFromRepairPayload = (payload: unknown): string => {
  if (typeof payload !== "object" || payload === null) return ""
  const record = payload as Record<string, unknown>
  if (typeof record.path === "string") return record.path
  if (typeof record.artifactPath === "string") return record.artifactPath
  if (typeof record.sourceFile === "string") return record.sourceFile
  const cause = record.cause
  if (typeof cause !== "object" || cause === null) return ""
  const causeRecord = cause as Record<string, unknown>
  return typeof causeRecord.path === "string" ? causeRecord.path : ""
}

const repairChangeKind = (
  repairKind: string,
  safety: AttuneRepairPlan["safety"],
): AttuneRepairPlan["changes"][number]["kind"] => {
  if (safety === "manual-only" && /removal|delete/u.test(repairKind)) return "delete"
  if (/refresh|generated|registry|guidance|evidence|observation|schema|artifact-freshness/u.test(repairKind)) {
    return "regenerate"
  }
  return "update"
}

const isGeneratedRepairPath = (path: string): boolean =>
  path.startsWith(".attune/cache/") ||
  path.includes("/generated/") ||
  path.includes(".generated.") ||
  path.includes("framework/architecture/src/generated/")

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
    case "program-harness":
      return programHarnessContent(descriptor)
    case "symbol-registry":
      return symbolRegistryContent(descriptor)
    case "observation-scaffold":
      return observationScaffoldContent(descriptor)
    case "atom-projection-edges":
      return atomProjectionEdgeContent(descriptor)
    case "schema-observations":
      return schemaObservationsContent(descriptor)
  }
}

const header = (target: string, descriptor: AttuneProtocolDescriptor): string =>
  [
    `// Generated by ${target}.`,
    `// Source: ${descriptor.sourcePath}`,
    `// Descriptor: ${descriptor.descriptorHash}`,
    "",
  ].join("\n")

const programHarnessContent = (descriptor: AttuneProtocolDescriptor): string =>
  `${header(generatorTargets.programHarness, descriptor)}import {
  createProgramHarnessClient,
  defineObservationProducer,
  defineProjectObservationProducerMap,
  defineProgramHarnessHandlers,
  propertyRunObservation,
  publicAccessorHandler,
} from "@attune/framework-testing"
import {
  PackageContract,
  programTestLayer,
} from "../attune.package.js"

export const ProgramHarnessOperationIds = ${tsLiteral(descriptor.operations.map((operation) => operation.id))} as const

export const ProgramHarnessProtocol = ${tsLiteral({
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

export const ProgramHarnessHandlers = defineProgramHarnessHandlers(PackageContract, {
${descriptor.operations.map((operation) => `  ${JSON.stringify(operation.id)}: publicAccessorHandler(${JSON.stringify(operation.id)}),`).join("\n")}
} as const)
export type ProgramHarnessHandlers = typeof ProgramHarnessHandlers

export const ProgramHarnessObservationProducers = defineProjectObservationProducerMap(PackageContract, {
${descriptor.operations.map((operation) => `  ${JSON.stringify(operation.id)}: defineObservationProducer({
    id: ${JSON.stringify(`${operation.id}.observation-scaffold`)},
    operationId: ${JSON.stringify(operation.id)},
    produce: (context) => [
      propertyRunObservation(context, ${JSON.stringify(operation.id)}, {
        harness: "schema-coded-program-harness",
        rpcId: ${JSON.stringify(`${descriptor.packageId}.operation.${operation.id}`)},
        laws: ${tsLiteral(operation.laws ?? [])},
      }),
    ],
  }),`).join("\n")}
} as const)
export type ProgramHarnessObservationProducers = typeof ProgramHarnessObservationProducers

export const ProgramHarnessClient = createProgramHarnessClient({
  contract: PackageContract,
  programTestLayer: programTestLayer,
  handlers: ProgramHarnessHandlers,
  observationProducers: ProgramHarnessObservationProducers,
})
export type ProgramHarnessClient = typeof ProgramHarnessClient
`

const symbolRegistryContent = (descriptor: AttuneProtocolDescriptor): string =>
  `${header(generatorTargets.symbolRegistry, descriptor)}export const SymbolRegistry = ${tsLiteral({
    projectId: descriptor.packageId,
    schemaDescriptorId: descriptor.protocolId,
    descriptorHash: descriptor.descriptorHash,
    symbols: descriptor.operations.map((operation) => ({
      symbolId: operation.id,
      symbolKind: operation.kind,
      inputSchema: operation.inputSchema,
      outputSchema: operation.outputSchema,
      ...(operation.errorSchema === undefined ? {} : { errorSchema: operation.errorSchema }),
      diagnosticRules: operation.laws ?? [],
      projectionEdges: normalizeProjectionEdges(operation),
    })),
  })} as const

export type SymbolRegistry = typeof SymbolRegistry
`

const observationScaffoldContent = (descriptor: AttuneProtocolDescriptor): string =>
  `${header(generatorTargets.observationScaffold, descriptor)}export const ObservationScaffold = ${tsLiteral({
    projectId: descriptor.packageId,
    schemaDescriptorId: descriptor.protocolId,
    descriptorHash: descriptor.descriptorHash,
    observationKinds: ["schema-decode", "property-run", "diagnostic-rule-observed", "atom-movement"],
    symbols: descriptor.operations.map((operation) => ({
      symbolId: operation.id,
      symbolKind: operation.kind,
      requiredObservations: [
        "schema-decode",
        "property-run",
        ...((operation.laws?.length ?? 0) > 0 ? ["diagnostic-rule-observed"] : []),
        ...(hasTouchedProjectionEdges(operation) ? ["atom-movement", "reactivity-key"] : []),
      ],
      diagnosticRules: operation.laws ?? [],
      projectionEdges: normalizeProjectionEdges(operation),
    })),
  })} as const

export type ObservationScaffold = typeof ObservationScaffold
`

const atomProjectionEdgeContent = (descriptor: AttuneProtocolDescriptor): string =>
  `${header(generatorTargets.atomProjectionEdge, descriptor)}export const AtomProjectionEdges = ${tsLiteral({
    projectId: descriptor.packageId,
    schemaDescriptorId: descriptor.protocolId,
    descriptorHash: descriptor.descriptorHash,
    reactivityKeys: descriptor.views.reactivityKeys,
    atoms: descriptor.views.atoms,
    edges: descriptor.operations.flatMap(symbolProjectionEdges),
  })} as const

export type AtomProjectionEdges = typeof AtomProjectionEdges
`

const schemaObservationsContent = (descriptor: AttuneProtocolDescriptor): string =>
  `${header(generatorTargets.schemaObservations, descriptor)}export const SchemaObservations = ${tsLiteral({
    projectId: descriptor.packageId,
    schemaDescriptorId: descriptor.protocolId,
    descriptorHash: descriptor.descriptorHash,
    sourceLabels: [
      "project.symbol",
      "effect-schema.ast",
      "diagnostic-rule",
      "atom-projection-edge",
    ],
    symbols: Object.fromEntries(
      descriptor.operations.map((operation) => [
        operation.id,
        {
          symbolId: operation.id,
          symbolKind: operation.kind,
          sourceLabels: ["project.symbol", `${operation.kind}.metadata`],
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
            ...((operation.laws ?? []).map((law) => `${operation.id}.diagnostic-rule.${law}`)),
            ...((operation.views?.reactivityKeys ?? []).map((key) => `${operation.id}.reactivity.${key}`)),
            ...((operation.views?.atoms ?? []).map((atom) => `${operation.id}.atom.${atom}`)),
          ],
          coverageSearch: [
            `${operation.id}.${operation.kind}.schema-branches`,
            ...(hasTouchedProjectionEdges(operation) ? [`${operation.id}.atom-graph-movement`] : []),
          ],
        },
      ]),
    ),
  })} as const

export type SchemaObservations = typeof SchemaObservations
`

const normalizeProjectionEdges = (
  operation: AttuneProtocolOperationDescriptor,
): { readonly reactivityKeys: readonly string[]; readonly atoms: readonly string[] } => ({
  reactivityKeys: operation.views?.reactivityKeys ?? [],
  atoms: operation.views?.atoms ?? [],
})

const hasTouchedProjectionEdges = (operation: AttuneProtocolOperationDescriptor): boolean =>
  (operation.views?.reactivityKeys?.length ?? 0) > 0 ||
  (operation.views?.atoms?.length ?? 0) > 0

const symbolProjectionEdges = (
  operation: AttuneProtocolOperationDescriptor,
): readonly {
  readonly symbolId: string
  readonly reactivityKey?: string
  readonly atomId?: string
}[] => {
  const keys = operation.views?.reactivityKeys ?? []
  const atoms = operation.views?.atoms ?? []

  if (keys.length === 0) {
    return atoms.map((atomId) => ({
      symbolId: operation.id,
      atomId,
    }))
  }

  if (atoms.length === 0) {
    return keys.map((reactivityKey) => ({
      symbolId: operation.id,
      reactivityKey,
    }))
  }

  return keys.flatMap((reactivityKey) =>
    atoms.map((atomId) => ({
      symbolId: operation.id,
      reactivityKey,
      atomId,
    }))
  )
}

const tsLiteral = (value: unknown): string =>
  JSON.stringify(value, null, 2)
