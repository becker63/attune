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
  "measurement.benchmark.run.started",
  "measurement.benchmark.run.completed",
  "measurement.benchmark.arm.started",
  "measurement.benchmark.arm.completed",
  "measurement.benchmark.plan.summary",
  "measurement.benchmark.final-judge.summary",
  "measurement.codex.thread.summary",
  "measurement.codex.cluster.summary",
  "measurement.agent.tool-usage.summary",
  "measurement.benchmark.target-packet.summary",
  "measurement.benchmark.scorecard.summary",
  "measurement.benchmark.loop.registered",
  "measurement.benchmark.loop.started",
  "measurement.benchmark.loop.completed",
  "measurement.benchmark.holdout.commitment",
  "measurement.benchmark.holdout.evaluation",
  "measurement.benchmark.negative-control.summary",
  "measurement.benchmark.cost-ledger.summary",
  "measurement.benchmark.audit.summary",
  "measurement.benchmark.target-status.summary",
  "measurement.benchmark.report.projected",
  "measurement.benchmark.packet-queue.selected",
  "measurement.benchmark.packet.started",
  "measurement.benchmark.packet.completed",
  "measurement.benchmark.packet.fix-preview",
  "measurement.benchmark.packet.apply-result",
  "measurement.benchmark.packet.validation-result",
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

export const MeasurementBenchmarkArmSchema = Schema.Literals([
  "control",
  "treatment",
  "opencode-trellis",
  "codex-trellis",
  "opencode-blind",
  "codex-blind",
  "opencode-effect-packets",
  "codex-effect-packets",
  "opencode-raw-effect",
  "codex-raw-effect",
] as const)
export type MeasurementBenchmarkArm =
  typeof MeasurementBenchmarkArmSchema.Type

export const MeasurementBenchmarkAgentRuntimeSchema = Schema.Literals([
  "opencode",
  "codex",
] as const)
export type MeasurementBenchmarkAgentRuntime =
  typeof MeasurementBenchmarkAgentRuntimeSchema.Type

export const MeasurementBenchmarkTrellisExposureSchema = Schema.Literals([
  "visible",
  "blind",
  "packetized",
  "raw-effect",
] as const)
export type MeasurementBenchmarkTrellisExposure =
  typeof MeasurementBenchmarkTrellisExposureSchema.Type

export const MeasurementBenchmarkModeSchema = Schema.Literals([
  "live",
  "dry-run",
  "export-only",
] as const)
export type MeasurementBenchmarkMode =
  typeof MeasurementBenchmarkModeSchema.Type

export const MeasurementBenchmarkStatusSchema = Schema.Literals([
  "planned",
  "running",
  "completed",
  "failed",
  "blocked",
  "skipped",
] as const)
export type MeasurementBenchmarkStatus =
  typeof MeasurementBenchmarkStatusSchema.Type

export const MeasurementBenchmarkBudgetSchema = Schema.Struct({
  maxWallTimeMs: Schema.optional(Schema.Number),
  maxTokens: Schema.optional(Schema.Number),
  maxToolCalls: Schema.optional(Schema.Number),
})
export type MeasurementBenchmarkBudget =
  typeof MeasurementBenchmarkBudgetSchema.Type

export const MeasurementBenchmarkBudgetUsageSchema = Schema.Struct({
  wallTimeMs: Schema.optional(Schema.Number),
  tokenTotal: Schema.optional(Schema.Number),
  toolCalls: Schema.optional(Schema.Number),
  validationCommands: Schema.optional(Schema.Number),
})
export type MeasurementBenchmarkBudgetUsage =
  typeof MeasurementBenchmarkBudgetUsageSchema.Type

export const MeasurementBenchmarkPatchSummarySchema = Schema.Struct({
  applyPatchCalls: Schema.Number,
  changedFiles: Schema.Number,
  addedFiles: Schema.optional(Schema.Number),
  modifiedFiles: Schema.optional(Schema.Number),
  deletedFiles: Schema.optional(Schema.Number),
  rawDiffStored: Schema.Literal(false),
  patchTextStored: Schema.Literal(false),
})
export type MeasurementBenchmarkPatchSummary =
  typeof MeasurementBenchmarkPatchSummarySchema.Type

export const MeasurementEffectPacketRiskSchema = Schema.Literals([
  "safe",
  "focused",
  "review-required",
  "inventory-only",
] as const)
export type MeasurementEffectPacketRisk =
  typeof MeasurementEffectPacketRiskSchema.Type

export const MeasurementEffectPacketStatusSchema = Schema.Literals([
  "selected",
  "running",
  "cleared",
  "partially-cleared",
  "blocked",
  "stale",
  "refused",
  "failed-validation",
  "not-measured",
] as const)
export type MeasurementEffectPacketStatus =
  typeof MeasurementEffectPacketStatusSchema.Type

export const MeasurementEffectPacketValidationStepSchema = Schema.Struct({
  tier: Schema.Literals(["cheap", "focused", "medium", "final"] as const),
  command: Schema.String,
  targetId: Schema.optional(Schema.String),
  required: Schema.Boolean,
  status: Schema.optional(Schema.Literals([
    "pending",
    "passed",
    "failed",
    "skipped",
    "not-measured",
  ] as const)),
})
export type MeasurementEffectPacketValidationStep =
  typeof MeasurementEffectPacketValidationStepSchema.Type

export const MeasurementEffectPacketRankingInputSchema = Schema.Struct({
  diagnosticCount: Schema.Number,
  safeFixCount: Schema.Number,
  affectedFileCount: Schema.Number,
  affectedPackageCount: Schema.Number,
  validationCost: Schema.Number,
  riskScore: Schema.Number,
  objectiveBoost: Schema.Number,
})
export type MeasurementEffectPacketRankingInput =
  typeof MeasurementEffectPacketRankingInputSchema.Type

export const MeasurementEffectPacketContextBundleSchema = Schema.Struct({
  summary: Schema.String,
  representativeFiles: Schema.Array(Schema.String),
  representativeCodes: Schema.Array(Schema.String),
  rawSourceStored: Schema.Literal(false),
  rawOutputStored: Schema.Literal(false),
  rawDiagnosticTextStored: Schema.Literal(false),
})
export type MeasurementEffectPacketContextBundle =
  typeof MeasurementEffectPacketContextBundleSchema.Type

export const MeasurementEffectDiagnosticPacketSchema = Schema.Struct({
  packetId: Schema.String,
  profile: Schema.String,
  ruleName: Schema.String,
  source: Schema.Literal("effect"),
  diagnosticCount: Schema.Number,
  safeFixCount: Schema.Number,
  reviewRequiredFixCount: Schema.Number,
  affectedFileCount: Schema.Number,
  affectedPackageCount: Schema.Number,
  risk: MeasurementEffectPacketRiskSchema,
  rank: Schema.Number,
  rankingInputs: MeasurementEffectPacketRankingInputSchema,
  validationLadder: Schema.Array(MeasurementEffectPacketValidationStepSchema),
  context: MeasurementEffectPacketContextBundleSchema,
})
export type MeasurementEffectDiagnosticPacket =
  typeof MeasurementEffectDiagnosticPacketSchema.Type

export const MeasurementBenchmarkPacketQueuePayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  benchmarkRunId: Schema.String,
  measurementSessionId: Schema.String,
  selectedAt: Schema.String,
  evaluatorId: Schema.String,
  profile: Schema.String,
  selectionStrategy: Schema.String,
  packetCount: Schema.Number,
  diagnosticCount: Schema.Number,
  safeFixCount: Schema.Number,
  ruleCounts: Schema.Array(MeasurementCountRecordSchema),
  fixabilityCounts: Schema.Array(MeasurementCountRecordSchema),
  riskCounts: Schema.Array(MeasurementCountRecordSchema),
  packets: Schema.Array(MeasurementEffectDiagnosticPacketSchema),
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementBenchmarkPacketQueuePayload =
  typeof MeasurementBenchmarkPacketQueuePayloadSchema.Type

export const MeasurementBenchmarkPacketLifecyclePayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  benchmarkRunId: Schema.String,
  measurementSessionId: Schema.String,
  arm: MeasurementBenchmarkArmSchema,
  armId: Schema.String,
  packetId: Schema.String,
  ruleName: Schema.String,
  profile: Schema.String,
  status: MeasurementEffectPacketStatusSchema,
  startedAt: Schema.optional(Schema.String),
  completedAt: Schema.optional(Schema.String),
  stopReason: Schema.optional(Schema.String),
  diagnosticCountBefore: Schema.optional(Schema.Number),
  diagnosticCountAfter: Schema.optional(Schema.Number),
  validatedClearedCount: Schema.optional(Schema.Number),
  remainingCount: Schema.optional(Schema.Number),
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementBenchmarkPacketLifecyclePayload =
  typeof MeasurementBenchmarkPacketLifecyclePayloadSchema.Type

export const MeasurementBenchmarkPacketFixPreviewPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  benchmarkRunId: Schema.String,
  measurementSessionId: Schema.String,
  arm: MeasurementBenchmarkArmSchema,
  armId: Schema.String,
  packetId: Schema.String,
  ruleName: Schema.String,
  profile: Schema.String,
  previewedAt: Schema.String,
  fixCount: Schema.Number,
  safeFixCount: Schema.Number,
  reviewRequiredFixCount: Schema.Number,
  affectedFileCount: Schema.Number,
  rawDiffStored: Schema.Literal(false),
  patchTextStored: Schema.Literal(false),
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementBenchmarkPacketFixPreviewPayload =
  typeof MeasurementBenchmarkPacketFixPreviewPayloadSchema.Type

export const MeasurementBenchmarkPacketApplyPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  benchmarkRunId: Schema.String,
  measurementSessionId: Schema.String,
  arm: MeasurementBenchmarkArmSchema,
  armId: Schema.String,
  packetId: Schema.String,
  ruleName: Schema.String,
  profile: Schema.String,
  appliedAt: Schema.String,
  mode: Schema.Literals(["diff", "write"] as const),
  applied: Schema.Boolean,
  refused: Schema.Boolean,
  stale: Schema.Boolean,
  fixCount: Schema.Number,
  safeFixCount: Schema.Number,
  affectedFileCount: Schema.Number,
  refusalCode: Schema.optional(Schema.String),
  rawDiffStored: Schema.Literal(false),
  patchTextStored: Schema.Literal(false),
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementBenchmarkPacketApplyPayload =
  typeof MeasurementBenchmarkPacketApplyPayloadSchema.Type

export const MeasurementBenchmarkPacketValidationPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  benchmarkRunId: Schema.String,
  measurementSessionId: Schema.String,
  arm: MeasurementBenchmarkArmSchema,
  armId: Schema.String,
  packetId: Schema.String,
  ruleName: Schema.String,
  profile: Schema.String,
  validatedAt: Schema.String,
  status: MeasurementEffectPacketStatusSchema,
  validationLadder: Schema.Array(MeasurementEffectPacketValidationStepSchema),
  diagnosticCountBefore: Schema.Number,
  diagnosticCountAfter: Schema.Number,
  validatedClearedCount: Schema.Number,
  remainingCount: Schema.Number,
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementBenchmarkPacketValidationPayload =
  typeof MeasurementBenchmarkPacketValidationPayloadSchema.Type

export const MeasurementBenchmarkWorktreeIdentitySchema = Schema.Struct({
  arm: MeasurementBenchmarkArmSchema,
  armId: Schema.String,
  path: Schema.String,
  branch: Schema.optional(Schema.String),
  baseCommit: Schema.String,
  startingHead: Schema.optional(Schema.String),
  endingHead: Schema.optional(Schema.String),
  sourceStateFingerprint: Schema.optional(Schema.String),
  worktreeFingerprint: Schema.optional(Schema.String),
  dependencyLockHash: Schema.optional(Schema.String),
  packetInventoryHash: Schema.optional(Schema.String),
  allowedSourceScopeHash: Schema.optional(Schema.String),
  pairedStateStatus: Schema.optional(Schema.Literals(["passed", "failed", "not-measured"] as const)),
  pairedStateBlockers: Schema.optional(Schema.Array(Schema.String)),
})
export type MeasurementBenchmarkWorktreeIdentity =
  typeof MeasurementBenchmarkWorktreeIdentitySchema.Type

export const MeasurementBenchmarkRunLifecyclePayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  benchmarkRunId: Schema.String,
  measurementSessionId: Schema.optional(Schema.String),
  mode: MeasurementBenchmarkModeSchema,
  action: Schema.Literals(["planned", "started", "completed", "status"] as const),
  status: MeasurementBenchmarkStatusSchema,
  baseCommit: Schema.String,
  baseBranch: Schema.optional(Schema.String),
  dirtyFileCount: Schema.Number,
  worktreeRoot: Schema.String,
  reportsDir: Schema.String,
  cleanupPolicy: Schema.Literals(["retain", "remove-on-success", "manual-review"] as const),
  startedAt: Schema.optional(Schema.String),
  completedAt: Schema.optional(Schema.String),
  stopReason: Schema.optional(Schema.String),
  budget: Schema.optional(MeasurementBenchmarkBudgetSchema),
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementBenchmarkRunLifecyclePayload =
  typeof MeasurementBenchmarkRunLifecyclePayloadSchema.Type

export const MeasurementBenchmarkArmLifecyclePayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  benchmarkRunId: Schema.String,
  measurementSessionId: Schema.String,
  arm: MeasurementBenchmarkArmSchema,
  armId: Schema.String,
  mode: MeasurementBenchmarkModeSchema,
  status: MeasurementBenchmarkStatusSchema,
  worktree: MeasurementBenchmarkWorktreeIdentitySchema,
  startedAt: Schema.optional(Schema.String),
  completedAt: Schema.optional(Schema.String),
  stopReason: Schema.optional(Schema.String),
  codexThreadId: Schema.optional(Schema.String),
  promptFile: Schema.optional(Schema.String),
  rolloutFile: Schema.optional(Schema.String),
  agentRuntime: Schema.optional(MeasurementBenchmarkAgentRuntimeSchema),
  trellisExposure: Schema.Boolean,
  trellisExposureMode: Schema.optional(MeasurementBenchmarkTrellisExposureSchema),
  forbiddenCommandFamilies: Schema.Array(Schema.String),
  budgetUsage: Schema.optional(MeasurementBenchmarkBudgetUsageSchema),
  worktreePatchSummary: Schema.optional(MeasurementBenchmarkPatchSummarySchema),
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementBenchmarkArmLifecyclePayload =
  typeof MeasurementBenchmarkArmLifecyclePayloadSchema.Type

export const MeasurementBenchmarkPlanQualityRowSchema = Schema.Struct({
  criterion: Schema.String,
  score: Schema.Number,
  maxScore: Schema.Number,
  evidence: Schema.String,
})
export type MeasurementBenchmarkPlanQualityRow =
  typeof MeasurementBenchmarkPlanQualityRowSchema.Type

export const MeasurementBenchmarkPlanSummaryPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  benchmarkRunId: Schema.String,
  measurementSessionId: Schema.String,
  arm: MeasurementBenchmarkArmSchema,
  armId: Schema.String,
  agentRuntime: Schema.optional(MeasurementBenchmarkAgentRuntimeSchema),
  trellisExposureMode: Schema.optional(MeasurementBenchmarkTrellisExposureSchema),
  capturedAt: Schema.String,
  planFile: Schema.optional(Schema.String),
  score: Schema.Number,
  maxScore: Schema.Number,
  criteria: Schema.Array(MeasurementBenchmarkPlanQualityRowSchema),
  highLevelSummary: Schema.String,
  rawPlanStored: Schema.Literal(false),
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementBenchmarkPlanSummaryPayload =
  typeof MeasurementBenchmarkPlanSummaryPayloadSchema.Type

export const MeasurementBenchmarkDiagnosticCodeCountSchema = Schema.Struct({
  code: Schema.String,
  count: Schema.Number,
})
export type MeasurementBenchmarkDiagnosticCodeCount =
  typeof MeasurementBenchmarkDiagnosticCodeCountSchema.Type

export const MeasurementBenchmarkFinalJudgePayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  benchmarkRunId: Schema.String,
  measurementSessionId: Schema.String,
  arm: MeasurementBenchmarkArmSchema,
  armId: Schema.String,
  agentRuntime: Schema.optional(MeasurementBenchmarkAgentRuntimeSchema),
  trellisExposureMode: Schema.optional(MeasurementBenchmarkTrellisExposureSchema),
  judgedAt: Schema.String,
  command: Schema.String,
  argv: Schema.Array(Schema.String),
  cwd: Schema.String,
  durationMs: Schema.Number,
  exitCode: Schema.Number,
  status: MeasurementBenchmarkStatusSchema,
  baseDiagnosticCount: Schema.optional(Schema.Number),
  finalDiagnosticCount: Schema.Number,
  diagnosticDelta: Schema.optional(Schema.Number),
  diagnosticsByCode: Schema.Array(MeasurementBenchmarkDiagnosticCodeCountSchema),
  diagnosticsBySource: Schema.Array(MeasurementCountRecordSchema),
  clearedDiagnosticCount: Schema.optional(Schema.Number),
  remainingDiagnosticCount: Schema.optional(Schema.Number),
  outputStored: Schema.Literal(false),
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementBenchmarkFinalJudgePayload =
  typeof MeasurementBenchmarkFinalJudgePayloadSchema.Type

export const MeasurementCodexPatchSummarySchema = MeasurementBenchmarkPatchSummarySchema
export type MeasurementCodexPatchSummary =
  typeof MeasurementCodexPatchSummarySchema.Type

export const MeasurementCodexToolTaxonomyRowSchema = Schema.Struct({
  family: Schema.String,
  calls: Schema.Number,
  failedCalls: Schema.optional(Schema.Number),
  durationMs: Schema.optional(MeasurementNumericSummarySchema),
})
export type MeasurementCodexToolTaxonomyRow =
  typeof MeasurementCodexToolTaxonomyRowSchema.Type

export const MeasurementCodexThreadTelemetryPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  benchmarkRunId: Schema.String,
  measurementSessionId: Schema.String,
  arm: MeasurementBenchmarkArmSchema,
  armId: Schema.String,
  agentRuntime: Schema.optional(MeasurementBenchmarkAgentRuntimeSchema),
  trellisExposureMode: Schema.optional(MeasurementBenchmarkTrellisExposureSchema),
  threadId: Schema.String,
  parentThreadId: Schema.optional(Schema.String),
  role: Schema.Literals(["primary", "subagent", "connected-thread"] as const),
  capturedAt: Schema.String,
  startedAt: Schema.optional(Schema.String),
  completedAt: Schema.optional(Schema.String),
  modelIds: Schema.Array(MeasurementCountRecordSchema),
  sessionIds: Schema.Array(MeasurementCountRecordSchema),
  tokenTotal: Schema.Number,
  inputTokens: Schema.optional(Schema.Number),
  outputTokens: Schema.optional(Schema.Number),
  cachedInputTokens: Schema.optional(Schema.Number),
  reasoningTokens: Schema.optional(Schema.Number),
  toolCalls: Schema.Number,
  commandFamilies: Schema.Array(MeasurementCountRecordSchema),
  validationCommandCount: Schema.Number,
  forbiddenTrellisCommandCount: Schema.Number,
  patchSummary: MeasurementCodexPatchSummarySchema,
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementCodexThreadTelemetryPayload =
  typeof MeasurementCodexThreadTelemetryPayloadSchema.Type

export const MeasurementCodexClusterTelemetryPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  benchmarkRunId: Schema.String,
  measurementSessionId: Schema.String,
  arm: MeasurementBenchmarkArmSchema,
  armId: Schema.String,
  agentRuntime: Schema.optional(MeasurementBenchmarkAgentRuntimeSchema),
  trellisExposureMode: Schema.optional(MeasurementBenchmarkTrellisExposureSchema),
  rootThreadId: Schema.String,
  capturedAt: Schema.String,
  threadCount: Schema.Number,
  descendantCount: Schema.Number,
  maxDepth: Schema.Number,
  primaryThreadTokenTotal: Schema.Number,
  subagentTokenTotal: Schema.Number,
  connectedClusterTokenTotal: Schema.Number,
  toolCalls: Schema.Number,
  validationCommandCount: Schema.Number,
  forbiddenTrellisCommandCount: Schema.Number,
  patchSummary: MeasurementCodexPatchSummarySchema,
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementCodexClusterTelemetryPayload =
  typeof MeasurementCodexClusterTelemetryPayloadSchema.Type

export const MeasurementAgentToolUsageSummaryPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  benchmarkRunId: Schema.String,
  measurementSessionId: Schema.String,
  arm: MeasurementBenchmarkArmSchema,
  armId: Schema.String,
  agentRuntime: Schema.optional(MeasurementBenchmarkAgentRuntimeSchema),
  trellisExposureMode: Schema.optional(MeasurementBenchmarkTrellisExposureSchema),
  capturedAt: Schema.String,
  taxonomy: Schema.Array(MeasurementCodexToolTaxonomyRowSchema),
  commandFamilies: Schema.Array(MeasurementCountRecordSchema),
  validationCommandCount: Schema.Number,
  forbiddenTrellisCommandCount: Schema.Number,
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementAgentToolUsageSummaryPayload =
  typeof MeasurementAgentToolUsageSummaryPayloadSchema.Type

export const MeasurementBenchmarkLoopKindSchema = Schema.Literals([
  "quick-turn",
  "pair-turn",
  "full-ab",
  "audit",
] as const)
export type MeasurementBenchmarkLoopKind =
  typeof MeasurementBenchmarkLoopKindSchema.Type

export const MeasurementBenchmarkEvidenceTierSchema = Schema.Literals([
  "exploratory",
  "candidate",
  "promotion-eligible",
] as const)
export type MeasurementBenchmarkEvidenceTier =
  typeof MeasurementBenchmarkEvidenceTierSchema.Type

export const MeasurementBenchmarkSourceScopeMembershipSchema = Schema.Literals([
  "source-scope",
  "evaluator",
  "framework",
  "measurement",
  "report",
  "openspec",
  "generated",
  "test",
  "unknown",
] as const)
export type MeasurementBenchmarkSourceScopeMembership =
  typeof MeasurementBenchmarkSourceScopeMembershipSchema.Type

export const MeasurementBenchmarkReasoningBurdenSchema = Schema.Literals([
  "autofix-only",
  "local-rewrite",
  "contextual-effect-migration",
  "cross-file-effect-migration",
  "validation-led-repair",
] as const)
export type MeasurementBenchmarkReasoningBurden =
  typeof MeasurementBenchmarkReasoningBurdenSchema.Type

export const MeasurementBenchmarkExactTargetIdentitySchema = Schema.Struct({
  targetId: Schema.String,
  evaluatorId: Schema.String,
  profile: Schema.String,
  ruleName: Schema.String,
  diagnosticId: Schema.String,
  sourcePath: Schema.optional(Schema.String),
  stableRangeFingerprint: Schema.String,
  sourceScopeMembership: MeasurementBenchmarkSourceScopeMembershipSchema,
  sourceScopeReason: Schema.String,
  reasoningBurden: MeasurementBenchmarkReasoningBurdenSchema,
  fixIds: Schema.optional(Schema.Array(Schema.String)),
  messageHash: Schema.optional(Schema.String),
  rawSourceStored: Schema.Literal(false),
  rawDiagnosticTextStored: Schema.Literal(false),
})
export type MeasurementBenchmarkExactTargetIdentity =
  typeof MeasurementBenchmarkExactTargetIdentitySchema.Type

export const MeasurementBenchmarkTargetPacketPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  benchmarkRunId: Schema.String,
  measurementSessionId: Schema.String,
  packetId: Schema.String,
  profile: Schema.String,
  packetSelectionStrategy: Schema.String,
  sourceSnapshot: Schema.String,
  packetCount: Schema.Number,
  targetFamilies: Schema.Array(Schema.String),
  perFamilyLimit: Schema.Number,
  itemCount: Schema.Number,
  expectedItemCount: Schema.Number,
  ruleCounts: Schema.Array(MeasurementCountRecordSchema),
  fixabilityCounts: Schema.Array(MeasurementCountRecordSchema),
  riskCounts: Schema.Array(MeasurementCountRecordSchema),
  safeFixCount: Schema.Number,
  validationCommands: Schema.Array(Schema.String),
  packetCommand: Schema.optional(Schema.String),
  familyCounts: Schema.Array(MeasurementCountRecordSchema),
  items: Schema.Array(MeasurementBenchmarkExactTargetIdentitySchema),
  rawMessagesStored: Schema.Literal(false),
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementBenchmarkTargetPacketPayload =
  typeof MeasurementBenchmarkTargetPacketPayloadSchema.Type

export const MeasurementBenchmarkScorerSelfCheckSchema = Schema.Struct({
  code: Schema.String,
  status: Schema.Literals(["passed", "failed", "warning"] as const),
  detail: Schema.String,
})
export type MeasurementBenchmarkScorerSelfCheck =
  typeof MeasurementBenchmarkScorerSelfCheckSchema.Type

export const MeasurementBenchmarkPrecisionPenaltySchema = Schema.Struct({
  code: Schema.String,
  severity: Schema.Literals(["warning", "blocking"] as const),
  count: Schema.Number,
  multiplier: Schema.Number,
  detail: Schema.String,
})
export type MeasurementBenchmarkPrecisionPenalty =
  typeof MeasurementBenchmarkPrecisionPenaltySchema.Type

export const MeasurementBenchmarkAggregateStatisticsSchema = Schema.Struct({
  medianImprovementMultiple: Schema.optional(Schema.Number),
  geometricMeanImprovementMultiple: Schema.optional(Schema.Number),
  worstQuartileImprovementMultiple: Schema.optional(Schema.Number),
  packetClassCount: Schema.Number,
  diagnosticFamilyCount: Schema.Number,
})
export type MeasurementBenchmarkAggregateStatistics =
  typeof MeasurementBenchmarkAggregateStatisticsSchema.Type

export const MeasurementBenchmarkLegacyMetricCaveatSchema = Schema.Struct({
  code: Schema.String,
  arm: Schema.String,
  legacyMetric: Schema.String,
  legacyValue: Schema.Union([Schema.Number, Schema.Null]),
  correctedMetric: Schema.String,
  correctedValue: Schema.Union([Schema.Number, Schema.Null]),
  detail: Schema.String,
})
export type MeasurementBenchmarkLegacyMetricCaveat =
  typeof MeasurementBenchmarkLegacyMetricCaveatSchema.Type

export const MeasurementBenchmarkResultBreakdownSchema = Schema.Struct({
  visibleImprovementMultiple: Schema.Union([Schema.Number, Schema.Null]),
  holdoutImprovementMultiple: Schema.Union([Schema.Number, Schema.Null]),
  combinedImprovementMultiple: Schema.Union([Schema.Number, Schema.Null]),
  autofixOnlyImprovementMultiple: Schema.Union([Schema.Number, Schema.Null]),
  reasoningBearingImprovementMultiple: Schema.Union([Schema.Number, Schema.Null]),
  reasoningWeightedImprovementMultiple: Schema.Union([Schema.Number, Schema.Null]),
  precisionAdjustedReasoningBearingMultiple: Schema.Union([Schema.Number, Schema.Null]),
  medianImprovementMultiple: Schema.Union([Schema.Number, Schema.Null]),
  geometricMeanImprovementMultiple: Schema.Union([Schema.Number, Schema.Null]),
  worstQuartileImprovementMultiple: Schema.Union([Schema.Number, Schema.Null]),
})
export type MeasurementBenchmarkResultBreakdown =
  typeof MeasurementBenchmarkResultBreakdownSchema.Type

export const MeasurementBenchmarkTargetEvidenceFlagsSchema = Schema.Struct({
  preRegistered: Schema.Boolean,
  paired: Schema.Boolean,
  holdoutConfirmed: Schema.Boolean,
  negativeControlClean: Schema.Boolean,
  allInAccounted: Schema.Boolean,
  auditPromoted: Schema.Boolean,
})
export type MeasurementBenchmarkTargetEvidenceFlags =
  typeof MeasurementBenchmarkTargetEvidenceFlagsSchema.Type

export const MeasurementBenchmarkReasoningWorkEvaluationSchema = Schema.Struct({
  status: Schema.Literals(["passed", "failed", "not-measured"] as const),
  reasoningBearingPacketSet: Schema.Boolean,
  strategyLabels: Schema.Array(Schema.String),
  filesInspectedCount: Schema.Number,
  diagnosticsConsideredCount: Schema.Number,
  validationFailureCount: Schema.Number,
  repairAttempts: Schema.Number,
  acceptanceRationaleLabels: Schema.Array(Schema.String),
  refusalRationaleLabels: Schema.Array(Schema.String),
  blockers: Schema.Array(Schema.String),
})
export type MeasurementBenchmarkReasoningWorkEvaluation =
  typeof MeasurementBenchmarkReasoningWorkEvaluationSchema.Type

export const MeasurementBenchmarkRegistrationPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  benchmarkRunId: Schema.String,
  measurementSessionId: Schema.String,
  loopId: Schema.String,
  loopKind: MeasurementBenchmarkLoopKindSchema,
  evidenceTier: MeasurementBenchmarkEvidenceTierSchema,
  registeredAt: Schema.String,
  packetIds: Schema.Array(Schema.String),
  holdoutCommitments: Schema.Array(Schema.String),
  diagnosticFamilies: Schema.Array(Schema.String),
  allowedFiles: Schema.Array(Schema.String),
  excludedScopes: Schema.Array(Schema.String),
  baseline: Schema.String,
  arms: Schema.Array(Schema.String),
  budgets: Schema.Record(Schema.String, Schema.Unknown),
  validationLadder: Schema.Array(Schema.String),
  stopRules: Schema.Array(Schema.String),
  negativeControls: Schema.Array(Schema.String),
  scoringPolicy: Schema.String,
  sourceStateFingerprints: Schema.Array(Schema.String),
  allowedSourceScopeHash: Schema.optional(Schema.String),
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementBenchmarkRegistrationPayload =
  typeof MeasurementBenchmarkRegistrationPayloadSchema.Type

export const MeasurementBenchmarkLoopLifecyclePayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  benchmarkRunId: Schema.String,
  measurementSessionId: Schema.String,
  loopId: Schema.String,
  loopKind: MeasurementBenchmarkLoopKindSchema,
  evidenceTier: MeasurementBenchmarkEvidenceTierSchema,
  status: MeasurementBenchmarkStatusSchema,
  hypothesis: Schema.String,
  baseline: Schema.String,
  packetTargets: Schema.Array(Schema.String),
  arms: Schema.Array(Schema.String),
  budgets: Schema.Record(Schema.String, Schema.Unknown),
  validationDepth: Schema.String,
  promptVariant: Schema.String,
  worktreeFingerprint: Schema.String,
  sourceStateFingerprint: Schema.String,
  allowedSourceScopeHash: Schema.optional(Schema.String),
  stopReason: Schema.optional(Schema.String),
  startedAt: Schema.optional(Schema.String),
  completedAt: Schema.optional(Schema.String),
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementBenchmarkLoopLifecyclePayload =
  typeof MeasurementBenchmarkLoopLifecyclePayloadSchema.Type

export const MeasurementBenchmarkHoldoutEvaluationPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  benchmarkRunId: Schema.String,
  measurementSessionId: Schema.String,
  loopId: Schema.String,
  loopKind: MeasurementBenchmarkLoopKindSchema,
  evaluatedAt: Schema.String,
  seed: Schema.String,
  selectionPolicy: Schema.String,
  commitmentSlots: Schema.Array(Schema.String),
  revealedTargetCommitments: Schema.Array(Schema.String),
  packetId: Schema.String,
  packetIds: Schema.optional(Schema.Array(Schema.String)),
  sourceSnapshot: Schema.String,
  profile: Schema.optional(Schema.String),
  packetSelectionStrategy: Schema.optional(Schema.String),
  targetFamilies: Schema.Array(Schema.String),
  itemCount: Schema.Number,
  sourceScopeItemCount: Schema.Number,
  reasoningBearingItemCount: Schema.Number,
  baseline: Schema.String,
  treatment: Schema.String,
  baselineReasoningBearingClears: Schema.Number,
  treatmentReasoningBearingClears: Schema.Number,
  baselinePrecisionAdjustedReasoningBearingClears: Schema.Number,
  treatmentPrecisionAdjustedReasoningBearingClears: Schema.Number,
  baselineAllInTokens: Schema.Union([Schema.Number, Schema.Null]),
  treatmentAllInTokens: Schema.Union([Schema.Number, Schema.Null]),
  improvementMultiple: Schema.Union([Schema.Number, Schema.Null]),
  visibleImprovementMultiple: Schema.Union([Schema.Number, Schema.Null]),
  status: Schema.Literals(["confirmed", "candidate", "not-run", "failed"] as const),
  blockers: Schema.Array(Schema.String),
  diagnosticFamilies: Schema.Array(MeasurementCountRecordSchema),
  reasoningBurdenCounts: Schema.Array(MeasurementCountRecordSchema),
  rawHoldoutTargetsStored: Schema.Literal(false),
  rawPromptsStored: Schema.Literal(false),
  rawConversationStored: Schema.Literal(false),
  rawTraceRowsStored: Schema.Literal(false),
  fullCommandOutputStored: Schema.Literal(false),
  rawDiffStored: Schema.Literal(false),
  patchTextStored: Schema.Literal(false),
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementBenchmarkHoldoutEvaluationPayload =
  typeof MeasurementBenchmarkHoldoutEvaluationPayloadSchema.Type

export const MeasurementBenchmarkTargetStatusMetricsSchema = Schema.Struct({
  exactClears: Schema.Number,
  sourceScopeClears: Schema.Number,
  reasoningBearingClears: Schema.Number,
  reasoningWeightedClears: Schema.Number,
  precisionAdjustedReasoningBearingClears: Schema.Number,
  reasoningBearingClearsPerMillionTokens: Schema.Union([Schema.Number, Schema.Null]),
  reasoningWeightedClearsPerMillionTokens: Schema.Union([Schema.Number, Schema.Null]),
  precisionAdjustedReasoningBearingMultiple: Schema.Union([Schema.Number, Schema.Null]),
  combinedImprovementMultiple: Schema.Union([Schema.Number, Schema.Null]),
  autofixOnlyImprovementMultiple: Schema.Union([Schema.Number, Schema.Null]),
  holdoutConfirmedImprovementMultiple: Schema.Union([Schema.Number, Schema.Null]),
  allInTokens: Schema.Union([Schema.Number, Schema.Null]),
  cacheNormalizedTokens: Schema.Union([Schema.Number, Schema.Null]),
})
export type MeasurementBenchmarkTargetStatusMetrics =
  typeof MeasurementBenchmarkTargetStatusMetricsSchema.Type

export const MeasurementBenchmarkTargetDecisionSchema = Schema.Literals([
  "passed",
  "candidate",
  "not-passed",
  "not-measured",
] as const)
export type MeasurementBenchmarkTargetDecision =
  typeof MeasurementBenchmarkTargetDecisionSchema.Type

export const MeasurementBenchmarkPairedStateArmEvidenceSchema = Schema.Struct({
  arm: MeasurementBenchmarkArmSchema,
  armId: Schema.String,
  status: Schema.Literals(["passed", "failed", "not-measured"] as const),
  baseCommit: Schema.String,
  startingHead: Schema.optional(Schema.String),
  sourceStateFingerprint: Schema.String,
  worktreeFingerprint: Schema.String,
  dependencyLockHash: Schema.optional(Schema.String),
  packetInventoryHash: Schema.String,
  allowedSourceScopeHash: Schema.String,
  blockers: Schema.Array(Schema.String),
})
export type MeasurementBenchmarkPairedStateArmEvidence =
  typeof MeasurementBenchmarkPairedStateArmEvidenceSchema.Type

export const MeasurementBenchmarkPairedStateEvidenceSchema = Schema.Struct({
  comparableLoop: Schema.Boolean,
  status: Schema.Literals(["passed", "failed", "not-applicable", "not-measured"] as const),
  armCount: Schema.Number,
  baseCommit: Schema.String,
  sourceStateFingerprint: Schema.String,
  worktreeFingerprint: Schema.String,
  dependencyLockHash: Schema.optional(Schema.String),
  packetInventoryHash: Schema.String,
  allowedSourceScopeHash: Schema.String,
  allowedFiles: Schema.Array(Schema.String),
  excludedScopes: Schema.Array(Schema.String),
  arms: Schema.Array(MeasurementBenchmarkPairedStateArmEvidenceSchema),
  blockers: Schema.Array(Schema.String),
})
export type MeasurementBenchmarkPairedStateEvidence =
  typeof MeasurementBenchmarkPairedStateEvidenceSchema.Type

export const MeasurementBenchmarkCrossFamilyConfirmationSchema = Schema.Struct({
  status: Schema.Literals(["passed", "failed", "not-applicable", "not-measured"] as const),
  minimumDiagnosticFamilies: Schema.Number,
  minimumPacketClasses: Schema.Number,
  resolvedDiagnosticFamilyCount: Schema.Number,
  targetDiagnosticFamilyCount: Schema.Number,
  packetClassCount: Schema.Number,
  blockers: Schema.Array(Schema.String),
})
export type MeasurementBenchmarkCrossFamilyConfirmation =
  typeof MeasurementBenchmarkCrossFamilyConfirmationSchema.Type

export const MeasurementBenchmarkTargetStatusPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  benchmarkRunId: Schema.String,
  measurementSessionId: Schema.String,
  loopId: Schema.String,
  loopKind: MeasurementBenchmarkLoopKindSchema,
  baseline: Schema.String,
  treatment: Schema.String,
  correctedClears: Schema.Number,
  tokenTotal: Schema.Union([Schema.Number, Schema.Null]),
  improvementMultiple: Schema.Union([Schema.Number, Schema.Null]),
  tenXCheckpointStatus: MeasurementBenchmarkTargetDecisionSchema,
  twentyXGoalStatus: MeasurementBenchmarkTargetDecisionSchema,
  reasoningPacketStatus: MeasurementBenchmarkTargetDecisionSchema,
  precisionAdjustedStatus: MeasurementBenchmarkTargetDecisionSchema,
  holdoutStatus: Schema.Literals(["confirmed", "candidate", "not-run", "failed"] as const),
  negativeControlStatus: Schema.Literals(["clean", "penalized", "not-run", "failed"] as const),
  confidence: Schema.Literals(["high", "medium", "low"] as const),
  blockers: Schema.Array(Schema.String),
  recommendedNextLoopKind: MeasurementBenchmarkLoopKindSchema,
  metrics: MeasurementBenchmarkTargetStatusMetricsSchema,
  crossFamilyConfirmation: MeasurementBenchmarkCrossFamilyConfirmationSchema,
  pairedState: MeasurementBenchmarkPairedStateEvidenceSchema,
  legacyMetricCaveats: Schema.Array(MeasurementBenchmarkLegacyMetricCaveatSchema),
  resultBreakdown: MeasurementBenchmarkResultBreakdownSchema,
  evidenceFlags: MeasurementBenchmarkTargetEvidenceFlagsSchema,
  reasoningWork: MeasurementBenchmarkReasoningWorkEvaluationSchema,
  scorerSelfChecks: Schema.Array(MeasurementBenchmarkScorerSelfCheckSchema),
  aggregateStatistics: MeasurementBenchmarkAggregateStatisticsSchema,
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementBenchmarkTargetStatusPayload =
  typeof MeasurementBenchmarkTargetStatusPayloadSchema.Type

export const MeasurementBenchmarkScorecardMetricValueSchema = Schema.Struct({
  armId: MeasurementBenchmarkArmSchema,
  value: Schema.Union([Schema.Number, Schema.String, Schema.Null]),
})
export type MeasurementBenchmarkScorecardMetricValue =
  typeof MeasurementBenchmarkScorecardMetricValueSchema.Type

export const MeasurementBenchmarkScorecardMetricSchema = Schema.Struct({
  metric: Schema.String,
  values: Schema.optional(Schema.Array(MeasurementBenchmarkScorecardMetricValueSchema)),
  control: Schema.optional(Schema.Union([Schema.Number, Schema.String, Schema.Null])),
  treatment: Schema.optional(Schema.Union([Schema.Number, Schema.String, Schema.Null])),
  delta: Schema.optional(Schema.Number),
  bestValue: Schema.optional(Schema.Union([Schema.Number, Schema.String])),
  winner: Schema.String,
  evidence: Schema.String,
})
export type MeasurementBenchmarkScorecardMetric =
  typeof MeasurementBenchmarkScorecardMetricSchema.Type

export const MeasurementBenchmarkScorecardPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  benchmarkRunId: Schema.String,
  measurementSessionId: Schema.String,
  scoredAt: Schema.String,
  winner: Schema.String,
  outcomeWinner: Schema.optional(Schema.String),
  tokenEfficiencyWinner: Schema.optional(Schema.String),
  cheapestArm: Schema.optional(Schema.String),
  localTrellisWinner: Schema.optional(Schema.String),
  outcomeBandArms: Schema.optional(Schema.Array(Schema.String)),
  summary: Schema.String,
  metrics: Schema.Array(MeasurementBenchmarkScorecardMetricSchema),
  missingMetricReasons: Schema.Array(Schema.String),
  scorerSelfChecks: Schema.optional(Schema.Array(MeasurementBenchmarkScorerSelfCheckSchema)),
  aggregateStatistics: Schema.optional(MeasurementBenchmarkAggregateStatisticsSchema),
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementBenchmarkScorecardPayload =
  typeof MeasurementBenchmarkScorecardPayloadSchema.Type

export const MeasurementBenchmarkReportInputQuerySummarySchema = Schema.Struct({
  source: Schema.Literal("framework-runtime-observation-store"),
  observationCount: Schema.Number,
  observationKindCounts: Schema.Array(MeasurementCountRecordSchema),
  targetStatusObservationCount: Schema.Number,
  targetPacketObservationCount: Schema.Number,
  scorecardObservationCount: Schema.Number,
  holdoutObservationCount: Schema.Number,
  auditObservationCount: Schema.Number,
  reportInputObservationIdsStored: Schema.Literal(true),
  rawTraceRowsRead: Schema.Literal(false),
  rawPromptsRead: Schema.Literal(false),
  fullCommandOutputRead: Schema.Literal(false),
  rawDiffsRead: Schema.Literal(false),
})
export type MeasurementBenchmarkReportInputQuerySummary =
  typeof MeasurementBenchmarkReportInputQuerySummarySchema.Type

export const MeasurementBenchmarkReportProjectionPayloadSchema = Schema.Struct({
  schemaVersion: Schema.optional(Schema.Literal(1)),
  benchmarkRunId: Schema.String,
  measurementSessionId: Schema.String,
  reportPath: Schema.String,
  inputObservationIds: Schema.Array(Schema.String),
  inputQuerySummary: MeasurementBenchmarkReportInputQuerySummarySchema,
  projectedAt: Schema.String,
  privacy: MeasurementPrivacySummarySchema,
})
export type MeasurementBenchmarkReportProjectionPayload =
  typeof MeasurementBenchmarkReportProjectionPayloadSchema.Type

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
