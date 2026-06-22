import { Layer, Schema } from "effect"
import {
  FoldScene,
  RunSummary,
  WorkbenchSnapshot,
  buildFixtureWorkbenchSnapshot,
} from "@attune/attuned-discovery"
import {
  defineOperation,
  definePackageContract,
  definePackageViews,
  defineTypeGuidance,
  touches,
} from "@attune/framework-protocol"

import {
  activityFixtureItems,
  activitySummaryCounts,
} from "./activity.js"
import {
  FixtureRouteEvent,
  FixtureRouteModel,
  FixtureStep,
  FixtureStepResult,
  FixtureTraceEntry,
  initialFixtureRouteModel,
} from "./fixture-route.js"
import { attuneFoldkitSiteFixture } from "./fixtures/app-site-fixture.js"
import { mdxViewFixture } from "./fixtures/mdx-view-fixture.js"
import { Model } from "./model.js"
import { Message } from "./message.js"
import {
  ActivityItem,
  AttuneRoute,
  FoldkitMdxComponentName,
  FoldkitPage,
} from "./schema.js"

export { PackageContractSchema } from "@attune/framework-protocol"

export const PackageViews = definePackageViews({
  reactivityKeys: [
    "attune-foldkit.current-route.changed",
    "attune-foldkit.selected-hypothesis.changed",
    "attune-foldkit.selected-evidence.changed",
    "attune-foldkit.server-snapshot.changed",
    "attune-foldkit.route-trace.changed",
    "attune-foldkit.foldkit-scene.changed",
    "attune-foldkit.export-packet.changed",
    "attune-foldkit.fixture-route.changed",
    "attune-foldkit.workbench-snapshot-view.changed",
  ],
  atoms: [
    "currentRouteAtom",
    "selectedHypothesisAtom",
    "selectedEvidenceAtom",
    "serverSnapshotLensAtom",
    "routeTraceAtom",
    "foldkitSceneAtom",
    "exportPacketAtom",
    "fixtureRouteStateAtom",
    "workbenchSnapshotViewAtom",
  ],
} as const)

export const FoldkitOperationError = Schema.Struct({
  code: Schema.String,
  message: Schema.String,
  operationId: Schema.optional(Schema.String),
})
export type FoldkitOperationError = typeof FoldkitOperationError.Type

export const ModelCodecInput = Schema.Unknown
export type ModelCodecInput = typeof ModelCodecInput.Type

export const MessageUpdateInput = Schema.Struct({
  model: Model,
  message: Message,
})
export type MessageUpdateInput = typeof MessageUpdateInput.Type

export const FoldkitCommandTag = Schema.Literals([
  "StartFixtureRun",
  "AdvanceFixtureStep",
] as const)
export type FoldkitCommandTag = typeof FoldkitCommandTag.Type

export const FoldkitUpdateResult = Schema.Struct({
  model: Model,
  commandTags: Schema.Array(FoldkitCommandTag),
  pendingCommand: Schema.String,
})
export type FoldkitUpdateResult = typeof FoldkitUpdateResult.Type

export const ViewModelQueryInput = Schema.Struct({
  model: Model,
})
export type ViewModelQueryInput = typeof ViewModelQueryInput.Type

export const FoldkitViewModel = Schema.Struct({
  title: Schema.String,
  route: AttuneRoute,
  pageId: Schema.String,
  selectedThreadId: Schema.String,
  selectedHypothesisId: Schema.String,
  selectedEvidenceId: Schema.String,
  hasServerSnapshot: Schema.Boolean,
  fixtureRouteStatus: FixtureRouteModel.fields.status,
  componentCount: Schema.Number,
})
export type FoldkitViewModel = typeof FoldkitViewModel.Type

export const FixtureRouteCommandInput = Schema.Struct({
  step: FixtureStep,
  selectedAnchorId: Schema.optional(Schema.String),
})
export type FixtureRouteCommandInput = typeof FixtureRouteCommandInput.Type

export const FixtureRouteQueryInput = Schema.Struct({
  routeEvents: Schema.Array(FixtureRouteEvent),
})
export type FixtureRouteQueryInput = typeof FixtureRouteQueryInput.Type

export const ActivityFixturePacket = Schema.Struct({
  items: Schema.Array(ActivityItem),
  summary: Schema.Struct({
    total: Schema.Number,
    review: Schema.Number,
    safety: Schema.Number,
    failed: Schema.Number,
  }),
})
export type ActivityFixturePacket = typeof ActivityFixturePacket.Type

export const MdxViewFixturePacket = Schema.Struct({
  fixtureId: Schema.String,
  sourcePath: Schema.String,
  page: FoldkitPage,
  expectedText: Schema.Array(Schema.String),
  expectedComponents: Schema.Array(FoldkitMdxComponentName),
})
export type MdxViewFixturePacket = typeof MdxViewFixturePacket.Type

export const FoldkitSurfaceId = Schema.Literals([
  "workbench",
  "discover",
  "findings",
  "lineage",
  "exports",
  "settings",
  "mdx",
] as const)
export type FoldkitSurfaceId = typeof FoldkitSurfaceId.Type

export const FoldkitSurfaceFixture = Schema.Struct({
  surfaceId: FoldkitSurfaceId,
  route: AttuneRoute,
  sourcePath: Schema.String,
  expectedText: Schema.Array(Schema.String),
})
export type FoldkitSurfaceFixture = typeof FoldkitSurfaceFixture.Type

export const FoldkitSiteFixturePacket = Schema.Struct({
  fixtureId: Schema.String,
  scenarioId: Schema.Literal("foldkit-fixture-closed-loop"),
  runId: Schema.String,
  routes: Schema.Array(AttuneRoute),
  items: Schema.Array(ActivityItem),
  surfaces: Schema.Array(FoldkitSurfaceFixture),
})
export type FoldkitSiteFixturePacket = typeof FoldkitSiteFixturePacket.Type

export const WorkbenchSnapshotViewLensInput = Schema.Struct({
  snapshot: WorkbenchSnapshot,
})
export type WorkbenchSnapshotViewLensInput =
  typeof WorkbenchSnapshotViewLensInput.Type

export const WorkbenchSnapshotViewLens = Schema.Struct({
  runId: Schema.String,
  version: Schema.Number,
  hypothesisIds: Schema.Array(Schema.String),
  evidenceIds: Schema.Array(Schema.String),
  reviewIds: Schema.Array(Schema.String),
  sceneId: Schema.String,
  bestNextAction: Schema.String,
})
export type WorkbenchSnapshotViewLens = typeof WorkbenchSnapshotViewLens.Type

export const FoldkitSceneAtomInput = Schema.Struct({
  snapshot: Schema.NullOr(WorkbenchSnapshot),
  selectedHypothesisId: Schema.String,
  selectedEvidenceId: Schema.String,
})
export type FoldkitSceneAtomInput = typeof FoldkitSceneAtomInput.Type

export const FoldkitSceneAtomView = Schema.Struct({
  snapshotVersion: Schema.NullOr(Schema.Number),
  selectedHypothesisId: Schema.String,
  selectedEvidenceId: Schema.String,
  scene: Schema.NullOr(FoldScene),
  nodeIds: Schema.Array(Schema.String),
})
export type FoldkitSceneAtomView = typeof FoldkitSceneAtomView.Type

export const RouteTraceAtomInput = Schema.Struct({
  fixtureRoute: FixtureRouteModel,
})
export type RouteTraceAtomInput = typeof RouteTraceAtomInput.Type

export const RouteTraceAtomView = Schema.Struct({
  routeStepCount: Schema.Number,
  eventCount: Schema.Number,
  traceCount: Schema.Number,
  steps: Schema.Array(FixtureStep),
  lastSnapshotVersion: Schema.NullOr(Schema.Number),
})
export type RouteTraceAtomView = typeof RouteTraceAtomView.Type

export const ExportPacketAtomInput = Schema.Struct({
  model: Model,
})
export type ExportPacketAtomInput = typeof ExportPacketAtomInput.Type

export const ExportPacketAtomView = Schema.Struct({
  route: AttuneRoute,
  runId: Schema.String,
  pendingCommand: Schema.String,
  snapshotVersion: Schema.NullOr(Schema.Number),
  evidenceCount: Schema.Number,
  reviewCount: Schema.Number,
})
export type ExportPacketAtomView = typeof ExportPacketAtomView.Type

const codecLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "determinism.same-input-same-output",
  "side-effect.readonly",
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

const commandLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "side-effect.declared-boundary",
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

export const modelCodecOperation = defineOperation({
  id: "model-codec",
  name: "Model codec",
  kind: "codec",
  input: ModelCodecInput,
  output: Model,
  error: FoldkitOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "attune-foldkit.current-route.changed",
      "attune-foldkit.fixture-route.changed",
      "attune-foldkit.server-snapshot.changed",
    ],
    atoms: ["currentRouteAtom", "fixtureRouteStateAtom", "serverSnapshotLensAtom"],
  } as const),
  laws: codecLaws,
  metadata: {
    exportedSchema: "Model",
    source: "src/model.ts",
  } as const,
} as const)

export const messageUpdateCommandOperation = defineOperation({
  id: "message-update-command",
  name: "Message/update command",
  kind: "command",
  input: MessageUpdateInput,
  output: FoldkitUpdateResult,
  error: FoldkitOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "attune-foldkit.current-route.changed",
      "attune-foldkit.selected-hypothesis.changed",
      "attune-foldkit.selected-evidence.changed",
      "attune-foldkit.fixture-route.changed",
      "attune-foldkit.server-snapshot.changed",
    ],
    atoms: [
      "currentRouteAtom",
      "selectedHypothesisAtom",
      "selectedEvidenceAtom",
      "fixtureRouteStateAtom",
      "serverSnapshotLensAtom",
    ],
  } as const),
  laws: commandLaws,
  metadata: {
    commandBoundary: "foldkit update(model, message)",
    outputSummary: "Model plus FoldKit command tags",
    source: "src/update.ts",
  } as const,
} as const)

export const viewModelQueryOperation = defineOperation({
  id: "view-model-query",
  name: "View model query",
  kind: "query",
  input: ViewModelQueryInput,
  output: FoldkitViewModel,
  error: FoldkitOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "attune-foldkit.current-route.changed",
      "attune-foldkit.fixture-route.changed",
      "attune-foldkit.workbench-snapshot-view.changed",
    ],
    atoms: ["currentRouteAtom", "fixtureRouteStateAtom", "workbenchSnapshotViewAtom"],
  } as const),
  laws: queryLaws,
  metadata: {
    source: "src/view.ts",
    query: "route/page/component summary for FoldKit Document rendering",
  } as const,
} as const)

export const fixtureRouteCommandOperation = defineOperation({
  id: "fixture-route-command",
  name: "Fixture route command",
  kind: "command",
  input: FixtureRouteCommandInput,
  output: FixtureStepResult,
  error: FoldkitOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "attune-foldkit.fixture-route.changed",
      "attune-foldkit.route-trace.changed",
      "attune-foldkit.server-snapshot.changed",
      "attune-foldkit.workbench-snapshot-view.changed",
    ],
    atoms: [
      "fixtureRouteStateAtom",
      "routeTraceAtom",
      "serverSnapshotLensAtom",
      "workbenchSnapshotViewAtom",
    ],
  } as const),
  laws: commandLaws,
  metadata: {
    deterministicHarness: true,
    source: "src/fixture-route.ts",
  } as const,
} as const)

export const fixtureRouteQueryOperation = defineOperation({
  id: "fixture-route-query",
  name: "Fixture route query",
  kind: "query",
  input: FixtureRouteQueryInput,
  output: FixtureRouteModel,
  error: FoldkitOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "attune-foldkit.fixture-route.changed",
      "attune-foldkit.route-trace.changed",
    ],
    atoms: ["fixtureRouteStateAtom", "routeTraceAtom"],
  } as const),
  laws: queryLaws,
  metadata: {
    source: "src/fixture-route.ts",
    query: "replayFixtureRouteEvents",
  } as const,
} as const)

export const activityFixtureCodecOperation = defineOperation({
  id: "activity-fixture-codec",
  name: "Activity fixture codec",
  kind: "codec",
  input: Schema.Unknown,
  output: ActivityFixturePacket,
  error: FoldkitOperationError,
  views: touches(PackageViews, {
    reactivityKeys: ["attune-foldkit.current-route.changed"],
    atoms: ["currentRouteAtom"],
  } as const),
  laws: codecLaws,
  metadata: {
    source: "src/activity.ts",
    fixture: "activityFixtureItems",
  } as const,
} as const)

export const mdxFixtureCodecOperation = defineOperation({
  id: "mdx-fixture-codec",
  name: "MDX fixture codec",
  kind: "codec",
  input: Schema.Unknown,
  output: MdxViewFixturePacket,
  error: FoldkitOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "attune-foldkit.current-route.changed",
      "attune-foldkit.workbench-snapshot-view.changed",
    ],
    atoms: ["currentRouteAtom", "workbenchSnapshotViewAtom"],
  } as const),
  laws: codecLaws,
  metadata: {
    source: "src/fixtures/mdx-view-fixture.ts",
    fixture: "mdxViewFixture",
  } as const,
} as const)

export const siteFixtureCodecOperation = defineOperation({
  id: "site-fixture-codec",
  name: "Site fixture codec",
  kind: "codec",
  input: Schema.Unknown,
  output: FoldkitSiteFixturePacket,
  error: FoldkitOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "attune-foldkit.current-route.changed",
      "attune-foldkit.fixture-route.changed",
    ],
    atoms: ["currentRouteAtom", "fixtureRouteStateAtom"],
  } as const),
  laws: codecLaws,
  metadata: {
    source: "src/fixtures/app-site-fixture.ts",
    fixture: "attuneFoldkitSiteFixture",
  } as const,
} as const)

export const workbenchSnapshotViewLensOperation = defineOperation({
  id: "workbench-snapshot-view-lens",
  name: "WorkbenchSnapshot view lens",
  kind: "query",
  input: WorkbenchSnapshotViewLensInput,
  output: WorkbenchSnapshotViewLens,
  error: FoldkitOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "attune-foldkit.server-snapshot.changed",
      "attune-foldkit.workbench-snapshot-view.changed",
      "attune-foldkit.foldkit-scene.changed",
      "attune-foldkit.export-packet.changed",
    ],
    atoms: [
      "serverSnapshotLensAtom",
      "workbenchSnapshotViewAtom",
      "foldkitSceneAtom",
      "exportPacketAtom",
    ],
  } as const),
  laws: queryLaws,
  metadata: {
    source: "@attune/attuned-discovery WorkbenchSnapshot",
    lens: "run/version/decision/scene/review packet",
  } as const,
} as const)

export const foldkitSceneAtomOperation = defineOperation({
  id: "foldkit-scene-atom",
  name: "FoldKit scene atom",
  kind: "atom-family",
  input: FoldkitSceneAtomInput,
  output: FoldkitSceneAtomView,
  error: FoldkitOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "attune-foldkit.foldkit-scene.changed",
      "attune-foldkit.server-snapshot.changed",
      "attune-foldkit.selected-hypothesis.changed",
      "attune-foldkit.selected-evidence.changed",
    ],
    atoms: [
      "foldkitSceneAtom",
      "serverSnapshotLensAtom",
      "selectedHypothesisAtom",
      "selectedEvidenceAtom",
    ],
  } as const),
  laws: atomFamilyLaws,
  atom: {
    atomIds: ["foldkitSceneAtom"],
    composes: ["serverSnapshotLensAtom", "selectedHypothesisAtom", "selectedEvidenceAtom"],
  } as const,
} as const)

export const routeTraceAtomOperation = defineOperation({
  id: "route-trace-atom",
  name: "Route trace atom",
  kind: "atom-family",
  input: RouteTraceAtomInput,
  output: RouteTraceAtomView,
  error: FoldkitOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "attune-foldkit.route-trace.changed",
      "attune-foldkit.fixture-route.changed",
    ],
    atoms: ["routeTraceAtom", "fixtureRouteStateAtom"],
  } as const),
  laws: atomFamilyLaws,
  atom: {
    atomIds: ["routeTraceAtom"],
    composes: ["fixtureRouteStateAtom"],
  } as const,
} as const)

export const exportPacketAtomOperation = defineOperation({
  id: "export-packet-atom",
  name: "Export packet atom",
  kind: "atom-family",
  input: ExportPacketAtomInput,
  output: ExportPacketAtomView,
  error: FoldkitOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "attune-foldkit.export-packet.changed",
      "attune-foldkit.server-snapshot.changed",
      "attune-foldkit.current-route.changed",
    ],
    atoms: ["exportPacketAtom", "serverSnapshotLensAtom", "currentRouteAtom"],
  } as const),
  laws: atomFamilyLaws,
  atom: {
    atomIds: ["exportPacketAtom"],
    composes: ["serverSnapshotLensAtom", "currentRouteAtom"],
  } as const,
} as const)

export const PackageContract = definePackageContract({
  packageId: "attune-foldkit",
  sourceRoot: "packages/attune-foldkit",
  packageKind: "foldkit-ui",
  views: PackageViews,
  services: [] as const,
  operations: [
    modelCodecOperation,
    messageUpdateCommandOperation,
    viewModelQueryOperation,
    fixtureRouteCommandOperation,
    fixtureRouteQueryOperation,
    activityFixtureCodecOperation,
    mdxFixtureCodecOperation,
    siteFixtureCodecOperation,
    workbenchSnapshotViewLensOperation,
    foldkitSceneAtomOperation,
    routeTraceAtomOperation,
    exportPacketAtomOperation,
  ] as const,
  provenance: {
    generator: "@attune/nx:package-contract",
    customizedFor: "attune-foldkit product UI boundary",
    openspecChangeId: "standardize-effect-package-contracts",
  } as const,
  waivers: [
    {
      id: "attune-foldkit/global-fixture-session",
      category: "legacy-boundary",
      owner: "attune-foldkit-migration-agent",
      reason:
        "src/fixture-route.ts still owns a dev-only active fixture session until the scoped fixture route service/generator lands.",
      review: "standardize-effect-package-contracts task 10.5",
    },
    {
      id: "attune-foldkit/hand-authored-fixtures",
      category: "legacy-boundary",
      owner: "attune-foldkit-migration-agent",
      reason:
        "FoldKit scene and MDX fixtures remain hand-authored until @attune/nx foldkit fixture generators exist.",
      review: "standardize-effect-package-contracts task 10.5",
    },
  ] as const,
} as const)
export type PackageContract = typeof PackageContract

export const PackageLayer = {
  layer: Layer.empty,
  provides: [] as const,
  requires: [] as const,
  metadata: {
    packageId: "attune-foldkit",
    role: "foldkit-ui-runtime",
  },
} as const
export type PackageLayer = typeof PackageLayer

export const PackageTestLayer = {
  layer: Layer.empty,
  provides: [] as const,
  requires: [] as const,
  metadata: {
    packageId: "attune-foldkit",
    role: "foldkit-ui-test-runtime",
  },
} as const
export type PackageTestLayer = typeof PackageTestLayer

export const PackageFuzzHandlers = {
  "model-codec": () => makeFixtureModel(),
  "message-update-command": () => ({
    model: makeFixtureModel(),
    commandTags: [] as readonly FoldkitCommandTag[],
    pendingCommand: "",
  }),
  "view-model-query": () => makeViewModel(makeFixtureModel()),
  "fixture-route-command": () => makeFixtureStepResult("start"),
  "fixture-route-query": () => initialFixtureRouteModel(),
  "activity-fixture-codec": () => ({
    items: activityFixtureItems,
    summary: activitySummaryCounts(activityFixtureItems),
  }),
  "mdx-fixture-codec": () => mdxViewFixture,
  "site-fixture-codec": () => attuneFoldkitSiteFixture,
  "workbench-snapshot-view-lens": () =>
    makeWorkbenchSnapshotLens(buildFixtureWorkbenchSnapshot()),
  "foldkit-scene-atom": () =>
    makeFoldkitSceneAtomView(buildFixtureWorkbenchSnapshot(), "", ""),
  "route-trace-atom": () => makeRouteTraceAtomView(initialFixtureRouteModel()),
  "export-packet-atom": () => makeExportPacketAtomView(makeFixtureModel()),
} as const
export type PackageFuzzHandlers = typeof PackageFuzzHandlers

export const PackageProperties = {
  "model-codec": propertyFor(modelCodecOperation),
  "message-update-command": propertyFor(messageUpdateCommandOperation),
  "view-model-query": propertyFor(viewModelQueryOperation),
  "fixture-route-command": propertyFor(fixtureRouteCommandOperation),
  "fixture-route-query": propertyFor(fixtureRouteQueryOperation),
  "activity-fixture-codec": propertyFor(activityFixtureCodecOperation),
  "mdx-fixture-codec": propertyFor(mdxFixtureCodecOperation),
  "site-fixture-codec": propertyFor(siteFixtureCodecOperation),
  "workbench-snapshot-view-lens": propertyFor(workbenchSnapshotViewLensOperation),
  "foldkit-scene-atom": propertyFor(foldkitSceneAtomOperation),
  "route-trace-atom": propertyFor(routeTraceAtomOperation),
  "export-packet-atom": propertyFor(exportPacketAtomOperation),
} as const
export type PackageProperties = typeof PackageProperties

export const PackageTypeGuidance = defineTypeGuidance(PackageContract, {
  sourceLabels: [
    "contract.operation",
    "effect-schema.ast",
    "foldkit-ui-boundary",
    "declared-view",
    "atom-reactivity-graph",
  ],
  operations: {
    "model-codec": operationGuidance(modelCodecOperation, {
      laws: codecLaws,
      inputPartitionId: "model-codec.unknown-input",
      outputPartitionId: "model-codec.model",
      coverageTargetId: "model-codec.required-fields",
      transformId: "model-codec.schema-decode",
    }),
    "message-update-command": operationGuidance(messageUpdateCommandOperation, {
      laws: commandLaws,
      inputPartitionId: "message-update-command.message-tag",
      outputPartitionId: "message-update-command.model-and-command-tags",
      coverageTargetId: "message-update-command.update-branches",
      transformId: "message-update-command.message-tag-bias",
    }),
    "view-model-query": operationGuidance(viewModelQueryOperation, {
      laws: queryLaws,
      inputPartitionId: "view-model-query.route",
      outputPartitionId: "view-model-query.document-summary",
      coverageTargetId: "view-model-query.route-pages",
      transformId: "view-model-query.route-bias",
    }),
    "fixture-route-command": operationGuidance(fixtureRouteCommandOperation, {
      laws: commandLaws,
      inputPartitionId: "fixture-route-command.step",
      outputPartitionId: "fixture-route-command.snapshot-result",
      coverageTargetId: "fixture-route-command.closed-loop-steps",
      transformId: "fixture-route-command.step-bias",
    }),
    "fixture-route-query": operationGuidance(fixtureRouteQueryOperation, {
      laws: queryLaws,
      inputPartitionId: "fixture-route-query.route-events",
      outputPartitionId: "fixture-route-query.replayed-model",
      coverageTargetId: "fixture-route-query.replay-selected-anchor",
      transformId: "fixture-route-query.event-corpus",
    }),
    "activity-fixture-codec": operationGuidance(activityFixtureCodecOperation, {
      laws: codecLaws,
      inputPartitionId: "activity-fixture-codec.unknown-input",
      outputPartitionId: "activity-fixture-codec.activity-items",
      coverageTargetId: "activity-fixture-codec.filter-counts",
      transformId: "activity-fixture-codec.fixture-corpus",
    }),
    "mdx-fixture-codec": operationGuidance(mdxFixtureCodecOperation, {
      laws: codecLaws,
      inputPartitionId: "mdx-fixture-codec.unknown-input",
      outputPartitionId: "mdx-fixture-codec.page-and-components",
      coverageTargetId: "mdx-fixture-codec.component-registry",
      transformId: "mdx-fixture-codec.component-bias",
    }),
    "site-fixture-codec": operationGuidance(siteFixtureCodecOperation, {
      laws: codecLaws,
      inputPartitionId: "site-fixture-codec.unknown-input",
      outputPartitionId: "site-fixture-codec.route-surfaces",
      coverageTargetId: "site-fixture-codec.all-routes",
      transformId: "site-fixture-codec.route-bias",
    }),
    "workbench-snapshot-view-lens": operationGuidance(workbenchSnapshotViewLensOperation, {
      laws: queryLaws,
      inputPartitionId: "workbench-snapshot-view-lens.snapshot",
      outputPartitionId: "workbench-snapshot-view-lens.ids",
      coverageTargetId: "workbench-snapshot-view-lens.packet-fields",
      transformId: "workbench-snapshot-view-lens.snapshot-corpus",
    }),
    "foldkit-scene-atom": operationGuidance(foldkitSceneAtomOperation, {
      laws: atomFamilyLaws,
      inputPartitionId: "foldkit-scene-atom.snapshot-selection",
      outputPartitionId: "foldkit-scene-atom.scene-node-ids",
      coverageTargetId: "foldkit-scene-atom.scene-movement",
      transformId: "foldkit-scene-atom.snapshot-bias",
    }),
    "route-trace-atom": operationGuidance(routeTraceAtomOperation, {
      laws: atomFamilyLaws,
      inputPartitionId: "route-trace-atom.fixture-route",
      outputPartitionId: "route-trace-atom.steps",
      coverageTargetId: "route-trace-atom.trace-movement",
      transformId: "route-trace-atom.step-corpus",
    }),
    "export-packet-atom": operationGuidance(exportPacketAtomOperation, {
      laws: atomFamilyLaws,
      inputPartitionId: "export-packet-atom.model",
      outputPartitionId: "export-packet-atom.packet-summary",
      coverageTargetId: "export-packet-atom.export-view",
      transformId: "export-packet-atom.snapshot-bias",
    }),
  },
} as const)
export type PackageTypeGuidance = typeof PackageTypeGuidance

type OperationWithGuidance = {
  readonly id: string
  readonly kind: string
  readonly input: unknown
  readonly output: unknown
  readonly error: unknown
  readonly views: {
    readonly reactivityKeys?: readonly string[]
    readonly atoms?: readonly string[]
  }
  readonly laws: readonly string[]
}

type GuidanceOptions<Laws extends readonly string[]> = {
  readonly laws: Laws
  readonly inputPartitionId: string
  readonly outputPartitionId: string
  readonly coverageTargetId: string
  readonly transformId: string
}

function makeFixtureModel(): Model {
  return Model.make({
    route: "workbench",
    filter: "all",
    selectedThreadId: "",
    selectedRunId: attuneFoldkitSiteFixture.runId,
    selectedHypothesisId: "",
    selectedEvidenceId: "",
    pendingCommand: "",
    items: [...attuneFoldkitSiteFixture.items],
    page: mdxViewFixture.page,
    serverSnapshot: null,
    fixtureRoute: initialFixtureRouteModel(),
  })
}

function makeViewModel(model: Model): FoldkitViewModel {
  return {
    title: model.page.title,
    route: model.route,
    pageId: model.page.id,
    selectedThreadId: model.selectedThreadId,
    selectedHypothesisId: model.selectedHypothesisId,
    selectedEvidenceId: model.selectedEvidenceId,
    hasServerSnapshot: model.serverSnapshot !== null,
    fixtureRouteStatus: model.fixtureRoute.status,
    componentCount: model.page.document.blocks.filter((block) => block._tag === "Component").length,
  }
}

function makeFixtureStepResult(step: FixtureStep): FixtureStepResult {
  const snapshot = buildFixtureWorkbenchSnapshot()
  return {
    scenarioId: "foldkit-fixture-closed-loop",
    runId: snapshot.runId,
    step,
    routeStepCount: 1,
    snapshot,
    summary: makeRunSummary(snapshot, 1),
    routeEvents: [],
    trace: [],
  }
}

function makeRunSummary(
  snapshot: WorkbenchSnapshot,
  routeStepCount: number,
): RunSummary {
  return {
    runId: snapshot.runId,
    repoSnapshotId: snapshot.decisionPacket.run.repoSnapshotId,
    eventCount: snapshot.decisionPacket.anchors.length,
    routeStepCount,
    usefulEvidenceCount: snapshot.decisionPacket.evidence.length,
    finalSnapshotVersion: snapshot.version,
    searchIndexTimeMs: 0,
    proofTimeMs: snapshot.decisionPacket.evidence[0]?.durationMs ?? 0,
    cache: "miss",
  }
}

function makeWorkbenchSnapshotLens(
  snapshot: WorkbenchSnapshot,
): WorkbenchSnapshotViewLens {
  return {
    runId: snapshot.runId,
    version: snapshot.version,
    hypothesisIds: snapshot.decisionPacket.hypotheses.map((hypothesis) => hypothesis.hypothesisId),
    evidenceIds: snapshot.decisionPacket.evidence.map((evidence) => evidence.evidenceId),
    reviewIds: snapshot.reviewQueue.map((review) => review.reviewId),
    sceneId: snapshot.scene.sceneId,
    bestNextAction: snapshot.decisionPacket.bestNextAction.kind,
  }
}

function makeFoldkitSceneAtomView(
  snapshot: WorkbenchSnapshot | null,
  selectedHypothesisId: string,
  selectedEvidenceId: string,
): FoldkitSceneAtomView {
  return {
    snapshotVersion: snapshot?.version ?? null,
    selectedHypothesisId,
    selectedEvidenceId,
    scene: snapshot?.scene ?? null,
    nodeIds: snapshot?.scene.nodes.map((node) => node.id) ?? [],
  }
}

function makeRouteTraceAtomView(
  fixtureRoute: FixtureRouteModel,
): RouteTraceAtomView {
  return {
    routeStepCount: fixtureRoute.routeStepCount,
    eventCount: fixtureRoute.routeEvents.length,
    traceCount: fixtureRoute.trace.length,
    steps: fixtureRoute.trace.map((entry: FixtureTraceEntry) => entry.step),
    lastSnapshotVersion: fixtureRoute.trace.at(-1)?.snapshotVersion ?? null,
  }
}

function makeExportPacketAtomView(model: Model): ExportPacketAtomView {
  return {
    route: model.route,
    runId: model.selectedRunId,
    pendingCommand: model.pendingCommand,
    snapshotVersion: model.serverSnapshot?.version ?? null,
    evidenceCount: model.serverSnapshot?.decisionPacket.evidence.length ?? 0,
    reviewCount: model.serverSnapshot?.reviewQueue.length ?? 0,
  }
}

function propertyFor<const Operation extends OperationWithGuidance>(
  operation: Operation,
) {
  return {
    property: {
      operationId: operation.id,
      laws: operation.laws,
      checks: [
        "schema.decode",
        "schema.encode",
        "handler.exact-operation-map",
        "view.atom-moves",
      ],
    },
  } as const
}

function operationGuidance<
  const Operation extends OperationWithGuidance,
  const Laws extends readonly string[],
>(
  operation: Operation,
  options: GuidanceOptions<Laws>,
) {
  const inputSchemaId = `schema:${operation.id}:input`
  const outputSchemaId = `schema:${operation.id}:output`
  const errorSchemaId = `schema:${operation.id}:error`

  return {
    sourceLabels: [
      `operation.kind.${operation.kind}`,
      "effect-schema.ast",
      "foldkit.ui.view-graph",
    ],
    sources: [
      {
        id: `operation:${operation.id}`,
        label: operation.id,
        kind: "contract-operation",
        operationId: operation.id,
      },
    ],
    schemaSources: [
      {
        id: inputSchemaId,
        role: "input",
        label: `${operation.id}.input`,
        source: "effect-schema",
      },
      {
        id: outputSchemaId,
        role: "output",
        label: `${operation.id}.output`,
        source: "effect-schema",
      },
      {
        id: errorSchemaId,
        role: "error",
        label: `${operation.id}.error`,
        source: "effect-schema",
      },
    ],
    inputPartitions: [
      {
        id: options.inputPartitionId,
        kind: "schema-boundary",
        from: "schema.input",
        sourceId: inputSchemaId,
        transformIds: [options.transformId],
      },
    ],
    outputPartitions: [
      {
        id: options.outputPartitionId,
        kind: "output-variant",
        from: "schema.output",
        sourceId: outputSchemaId,
      },
    ],
    errorPartitions: [
      {
        id: `${operation.id}.typed-error`,
        kind: "typed-error-variant",
        from: "schema.error",
        sourceId: errorSchemaId,
      },
    ],
    lawPartitions: lawPartitions(options.laws),
    viewPartitions: [
      ...viewPartitions(operation.id, "reactivity-key", operation.views.reactivityKeys ?? []),
      ...viewPartitions(operation.id, "atom", operation.views.atoms ?? []),
    ],
    coverageSearch: [
      {
        id: `coverage:${operation.id}:${options.coverageTargetId}`,
        targetPartitionId: options.coverageTargetId,
        tier: "commit",
        required: true,
        priority: 8,
        reason:
          "FoldKit package properties should cover schema partitions and declared atom/Reactivity view movement.",
      },
    ],
    transforms: [
      {
        id: options.transformId,
        kind: "coverage-bias",
        targetPartitionId: options.coverageTargetId,
        reason:
          "Bias Schema-derived cases toward route, fixture, snapshot, and atom graph partitions.",
      },
    ],
    filters: [],
  } as const
}

function lawPartitions<const Laws extends readonly string[]>(laws: Laws) {
  return laws.map((id) => ({
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
}

function viewPartitions(
  operationId: string,
  kind: "reactivity-key" | "atom",
  ids: readonly string[],
) {
  return ids.map((id) => ({
    id: `${operationId}.${id}.moves`,
    kind,
    from: kind === "atom" ? "touches.atom" : "touches.reactivity-key",
  }))
}
