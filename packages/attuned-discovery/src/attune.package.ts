import { Layer, Schema } from "effect"
import {
  baseAtom,
  defineOperation,
  definePackageContract,
  definePackageFuzzRpcGroup,
  definePackageViews,
  defineTypeGuidance,
  definePackageViewGraph,
  derivedAtom,
  packageViewAtom,
  projection,
  reactivityKey,
  touches,
} from "@attune/framework-protocol"

import {
  AnchorCard,
  DecisionPacket,
  DiscoveryEvent,
  DiscoveryMetric,
  DiscoveryRun,
  EvidencePacket,
  FoldScene,
  MotifFamily,
  MotifHypothesis,
  ReportAction,
  ReportEvent,
  ReviewItem,
  RunSummary,
  WorkbenchSnapshot,
} from "./index.js"

export { PackageContractSchema } from "@attune/framework-protocol"

export const PackageViews = definePackageViews({
  reactivityKeys: [
    "attuned-discovery.event-log.appended",
    "attuned-discovery.projection.changed",
    "attuned-discovery.run-state.changed",
    "attuned-discovery.run-metrics.changed",
    "attuned-discovery.anchors.changed",
    "attuned-discovery.families.changed",
    "attuned-discovery.hypotheses.changed",
    "attuned-discovery.evidence.changed",
    "attuned-discovery.review-queue.changed",
    "attuned-discovery.score-features.changed",
    "attuned-discovery.decision-packet.changed",
    "attuned-discovery.fold-scene.changed",
    "attuned-discovery.workbench-snapshot.changed",
    "attuned-discovery.domain-codec.changed",
  ],
  atoms: [
    "runStateAtom",
    "runMetricsAtom",
    "anchorsAtom",
    "familiesAtom",
    "hypothesesAtom",
    "evidenceAtom",
    "reviewQueueAtom",
    "scoreFeaturesAtom",
    "plateauAtom",
    "decisionPacketAtom",
    "foldSceneAtom",
    "workbenchSnapshotAtom",
    "readModelProjectionAtom",
    "domainCodecAtom",
  ],
} as const)

export const DiscoveryPackageServices = [
  "DiscoveryEvents",
  "DiscoveryEventLog",
  "DiscoveryReadModel",
  "DiscoveryProjection",
  "ReactivityRuntime",
  "DiscoveryAtomWorkspace",
  "DiscoveryFixtureHarness",
] as const

export const DiscoveryContractError = Schema.Struct({
  code: Schema.Literals([
    "event-log-append-failed",
    "projection-replay-failed",
    "read-model-query-failed",
    "atom-observation-failed",
    "codec-decode-failed",
  ] as const),
  message: Schema.String,
  operationId: Schema.optional(Schema.String),
})
export type DiscoveryContractError = typeof DiscoveryContractError.Type

export const EventFacadeInput = Schema.Struct({
  event: DiscoveryEvent,
  facade: Schema.Literals(["DiscoveryEvents", "DiscoveryEventLog"] as const),
})
export type EventFacadeInput = typeof EventFacadeInput.Type

export const EventFacadeOutput = Schema.Struct({
  appended: Schema.Boolean,
  eventId: Schema.String,
  eventTag: Schema.String,
})
export type EventFacadeOutput = typeof EventFacadeOutput.Type

export const EventLogAppendInput = Schema.Struct({
  event: DiscoveryEvent,
})
export type EventLogAppendInput = typeof EventLogAppendInput.Type

export const EventLogAppendOutput = Schema.Struct({
  appended: Schema.Boolean,
  eventId: Schema.String,
  announcedKeys: Schema.Array(Schema.String),
})
export type EventLogAppendOutput = typeof EventLogAppendOutput.Type

export const ProjectionReplayInput = Schema.Struct({
  events: Schema.Array(DiscoveryEvent),
})
export type ProjectionReplayInput = typeof ProjectionReplayInput.Type

export const ProjectionReplayOutput = Schema.Struct({
  version: Schema.Number,
  runIds: Schema.Array(Schema.String),
  anchorCount: Schema.Number,
  familyCount: Schema.Number,
  hypothesisCount: Schema.Number,
  evidenceCount: Schema.Number,
  reviewQueueCount: Schema.Number,
  announcedKeys: Schema.Array(Schema.String),
})
export type ProjectionReplayOutput = typeof ProjectionReplayOutput.Type

export const ReadModelQueryInput = Schema.Struct({
  runId: Schema.String,
  limit: Schema.optional(Schema.Number),
  query: Schema.Literals([
    "run",
    "run-metrics",
    "anchors",
    "families",
    "hypotheses",
    "evidence",
    "review-queue",
    "workbench-snapshot",
  ] as const),
})
export type ReadModelQueryInput = typeof ReadModelQueryInput.Type

export const ReadModelQueryOutput = Schema.Struct({
  run: Schema.optional(DiscoveryRun),
  metrics: Schema.Array(DiscoveryMetric),
  anchors: Schema.Array(AnchorCard),
  families: Schema.Array(MotifFamily),
  hypotheses: Schema.Array(MotifHypothesis),
  evidence: Schema.Array(EvidencePacket),
  reviewQueue: Schema.Array(ReviewItem),
  snapshot: Schema.optional(WorkbenchSnapshot),
})
export type ReadModelQueryOutput = typeof ReadModelQueryOutput.Type

export const ReactivityKeyMapInput = Schema.Struct({
  event: DiscoveryEvent,
})
export type ReactivityKeyMapInput = typeof ReactivityKeyMapInput.Type

export const ReactivityKeyMapOutput = Schema.Struct({
  eventTag: Schema.String,
  keys: Schema.Array(Schema.String),
})
export type ReactivityKeyMapOutput = typeof ReactivityKeyMapOutput.Type

export const BaseAtomFamilyInput = Schema.Struct({
  runId: Schema.String,
  atomId: Schema.Literals([
    "runStateAtom",
    "runMetricsAtom",
    "anchorsAtom",
    "familiesAtom",
    "hypothesesAtom",
    "evidenceAtom",
    "reviewQueueAtom",
  ] as const),
})
export type BaseAtomFamilyInput = typeof BaseAtomFamilyInput.Type

export const AtomObservationOutput = Schema.Struct({
  atomId: Schema.String,
  reactivityKeys: Schema.Array(Schema.String),
  version: Schema.Number,
  valueSummary: Schema.String,
})
export type AtomObservationOutput = typeof AtomObservationOutput.Type

export const DerivedWorkbenchAtomInput = Schema.Struct({
  runId: Schema.String,
  iteration: Schema.Number,
  atomId: Schema.Literals([
    "scoreFeaturesAtom",
    "plateauAtom",
    "decisionPacketAtom",
    "foldSceneAtom",
    "workbenchSnapshotAtom",
  ] as const),
})
export type DerivedWorkbenchAtomInput = typeof DerivedWorkbenchAtomInput.Type

export const DerivedWorkbenchAtomOutput = Schema.Struct({
  atomId: Schema.String,
  dependsOnAtoms: Schema.Array(Schema.String),
  valueKind: Schema.Literals([
    "score-features",
    "plateau",
    "decision-packet",
    "fold-scene",
    "workbench-snapshot",
  ] as const),
  viewVersion: Schema.Number,
})
export type DerivedWorkbenchAtomOutput = typeof DerivedWorkbenchAtomOutput.Type

export const DomainCodecInput = Schema.Struct({
  codec: Schema.Literals([
    "DiscoveryRun",
    "DiscoveryEvent",
    "ReportAction",
    "ReportEvent",
    "DecisionPacket",
    "FoldScene",
    "WorkbenchSnapshot",
    "RunSummary",
  ] as const),
  payload: Schema.Unknown,
})
export type DomainCodecInput = typeof DomainCodecInput.Type

export const DomainCodecOutput = Schema.Struct({
  codec: Schema.String,
  decoded: Schema.Boolean,
  encoded: Schema.Boolean,
})
export type DomainCodecOutput = typeof DomainCodecOutput.Type

const packageContractSourcePath = "packages/attuned-discovery/src/attune.package.ts"

const sourceReferenceId = <const Id extends string>(
  reference: { readonly id: string },
  expected: Id,
): Id => {
  if (reference.id !== expected) {
    throw new Error(`Attuned Discovery source reference ${expected} resolved to ${reference.id}`)
  }

  return reference.id as Id
}

export const ProjectionChangedKeyRef = reactivityKey({
  sourcePath: packageContractSourcePath,
  exportName: "ProjectionChangedKeyRef",
  symbolName: "ProjectionChangedKeyRef",
}, {
  packageId: "attuned-discovery",
  explicitId: "attuned-discovery.projection.changed",
})

export const ReadModelProjectionAtomRef = baseAtom({
  sourcePath: packageContractSourcePath,
  exportName: "ReadModelProjectionAtomRef",
  symbolName: "ReadModelProjectionAtomRef",
}, {
  packageId: "attuned-discovery",
  explicitId: "readModelProjectionAtom",
})

export const DecisionPacketAtomRef = derivedAtom({
  sourcePath: packageContractSourcePath,
  exportName: "DecisionPacketAtomRef",
  symbolName: "DecisionPacketAtomRef",
}, {
  packageId: "attuned-discovery",
  explicitId: "decisionPacketAtom",
})

export const FoldSceneAtomRef = derivedAtom({
  sourcePath: packageContractSourcePath,
  exportName: "FoldSceneAtomRef",
  symbolName: "FoldSceneAtomRef",
}, {
  packageId: "attuned-discovery",
  explicitId: "foldSceneAtom",
})

export const WorkbenchSnapshotAtomRef = packageViewAtom({
  sourcePath: packageContractSourcePath,
  exportName: "WorkbenchSnapshotAtomRef",
  symbolName: "WorkbenchSnapshotAtomRef",
}, {
  packageId: "attuned-discovery",
  explicitId: "workbenchSnapshotAtom",
})

const projectionChangedKeyId = sourceReferenceId(
  ProjectionChangedKeyRef,
  "attuned-discovery.projection.changed",
)
const readModelProjectionAtomId = sourceReferenceId(
  ReadModelProjectionAtomRef,
  "readModelProjectionAtom",
)
const decisionPacketAtomId = sourceReferenceId(
  DecisionPacketAtomRef,
  "decisionPacketAtom",
)
const foldSceneAtomId = sourceReferenceId(FoldSceneAtomRef, "foldSceneAtom")
const workbenchSnapshotAtomId = sourceReferenceId(
  WorkbenchSnapshotAtomRef,
  "workbenchSnapshotAtom",
)

const eventLogKeys = [
  "attuned-discovery.event-log.appended",
  "attuned-discovery.projection.changed",
  "attuned-discovery.run-state.changed",
  "attuned-discovery.run-metrics.changed",
  "attuned-discovery.anchors.changed",
  "attuned-discovery.families.changed",
  "attuned-discovery.hypotheses.changed",
  "attuned-discovery.evidence.changed",
  "attuned-discovery.review-queue.changed",
] as const

const readModelKeys = [
  "attuned-discovery.projection.changed",
  "attuned-discovery.run-state.changed",
  "attuned-discovery.run-metrics.changed",
  "attuned-discovery.anchors.changed",
  "attuned-discovery.families.changed",
  "attuned-discovery.hypotheses.changed",
  "attuned-discovery.evidence.changed",
  "attuned-discovery.review-queue.changed",
] as const

const baseAtomIds = [
  "runStateAtom",
  "runMetricsAtom",
  "anchorsAtom",
  "familiesAtom",
  "hypothesesAtom",
  "evidenceAtom",
  "reviewQueueAtom",
] as const

const derivedAtomIds = [
  "scoreFeaturesAtom",
  "plateauAtom",
  "decisionPacketAtom",
  "foldSceneAtom",
  "workbenchSnapshotAtom",
] as const

const eventFacadeLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "side-effect.declared-boundary",
  "event-facade.event-schema",
  "event-facade.append-boundary",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

const projectionLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "side-effect.declared-boundary",
  "projection.event-decode",
  "projection.state-decode",
  "projection.deterministic-replay",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

const queryLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "determinism.same-input-same-output",
  "side-effect.readonly",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

const atomFamilyLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "side-effect.no-durable-atom-write",
  "atom-family.base-refresh",
  "atom-family.derived-composes",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

const codecLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "determinism.same-input-same-output",
  "side-effect.readonly",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

export const EventReplayProjectionViews = touches(PackageViews, {
  reactivityKeys: [
    projectionChangedKeyId,
    "attuned-discovery.run-state.changed",
    "attuned-discovery.run-metrics.changed",
    "attuned-discovery.anchors.changed",
    "attuned-discovery.families.changed",
    "attuned-discovery.hypotheses.changed",
    "attuned-discovery.evidence.changed",
    "attuned-discovery.review-queue.changed",
  ],
  atoms: [readModelProjectionAtomId, ...baseAtomIds],
} as const)

export const EventReplayProjectionSourceViewGraph = definePackageViewGraph({
  reactivityKeys: [projectionChangedKeyId],
  baseAtoms: [{
    id: readModelProjectionAtomId,
    refreshesOn: [projectionChangedKeyId],
  }],
  derivedAtoms: [
    {
      id: decisionPacketAtomId,
      reads: [readModelProjectionAtomId],
    },
    {
      id: foldSceneAtomId,
      reads: [decisionPacketAtomId],
    },
  ],
  packageViewAtoms: [{
    id: workbenchSnapshotAtomId,
    reads: [foldSceneAtomId],
  }],
} as const)

export const DiscoveryEventsFacadeOperation = defineOperation({
  id: "discovery-events-facade",
  name: "DiscoveryEvents event facade",
  kind: "event-facade",
  input: EventFacadeInput,
  output: EventFacadeOutput,
  error: DiscoveryContractError,
  views: touches(PackageViews, {
    reactivityKeys: eventLogKeys,
    atoms: [
      "readModelProjectionAtom",
      "runStateAtom",
      "runMetricsAtom",
      "anchorsAtom",
      "familiesAtom",
      "hypothesesAtom",
      "evidenceAtom",
      "reviewQueueAtom",
    ],
  } as const),
  laws: eventFacadeLaws,
  event: {
    eventSchema: "DiscoveryEvent",
    facade: "DiscoveryEvents",
    appendBoundary: "DiscoveryEventLog",
  } as const,
} as const)

export const DiscoveryEventLogAppendOperation = defineOperation({
  id: "discovery-event-log-append",
  name: "DiscoveryEventLog append",
  kind: "event-facade",
  input: EventLogAppendInput,
  output: EventLogAppendOutput,
  error: DiscoveryContractError,
  views: touches(PackageViews, {
    reactivityKeys: eventLogKeys,
    atoms: ["readModelProjectionAtom", ...baseAtomIds],
  } as const),
  laws: eventFacadeLaws,
  event: {
    eventSchema: "DiscoveryEvent",
    facade: "DiscoveryEventLog",
    appendBoundary: "DiscoveryEventLog.append",
  } as const,
} as const)

export const EventReplayProjectionOperation = projection({
  id: "event-replay-projection",
  name: "Event replay projection",
  input: ProjectionReplayInput,
  output: ProjectionReplayOutput,
  error: DiscoveryContractError,
  views: EventReplayProjectionViews,
  laws: projectionLaws,
  projection: {
    eventSchema: "DiscoveryEvent",
    stateSchema: "DiscoveryProjection",
    replay: true,
  } as const,
} as const)

export const ReadModelQueryOperation = defineOperation({
  id: "read-model-query",
  name: "Read model query",
  kind: "query",
  input: ReadModelQueryInput,
  output: ReadModelQueryOutput,
  error: DiscoveryContractError,
  views: touches(PackageViews, {
    reactivityKeys: readModelKeys,
    atoms: ["readModelProjectionAtom", ...baseAtomIds, ...derivedAtomIds],
  } as const),
  laws: queryLaws,
  metadata: {
    source: "memory/read-model.ts and readModelFromProjection",
  } as const,
} as const)

export const ReactivityKeyMapOperation = defineOperation({
  id: "reactivity-key-map",
  name: "Discovery event to Reactivity key map",
  kind: "query",
  input: ReactivityKeyMapInput,
  output: ReactivityKeyMapOutput,
  error: DiscoveryContractError,
  views: touches(PackageViews, {
    reactivityKeys: readModelKeys,
    atoms: ["readModelProjectionAtom", ...baseAtomIds],
  } as const),
  laws: queryLaws,
  metadata: {
    source: "viewKeysForDiscoveryEvent",
  } as const,
} as const)

export const BaseAtomFamilyOperation = defineOperation({
  id: "base-atom-family",
  name: "Base discovery atom family",
  kind: "atom-family",
  input: BaseAtomFamilyInput,
  output: AtomObservationOutput,
  error: DiscoveryContractError,
  views: touches(PackageViews, {
    reactivityKeys: readModelKeys,
    atoms: baseAtomIds,
  } as const),
  laws: atomFamilyLaws,
  atom: {
    family: "base",
    baseAtoms: baseAtomIds,
    subscribesTo: readModelKeys,
  } as const,
} as const)

export const DerivedWorkbenchAtomFamilyOperation = defineOperation({
  id: "derived-workbench-atom-family",
  name: "Derived workbench atom family",
  kind: "atom-family",
  input: DerivedWorkbenchAtomInput,
  output: DerivedWorkbenchAtomOutput,
  error: DiscoveryContractError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "attuned-discovery.score-features.changed",
      "attuned-discovery.decision-packet.changed",
      "attuned-discovery.fold-scene.changed",
      "attuned-discovery.workbench-snapshot.changed",
    ],
    atoms: [...baseAtomIds, ...derivedAtomIds],
  } as const),
  laws: atomFamilyLaws,
  atom: {
    family: "derived-workbench",
    baseAtoms: baseAtomIds,
    derivedAtoms: derivedAtomIds,
    composes: true,
  } as const,
} as const)

export const DomainEventCodecOperation = defineOperation({
  id: "domain-event-codecs",
  name: "Domain and event codecs",
  kind: "codec",
  input: DomainCodecInput,
  output: DomainCodecOutput,
  error: DiscoveryContractError,
  views: touches(PackageViews, {
    reactivityKeys: ["attuned-discovery.domain-codec.changed"],
    atoms: ["domainCodecAtom"],
  } as const),
  laws: codecLaws,
  metadata: {
    schemas: [
      DiscoveryRun,
      DiscoveryEvent,
      ReportAction,
      ReportEvent,
      DecisionPacket,
      FoldScene,
      WorkbenchSnapshot,
      RunSummary,
    ],
  } as const,
} as const)

export const PackageContract = definePackageContract({
  packageId: "attuned-discovery",
  sourceRoot: "packages/attuned-discovery/src",
  packageKind: "core-discovery-runtime",
  views: PackageViews,
  services: DiscoveryPackageServices,
  providedServices: DiscoveryPackageServices,
  operations: [
    DiscoveryEventsFacadeOperation,
    DiscoveryEventLogAppendOperation,
    EventReplayProjectionOperation,
    ReadModelQueryOperation,
    ReactivityKeyMapOperation,
    BaseAtomFamilyOperation,
    DerivedWorkbenchAtomFamilyOperation,
    DomainEventCodecOperation,
  ] as const,
  provenance: {
    generator: "@attune/nx:package-contract",
    project: "attuned-discovery",
    openspecChangeId: "standardize-effect-package-contracts",
  } as const,
  waivers: [
    {
      id: "attuned-discovery/context-service-di",
      category: "legacy-boundary",
      owner: "attuned-discovery-migration-agent",
      reason:
        "DiscoveryEvents and DiscoveryEventLog currently use Context.Service until the canonical Effect.Service migration lands.",
      review: "standardize-effect-package-contracts phase5 product boundary validation",
    },
    {
      id: "attuned-discovery/consolidated-index",
      category: "legacy-boundary",
      owner: "attuned-discovery-migration-agent",
      reason:
        "The current event, projection, codec, Reactivity, and atom families are still consolidated in src/index.ts until dedicated generators own the split.",
      review: "standardize-effect-package-contracts task 10.5",
    },
  ] as const,
} as const)
export type PackageContract = typeof PackageContract

export const PackageLayer = {
  layer: Layer.empty,
  provides: DiscoveryPackageServices,
  requires: [] as const,
  metadata: {
    packageId: "attuned-discovery",
    role: "core-discovery-runtime",
  },
} as const
export type PackageLayer = typeof PackageLayer

export const PackageTestLayer = {
  layer: Layer.empty,
  provides: DiscoveryPackageServices,
  requires: [] as const,
  metadata: {
    packageId: "attuned-discovery",
    role: "in-memory-discovery-test-runtime",
  },
} as const
export type PackageTestLayer = typeof PackageTestLayer

export type AttunedDiscoveryOperationId =
  (typeof PackageContract.operations)[number]["id"]

export const PackageFuzzRpcGroup = definePackageFuzzRpcGroup(PackageContract)

export const PackageFuzzHandlers = {
  "discovery-events-facade": () => ({
    appended: true,
    eventId: "event:fixture",
    eventTag: "DiscoveryRunStarted",
  }),
  "discovery-event-log-append": () => ({
    appended: true,
    eventId: "event:fixture",
    announcedKeys: [...eventLogKeys],
  }),
  "event-replay-projection": () => ({
    version: 1,
    runIds: ["fixture-run"],
    anchorCount: 0,
    familyCount: 0,
    hypothesisCount: 0,
    evidenceCount: 0,
    reviewQueueCount: 0,
    announcedKeys: [...readModelKeys],
  }),
  "read-model-query": () => ({
    metrics: [],
    anchors: [],
    families: [],
    hypotheses: [],
    evidence: [],
    reviewQueue: [],
  }),
  "reactivity-key-map": () => ({
    eventTag: "DiscoveryRunStarted",
    keys: ["attuned-discovery.run-state.changed"],
  }),
  "base-atom-family": () => ({
    atomId: "runStateAtom",
    reactivityKeys: ["attuned-discovery.run-state.changed"],
    version: 1,
    valueSummary: "DiscoveryRun",
  }),
  "derived-workbench-atom-family": () => ({
    atomId: "workbenchSnapshotAtom",
    dependsOnAtoms: [...baseAtomIds, "decisionPacketAtom", "foldSceneAtom"],
    valueKind: "workbench-snapshot" as const,
    viewVersion: 1,
  }),
  "domain-event-codecs": () => ({
    codec: "DiscoveryEvent",
    decoded: true,
    encoded: true,
  }),
} as const satisfies { readonly [Id in AttunedDiscoveryOperationId]: () => unknown }
export type PackageFuzzHandlers = typeof PackageFuzzHandlers

export const PackageProperties = {
  "discovery-events-facade": {
    property:
      "Schema-derived DiscoveryEvent values append only through DiscoveryEvents/DiscoveryEventLog and move declared views.",
  },
  "discovery-event-log-append": {
    property:
      "EventLog append evidence records the event id and declared Reactivity keys.",
  },
  "event-replay-projection": {
    property:
      "Equivalent event sequences replay to deterministic projection summaries.",
  },
  "read-model-query": {
    property:
      "Read-model queries are readonly and expose projection-backed package view state.",
  },
  "reactivity-key-map": {
    property:
      "Every DiscoveryEvent variant maps to the Reactivity keys that refresh its base atoms.",
  },
  "base-atom-family": {
    property:
      "Base atoms subscribe to projection Reactivity keys and do not perform durable writes.",
  },
  "derived-workbench-atom-family": {
    property:
      "Score, plateau, DecisionPacket, FoldScene, and WorkbenchSnapshot atoms compose base atoms.",
  },
  "domain-event-codecs": {
    property:
      "Domain, event, report, DecisionPacket, FoldScene, WorkbenchSnapshot, and RunSummary codecs decode through Effect Schema.",
  },
} as const satisfies {
  readonly [Id in AttunedDiscoveryOperationId]: { readonly property: string }
}
export type PackageProperties = typeof PackageProperties

const lawPartitions = <const Laws extends readonly string[]>(laws: Laws) =>
  laws.map((id) => ({
    id,
    kind: "law" as const,
    from: "inferred-law",
  })) as {
    readonly [Index in keyof Laws]: {
      readonly id: Laws[Index]
      readonly kind: "law"
      readonly from: "inferred-law"
    }
  }

type OperationWithGuidance = {
  readonly id: string
  readonly kind: string
  readonly input: unknown
  readonly output: unknown
  readonly error?: unknown
  readonly views?: {
    readonly reactivityKeys?: readonly string[]
    readonly atoms?: readonly string[]
  }
  readonly laws?: readonly string[]
}

const schemaSources = (operation: OperationWithGuidance) => [
  {
    id: `schema:${operation.id}:input`,
    role: "input" as const,
    label: `${operation.id}.input`,
    source: "effect-schema",
  },
  {
    id: `schema:${operation.id}:output`,
    role: "output" as const,
    label: `${operation.id}.output`,
    source: "effect-schema",
  },
  {
    id: `schema:${operation.id}:error`,
    role: "error" as const,
    label: `${operation.id}.error`,
    source: "effect-schema",
  },
] as const

const viewPartitions = (operation: OperationWithGuidance) => [
  ...(operation.views?.reactivityKeys ?? []).map((id) => ({
    id: `${id}.moves`,
    kind: "reactivity-key" as const,
    from: "operation.views.reactivityKeys",
  })),
  ...(operation.views?.atoms ?? []).map((id) => ({
    id: `${id}.moves`,
    kind: "atom" as const,
    from: "operation.views.atoms",
  })),
]

const operationGuidance = <
  const Operation extends OperationWithGuidance,
  const Laws extends readonly string[],
>(
  operation: Operation,
  laws: Laws,
  options: {
    readonly inputPartitionId: string
    readonly outputPartitionId: string
    readonly coverageTargetId: string
    readonly transformId: string
    readonly filterId?: string
  },
) => ({
  sourceLabels: [
    `operation.kind.${operation.kind}`,
    "effect-schema.ast",
    "package-view-graph",
  ],
  sources: [
    {
      id: `operation:${operation.id}`,
      label: operation.id,
      kind: "contract-operation" as const,
      operationId: operation.id,
    },
  ],
  schemaSources: schemaSources(operation),
  inputPartitions: [
    {
      id: options.inputPartitionId,
      kind: "schema-boundary" as const,
      from: "schema.input",
      sourceId: `schema:${operation.id}:input`,
      transformIds: [options.transformId],
      ...(options.filterId ? { filterIds: [options.filterId] } : {}),
    },
  ],
  outputPartitions: [
    {
      id: options.outputPartitionId,
      kind: "output-variant" as const,
      from: "schema.output",
      sourceId: `schema:${operation.id}:output`,
    },
  ],
  errorPartitions: [
    {
      id: `${operation.id}.typed-error`,
      kind: "typed-error-variant" as const,
      from: "schema.error",
      sourceId: `schema:${operation.id}:error`,
    },
  ],
  lawPartitions: lawPartitions(laws),
  viewPartitions: viewPartitions(operation),
  coverageSearch: [
    {
      id: `coverage:${operation.id}:${options.coverageTargetId}`,
      targetPartitionId: options.coverageTargetId,
      tier: "commit" as const,
      required: true,
    },
  ],
  transforms: [
    {
      id: options.transformId,
      kind: "coverage-bias" as const,
      targetPartitionId: options.coverageTargetId,
      reason: "Bias generated cases toward missing Discovery package view movement.",
    },
  ],
  filters: options.filterId
    ? [
      {
        id: options.filterId,
        kind: "operation-precondition" as const,
        reason:
          "Keep run-scoped generated cases inside a single deterministic discovery run.",
        targetPartitionId: options.inputPartitionId,
        expectedAcceptanceRate: 0.9,
      },
    ]
    : [],
} as const)

export const PackageTypeGuidance = defineTypeGuidance(PackageContract, {
  sourceLabels: [
    "contract.operation",
    "effect-schema.ast",
    "operation.kind.core-discovery-runtime",
    "declared-view",
    "atom-reactivity-graph",
  ],
  sources: [
    {
      id: "contract:attuned-discovery",
      label: "attuned-discovery package contract",
      kind: "contract-operation",
    },
    {
      id: "views:attuned-discovery",
      label: "attuned-discovery Reactivity and atom graph",
      kind: "declared-view",
    },
  ],
  operations: {
    "discovery-events-facade": operationGuidance(
      DiscoveryEventsFacadeOperation,
      eventFacadeLaws,
      {
        inputPartitionId: "discovery-events-facade.event-variant",
        outputPartitionId: "discovery-events-facade.appended",
        coverageTargetId: "attuned-discovery.event-log.appended.moves",
        transformId: "discovery-events-facade.event-variant-bias",
      },
    ),
    "discovery-event-log-append": operationGuidance(
      DiscoveryEventLogAppendOperation,
      eventFacadeLaws,
      {
        inputPartitionId: "discovery-event-log-append.event-variant",
        outputPartitionId: "discovery-event-log-append.announced-keys",
        coverageTargetId: "attuned-discovery.projection.changed.moves",
        transformId: "discovery-event-log-append.reactivity-bias",
      },
    ),
    "event-replay-projection": operationGuidance(
      EventReplayProjectionOperation,
      projectionLaws,
      {
        inputPartitionId: "event-replay-projection.event-sequence",
        outputPartitionId: "event-replay-projection.projection-summary",
        coverageTargetId: "readModelProjectionAtom.moves",
        transformId: "event-replay-projection.sequence-coverage",
      },
    ),
    "read-model-query": operationGuidance(ReadModelQueryOperation, queryLaws, {
      inputPartitionId: "read-model-query.query-kind",
      outputPartitionId: "read-model-query.snapshot-branch",
      coverageTargetId: "workbenchSnapshotAtom.moves",
      transformId: "read-model-query.snapshot-coverage",
      filterId: "read-model-query.fixture-run-scope",
    }),
    "reactivity-key-map": operationGuidance(
      ReactivityKeyMapOperation,
      queryLaws,
      {
        inputPartitionId: "reactivity-key-map.event-variant",
        outputPartitionId: "reactivity-key-map.keys",
        coverageTargetId: "attuned-discovery.review-queue.changed.moves",
        transformId: "reactivity-key-map.event-key-coverage",
      },
    ),
    "base-atom-family": operationGuidance(
      BaseAtomFamilyOperation,
      atomFamilyLaws,
      {
        inputPartitionId: "base-atom-family.atom-id",
        outputPartitionId: "base-atom-family.observation",
        coverageTargetId: "runStateAtom.moves",
        transformId: "base-atom-family.atom-coverage",
      },
    ),
    "derived-workbench-atom-family": operationGuidance(
      DerivedWorkbenchAtomFamilyOperation,
      atomFamilyLaws,
      {
        inputPartitionId: "derived-workbench-atom-family.atom-id",
        outputPartitionId: "derived-workbench-atom-family.view-kind",
        coverageTargetId: "workbenchSnapshotAtom.moves",
        transformId: "derived-workbench-atom-family.view-coverage",
      },
    ),
    "domain-event-codecs": operationGuidance(
      DomainEventCodecOperation,
      codecLaws,
      {
        inputPartitionId: "domain-event-codecs.codec-kind",
        outputPartitionId: "domain-event-codecs.decode-result",
        coverageTargetId: "domainCodecAtom.moves",
        transformId: "domain-event-codecs.schema-branch-coverage",
      },
    ),
  },
} as const)
export type PackageTypeGuidance = typeof PackageTypeGuidance
