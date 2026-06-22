import { Layer, Schema } from "effect"
import {
  defineOperation,
  definePackageContract,
  definePackageViews,
  defineTypeGuidance,
  touches,
} from "@attune/framework-protocol"

export { PackageContractSchema } from "@attune/framework-protocol"

export const PackageViews = definePackageViews({
  reactivityKeys: [
    "joern-effect-properties.property-run.changed",
    "joern-effect-properties.fuzz-run.changed",
    "joern-effect-properties.corpus.changed",
    "joern-effect-properties.counterexample.changed",
    "joern-effect-properties.worker-shard.changed",
    "joern-effect-properties.workspace-pool.changed",
    "joern-effect-properties.coverage-feedback.changed",
    "joern-effect-properties.weak-oracle.changed",
    "joern-effect-properties.telemetry.changed",
  ],
  atoms: [
    "propertyRunAtom",
    "fuzzRunAtom",
    "corpusAtom",
    "counterexampleAtom",
    "workerShardAtom",
    "workspacePoolAtom",
    "coverageFeedbackAtom",
    "weakOracleFindingAtom",
    "telemetryEventAtom",
  ],
} as const)

export const PropertyProofServices = [
  "joern-effect-properties/PropertyHarnessRuntime",
  "joern-effect-properties/SemanticCorpusStore",
  "joern-effect-properties/CounterexampleStore",
  "joern-effect-properties/SemanticMutator",
  "joern-effect-properties/SemanticFuzzScheduler",
  "joern-effect-properties/JoernWorkspacePool",
  "joern-effect-properties/FuzzOracle",
  "joern-effect-properties/FuzzTelemetry",
  "joern-effect-properties/CoverageSearch",
  "joern-effect-properties/WorkerProperty",
] as const

export const PropertyProofRequiredServices = [
  "joern-effect/Joern",
  "joern-effect/CpgProgramBuilder",
  "attune.property-event-runtime",
  "filesystem.temp-workspace",
] as const

export const PropertyProofContractError = Schema.Struct({
  code: Schema.Literal(
    "property-harness-failed",
    "corpus-unavailable",
    "counterexample-record-failed",
    "mutation-rejected",
    "scheduler-failed",
    "workspace-pool-failed",
    "oracle-disagreement",
    "telemetry-emit-failed",
    "coverage-feedback-failed",
    "worker-property-failed",
    "package-view-unavailable",
  ),
  message: Schema.String,
  operationId: Schema.optional(Schema.String),
  replayId: Schema.optional(Schema.String),
})
export type PropertyProofContractError = typeof PropertyProofContractError.Type

export const FuzzPreset = Schema.Literal("smoke", "workbench", "nightly", "campaign")
export type FuzzPreset = typeof FuzzPreset.Type

export const JoernExecutionMode = Schema.Literal("none", "import", "query")
export type JoernExecutionMode = typeof JoernExecutionMode.Type

export const SyntaxFlavor = Schema.Literal("js", "ts", "jsx", "tsx")
export type SyntaxFlavor = typeof SyntaxFlavor.Type

export const CorpusOrigin = Schema.Literal(
  "curated",
  "typescript-docs",
  "parser-fixture",
  "promoted-counterexample",
)
export type CorpusOrigin = typeof CorpusOrigin.Type

export const MutationKind = Schema.Literal(
  "module-split",
  "function-wrap",
  "async-boundary",
  "generic-decode",
  "object-destructure",
  "optional-chain",
  "jsx-prop-flow",
  "source-sink-flow",
  "class-method",
  "import-export-shape",
)
export type MutationKind = typeof MutationKind.Type

export const WorkerResourceTier = Schema.Literal(
  "commit",
  "push",
  "proof-pressure",
  "nightly",
)
export type WorkerResourceTier = typeof WorkerResourceTier.Type

export const WorkerEvidenceStatus = Schema.Literal(
  "passed",
  "failed",
  "timed-out",
  "skipped",
)
export type WorkerEvidenceStatus = typeof WorkerEvidenceStatus.Type

export const CoverageFindingKind = Schema.Literal(
  "high-rejection-filter",
  "missing-atom-graph-movement",
  "dead-harness",
  "weak-oracle",
)
export type CoverageFindingKind = typeof CoverageFindingKind.Type

export const PropertyHarnessRuntimeInput = Schema.Struct({
  localEvents: Schema.Boolean,
  mode: FuzzPreset,
  runId: Schema.optional(Schema.String),
  workerCount: Schema.Number,
  workspaceRootPath: Schema.optional(Schema.String),
})
export type PropertyHarnessRuntimeInput = typeof PropertyHarnessRuntimeInput.Type

export const PropertyHarnessRuntimeOutput = Schema.Struct({
  deterministic: Schema.Boolean,
  eventRuntime: Schema.Literal("local", "axiom", "disabled"),
  localEvents: Schema.Boolean,
  runId: Schema.String,
  workerCount: Schema.Number,
})
export type PropertyHarnessRuntimeOutput = typeof PropertyHarnessRuntimeOutput.Type

export const SemanticCorpusStoreInput = Schema.Struct({
  includePromoted: Schema.Boolean,
  limit: Schema.optional(Schema.Number),
  origin: Schema.optional(CorpusOrigin),
})
export type SemanticCorpusStoreInput = typeof SemanticCorpusStoreInput.Type

export const SemanticCorpusStoreOutput = Schema.Struct({
  corpusAtomId: Schema.String,
  origins: Schema.Array(Schema.String),
  promotedSeedCount: Schema.Number,
  seedCount: Schema.Number,
})
export type SemanticCorpusStoreOutput = typeof SemanticCorpusStoreOutput.Type

export const CounterexampleStoreInput = Schema.Struct({
  action: Schema.Literal("list", "record", "promote"),
  failureClass: Schema.optional(Schema.String),
  seedId: Schema.optional(Schema.String),
  syntaxFlavor: Schema.optional(SyntaxFlavor),
})
export type CounterexampleStoreInput = typeof CounterexampleStoreInput.Type

export const CounterexampleStoreOutput = Schema.Struct({
  candidateCount: Schema.Number,
  counterexampleAtomId: Schema.String,
  latestSeedId: Schema.optional(Schema.String),
  promotedSeedCount: Schema.Number,
})
export type CounterexampleStoreOutput = typeof CounterexampleStoreOutput.Type

export const SemanticMutatorInput = Schema.Struct({
  mutationKinds: Schema.Array(MutationKind),
  replayPath: Schema.optional(Schema.String),
  seedId: Schema.String,
  syntaxFlavor: SyntaxFlavor,
})
export type SemanticMutatorInput = typeof SemanticMutatorInput.Type

export const SemanticMutatorOutput = Schema.Struct({
  appliedMutations: Schema.Array(Schema.String),
  caseId: Schema.String,
  rejectedMutations: Schema.Array(Schema.String),
  sourceFiles: Schema.Number,
})
export type SemanticMutatorOutput = typeof SemanticMutatorOutput.Type

export const SemanticFuzzSchedulerInput = Schema.Struct({
  batches: Schema.optional(Schema.Number),
  cases: Schema.Number,
  joernMode: JoernExecutionMode,
  mode: FuzzPreset,
  queryFeedback: Schema.Boolean,
  seed: Schema.Number,
  workerCount: Schema.Number,
  workspaceRootPath: Schema.optional(Schema.String),
})
export type SemanticFuzzSchedulerInput = typeof SemanticFuzzSchedulerInput.Type

export const SemanticFuzzSchedulerOutput = Schema.Struct({
  accepted: Schema.Number,
  batches: Schema.optional(Schema.Number),
  cases: Schema.Number,
  mode: FuzzPreset,
  rejected: Schema.Number,
  runId: Schema.String,
  target: Schema.String,
  workerShards: Schema.Number,
})
export type SemanticFuzzSchedulerOutput = typeof SemanticFuzzSchedulerOutput.Type

export const JoernWorkspacePoolInput = Schema.Struct({
  importProject: Schema.Boolean,
  rootPath: Schema.optional(Schema.String),
  workerId: Schema.optional(Schema.String),
})
export type JoernWorkspacePoolInput = typeof JoernWorkspacePoolInput.Type

export const JoernWorkspacePoolOutput = Schema.Struct({
  cleanedUp: Schema.Boolean,
  imported: Schema.Boolean,
  projectName: Schema.String,
  workerId: Schema.String,
  workspacePath: Schema.String,
})
export type JoernWorkspacePoolOutput = typeof JoernWorkspacePoolOutput.Type

export const FuzzOracleInput = Schema.Struct({
  caseCount: Schema.Number,
  mode: Schema.Literal("import", "query"),
  queryBudget: Schema.optional(Schema.Number),
  queryFeedback: Schema.Boolean,
})
export type FuzzOracleInput = typeof FuzzOracleInput.Type

export const FuzzOracleOutput = Schema.Struct({
  expectationFailures: Schema.Number,
  oracleAtomId: Schema.String,
  projectName: Schema.String,
  queryResultCount: Schema.Number,
  workerId: Schema.String,
})
export type FuzzOracleOutput = typeof FuzzOracleOutput.Type

export const FuzzTelemetryInput = Schema.Struct({
  eventType: Schema.String,
  localEvents: Schema.Boolean,
  runId: Schema.optional(Schema.String),
  target: Schema.String,
})
export type FuzzTelemetryInput = typeof FuzzTelemetryInput.Type

export const FuzzTelemetryOutput = Schema.Struct({
  emitted: Schema.Boolean,
  eventType: Schema.String,
  flushed: Schema.Boolean,
  telemetryAtomId: Schema.String,
})
export type FuzzTelemetryOutput = typeof FuzzTelemetryOutput.Type

export const CoverageSearchFeedbackInput = Schema.Struct({
  includeAtomGraph: Schema.Boolean,
  includeV8: Schema.Boolean,
  includeWeakOracle: Schema.Boolean,
  operationIds: Schema.Array(Schema.String),
})
export type CoverageSearchFeedbackInput = typeof CoverageSearchFeedbackInput.Type

export const CoverageSearchFeedbackOutput = Schema.Struct({
  atomGraphMovements: Schema.Number,
  coverageDeltas: Schema.Number,
  coverageFeedbackAtomId: Schema.String,
  findings: Schema.Number,
  retainedSeeds: Schema.Number,
  weakOracleFindings: Schema.Number,
})
export type CoverageSearchFeedbackOutput = typeof CoverageSearchFeedbackOutput.Type

export const WorkerPropertyWrapperInput = Schema.Struct({
  generatedValuesSerializable: Schema.Boolean,
  operationId: Schema.optional(Schema.String),
  propertyId: Schema.String,
  resourceTier: WorkerResourceTier,
  seed: Schema.Number,
  timeoutMs: Schema.Number,
  workerCount: Schema.Number,
})
export type WorkerPropertyWrapperInput = typeof WorkerPropertyWrapperInput.Type

export const WorkerPropertyWrapperOutput = Schema.Struct({
  descriptorKind: Schema.Literal("attune.worker-property"),
  preservesShrinking: Schema.Boolean,
  propertyId: Schema.String,
  randomSource: Schema.Literal("main-thread", "worker"),
  shardId: Schema.String,
  status: WorkerEvidenceStatus,
  workerCount: Schema.Number,
})
export type WorkerPropertyWrapperOutput = typeof WorkerPropertyWrapperOutput.Type

export const PackageViewAtomInput = Schema.Struct({
  atomId: Schema.Literal(
    "propertyRunAtom",
    "fuzzRunAtom",
    "corpusAtom",
    "counterexampleAtom",
    "workerShardAtom",
    "workspacePoolAtom",
    "coverageFeedbackAtom",
    "weakOracleFindingAtom",
    "telemetryEventAtom",
  ),
  operationId: Schema.optional(Schema.String),
})
export type PackageViewAtomInput = typeof PackageViewAtomInput.Type

export const PackageViewAtomOutput = Schema.Struct({
  atomId: Schema.String,
  dependsOnAtoms: Schema.Array(Schema.String),
  observed: Schema.Boolean,
  reactivityKeys: Schema.Array(Schema.String),
  summary: Schema.String,
  valueKind: Schema.Literal(
    "property-run",
    "fuzz-run",
    "corpus",
    "counterexample",
    "worker-shard",
    "workspace-pool",
    "coverage-feedback",
    "weak-oracle",
    "telemetry",
  ),
})
export type PackageViewAtomOutput = typeof PackageViewAtomOutput.Type

const propertyRunKeys = [
  "joern-effect-properties.property-run.changed",
  "joern-effect-properties.telemetry.changed",
] as const

const fuzzRunKeys = [
  "joern-effect-properties.fuzz-run.changed",
  "joern-effect-properties.worker-shard.changed",
  "joern-effect-properties.workspace-pool.changed",
  "joern-effect-properties.telemetry.changed",
] as const

const corpusKeys = [
  "joern-effect-properties.corpus.changed",
] as const

const counterexampleKeys = [
  "joern-effect-properties.counterexample.changed",
  "joern-effect-properties.corpus.changed",
] as const

const coverageKeys = [
  "joern-effect-properties.coverage-feedback.changed",
  "joern-effect-properties.weak-oracle.changed",
] as const

const workerKeys = [
  "joern-effect-properties.worker-shard.changed",
  "joern-effect-properties.property-run.changed",
  "joern-effect-properties.counterexample.changed",
] as const

const schemaLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
] as const

const queryLaws = [
  ...schemaLaws,
  "determinism.same-input-same-output",
  "side-effect.readonly",
  "view.reactivity-key-moves",
  "view.atom-moves",
  "view.package-view-moves",
] as const

const commandLaws = [
  ...schemaLaws,
  "side-effect.declared-boundary",
  "view.reactivity-key-moves",
  "view.atom-moves",
  "view.package-view-moves",
] as const

const generatorLaws = [
  ...schemaLaws,
  "determinism.same-input-same-output",
  "side-effect.virtual-tree-only",
  "generator.options-decode",
  "generator.deterministic-output",
  "generator.provenance-recorded",
  "generator.no-untracked-output",
  "view.reactivity-key-moves",
  "view.atom-moves",
  "view.package-view-moves",
] as const

const resourceProviderLaws = [
  ...schemaLaws,
  "side-effect.declared-boundary",
  "resource.observe-before-apply",
  "resource.observed-idempotence",
  "view.reactivity-key-moves",
  "view.atom-moves",
  "view.package-view-moves",
] as const

const joernTemplateLaws = [
  ...schemaLaws,
  "determinism.same-input-same-output",
  "side-effect.declared-boundary",
  "joern.template-binding-schema",
  "joern.evidence-schema",
  "joern.deterministic-template",
  "joern.normalized-evidence",
  "view.reactivity-key-moves",
  "view.atom-moves",
  "view.package-view-moves",
] as const

const eventFacadeLaws = [
  ...schemaLaws,
  "side-effect.declared-boundary",
  "event-facade.event-schema",
  "event-facade.append-boundary",
  "view.reactivity-key-moves",
  "view.atom-moves",
  "view.package-view-moves",
] as const

const projectionLaws = [
  ...schemaLaws,
  "side-effect.declared-boundary",
  "projection.event-decode",
  "projection.state-decode",
  "projection.deterministic-replay",
  "view.reactivity-key-moves",
  "view.atom-moves",
  "view.package-view-moves",
] as const

const atomFamilyLaws = [
  ...schemaLaws,
  "side-effect.no-durable-atom-write",
  "atom-family.base-refresh",
  "atom-family.derived-composes",
  "view.reactivity-key-moves",
  "view.atom-moves",
  "view.package-view-moves",
] as const

export const propertyHarnessRuntimeOperation = defineOperation({
  id: "property-harness-runtime",
  name: "Property harness runtime configuration",
  kind: "command",
  input: PropertyHarnessRuntimeInput,
  output: PropertyHarnessRuntimeOutput,
  error: PropertyProofContractError,
  views: touches(PackageViews, {
    reactivityKeys: propertyRunKeys,
    atoms: ["propertyRunAtom", "telemetryEventAtom"],
  } as const),
  laws: commandLaws,
  metadata: {
    service: "joern-effect-properties/PropertyHarnessRuntime",
    boundary: "makePropertyHarnessRuntimeLayer",
    eventRuntime: "local-or-axiom",
  } as const,
} as const)

export const semanticCorpusStoreOperation = defineOperation({
  id: "semantic-corpus-store",
  name: "Semantic corpus store boundary",
  kind: "query",
  input: SemanticCorpusStoreInput,
  output: SemanticCorpusStoreOutput,
  error: PropertyProofContractError,
  views: touches(PackageViews, {
    reactivityKeys: corpusKeys,
    atoms: ["corpusAtom"],
  } as const),
  laws: queryLaws,
  metadata: {
    service: "joern-effect-properties/SemanticCorpusStore",
    boundary: "curated-plus-promoted-seeds",
    cache: "private framework/runtime or in-memory fixture",
  } as const,
} as const)

export const counterexampleStoreOperation = defineOperation({
  id: "counterexample-store",
  name: "Counterexample store and promotion boundary",
  kind: "command",
  input: CounterexampleStoreInput,
  output: CounterexampleStoreOutput,
  error: PropertyProofContractError,
  views: touches(PackageViews, {
    reactivityKeys: counterexampleKeys,
    atoms: ["counterexampleAtom", "corpusAtom"],
  } as const),
  laws: commandLaws,
  metadata: {
    service: "joern-effect-properties/CounterexampleStore",
    boundary: "record-list-promote-counterexamples",
    storage: "in-memory fixture now; private protocol cache later",
  } as const,
} as const)

export const semanticMutatorOperation = defineOperation({
  id: "semantic-mutator",
  name: "Semantic project mutator",
  kind: "generator",
  input: SemanticMutatorInput,
  output: SemanticMutatorOutput,
  error: PropertyProofContractError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "joern-effect-properties.fuzz-run.changed",
      "joern-effect-properties.corpus.changed",
    ],
    atoms: ["fuzzRunAtom", "corpusAtom"],
  } as const),
  laws: generatorLaws,
  generator: {
    name: "joern-effect-properties:semantic-mutator",
    project: "joern-effect-properties",
    output: "in-memory-fuzz-case",
    generatedFiles: [] as const,
  } as const,
} as const)

export const semanticFuzzSchedulerOperation = defineOperation({
  id: "semantic-fuzz-scheduler",
  name: "Semantic fuzz scheduler and shard runner",
  kind: "command",
  input: SemanticFuzzSchedulerInput,
  output: SemanticFuzzSchedulerOutput,
  error: PropertyProofContractError,
  views: touches(PackageViews, {
    reactivityKeys: fuzzRunKeys,
    atoms: [
      "fuzzRunAtom",
      "workerShardAtom",
      "workspacePoolAtom",
      "telemetryEventAtom",
    ],
  } as const),
  laws: commandLaws,
  metadata: {
    service: "joern-effect-properties/SemanticFuzzScheduler",
    boundary: "runFuzzer",
    schedules: ["corpus", "mutator", "workspace-pool", "oracle", "telemetry"],
  } as const,
} as const)

export const joernWorkspacePoolOperation = defineOperation({
  id: "joern-workspace-pool",
  name: "Joern workspace pool worker boundary",
  kind: "resource-provider",
  observes: true,
  input: JoernWorkspacePoolInput,
  output: JoernWorkspacePoolOutput,
  error: PropertyProofContractError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "joern-effect-properties.workspace-pool.changed",
      "joern-effect-properties.worker-shard.changed",
    ],
    atoms: ["workspacePoolAtom", "workerShardAtom"],
  } as const),
  laws: resourceProviderLaws,
  resource: {
    observes: true,
    provider: "joern-effect/Joern",
    desiredStateSchema: "JoernWorkspaceWorker",
    observationSchema: "ImportedProjectWorkspace",
    liveApply: false,
  } as const,
} as const)

export const fuzzOracleOperation = defineOperation({
  id: "fuzz-oracle",
  name: "Fuzz oracle and Joern query recipe boundary",
  kind: "joern-template",
  input: FuzzOracleInput,
  output: FuzzOracleOutput,
  error: PropertyProofContractError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "joern-effect-properties.weak-oracle.changed",
      "joern-effect-properties.coverage-feedback.changed",
    ],
    atoms: ["weakOracleFindingAtom", "coverageFeedbackAtom"],
  } as const),
  laws: joernTemplateLaws,
  joern: {
    registry: "compileGeneratedDslPrograms",
    templateKinds: ["query-recipe", "oracle-comparison"],
    evidence: ["FuzzQueryRecipeResult", "FuzzExpectationMismatchError"],
  } as const,
} as const)

export const fuzzTelemetryOperation = defineOperation({
  id: "fuzz-telemetry",
  name: "Fuzz telemetry event facade",
  kind: "event-facade",
  input: FuzzTelemetryInput,
  output: FuzzTelemetryOutput,
  error: PropertyProofContractError,
  views: touches(PackageViews, {
    reactivityKeys: ["joern-effect-properties.telemetry.changed"],
    atoms: ["telemetryEventAtom"],
  } as const),
  laws: eventFacadeLaws,
  event: {
    eventTypes: [
      "attune.fuzz.case_generated",
      "attune.fuzz.counterexample_found",
      "attune.fuzz.shrink_completed",
      "attune.fuzz.fixture_candidate",
    ],
    appendBoundary: "emitFuzzEvent",
    sink: "local-events-or-axiom",
  } as const,
} as const)

export const coverageSearchFeedbackOperation = defineOperation({
  id: "coverage-search-feedback",
  name: "Coverage search and weak-oracle feedback",
  kind: "projection",
  input: CoverageSearchFeedbackInput,
  output: CoverageSearchFeedbackOutput,
  error: PropertyProofContractError,
  views: touches(PackageViews, {
    reactivityKeys: coverageKeys,
    atoms: ["coverageFeedbackAtom", "weakOracleFindingAtom"],
  } as const),
  laws: projectionLaws,
  projection: {
    inputEvent: "CoverageSearchMergeInput",
    state: "CoverageSearchSummary",
    replay: "mergeCoverageSearchEvidence",
  } as const,
} as const)

export const workerPropertyWrapperOperation = defineOperation({
  id: "worker-property-wrapper",
  name: "Worker property wrapper boundary",
  kind: "command",
  input: WorkerPropertyWrapperInput,
  output: WorkerPropertyWrapperOutput,
  error: PropertyProofContractError,
  views: touches(PackageViews, {
    reactivityKeys: workerKeys,
    atoms: ["workerShardAtom", "propertyRunAtom", "counterexampleAtom"],
  } as const),
  laws: commandLaws,
  metadata: {
    service: "joern-effect-properties/WorkerProperty",
    boundary: "defineWorkerPropertyDescriptor",
    workerBackend: "@fast-check/worker",
    rpcBackend: "future optional; no runtime @effect/rpc import",
  } as const,
} as const)

export const propertyProofViewAtomsOperation = defineOperation({
  id: "property-proof-view-atoms",
  name: "Property proof runtime package view atoms",
  kind: "atom-family",
  input: PackageViewAtomInput,
  output: PackageViewAtomOutput,
  error: PropertyProofContractError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "joern-effect-properties.property-run.changed",
      "joern-effect-properties.fuzz-run.changed",
      "joern-effect-properties.corpus.changed",
      "joern-effect-properties.counterexample.changed",
      "joern-effect-properties.worker-shard.changed",
      "joern-effect-properties.workspace-pool.changed",
      "joern-effect-properties.coverage-feedback.changed",
      "joern-effect-properties.weak-oracle.changed",
      "joern-effect-properties.telemetry.changed",
    ],
    atoms: [
      "propertyRunAtom",
      "fuzzRunAtom",
      "corpusAtom",
      "counterexampleAtom",
      "workerShardAtom",
      "workspacePoolAtom",
      "coverageFeedbackAtom",
      "weakOracleFindingAtom",
      "telemetryEventAtom",
    ],
  } as const),
  laws: atomFamilyLaws,
  atom: {
    family: "property-proof-runtime",
    baseAtoms: [
      "propertyRunAtom",
      "fuzzRunAtom",
      "corpusAtom",
      "counterexampleAtom",
      "workerShardAtom",
      "workspacePoolAtom",
      "coverageFeedbackAtom",
      "telemetryEventAtom",
    ],
    derivedAtoms: ["weakOracleFindingAtom"],
    composes: true,
  } as const,
} as const)

export const PackageContract = definePackageContract({
  packageId: "joern-effect-properties",
  sourceRoot: "packages/joern-effect-properties/src",
  packageKind: "property-proof-runtime",
  views: PackageViews,
  services: PropertyProofServices,
  providedServices: PropertyProofServices,
  requiredServices: PropertyProofRequiredServices,
  operations: [
    propertyHarnessRuntimeOperation,
    semanticCorpusStoreOperation,
    counterexampleStoreOperation,
    semanticMutatorOperation,
    semanticFuzzSchedulerOperation,
    joernWorkspacePoolOperation,
    fuzzOracleOperation,
    fuzzTelemetryOperation,
    coverageSearchFeedbackOperation,
    workerPropertyWrapperOperation,
    propertyProofViewAtomsOperation,
  ] as const,
  provenance: {
    generator: "@attune/nx:package-contract",
    customizedFor: "Joern property proof runtime and workerized fuzz harness",
    openspecChangeId: "standardize-effect-package-contracts",
  } as const,
  waivers: [
    {
      id: "joern-effect-properties/context-tag-services",
      category: "legacy-boundary",
      owner: "joern-effect-properties-migration-agent",
      reason:
        "Property proof services still use lower-level Context.Tag service definitions until canonical Effect.Service scaffolds land for the proof package.",
      review: "standardize-effect-package-contracts task 11.4",
    },
    {
      id: "joern-effect-properties/live-joern-oracle-boundary",
      category: "hidden-configuration",
      owner: "joern-effect-properties-migration-agent",
      reason:
        "Live oracle and workspace pool runs depend on Joern toolchain, temp workspaces, and optional event sinks; PackageTestLayer uses dry fixture behavior.",
      review: "standardize-effect-package-contracts task 11.3",
    },
    {
      id: "joern-effect-properties/typed-executor-migration",
      category: "temporary-migration-adapter",
      owner: "joern-effect-properties-migration-agent",
      reason:
        "Existing property, fuzz, Nix, Arion, and wrapper command strings remain until proof targets move behind typed Nx executors.",
      review: "standardize-effect-package-contracts task 11.4",
    },
  ] as const,
} as const)
export type PackageContract = typeof PackageContract

export const PackageLayer = {
  layer: Layer.empty,
  provides: PropertyProofServices,
  requires: PropertyProofRequiredServices,
  metadata: {
    packageId: "joern-effect-properties",
    role: "property-proof-runtime-boundary",
  },
} as const
export type PackageLayer = typeof PackageLayer

export const PackageTestLayer = {
  layer: Layer.empty,
  provides: [
    ...PropertyProofServices,
    ...PropertyProofRequiredServices,
  ] as const,
  requires: [] as const,
  metadata: {
    packageId: "joern-effect-properties",
    role: "dry-fixture-property-proof-boundary",
    eventRuntime: "local",
    liveJoern: false,
    workerResourceTier: "commit",
  },
} as const
export type PackageTestLayer = typeof PackageTestLayer

export type JoernEffectPropertiesOperationId =
  (typeof PackageContract.operations)[number]["id"]

export const PackageFuzzHandlers = {
  "property-harness-runtime": () => ({
    deterministic: true,
    eventRuntime: "local" as const,
    localEvents: true,
    runId: "joern-effect-properties-fixture-run",
    workerCount: 1,
  }),
  "semantic-corpus-store": () => ({
    corpusAtomId: "corpusAtom",
    origins: ["curated", "parser-fixture"],
    promotedSeedCount: 0,
    seedCount: 8,
  }),
  "counterexample-store": () => ({
    candidateCount: 1,
    counterexampleAtomId: "counterexampleAtom",
    latestSeedId: "promoted-counterexample-fixture",
    promotedSeedCount: 1,
  }),
  "semantic-mutator": () => ({
    appliedMutations: ["function-wrap", "source-sink-flow"],
    caseId: "semantic-fixture-case",
    rejectedMutations: [],
    sourceFiles: 1,
  }),
  "semantic-fuzz-scheduler": () => ({
    accepted: 2,
    batches: 1,
    cases: 2,
    mode: "smoke" as const,
    rejected: 0,
    runId: "joern-effect-properties-fixture-run",
    target: "joern-effect-properties:fuzz:smoke",
    workerShards: 1,
  }),
  "joern-workspace-pool": () => ({
    cleanedUp: true,
    imported: false,
    projectName: "fixture-project",
    workerId: "joern-fuzz-worker-fixture",
    workspacePath: "/tmp/attune/joern-effect-properties/fixture",
  }),
  "fuzz-oracle": () => ({
    expectationFailures: 0,
    oracleAtomId: "weakOracleFindingAtom",
    projectName: "fixture-project",
    queryResultCount: 0,
    workerId: "joern-fuzz-worker-fixture",
  }),
  "fuzz-telemetry": () => ({
    emitted: true,
    eventType: "attune.fuzz.case_generated",
    flushed: true,
    telemetryAtomId: "telemetryEventAtom",
  }),
  "coverage-search-feedback": () => ({
    atomGraphMovements: 1,
    coverageDeltas: 1,
    coverageFeedbackAtomId: "coverageFeedbackAtom",
    findings: 0,
    retainedSeeds: 1,
    weakOracleFindings: 0,
  }),
  "worker-property-wrapper": () => ({
    descriptorKind: "attune.worker-property" as const,
    preservesShrinking: true,
    propertyId: "joern-effect-properties.fixture-property",
    randomSource: "main-thread" as const,
    shardId: "shard-0-of-1",
    status: "passed" as const,
    workerCount: 1,
  }),
  "property-proof-view-atoms": () => ({
    atomId: "propertyRunAtom",
    dependsOnAtoms: ["workerShardAtom", "coverageFeedbackAtom"],
    observed: true,
    reactivityKeys: [
      "joern-effect-properties.property-run.changed",
      "joern-effect-properties.worker-shard.changed",
    ],
    summary: "Fixture property proof runtime atom movement.",
    valueKind: "property-run" as const,
  }),
} as const satisfies {
  readonly [Id in JoernEffectPropertiesOperationId]: () => unknown
}
export type PackageFuzzHandlers = typeof PackageFuzzHandlers

export const PackageProperties = {
  "property-harness-runtime": {
    property:
      "Property harness runtime selects deterministic fixture event sinks and bounded worker counts for generated audits.",
  },
  "semantic-corpus-store": {
    property:
      "Curated and promoted semantic corpus seeds decode through Schema-backed corpus boundaries without checked-in report state.",
  },
  "counterexample-store": {
    property:
      "Counterexamples record, list, and promote into corpus seeds with replay metadata retained in private cache boundaries.",
  },
  "semantic-mutator": {
    property:
      "Semantic mutators produce deterministic project cases from declared corpus seeds and mutation plans.",
  },
  "semantic-fuzz-scheduler": {
    property:
      "Fuzz scheduler runs bounded fixture campaigns through corpus, mutator, workspace, oracle, and telemetry services.",
  },
  "joern-workspace-pool": {
    property:
      "Workspace pool workers create and clean temporary Joern workspaces without exposing durable cache paths as source truth.",
  },
  "fuzz-oracle": {
    property:
      "Oracle query recipes normalize Joern evidence and weak-oracle findings through declared template boundaries.",
  },
  "fuzz-telemetry": {
    property:
      "Fuzz telemetry emits schema-backed events through local or Axiom event sinks and flushes deterministically in fixtures.",
  },
  "coverage-search-feedback": {
    property:
      "Coverage search merges type partitions, atom graph movement, V8 deltas, filters, and weak-oracle findings deterministically.",
  },
  "worker-property-wrapper": {
    property:
      "Worker property descriptors declare worker budget, random source, timeout, shard, and cleanup metadata.",
  },
  "property-proof-view-atoms": {
    property:
      "Property proof package atoms compose run, corpus, counterexample, worker, coverage, weak-oracle, and telemetry views.",
  },
} as const satisfies {
  readonly [Id in JoernEffectPropertiesOperationId]: { readonly property: string }
}
export type PackageProperties = typeof PackageProperties

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
    "property-proof-runtime",
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
  partitions: [
    {
      id: `${operation.id}.operation-id`,
      kind: "operation-id" as const,
      from: "contract.operation.id",
      sourceId: `operation:${operation.id}`,
    },
    {
      id: `${operation.id}.operation-kind.${operation.kind}`,
      kind: "operation-kind" as const,
      from: "contract.operation.kind",
      sourceId: `operation:${operation.id}`,
    },
  ],
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
      reason:
        "Bias generated proof-runtime cases toward missing property evidence and package view movement.",
    },
  ],
  filters: options.filterId
    ? [
      {
        id: options.filterId,
        kind: "operation-precondition" as const,
        reason:
          "Keep generated proof-runtime audits on deterministic fixture or dry Joern boundaries.",
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
    "operation.kind.property-proof-runtime",
    "fast-check-worker",
    "coverage-feedback",
    "declared-view",
  ],
  sources: [
    {
      id: "contract:joern-effect-properties",
      label: "joern-effect-properties package contract",
      kind: "contract-operation",
    },
    {
      id: "views:joern-effect-properties",
      label: "joern-effect-properties Reactivity and atom graph",
      kind: "declared-view",
    },
  ],
  operations: {
    "property-harness-runtime": operationGuidance(
      propertyHarnessRuntimeOperation,
      commandLaws,
      {
        inputPartitionId: "property-harness-runtime.event-runtime",
        outputPartitionId: "property-harness-runtime.fixture-layer",
        coverageTargetId: "propertyRunAtom.moves",
        transformId: "property-harness-runtime.local-event-runtime",
        filterId: "property-harness-runtime.fixture-events",
      },
    ),
    "semantic-corpus-store": operationGuidance(
      semanticCorpusStoreOperation,
      queryLaws,
      {
        inputPartitionId: "semantic-corpus-store.origin",
        outputPartitionId: "semantic-corpus-store.seed-count",
        coverageTargetId: "corpusAtom.moves",
        transformId: "semantic-corpus-store.origin-coverage",
      },
    ),
    "counterexample-store": operationGuidance(
      counterexampleStoreOperation,
      commandLaws,
      {
        inputPartitionId: "counterexample-store.action",
        outputPartitionId: "counterexample-store.promoted-seed",
        coverageTargetId: "counterexampleAtom.moves",
        transformId: "counterexample-store.replay-candidate",
      },
    ),
    "semantic-mutator": operationGuidance(
      semanticMutatorOperation,
      generatorLaws,
      {
        inputPartitionId: "semantic-mutator.mutation-kind",
        outputPartitionId: "semantic-mutator.semantic-case",
        coverageTargetId: "fuzzRunAtom.moves",
        transformId: "semantic-mutator.mutation-kind-coverage",
      },
    ),
    "semantic-fuzz-scheduler": operationGuidance(
      semanticFuzzSchedulerOperation,
      commandLaws,
      {
        inputPartitionId: "semantic-fuzz-scheduler.preset",
        outputPartitionId: "semantic-fuzz-scheduler.summary",
        coverageTargetId: "fuzzRunAtom.moves",
        transformId: "semantic-fuzz-scheduler.preset-coverage",
        filterId: "semantic-fuzz-scheduler.fixture-preset",
      },
    ),
    "joern-workspace-pool": operationGuidance(
      joernWorkspacePoolOperation,
      resourceProviderLaws,
      {
        inputPartitionId: "joern-workspace-pool.workspace-root",
        outputPartitionId: "joern-workspace-pool.worker",
        coverageTargetId: "workspacePoolAtom.moves",
        transformId: "joern-workspace-pool.worker-coverage",
        filterId: "joern-workspace-pool.fixture-workspace",
      },
    ),
    "fuzz-oracle": operationGuidance(
      fuzzOracleOperation,
      joernTemplateLaws,
      {
        inputPartitionId: "fuzz-oracle.mode",
        outputPartitionId: "fuzz-oracle.query-results",
        coverageTargetId: "weakOracleFindingAtom.moves",
        transformId: "fuzz-oracle.query-recipe-coverage",
        filterId: "fuzz-oracle.fixture-joern",
      },
    ),
    "fuzz-telemetry": operationGuidance(
      fuzzTelemetryOperation,
      eventFacadeLaws,
      {
        inputPartitionId: "fuzz-telemetry.event-type",
        outputPartitionId: "fuzz-telemetry.flush",
        coverageTargetId: "telemetryEventAtom.moves",
        transformId: "fuzz-telemetry.event-type-coverage",
      },
    ),
    "coverage-search-feedback": operationGuidance(
      coverageSearchFeedbackOperation,
      projectionLaws,
      {
        inputPartitionId: "coverage-search-feedback.finding-kind",
        outputPartitionId: "coverage-search-feedback.retained-seeds",
        coverageTargetId: "coverageFeedbackAtom.moves",
        transformId: "coverage-search-feedback.weak-oracle-bias",
      },
    ),
    "worker-property-wrapper": operationGuidance(
      workerPropertyWrapperOperation,
      commandLaws,
      {
        inputPartitionId: "worker-property-wrapper.resource-tier",
        outputPartitionId: "worker-property-wrapper.worker-evidence",
        coverageTargetId: "workerShardAtom.moves",
        transformId: "worker-property-wrapper.commit-tier-budget",
        filterId: "worker-property-wrapper.serializable-values",
      },
    ),
    "property-proof-view-atoms": operationGuidance(
      propertyProofViewAtomsOperation,
      atomFamilyLaws,
      {
        inputPartitionId: "property-proof-view-atoms.atom-id",
        outputPartitionId: "property-proof-view-atoms.summary",
        coverageTargetId: "weakOracleFindingAtom.moves",
        transformId: "property-proof-view-atoms.graph-coverage",
      },
    ),
  },
} as const)
export type PackageTypeGuidance = typeof PackageTypeGuidance
