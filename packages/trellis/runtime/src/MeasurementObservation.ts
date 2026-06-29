import { createRequire } from "node:module"
import { Effect, Schema } from "effect"
import {
  recipeObservationId,
  type RecipeObservation,
} from "@attune/framework-protocol"
import {
  createInMemoryRecipeReceiptStore,
  type RecipeReceiptStoreApi,
} from "./RecipeReceiptStore.js"
import {
  createPostgresRecipeReceiptStore,
  type PostgresQueryClient,
  type PostgresQueryResult,
} from "./PostgresRecipeReceiptStore.js"

export const MeasurementObservationKindSchema = Schema.Literals([
  "measurement.session.started",
  "measurement.session.completed",
  "measurement.harness.proof",
  "measurement.command.observed",
  "measurement.trace.inventory.summary",
  "measurement.agent.metrics.summary",
  "measurement.recipe-spine.coverage",
  "measurement.edit-attempts.summary",
  "measurement.legacy-substrate.audit",
  "measurement.migration-readiness.summary",
  "measurement.baseline.session.selected",
  "measurement.baseline.session.summary",
  "measurement.micro-experiment.summary",
  "measurement.report.projected",
] as const)
export type MeasurementObservationKind = typeof MeasurementObservationKindSchema.Type

export const MeasurementStoreModeSchema = Schema.Literals([
  "local-postgres",
  "in-memory",
  "disabled",
  "export-only",
] as const)
export type MeasurementStoreMode = typeof MeasurementStoreModeSchema.Type

export const MeasurementCountRecordSchema = Schema.Struct({
  value: Schema.String,
  count: Schema.Number,
})
export type MeasurementCountRecord = typeof MeasurementCountRecordSchema.Type

export const MeasurementNumericSummarySchema = Schema.Struct({
  count: Schema.Number,
  total: Schema.Number,
  min: Schema.optional(Schema.Number),
  max: Schema.optional(Schema.Number),
  average: Schema.optional(Schema.Number),
  p50: Schema.optional(Schema.Number),
  p95: Schema.optional(Schema.Number),
})
export type MeasurementNumericSummary =
  typeof MeasurementNumericSummarySchema.Type

export const MeasurementTimestampRangeSchema = Schema.Struct({
  count: Schema.Number,
  earliest: Schema.optional(Schema.String),
  latest: Schema.optional(Schema.String),
  spanMs: Schema.optional(Schema.Number),
})
export type MeasurementTimestampRange =
  typeof MeasurementTimestampRangeSchema.Type

export const MeasurementPrivacySummarySchema = Schema.Struct({
  rawPromptsStored: Schema.Literal(false),
  rawConversationStored: Schema.Literal(false),
  rawTraceRowsStored: Schema.Literal(false),
  fullCommandOutputStored: Schema.Literal(false),
})
export type MeasurementPrivacySummary = typeof MeasurementPrivacySummarySchema.Type

export const MeasurementCommandOutputSummarySchema = Schema.Struct({
  text: Schema.String,
  byteLength: Schema.Number,
  lineCount: Schema.Number,
  truncated: Schema.Boolean,
  sha256: Schema.String,
  redacted: Schema.Boolean,
})
export type MeasurementCommandOutputSummary =
  typeof MeasurementCommandOutputSummarySchema.Type

export const MeasurementHarnessPluginProofSchema = Schema.Struct({
  name: Schema.String,
  loaded: Schema.Boolean,
  version: Schema.optional(Schema.String),
  capability: Schema.optional(Schema.String),
  path: Schema.optional(Schema.String),
})
export type MeasurementHarnessPluginProof =
  typeof MeasurementHarnessPluginProofSchema.Type

export const MeasurementHarnessProofPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  measurementSessionId: Schema.optional(Schema.String),
  passed: Schema.Boolean,
  runtime: Schema.Struct({
    flakeProvided: Schema.Boolean,
    runtimeKind: Schema.Literals([
      "deterministic-attune-harness",
      "upstream-opencode",
    ] as const),
    upstreamIntegrated: Schema.optional(Schema.Boolean),
    opencodePath: Schema.optional(Schema.String),
    opencodeVersion: Schema.optional(Schema.String),
  }),
  plugins: Schema.Array(MeasurementHarnessPluginProofSchema),
  upstream: Schema.optional(Schema.Struct({
    available: Schema.Boolean,
    command: Schema.optional(Schema.Array(Schema.String)),
    exitCode: Schema.optional(Schema.Number),
    reason: Schema.optional(Schema.String),
  })),
  pluginHookExercise: Schema.Struct({
    passed: Schema.Boolean,
    skipped: Schema.optional(Schema.Boolean),
    command: Schema.optional(Schema.Array(Schema.String)),
    durationMs: Schema.optional(Schema.Number),
    exitCode: Schema.optional(Schema.Number),
    reason: Schema.optional(Schema.String),
  }),
  leakageCheck: Schema.Struct({
    rawPromptPresent: Schema.Boolean,
    rawConversationPresent: Schema.Boolean,
  }),
  checks: Schema.optional(Schema.Array(Schema.Struct({
    name: Schema.String,
    passed: Schema.Boolean,
    detail: Schema.optional(Schema.String),
  }))),
  privacy: Schema.optional(MeasurementPrivacySummarySchema),
})
export type MeasurementHarnessProofPayload =
  typeof MeasurementHarnessProofPayloadSchema.Type

export const MeasurementCommandObservationPayloadSchema = Schema.Struct({
  schemaVersion: Schema.Literal(1),
  measurementSessionId: Schema.optional(Schema.String),
  command: Schema.String,
  argv: Schema.Array(Schema.String),
  cwd: Schema.String,
  startedAt: Schema.String,
  completedAt: Schema.String,
  durationMs: Schema.Number,
  exitCode: Schema.Number,
  status: Schema.Literals(["succeeded", "failed"] as const),
  stdoutSummary: MeasurementCommandOutputSummarySchema,
  stderrSummary: MeasurementCommandOutputSummarySchema,
  measurementPhase: Schema.optional(Schema.Literals(["baseline", "treatment"] as const)),
  knownNxTarget: Schema.optional(Schema.String),
  targetId: Schema.optional(Schema.String),
  recipeId: Schema.optional(Schema.String),
  inferredRecipeId: Schema.optional(Schema.String),
  tokenTotal: Schema.optional(Schema.Number),
  toolCalls: Schema.optional(Schema.Number),
  tokenMetricSource: Schema.optional(Schema.String),
  rawOutputStored: Schema.Literal(false),
})
export type MeasurementCommandObservationPayload =
  typeof MeasurementCommandObservationPayloadSchema.Type

export const MeasurementSqliteSchemaTableSummarySchema = Schema.Struct({
  tableName: Schema.String,
  allowlistedColumns: Schema.Array(Schema.String),
  skippedColumnCount: Schema.Number,
})
export type MeasurementSqliteSchemaTableSummary =
  typeof MeasurementSqliteSchemaTableSummarySchema.Type

export const MeasurementSqliteSchemaSummarySchema = Schema.Struct({
  fileId: Schema.String,
  fileKind: Schema.Literals(["sqlite", "db"] as const),
  inspected: Schema.Boolean,
  tableCount: Schema.Number,
  tables: Schema.Array(MeasurementSqliteSchemaTableSummarySchema),
  skippedReason: Schema.optional(Schema.String),
})
export type MeasurementSqliteSchemaSummary =
  typeof MeasurementSqliteSchemaSummarySchema.Type

export const MeasurementHistoricalSessionSummarySchema = Schema.Struct({
  sessionId: Schema.String,
  score: Schema.Number,
  scoreReasons: Schema.Array(Schema.String),
  startedAt: Schema.optional(Schema.String),
  completedAt: Schema.optional(Schema.String),
  wallTimeMs: Schema.optional(Schema.Number),
  commandEvents: Schema.Number,
  uniqueCommandFamilies: Schema.Number,
  repeatedCommandFamilies: Schema.Number,
  repeatedCommandInvocations: Schema.Number,
  exitCodeEvents: Schema.Number,
  failedCommands: Schema.Number,
  successfulCommands: Schema.Number,
  commandSuccessRate: Schema.optional(Schema.Number),
  expensiveChecks: Schema.Number,
  workspacePolicyFastCount: Schema.Number,
  timeToFirstUsefulDiagnosticMs: Schema.optional(Schema.Number),
  durationMs: MeasurementNumericSummarySchema,
  tokenTotal: Schema.Number,
  toolCalls: Schema.Number,
  modelIds: Schema.Array(MeasurementCountRecordSchema),
  commandFamilies: Schema.Array(MeasurementCountRecordSchema),
  exitCodes: Schema.Array(MeasurementCountRecordSchema),
  matchedSignals: Schema.Array(Schema.String),
  hasAttuneTrellisSignal: Schema.Boolean,
  hasEnoughSamples: Schema.Boolean,
  giantCatchallPenalty: Schema.Boolean,
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementHistoricalSessionSummary =
  typeof MeasurementHistoricalSessionSummarySchema.Type

export const MeasurementBaselineSessionSelectionPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  measurementSessionId: Schema.String,
  selectedAt: Schema.String,
  selectedSessionId: Schema.String,
  score: Schema.Number,
  scoreReasons: Schema.Array(Schema.String),
  candidateCount: Schema.Number,
  selectionMethod: Schema.String,
  selectedSession: MeasurementHistoricalSessionSummarySchema,
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementBaselineSessionSelectionPayload =
  typeof MeasurementBaselineSessionSelectionPayloadSchema.Type

export const MeasurementTraceInventorySummaryPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  measurementSessionId: Schema.String,
  scannedAt: Schema.String,
  codexHome: Schema.String,
  traceFiles: Schema.Number,
  sqliteFiles: Schema.Number,
  jsonlFiles: Schema.Number,
  skippedFiles: Schema.Number,
  sqliteSchemaFilesInspected: Schema.Number,
  sqliteSchemaFilesSkipped: Schema.Number,
  sqliteSchemas: Schema.Array(MeasurementSqliteSchemaSummarySchema),
  commandEventCount: Schema.optional(Schema.Number),
  uniqueCommandFamilies: Schema.optional(Schema.Number),
  repeatedCommandFamilyCount: Schema.optional(Schema.Number),
  repeatedCommandInvocationCount: Schema.optional(Schema.Number),
  exitCodeEventCount: Schema.optional(Schema.Number),
  failedExitCodeCount: Schema.optional(Schema.Number),
  timestampRange: Schema.optional(MeasurementTimestampRangeSchema),
  durationMs: Schema.optional(MeasurementNumericSummarySchema),
  commandFamilies: Schema.Array(MeasurementCountRecordSchema),
  repeatedCommandPatterns: Schema.Array(MeasurementCountRecordSchema),
  exitCodes: Schema.Array(MeasurementCountRecordSchema),
  comparableSessionCandidates: Schema.optional(Schema.Array(MeasurementHistoricalSessionSummarySchema)),
  selectedBaselineSession: Schema.optional(MeasurementHistoricalSessionSummarySchema),
  toolCalls: Schema.Number,
  tokenTotal: Schema.Number,
  modelIds: Schema.Array(MeasurementCountRecordSchema),
  sessionIds: Schema.Array(MeasurementCountRecordSchema),
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementTraceInventorySummaryPayload =
  typeof MeasurementTraceInventorySummaryPayloadSchema.Type

export const MeasurementAgentMetricsPhaseSchema = Schema.Literals([
  "baseline",
  "treatment",
  "session",
] as const)
export type MeasurementAgentMetricsPhase =
  typeof MeasurementAgentMetricsPhaseSchema.Type

export const MeasurementAgentMetricsSummaryPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  measurementSessionId: Schema.String,
  measurementPhase: MeasurementAgentMetricsPhaseSchema,
  capturedAt: Schema.String,
  source: Schema.String,
  tokenTotal: Schema.Number,
  toolCalls: Schema.Number,
  sampleCount: Schema.Number,
  traceFilesScanned: Schema.Number,
  windowCount: Schema.Number,
  startedAt: Schema.optional(Schema.String),
  completedAt: Schema.optional(Schema.String),
  tokenMetricSource: Schema.String,
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementAgentMetricsSummaryPayload =
  typeof MeasurementAgentMetricsSummaryPayloadSchema.Type

export const MeasurementRecipeSpineCoveragePayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  measurementSessionId: Schema.String,
  capturedAt: Schema.String,
  recipeCount: Schema.Number,
  edgeCount: Schema.Number,
  ioCount: Schema.Number,
  runCount: Schema.Number,
  receiptCount: Schema.Number,
  observationCount: Schema.Number,
  diagnosticCount: Schema.Number,
  repairCount: Schema.Number,
  healthCount: Schema.Number,
  frameworkSchemasPreserved: Schema.Boolean,
  observationStore: Schema.Literal("framework_event.recipe_observation"),
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementRecipeSpineCoveragePayload =
  typeof MeasurementRecipeSpineCoveragePayloadSchema.Type

export const MeasurementEditAttemptSummaryPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  measurementSessionId: Schema.String,
  capturedAt: Schema.String,
  dirtyPathCount: Schema.Number,
  sourceEditCount: Schema.Number,
  reportExportEditCount: Schema.Number,
  generatedPrivateLedgerEditAttempts: Schema.Number,
  generatedPrivateLedgerPathClasses: Schema.Array(Schema.String),
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementEditAttemptSummaryPayload =
  typeof MeasurementEditAttemptSummaryPayloadSchema.Type

export const MeasurementLegacySubstrateAuditPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  measurementSessionId: Schema.String,
  capturedAt: Schema.String,
  scannedPathCount: Schema.Number,
  historicalReferenceCount: Schema.Number,
  enforcementReferenceCount: Schema.Number,
  testFixtureReferenceCount: Schema.Number,
  measurementInventoryReferenceCount: Schema.Number,
  blockingLiveReferenceCount: Schema.Number,
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementLegacySubstrateAuditPayload =
  typeof MeasurementLegacySubstrateAuditPayloadSchema.Type

export const MeasurementMigrationReadinessGateStatusSchema = Schema.Literals([
  "pass",
  "blocked",
  "not-measured",
  "warning",
] as const)
export type MeasurementMigrationReadinessGateStatus =
  typeof MeasurementMigrationReadinessGateStatusSchema.Type

export const MeasurementMigrationReadinessGateSchema = Schema.Struct({
  gate: Schema.String,
  status: MeasurementMigrationReadinessGateStatusSchema,
  evidence: Schema.String,
  followUp: Schema.optional(Schema.String),
})
export type MeasurementMigrationReadinessGate =
  typeof MeasurementMigrationReadinessGateSchema.Type

export const MeasurementMigrationReadinessSummaryPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  measurementSessionId: Schema.String,
  summarizedAt: Schema.String,
  proceedToRecipeOnlyMigration: Schema.Literal(false),
  gates: Schema.Array(MeasurementMigrationReadinessGateSchema),
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementMigrationReadinessSummaryPayload =
  typeof MeasurementMigrationReadinessSummaryPayloadSchema.Type

export const MeasurementExperimentRunMetricsSchema = Schema.Struct({
  mode: Schema.Literals(["baseline", "treatment"] as const),
  startedAt: Schema.optional(Schema.String),
  completedAt: Schema.optional(Schema.String),
  wallTimeMs: Schema.optional(Schema.Number),
  fileReads: Schema.Number,
  shellCommands: Schema.Number,
  repeatedCommands: Schema.Number,
  failedCommands: Schema.Number,
  expensiveChecks: Schema.Number,
  workspacePolicyFastCount: Schema.optional(Schema.Number),
  timeToUsefulDiagnosticMs: Schema.optional(Schema.Number),
  rawContextBytes: Schema.optional(Schema.Number),
  tokenTotal: Schema.optional(Schema.Number),
  toolCalls: Schema.optional(Schema.Number),
  tokenMetricSource: Schema.optional(Schema.String),
  agentMetricSampleCount: Schema.optional(Schema.Number),
  agentMetricTraceFilesScanned: Schema.optional(Schema.Number),
  agentMetricWindowCount: Schema.optional(Schema.Number),
  successfulCommands: Schema.optional(Schema.Number),
  knownExitCodeCommands: Schema.optional(Schema.Number),
  commandSuccessRate: Schema.optional(Schema.Number),
  commandFailureRate: Schema.optional(Schema.Number),
  durationSampleCount: Schema.optional(Schema.Number),
  durationTotalMs: Schema.optional(Schema.Number),
  durationAverageMs: Schema.optional(Schema.Number),
  durationMinMs: Schema.optional(Schema.Number),
  durationMaxMs: Schema.optional(Schema.Number),
  durationP50Ms: Schema.optional(Schema.Number),
  durationP95Ms: Schema.optional(Schema.Number),
  cheapCommands: Schema.optional(Schema.Number),
  mediumCommands: Schema.optional(Schema.Number),
  finalGateCommands: Schema.optional(Schema.Number),
  workspaceWideCommands: Schema.optional(Schema.Number),
  unknownTargetCommands: Schema.optional(Schema.Number),
  unknownRecipeCommands: Schema.optional(Schema.Number),
  storeEmittedCommands: Schema.optional(Schema.Number),
  uniqueTargets: Schema.optional(Schema.Number),
  uniqueRecipes: Schema.optional(Schema.Number),
  trellisDiagnosticObservations: Schema.optional(Schema.Number),
  observationInputCount: Schema.optional(Schema.Number),
  traceFiles: Schema.optional(Schema.Number),
  jsonlFiles: Schema.optional(Schema.Number),
  sqliteFiles: Schema.optional(Schema.Number),
  sqliteSchemaTables: Schema.optional(Schema.Number),
  uniqueModels: Schema.optional(Schema.Number),
  uniqueSessions: Schema.optional(Schema.Number),
  uniqueCommandFamilies: Schema.optional(Schema.Number),
  repeatedCommandFamilies: Schema.optional(Schema.Number),
  topCommandFamily: Schema.optional(Schema.String),
  topExitCode: Schema.optional(Schema.String),
  firstObservedAt: Schema.optional(Schema.String),
  lastObservedAt: Schema.optional(Schema.String),
  observedCommandSpanMs: Schema.optional(Schema.Number),
  findingQuality: Schema.optional(Schema.String),
})
export type MeasurementExperimentRunMetrics =
  typeof MeasurementExperimentRunMetricsSchema.Type

export const MeasurementFindingQualityRowSchema = Schema.Struct({
  finding: Schema.String,
  baseline: Schema.Literals(["hit", "partial", "miss", "not-measured"] as const),
  treatment: Schema.Literals(["hit", "partial", "miss", "not-measured"] as const),
  evidence: Schema.String,
})
export type MeasurementFindingQualityRow =
  typeof MeasurementFindingQualityRowSchema.Type

export const MeasurementMicroExperimentSummaryPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  measurementSessionId: Schema.String,
  summarizedAt: Schema.String,
  task: Schema.String,
  baseline: Schema.optional(MeasurementExperimentRunMetricsSchema),
  selectedBaselineSession: Schema.optional(MeasurementHistoricalSessionSummarySchema),
  selectedBaseline: Schema.optional(MeasurementExperimentRunMetricsSchema),
  treatment: Schema.optional(MeasurementExperimentRunMetricsSchema),
  comparison: Schema.optional(Schema.Struct({
    shellCommandDelta: Schema.optional(Schema.Number),
    repeatedCommandDelta: Schema.optional(Schema.Number),
    failedCommandDelta: Schema.optional(Schema.Number),
    expensiveCheckDelta: Schema.optional(Schema.Number),
    timeToUsefulDiagnosticDeltaMs: Schema.optional(Schema.Number),
    rawContextByteDelta: Schema.optional(Schema.Number),
    wallTimeDeltaMs: Schema.optional(Schema.Number),
    successfulCommandDelta: Schema.optional(Schema.Number),
    commandSuccessRateDelta: Schema.optional(Schema.Number),
    durationAverageDeltaMs: Schema.optional(Schema.Number),
    tokenDelta: Schema.optional(Schema.Number),
    toolCallDelta: Schema.optional(Schema.Number),
    uniqueTargetDelta: Schema.optional(Schema.Number),
    uniqueRecipeDelta: Schema.optional(Schema.Number),
    findingQualitySummary: Schema.optional(Schema.String),
  })),
  selectedBaselineComparison: Schema.optional(Schema.Struct({
    shellCommandDelta: Schema.optional(Schema.Number),
    repeatedCommandDelta: Schema.optional(Schema.Number),
    failedCommandDelta: Schema.optional(Schema.Number),
    expensiveCheckDelta: Schema.optional(Schema.Number),
    timeToUsefulDiagnosticDeltaMs: Schema.optional(Schema.Number),
    rawContextByteDelta: Schema.optional(Schema.Number),
    wallTimeDeltaMs: Schema.optional(Schema.Number),
    successfulCommandDelta: Schema.optional(Schema.Number),
    commandSuccessRateDelta: Schema.optional(Schema.Number),
    durationAverageDeltaMs: Schema.optional(Schema.Number),
    tokenDelta: Schema.optional(Schema.Number),
    toolCallDelta: Schema.optional(Schema.Number),
    uniqueTargetDelta: Schema.optional(Schema.Number),
    uniqueRecipeDelta: Schema.optional(Schema.Number),
    findingQualitySummary: Schema.optional(Schema.String),
  })),
  findingQualityMatrix: Schema.optional(Schema.Array(MeasurementFindingQualityRowSchema)),
  recommendation: Schema.optional(Schema.Struct({
    proceedToRecipeOnlyMigration: Schema.Boolean,
    summary: Schema.String,
    evidenceGaps: Schema.Array(Schema.String),
  })),
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementMicroExperimentSummaryPayload =
  typeof MeasurementMicroExperimentSummaryPayloadSchema.Type

export const MeasurementLifecycleHealthPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  measurementSessionId: Schema.optional(Schema.String),
  checkedAt: Schema.optional(Schema.String),
  source: Schema.optional(Schema.String),
  lifecycleOwner: Schema.optional(Schema.Literal("framework-runtime")),
  service: Schema.Struct({
    dataDir: Schema.String,
    databaseUrl: Schema.String,
    port: Schema.Number,
    storeMode: Schema.optional(Schema.String),
    ready: Schema.Boolean,
    readinessCheck: Schema.optional(Schema.String),
    integrationGuard: Schema.optional(Schema.String),
  }),
  migration: Schema.Struct({
    path: Schema.optional(Schema.String),
    applied: Schema.Boolean,
  }),
  schemaState: Schema.optional(Schema.Struct({
    frameworkCore: Schema.Boolean,
    frameworkEvent: Schema.Boolean,
    frameworkView: Schema.Boolean,
  })),
  sqlValidation: Schema.optional(Schema.Struct({
    valid: Schema.Boolean,
    statementCount: Schema.optional(Schema.Number),
    failureSummary: Schema.optional(Schema.String),
  })),
  lastLifecycleAction: Schema.optional(Schema.String),
  failureSummary: Schema.optional(Schema.String),
})
export type MeasurementLifecycleHealthPayload =
  typeof MeasurementLifecycleHealthPayloadSchema.Type

export const MeasurementReportProjectionPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  reportPath: Schema.String,
  measurementSessionId: Schema.String,
  inputObservationIds: Schema.Array(Schema.String),
  projectedAt: Schema.optional(Schema.String),
  generatedAt: Schema.optional(Schema.String),
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementReportProjectionPayload =
  typeof MeasurementReportProjectionPayloadSchema.Type

export const defaultLocalRecipeStoreUrl =
  "postgresql://attune@127.0.0.1:54329/postgres" as const

export const defaultLocalRecipeStoreDataDir =
  ".attune/state/local-timescaledb" as const

export interface MeasurementObservationInput {
  readonly observationId?: string
  readonly kind: MeasurementObservationKind
  readonly recipeId: string
  readonly observedAt: string
  readonly payload: Record<string, unknown>
  readonly source?: string
  readonly runId?: string
  readonly receiptId?: string
  readonly measurementSessionId?: string
}

export interface MeasurementStoreConfig {
  readonly mode: MeasurementStoreMode
  readonly databaseUrl: string
  readonly dataDir: string
}

export interface MeasurementObservationSink {
  readonly config: MeasurementStoreConfig
  readonly store?: RecipeReceiptStoreApi
  readonly close: () => Promise<void>
}

export const measurementStoreConfigFromEnv = (
  env: NodeJS.ProcessEnv = process.env,
): MeasurementStoreConfig => ({
  mode: parseStoreMode(env["ATTUNE_RECIPE_STORE_MODE"]),
  databaseUrl: env["ATTUNE_RECIPE_STORE_URL"]
    ?? env["DATABASE_URL"]
    ?? defaultLocalRecipeStoreUrl,
  dataDir: env["ATTUNE_LOCAL_RECIPE_STORE_DATA_DIR"]
    ?? defaultLocalRecipeStoreDataDir,
})

export const createMeasurementObservation = (
  input: MeasurementObservationInput,
): RecipeObservation => {
  const payload = {
    ...input.payload,
    ...(input.measurementSessionId === undefined ? {} : {
      measurementSessionId: input.measurementSessionId,
    }),
  }
  return {
    observationId: input.observationId ?? recipeObservationId(
      input.recipeId,
      `${input.kind}:${input.measurementSessionId ?? "global"}`,
      input.observedAt,
    ),
    recipeId: input.recipeId,
    ...(input.runId === undefined ? {} : { runId: input.runId }),
    ...(input.receiptId === undefined ? {} : { receiptId: input.receiptId }),
    observationKind: input.kind,
    observedAt: input.observedAt,
    source: input.source ?? "framework-runtime.measurement",
    payload,
  }
}

export const createMeasurementObservationSink = async (
  config: MeasurementStoreConfig = measurementStoreConfigFromEnv(),
): Promise<MeasurementObservationSink> => {
  if (config.mode === "disabled" || config.mode === "export-only") {
    return { config, close: async () => undefined }
  }

  if (config.mode === "in-memory") {
    return {
      config,
      store: createInMemoryRecipeReceiptStore(),
      close: async () => undefined,
    }
  }

  const client = createPgPostgresQueryClient(config.databaseUrl)
  return {
    config,
    store: createPostgresRecipeReceiptStore(client),
    close: () => client.close(),
  }
}

export const recordMeasurementObservation = (
  sink: MeasurementObservationSink,
  observation: RecipeObservation,
): Effect.Effect<RecipeObservation> => {
  if (sink.store === undefined) return Effect.succeed(observation)
  return sink.store.recordObservation(observation).pipe(Effect.as(observation))
}

export const measurementObservationsBySession = (
  store: RecipeReceiptStoreApi,
  measurementSessionId: string,
): Effect.Effect<readonly RecipeObservation[]> =>
  store.snapshot().pipe(
    Effect.map((snapshot) =>
      snapshot.observations
        .filter((observation) =>
          payloadString(observation.payload, "measurementSessionId") === measurementSessionId
        )
        .sort(observedAtAscending),
    ),
  )

export const measurementCommandObservationsByNxTarget = (
  store: RecipeReceiptStoreApi,
  target: string,
): Effect.Effect<readonly RecipeObservation[]> =>
  store.observationsByKind("measurement.command.observed").pipe(
    Effect.map((observations) =>
      observations.filter((observation) =>
        payloadString(observation.payload, "knownNxTarget") === target
      ),
    ),
  )

const parseStoreMode = (value: string | undefined): MeasurementStoreMode => {
  if (
    value === "local-postgres"
    || value === "in-memory"
    || value === "disabled"
    || value === "export-only"
  ) return value
  return "local-postgres"
}

interface PgPoolLike {
  readonly query: (
    sql: string,
    parameters?: readonly unknown[],
  ) => Promise<PostgresQueryResult<Record<string, unknown>>>
  readonly end: () => Promise<void>
}

const createPgPostgresQueryClient = (
  databaseUrl: string,
): PostgresQueryClient & { readonly close: () => Promise<void> } => {
  const require = createRequire(import.meta.url)
  const pg = require("pg") as {
    readonly Pool: new (options: { readonly connectionString: string }) => PgPoolLike
  }
  const pool = new pg.Pool({ connectionString: databaseUrl })
  return {
    query: async <Row extends Record<string, unknown> = Record<string, unknown>>(
      sql: string,
      parameters: readonly unknown[] = [],
    ): Promise<PostgresQueryResult<Row>> => {
      const result = await pool.query(sql, parameters)
      return result as PostgresQueryResult<Row>
    },
    close: () => pool.end(),
  }
}

const payloadString = (
  payload: unknown,
  key: string,
): string | undefined => {
  if (payload === null || typeof payload !== "object") return undefined
  const value = (payload as Record<string, unknown>)[key]
  return typeof value === "string" ? value : undefined
}

const observedAtAscending = (
  left: RecipeObservation,
  right: RecipeObservation,
): number =>
  left.observedAt.localeCompare(right.observedAt)
  || left.observationId.localeCompare(right.observationId)
