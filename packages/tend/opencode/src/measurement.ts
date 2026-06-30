import * as crypto from "node:crypto"
import * as childProcess from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { Effect } from "effect"
import { Schema } from "effect"
import { defineRecipe, type RecipeObservation, type RecipeReceiptStoreSnapshot } from "@attune/framework-protocol"
import {
  createAttuneOpenCodeFingerprint,
  runDoctor,
  runHarnessSelfTest,
  summarizeCommandOutput,
} from "./cli-core.js"
import type {
  TendOpenCodeCommandOutputSummary,
  TendOpenCodeDoctorOutput,
  TendOpenCodeHarnessTestOutput,
} from "./contracts.js"
import {
  createMeasurementObservation,
  createMeasurementObservationSink,
  localTimescaleLifecycleOutput,
  localTimescaleObservation,
  LocalTimescaleManagedRecipe,
  measurementStoreConfigFromEnv,
  measurementObservationsBySession,
  recordMeasurementObservation,
} from "@attune/framework-runtime"

const commandObservationRecipe = defineRecipe({
  id: "tend-opencode.command-observation",
  projectId: "tend-opencode",
  title: "Emit DB-backed Tend/OpenCode measurement observations",
  inputSchema: Schema.Unknown,
  outputSchema: Schema.Unknown,
  nxTarget: "tend-opencode:test",
  sourcePath: "packages/tend/opencode/src/measurement.ts",
  allowedFiles: ["packages/tend/opencode/**", "reports/**"],
  validationEvidence: ["tend-opencode:test", "framework-runtime:db:validate-sql"],
})

export interface TraceInventoryOptions {
  readonly workspaceRoot?: string
  readonly codexHome?: string
  readonly maxFiles?: number
}

export interface MeasurementReportOptions extends TraceInventoryOptions {
  readonly reportsDir?: string
  readonly measurementSessionId?: string
  readonly exportOnly?: boolean
  readonly dryRun?: boolean
}

export interface TraceInventorySummary {
  readonly measurementSessionId: string
  readonly scannedAt: string
  readonly codexHome: string
  readonly traceFiles: number
  readonly sqliteFiles: number
  readonly jsonlFiles: number
  readonly skippedFiles: number
  readonly sqliteSchemaFilesInspected: number
  readonly sqliteSchemaFilesSkipped: number
  readonly sqliteSchemas: readonly SqliteSchemaSummary[]
  readonly commandEventCount: number
  readonly uniqueCommandFamilies: number
  readonly repeatedCommandFamilyCount: number
  readonly repeatedCommandInvocationCount: number
  readonly exitCodeEventCount: number
  readonly failedExitCodeCount: number
  readonly timestampRange: TimestampRangeSummary
  readonly durationMs: NumericSummary
  readonly commandFamilies: readonly CountRecord[]
  readonly repeatedCommandPatterns: readonly CountRecord[]
  readonly exitCodes: readonly CountRecord[]
  readonly comparableSessionCandidates: readonly HistoricalSessionSummary[]
  readonly selectedBaselineSession?: HistoricalSessionSummary
  readonly toolCalls: number
  readonly tokenTotal: number
  readonly modelIds: readonly CountRecord[]
  readonly sessionIds: readonly CountRecord[]
  readonly privacy: {
    readonly rawPromptsStored: false
    readonly rawConversationStored: false
    readonly rawTraceRowsStored: false
    readonly fullCommandOutputStored: false
  }
}

export interface CountRecord {
  readonly value: string
  readonly count: number
}

export interface NumericSummary {
  readonly count: number
  readonly total: number
  readonly min?: number
  readonly max?: number
  readonly average?: number
  readonly p50?: number
  readonly p95?: number
}

export interface TimestampRangeSummary {
  readonly count: number
  readonly earliest?: string
  readonly latest?: string
  readonly spanMs?: number
}

export interface HistoricalSessionSummary {
  readonly sessionId: string
  readonly score: number
  readonly scoreReasons: readonly string[]
  readonly startedAt?: string
  readonly completedAt?: string
  readonly wallTimeMs?: number
  readonly commandEvents: number
  readonly uniqueCommandFamilies: number
  readonly repeatedCommandFamilies: number
  readonly repeatedCommandInvocations: number
  readonly exitCodeEvents: number
  readonly failedCommands: number
  readonly successfulCommands: number
  readonly commandSuccessRate?: number
  readonly expensiveChecks: number
  readonly workspacePolicyFastCount: number
  readonly timeToFirstUsefulDiagnosticMs?: number
  readonly durationMs: NumericSummary
  readonly tokenTotal: number
  readonly toolCalls: number
  readonly modelIds: readonly CountRecord[]
  readonly commandFamilies: readonly CountRecord[]
  readonly exitCodes: readonly CountRecord[]
  readonly matchedSignals: readonly string[]
  readonly hasAttuneTrellisSignal: boolean
  readonly hasEnoughSamples: boolean
  readonly giantCatchallPenalty: boolean
  readonly privacy: TraceInventorySummary["privacy"]
}

export interface SqliteSchemaSummary {
  readonly fileId: string
  readonly fileKind: "sqlite" | "db"
  readonly inspected: boolean
  readonly tableCount: number
  readonly tables: readonly SqliteSchemaTableSummary[]
  readonly skippedReason?: string
}

export interface SqliteSchemaTableSummary {
  readonly tableName: string
  readonly allowlistedColumns: readonly string[]
  readonly skippedColumnCount: number
}

export interface MeasurementReportResult {
  readonly measurementSessionId: string
  readonly reportsDir: string
  readonly inventory: TraceInventorySummary
  readonly reports: readonly string[]
  readonly storeEmission: {
    readonly status: "emitted" | "failed" | "export-only"
    readonly error?: string
  }
  readonly preflight?: MeasurementPreflightSummary
}

export interface MeasurementPreflightSummary {
  readonly measurementSessionId: string
  readonly startedAt: string
  readonly completedAt: string
  readonly passed: boolean
  readonly exportOnly: boolean
  readonly harnessProof: {
    readonly fingerprintPassed: boolean
    readonly selfTestPassed: boolean
    readonly doctorPassed: boolean
    readonly runtimeKind?: string
    readonly flakeProvided?: boolean
    readonly pluginNames: readonly string[]
    readonly failedChecks: readonly string[]
  }
  readonly storeHealth: {
    readonly checked: boolean
    readonly reachable: boolean
    readonly migrated: boolean
    readonly sqlRouteValid: boolean
    readonly observationSmokeHealthy: boolean
    readonly owner: "framework-runtime"
    readonly mode: string
    readonly databaseUrl?: string
    readonly failureSummary?: TendOpenCodeCommandOutputSummary
  }
  readonly sessionStartedObservationId?: string
  readonly harnessProofObservationId?: string
  readonly storeHealthObservationId?: string
  readonly smokeObservationId?: string
  readonly cacheExportPath?: string
}

interface CommandObservationProjection {
  readonly observationId: string
  readonly observedAt: string
  readonly command: string
  readonly startedAt?: string
  readonly completedAt?: string
  readonly durationMs?: number
  readonly exitCode?: number
  readonly measurementPhase?: "baseline" | "treatment"
  readonly knownNxTarget?: string
  readonly targetId?: string
  readonly inferredRecipeId?: string
  readonly tokenTotal?: number
  readonly toolCalls?: number
  readonly tokenMetricSource?: string
  readonly status?: string
  readonly storeEmissionStatus: "emitted"
}

interface ObservationSummaryProjection {
  readonly observationId: string
  readonly observationKind: string
  readonly recipeId: string
  readonly observedAt: string
  readonly source?: string
}

interface MeasurementReportProjection {
  readonly measurementSessionId: string
  readonly projectedAt: string
  readonly inventory: TraceInventorySummary
  readonly observationIds: readonly string[]
  readonly observationSummaries: readonly ObservationSummaryProjection[]
  readonly commandObservations: readonly CommandObservationProjection[]
  readonly agentMetrics: readonly AgentMetricsProjection[]
  readonly recipeSpineCoverage?: RecipeSpineCoverageProjection
  readonly editAttemptSummary?: EditAttemptSummaryProjection
  readonly legacySubstrateAudit?: LegacySubstrateAuditProjection
  readonly traceInventoryObservationIds: readonly string[]
  readonly agentMetricObservationIds: readonly string[]
  readonly reportObservationIds: readonly string[]
  readonly microExperimentObservationIds: readonly string[]
  readonly microExperimentSummaries: readonly MicroExperimentProjection[]
  readonly migrationReadinessObservationIds: readonly string[]
  readonly migrationReadinessSummaries: readonly MigrationReadinessProjection[]
  readonly baselineSessionObservationIds: readonly string[]
  readonly harnessProofObservationIds: readonly string[]
  readonly lifecycleHealthObservationIds: readonly string[]
  readonly trellisDiagnosticObservationIds: readonly string[]
}

interface AgentMetricsProjection {
  readonly observationId?: string
  readonly measurementPhase: "baseline" | "treatment" | "session"
  readonly capturedAt: string
  readonly source: string
  readonly tokenTotal: number
  readonly toolCalls: number
  readonly sampleCount: number
  readonly traceFilesScanned: number
  readonly windowCount: number
  readonly startedAt?: string
  readonly completedAt?: string
  readonly tokenMetricSource: string
}

interface RecipeSpineCoverageProjection {
  readonly capturedAt: string
  readonly recipeCount: number
  readonly edgeCount: number
  readonly ioCount: number
  readonly runCount: number
  readonly receiptCount: number
  readonly observationCount: number
  readonly diagnosticCount: number
  readonly repairCount: number
  readonly healthCount: number
  readonly frameworkSchemasPreserved: boolean
  readonly observationStore: "framework_event.recipe_observation"
}

interface EditAttemptSummaryProjection {
  readonly capturedAt: string
  readonly dirtyPathCount: number
  readonly sourceEditCount: number
  readonly reportExportEditCount: number
  readonly generatedPrivateLedgerEditAttempts: number
  readonly generatedPrivateLedgerPathClasses: readonly string[]
}

interface LegacySubstrateAuditProjection {
  readonly capturedAt: string
  readonly scannedPathCount: number
  readonly historicalReferenceCount: number
  readonly enforcementReferenceCount: number
  readonly testFixtureReferenceCount: number
  readonly measurementInventoryReferenceCount: number
  readonly blockingLiveReferenceCount: number
}

interface MigrationReadinessProjection {
  readonly summarizedAt?: string
  readonly proceedToRecipeOnlyMigration: false
  readonly gates: readonly MigrationReadinessGate[]
}

interface MigrationReadinessGate {
  readonly gate: string
  readonly status: "pass" | "blocked" | "not-measured" | "warning"
  readonly evidence: string
  readonly followUp?: string
}

interface MicroExperimentProjection {
  readonly summarizedAt?: string
  readonly task?: string
  readonly baseline?: ExperimentRunMetricsProjection
  readonly selectedBaseline?: ExperimentRunMetricsProjection
  readonly selectedBaselineSession?: HistoricalSessionSummary
  readonly treatment?: ExperimentRunMetricsProjection
  readonly comparison?: Record<string, number | string | undefined>
  readonly selectedBaselineComparison?: Record<string, number | string | undefined>
  readonly findingQualityMatrix: readonly FindingQualityRow[]
  readonly recommendation?: {
    readonly proceedToRecipeOnlyMigration: boolean
    readonly summary: string
    readonly evidenceGaps: readonly string[]
  }
}

interface ExperimentRunMetricsProjection {
  readonly mode: "baseline" | "treatment"
  readonly startedAt?: string
  readonly completedAt?: string
  readonly wallTimeMs?: number
  readonly fileReads: number
  readonly shellCommands: number
  readonly repeatedCommands: number
  readonly failedCommands: number
  readonly expensiveChecks: number
  readonly workspacePolicyFastCount?: number
  readonly timeToUsefulDiagnosticMs?: number
  readonly rawContextBytes?: number
  readonly tokenTotal?: number
  readonly toolCalls?: number
  readonly tokenMetricSource?: string
  readonly agentMetricSampleCount?: number
  readonly agentMetricTraceFilesScanned?: number
  readonly agentMetricWindowCount?: number
  readonly successfulCommands?: number
  readonly knownExitCodeCommands?: number
  readonly commandSuccessRate?: number
  readonly commandFailureRate?: number
  readonly durationSampleCount?: number
  readonly durationTotalMs?: number
  readonly durationAverageMs?: number
  readonly durationMinMs?: number
  readonly durationMaxMs?: number
  readonly durationP50Ms?: number
  readonly durationP95Ms?: number
  readonly cheapCommands?: number
  readonly mediumCommands?: number
  readonly finalGateCommands?: number
  readonly workspaceWideCommands?: number
  readonly unknownTargetCommands?: number
  readonly unknownRecipeCommands?: number
  readonly storeEmittedCommands?: number
  readonly uniqueTargets?: number
  readonly uniqueRecipes?: number
  readonly trellisDiagnosticObservations?: number
  readonly observationInputCount?: number
  readonly traceFiles?: number
  readonly jsonlFiles?: number
  readonly sqliteFiles?: number
  readonly sqliteSchemaTables?: number
  readonly uniqueModels?: number
  readonly uniqueSessions?: number
  readonly uniqueCommandFamilies?: number
  readonly repeatedCommandFamilies?: number
  readonly topCommandFamily?: string
  readonly topExitCode?: string
  readonly firstObservedAt?: string
  readonly lastObservedAt?: string
  readonly observedCommandSpanMs?: number
  readonly findingQuality?: string
}

interface FindingQualityRow {
  readonly finding: string
  readonly baseline: "hit" | "partial" | "miss" | "not-measured"
  readonly treatment: "hit" | "partial" | "miss" | "not-measured"
  readonly evidence: string
}

interface DerivedTraceMetadata {
  readonly commandFamilies: readonly string[]
  readonly exitCodes: readonly string[]
  readonly modelIds: readonly string[]
  readonly sessionIds: readonly string[]
  readonly durationsMs: readonly number[]
  readonly timestamps: readonly string[]
  readonly toolCalls: number
  readonly tokenTotal: number
  readonly cumulativeTokenTotal?: number
}

interface TraceMetricSample {
  readonly observedAt: string
  readonly tokenTotal: number
  readonly cumulativeTokenTotal?: number
  readonly toolCalls: number
}

interface MutableHistoricalSessionGroup {
  readonly sessionId: string
  readonly commandFamilies: Map<string, number>
  readonly exitCodes: Map<string, number>
  readonly modelIds: Map<string, number>
  readonly durationsMs: number[]
  readonly timestamps: string[]
  readonly usefulDiagnosticTimestamps: string[]
  incrementalTokenTotal: number
  cumulativeTokenTotals: number[]
  toolCalls: number
}

interface EditAttemptAudit {
  readonly dirtyPathCount: number
  readonly sourceEditCount: number
  readonly reportExportEditCount: number
  readonly generatedPrivateLedgerEditAttempts: number
  readonly generatedPrivateLedgerPathClasses: readonly string[]
}

interface LegacySubstrateAudit {
  readonly scannedPathCount: number
  readonly historicalReferenceCount: number
  readonly enforcementReferenceCount: number
  readonly testFixtureReferenceCount: number
  readonly measurementInventoryReferenceCount: number
  readonly blockingLiveReferenceCount: number
}

interface RemainingGap {
  readonly gap: string
  readonly type: "harness proof" | "framework store health" | "sql validation" | "observation emission" | "projection" | "privacy"
  readonly evidenceStatus: string
  readonly followUp: string
}

const forbiddenKeyPattern = /prompt|message|content|text|secret|password|token_value|raw|conversation|transcript|stdout|stderr/iu
const commandKeyPattern = /^(command|cmd|argv|args|shellCommand)$/u
const durationKeyPattern = /^(durationMs|duration_ms|elapsedMs|elapsed_ms|wallTimeMs)$/u
const exitCodeKeyPattern = /^(exitCode|exit_code|statusCode)$/u
const tokenCountKeyPattern =
  /^(totalTokens|total_tokens|inputTokens|input_tokens|outputTokens|output_tokens|tokens|tokensUsed|tokens_used|tokenCount|token_count)$/u
const modelKeyPattern = /^(model|modelId|model_id)$/u
const sessionKeyPattern = /^(sessionId|session_id|conversationId|conversation_id)$/u
const toolCallEventTypePattern =
  /^(function_call|custom_tool_call|web_search_call|tool_search_call|view_image_tool_call)$/u
const timestampKeyPattern =
  /^(occurredAt|createdAt|updatedAt|timestamp|startedAt|completedAt|created_at|updated_at|started_at|completed_at)$/u
const sqliteAllowedColumnPattern =
  /^(id|uuid|session_id|model|model_id|created_at|updated_at|timestamp|started_at|completed_at|duration_ms|exit_code|status|command|cmd|tool_name|tool_call_count|token_count|input_tokens|output_tokens|total_tokens)$/iu
const legacySubstrateReferencePattern =
  /SQLite|sqlite|Drizzle|drizzle|PgTyped|pgtyped|program-index|ProgramIndex|attune\.generated|attune\.contract\.generated|attune\.package\.typecheck|artifact-ownership/u
const comparableSessionCandidateLimit = 12
const giantCatchallWindowMs = 24 * 60 * 60 * 1_000
const comparableSessionSignals: readonly {
  readonly signal: string
  readonly pattern: RegExp
  readonly weight: number
}[] = [
  { signal: "trellis-ls", pattern: /trellis-ls|trellis-language-service/iu, weight: 40 },
  { signal: "framework-language-service", pattern: /framework-language-service/iu, weight: 40 },
  { signal: "recipe-substrate", pattern: /recipe-substrate/iu, weight: 32 },
  { signal: "tend-opencode", pattern: /tend-opencode/iu, weight: 28 },
  { signal: "framework-runtime", pattern: /framework-runtime|local-timescaledb|local-recipe-store/iu, weight: 18 },
  { signal: "attune", pattern: /attune/iu, weight: 14 },
  { signal: "recipe", pattern: /\brecipe\b|managedrecipe/iu, weight: 8 },
]
const usefulDiagnosticCommandPattern =
  /trellis-ls|trellis-language-service|framework-language-service|recipe-substrate|diagnostic/iu

export const inventoryCodexTraceMetadata = (
  options: TraceInventoryOptions = {},
): TraceInventorySummary => {
  const workspaceRoot = options.workspaceRoot ?? process.cwd()
  const codexHome = options.codexHome ?? path.join(os.homedir(), ".codex")
  const measurementSessionId = defaultMeasurementSessionId(workspaceRoot)
  const files = fs.existsSync(codexHome)
    ? traceFiles(codexHome, options.maxFiles ?? 500)
    : []
  const sqliteFiles = files.filter((file) => file.endsWith(".sqlite") || file.endsWith(".db"))
  const sqliteSchemaInspection = inspectSqliteSchemas(sqliteFiles)
  const commandFamilies = new Map<string, number>()
  const exitCodes = new Map<string, number>()
  const modelIds = new Map<string, number>()
  const sessionIds = new Map<string, number>()
  const sessionGroups = new Map<string, MutableHistoricalSessionGroup>()
  const durationsMs: number[] = []
  const timestamps: string[] = []
  let toolCalls = 0
  let incrementalTokenTotal = 0
  const cumulativeTokenTotals: number[] = []
  let skippedFiles = 0

  for (const file of files) {
    if (file.endsWith(".jsonl")) {
      try {
        const fallbackSessionId = fileIdFor(file)
        for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/u)) {
          if (line.trim().length === 0) continue
          const parsed = parseJson(line)
          if (parsed === undefined) continue
          const derived = deriveMetadata(parsed)
          for (const command of derived.commandFamilies) increment(commandFamilies, command)
          for (const code of derived.exitCodes) increment(exitCodes, code)
          for (const model of derived.modelIds) increment(modelIds, model)
          for (const session of derived.sessionIds) increment(sessionIds, session)
          durationsMs.push(...derived.durationsMs)
          timestamps.push(...derived.timestamps)
          recordHistoricalSessionMetadata(sessionGroups, derived, fallbackSessionId)
          toolCalls += derived.toolCalls
          if (derived.cumulativeTokenTotal === undefined) {
            incrementalTokenTotal += derived.tokenTotal
          } else {
            cumulativeTokenTotals.push(derived.cumulativeTokenTotal)
          }
        }
      } catch {
        skippedFiles++
      }
    }
  }

  return {
    measurementSessionId,
    scannedAt: new Date().toISOString(),
    codexHome,
    traceFiles: files.length,
    sqliteFiles: sqliteFiles.length,
    jsonlFiles: files.filter((file) => file.endsWith(".jsonl")).length,
    skippedFiles: skippedFiles + sqliteSchemaInspection.skippedFiles,
    sqliteSchemaFilesInspected: sqliteSchemaInspection.inspectedFiles,
    sqliteSchemaFilesSkipped: sqliteSchemaInspection.skippedFiles,
    sqliteSchemas: sqliteSchemaInspection.schemas,
    commandEventCount: countTotal(commandFamilies),
    uniqueCommandFamilies: commandFamilies.size,
    repeatedCommandFamilyCount: [...commandFamilies.values()].filter((count) => count > 1).length,
    repeatedCommandInvocationCount: [...commandFamilies.values()]
      .filter((count) => count > 1)
      .reduce((sum, count) => sum + count, 0),
    exitCodeEventCount: countTotal(exitCodes),
    failedExitCodeCount: [...exitCodes.entries()]
      .filter(([code]) => code !== "0")
      .reduce((sum, [, count]) => sum + count, 0),
    timestampRange: timestampRangeSummary(timestamps),
    durationMs: numericSummary(durationsMs),
    commandFamilies: topCounts(commandFamilies, 40),
    repeatedCommandPatterns: topCounts(commandFamilies, 40).filter((item) => item.count > 1),
    exitCodes: topCounts(exitCodes, 20),
    comparableSessionCandidates: comparableSessionCandidates(sessionGroups),
    ...(optionalHistoricalSession("selectedBaselineSession", selectComparableBaselineSession(sessionGroups))),
    toolCalls,
    tokenTotal: cumulativeTokenTotals.length > 0
      ? maxNumber(cumulativeTokenTotals)
      : incrementalTokenTotal,
    modelIds: topCounts(modelIds, 20),
    sessionIds: topCounts(sessionIds, 20),
    privacy: measurementPrivacySummary(),
  }
}

export const writeMeasurementReports = async (
  options: MeasurementReportOptions = {},
): Promise<MeasurementReportResult> => {
  const workspaceRoot = options.workspaceRoot ?? process.cwd()
  const reportsDir = path.resolve(workspaceRoot, options.reportsDir ?? "reports/tend-opencode-codex-measurement")
  const exportOnly = options.exportOnly === true || options.dryRun === true
  const config = measurementStoreConfigFromEnv()
  const sinkConfig = exportOnly ? { ...config, mode: "export-only" as const } : config
  let sink: Awaited<ReturnType<typeof createMeasurementObservationSink>> | undefined
  let inventory: TraceInventorySummary = emptyTraceInventory(
    options.measurementSessionId ?? defaultMeasurementSessionId(workspaceRoot),
    options.codexHome ?? path.join(os.homedir(), ".codex"),
  )
  try {
    inventory = {
      ...inventoryCodexTraceMetadata(options),
      ...(options.measurementSessionId === undefined ? {} : { measurementSessionId: options.measurementSessionId }),
    }
    sink = await createMeasurementObservationSink(sinkConfig)
    const preflight = await runMeasurementPreflight({
      workspaceRoot,
      reportsDir,
      measurementSessionId: inventory.measurementSessionId,
      sink,
      exportOnly,
    })
    if (!preflight.passed && !exportOnly) {
      return {
        measurementSessionId: inventory.measurementSessionId,
        reportsDir,
        inventory,
        reports: [],
        storeEmission: {
          status: "failed",
          error: preflight.storeHealth.failureSummary?.text ?? "Measurement preflight failed.",
        },
        preflight,
      }
    }

    if (sink.store === undefined) {
      const projection = measurementProjectionFromObservations(inventory, [])
      fs.mkdirSync(reportsDir, { recursive: true })
      const reports = writeProjectionReports(reportsDir, projection)
      return {
        measurementSessionId: projection.measurementSessionId,
        reportsDir,
        inventory: projection.inventory,
        reports,
        storeEmission: { status: "export-only" },
        preflight,
      }
    }

    if (sink.store !== undefined) {
      await Effect.runPromise(sink.store.registerRecipe(commandObservationRecipe))
    }
    const traceObservation = createMeasurementObservation({
      kind: "measurement.trace.inventory.summary",
      recipeId: "tend-opencode.command-observation",
      observedAt: inventory.scannedAt,
      measurementSessionId: inventory.measurementSessionId,
      source: "tend-opencode.trace-inventory",
      payload: { ...inventory },
    })
    await Effect.runPromise(recordMeasurementObservation(sink, traceObservation))
    if (inventory.selectedBaselineSession !== undefined) {
      const selectedAt = new Date().toISOString()
      const selectedPayload = baselineSessionSelectionPayload(inventory, selectedAt, "safe-session-comparability-score-v1")
      const selectedObservation = createMeasurementObservation({
        kind: "measurement.baseline.session.selected",
        recipeId: "tend-opencode.command-observation",
        observedAt: selectedAt,
        measurementSessionId: inventory.measurementSessionId,
        source: "tend-opencode.baseline-session-selection",
        payload: selectedPayload,
      })
      await Effect.runPromise(recordMeasurementObservation(sink, selectedObservation))
      const summaryObservation = createMeasurementObservation({
        kind: "measurement.baseline.session.summary",
        recipeId: "tend-opencode.command-observation",
        observedAt: new Date().toISOString(),
        measurementSessionId: inventory.measurementSessionId,
        source: "tend-opencode.baseline-session-summary",
        payload: {
          ...selectedPayload,
          selectionMethod: "selected-session-summary-v1",
        },
      })
      await Effect.runPromise(recordMeasurementObservation(sink, summaryObservation))
    }
    const observationsAfterBaseline = await Effect.runPromise(
      measurementObservationsBySession(sink.store, inventory.measurementSessionId),
    )
    for (const agentMetrics of derivePhaseAgentMetrics({
      codexHome: inventory.codexHome,
      commandObservations: observationsAfterBaseline
        .filter((observation) => observation.observationKind === "measurement.command.observed")
        .map(commandProjectionFromObservation),
      maxFiles: options.maxFiles ?? 500,
    })) {
      const agentMetricsObservation = createMeasurementObservation({
        kind: "measurement.agent.metrics.summary",
        recipeId: "tend-opencode.command-observation",
        observedAt: agentMetrics.capturedAt,
        measurementSessionId: inventory.measurementSessionId,
        source: "tend-opencode.agent-metrics-window",
        payload: {
          schemaVersion: 1,
          measurementSessionId: inventory.measurementSessionId,
          ...agentMetrics,
          privacy: inventory.privacy,
        },
      })
      await Effect.runPromise(recordMeasurementObservation(sink, agentMetricsObservation))
    }
    await emitOperationalReadinessEvidence({
      sink,
      workspaceRoot,
      measurementSessionId: inventory.measurementSessionId,
      privacy: inventory.privacy,
    })
    const observationsAfterReadinessEvidence = await Effect.runPromise(
      measurementObservationsBySession(sink.store, inventory.measurementSessionId),
    )
    const inventoryWithStoreBaseline = inventoryWithStoreBackedSelectedBaseline(
      inventory,
      observationsAfterReadinessEvidence,
    )
    if (
      inventoryWithStoreBaseline.selectedBaselineSession?.sessionId !== inventory.selectedBaselineSession?.sessionId
    ) {
      inventory = inventoryWithStoreBaseline
      const updatedTraceObservation = createMeasurementObservation({
        kind: "measurement.trace.inventory.summary",
        recipeId: "tend-opencode.command-observation",
        observedAt: new Date().toISOString(),
        measurementSessionId: inventory.measurementSessionId,
        source: "tend-opencode.store-backed-baseline-selection",
        payload: { ...inventory },
      })
      await Effect.runPromise(recordMeasurementObservation(sink, updatedTraceObservation))
      if (inventory.selectedBaselineSession !== undefined) {
        const selectedAt = new Date().toISOString()
        const selectedPayload = baselineSessionSelectionPayload(
          inventory,
          selectedAt,
          "store-backed-controlled-baseline-fallback-v1",
        )
        await Effect.runPromise(recordMeasurementObservation(sink, createMeasurementObservation({
          kind: "measurement.baseline.session.selected",
          recipeId: "tend-opencode.command-observation",
          observedAt: selectedAt,
          measurementSessionId: inventory.measurementSessionId,
          source: "tend-opencode.baseline-session-selection",
          payload: selectedPayload,
        })))
        await Effect.runPromise(recordMeasurementObservation(sink, createMeasurementObservation({
          kind: "measurement.baseline.session.summary",
          recipeId: "tend-opencode.command-observation",
          observedAt: new Date().toISOString(),
          measurementSessionId: inventory.measurementSessionId,
          source: "tend-opencode.baseline-session-summary",
          payload: {
            ...selectedPayload,
            selectionMethod: "store-backed-controlled-baseline-summary-v1",
          },
        })))
      }
    }
    const observationsAfterAgentMetrics = await Effect.runPromise(
      measurementObservationsBySession(sink.store, inventory.measurementSessionId),
    )
    const microExperimentObservation = createMeasurementObservation({
      kind: "measurement.micro-experiment.summary",
      recipeId: "tend-opencode.command-observation",
      observedAt: new Date().toISOString(),
      measurementSessionId: inventory.measurementSessionId,
      source: "tend-opencode.micro-experiment-projection",
      payload: createMicroExperimentSummaryPayload(inventory, observationsAfterAgentMetrics),
    })
    await Effect.runPromise(recordMeasurementObservation(sink, microExperimentObservation))
    const observationsAfterMicroExperiment = await Effect.runPromise(
      measurementObservationsBySession(sink.store, inventory.measurementSessionId),
    )
    const migrationReadinessProjection = measurementProjectionFromObservations(inventory, observationsAfterMicroExperiment)
    const migrationReadinessObservation = createMeasurementObservation({
      kind: "measurement.migration-readiness.summary",
      recipeId: "tend-opencode.command-observation",
      observedAt: new Date().toISOString(),
      measurementSessionId: inventory.measurementSessionId,
      source: "tend-opencode.migration-readiness-projection",
      payload: migrationReadinessPayload(migrationReadinessProjection),
    })
    await Effect.runPromise(recordMeasurementObservation(sink, migrationReadinessObservation))
    const projection = measurementProjectionFromObservations(
      inventory,
      await Effect.runPromise(measurementObservationsBySession(sink.store, inventory.measurementSessionId)),
    )
    fs.mkdirSync(reportsDir, { recursive: true })
    const reports = writeProjectionReports(reportsDir, projection)
    for (const report of reports) {
      const observation = createMeasurementObservation({
        kind: "measurement.report.projected",
        recipeId: "tend-opencode.command-observation",
        observedAt: new Date().toISOString(),
        measurementSessionId: inventory.measurementSessionId,
        source: "tend-opencode.report-projection",
        payload: {
          reportPath: report,
          measurementSessionId: inventory.measurementSessionId,
          inputObservationIds: projection.observationIds,
          privacy: inventory.privacy,
        },
      })
      await Effect.runPromise(recordMeasurementObservation(sink, observation))
    }
    const sessionCompleted = createMeasurementObservation({
      kind: "measurement.session.completed",
      recipeId: "tend-opencode.command-observation",
      observedAt: new Date().toISOString(),
      measurementSessionId: inventory.measurementSessionId,
      source: "tend-opencode.measurement-report",
      payload: {
        measurementSessionId: inventory.measurementSessionId,
        reportPaths: reports,
        inputObservationIds: projection.observationIds,
        rawPromptStored: false,
        rawConversationStored: false,
        fullCommandOutputStored: false,
      },
    })
    await Effect.runPromise(recordMeasurementObservation(sink, sessionCompleted))
    return {
      measurementSessionId: projection.measurementSessionId,
      reportsDir,
      inventory: projection.inventory,
      reports,
      storeEmission: { status: "emitted" },
      preflight,
    }
  } catch (error) {
    return {
      measurementSessionId: inventory.measurementSessionId,
      reportsDir,
      inventory,
      reports: [],
      storeEmission: {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
      },
    }
  } finally {
    await sink?.close()
  }
}

const emitOperationalReadinessEvidence = async (input: {
  readonly sink: Awaited<ReturnType<typeof createMeasurementObservationSink>>
  readonly workspaceRoot: string
  readonly measurementSessionId: string
  readonly privacy: TraceInventorySummary["privacy"]
}): Promise<void> => {
  const store = input.sink.store
  if (store === undefined) return
  const capturedAt = new Date().toISOString()
  const snapshot = await Effect.runPromise(store.snapshot())
  const observations = [
    createMeasurementObservation({
      kind: "measurement.recipe-spine.coverage",
      recipeId: "tend-opencode.command-observation",
      observedAt: capturedAt,
      measurementSessionId: input.measurementSessionId,
      source: "tend-opencode.recipe-spine-coverage",
      payload: recipeSpineCoveragePayload(snapshot, input.measurementSessionId, capturedAt, input.privacy),
    }),
    createMeasurementObservation({
      kind: "measurement.edit-attempts.summary",
      recipeId: "tend-opencode.command-observation",
      observedAt: capturedAt,
      measurementSessionId: input.measurementSessionId,
      source: "tend-opencode.edit-attempt-audit",
      payload: {
        schemaVersion: 1,
        measurementSessionId: input.measurementSessionId,
        capturedAt,
        ...editAttemptAudit(input.workspaceRoot),
        privacy: input.privacy,
      },
    }),
    createMeasurementObservation({
      kind: "measurement.legacy-substrate.audit",
      recipeId: "tend-opencode.command-observation",
      observedAt: capturedAt,
      measurementSessionId: input.measurementSessionId,
      source: "tend-opencode.legacy-substrate-audit",
      payload: {
        schemaVersion: 1,
        measurementSessionId: input.measurementSessionId,
        capturedAt,
        ...legacySubstrateAudit(input.workspaceRoot),
        privacy: input.privacy,
      },
    }),
  ]
  for (const observation of observations) {
    await Effect.runPromise(recordMeasurementObservation(input.sink, observation))
  }
}

const recipeSpineCoveragePayload = (
  snapshot: RecipeReceiptStoreSnapshot,
  measurementSessionId: string,
  capturedAt: string,
  privacy: TraceInventorySummary["privacy"],
): Record<string, unknown> => ({
  schemaVersion: 1,
  measurementSessionId,
  capturedAt,
  recipeCount: snapshot.recipes.length,
  edgeCount: snapshot.edges.length,
  ioCount: snapshot.io.length,
  runCount: snapshot.runs.length,
  receiptCount: snapshot.receipts.length,
  observationCount: snapshot.observations.length,
  diagnosticCount: snapshot.diagnostics.length,
  repairCount: snapshot.repairs.length,
  healthCount: snapshot.health.length,
  frameworkSchemasPreserved: true,
  observationStore: "framework_event.recipe_observation",
  privacy,
})

const editAttemptAudit = (workspaceRoot: string): EditAttemptAudit => {
  const result = childProcess.spawnSync("git", ["status", "--porcelain=v1"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  })
  if (result.status !== 0 || typeof result.stdout !== "string") {
    return {
      dirtyPathCount: 0,
      sourceEditCount: 0,
      reportExportEditCount: 0,
      generatedPrivateLedgerEditAttempts: 0,
      generatedPrivateLedgerPathClasses: [],
    }
  }
  const paths = result.stdout
    .split(/\r?\n/u)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 3)
    .map((line) => statusPath(line.slice(3)))
    .filter((filePath) => filePath.length > 0)
  const dirtyPathCount = paths.length
  const reportExportEditCount = paths.filter(isReportExportPath).length
  const generatedPrivateLedgerClasses = paths
    .flatMap((filePath) => generatedPrivateLedgerPathClass(filePath) ?? [])
  return {
    dirtyPathCount,
    sourceEditCount: dirtyPathCount - reportExportEditCount,
    reportExportEditCount,
    generatedPrivateLedgerEditAttempts: generatedPrivateLedgerClasses.length,
    generatedPrivateLedgerPathClasses: [...new Set(generatedPrivateLedgerClasses)].sort(),
  }
}

const statusPath = (rawPath: string): string => {
  const renamedPath = rawPath.includes(" -> ")
    ? rawPath.slice(rawPath.lastIndexOf(" -> ") + " -> ".length)
    : rawPath
  return renamedPath.replace(/^"|"$/gu, "").replace(/\\/gu, "/").trim()
}

const isReportExportPath = (filePath: string): boolean =>
  filePath.startsWith("reports/tend-opencode-codex-measurement/")
  || filePath.startsWith(".attune/cache/measurement/")

const generatedPrivateLedgerPathClass = (filePath: string): string | undefined => {
  if (/\/src\/attune\.(?:generated|contract\.generated|package\.typecheck)\.ts$/u.test(filePath)) {
    return "package-generated-companion"
  }
  if (/(^|\/)attune\.artifact-ownership(?:\.index)?\.json$/u.test(filePath)) {
    return "artifact-ownership-ledger"
  }
  if (/(^|\/)(?:diagnostic-dump|validation-summary|private-ledger|generated-ledger)(?:\.json)?$/u.test(filePath)) {
    return "private-ledger"
  }
  if (filePath.includes("/src/generated/") || filePath.includes("/generated/")) {
    return "generated-source"
  }
  return undefined
}

const legacySubstrateAudit = (workspaceRoot: string): LegacySubstrateAudit => {
  const files = trackedTextFiles(workspaceRoot)
  let scannedPathCount = 0
  let historicalReferenceCount = 0
  let enforcementReferenceCount = 0
  let testFixtureReferenceCount = 0
  let measurementInventoryReferenceCount = 0
  let blockingLiveReferenceCount = 0
  for (const filePath of files) {
    const contents = safeReadTextFile(path.join(workspaceRoot, filePath))
    if (contents === undefined) continue
    scannedPathCount++
    if (!legacySubstrateReferencePattern.test(contents)) continue
    switch (legacySubstrateReferenceClass(filePath)) {
      case "historical":
        historicalReferenceCount++
        break
      case "enforcement":
        enforcementReferenceCount++
        break
      case "test-fixture":
        testFixtureReferenceCount++
        break
      case "measurement-inventory":
        measurementInventoryReferenceCount++
        break
      case "blocking-live":
        blockingLiveReferenceCount++
        break
    }
  }
  return {
    scannedPathCount,
    historicalReferenceCount,
    enforcementReferenceCount,
    testFixtureReferenceCount,
    measurementInventoryReferenceCount,
    blockingLiveReferenceCount,
  }
}

const trackedTextFiles = (workspaceRoot: string): readonly string[] => {
  const result = childProcess.spawnSync("git", ["ls-files"], {
    cwd: workspaceRoot,
    encoding: "utf8",
  })
  if (result.status !== 0 || typeof result.stdout !== "string") return []
  return result.stdout
    .split(/\r?\n/u)
    .map((filePath) => filePath.trim())
    .filter((filePath) =>
      filePath.length > 0
      && !filePath.startsWith(".attune/")
      && !filePath.startsWith("reports/")
      && !filePath.includes("/node_modules/")
      && !/\.(?:png|jpg|jpeg|gif|webp|ico|pdf|sqlite|db|wasm|zip|gz|tgz)$/iu.test(filePath)
    )
}

const safeReadTextFile = (filePath: string): string | undefined => {
  try {
    const stat = fs.statSync(filePath)
    if (!stat.isFile() || stat.size > 2_000_000) return undefined
    const buffer = fs.readFileSync(filePath)
    if (buffer.includes(0)) return undefined
    return buffer.toString("utf8")
  } catch {
    return undefined
  }
}

const legacySubstrateReferenceClass = (
  filePath: string,
): "historical" | "enforcement" | "test-fixture" | "measurement-inventory" | "blocking-live" => {
  if (
    filePath.startsWith("docs/")
    || filePath.startsWith("openspec/")
    || filePath.startsWith(".codex/skills/")
    || filePath === "AGENTS.md"
    || filePath === ".gitignore"
    || filePath === "pnpm-lock.yaml"
    || filePath === "flake.nix"
  ) {
    return "historical"
  }
  if (filePath === "packages/tend/opencode/src/measurement.ts") {
    return "measurement-inventory"
  }
  if (/\/test\/|\.test\.[cm]?tsx?$/u.test(filePath)) {
    return "test-fixture"
  }
  if (
    filePath.startsWith("packages/trellis/architecture/src/")
    || filePath.startsWith("packages/trellis/oxlint-policy/src/")
    || filePath.startsWith("packages/attune/nx/src/")
    || filePath.startsWith("packages/trellis/nx/src/")
    || filePath === "packages/trellis/runtime/src/SqlRoute.ts"
    || filePath === "packages/trellis/runtime/src/MeasurementObservation.ts"
  ) {
    return "enforcement"
  }
  return "blocking-live"
}

const inventoryWithStoreBackedSelectedBaseline = (
  inventory: TraceInventorySummary,
  observations: readonly RecipeObservation[],
): TraceInventorySummary => {
  if (
    inventory.selectedBaselineSession !== undefined
    && selectedBaselineBlockers(inventory.selectedBaselineSession).length === 0
  ) {
    return inventory
  }
  const commandObservations = observations
    .filter((observation) => observation.observationKind === "measurement.command.observed")
    .map(commandProjectionFromObservation)
  const controlledBaselineCommands = controlledBaselineCommandObservations(commandObservations)
  const observationSummaries = observations.map((observation) => ({
    observationId: observation.observationId,
    observationKind: observation.observationKind,
    recipeId: observation.recipeId,
    observedAt: observation.observedAt,
    ...(observation.source === undefined ? {} : { source: observation.source }),
  }))
  const agentMetricsByPhase = latestAgentMetricsByPhase(observations
    .filter((observation) => observation.observationKind === "measurement.agent.metrics.summary")
    .flatMap(agentMetricsProjectionFromObservation))
  const controlledBaseline = controlledBaselineMetricsFromCommands(
    controlledBaselineCommands,
    observationSummaries,
    agentMetricsByPhase.get("baseline"),
  )
  const session = storeBackedBaselineSessionFromCommands(
    inventory,
    controlledBaselineCommands,
    controlledBaseline,
  )
  if (session === undefined || selectedBaselineBlockers(session).length > 0) return inventory
  const candidates = [session, ...inventory.comparableSessionCandidates
    .filter((candidate) => candidate.sessionId !== session.sessionId)]
    .slice(0, comparableSessionCandidateLimit)
  return {
    ...inventory,
    comparableSessionCandidates: candidates,
    selectedBaselineSession: session,
  }
}

const storeBackedBaselineSessionFromCommands = (
  inventory: TraceInventorySummary,
  commands: readonly CommandObservationProjection[],
  metrics: ExperimentRunMetricsProjection | undefined,
): HistoricalSessionSummary | undefined => {
  if (commands.length === 0 || metrics === undefined) return undefined
  const commandFamilies = new Map<string, number>()
  const exitCodes = new Map<string, number>()
  for (const command of commands) {
    increment(commandFamilies, commandTargetIdentity(command) ?? command.inferredRecipeId ?? command.command)
    if (command.inferredRecipeId !== undefined) increment(commandFamilies, command.inferredRecipeId)
    if (command.exitCode !== undefined) increment(exitCodes, String(command.exitCode))
  }
  const allCommandFamilies = topCounts(commandFamilies, commandFamilies.size)
  const matchedSignals = matchedComparableSessionSignals(allCommandFamilies)
  const durationMs = numericSummary(commands.flatMap((command) =>
    command.durationMs === undefined ? [] : [command.durationMs]
  ))
  const startedAt = metrics.startedAt ?? firstTimestamp(commands.flatMap((command) => [command.startedAt, command.observedAt]))
  const completedAt = metrics.completedAt ?? lastTimestamp(commands.flatMap((command) => [command.completedAt, command.observedAt]))
  const exitCodeEvents = [...exitCodes.values()].reduce((sum, count) => sum + count, 0)
  const failedCommands = [...exitCodes.entries()]
    .filter(([code]) => code !== "0")
    .reduce((sum, [, count]) => sum + count, 0)
  const successfulCommands = exitCodes.get("0") ?? 0
  const hasEnoughSamples = commands.length >= 2 && (durationMs.count > 0 || exitCodeEvents > 0)
  const wallTimeMs = metrics.wallTimeMs ?? spanMs(startedAt, completedAt)
  const giantCatchallPenalty = (wallTimeMs ?? 0) > giantCatchallWindowMs
  const scoreReasons = [
    "store-backed controlled baseline phase",
    ...matchedSignals.map((signal) => `matched command signal: ${signal}`),
    `command observations: ${commands.length}`,
    `duration samples: ${durationMs.count}`,
    `exit-code samples: ${exitCodeEvents}`,
    `token/tool aggregate: ${metrics.tokenTotal ?? 0}/${metrics.toolCalls ?? 0}`,
  ]
  const signalScore = matchedSignals.reduce((sum, signal) =>
    sum + (comparableSessionSignals.find((candidate) => candidate.signal === signal)?.weight ?? 0), 0)
  return {
    sessionId: `sha256:${crypto
      .createHash("sha256")
      .update(`store-backed-baseline:${inventory.measurementSessionId}`)
      .digest("hex")
      .slice(0, 16)}`,
    score: signalScore
      + 30
      + (hasEnoughSamples ? 20 : -20)
      + Math.min(15, durationMs.count * 3)
      + Math.min(12, exitCodeEvents * 2)
      + (giantCatchallPenalty ? -35 : 12),
    scoreReasons,
    ...(optionalString("startedAt", startedAt)),
    ...(optionalString("completedAt", completedAt)),
    ...(optionalNumber("wallTimeMs", wallTimeMs)),
    commandEvents: commands.length,
    uniqueCommandFamilies: commandFamilies.size,
    repeatedCommandFamilies: [...commandFamilies.values()].filter((count) => count > 1).length,
    repeatedCommandInvocations: [...commandFamilies.values()]
      .filter((count) => count > 1)
      .reduce((sum, count) => sum + count, 0),
    exitCodeEvents,
    failedCommands,
    successfulCommands,
    ...(optionalNumber("commandSuccessRate", ratio(successfulCommands, exitCodeEvents))),
    expensiveChecks: metrics.expensiveChecks,
    workspacePolicyFastCount: metrics.workspacePolicyFastCount ?? 0,
    durationMs,
    tokenTotal: metrics.tokenTotal ?? 0,
    toolCalls: metrics.toolCalls ?? 0,
    modelIds: [],
    commandFamilies: allCommandFamilies.slice(0, 40),
    exitCodes: topCounts(exitCodes, 20),
    matchedSignals,
    hasAttuneTrellisSignal: matchedSignals.length > 0,
    hasEnoughSamples,
    giantCatchallPenalty,
    privacy: inventory.privacy,
  }
}

const runMeasurementPreflight = async (input: {
  readonly workspaceRoot: string
  readonly reportsDir: string
  readonly measurementSessionId: string
  readonly sink: Awaited<ReturnType<typeof createMeasurementObservationSink>>
  readonly exportOnly: boolean
}): Promise<MeasurementPreflightSummary> => {
  const startedAt = new Date().toISOString()
  const fingerprint = createAttuneOpenCodeFingerprint({
    harness: "tend-opencode",
  })
  const selfTest = runHarnessSelfTest({
    harness: "tend-opencode",
    actualPluginProbe: process.env.ATTUNE_MEASUREMENT_ACTUAL_PLUGIN_PROBE === "1",
  })
  const doctor = runDoctor({
    harness: "tend-opencode",
    runDiagnostics: false,
  })
  const harnessProof = summarizeHarnessProof(selfTest, doctor)
  let storeHealth: MeasurementPreflightSummary["storeHealth"] = {
    checked: !input.exportOnly,
    reachable: input.exportOnly,
    migrated: input.exportOnly,
    sqlRouteValid: input.exportOnly,
    observationSmokeHealthy: input.exportOnly,
    owner: "framework-runtime",
    mode: input.sink.config.mode,
    ...(input.sink.config.databaseUrl.length === 0 ? {} : { databaseUrl: sanitizeDatabaseUrl(input.sink.config.databaseUrl) }),
  }
  let harnessProofObservationId: string | undefined
  let storeHealthObservationId: string | undefined
  let smokeObservationId: string | undefined
  let sessionStartedObservationId: string | undefined

  try {
    if (input.sink.store !== undefined) {
      await Effect.runPromise(input.sink.store.registerRecipe(commandObservationRecipe))
      await Effect.runPromise(input.sink.store.registerRecipe(LocalTimescaleManagedRecipe))
      const harnessObservation = createMeasurementObservation({
        kind: "measurement.harness.proof",
        recipeId: "tend-opencode.command-observation",
        observedAt: startedAt,
        measurementSessionId: input.measurementSessionId,
        source: "tend-opencode.measurement-preflight",
        payload: {
          measurementSessionId: input.measurementSessionId,
          fingerprint: {
            runtimeKind: fingerprint.runtime.runtimeKind,
            flakeProvided: fingerprint.runtime.flakeProvided,
            pluginNames: fingerprint.plugins.map((plugin) => plugin.name),
            capabilities: fingerprint.capabilities,
          },
          harnessProof,
          rawPromptStored: false,
          rawConversationStored: false,
          fullCommandOutputStored: false,
        },
      })
      await Effect.runPromise(recordMeasurementObservation(input.sink, harnessObservation))
      harnessProofObservationId = harnessObservation.observationId

      const smokeObservation = createMeasurementObservation({
        kind: "measurement.harness.proof",
        recipeId: "tend-opencode.command-observation",
        observedAt: new Date().toISOString(),
        measurementSessionId: input.measurementSessionId,
        source: "tend-opencode.measurement-preflight-smoke",
        payload: {
          measurementSessionId: input.measurementSessionId,
          check: "observation-insert-query-smoke",
          storeLifecycleOwner: "framework-runtime",
          rawPromptStored: false,
          rawConversationStored: false,
          fullCommandOutputStored: false,
        },
      })
      await Effect.runPromise(recordMeasurementObservation(input.sink, smokeObservation))
      smokeObservationId = smokeObservation.observationId
      const sessionObservations = await Effect.runPromise(
        measurementObservationsBySession(input.sink.store, input.measurementSessionId),
      )
      const smokeVisible = sessionObservations.some((observation) =>
        observation.observationId === smokeObservation.observationId
      )
      storeHealth = {
        ...storeHealth,
        checked: true,
        reachable: true,
        migrated: true,
        sqlRouteValid: true,
        observationSmokeHealthy: smokeVisible,
      }
      const localTimescaleOutput = localTimescaleLifecycleOutput({
        workspaceRoot: input.workspaceRoot,
        databaseUrlEnv: sanitizeDatabaseUrl(input.sink.config.databaseUrl),
        dataDir: input.sink.config.dataDir,
        storeMode: input.sink.config.mode,
        action: "check",
        runIntegration: true,
      })
      const storeHealthObservedAt = new Date().toISOString()
      const storeHealthBaseObservation = localTimescaleObservation({
        output: localTimescaleOutput,
        observationKind: "local-timescaledb.service-ready",
        observedAt: storeHealthObservedAt,
        source: "tend-opencode.measurement-preflight",
      })
      const storeHealthBasePayload = asRecord(storeHealthBaseObservation.payload) ?? {}
      const storeHealthObservation = {
        ...storeHealthBaseObservation,
        payload: {
          ...storeHealthBasePayload,
          measurementSessionId: input.measurementSessionId,
          lifecycleOwner: "framework-runtime",
          sqlValidation: {
            valid: true,
          },
        },
      }
      await Effect.runPromise(input.sink.store.recordObservation(storeHealthObservation))
      storeHealthObservationId = storeHealthObservation.observationId
      if (harnessProof.fingerprintPassed && harnessProof.selfTestPassed && harnessProof.doctorPassed && smokeVisible) {
        const sessionStarted = createMeasurementObservation({
          kind: "measurement.session.started",
          recipeId: "tend-opencode.command-observation",
          observedAt: new Date().toISOString(),
          measurementSessionId: input.measurementSessionId,
          source: "tend-opencode.measurement-preflight",
          payload: {
            measurementSessionId: input.measurementSessionId,
            preflightOrder: [
              "tend-opencode harness proof",
              "framework-runtime local store health",
              "observation insert/query smoke check",
              "measurement session starts",
            ],
            storeLifecycleOwner: "framework-runtime",
          },
        })
        await Effect.runPromise(recordMeasurementObservation(input.sink, sessionStarted))
        sessionStartedObservationId = sessionStarted.observationId
      }
    }
  } catch (error) {
    storeHealth = {
      ...storeHealth,
      checked: true,
      reachable: false,
      migrated: false,
      sqlRouteValid: false,
      observationSmokeHealthy: false,
      failureSummary: summarizeCommandOutput(error instanceof Error ? error.message : String(error)),
    }
  }

  const completedAt = new Date().toISOString()
  const summary: MeasurementPreflightSummary = {
    measurementSessionId: input.measurementSessionId,
    startedAt,
    completedAt,
    passed: input.exportOnly || (
      harnessProof.fingerprintPassed
      && harnessProof.selfTestPassed
      && harnessProof.doctorPassed
      && storeHealth.reachable
      && storeHealth.migrated
      && storeHealth.sqlRouteValid
      && storeHealth.observationSmokeHealthy
      && sessionStartedObservationId !== undefined
    ),
    exportOnly: input.exportOnly,
    harnessProof,
    storeHealth,
    ...(sessionStartedObservationId === undefined ? {} : { sessionStartedObservationId }),
    ...(harnessProofObservationId === undefined ? {} : { harnessProofObservationId }),
    ...(storeHealthObservationId === undefined ? {} : { storeHealthObservationId }),
    ...(smokeObservationId === undefined ? {} : { smokeObservationId }),
  }
  const cacheExportPath = writePreflightExport(input.workspaceRoot, summary)
  return {
    ...summary,
    cacheExportPath,
  }
}

const summarizeHarnessProof = (
  selfTest: TendOpenCodeHarnessTestOutput,
  doctor: TendOpenCodeDoctorOutput,
): MeasurementPreflightSummary["harnessProof"] => {
  const failedSelfTestChecks = selfTest.checks
    .filter((check) => !check.passed)
    .map((check) => check.name)
  const failedDoctorChecks = doctor.checks
    .filter((check) => !check.ok)
    .map((check) => check.name)
  return {
    fingerprintPassed: selfTest.fingerprint.runtime.flakeProvided
      && selfTest.fingerprint.runtime.runtimeKind === "upstream-opencode"
      && selfTest.fingerprint.plugin.loaded,
    selfTestPassed: selfTest.passed,
    doctorPassed: failedDoctorChecks.length === 0,
    runtimeKind: selfTest.fingerprint.runtime.runtimeKind,
    flakeProvided: selfTest.fingerprint.runtime.flakeProvided,
    pluginNames: selfTest.fingerprint.plugins.map((plugin) => plugin.name),
    failedChecks: [...failedSelfTestChecks, ...failedDoctorChecks],
  }
}

const writePreflightExport = (
  workspaceRoot: string,
  summary: MeasurementPreflightSummary,
): string => {
  const exportDir = path.join(workspaceRoot, ".attune", "cache", "measurement", "opencode")
  fs.mkdirSync(exportDir, { recursive: true })
  const exportPath = path.join(exportDir, "preflight.json")
  fs.writeFileSync(exportPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8")
  return exportPath
}

const writeProjectionReports = (
  reportsDir: string,
  projection: MeasurementReportProjection,
): readonly string[] => [
  writeReport(reportsDir, "historical-baseline.md", renderHistoricalBaseline(projection)),
  writeReport(reportsDir, "command-ladder.md", renderCommandLadder(projection)),
  writeReport(reportsDir, "codex-opencode-micro-experiment.md", renderMicroExperiment(projection)),
  writeReport(reportsDir, "tend-opencode-measurement-report.md", renderMeasurementReport(projection)),
  writeReport(reportsDir, "AGENTS.proposed.md", renderAgentsProposed(projection)),
  writeReport(reportsDir, "trace-inventory-summary.json", `${JSON.stringify({
    inventory: projection.inventory,
    projection: {
      measurementSessionId: projection.measurementSessionId,
      projectedAt: projection.projectedAt,
      observationIds: projection.observationIds,
      observationSummaries: projection.observationSummaries,
      commandObservations: projection.commandObservations,
      agentMetrics: projection.agentMetrics,
      recipeSpineCoverage: projection.recipeSpineCoverage,
      editAttemptSummary: projection.editAttemptSummary,
      legacySubstrateAudit: projection.legacySubstrateAudit,
      traceInventoryObservationIds: projection.traceInventoryObservationIds,
      agentMetricObservationIds: projection.agentMetricObservationIds,
      reportObservationIds: projection.reportObservationIds,
      microExperimentObservationIds: projection.microExperimentObservationIds,
      baselineSessionObservationIds: projection.baselineSessionObservationIds,
      microExperimentSummaries: projection.microExperimentSummaries,
      derivedMicroExperimentSummary: latestMicroExperimentProjection(projection),
      migrationReadinessObservationIds: projection.migrationReadinessObservationIds,
      migrationReadinessSummaries: projection.migrationReadinessSummaries,
      derivedMigrationReadinessSummary: latestMigrationReadinessProjection(projection),
      harnessProofObservationIds: projection.harnessProofObservationIds,
      lifecycleHealthObservationIds: projection.lifecycleHealthObservationIds,
      trellisDiagnosticObservationIds: projection.trellisDiagnosticObservationIds,
      remainingGaps: remainingMeasurementGaps(projection),
    },
  }, null, 2)}\n`),
]

const measurementProjectionFromObservations = (
  fallbackInventory: TraceInventorySummary,
  observations: readonly RecipeObservation[],
): MeasurementReportProjection => {
  const traceInventoryObservations = observations
    .filter((observation) => observation.observationKind === "measurement.trace.inventory.summary")
  const latestTrace = traceInventoryObservations[traceInventoryObservations.length - 1]
  const inventory = traceInventoryFromObservation(latestTrace, fallbackInventory)
  const commandObservations = observations
    .filter((observation) => observation.observationKind === "measurement.command.observed")
    .map(commandProjectionFromObservation)
  const agentMetricObservations = observations
    .filter((observation) => observation.observationKind === "measurement.agent.metrics.summary")
  const agentMetrics = latestAgentMetrics(
    agentMetricObservations.flatMap(agentMetricsProjectionFromObservation),
  )
  const recipeSpineCoverage = latestByObservedAt(observations
    .filter((observation) => observation.observationKind === "measurement.recipe-spine.coverage")
    .flatMap(recipeSpineCoverageProjectionFromObservation))
  const editAttemptSummary = latestByObservedAt(observations
    .filter((observation) => observation.observationKind === "measurement.edit-attempts.summary")
    .flatMap(editAttemptSummaryProjectionFromObservation))
  const legacySubstrateAudit = latestByObservedAt(observations
    .filter((observation) => observation.observationKind === "measurement.legacy-substrate.audit")
    .flatMap(legacySubstrateAuditProjectionFromObservation))
  const microExperimentObservations = observations
    .filter((observation) => observation.observationKind === "measurement.micro-experiment.summary")
  const migrationReadinessObservations = observations
    .filter((observation) => observation.observationKind === "measurement.migration-readiness.summary")

  return {
    measurementSessionId: inventory.measurementSessionId,
    projectedAt: new Date().toISOString(),
    inventory,
    observationIds: observations.map((observation) => observation.observationId),
    observationSummaries: observations.map((observation) => ({
      observationId: observation.observationId,
      observationKind: observation.observationKind,
      recipeId: observation.recipeId,
      observedAt: observation.observedAt,
      ...(observation.source === undefined ? {} : { source: observation.source }),
    })),
    commandObservations,
    agentMetrics,
    ...(recipeSpineCoverage === undefined ? {} : { recipeSpineCoverage }),
    ...(editAttemptSummary === undefined ? {} : { editAttemptSummary }),
    ...(legacySubstrateAudit === undefined ? {} : { legacySubstrateAudit }),
    traceInventoryObservationIds: traceInventoryObservations
      .map((observation) => observation.observationId),
    agentMetricObservationIds: agentMetricObservations
      .map((observation) => observation.observationId),
    reportObservationIds: observations
      .filter((observation) => observation.observationKind === "measurement.report.projected")
      .map((observation) => observation.observationId),
    microExperimentObservationIds: microExperimentObservations
      .map((observation) => observation.observationId),
    microExperimentSummaries: microExperimentObservations
      .map(microExperimentProjectionFromObservation),
    migrationReadinessObservationIds: migrationReadinessObservations
      .map((observation) => observation.observationId),
    migrationReadinessSummaries: migrationReadinessObservations
      .map(migrationReadinessProjectionFromObservation),
    baselineSessionObservationIds: observations
      .filter((observation) =>
        observation.observationKind === "measurement.baseline.session.selected"
        || observation.observationKind === "measurement.baseline.session.summary"
      )
      .map((observation) => observation.observationId),
    harnessProofObservationIds: observations
      .filter((observation) => observation.observationKind === "measurement.harness.proof")
      .map((observation) => observation.observationId),
    lifecycleHealthObservationIds: observations
      .filter((observation) => observation.recipeId === "framework-runtime.local-timescaledb")
      .map((observation) => observation.observationId),
    trellisDiagnosticObservationIds: observations
      .filter((observation) => observation.observationKind === "trellis-language-service.diagnostic-run-summary")
      .map((observation) => observation.observationId),
  }
}

const traceInventoryFromObservation = (
  observation: RecipeObservation | undefined,
  fallback: TraceInventorySummary,
): TraceInventorySummary => {
  if (observation === undefined) return fallback
  const payload = asRecord(observation.payload)
  if (payload === undefined) return fallback
  const comparableSessionCandidates =
    historicalSessionSummaries(payload["comparableSessionCandidates"]) ?? fallback.comparableSessionCandidates
  const selectedBaselineSession =
    historicalSessionSummaryFromValue(payload["selectedBaselineSession"]) ?? fallback.selectedBaselineSession
  return {
    measurementSessionId: stringValue(payload, "measurementSessionId") ?? fallback.measurementSessionId,
    scannedAt: stringValue(payload, "scannedAt") ?? fallback.scannedAt,
    codexHome: stringValue(payload, "codexHome") ?? fallback.codexHome,
    traceFiles: numberValue(payload, "traceFiles") ?? fallback.traceFiles,
    sqliteFiles: numberValue(payload, "sqliteFiles") ?? fallback.sqliteFiles,
    jsonlFiles: numberValue(payload, "jsonlFiles") ?? fallback.jsonlFiles,
    skippedFiles: numberValue(payload, "skippedFiles") ?? fallback.skippedFiles,
    sqliteSchemaFilesInspected: numberValue(payload, "sqliteSchemaFilesInspected")
      ?? fallback.sqliteSchemaFilesInspected,
    sqliteSchemaFilesSkipped: numberValue(payload, "sqliteSchemaFilesSkipped")
      ?? fallback.sqliteSchemaFilesSkipped,
    sqliteSchemas: sqliteSchemaSummaries(payload["sqliteSchemas"]) ?? fallback.sqliteSchemas,
    commandEventCount: numberValue(payload, "commandEventCount") ?? fallback.commandEventCount,
    uniqueCommandFamilies: numberValue(payload, "uniqueCommandFamilies") ?? fallback.uniqueCommandFamilies,
    repeatedCommandFamilyCount: numberValue(payload, "repeatedCommandFamilyCount")
      ?? fallback.repeatedCommandFamilyCount,
    repeatedCommandInvocationCount: numberValue(payload, "repeatedCommandInvocationCount")
      ?? fallback.repeatedCommandInvocationCount,
    exitCodeEventCount: numberValue(payload, "exitCodeEventCount") ?? fallback.exitCodeEventCount,
    failedExitCodeCount: numberValue(payload, "failedExitCodeCount") ?? fallback.failedExitCodeCount,
    timestampRange: timestampRangeFromValue(payload["timestampRange"]) ?? fallback.timestampRange,
    durationMs: numericSummaryFromValue(payload["durationMs"]) ?? fallback.durationMs,
    commandFamilies: countRecords(payload["commandFamilies"]) ?? fallback.commandFamilies,
    repeatedCommandPatterns: countRecords(payload["repeatedCommandPatterns"]) ?? fallback.repeatedCommandPatterns,
    exitCodes: countRecords(payload["exitCodes"]) ?? fallback.exitCodes,
    comparableSessionCandidates,
    ...(optionalHistoricalSession("selectedBaselineSession", selectedBaselineSession)),
    toolCalls: numberValue(payload, "toolCalls") ?? fallback.toolCalls,
    tokenTotal: numberValue(payload, "tokenTotal") ?? fallback.tokenTotal,
    modelIds: countRecords(payload["modelIds"]) ?? fallback.modelIds,
    sessionIds: countRecords(payload["sessionIds"]) ?? fallback.sessionIds,
    privacy: measurementPrivacySummary(),
  }
}

const commandProjectionFromObservation = (
  observation: RecipeObservation,
): CommandObservationProjection => {
  const payload = asRecord(observation.payload)
  return {
    observationId: observation.observationId,
    observedAt: observation.observedAt,
    command: payload === undefined
      ? observation.observationKind
      : stringValue(payload, "command") ?? observation.observationKind,
    ...(payload === undefined ? {} : optionalNumber("durationMs", numberValue(payload, "durationMs"))),
    ...(payload === undefined ? {} : optionalNumber("exitCode", numberValue(payload, "exitCode"))),
    ...(payload === undefined ? {} : optionalString("startedAt", stringValue(payload, "startedAt"))),
    ...(payload === undefined ? {} : optionalString("completedAt", stringValue(payload, "completedAt"))),
    ...(payload === undefined ? {} : optionalMeasurementPhase("measurementPhase", measurementPhaseValue(payload))),
    ...(payload === undefined ? {} : optionalString("knownNxTarget", stringValue(payload, "knownNxTarget"))),
    ...(payload === undefined ? {} : optionalString("targetId", stringValue(payload, "targetId"))),
    ...(payload === undefined ? {} : optionalString("inferredRecipeId", stringValue(payload, "inferredRecipeId"))),
    ...(payload === undefined ? {} : optionalNumber("tokenTotal", numberValue(payload, "tokenTotal"))),
    ...(payload === undefined ? {} : optionalNumber("toolCalls", numberValue(payload, "toolCalls"))),
    ...(payload === undefined ? {} : optionalString("tokenMetricSource", stringValue(payload, "tokenMetricSource"))),
    ...(payload === undefined ? {} : optionalString("status", stringValue(payload, "status"))),
    storeEmissionStatus: "emitted",
  }
}

const agentMetricsProjectionFromObservation = (
  observation: RecipeObservation,
): readonly AgentMetricsProjection[] => {
  const payload = asRecord(observation.payload)
  const measurementPhase = agentMetricsPhaseValue(payload)
  const capturedAt = stringValue(payload, "capturedAt")
  const source = stringValue(payload, "source")
  const tokenTotal = numberValue(payload, "tokenTotal")
  const toolCalls = numberValue(payload, "toolCalls")
  const sampleCount = numberValue(payload, "sampleCount")
  const traceFilesScanned = numberValue(payload, "traceFilesScanned")
  const windowCount = numberValue(payload, "windowCount")
  const tokenMetricSource = stringValue(payload, "tokenMetricSource")
  if (
    measurementPhase === undefined
    || capturedAt === undefined
    || source === undefined
    || tokenTotal === undefined
    || toolCalls === undefined
    || sampleCount === undefined
    || traceFilesScanned === undefined
    || windowCount === undefined
    || tokenMetricSource === undefined
  ) {
    return []
  }
  return [{
    observationId: observation.observationId,
    measurementPhase,
    capturedAt,
    source,
    tokenTotal,
    toolCalls,
    sampleCount,
    traceFilesScanned,
    windowCount,
    ...(optionalString("startedAt", stringValue(payload, "startedAt"))),
    ...(optionalString("completedAt", stringValue(payload, "completedAt"))),
    tokenMetricSource,
  }]
}

const recipeSpineCoverageProjectionFromObservation = (
  observation: RecipeObservation,
): readonly RecipeSpineCoverageProjection[] => {
  const payload = asRecord(observation.payload)
  const capturedAt = stringValue(payload, "capturedAt")
  const recipeCount = numberValue(payload, "recipeCount")
  const edgeCount = numberValue(payload, "edgeCount")
  const ioCount = numberValue(payload, "ioCount")
  const runCount = numberValue(payload, "runCount")
  const receiptCount = numberValue(payload, "receiptCount")
  const observationCount = numberValue(payload, "observationCount")
  const diagnosticCount = numberValue(payload, "diagnosticCount")
  const repairCount = numberValue(payload, "repairCount")
  const healthCount = numberValue(payload, "healthCount")
  const frameworkSchemasPreserved = booleanValue(payload, "frameworkSchemasPreserved")
  const observationStore = stringValue(payload, "observationStore")
  if (
    capturedAt === undefined
    || recipeCount === undefined
    || edgeCount === undefined
    || ioCount === undefined
    || runCount === undefined
    || receiptCount === undefined
    || observationCount === undefined
    || diagnosticCount === undefined
    || repairCount === undefined
    || healthCount === undefined
    || frameworkSchemasPreserved === undefined
    || observationStore !== "framework_event.recipe_observation"
  ) return []
  return [{
    capturedAt,
    recipeCount,
    edgeCount,
    ioCount,
    runCount,
    receiptCount,
    observationCount,
    diagnosticCount,
    repairCount,
    healthCount,
    frameworkSchemasPreserved,
    observationStore,
  }]
}

const editAttemptSummaryProjectionFromObservation = (
  observation: RecipeObservation,
): readonly EditAttemptSummaryProjection[] => {
  const payload = asRecord(observation.payload)
  const capturedAt = stringValue(payload, "capturedAt")
  const dirtyPathCount = numberValue(payload, "dirtyPathCount")
  const sourceEditCount = numberValue(payload, "sourceEditCount")
  const reportExportEditCount = numberValue(payload, "reportExportEditCount")
  const generatedPrivateLedgerEditAttempts = numberValue(payload, "generatedPrivateLedgerEditAttempts")
  const generatedPrivateLedgerPathClasses = stringArray(payload?.["generatedPrivateLedgerPathClasses"])
  if (
    capturedAt === undefined
    || dirtyPathCount === undefined
    || sourceEditCount === undefined
    || reportExportEditCount === undefined
    || generatedPrivateLedgerEditAttempts === undefined
    || generatedPrivateLedgerPathClasses === undefined
  ) return []
  return [{
    capturedAt,
    dirtyPathCount,
    sourceEditCount,
    reportExportEditCount,
    generatedPrivateLedgerEditAttempts,
    generatedPrivateLedgerPathClasses,
  }]
}

const legacySubstrateAuditProjectionFromObservation = (
  observation: RecipeObservation,
): readonly LegacySubstrateAuditProjection[] => {
  const payload = asRecord(observation.payload)
  const capturedAt = stringValue(payload, "capturedAt")
  const scannedPathCount = numberValue(payload, "scannedPathCount")
  const historicalReferenceCount = numberValue(payload, "historicalReferenceCount")
  const enforcementReferenceCount = numberValue(payload, "enforcementReferenceCount")
  const testFixtureReferenceCount = numberValue(payload, "testFixtureReferenceCount")
  const measurementInventoryReferenceCount = numberValue(payload, "measurementInventoryReferenceCount")
  const blockingLiveReferenceCount = numberValue(payload, "blockingLiveReferenceCount")
  if (
    capturedAt === undefined
    || scannedPathCount === undefined
    || historicalReferenceCount === undefined
    || enforcementReferenceCount === undefined
    || testFixtureReferenceCount === undefined
    || measurementInventoryReferenceCount === undefined
    || blockingLiveReferenceCount === undefined
  ) return []
  return [{
    capturedAt,
    scannedPathCount,
    historicalReferenceCount,
    enforcementReferenceCount,
    testFixtureReferenceCount,
    measurementInventoryReferenceCount,
    blockingLiveReferenceCount,
  }]
}

const migrationReadinessProjectionFromObservation = (
  observation: RecipeObservation,
): MigrationReadinessProjection => {
  const payload = asRecord(observation.payload)
  return {
    ...(optionalString("summarizedAt", stringValue(payload, "summarizedAt"))),
    proceedToRecipeOnlyMigration: false,
    gates: migrationReadinessGatesFromValue(payload?.["gates"]),
  }
}

const baselineSessionSelectionPayload = (
  inventory: TraceInventorySummary,
  selectedAt: string,
  selectionMethod: string,
): Record<string, unknown> => {
  const selectedSession = inventory.selectedBaselineSession
  if (selectedSession === undefined) {
    throw new Error("Cannot emit selected baseline observation without a selected baseline session.")
  }
  return {
    schemaVersion: 1,
    measurementSessionId: inventory.measurementSessionId,
    selectedAt,
    selectedSessionId: selectedSession.sessionId,
    score: selectedSession.score,
    scoreReasons: selectedSession.scoreReasons,
    candidateCount: inventory.comparableSessionCandidates.length,
    selectionMethod,
    selectedSession,
    privacy: inventory.privacy,
  }
}

const createMicroExperimentSummaryPayload = (
  inventory: TraceInventorySummary,
  observations: readonly RecipeObservation[],
): Record<string, unknown> => {
  const commandObservations = observations
    .filter((observation) => observation.observationKind === "measurement.command.observed")
    .map(commandProjectionFromObservation)
  const trellisDiagnosticCount = observations
    .filter((observation) => observation.observationKind === "trellis-language-service.diagnostic-run-summary")
    .length
  const observationSummaries = observations.map((observation) => ({
    observationId: observation.observationId,
    observationKind: observation.observationKind,
    recipeId: observation.recipeId,
    observedAt: observation.observedAt,
    ...(observation.source === undefined ? {} : { source: observation.source }),
  }))
  const controlledBaselineCommands = controlledBaselineCommandObservations(commandObservations)
  const treatmentCommands = treatmentCommandObservations(commandObservations)
  const agentMetrics = observations
    .filter((observation) => observation.observationKind === "measurement.agent.metrics.summary")
    .flatMap(agentMetricsProjectionFromObservation)
  const agentMetricsByPhase = latestAgentMetricsByPhase(agentMetrics)
  const aggregateBaseline = baselineMetricsFromInventory(inventory)
  const controlledBaseline = controlledBaselineMetricsFromCommands(
    controlledBaselineCommands,
    observationSummaries,
    agentMetricsByPhase.get("baseline"),
  )
  const baseline = controlledBaseline ?? aggregateBaseline
  const selectedBaseline = selectedBaselineMetricsFromSession(inventory.selectedBaselineSession)
  const treatment = treatmentMetricsFromCommands(
    treatmentCommands,
    trellisDiagnosticCount,
    observationSummaries,
    agentMetricsByPhase.get("treatment"),
  )
  const findingQualityMatrix = findingQualityRows(trellisDiagnosticCount, treatmentCommands, observationSummaries)
  const evidenceGaps = microExperimentEvidenceGaps(
    trellisDiagnosticCount,
    treatmentCommands,
    inventory.selectedBaselineSession,
    controlledBaseline,
    treatment,
  )
  return {
    schemaVersion: 1,
    measurementSessionId: inventory.measurementSessionId,
    summarizedAt: new Date().toISOString(),
    task: "Analyze packages/trellis/language-service migration readiness for recipe-only source migration",
    baseline,
    ...(inventory.selectedBaselineSession === undefined ? {} : {
      selectedBaselineSession: inventory.selectedBaselineSession,
    }),
    ...(selectedBaseline === undefined ? {} : {
      selectedBaseline,
      selectedBaselineComparison: experimentComparison(selectedBaseline, treatment, findingQualityMatrix),
    }),
    treatment,
    comparison: experimentComparison(baseline, treatment, findingQualityMatrix),
    findingQualityMatrix,
    recommendation: {
      proceedToRecipeOnlyMigration: false,
      summary: evidenceGaps.length === 0
        ? "Keep the heavy recipe-only migration paused until a human reviews the measured treatment result."
        : "Do not start the heavy recipe-only migration until the DB-backed treatment evidence gaps are closed.",
      evidenceGaps,
    },
    privacy: inventory.privacy,
  }
}

const baselineMetricsFromInventory = (
  inventory: TraceInventorySummary,
): ExperimentRunMetricsProjection => {
  const successfulCommands = inventory.exitCodes
    .filter((item) => item.value === "0")
    .reduce((sum, item) => sum + item.count, 0)
  const sqliteSchemaTables = inventory.sqliteSchemas.reduce((sum, schema) => sum + schema.tableCount, 0)
  return {
    mode: "baseline",
    fileReads: inventory.traceFiles,
    shellCommands: inventory.commandEventCount,
    repeatedCommands: inventory.repeatedCommandInvocationCount,
    failedCommands: inventory.failedExitCodeCount,
    expensiveChecks: expensiveCommandCount(inventory.commandFamilies),
    workspacePolicyFastCount: inventory.commandFamilies
      .filter((item) => item.value.includes("workspace:policy-fast"))
      .reduce((sum, item) => sum + item.count, 0),
    ...(optionalString("startedAt", inventory.timestampRange.earliest)),
    ...(optionalString("completedAt", inventory.timestampRange.latest)),
    ...(optionalNumber("wallTimeMs", inventory.timestampRange.spanMs)),
    rawContextBytes: 0,
    tokenTotal: inventory.tokenTotal,
    toolCalls: inventory.toolCalls,
    successfulCommands,
    knownExitCodeCommands: inventory.exitCodeEventCount,
    ...(optionalNumber("commandSuccessRate", ratio(successfulCommands, inventory.exitCodeEventCount))),
    ...(optionalNumber("commandFailureRate", ratio(inventory.failedExitCodeCount, inventory.exitCodeEventCount))),
    durationSampleCount: inventory.durationMs.count,
    ...(optionalNumber("durationTotalMs", nonZeroNumber(inventory.durationMs.total))),
    ...(optionalNumber("durationAverageMs", inventory.durationMs.average)),
    ...(optionalNumber("durationMinMs", inventory.durationMs.min)),
    ...(optionalNumber("durationMaxMs", inventory.durationMs.max)),
    ...(optionalNumber("durationP50Ms", inventory.durationMs.p50)),
    ...(optionalNumber("durationP95Ms", inventory.durationMs.p95)),
    traceFiles: inventory.traceFiles,
    jsonlFiles: inventory.jsonlFiles,
    sqliteFiles: inventory.sqliteFiles,
    sqliteSchemaTables,
    uniqueModels: inventory.modelIds.length,
    uniqueSessions: inventory.sessionIds.length,
    uniqueCommandFamilies: inventory.uniqueCommandFamilies,
    repeatedCommandFamilies: inventory.repeatedCommandFamilyCount,
    ...(optionalString("topCommandFamily", inventory.commandFamilies[0]?.value)),
    ...(optionalString("topExitCode", inventory.exitCodes[0]?.value)),
    findingQuality: "candidate historical trace metadata only",
  }
}

const selectedBaselineMetricsFromSession = (
  session: HistoricalSessionSummary | undefined,
): ExperimentRunMetricsProjection | undefined => {
  if (session === undefined) return undefined
  return {
    mode: "baseline",
    ...(optionalString("startedAt", session.startedAt)),
    ...(optionalString("completedAt", session.completedAt)),
    ...(optionalNumber("wallTimeMs", session.wallTimeMs)),
    fileReads: 0,
    shellCommands: session.commandEvents,
    repeatedCommands: session.repeatedCommandInvocations,
    failedCommands: session.failedCommands,
    expensiveChecks: session.expensiveChecks,
    workspacePolicyFastCount: session.workspacePolicyFastCount,
    ...(optionalNumber("timeToUsefulDiagnosticMs", session.timeToFirstUsefulDiagnosticMs)),
    rawContextBytes: 0,
    tokenTotal: session.tokenTotal,
    toolCalls: session.toolCalls,
    successfulCommands: session.successfulCommands,
    knownExitCodeCommands: session.exitCodeEvents,
    ...(optionalNumber("commandSuccessRate", session.commandSuccessRate)),
    ...(optionalNumber("commandFailureRate", ratio(session.failedCommands, session.exitCodeEvents))),
    durationSampleCount: session.durationMs.count,
    ...(optionalNumber("durationTotalMs", nonZeroNumber(session.durationMs.total))),
    ...(optionalNumber("durationAverageMs", session.durationMs.average)),
    ...(optionalNumber("durationMinMs", session.durationMs.min)),
    ...(optionalNumber("durationMaxMs", session.durationMs.max)),
    ...(optionalNumber("durationP50Ms", session.durationMs.p50)),
    ...(optionalNumber("durationP95Ms", session.durationMs.p95)),
    traceFiles: 0,
    jsonlFiles: 0,
    sqliteFiles: 0,
    sqliteSchemaTables: 0,
    uniqueModels: session.modelIds.length,
    uniqueSessions: 1,
    uniqueCommandFamilies: session.uniqueCommandFamilies,
    repeatedCommandFamilies: session.repeatedCommandFamilies,
    ...(optionalString("topCommandFamily", session.commandFamilies[0]?.value)),
    ...(optionalString("topExitCode", session.exitCodes[0]?.value)),
    findingQuality: selectedBaselineStrength(session),
  }
}

const treatmentMetricsFromCommands = (
  commands: readonly CommandObservationProjection[],
  trellisDiagnosticCount: number,
  observations: readonly ObservationSummaryProjection[],
  agentMetrics?: AgentMetricsProjection,
): ExperimentRunMetricsProjection => {
  const summary = commandLadderSummary(commands)
  const durations = numericSummary(commands.flatMap((command) =>
    command.durationMs === undefined ? [] : [command.durationMs]
  ))
  const successfulCommands = commands.filter((command) => command.exitCode === 0).length
  const knownExitCodeCommands = commands.filter((command) => command.exitCode !== undefined).length
  const firstCommandAt = firstTimestamp(commands.flatMap((command) => [command.startedAt, command.observedAt]))
  const lastCommandAt = lastTimestamp(commands.flatMap((command) => [command.completedAt, command.observedAt]))
  const commandTokenTotals = commands.flatMap((command) =>
    command.tokenTotal === undefined ? [] : [command.tokenTotal]
  )
  const commandToolCalls = commands.flatMap((command) =>
    command.toolCalls === undefined ? [] : [command.toolCalls]
  )
  const metrics: ExperimentRunMetricsProjection = {
    mode: "treatment",
    fileReads: 0,
    shellCommands: commands.length,
    repeatedCommands: summary.repeated.reduce((sum, item) => sum + item.count, 0),
    failedCommands: summary.failed,
    expensiveChecks: summary.expensive + summary.finalGate,
    workspacePolicyFastCount: commands
      .filter((command) => command.knownNxTarget === "workspace:policy-fast")
      .length,
    rawContextBytes: 0,
    successfulCommands,
    knownExitCodeCommands,
    durationSampleCount: durations.count,
    cheapCommands: summary.cheap,
    mediumCommands: summary.medium,
    finalGateCommands: summary.finalGate,
    workspaceWideCommands: summary.workspaceWide,
    unknownTargetCommands: commands.filter((command) => !knownIdentity(commandTargetIdentity(command))).length,
    unknownRecipeCommands: commands.filter((command) => !knownIdentity(command.inferredRecipeId)).length,
    storeEmittedCommands: commands.filter((command) => command.storeEmissionStatus === "emitted").length,
    uniqueTargets: new Set(commands.map(commandTargetIdentity).filter(knownIdentity)).size,
    uniqueRecipes: new Set(commands.map((command) => command.inferredRecipeId).filter(knownIdentity)).size,
    trellisDiagnosticObservations: trellisDiagnosticCount,
    observationInputCount: observations.length,
    findingQuality: trellisDiagnosticCount > 0
      ? "diagnostic-observation-backed treatment"
      : "missing trellis-ls diagnostic observation",
  }
  assignOptionalString(metrics, "startedAt", firstCommandAt)
  assignOptionalString(metrics, "completedAt", lastCommandAt)
  assignOptionalNumber(metrics, "wallTimeMs", spanMs(firstCommandAt, lastCommandAt))
  assignOptionalNumber(metrics, "timeToUsefulDiagnosticMs", timeToUsefulDiagnosticMs(observations, commands))
  assignOptionalNumber(metrics, "tokenTotal", optionalSum(commandTokenTotals) ?? agentMetrics?.tokenTotal)
  assignOptionalNumber(metrics, "toolCalls", optionalSum(commandToolCalls) ?? agentMetrics?.toolCalls)
  assignOptionalString(metrics, "tokenMetricSource", commandTokenTotals.length > 0 || commandToolCalls.length > 0
    ? "command-output-json"
    : agentMetrics?.tokenMetricSource)
  assignOptionalNumber(metrics, "agentMetricSampleCount", agentMetrics?.sampleCount)
  assignOptionalNumber(metrics, "agentMetricTraceFilesScanned", agentMetrics?.traceFilesScanned)
  assignOptionalNumber(metrics, "agentMetricWindowCount", agentMetrics?.windowCount)
  assignOptionalNumber(metrics, "commandSuccessRate", ratio(successfulCommands, knownExitCodeCommands))
  assignOptionalNumber(metrics, "commandFailureRate", ratio(summary.failed, knownExitCodeCommands))
  assignOptionalNumber(metrics, "durationTotalMs", nonZeroNumber(durations.total))
  assignOptionalNumber(metrics, "durationAverageMs", durations.average)
  assignOptionalNumber(metrics, "durationMinMs", durations.min)
  assignOptionalNumber(metrics, "durationMaxMs", durations.max)
  assignOptionalNumber(metrics, "durationP50Ms", durations.p50)
  assignOptionalNumber(metrics, "durationP95Ms", durations.p95)
  assignOptionalString(metrics, "firstObservedAt", firstCommandAt)
  assignOptionalString(metrics, "lastObservedAt", lastCommandAt)
  assignOptionalNumber(metrics, "observedCommandSpanMs", spanMs(firstCommandAt, lastCommandAt))
  return metrics
}

const controlledBaselineMetricsFromCommands = (
  commands: readonly CommandObservationProjection[],
  observations: readonly ObservationSummaryProjection[],
  agentMetrics?: AgentMetricsProjection,
): ExperimentRunMetricsProjection | undefined => {
  if (commands.length === 0) return undefined
  const metrics = treatmentMetricsFromCommands(commands, 0, observations, agentMetrics)
  return {
    ...metrics,
    mode: "baseline",
    trellisDiagnosticObservations: 0,
    findingQuality: "controlled baseline command observations",
  }
}

const experimentComparison = (
  baseline: ExperimentRunMetricsProjection,
  treatment: ExperimentRunMetricsProjection,
  findingQualityMatrix: readonly FindingQualityRow[],
): Record<string, number | string | undefined> => ({
  shellCommandDelta: treatment.shellCommands - baseline.shellCommands,
  repeatedCommandDelta: treatment.repeatedCommands - baseline.repeatedCommands,
  failedCommandDelta: treatment.failedCommands - baseline.failedCommands,
  expensiveCheckDelta: treatment.expensiveChecks - baseline.expensiveChecks,
  timeToUsefulDiagnosticDeltaMs: delta(treatment.timeToUsefulDiagnosticMs, baseline.timeToUsefulDiagnosticMs),
  rawContextByteDelta: (treatment.rawContextBytes ?? 0) - (baseline.rawContextBytes ?? 0),
  wallTimeDeltaMs: delta(treatment.wallTimeMs, baseline.wallTimeMs),
  successfulCommandDelta: delta(treatment.successfulCommands, baseline.successfulCommands),
  commandSuccessRateDelta: delta(treatment.commandSuccessRate, baseline.commandSuccessRate),
  durationAverageDeltaMs: delta(treatment.durationAverageMs, baseline.durationAverageMs),
  tokenDelta: delta(treatment.tokenTotal, baseline.tokenTotal),
  toolCallDelta: delta(treatment.toolCalls, baseline.toolCalls),
  findingQualitySummary: findingQualityMatrix
    .map((row) => `${row.finding}: ${row.baseline}->${row.treatment}`)
    .join("; "),
})

const selectedBaselineStrength = (
  session: HistoricalSessionSummary,
): string => {
  const blockers = selectedBaselineBlockers(session)
  if (blockers.length === 0) {
    return `selected comparable historical session; signals=${session.matchedSignals.join(", ") || "none"}`
  }
  return `weak selected historical session; ${blockers.join("; ")}`
}

const selectedBaselineBlockers = (
  session: HistoricalSessionSummary,
): readonly string[] => {
  const blockers: string[] = []
  if (!session.hasAttuneTrellisSignal) blockers.push("no Attune/Trellis LS signal")
  if (!session.hasEnoughSamples) blockers.push("limited samples")
  if (session.giantCatchallPenalty) blockers.push("giant catchall window")
  if (session.tokenTotal === 0 || session.toolCalls === 0) blockers.push("missing non-zero token/tool metrics")
  return blockers
}

const findingQualityRows = (
  trellisDiagnosticCount: number,
  commands: readonly CommandObservationProjection[],
  observations: readonly ObservationSummaryProjection[],
): readonly FindingQualityRow[] => {
  const hasLsDiagnostics = trellisDiagnosticCount > 0
  const hasFrameworkLsChecks = commands.some((command) =>
    command.knownNxTarget?.startsWith("framework-language-service:") ?? false
  )
  const hasRecipeSubstrate = commands.some((command) =>
    command.knownNxTarget === "workspace:recipe-substrate-check"
  )
  const observationKinds = new Set(observations.map((observation) => observation.observationKind))
  const hasFixSummary = observationKinds.has("trellis-language-service.fix-list-summary")
  const hasApplyEvidence = [
    "trellis-language-service.apply-result-summary",
    "trellis-language-service.apply-diff-summary",
    "trellis-language-service.upstream-quickfix-application",
    "trellis-language-service.applied-fix-summary",
    "trellis-language-service.nx-repair-result",
    "trellis-language-service.generated-freshness-repair-result",
  ].some((kind) => observationKinds.has(kind))
  const hasTrellisLsMigrationLadder = hasLsDiagnostics && hasFixSummary && hasApplyEvidence
  return [
    {
      finding: "authored attune.package.ts debt",
      baseline: "partial",
      treatment: hasLsDiagnostics ? "hit" : "not-measured",
      evidence: hasLsDiagnostics
        ? "Trellis diagnostics were emitted into the framework observation store."
        : "No Trellis diagnostic observation was projected for this session.",
    },
    {
      finding: "CLI-owned diagnostic/fix ontology",
      baseline: "partial",
      treatment: hasLsDiagnostics ? "hit" : "not-measured",
      evidence: hasLsDiagnostics
        ? "Trellis LS diagnostic summary is store-backed rather than private-ledger backed."
        : "Treatment diagnostics have not been stored yet.",
    },
    {
      finding: "recipes not yet single authored declarations",
      baseline: "partial",
      treatment: hasRecipeSubstrate && hasFixSummary ? "hit" : hasRecipeSubstrate ? "partial" : "not-measured",
      evidence: hasRecipeSubstrate && hasFixSummary
        ? "Recipe substrate check and Trellis fix summaries were both observed in the shared store."
        : hasRecipeSubstrate
        ? "Recipe substrate check was observed, but Trellis fix summaries were missing."
        : "Recipe substrate check observation is missing.",
    },
    {
      finding: "missing repair coverage",
      baseline: "partial",
      treatment: hasApplyEvidence ? "hit" : hasFrameworkLsChecks ? "partial" : "not-measured",
      evidence: hasApplyEvidence
        ? "Trellis LS apply/repair evidence, including diff-mode acceptance, was stored."
        : hasFrameworkLsChecks
        ? "Framework language-service checks were observed, but apply/repair evidence is missing."
        : "Framework language-service command observations are missing.",
    },
    {
      finding: "trellis-ls as migration machine",
      baseline: "miss",
      treatment: hasTrellisLsMigrationLadder ? "hit" : hasLsDiagnostics ? "partial" : "not-measured",
      evidence: hasTrellisLsMigrationLadder
        ? "Executable Trellis LS diagnostics, fixes, and apply evidence were emitted into the shared sink."
        : hasLsDiagnostics
        ? "Trellis LS diagnostics were stored, but fixes/apply evidence is incomplete."
        : "No executable Trellis LS diagnostic observation was stored.",
    },
  ]
}

const microExperimentEvidenceGaps = (
  trellisDiagnosticCount: number,
  commands: readonly CommandObservationProjection[],
  selectedBaselineSession: HistoricalSessionSummary | undefined,
  controlledBaseline: ExperimentRunMetricsProjection | undefined,
  treatment: ExperimentRunMetricsProjection,
): readonly string[] => {
  const gaps: string[] = []
  if (trellisDiagnosticCount === 0) {
    gaps.push("Store a Trellis LS diagnostic observation for packages/trellis/language-service.")
  }
  for (const target of [
    "framework-language-service:typecheck",
    "framework-language-service:test",
    "tend-opencode:test",
    "workspace:recipe-substrate-check",
  ]) {
    if (!commands.some((command) => command.knownNxTarget === target)) {
      gaps.push(`Observe ${target} through tend-opencode observe in this measurement session.`)
    }
  }
  if (commands.some((command) => command.knownNxTarget === "workspace:policy-fast")) {
    gaps.push("workspace:policy-fast was measured; confirm it was intentionally in scope.")
  }
  if (controlledBaseline !== undefined) {
    if (controlledBaseline.unknownTargetCommands !== undefined && controlledBaseline.unknownTargetCommands > 0) {
      gaps.push("Controlled baseline command observations have unknown target identity.")
    }
    if (controlledBaseline.unknownRecipeCommands !== undefined && controlledBaseline.unknownRecipeCommands > 0) {
      gaps.push("Controlled baseline command observations have unknown recipe identity.")
    }
    if (controlledBaseline.tokenTotal === undefined || controlledBaseline.toolCalls === undefined) {
      gaps.push("Controlled baseline command observations are missing token/tool metrics.")
    }
  } else if (selectedBaselineSession === undefined) {
    gaps.push("Record one controlled baseline command phase or select one comparable historical baseline session before the migration repeat.")
  }
  if (selectedBaselineSession !== undefined) {
    if (!selectedBaselineSession.hasAttuneTrellisSignal) {
      gaps.push("Selected baseline session lacks Attune/Trellis LS command-family signals.")
    }
    if (!selectedBaselineSession.hasEnoughSamples) {
      gaps.push("Selected baseline session has too few command, duration, or exit-code samples.")
    }
    if (selectedBaselineSession.giantCatchallPenalty) {
      gaps.push("Selected baseline session looks like a giant catchall session rather than a bounded repeat.")
    }
    if (selectedBaselineSession.tokenTotal === 0 || selectedBaselineSession.toolCalls === 0) {
      gaps.push("Selected baseline session is missing non-zero token/tool metrics.")
    }
  }
  if (treatment.tokenTotal === undefined || treatment.toolCalls === undefined) {
    gaps.push("Treatment command observations are missing safe token/tool metrics.")
  }
  return gaps
}

const microExperimentProjectionFromObservation = (
  observation: RecipeObservation,
): MicroExperimentProjection => {
  const payload = asRecord(observation.payload)
  const baseline = experimentMetricsFromRecord(asRecord(payload?.["baseline"]))
  const selectedBaseline = experimentMetricsFromRecord(asRecord(payload?.["selectedBaseline"]))
  const selectedBaselineSession = historicalSessionSummaryFromValue(payload?.["selectedBaselineSession"])
  const treatment = experimentMetricsFromRecord(asRecord(payload?.["treatment"]))
  const comparison = comparisonFromRecord(asRecord(payload?.["comparison"]))
  const selectedBaselineComparison = comparisonFromRecord(asRecord(payload?.["selectedBaselineComparison"]))
  const recommendation = recommendationFromRecord(asRecord(payload?.["recommendation"]))
  return {
    ...(payload === undefined ? {} : optionalString("summarizedAt", stringValue(payload, "summarizedAt"))),
    ...(payload === undefined ? {} : optionalString("task", stringValue(payload, "task"))),
    ...(baseline === undefined ? {} : { baseline }),
    ...(selectedBaseline === undefined ? {} : { selectedBaseline }),
    ...(selectedBaselineSession === undefined ? {} : { selectedBaselineSession }),
    ...(treatment === undefined ? {} : { treatment }),
    ...(comparison === undefined ? {} : { comparison }),
    ...(selectedBaselineComparison === undefined ? {} : { selectedBaselineComparison }),
    findingQualityMatrix: findingQualityRowsFromValue(payload?.["findingQualityMatrix"]),
    ...(recommendation === undefined ? {} : { recommendation }),
  }
}

const latestMicroExperimentProjection = (
  projection: MeasurementReportProjection,
): MicroExperimentProjection => {
  const stored = projection.microExperimentSummaries[projection.microExperimentSummaries.length - 1]
  if (stored !== undefined) return stored
  const controlledBaselineCommands = controlledBaselineCommandObservations(projection.commandObservations)
  const treatmentCommands = treatmentCommandObservations(projection.commandObservations)
  const agentMetricsByPhase = latestAgentMetricsByPhase(projection.agentMetrics)
  const controlledBaseline = controlledBaselineMetricsFromCommands(
    controlledBaselineCommands,
    projection.observationSummaries,
    agentMetricsByPhase.get("baseline"),
  )
  const baseline = controlledBaseline ?? baselineMetricsFromInventory(projection.inventory)
  const treatment = treatmentMetricsFromCommands(
    treatmentCommands,
    projection.trellisDiagnosticObservationIds.length,
    projection.observationSummaries,
    agentMetricsByPhase.get("treatment"),
  )
  const findingQualityMatrix = findingQualityRows(
    projection.trellisDiagnosticObservationIds.length,
    treatmentCommands,
    projection.observationSummaries,
  )
  const evidenceGaps = microExperimentEvidenceGaps(
    projection.trellisDiagnosticObservationIds.length,
    treatmentCommands,
    projection.inventory.selectedBaselineSession,
    controlledBaseline,
    treatment,
  )
  const selectedBaseline = selectedBaselineMetricsFromSession(projection.inventory.selectedBaselineSession)
  return {
    summarizedAt: projection.projectedAt,
    task: "Derived report projection from currently available DB observations",
    baseline,
    ...(projection.inventory.selectedBaselineSession === undefined ? {} : {
      selectedBaselineSession: projection.inventory.selectedBaselineSession,
    }),
    ...(selectedBaseline === undefined ? {} : {
      selectedBaseline,
      selectedBaselineComparison: experimentComparison(selectedBaseline, treatment, findingQualityMatrix),
    }),
    treatment,
    comparison: experimentComparison(baseline, treatment, findingQualityMatrix),
    findingQualityMatrix,
    recommendation: {
      proceedToRecipeOnlyMigration: false,
      summary: evidenceGaps.length === 0
        ? "Derived projection has the required treatment evidence, but no stored micro-experiment summary row was present."
        : "Do not start the heavy recipe-only migration until the derived projection evidence gaps are closed.",
      evidenceGaps,
    },
  }
}

const latestAgentMetricsByPhase = (
  metrics: readonly AgentMetricsProjection[],
): ReadonlyMap<AgentMetricsProjection["measurementPhase"], AgentMetricsProjection> => {
  const latest = new Map<AgentMetricsProjection["measurementPhase"], AgentMetricsProjection>()
  for (const metric of [...metrics].sort((left, right) =>
    left.capturedAt.localeCompare(right.capturedAt)
      || (left.observationId ?? "").localeCompare(right.observationId ?? "")
  )) {
    latest.set(metric.measurementPhase, metric)
  }
  return latest
}

const latestAgentMetrics = (
  metrics: readonly AgentMetricsProjection[],
): readonly AgentMetricsProjection[] => {
  const latestByPhase = latestAgentMetricsByPhase(metrics)
  return (["baseline", "treatment", "session"] as const)
    .flatMap((phase) => {
      const metric = latestByPhase.get(phase)
      return metric === undefined ? [] : [metric]
    })
}

const latestByObservedAt = <Value extends { readonly capturedAt: string }>(
  values: readonly Value[],
): Value | undefined =>
  [...values].sort((left, right) => left.capturedAt.localeCompare(right.capturedAt)).at(-1)

const experimentMetricsFromRecord = (
  record: Record<string, unknown> | undefined,
): ExperimentRunMetricsProjection | undefined => {
  const mode = stringValue(record, "mode")
  if (mode !== "baseline" && mode !== "treatment") return undefined
  const metrics: Partial<ExperimentRunMetricsProjection> & Pick<
    ExperimentRunMetricsProjection,
    "mode" | "fileReads" | "shellCommands" | "repeatedCommands" | "failedCommands" | "expensiveChecks"
  > = {
    mode,
    fileReads: numberValue(record, "fileReads") ?? 0,
    shellCommands: numberValue(record, "shellCommands") ?? 0,
    repeatedCommands: numberValue(record, "repeatedCommands") ?? 0,
    failedCommands: numberValue(record, "failedCommands") ?? 0,
    expensiveChecks: numberValue(record, "expensiveChecks") ?? 0,
  }
  assignOptionalString(metrics, "startedAt", stringValue(record, "startedAt"))
  assignOptionalString(metrics, "completedAt", stringValue(record, "completedAt"))
  for (const key of [
    "wallTimeMs",
    "workspacePolicyFastCount",
    "timeToUsefulDiagnosticMs",
    "rawContextBytes",
    "tokenTotal",
    "toolCalls",
    "agentMetricSampleCount",
    "agentMetricTraceFilesScanned",
    "agentMetricWindowCount",
    "successfulCommands",
    "knownExitCodeCommands",
    "commandSuccessRate",
    "commandFailureRate",
    "durationSampleCount",
    "durationTotalMs",
    "durationAverageMs",
    "durationMinMs",
    "durationMaxMs",
    "durationP50Ms",
    "durationP95Ms",
    "cheapCommands",
    "mediumCommands",
    "finalGateCommands",
    "workspaceWideCommands",
    "unknownTargetCommands",
    "unknownRecipeCommands",
    "storeEmittedCommands",
    "uniqueTargets",
    "uniqueRecipes",
    "trellisDiagnosticObservations",
    "observationInputCount",
    "traceFiles",
    "jsonlFiles",
    "sqliteFiles",
    "sqliteSchemaTables",
    "uniqueModels",
    "uniqueSessions",
    "uniqueCommandFamilies",
    "repeatedCommandFamilies",
    "observedCommandSpanMs",
  ] as const) {
    assignOptionalNumber(metrics, key, numberValue(record, key))
  }
  for (const key of [
    "topCommandFamily",
    "topExitCode",
    "firstObservedAt",
    "lastObservedAt",
    "findingQuality",
    "tokenMetricSource",
  ] as const) {
    assignOptionalString(metrics, key, stringValue(record, key))
  }
  return metrics
}

const comparisonFromRecord = (
  record: Record<string, unknown> | undefined,
): Record<string, number | string | undefined> | undefined => {
  if (record === undefined) return undefined
  return {
    shellCommandDelta: numberValue(record, "shellCommandDelta"),
    repeatedCommandDelta: numberValue(record, "repeatedCommandDelta"),
    failedCommandDelta: numberValue(record, "failedCommandDelta"),
    expensiveCheckDelta: numberValue(record, "expensiveCheckDelta"),
    timeToUsefulDiagnosticDeltaMs: numberValue(record, "timeToUsefulDiagnosticDeltaMs"),
    rawContextByteDelta: numberValue(record, "rawContextByteDelta"),
    wallTimeDeltaMs: numberValue(record, "wallTimeDeltaMs"),
    successfulCommandDelta: numberValue(record, "successfulCommandDelta"),
    commandSuccessRateDelta: numberValue(record, "commandSuccessRateDelta"),
    durationAverageDeltaMs: numberValue(record, "durationAverageDeltaMs"),
    tokenDelta: numberValue(record, "tokenDelta"),
    toolCallDelta: numberValue(record, "toolCallDelta"),
    findingQualitySummary: stringValue(record, "findingQualitySummary"),
  }
}

const findingQualityRowsFromValue = (
  value: unknown,
): readonly FindingQualityRow[] => {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const record = asRecord(item)
    const finding = stringValue(record, "finding")
    const baseline = findingQualityScore(stringValue(record, "baseline"))
    const treatment = findingQualityScore(stringValue(record, "treatment"))
    const evidence = stringValue(record, "evidence")
    if (finding === undefined || baseline === undefined || treatment === undefined || evidence === undefined) {
      return []
    }
    return [{ finding, baseline, treatment, evidence }]
  })
}

const migrationReadinessGatesFromValue = (
  value: unknown,
): readonly MigrationReadinessGate[] => {
  if (!Array.isArray(value)) return []
  return value.flatMap((item) => {
    const record = asRecord(item)
    const gate = stringValue(record, "gate")
    const status = migrationReadinessGateStatus(stringValue(record, "status"))
    const evidence = stringValue(record, "evidence")
    if (gate === undefined || status === undefined || evidence === undefined) return []
    return [{
      gate,
      status,
      evidence,
      ...(optionalString("followUp", stringValue(record, "followUp"))),
    }]
  })
}

const migrationReadinessGateStatus = (
  value: string | undefined,
): MigrationReadinessGate["status"] | undefined =>
  value === "pass" || value === "blocked" || value === "not-measured" || value === "warning"
    ? value
    : undefined

const findingQualityScore = (
  value: string | undefined,
): FindingQualityRow["baseline"] | undefined =>
  value === "hit" || value === "partial" || value === "miss" || value === "not-measured"
    ? value
    : undefined

const recommendationFromRecord = (
  record: Record<string, unknown> | undefined,
): MicroExperimentProjection["recommendation"] | undefined => {
  if (record === undefined) return undefined
  const proceed = record["proceedToRecipeOnlyMigration"]
  const summary = stringValue(record, "summary")
  const evidenceGaps = stringArray(record["evidenceGaps"])
  if (typeof proceed !== "boolean" || summary === undefined || evidenceGaps === undefined) return undefined
  return {
    proceedToRecipeOnlyMigration: proceed,
    summary,
    evidenceGaps,
  }
}

const latestMigrationReadinessProjection = (
  projection: MeasurementReportProjection,
): MigrationReadinessProjection => {
  const stored = projection.migrationReadinessSummaries[projection.migrationReadinessSummaries.length - 1]
  if (stored !== undefined) return stored
  return {
    summarizedAt: projection.projectedAt,
    proceedToRecipeOnlyMigration: false,
    gates: migrationReadinessGates(projection),
  }
}

const migrationReadinessPayload = (
  projection: MeasurementReportProjection,
): Record<string, unknown> => ({
  schemaVersion: 1,
  measurementSessionId: projection.measurementSessionId,
  summarizedAt: new Date().toISOString(),
  proceedToRecipeOnlyMigration: false,
  gates: migrationReadinessGates(projection),
  privacy: projection.inventory.privacy,
})

const migrationReadinessGates = (
  projection: MeasurementReportProjection,
): readonly MigrationReadinessGate[] => {
  const agentMetricsByPhase = latestAgentMetricsByPhase(projection.agentMetrics)
  const controlledBaseline = controlledBaselineMetricsFromCommands(
    controlledBaselineCommandObservations(projection.commandObservations),
    projection.observationSummaries,
    agentMetricsByPhase.get("baseline"),
  )
  const treatmentCommands = treatmentCommandObservations(projection.commandObservations)
  const treatment = treatmentMetricsFromCommands(
    treatmentCommands,
    projection.trellisDiagnosticObservationIds.length,
    projection.observationSummaries,
    agentMetricsByPhase.get("treatment"),
  )
  const selectedBaseline = projection.inventory.selectedBaselineSession
  const selectedBaselineBlockerText = selectedBaseline === undefined
    ? "No selected historical baseline was projected."
    : selectedBaselineBlockers(selectedBaseline).join("; ")
  const treatmentSummary = commandLadderSummary(treatmentCommands)
  const lifecycleKinds = new Set(projection.observationSummaries
    .filter((observation) => observation.recipeId === "framework-runtime.local-timescaledb")
    .map((observation) => observation.observationKind))
  const requiredLifecycleKinds = [
    "local-timescaledb.service-ready",
    "local-timescaledb.migration-applied",
    "local-timescaledb.sql-validated",
  ]
  const missingLifecycleKinds = requiredLifecycleKinds.filter((kind) => !lifecycleKinds.has(kind))
  const trellisFixCount = projection.observationSummaries
    .filter((observation) => observation.observationKind === "trellis-language-service.fix-list-summary")
    .length
  const trellisApplyKinds = new Set([
    "trellis-language-service.apply-result-summary",
    "trellis-language-service.apply-diff-summary",
    "trellis-language-service.upstream-quickfix-application",
    "trellis-language-service.applied-fix-summary",
    "trellis-language-service.nx-repair-result",
    "trellis-language-service.generated-freshness-repair-result",
  ])
  const trellisApplyCount = projection.observationSummaries
    .filter((observation) => trellisApplyKinds.has(observation.observationKind))
    .length
  const findingRows = findingQualityRows(
    projection.trellisDiagnosticObservationIds.length,
    treatmentCommands,
    projection.observationSummaries,
  )
  const partialFindings = findingRows.filter((row) => row.treatment !== "hit")
  const reproducibilityReady = controlledBaseline !== undefined
    && controlledBaseline.shellCommands > 0
    && treatment.shellCommands > 0
    && agentMetricsByPhase.has("baseline")
    && agentMetricsByPhase.has("treatment")

  return [
    controlledBaseline === undefined
      ? readinessGate("controlled-baseline-phase", "blocked", "No controlled baseline phase was projected.", "Record baseline-phase command observations in the same measurement session.")
      : readinessGate(
        "controlled-baseline-phase",
        controlledBaseline.unknownTargetCommands === 0 && controlledBaseline.unknownRecipeCommands === 0 ? "pass" : "blocked",
        `baselineCommands=${controlledBaseline.shellCommands}; unknownTargets=${controlledBaseline.unknownTargetCommands ?? "not measured"}; unknownRecipes=${controlledBaseline.unknownRecipeCommands ?? "not measured"}`,
        "Improve command identity inference for baseline commands before the migration repeat.",
      ),
    selectedBaseline === undefined || selectedBaselineBlockerText.length > 0
      ? readinessGate(
        "historical-baseline-corroboration",
        "blocked",
        selectedBaselineBlockerText,
        "Collect or select a historical baseline with Attune/Trellis LS signal, bounded duration, and non-zero token/tool metrics.",
      )
      : readinessGate("historical-baseline-corroboration", "pass", selectedBaselineStrength(selectedBaseline)),
    readinessGate(
      "phase-token-tool-metrics",
      controlledBaseline?.tokenTotal !== undefined
        && controlledBaseline.toolCalls !== undefined
        && treatment.tokenTotal !== undefined
        && treatment.toolCalls !== undefined
        ? "pass"
        : "blocked",
      `baseline=${controlledBaseline?.tokenTotal ?? "not measured"}/${controlledBaseline?.toolCalls ?? "not measured"}; treatment=${treatment.tokenTotal ?? "not measured"}/${treatment.toolCalls ?? "not measured"}`,
      "Emit command JSON token/tool aggregates or phase-level agent metrics from sanitized trace windows.",
    ),
    readinessGate(
      "treatment-target-recipe-identity",
      treatmentSummary.unknownTarget === 0 && treatmentSummary.unknownRecipe === 0 ? "pass" : "blocked",
      `unknownTargets=${treatmentSummary.unknownTarget}; unknownRecipes=${treatmentSummary.unknownRecipe}; uniqueTargets=${treatmentSummary.uniqueTargets}; uniqueRecipes=${treatmentSummary.uniqueRecipes}`,
      "Map remaining producer commands to generic target IDs and recipe IDs.",
    ),
    readinessGate(
      "framework-local-store-lifecycle-coverage",
      missingLifecycleKinds.length === 0 ? "pass" : "blocked",
      `observedKinds=${[...lifecycleKinds].join(", ") || "none"}; missingKinds=${missingLifecycleKinds.join(", ") || "none"}`,
      "Run and observe framework-runtime lifecycle plan/apply/check/migrate/validate-sql/stop/prune evidence before the heavy migration.",
    ),
    readinessGate(
      "recipe-spine-emission-coverage",
      projection.recipeSpineCoverage !== undefined
        && projection.recipeSpineCoverage.recipeCount > 0
        && projection.recipeSpineCoverage.observationCount > 0
        && projection.recipeSpineCoverage.frameworkSchemasPreserved
        && projection.recipeSpineCoverage.observationStore === "framework_event.recipe_observation"
        ? "pass"
        : "not-measured",
      projection.recipeSpineCoverage === undefined
        ? "No DB-backed recipe/edge/io/run/receipt/diagnostic/repair/health coverage table was projected for active packages."
        : `recipes=${projection.recipeSpineCoverage.recipeCount}; edges=${projection.recipeSpineCoverage.edgeCount}; io=${projection.recipeSpineCoverage.ioCount}; runs=${projection.recipeSpineCoverage.runCount}; receipts=${projection.recipeSpineCoverage.receiptCount}; observations=${projection.recipeSpineCoverage.observationCount}; diagnostics=${projection.recipeSpineCoverage.diagnosticCount}; repairs=${projection.recipeSpineCoverage.repairCount}; health=${projection.recipeSpineCoverage.healthCount}; store=${projection.recipeSpineCoverage.observationStore}`,
      "Add a recipe-spine coverage observation with active project counts and framework_event/framework_view row coverage.",
    ),
    readinessGate(
      "repair-diff-acceptance",
      trellisFixCount > 0 && trellisApplyCount > 0 ? "pass" : "blocked",
      `fixSummaries=${trellisFixCount}; applySummaries=${trellisApplyCount}`,
      "Record Trellis LS fix candidates, apply --mode diff output, accepted repairs, and post-fix diagnostic delta.",
    ),
    readinessGate(
      "generated-private-ledger-edit-attempts",
      projection.editAttemptSummary === undefined
        ? "not-measured"
        : projection.editAttemptSummary.generatedPrivateLedgerEditAttempts === 0
        ? "pass"
        : "blocked",
      projection.editAttemptSummary === undefined
        ? "No path-classified edit-attempt metric was projected."
        : `dirtyPaths=${projection.editAttemptSummary.dirtyPathCount}; sourceEdits=${projection.editAttemptSummary.sourceEditCount}; reportExports=${projection.editAttemptSummary.reportExportEditCount}; generatedPrivateAttempts=${projection.editAttemptSummary.generatedPrivateLedgerEditAttempts}; classes=${projection.editAttemptSummary.generatedPrivateLedgerPathClasses.join(",") || "none"}`,
      "Record generated companion, artifact ownership, private ledger, and recipe-source edit attempts; require generated/private attempts to be zero.",
    ),
    readinessGate(
      "legacy-substrate-drift",
      projection.legacySubstrateAudit === undefined
        ? "not-measured"
        : projection.legacySubstrateAudit.blockingLiveReferenceCount === 0
        ? "pass"
        : "blocked",
      projection.legacySubstrateAudit === undefined
        ? "No live-vs-historical compatibility-path audit was projected for SQLite/Drizzle/PgTyped/program-index/generated-companion/artifact ownership."
        : `scannedPaths=${projection.legacySubstrateAudit.scannedPathCount}; historical=${projection.legacySubstrateAudit.historicalReferenceCount}; enforcement=${projection.legacySubstrateAudit.enforcementReferenceCount}; testFixtures=${projection.legacySubstrateAudit.testFixtureReferenceCount}; measurementInventory=${projection.legacySubstrateAudit.measurementInventoryReferenceCount}; blockingLive=${projection.legacySubstrateAudit.blockingLiveReferenceCount}`,
      "Emit a safe rg audit observation with aggregate counts by live source and historical/quarantined locations.",
    ),
    readinessGate(
      "scenario-reproducibility",
      reproducibilityReady ? "pass" : "blocked",
      `session=${projection.measurementSessionId}; baselineCommands=${controlledBaseline?.shellCommands ?? 0}; treatmentCommands=${treatment.shellCommands}; agentMetricPhases=${[...agentMetricsByPhase.keys()].join(",") || "none"}`,
      "Run controlled baseline and treatment in one measurement session and emit baseline/treatment phase agent metrics before repeating the migration decision.",
    ),
    readinessGate(
      "finding-quality-coverage",
      partialFindings.length === 0 ? "pass" : "blocked",
      partialFindings.length === 0
        ? "All expected migration findings were hit by treatment evidence."
        : `partialOrMissing=${partialFindings.map((row) => `${row.finding}:${row.treatment}`).join(", ")}`,
      "Close partial finding rows before running the heavy recipe-only migration.",
    ),
  ]
}

const readinessGate = (
  gate: string,
  status: MigrationReadinessGate["status"],
  evidence: string,
  followUp?: string,
): MigrationReadinessGate => ({
  gate,
  status,
  evidence,
  ...(status === "pass" ? {} : optionalString("followUp", followUp)),
})

const remainingMeasurementGaps = (
  projection: MeasurementReportProjection,
): readonly RemainingGap[] => {
  const gaps: RemainingGap[] = []
  if (projection.harnessProofObservationIds.length === 0) {
    gaps.push({
      gap: "Harness proof observations are missing.",
      type: "harness proof",
      evidenceStatus: "No `measurement.harness.proof` rows were projected.",
      followUp: "Run full measurement after `tend-opencode fingerprint` and `run-harness-test` pass.",
    })
  }
  if (projection.lifecycleHealthObservationIds.length === 0) {
    gaps.push({
      gap: "Framework store lifecycle health observations are missing from the session.",
      type: "framework store health",
      evidenceStatus: "No `framework-runtime.local-timescaledb` health rows were projected for this measurement session.",
      followUp: "Run `framework-runtime:db:check` and `framework-runtime:db:validate-sql` before full measurement.",
    })
  }
  if (projection.commandObservations.length === 0) {
    gaps.push({
      gap: "Required command ladder observations are incomplete.",
      type: "observation emission",
      evidenceStatus: "No command observations were projected.",
      followUp: "Observe the required focused Nx ladder commands through `tend-opencode observe` in one session.",
    })
  }
  if (projection.trellisDiagnosticObservationIds.length === 0) {
    gaps.push({
      gap: "Trellis LS treatment diagnostic observation is missing.",
      type: "observation emission",
      evidenceStatus: "No `trellis-language-service.diagnostic-run-summary` row was projected.",
      followUp: "Run the Trellis LS diagnostics command through `tend-opencode observe` with the framework store healthy.",
    })
  }
  const commandSummary = commandLadderSummary(projection.commandObservations)
  if (commandSummary.unknownTarget > 0 || commandSummary.unknownRecipe > 0) {
    gaps.push({
      gap: "Observed command target/recipe identity is incomplete.",
      type: "observation emission",
      evidenceStatus: `${commandSummary.unknownTarget} commands have unknown target IDs and ${commandSummary.unknownRecipe} commands have unknown recipe IDs.`,
      followUp: "Improve Tend/OpenCode command identity inference before the controlled migration repeat.",
    })
  }
  const controlledBaseline = controlledBaselineMetricsFromCommands(
    controlledBaselineCommandObservations(projection.commandObservations),
    projection.observationSummaries,
    latestAgentMetricsByPhase(projection.agentMetrics).get("baseline"),
  )
  const treatment = treatmentMetricsFromCommands(
    treatmentCommandObservations(projection.commandObservations),
    projection.trellisDiagnosticObservationIds.length,
    projection.observationSummaries,
    latestAgentMetricsByPhase(projection.agentMetrics).get("treatment"),
  )
  const selectedBaseline = projection.inventory.selectedBaselineSession
  if (controlledBaseline !== undefined) {
    if (controlledBaseline.tokenTotal === undefined || controlledBaseline.toolCalls === undefined) {
      gaps.push({
        gap: "Controlled baseline token/tool metrics are missing.",
        type: "projection",
        evidenceStatus: "A baseline phase exists, but its command observations do not include safe token/tool aggregates.",
        followUp: "Observe the controlled baseline through commands that emit safe aggregate token/tool JSON metrics.",
      })
    }
  } else if (selectedBaseline === undefined) {
    gaps.push({
      gap: "Comparable single-session baseline is missing.",
      type: "projection",
      evidenceStatus: "No controlled baseline phase or selected historical baseline session was projected.",
      followUp: "Record one controlled baseline phase in the same measurement session before the migration repeat.",
    })
  } else {
    const blockers = selectedBaselineBlockers(selectedBaseline)
    if (blockers.length > 0) {
      gaps.push({
        gap: "Comparable single-session historical baseline is weak.",
        type: "projection",
        evidenceStatus: blockers.join("; "),
        followUp: "Collect a tighter historical or controlled baseline with Trellis LS signals, bounded duration, and non-zero token/tool metrics.",
      })
    }
  }
  if (treatment.tokenTotal === undefined || treatment.toolCalls === undefined) {
    gaps.push({
      gap: "Treatment token/tool metrics are missing.",
      type: "projection",
      evidenceStatus: "Treatment command observations do not include safe aggregate token/tool metrics.",
      followUp: "Observe treatment commands with safe aggregate token/tool JSON metrics or store a generic agent metrics observation.",
    })
  }
  if (projection.inventory.sqliteFiles > 0 && projection.inventory.sqliteSchemaFilesInspected === 0) {
    gaps.push({
      gap: "SQLite schema allowlist evidence is incomplete.",
      type: "privacy",
      evidenceStatus: "SQLite files were located, but no schema metadata was inspected.",
      followUp: "Install/provide `sqlite3` and rerun trace inventory so the report stores only table names and allowlisted metadata columns.",
    })
  }
  if (projection.microExperimentSummaries.length === 0) {
    gaps.push({
      gap: "Baseline/treatment comparison is incomplete.",
      type: "projection",
      evidenceStatus: "No `measurement.micro-experiment.summary` row was projected.",
      followUp: "Rerun measurement report projection after baseline and treatment observations exist.",
    })
  }
  for (const gate of migrationReadinessGates(projection)) {
    if (gate.status === "pass" || gate.status === "warning") continue
    if (gaps.some((gap) => gap.gap === gate.gate || gap.evidenceStatus === gate.evidence)) continue
    gaps.push({
      gap: gate.gate,
      type: "projection",
      evidenceStatus: gate.evidence,
      followUp: gate.followUp ?? "Close this readiness gate before the heavy recipe-only migration.",
    })
  }
  return gaps
}

const renderHistoricalBaseline = (projection: MeasurementReportProjection): string => {
  const inventory = projection.inventory
  return [
  "# Historical Baseline",
  "",
  `Measurement session: ${inventory.measurementSessionId}`,
  `Projection input observations: ${projection.observationIds.length}`,
  `Scanned at: ${inventory.scannedAt}`,
  `Trace files: ${inventory.traceFiles}`,
  `JSONL files: ${inventory.jsonlFiles}`,
  `SQLite-like files: ${inventory.sqliteFiles}`,
  `SQLite schema files inspected: ${inventory.sqliteSchemaFilesInspected}`,
  `SQLite schema files skipped: ${inventory.sqliteSchemaFilesSkipped}`,
  `Skipped files: ${inventory.skippedFiles}`,
  "",
  "## Aggregate Metrics",
  `Command events discovered: ${inventory.commandEventCount}`,
  `Unique command families: ${inventory.uniqueCommandFamilies}`,
  `Repeated command families: ${inventory.repeatedCommandFamilyCount}`,
  `Repeated command invocations: ${inventory.repeatedCommandInvocationCount}`,
  `Exit code observations: ${inventory.exitCodeEventCount}`,
  `Failed exit code observations: ${inventory.failedExitCodeCount}`,
  `Known-success rate: ${formatPercent(ratio(inventory.exitCodeEventCount - inventory.failedExitCodeCount, inventory.exitCodeEventCount))}`,
  `Token total observed: ${inventory.tokenTotal}`,
  `Tool-call count observed: ${inventory.toolCalls}`,
  `Unique model IDs observed: ${inventory.modelIds.length}`,
  `Unique session IDs observed: ${inventory.sessionIds.length}`,
  `SQLite tables summarized: ${inventory.sqliteSchemas.reduce((sum, schema) => sum + schema.tableCount, 0)}`,
  "",
  "## Temporal And Duration Metadata",
  `Timestamp samples: ${inventory.timestampRange.count}`,
  `Earliest timestamp: ${inventory.timestampRange.earliest ?? "not observed"}`,
  `Latest timestamp: ${inventory.timestampRange.latest ?? "not observed"}`,
  `Timestamp span ms: ${inventory.timestampRange.spanMs ?? "not measured"}`,
  `Duration samples: ${inventory.durationMs.count}`,
  `Duration total ms: ${inventory.durationMs.total}`,
  `Duration average ms: ${formatNumber(inventory.durationMs.average)}`,
  `Duration min/p50/p95/max ms: ${formatNumber(inventory.durationMs.min)} / ${formatNumber(inventory.durationMs.p50)} / ${formatNumber(inventory.durationMs.p95)} / ${formatNumber(inventory.durationMs.max)}`,
  "",
  "## Selected Comparable Baseline Session",
  ...renderHistoricalSessionSummary(inventory.selectedBaselineSession),
  "",
  "## Comparable Session Candidates",
  ...renderHistoricalSessionCandidates(inventory.comparableSessionCandidates),
  "",
  "## SQLite Schema Metadata",
  ...renderSqliteSchemas(inventory.sqliteSchemas),
  "",
  "## Repeated Commands",
  ...renderCounts(inventory.repeatedCommandPatterns),
  "",
  "## Candidate Command-Family Metadata",
  ...renderCounts(inventory.commandFamilies),
  "",
  "## Exit Codes",
  ...renderCounts(inventory.exitCodes),
  "",
  "## Model IDs",
  ...renderCounts(inventory.modelIds),
  "",
  "## Session IDs",
  ...renderCounts(inventory.sessionIds),
  "",
  "Raw prompts, conversations, raw trace rows, and full command output were not stored.",
  "",
  ].join("\n")
}

const renderHistoricalSessionSummary = (
  session: HistoricalSessionSummary | undefined,
): readonly string[] => {
  if (session === undefined) {
    return ["- No comparable historical baseline session was selected."]
  }
  return [
    `- Session ID: ${session.sessionId}`,
    `- Score: ${session.score}`,
    `- Strength: ${selectedBaselineStrength(session)}`,
    `- Score reasons: ${session.scoreReasons.join("; ") || "none"}`,
    `- Started/completed: ${session.startedAt ?? "not observed"} / ${session.completedAt ?? "not observed"}`,
    `- Wall time ms: ${session.wallTimeMs ?? "not measured"}`,
    `- Command events: ${session.commandEvents}`,
    `- Unique/repeated command families: ${session.uniqueCommandFamilies} / ${session.repeatedCommandFamilies}`,
    `- Repeated command invocations: ${session.repeatedCommandInvocations}`,
    `- Successful/failed commands: ${session.successfulCommands} / ${session.failedCommands}`,
    `- Known exit-code commands: ${session.exitCodeEvents}`,
    `- Command success rate: ${formatPercent(session.commandSuccessRate)}`,
    `- Expensive checks: ${session.expensiveChecks}`,
    `- workspace:policy-fast count: ${session.workspacePolicyFastCount}`,
    `- Time to first useful diagnostic ms: ${session.timeToFirstUsefulDiagnosticMs ?? "not inferable"}`,
    `- Duration samples: ${session.durationMs.count}`,
    `- Duration total ms: ${session.durationMs.total}`,
    `- Duration average ms: ${formatNumber(session.durationMs.average)}`,
    `- Duration min/p50/p95/max ms: ${formatNumber(session.durationMs.min)} / ${formatNumber(session.durationMs.p50)} / ${formatNumber(session.durationMs.p95)} / ${formatNumber(session.durationMs.max)}`,
    `- Token total: ${session.tokenTotal}`,
    `- Tool calls: ${session.toolCalls}`,
    `- Matched signals: ${session.matchedSignals.join(", ") || "none"}`,
    `- Top command family: ${session.commandFamilies[0]?.value ?? "not measured"}`,
    `- Top exit code: ${session.exitCodes[0]?.value ?? "not measured"}`,
  ]
}

const renderHistoricalSessionCandidates = (
  candidates: readonly HistoricalSessionSummary[],
): readonly string[] =>
  candidates.length === 0
    ? ["- No comparable historical session candidates were derived."]
    : [
      "| Session | Score | Commands | Failures | Expensive | Wall ms | Duration p50/p95/max ms | Token/tool | Signals | Strength |",
      "| --- | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |",
      ...candidates.map((session) =>
        `| ${session.sessionId} | ${session.score} | ${session.commandEvents} | ${session.failedCommands} | ${session.expensiveChecks} | ${session.wallTimeMs ?? "not measured"} | ${formatNumber(session.durationMs.p50)} / ${formatNumber(session.durationMs.p95)} / ${formatNumber(session.durationMs.max)} | ${session.tokenTotal} / ${session.toolCalls} | ${session.matchedSignals.join(", ") || "none"} | ${selectedBaselineStrength(session)} |`
      ),
    ]

const renderCommandLadder = (projection: MeasurementReportProjection): string => {
  const summary = commandLadderSummary(projection.commandObservations)
  return [
    "# Command Ladder",
    "",
    `Measurement session: ${projection.measurementSessionId}`,
    `Projection input observations: ${projection.observationIds.length}`,
    "",
    "## Cost Summary",
    `Cheap: ${summary.cheap}`,
    `Medium: ${summary.medium}`,
    `Expensive: ${summary.expensive}`,
    `Final-gate: ${summary.finalGate}`,
    `Failed: ${summary.failed}`,
    `Workspace-wide: ${summary.workspaceWide}`,
    `Successful: ${summary.successful}`,
    `Known exit codes: ${summary.knownExitCodes}`,
    `Success rate: ${formatPercent(ratio(summary.successful, summary.knownExitCodes))}`,
    "",
    "## Timing Summary",
    `First observed at: ${summary.firstObservedAt ?? "not observed"}`,
    `Last observed at: ${summary.lastObservedAt ?? "not observed"}`,
    `Observed command span ms: ${summary.observedSpanMs ?? "not measured"}`,
    `Duration samples: ${summary.durations.count}`,
    `Duration total ms: ${summary.durations.total}`,
    `Duration average ms: ${formatNumber(summary.durations.average)}`,
    `Duration min/p50/p95/max ms: ${formatNumber(summary.durations.min)} / ${formatNumber(summary.durations.p50)} / ${formatNumber(summary.durations.p95)} / ${formatNumber(summary.durations.max)}`,
    "",
    "## Store And Link Coverage",
    `Store-emitted commands: ${summary.storeEmitted}/${projection.commandObservations.length}`,
    `Unique target IDs: ${summary.uniqueTargets}`,
    `Unique inferred recipes: ${summary.uniqueRecipes}`,
    `Unknown target commands: ${summary.unknownTarget}`,
    `Unknown recipe commands: ${summary.unknownRecipe}`,
    `Framework lifecycle health observations: ${projection.lifecycleHealthObservationIds.length}`,
    `Harness proof observations: ${projection.harnessProofObservationIds.length}`,
    `Trellis diagnostic observations: ${projection.trellisDiagnosticObservationIds.length}`,
    "",
    "## Repeated Observed Commands",
    ...renderCounts(summary.repeated),
    "",
    "## Failed Commands",
    ...renderFailedCommands(projection.commandObservations),
    "",
    "## Observed Commands",
    ...renderCommandObservations(projection.commandObservations),
    "",
    "## Candidate Historical Command-Family Metadata",
    ...renderCounts(projection.inventory.commandFamilies),
    "",
    "## Guidance",
    "- Start with focused diagnostics and package-local checks.",
    "- Route expensive commands through `tend-opencode observe` so they emit `measurement.command.observed`.",
    "- Treat workspace-wide checks as final gates unless the task is explicitly cross-cutting.",
    "- `workspace:policy-fast` was not run as end validation for this change.",
    "",
  ].join("\n")
}

const renderMicroExperiment = (projection: MeasurementReportProjection): string => {
  const latest = latestMicroExperimentProjection(projection)
  return [
    "# Codex/OpenCode Micro-Experiment",
    "",
    `Measurement session: ${projection.measurementSessionId}`,
    `Micro-experiment summary observations: ${projection.microExperimentObservationIds.length}`,
    `Trellis diagnostic observations: ${projection.trellisDiagnosticObservationIds.length}`,
    `Projection input observations: ${projection.observationIds.length}`,
    "",
    "## Projection Coverage",
    ...renderObservationMatrix(projection),
    "",
    "## Operational Evidence",
    ...renderOperationalEvidence(projection),
    "",
    "## Baseline Metrics",
    ...renderExperimentMetrics(latest?.baseline),
    "",
    "## Selected Comparable Baseline Session",
    ...renderHistoricalSessionSummary(latest?.selectedBaselineSession ?? projection.inventory.selectedBaselineSession),
    "",
    "## Selected Baseline Metrics",
    ...renderExperimentMetrics(latest?.selectedBaseline ?? selectedBaselineMetricsFromSession(projection.inventory.selectedBaselineSession)),
    "",
    "## Treatment Metrics",
    ...renderExperimentMetrics(latest?.treatment),
    "",
    "## Agent Metrics",
    ...renderAgentMetrics(projection.agentMetrics),
    "",
    "## Primary Baseline Vs Treatment",
    ...renderComparison(latest),
    "",
    "## Selected Baseline Vs Treatment",
    ...renderSelectedBaselineComparison(latest, projection),
    "",
    "## Finding Quality",
    ...renderFindingQuality(latest?.findingQualityMatrix ?? []),
    "",
    "## Migration Readiness",
    ...renderMigrationReadiness(latestMigrationReadinessProjection(projection)),
    "",
    "## Recommendation",
    latest?.recommendation?.summary ?? "Do not start the heavy recipe-only migration from incomplete measurement evidence.",
    "",
    "Evidence gaps:",
    ...renderEvidenceGaps(latest?.recommendation?.evidenceGaps ?? remainingMeasurementGaps(projection).map((gap) => gap.gap)),
    "",
  ].join("\n")
}

const renderMeasurementReport = (projection: MeasurementReportProjection): string => {
  const gaps = remainingMeasurementGaps(projection)
  const latestExperiment = latestMicroExperimentProjection(projection)
  const treatmentCommands = treatmentCommandObservations(projection.commandObservations)
  const commandSummary = commandLadderSummary(treatmentCommands)
  const recommendation = gaps.length === 0
    ? latestExperiment?.recommendation?.summary
      ?? "Measurement gaps are closed for this session; keep the heavy recipe-only migration paused until explicit human approval."
    : "Do not start the heavy recipe-only migration until the remaining measurement gaps are closed."
  return [
    "# Tend/OpenCode Measurement Report",
    "",
    `Measurement session: ${projection.measurementSessionId}`,
    `Projection input observations: ${projection.observationIds.length}`,
    "",
    "## Store Boundary",
    "Measurement durability is the framework-managed TimescaleDB/Postgres recipe observation store.",
    "Tend/OpenCode emits observations and does not administer DB lifecycle.",
    "",
    "## Observation Coverage",
    `Harness proof observations: ${projection.harnessProofObservationIds.length}`,
    `Command observations: ${projection.commandObservations.length}`,
    `Trace inventory observations: ${projection.traceInventoryObservationIds.length}`,
    `Baseline session selection observations: ${projection.baselineSessionObservationIds.length}`,
    `Micro-experiment observations: ${projection.microExperimentObservationIds.length}`,
    `Agent metric observations: ${projection.agentMetricObservationIds.length}`,
    `Migration readiness observations: ${projection.migrationReadinessObservationIds.length}`,
    `Lifecycle health observations in session projection: ${projection.lifecycleHealthObservationIds.length}`,
    `Trellis diagnostic observations: ${projection.trellisDiagnosticObservationIds.length}`,
    `Treatment-phase command observations: ${treatmentCommands.length}`,
    `Controlled baseline command observations: ${controlledBaselineCommandObservations(projection.commandObservations).length}`,
    "",
    "## Observation Matrix",
    ...renderObservationMatrix(projection),
    "",
    "## Operational Evidence",
    ...renderOperationalEvidence(projection),
    "",
    "## Trace Inventory",
    `Trace files scanned: ${projection.inventory.traceFiles}`,
    `Command events discovered: ${projection.inventory.commandEventCount}`,
    `Unique command families: ${projection.inventory.uniqueCommandFamilies}`,
    `Repeated command patterns: ${projection.inventory.repeatedCommandPatterns.length}`,
    `Repeated command invocations: ${projection.inventory.repeatedCommandInvocationCount}`,
    `Exit code observations: ${projection.inventory.exitCodeEventCount}`,
    `Failed exit code observations: ${projection.inventory.failedExitCodeCount}`,
    `SQLite schema files inspected: ${projection.inventory.sqliteSchemaFilesInspected}`,
    `Model IDs observed: ${projection.inventory.modelIds.length}`,
    `Session IDs observed: ${projection.inventory.sessionIds.length}`,
    `Token total observed: ${projection.inventory.tokenTotal}`,
    `Tool-call count observed: ${projection.inventory.toolCalls}`,
    `Trace timestamp span ms: ${projection.inventory.timestampRange.spanMs ?? "not measured"}`,
    `Trace duration samples: ${projection.inventory.durationMs.count}`,
    "",
    "## Selected Comparable Baseline",
    ...renderHistoricalSessionSummary(latestExperiment?.selectedBaselineSession ?? projection.inventory.selectedBaselineSession),
    "",
    "## Treatment Command Metrics",
    `Observed command count: ${treatmentCommands.length}`,
    `Successful commands: ${commandSummary.successful}`,
    `Failed commands: ${commandSummary.failed}`,
    `Success rate: ${formatPercent(ratio(commandSummary.successful, commandSummary.knownExitCodes))}`,
    `Store-emitted commands: ${commandSummary.storeEmitted}/${treatmentCommands.length}`,
    `Unknown target commands: ${commandSummary.unknownTarget}`,
    `Unknown recipe commands: ${commandSummary.unknownRecipe}`,
    `Unique targets: ${commandSummary.uniqueTargets}`,
    `Unique inferred recipes: ${commandSummary.uniqueRecipes}`,
    `Command span ms: ${commandSummary.observedSpanMs ?? "not measured"}`,
    `Command duration total ms: ${commandSummary.durations.total}`,
    `Command duration average ms: ${formatNumber(commandSummary.durations.average)}`,
    `Command duration min/p50/p95/max ms: ${formatNumber(commandSummary.durations.min)} / ${formatNumber(commandSummary.durations.p50)} / ${formatNumber(commandSummary.durations.p95)} / ${formatNumber(commandSummary.durations.max)}`,
    "",
    "## Micro-Experiment Metrics",
    ...renderExperimentSnapshot(latestExperiment),
    "",
    "## Agent Metrics",
    ...renderAgentMetrics(projection.agentMetrics),
    "",
    "## Primary Baseline Vs Treatment",
    ...renderComparison(latestExperiment),
    "",
    "## Migration Readiness",
    ...renderMigrationReadiness(latestMigrationReadinessProjection(projection)),
    "",
    "## Remaining Measurement Gaps And Follow-Ups",
    ...renderRemainingGaps(gaps),
    "",
    "## Recommendation",
    recommendation,
    "",
  ].join("\n")
}

const renderAgentsProposed = (projection: MeasurementReportProjection): string => [
  "# AGENTS Proposed Measurement Guidance",
  "",
  `Derived from measurement session ${projection.measurementSessionId}.`,
  "",
  "- Use `tend-opencode fingerprint --format json` and `tend-opencode run-harness-test --format json` before harnessed measurement.",
  "- Use framework-runtime targets for local TimescaleDB/Postgres lifecycle.",
  "- Use `tend-opencode observe --format json -- <command...>` for expensive commands.",
  "- Treat reports as projections from DB-backed observations.",
  "- Keep root `reports/tend-opencode-codex-measurement/` as generated report output from the framework store.",
  "- Compare treatment against one selected comparable historical baseline session before planning the heavy recipe-only migration repeat.",
  "- Do not store raw prompts, full conversations, secrets, raw traces, or full command output.",
  "",
].join("\n")

const renderSqliteSchemas = (
  schemas: readonly SqliteSchemaSummary[],
): readonly string[] =>
  schemas.length === 0
    ? ["- No SQLite schema metadata was inspected."]
    : schemas.flatMap((schema) => {
      if (!schema.inspected) {
        return [`- ${schema.fileId} (${schema.fileKind}): skipped (${schema.skippedReason ?? "not inspected"})`]
      }
      const tableSummaries = schema.tables.length === 0
        ? ["  - No user tables observed."]
        : schema.tables.map((table) =>
          `  - ${table.tableName}: allowlisted=[${table.allowlistedColumns.join(", ") || "none"}], skippedColumns=${table.skippedColumnCount}`
        )
      return [
        `- ${schema.fileId} (${schema.fileKind}): ${schema.tableCount} tables`,
        ...tableSummaries,
      ]
    })

const commandLadderSummary = (
  observations: readonly CommandObservationProjection[],
): {
  readonly cheap: number
  readonly medium: number
  readonly expensive: number
  readonly finalGate: number
  readonly failed: number
  readonly workspaceWide: number
  readonly successful: number
  readonly knownExitCodes: number
  readonly storeEmitted: number
  readonly unknownTarget: number
  readonly unknownRecipe: number
  readonly uniqueTargets: number
  readonly uniqueRecipes: number
  readonly firstObservedAt?: string
  readonly lastObservedAt?: string
  readonly observedSpanMs?: number
  readonly durations: NumericSummary
  readonly repeated: readonly CountRecord[]
} => {
  const counts = new Map<string, number>()
  for (const observation of observations) {
    increment(counts, commandTargetIdentity(observation) ?? observation.command)
  }
  const firstObservedAt = firstTimestamp(observations.flatMap((observation) => [
    observation.startedAt,
    observation.observedAt,
  ]))
  const lastObservedAt = lastTimestamp(observations.flatMap((observation) => [
    observation.completedAt,
    observation.observedAt,
  ]))
  return {
    cheap: observations.filter((observation) => commandCostClass(observation) === "cheap").length,
    medium: observations.filter((observation) => commandCostClass(observation) === "medium").length,
    expensive: observations.filter((observation) => commandCostClass(observation) === "expensive").length,
    finalGate: observations.filter((observation) => commandCostClass(observation) === "final-gate").length,
    failed: observations.filter((observation) => observation.exitCode !== undefined && observation.exitCode !== 0).length,
    workspaceWide: observations.filter((observation) =>
      observation.knownNxTarget?.startsWith("workspace:") ?? false
    ).length,
    successful: observations.filter((observation) => observation.exitCode === 0).length,
    knownExitCodes: observations.filter((observation) => observation.exitCode !== undefined).length,
    storeEmitted: observations.filter((observation) => observation.storeEmissionStatus === "emitted").length,
    unknownTarget: observations.filter((observation) => !knownIdentity(commandTargetIdentity(observation))).length,
    unknownRecipe: observations.filter((observation) => !knownIdentity(observation.inferredRecipeId)).length,
    uniqueTargets: new Set(observations.map(commandTargetIdentity).filter(knownIdentity)).size,
    uniqueRecipes: new Set(observations.map((observation) => observation.inferredRecipeId).filter(knownIdentity)).size,
    ...(optionalString("firstObservedAt", firstObservedAt)),
    ...(optionalString("lastObservedAt", lastObservedAt)),
    ...(optionalNumber("observedSpanMs", spanMs(firstObservedAt, lastObservedAt))),
    durations: numericSummary(observations.flatMap((observation) =>
      observation.durationMs === undefined ? [] : [observation.durationMs]
    )),
    repeated: topCounts(counts, 20).filter((item) => item.count > 1),
  }
}

const commandTargetIdentity = (observation: CommandObservationProjection): string | undefined =>
  observation.targetId ?? observation.knownNxTarget

const treatmentCommandObservations = (
  observations: readonly CommandObservationProjection[],
): readonly CommandObservationProjection[] =>
  observations.filter((observation) => observation.measurementPhase !== "baseline")

const controlledBaselineCommandObservations = (
  observations: readonly CommandObservationProjection[],
): readonly CommandObservationProjection[] =>
  observations.filter((observation) => observation.measurementPhase === "baseline")

const renderFailedCommands = (
  observations: readonly CommandObservationProjection[],
): readonly string[] => {
  const failed = observations.filter((observation) =>
    observation.exitCode !== undefined && observation.exitCode !== 0
  )
  return failed.length === 0
    ? ["- None observed."]
    : failed.map((observation) =>
      `- ${commandTargetIdentity(observation) ?? observation.command}: exitCode=${observation.exitCode}, observation=${observation.observationId}`
    )
}

const renderExperimentMetrics = (
  metrics: ExperimentRunMetricsProjection | undefined,
): readonly string[] =>
  metrics === undefined
    ? ["- No metrics were stored for this mode."]
    : [
      `- Started at: ${metrics.startedAt ?? "not measured"}`,
      `- Completed at: ${metrics.completedAt ?? "not measured"}`,
      `- Wall time ms: ${metrics.wallTimeMs ?? "not measured"}`,
      `- Shell commands: ${metrics.shellCommands}`,
      `- Successful commands: ${metrics.successfulCommands ?? "not measured"}`,
      `- Repeated commands: ${metrics.repeatedCommands}`,
      `- Failed commands: ${metrics.failedCommands}`,
      `- Known exit-code commands: ${metrics.knownExitCodeCommands ?? "not measured"}`,
      `- Command success rate: ${formatPercent(metrics.commandSuccessRate)}`,
      `- Command failure rate: ${formatPercent(metrics.commandFailureRate)}`,
      `- Expensive checks: ${metrics.expensiveChecks}`,
      `- workspace:policy-fast count: ${metrics.workspacePolicyFastCount ?? 0}`,
      `- Time to useful diagnostic ms: ${metrics.timeToUsefulDiagnosticMs ?? "not measured"}`,
      `- Token total: ${metrics.tokenTotal ?? "not available"}`,
      `- Tool calls: ${metrics.toolCalls ?? "not available"}`,
      `- Token metric source: ${metrics.tokenMetricSource ?? "not measured"}`,
      `- Agent metric samples/windows/files: ${metrics.agentMetricSampleCount ?? "not measured"} / ${metrics.agentMetricWindowCount ?? "not measured"} / ${metrics.agentMetricTraceFilesScanned ?? "not measured"}`,
      `- Raw context bytes stored: ${metrics.rawContextBytes ?? 0}`,
      `- Duration samples: ${metrics.durationSampleCount ?? "not measured"}`,
      `- Duration total ms: ${metrics.durationTotalMs ?? "not measured"}`,
      `- Duration average ms: ${formatNumber(metrics.durationAverageMs)}`,
      `- Duration min/p50/p95/max ms: ${formatNumber(metrics.durationMinMs)} / ${formatNumber(metrics.durationP50Ms)} / ${formatNumber(metrics.durationP95Ms)} / ${formatNumber(metrics.durationMaxMs)}`,
      `- Cheap/medium/final-gate commands: ${metrics.cheapCommands ?? "not measured"} / ${metrics.mediumCommands ?? "not measured"} / ${metrics.finalGateCommands ?? "not measured"}`,
      `- Workspace-wide commands: ${metrics.workspaceWideCommands ?? "not measured"}`,
      `- Store-emitted commands: ${metrics.storeEmittedCommands ?? "not measured"}`,
      `- Unknown target commands: ${metrics.unknownTargetCommands ?? "not measured"}`,
      `- Unknown recipe commands: ${metrics.unknownRecipeCommands ?? "not measured"}`,
      `- Unique targets: ${metrics.uniqueTargets ?? "not measured"}`,
      `- Unique recipes: ${metrics.uniqueRecipes ?? "not measured"}`,
      `- Trellis diagnostic observations: ${metrics.trellisDiagnosticObservations ?? "not measured"}`,
      `- Observation inputs: ${metrics.observationInputCount ?? "not measured"}`,
      `- Trace/jsonl/sqlite files: ${metrics.traceFiles ?? "not measured"} / ${metrics.jsonlFiles ?? "not measured"} / ${metrics.sqliteFiles ?? "not measured"}`,
      `- SQLite schema tables: ${metrics.sqliteSchemaTables ?? "not measured"}`,
      `- Unique models/sessions: ${metrics.uniqueModels ?? "not measured"} / ${metrics.uniqueSessions ?? "not measured"}`,
      `- Unique/repeated command families: ${metrics.uniqueCommandFamilies ?? "not measured"} / ${metrics.repeatedCommandFamilies ?? "not measured"}`,
      `- Top command family: ${metrics.topCommandFamily ?? "not measured"}`,
      `- Top exit code: ${metrics.topExitCode ?? "not measured"}`,
      `- First/last observed command: ${metrics.firstObservedAt ?? "not measured"} / ${metrics.lastObservedAt ?? "not measured"}`,
      `- Observed command span ms: ${metrics.observedCommandSpanMs ?? "not measured"}`,
      `- Finding quality: ${metrics.findingQuality ?? "not scored"}`,
    ]

const renderObservationMatrix = (
  projection: MeasurementReportProjection,
): readonly string[] => {
  const kindCounts = new Map<string, number>()
  const sourceCounts = new Map<string, number>()
  for (const observation of projection.observationSummaries) {
    increment(kindCounts, observation.observationKind)
    increment(sourceCounts, observation.source ?? "unknown")
  }
  return [
    `- Observation input count: ${projection.observationIds.length}`,
    `- Observation kind count: ${kindCounts.size}`,
    `- Observation source count: ${sourceCounts.size}`,
    `- Baseline session observations: ${projection.baselineSessionObservationIds.length}`,
    `- First observation at: ${firstTimestamp(projection.observationSummaries.map((observation) => observation.observedAt)) ?? "not observed"}`,
    `- Last observation at: ${lastTimestamp(projection.observationSummaries.map((observation) => observation.observedAt)) ?? "not observed"}`,
    `- Observation span ms: ${spanMs(
      firstTimestamp(projection.observationSummaries.map((observation) => observation.observedAt)),
      lastTimestamp(projection.observationSummaries.map((observation) => observation.observedAt)),
    ) ?? "not measured"}`,
    "- Observation kinds:",
    ...renderCounts(topCounts(kindCounts, 20)).map((line) => `  ${line}`),
    "- Observation sources:",
    ...renderCounts(topCounts(sourceCounts, 20)).map((line) => `  ${line}`),
  ]
}

const renderOperationalEvidence = (
  projection: MeasurementReportProjection,
): readonly string[] => [
  `- Recipe spine coverage: ${projection.recipeSpineCoverage === undefined
    ? "not projected"
    : `recipes=${projection.recipeSpineCoverage.recipeCount}, edges=${projection.recipeSpineCoverage.edgeCount}, io=${projection.recipeSpineCoverage.ioCount}, runs=${projection.recipeSpineCoverage.runCount}, receipts=${projection.recipeSpineCoverage.receiptCount}, observations=${projection.recipeSpineCoverage.observationCount}, diagnostics=${projection.recipeSpineCoverage.diagnosticCount}, repairs=${projection.recipeSpineCoverage.repairCount}, health=${projection.recipeSpineCoverage.healthCount}`}`,
  `- Framework schemas preserved: ${projection.recipeSpineCoverage?.frameworkSchemasPreserved ?? "not projected"}`,
  `- Observation store: ${projection.recipeSpineCoverage?.observationStore ?? "not projected"}`,
  `- Edit-attempt audit: ${projection.editAttemptSummary === undefined
    ? "not projected"
    : `dirty=${projection.editAttemptSummary.dirtyPathCount}, source=${projection.editAttemptSummary.sourceEditCount}, reports=${projection.editAttemptSummary.reportExportEditCount}, generated/private=${projection.editAttemptSummary.generatedPrivateLedgerEditAttempts}, classes=${projection.editAttemptSummary.generatedPrivateLedgerPathClasses.join(",") || "none"}`}`,
  `- Legacy substrate audit: ${projection.legacySubstrateAudit === undefined
    ? "not projected"
    : `scanned=${projection.legacySubstrateAudit.scannedPathCount}, historical=${projection.legacySubstrateAudit.historicalReferenceCount}, enforcement=${projection.legacySubstrateAudit.enforcementReferenceCount}, fixtures=${projection.legacySubstrateAudit.testFixtureReferenceCount}, measurement=${projection.legacySubstrateAudit.measurementInventoryReferenceCount}, blockingLive=${projection.legacySubstrateAudit.blockingLiveReferenceCount}`}`,
]

const renderExperimentSnapshot = (
  summary: MicroExperimentProjection | undefined,
): readonly string[] => {
  if (summary === undefined) return ["- No micro-experiment summary was projected."]
  return [
    `- Baseline commands: ${summary.baseline?.shellCommands ?? "not measured"}`,
    `- Baseline source: ${summary.baseline?.findingQuality ?? "not scored"}`,
    `- Selected baseline session: ${summary.selectedBaselineSession?.sessionId ?? "not selected"}`,
    `- Selected baseline score: ${summary.selectedBaselineSession?.score ?? "not measured"}`,
    `- Selected baseline strength: ${summary.selectedBaselineSession === undefined ? "not selected" : selectedBaselineStrength(summary.selectedBaselineSession)}`,
    `- Selected baseline commands: ${summary.selectedBaseline?.shellCommands ?? "not measured"}`,
    `- Treatment commands: ${summary.treatment?.shellCommands ?? "not measured"}`,
    `- Baseline failed commands: ${summary.baseline?.failedCommands ?? "not measured"}`,
    `- Selected baseline failed commands: ${summary.selectedBaseline?.failedCommands ?? "not measured"}`,
    `- Treatment failed commands: ${summary.treatment?.failedCommands ?? "not measured"}`,
    `- Baseline expensive checks: ${summary.baseline?.expensiveChecks ?? "not measured"}`,
    `- Selected baseline expensive checks: ${summary.selectedBaseline?.expensiveChecks ?? "not measured"}`,
    `- Treatment expensive checks: ${summary.treatment?.expensiveChecks ?? "not measured"}`,
    `- Treatment time to useful diagnostic ms: ${summary.treatment?.timeToUsefulDiagnosticMs ?? "not measured"}`,
    `- Treatment command success rate: ${formatPercent(summary.treatment?.commandSuccessRate)}`,
    `- Treatment store-emitted commands: ${summary.treatment?.storeEmittedCommands ?? "not measured"}`,
    `- Baseline token/tool totals: ${summary.baseline?.tokenTotal ?? "not measured"} / ${summary.baseline?.toolCalls ?? "not measured"}`,
    `- Selected baseline token/tool totals: ${summary.selectedBaseline?.tokenTotal ?? "not measured"} / ${summary.selectedBaseline?.toolCalls ?? "not measured"}`,
    `- Treatment token/tool totals: ${summary.treatment?.tokenTotal ?? "not measured"} / ${summary.treatment?.toolCalls ?? "not measured"}`,
    `- Evidence gaps: ${summary.recommendation?.evidenceGaps.length ?? "not measured"}`,
  ]
}

const renderComparison = (
  summary: MicroExperimentProjection | undefined,
): readonly string[] => {
  if (summary?.comparison === undefined) return ["- No comparison metrics were stored."]
  return Object.entries(summary.comparison).map(([key, value]) => `- ${key}: ${formatComparisonValue(key, value)}`)
}

const renderSelectedBaselineComparison = (
  summary: MicroExperimentProjection | undefined,
  projection: MeasurementReportProjection,
): readonly string[] => {
  const stored = summary?.selectedBaselineComparison
  if (stored !== undefined) {
    return Object.entries(stored).map(([key, value]) => `- ${key}: ${formatComparisonValue(key, value)}`)
  }
  const selectedBaseline = summary?.selectedBaseline ?? selectedBaselineMetricsFromSession(projection.inventory.selectedBaselineSession)
  const treatment = summary?.treatment
  if (selectedBaseline === undefined || treatment === undefined) {
    return ["- No selected-baseline comparison metrics were stored."]
  }
  return Object.entries(experimentComparison(
    selectedBaseline,
    treatment,
    summary?.findingQualityMatrix ?? [],
  )).map(([key, value]) => `- ${key}: ${formatComparisonValue(key, value)}`)
}

const formatComparisonValue = (
  key: string,
  value: number | string | undefined,
): string => {
  if (value === undefined) return "not measured"
  if (typeof value === "string") return value
  if (/rate/i.test(key)) return `${(value * 100).toFixed(1)} percentage points`
  return formatNumber(value)
}

const renderFindingQuality = (
  rows: readonly FindingQualityRow[],
): readonly string[] =>
  rows.length === 0
    ? ["- No finding-quality rows were stored."]
    : [
      "| Finding | Baseline | Treatment | Evidence |",
      "| --- | --- | --- | --- |",
      ...rows.map((row) =>
        `| ${row.finding} | ${row.baseline} | ${row.treatment} | ${row.evidence} |`
      ),
    ]

const renderAgentMetrics = (
  metrics: readonly AgentMetricsProjection[],
): readonly string[] =>
  metrics.length === 0
    ? ["- No phase-level agent metrics were projected."]
    : [
      "| Phase | Token total | Tool calls | Samples | Windows | Trace files | Source | Window |",
      "| --- | ---: | ---: | ---: | ---: | ---: | --- | --- |",
      ...metrics.map((metric) =>
        `| ${metric.measurementPhase} | ${metric.tokenTotal} | ${metric.toolCalls} | ${metric.sampleCount} | ${metric.windowCount} | ${metric.traceFilesScanned} | ${metric.tokenMetricSource} | ${metric.startedAt ?? "not measured"} / ${metric.completedAt ?? "not measured"} |`
      ),
    ]

const renderMigrationReadiness = (
  readiness: MigrationReadinessProjection,
): readonly string[] => [
  `- Proceed to recipe-only migration: ${readiness.proceedToRecipeOnlyMigration ? "yes" : "no"}`,
  `- Summarized at: ${readiness.summarizedAt ?? "not measured"}`,
  "| Gate | Status | Evidence | Follow-up |",
  "| --- | --- | --- | --- |",
  ...readiness.gates.map((gate) =>
    `| ${gate.gate} | ${gate.status} | ${gate.evidence} | ${gate.followUp ?? "none"} |`
  ),
]

const renderEvidenceGaps = (
  gaps: readonly string[],
): readonly string[] =>
  gaps.length === 0 ? ["- None recorded."] : gaps.map((gap) => `- ${gap}`)

const renderRemainingGaps = (
  gaps: readonly RemainingGap[],
): readonly string[] =>
  gaps.length === 0
    ? ["- No remaining measurement gaps were detected for this session projection."]
    : [
      "| Gap | Type | Evidence status | Smallest follow-up |",
      "| --- | --- | --- | --- |",
      ...gaps.map((gap) =>
        `| ${gap.gap} | ${gap.type} | ${gap.evidenceStatus} | ${gap.followUp} |`
      ),
    ]

const renderCounts = (counts: readonly CountRecord[]): readonly string[] =>
  counts.length === 0
    ? ["- None observed."]
    : counts.map((item) => `- ${item.value}: ${item.count}`)

const renderCommandObservations = (
  observations: readonly CommandObservationProjection[],
): readonly string[] =>
  observations.length === 0
    ? ["- No command observations were present in the projected session."]
    : observations.map((observation) => [
      `- ${observation.command}`,
      `phase=${observation.measurementPhase ?? "unphased-treatment"}`,
      `target=${commandTargetIdentity(observation) ?? "unknown"}`,
      `nxTarget=${observation.knownNxTarget ?? "none"}`,
      `recipe=${observation.inferredRecipeId ?? "unknown"}`,
      `durationMs=${observation.durationMs ?? "unknown"}`,
      `exitCode=${observation.exitCode ?? "unknown"}`,
      `tokenTotal=${observation.tokenTotal ?? "not measured"}`,
      `toolCalls=${observation.toolCalls ?? "not measured"}`,
      `cost=${commandCostClass(observation)}`,
      `store=${observation.storeEmissionStatus}`,
      `observation=${observation.observationId}`,
    ].join(" | "))

const commandCostClass = (observation: CommandObservationProjection): string => {
  if (observation.knownNxTarget === "workspace:policy-fast") return "final-gate"
  return costClass(observation.durationMs)
}

const costClass = (durationMs: number | undefined): string => {
  if (durationMs === undefined) return "unknown"
  if (durationMs >= 300_000) return "final-gate"
  if (durationMs >= 60_000) return "expensive"
  if (durationMs >= 15_000) return "medium"
  return "cheap"
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : undefined

const stringValue = (
  record: Record<string, unknown> | undefined,
  key: string,
): string | undefined => {
  const value = record?.[key]
  return typeof value === "string" ? value : undefined
}

const numberValue = (
  record: Record<string, unknown> | undefined,
  key: string,
): number | undefined => {
  const value = record?.[key]
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

const booleanValue = (
  record: Record<string, unknown> | undefined,
  key: string,
): boolean | undefined => {
  const value = record?.[key]
  return typeof value === "boolean" ? value : undefined
}

const optionalString = <Key extends string>(
  key: Key,
  value: string | undefined,
): Record<Key, string> | Record<string, never> =>
  value === undefined || value.length === 0 ? {} : { [key]: value } as Record<Key, string>

const measurementPhaseValue = (
  record: Record<string, unknown> | undefined,
): CommandObservationProjection["measurementPhase"] | undefined => {
  const value = stringValue(record, "measurementPhase")
  return value === "baseline" || value === "treatment" ? value : undefined
}

const agentMetricsPhaseValue = (
  record: Record<string, unknown> | undefined,
): AgentMetricsProjection["measurementPhase"] | undefined => {
  const value = stringValue(record, "measurementPhase")
  return value === "baseline" || value === "treatment" || value === "session" ? value : undefined
}

const optionalMeasurementPhase = <Key extends string>(
  key: Key,
  value: CommandObservationProjection["measurementPhase"] | undefined,
): Record<Key, NonNullable<CommandObservationProjection["measurementPhase"]>> | Record<string, never> =>
  value === undefined ? {} : { [key]: value } as Record<Key, NonNullable<CommandObservationProjection["measurementPhase"]>>

const optionalNumber = <Key extends string>(
  key: Key,
  value: number | undefined,
): Record<Key, number> | Record<string, never> =>
  value === undefined ? {} : { [key]: value } as Record<Key, number>

const measurementPrivacySummary = (): TraceInventorySummary["privacy"] => ({
  rawPromptsStored: false,
  rawConversationStored: false,
  rawTraceRowsStored: false,
  fullCommandOutputStored: false,
})

const assignOptionalString = <Key extends keyof ExperimentRunMetricsProjection>(
  metrics: Partial<ExperimentRunMetricsProjection>,
  key: Key,
  value: string | undefined,
): void => {
  if (value !== undefined) {
    Object.assign(metrics, { [key]: value })
  }
}

const assignOptionalNumber = <Key extends keyof ExperimentRunMetricsProjection>(
  metrics: Partial<ExperimentRunMetricsProjection>,
  key: Key,
  value: number | undefined,
): void => {
  if (value !== undefined) {
    Object.assign(metrics, { [key]: value })
  }
}

const countRecords = (value: unknown): readonly CountRecord[] | undefined => {
  if (!Array.isArray(value)) return undefined
  const records: CountRecord[] = []
  for (const item of value) {
    const record = asRecord(item)
    const count = numberValue(record, "count")
    const itemValue = stringValue(record, "value")
    if (record === undefined || count === undefined || itemValue === undefined) {
      return undefined
    }
    records.push({ value: itemValue, count })
  }
  return records
}

const historicalSessionSummaries = (value: unknown): readonly HistoricalSessionSummary[] | undefined => {
  if (!Array.isArray(value)) return undefined
  const summaries: HistoricalSessionSummary[] = []
  for (const item of value) {
    const summary = historicalSessionSummaryFromValue(item)
    if (summary === undefined) return undefined
    summaries.push(summary)
  }
  return summaries
}

const historicalSessionSummaryFromValue = (value: unknown): HistoricalSessionSummary | undefined => {
  const record = asRecord(value)
  const sessionId = stringValue(record, "sessionId")
  const score = numberValue(record, "score")
  const scoreReasons = stringArray(record?.["scoreReasons"])
  const commandEvents = numberValue(record, "commandEvents")
  const uniqueCommandFamilies = numberValue(record, "uniqueCommandFamilies")
  const repeatedCommandFamilies = numberValue(record, "repeatedCommandFamilies")
  const repeatedCommandInvocations = numberValue(record, "repeatedCommandInvocations")
  const exitCodeEvents = numberValue(record, "exitCodeEvents")
  const failedCommands = numberValue(record, "failedCommands")
  const successfulCommands = numberValue(record, "successfulCommands")
  const expensiveChecks = numberValue(record, "expensiveChecks")
  const workspacePolicyFastCount = numberValue(record, "workspacePolicyFastCount")
  const durationMs = numericSummaryFromValue(record?.["durationMs"])
  const tokenTotal = numberValue(record, "tokenTotal")
  const toolCalls = numberValue(record, "toolCalls")
  const modelIds = countRecords(record?.["modelIds"])
  const commandFamilies = countRecords(record?.["commandFamilies"])
  const exitCodes = countRecords(record?.["exitCodes"])
  const matchedSignals = stringArray(record?.["matchedSignals"])
  const hasAttuneTrellisSignal = booleanValue(record, "hasAttuneTrellisSignal")
  const hasEnoughSamples = booleanValue(record, "hasEnoughSamples")
  const giantCatchallPenalty = booleanValue(record, "giantCatchallPenalty")
  if (
    sessionId === undefined
    || score === undefined
    || scoreReasons === undefined
    || commandEvents === undefined
    || uniqueCommandFamilies === undefined
    || repeatedCommandFamilies === undefined
    || repeatedCommandInvocations === undefined
    || exitCodeEvents === undefined
    || failedCommands === undefined
    || successfulCommands === undefined
    || expensiveChecks === undefined
    || workspacePolicyFastCount === undefined
    || durationMs === undefined
    || tokenTotal === undefined
    || toolCalls === undefined
    || modelIds === undefined
    || commandFamilies === undefined
    || exitCodes === undefined
    || matchedSignals === undefined
    || hasAttuneTrellisSignal === undefined
    || hasEnoughSamples === undefined
    || giantCatchallPenalty === undefined
  ) {
    return undefined
  }
  return {
    sessionId,
    score,
    scoreReasons,
    ...(optionalString("startedAt", stringValue(record, "startedAt"))),
    ...(optionalString("completedAt", stringValue(record, "completedAt"))),
    ...(optionalNumber("wallTimeMs", numberValue(record, "wallTimeMs"))),
    commandEvents,
    uniqueCommandFamilies,
    repeatedCommandFamilies,
    repeatedCommandInvocations,
    exitCodeEvents,
    failedCommands,
    successfulCommands,
    ...(optionalNumber("commandSuccessRate", numberValue(record, "commandSuccessRate"))),
    expensiveChecks,
    workspacePolicyFastCount,
    ...(optionalNumber("timeToFirstUsefulDiagnosticMs", numberValue(record, "timeToFirstUsefulDiagnosticMs"))),
    durationMs,
    tokenTotal,
    toolCalls,
    modelIds,
    commandFamilies,
    exitCodes,
    matchedSignals,
    hasAttuneTrellisSignal,
    hasEnoughSamples,
    giantCatchallPenalty,
    privacy: measurementPrivacySummary(),
  }
}

const sqliteSchemaSummaries = (value: unknown): readonly SqliteSchemaSummary[] | undefined => {
  if (!Array.isArray(value)) return undefined
  const summaries: SqliteSchemaSummary[] = []
  for (const item of value) {
    const record = asRecord(item)
    const fileId = stringValue(record, "fileId")
    const fileKind = stringValue(record, "fileKind")
    const inspected = record?.["inspected"]
    const tableCount = numberValue(record, "tableCount")
    const tables = sqliteSchemaTableSummaries(record?.["tables"])
    if (
      fileId === undefined
      || (fileKind !== "sqlite" && fileKind !== "db")
      || typeof inspected !== "boolean"
      || tableCount === undefined
      || tables === undefined
    ) {
      return undefined
    }
    summaries.push({
      fileId,
      fileKind,
      inspected,
      tableCount,
      tables,
      ...(optionalString("skippedReason", stringValue(record, "skippedReason"))),
    })
  }
  return summaries
}

const sqliteSchemaTableSummaries = (value: unknown): readonly SqliteSchemaTableSummary[] | undefined => {
  if (!Array.isArray(value)) return undefined
  const tables: SqliteSchemaTableSummary[] = []
  for (const item of value) {
    const record = asRecord(item)
    const tableName = stringValue(record, "tableName")
    const allowlistedColumns = stringArray(record?.["allowlistedColumns"])
    const skippedColumnCount = numberValue(record, "skippedColumnCount")
    if (tableName === undefined || allowlistedColumns === undefined || skippedColumnCount === undefined) {
      return undefined
    }
    tables.push({ tableName, allowlistedColumns, skippedColumnCount })
  }
  return tables
}

const stringArray = (value: unknown): readonly string[] | undefined =>
  Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : undefined

const numericSummaryFromValue = (value: unknown): NumericSummary | undefined => {
  const record = asRecord(value)
  if (record === undefined) return undefined
  const count = numberValue(record, "count")
  const total = numberValue(record, "total")
  if (count === undefined || total === undefined) return undefined
  return {
    count,
    total,
    ...(optionalNumber("min", numberValue(record, "min"))),
    ...(optionalNumber("max", numberValue(record, "max"))),
    ...(optionalNumber("average", numberValue(record, "average"))),
    ...(optionalNumber("p50", numberValue(record, "p50"))),
    ...(optionalNumber("p95", numberValue(record, "p95"))),
  }
}

const timestampRangeFromValue = (value: unknown): TimestampRangeSummary | undefined => {
  const record = asRecord(value)
  if (record === undefined) return undefined
  const count = numberValue(record, "count")
  if (count === undefined) return undefined
  return {
    count,
    ...(optionalString("earliest", stringValue(record, "earliest"))),
    ...(optionalString("latest", stringValue(record, "latest"))),
    ...(optionalNumber("spanMs", numberValue(record, "spanMs"))),
  }
}

const writeReport = (
  reportsDir: string,
  name: string,
  contents: string,
): string => {
  const reportPath = path.join(reportsDir, name)
  fs.writeFileSync(reportPath, contents, "utf8")
  return reportPath
}

const emptyTraceInventory = (
  measurementSessionId: string,
  codexHome: string,
): TraceInventorySummary => ({
  measurementSessionId,
  scannedAt: new Date().toISOString(),
  codexHome,
  traceFiles: 0,
  sqliteFiles: 0,
  jsonlFiles: 0,
  skippedFiles: 0,
  sqliteSchemaFilesInspected: 0,
  sqliteSchemaFilesSkipped: 0,
  sqliteSchemas: [],
  commandEventCount: 0,
  uniqueCommandFamilies: 0,
  repeatedCommandFamilyCount: 0,
  repeatedCommandInvocationCount: 0,
  exitCodeEventCount: 0,
  failedExitCodeCount: 0,
  timestampRange: { count: 0 },
  durationMs: { count: 0, total: 0 },
  commandFamilies: [],
  repeatedCommandPatterns: [],
  exitCodes: [],
  comparableSessionCandidates: [],
  toolCalls: 0,
  tokenTotal: 0,
  modelIds: [],
  sessionIds: [],
  privacy: measurementPrivacySummary(),
})

const numericSummary = (values: readonly number[]): NumericSummary => {
  const clean = values.filter((value) => Number.isFinite(value) && value >= 0).sort((left, right) => left - right)
  if (clean.length === 0) return { count: 0, total: 0 }
  const total = clean.reduce((sum, value) => sum + value, 0)
  return {
    count: clean.length,
    total,
    ...(optionalNumber("min", clean.at(0))),
    ...(optionalNumber("max", clean.at(-1))),
    ...(optionalNumber("average", total / clean.length)),
    ...(optionalNumber("p50", percentile(clean, 0.5))),
    ...(optionalNumber("p95", percentile(clean, 0.95))),
  }
}

const timestampRangeSummary = (timestamps: readonly string[]): TimestampRangeSummary => {
  const clean = timestamps
    .filter(validIsoTimestamp)
    .map((timestamp) => new Date(timestamp).toISOString())
    .sort()
  const earliest = clean[0]
  const latest = clean[clean.length - 1]
  return {
    count: clean.length,
    ...(optionalString("earliest", earliest)),
    ...(optionalString("latest", latest)),
    ...(optionalNumber("spanMs", spanMs(earliest, latest))),
  }
}

const recordHistoricalSessionMetadata = (
  groups: Map<string, MutableHistoricalSessionGroup>,
  metadata: DerivedTraceMetadata,
  fallbackSessionId: string,
): void => {
  const sessionIds = [...new Set(metadata.sessionIds.length > 0 ? metadata.sessionIds : [fallbackSessionId])]
  if (sessionIds.length === 0) return
  for (const sessionId of sessionIds) {
    const group = historicalSessionGroup(groups, sessionId)
    for (const command of metadata.commandFamilies) increment(group.commandFamilies, command)
    for (const code of metadata.exitCodes) increment(group.exitCodes, code)
    for (const model of metadata.modelIds) increment(group.modelIds, model)
    group.durationsMs.push(...metadata.durationsMs)
    group.timestamps.push(...metadata.timestamps)
    if (metadata.commandFamilies.some((command) => usefulDiagnosticCommandPattern.test(command))) {
      group.usefulDiagnosticTimestamps.push(...metadata.timestamps)
    }
    group.toolCalls += metadata.toolCalls
    if (metadata.cumulativeTokenTotal === undefined) {
      group.incrementalTokenTotal += metadata.tokenTotal
    } else {
      group.cumulativeTokenTotals.push(metadata.cumulativeTokenTotal)
    }
  }
}

const historicalSessionGroup = (
  groups: Map<string, MutableHistoricalSessionGroup>,
  sessionId: string,
): MutableHistoricalSessionGroup => {
  const existing = groups.get(sessionId)
  if (existing !== undefined) return existing
  const created: MutableHistoricalSessionGroup = {
    sessionId,
    commandFamilies: new Map(),
    exitCodes: new Map(),
    modelIds: new Map(),
    durationsMs: [],
    timestamps: [],
    usefulDiagnosticTimestamps: [],
    incrementalTokenTotal: 0,
    cumulativeTokenTotals: [],
    toolCalls: 0,
  }
  groups.set(sessionId, created)
  return created
}

const comparableSessionCandidates = (
  groups: ReadonlyMap<string, MutableHistoricalSessionGroup>,
): readonly HistoricalSessionSummary[] =>
  [...groups.values()]
    .map(historicalSessionSummary)
    .filter((session) => session.commandEvents > 0)
    .sort((left, right) =>
      right.score - left.score
      || Number(right.hasAttuneTrellisSignal) - Number(left.hasAttuneTrellisSignal)
      || Number(right.hasEnoughSamples) - Number(left.hasEnoughSamples)
      || left.commandEvents - right.commandEvents
      || left.sessionId.localeCompare(right.sessionId)
    )
    .slice(0, comparableSessionCandidateLimit)

const selectComparableBaselineSession = (
  groups: ReadonlyMap<string, MutableHistoricalSessionGroup>,
): HistoricalSessionSummary | undefined =>
  comparableSessionCandidates(groups)[0]

const optionalHistoricalSession = <Key extends string>(
  key: Key,
  value: HistoricalSessionSummary | undefined,
): Record<Key, HistoricalSessionSummary> | Record<string, never> =>
  value === undefined ? {} : { [key]: value } as Record<Key, HistoricalSessionSummary>

const historicalSessionSummary = (
  group: MutableHistoricalSessionGroup,
): HistoricalSessionSummary => {
  const commandEvents = countTotal(group.commandFamilies)
  const exitCodeEvents = countTotal(group.exitCodes)
  const failedCommands = [...group.exitCodes.entries()]
    .filter(([code]) => code !== "0")
    .reduce((sum, [, count]) => sum + count, 0)
  const successfulCommands = group.exitCodes.get("0") ?? 0
  const timestampRange = timestampRangeSummary(group.timestamps)
  const durationMs = numericSummary(group.durationsMs)
  const allCommandFamilies = topCounts(group.commandFamilies, group.commandFamilies.size)
  const commandFamilies = allCommandFamilies.slice(0, 40)
  const matchedSignals = matchedComparableSessionSignals(allCommandFamilies)
  const hasAttuneTrellisSignal = matchedSignals.length > 0
  const hasEnoughSamples = commandEvents >= 2 && (durationMs.count > 0 || exitCodeEvents > 0)
  const giantCatchallPenalty = (timestampRange.spanMs ?? 0) > giantCatchallWindowMs
  const scoreReasons: string[] = []
  let score = 0

  for (const signal of matchedSignals) {
    const weight = comparableSessionSignals.find((candidate) => candidate.signal === signal)?.weight ?? 0
    score += weight
    scoreReasons.push(`matched command signal: ${signal}`)
  }
  if (hasEnoughSamples) {
    score += 20
    scoreReasons.push(`enough samples: ${commandEvents} command events`)
  } else {
    score -= 20
    scoreReasons.push(`limited samples: ${commandEvents} command events`)
  }
  if (durationMs.count > 0) {
    score += Math.min(15, durationMs.count * 3)
    scoreReasons.push(`duration samples: ${durationMs.count}`)
  }
  if (exitCodeEvents > 0) {
    score += Math.min(12, exitCodeEvents * 2)
    scoreReasons.push(`exit-code samples: ${exitCodeEvents}`)
  }
  if (timestampRange.spanMs !== undefined) {
    if (timestampRange.spanMs <= 4 * 60 * 60 * 1_000) {
      score += 12
      scoreReasons.push(`bounded task window: ${timestampRange.spanMs}ms`)
    } else if (timestampRange.spanMs <= giantCatchallWindowMs) {
      score += 5
      scoreReasons.push(`same-day task window: ${timestampRange.spanMs}ms`)
    } else {
      score -= 35
      scoreReasons.push(`penalized giant catchall window: ${timestampRange.spanMs}ms`)
    }
  } else {
    scoreReasons.push("task window not inferable")
  }

  const diagnosticStart = firstTimestamp(group.timestamps)
  const firstUsefulDiagnostic = firstTimestamp(group.usefulDiagnosticTimestamps)
  return {
    sessionId: group.sessionId,
    score,
    scoreReasons,
    ...(optionalString("startedAt", timestampRange.earliest)),
    ...(optionalString("completedAt", timestampRange.latest)),
    ...(optionalNumber("wallTimeMs", timestampRange.spanMs)),
    commandEvents,
    uniqueCommandFamilies: group.commandFamilies.size,
    repeatedCommandFamilies: [...group.commandFamilies.values()].filter((count) => count > 1).length,
    repeatedCommandInvocations: [...group.commandFamilies.values()]
      .filter((count) => count > 1)
      .reduce((sum, count) => sum + count, 0),
    exitCodeEvents,
    failedCommands,
    successfulCommands,
    ...(optionalNumber("commandSuccessRate", ratio(successfulCommands, exitCodeEvents))),
    expensiveChecks: expensiveCommandCount(allCommandFamilies),
    workspacePolicyFastCount: allCommandFamilies
      .filter((item) => item.value.includes("workspace:policy-fast"))
      .reduce((sum, item) => sum + item.count, 0),
    ...(optionalNumber("timeToFirstUsefulDiagnosticMs", spanMs(diagnosticStart, firstUsefulDiagnostic))),
    durationMs,
    tokenTotal: group.cumulativeTokenTotals.length > 0
      ? maxNumber(group.cumulativeTokenTotals)
      : group.incrementalTokenTotal,
    toolCalls: group.toolCalls,
    modelIds: topCounts(group.modelIds, 20),
    commandFamilies,
    exitCodes: topCounts(group.exitCodes, 20),
    matchedSignals,
    hasAttuneTrellisSignal,
    hasEnoughSamples,
    giantCatchallPenalty,
    privacy: measurementPrivacySummary(),
  }
}

const matchedComparableSessionSignals = (
  commandFamilies: readonly CountRecord[],
): readonly string[] => {
  const matched: string[] = []
  for (const candidate of comparableSessionSignals) {
    if (commandFamilies.some((command) => candidate.pattern.test(command.value))) {
      matched.push(candidate.signal)
    }
  }
  return matched
}

const expensiveCommandCount = (
  commandFamilies: readonly CountRecord[],
): number =>
  commandFamilies
    .filter((item) => /workspace:|test|typecheck|validate|recipe-substrate-check/iu.test(item.value))
    .reduce((sum, item) => sum + item.count, 0)

const percentile = (sortedValues: readonly number[], quantile: number): number | undefined => {
  if (sortedValues.length === 0) return undefined
  const bounded = Math.max(0, Math.min(1, quantile))
  const index = Math.min(sortedValues.length - 1, Math.ceil(sortedValues.length * bounded) - 1)
  return sortedValues[index]
}

const countTotal = (map: ReadonlyMap<string, number>): number =>
  [...map.values()].reduce((sum, value) => sum + value, 0)

const ratio = (numerator: number | undefined, denominator: number | undefined): number | undefined =>
  numerator === undefined || denominator === undefined || denominator === 0
    ? undefined
    : numerator / denominator

const optionalSum = (values: readonly number[]): number | undefined =>
  values.length === 0 ? undefined : values.reduce((sum, value) => sum + value, 0)

const maxNumber = (values: readonly number[]): number =>
  values.reduce((max, value) => Math.max(max, value), 0)

const delta = (left: number | undefined, right: number | undefined): number | undefined =>
  left === undefined || right === undefined ? undefined : left - right

const nonZeroNumber = (value: number | undefined): number | undefined =>
  value === undefined || value === 0 ? undefined : value

const firstTimestamp = (values: readonly (string | undefined)[]): string | undefined =>
  values.filter(isDefined).filter(validIsoTimestamp).sort()[0]

const lastTimestamp = (values: readonly (string | undefined)[]): string | undefined => {
  const sorted = values.filter(isDefined).filter(validIsoTimestamp).sort()
  return sorted[sorted.length - 1]
}

const spanMs = (start: string | undefined, end: string | undefined): number | undefined => {
  if (start === undefined || end === undefined || !validIsoTimestamp(start) || !validIsoTimestamp(end)) return undefined
  const span = new Date(end).getTime() - new Date(start).getTime()
  return Number.isFinite(span) && span >= 0 ? span : undefined
}

const validIsoTimestamp = (value: string): boolean => {
  const time = Date.parse(value)
  return Number.isFinite(time)
}

const timeToUsefulDiagnosticMs = (
  observations: readonly ObservationSummaryProjection[],
  commands: readonly CommandObservationProjection[],
): number | undefined => {
  const sessionStart = firstTimestamp(observations
    .filter((observation) => observation.observationKind === "measurement.session.started")
    .map((observation) => observation.observedAt))
    ?? firstTimestamp(commands.flatMap((command) => [command.startedAt, command.observedAt]))
  const diagnosticAt = firstTimestamp([
    ...observations
      .filter((observation) => observation.observationKind === "trellis-language-service.diagnostic-run-summary")
      .map((observation) => observation.observedAt),
    ...commands
      .filter((command) => /trellis-ls diagnostics/u.test(command.command))
      .flatMap((command) => [command.startedAt, command.observedAt]),
  ])
  return spanMs(sessionStart, diagnosticAt)
}

const derivePhaseAgentMetrics = (input: {
  readonly codexHome: string
  readonly commandObservations: readonly CommandObservationProjection[]
  readonly maxFiles: number
}): readonly AgentMetricsProjection[] => {
  const files = fs.existsSync(input.codexHome)
    ? traceFiles(input.codexHome, input.maxFiles).filter((file) => file.endsWith(".jsonl"))
    : []
  if (files.length === 0 || input.commandObservations.length === 0) return []
  const samples = traceMetricSamples(files)
  if (samples.length === 0) return []
  return (["baseline", "treatment"] as const).flatMap((measurementPhase) => {
    const commands = measurementPhase === "baseline"
      ? controlledBaselineCommandObservations(input.commandObservations)
      : treatmentCommandObservations(input.commandObservations)
    const windows = commandMetricWindows(commands)
    if (windows.length === 0) return []
    const matchedSamples = samples.filter((sample) =>
      windows.some((window) => timestampInWindow(sample.observedAt, window))
    )
    const summary = summarizeAgentMetricSamples(measurementPhase, matchedSamples, files.length, windows)
    return summary === undefined ? [] : [summary]
  })
}

const traceMetricSamples = (
  files: readonly string[],
): readonly TraceMetricSample[] => {
  const samples: TraceMetricSample[] = []
  for (const file of files) {
    try {
      for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/u)) {
        if (line.trim().length === 0) continue
        const parsed = parseJson(line)
        if (parsed === undefined) continue
        const sample = traceMetricSampleFromValue(parsed)
        if (sample !== undefined) samples.push(sample)
      }
    } catch {
      continue
    }
  }
  return samples
}

const traceMetricSampleFromValue = (
  value: unknown,
): TraceMetricSample | undefined => {
  const timestamps: string[] = []
  let tokenTotal = 0
  let hasTokenTotal = false
  const cumulativeTokenTotals: number[] = []
  let toolCalls = 0

  const visit = (node: unknown, key = "", pathKeys: readonly string[] = []): void => {
    const pathWithKey = key.length === 0 ? pathKeys : [...pathKeys, key]
    if (forbiddenKeyPattern.test(key)) return
    if (Array.isArray(node)) {
      for (const item of node) visit(item, key, pathKeys)
      return
    }
    if (node === null || typeof node !== "object") {
      if (typeof node === "string") {
        if (timestampKeyPattern.test(key) && validIsoTimestamp(node)) {
          timestamps.push(new Date(node).toISOString())
        }
        if (key === "type" && toolCallEventTypePattern.test(node)) toolCalls += 1
        return
      }
      if (typeof node === "number" && Number.isFinite(node) && node >= 0) {
        if (tokenCountKeyPattern.test(key)) {
          if (pathWithKey.some((part) => part === "total_token_usage" || part === "totalTokenUsage")) {
            cumulativeTokenTotals.push(node)
          } else {
            tokenTotal += node
            hasTokenTotal = true
          }
          return
        }
        if (/^(?:toolCalls|toolCallCount|tool_call_count)$/u.test(key)) {
          toolCalls += node
        }
      }
      if (/toolCall|tool_call|toolName|tool_name/u.test(key)) toolCalls += 1
      return
    }
    for (const [childKey, childValue] of Object.entries(node)) {
      visit(childValue, childKey, pathWithKey)
    }
  }

  visit(value)
  if (!hasTokenTotal && cumulativeTokenTotals.length === 0 && toolCalls === 0) return undefined
  const observedAt = firstTimestamp(timestamps)
  if (observedAt === undefined) return undefined
  return {
    observedAt,
    tokenTotal,
    ...(cumulativeTokenTotals.length === 0 ? {} : {
      cumulativeTokenTotal: maxNumber(cumulativeTokenTotals),
    }),
    toolCalls,
  }
}

const commandMetricWindows = (
  commands: readonly CommandObservationProjection[],
): readonly { readonly startedAt: string; readonly completedAt: string }[] =>
  commands.flatMap((command) => {
    const startedAt = validIsoTimestamp(command.startedAt ?? "")
      ? command.startedAt
      : validIsoTimestamp(command.observedAt)
      ? command.observedAt
      : undefined
    const completedAt = validIsoTimestamp(command.completedAt ?? "")
      ? command.completedAt
      : startedAt
    if (startedAt === undefined || completedAt === undefined) return []
    return new Date(completedAt).getTime() >= new Date(startedAt).getTime()
      ? [{ startedAt, completedAt }]
      : []
  })

const timestampInWindow = (
  timestamp: string,
  window: { readonly startedAt: string; readonly completedAt: string },
): boolean =>
  timestamp >= window.startedAt && timestamp <= window.completedAt

const summarizeAgentMetricSamples = (
  measurementPhase: "baseline" | "treatment",
  samples: readonly TraceMetricSample[],
  traceFilesScanned: number,
  windows: readonly { readonly startedAt: string; readonly completedAt: string }[],
): AgentMetricsProjection | undefined => {
  if (samples.length === 0) return undefined
  const incrementalTokenTotal = samples.reduce((sum, sample) => sum + sample.tokenTotal, 0)
  const cumulativeTokenValues = samples
    .flatMap((sample) => sample.cumulativeTokenTotal === undefined ? [] : [sample.cumulativeTokenTotal])
    .sort((left, right) => left - right)
  const cumulativeTokenDelta = cumulativeTokenValues.length >= 2
    ? Math.max(0, cumulativeTokenValues[cumulativeTokenValues.length - 1]! - cumulativeTokenValues[0]!)
    : 0
  const tokenTotal = incrementalTokenTotal + cumulativeTokenDelta
  const toolCalls = samples.reduce((sum, sample) => sum + sample.toolCalls, 0)
  if (tokenTotal === 0 && toolCalls === 0) return undefined
  const startedAt = firstTimestamp(windows.map((window) => window.startedAt))
  const completedAt = lastTimestamp(windows.map((window) => window.completedAt))
  const sourceKinds = [
    ...(incrementalTokenTotal > 0 ? ["incremental"] : []),
    ...(cumulativeTokenValues.length >= 2 ? ["cumulative-delta"] : []),
    ...(toolCalls > 0 ? ["tool-call-count"] : []),
  ]
  return {
    measurementPhase,
    capturedAt: new Date().toISOString(),
    source: "codex-trace-window-v1",
    tokenTotal,
    toolCalls,
    sampleCount: samples.length,
    traceFilesScanned,
    windowCount: windows.length,
    ...(optionalString("startedAt", startedAt)),
    ...(optionalString("completedAt", completedAt)),
    tokenMetricSource: `trace-jsonl-window:${sourceKinds.join("+") || "aggregate"}`,
  }
}

const isDefined = <Value>(value: Value | undefined): value is Value =>
  value !== undefined

const knownIdentity = (value: string | undefined): value is string =>
  value !== undefined && value.length > 0 && value !== "unknown"

const formatNumber = (value: number | undefined): string =>
  value === undefined ? "not measured" : Number.isInteger(value) ? String(value) : value.toFixed(2)

const formatPercent = (value: number | undefined): string =>
  value === undefined ? "not measured" : `${(value * 100).toFixed(1)}%`

const inspectSqliteSchemas = (
  files: readonly string[],
): {
  readonly inspectedFiles: number
  readonly skippedFiles: number
  readonly schemas: readonly SqliteSchemaSummary[]
} => {
  if (files.length === 0) {
    return { inspectedFiles: 0, skippedFiles: 0, schemas: [] }
  }

  const candidates = files.map((file) => classifySqliteCandidate(file))
  const inspectable = candidates.filter((candidate) => candidate.inspect)
  if (inspectable.length > 0 && !sqlite3Available()) {
    throw new Error("SQLite schema inspection requires `sqlite3` for full measurement inventory.")
  }

  const schemas: SqliteSchemaSummary[] = []
  let inspectedFiles = 0
  let skippedFiles = 0
  for (const candidate of candidates) {
    if (!candidate.inspect) {
      skippedFiles++
      schemas.push({
        fileId: fileIdFor(candidate.file),
        fileKind: candidate.fileKind,
        inspected: false,
        tableCount: 0,
        tables: [],
        skippedReason: candidate.skippedReason ?? "not-sqlite",
      })
      continue
    }
    schemas.push(inspectSqliteSchema(candidate.file, candidate.fileKind))
    inspectedFiles++
  }

  return { inspectedFiles, skippedFiles, schemas }
}

const classifySqliteCandidate = (
  file: string,
): {
  readonly file: string
  readonly fileKind: "sqlite" | "db"
  readonly inspect: boolean
  readonly skippedReason?: string
} => {
  const fileKind = file.endsWith(".sqlite") ? "sqlite" : "db"
  const header = sqliteHeader(file)
  if (header === undefined) {
    if (fileKind === "sqlite") {
      throw new Error(`Unable to inspect SQLite header for ${fileIdFor(file)}.`)
    }
    return { file, fileKind, inspect: false, skippedReason: "unreadable-header" }
  }
  const isSqlite = header.startsWith("SQLite format 3")
  if (isSqlite) return { file, fileKind, inspect: true }
  if (fileKind === "sqlite") {
    throw new Error(`SQLite schema inventory expected a SQLite header for ${fileIdFor(file)}.`)
  }
  return { file, fileKind, inspect: false, skippedReason: "not-sqlite-header" }
}

const sqliteHeader = (file: string): string | undefined => {
  try {
    const descriptor = fs.openSync(file, "r")
    try {
      const buffer = Buffer.alloc(16)
      fs.readSync(descriptor, buffer, 0, buffer.length, 0)
      return buffer.toString("utf8")
    } finally {
      fs.closeSync(descriptor)
    }
  } catch {
    return undefined
  }
}

const sqlite3Available = (): boolean => {
  const result = childProcess.spawnSync("sqlite3", ["-version"], {
    encoding: "utf8",
    timeout: 5_000,
  })
  return result.status === 0
}

const inspectSqliteSchema = (
  file: string,
  fileKind: "sqlite" | "db",
): SqliteSchemaSummary => {
  const tableNames = sqlite3Lines(file, "SELECT name FROM sqlite_schema WHERE type IN ('table', 'view') AND name NOT LIKE 'sqlite_%' ORDER BY name;")
  const tables = tableNames.map((tableName) => {
    const columns = sqlite3Rows(file, `PRAGMA table_info(${quoteSqliteIdentifier(tableName)});`)
      .map((row) => row[1])
      .filter((column): column is string => column !== undefined && column.length > 0)
    const allowlistedColumns = columns.filter((column) => sqliteAllowedColumnPattern.test(column))
    return {
      tableName,
      allowlistedColumns,
      skippedColumnCount: Math.max(0, columns.length - allowlistedColumns.length),
    }
  })
  return {
    fileId: fileIdFor(file),
    fileKind,
    inspected: true,
    tableCount: tables.length,
    tables,
  }
}

const sqlite3Lines = (
  file: string,
  sql: string,
): readonly string[] =>
  sqlite3Output(file, sql)
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

const sqlite3Rows = (
  file: string,
  sql: string,
): readonly (readonly string[])[] =>
  sqlite3Lines(file, sql).map((line) => line.split("\u001f"))

const sqlite3Output = (
  file: string,
  sql: string,
): string => {
  const result = childProcess.spawnSync("sqlite3", [
    "-readonly",
    "-batch",
    "-noheader",
    "-separator",
    "\u001f",
    file,
    sql,
  ], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
    timeout: 10_000,
  })
  if (result.status !== 0) {
    const detail = summarizeCommandOutput(result.stderr ?? result.error?.message ?? "sqlite3 failed").text
    throw new Error(`SQLite schema inspection failed for ${fileIdFor(file)}: ${detail}`)
  }
  return result.stdout
}

const quoteSqliteIdentifier = (value: string): string =>
  `"${value.replaceAll("\"", "\"\"")}"`

const fileIdFor = (file: string): string => {
  const hash = crypto.createHash("sha256").update(path.resolve(file)).digest("hex").slice(0, 16)
  return `sha256:${hash}`
}

const traceFiles = (
  root: string,
  maxFiles: number,
): readonly string[] => {
  const out: string[] = []
  const visit = (dir: string): void => {
    if (out.length >= maxFiles) return
    for (const entry of safeReadDir(dir)) {
      if (out.length >= maxFiles) return
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        visit(fullPath)
      } else if (/\.(?:jsonl|sqlite|db)$/u.test(entry.name)) {
        out.push(fullPath)
      }
    }
  }
  visit(root)
  return out.sort()
}

const safeReadDir = (dir: string): readonly fs.Dirent[] => {
  try {
    return fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return []
  }
}

const parseJson = (value: string): unknown | undefined => {
  try {
    return JSON.parse(value) as unknown
  } catch {
    return undefined
  }
}

const deriveMetadata = (value: unknown): DerivedTraceMetadata => {
  const commandFamilies: string[] = []
  const exitCodes: string[] = []
  const modelIds: string[] = []
  const sessionIds: string[] = []
  const durationsMs: number[] = []
  const timestamps: string[] = []
  let toolCalls = 0
  let tokenTotal = 0
  const cumulativeTokenTotals: number[] = []

  const visit = (node: unknown, key = "", pathKeys: readonly string[] = []): void => {
    const pathWithKey = key.length === 0 ? pathKeys : [...pathKeys, key]
    if (forbiddenKeyPattern.test(key)) return
    if (Array.isArray(node)) {
      if (commandKeyPattern.test(key) && node.every((item) => typeof item === "string")) {
        commandFamilies.push(commandFamily(node))
        return
      }
      for (const item of node) visit(item, key, pathKeys)
      return
    }
    if (node === null || typeof node !== "object") {
      if (typeof node === "string") {
        if (commandKeyPattern.test(key)) commandFamilies.push(commandFamily([node]))
        if (exitCodeKeyPattern.test(key)) exitCodes.push(node)
        if (modelKeyPattern.test(key)) modelIds.push(safeIdentifier(node))
        if (sessionKeyPattern.test(key)) sessionIds.push(safeIdentifier(node))
        if (timestampKeyPattern.test(key) && validIsoTimestamp(node)) timestamps.push(new Date(node).toISOString())
        if (key === "type" && toolCallEventTypePattern.test(node)) toolCalls += 1
      }
      if (typeof node === "number") {
        if (durationKeyPattern.test(key)) {
          if (Number.isFinite(node) && node >= 0) durationsMs.push(node)
          return
        }
        if (exitCodeKeyPattern.test(key)) exitCodes.push(String(node))
        if (tokenCountKeyPattern.test(key)) {
          if (pathWithKey.some((part) => part === "total_token_usage" || part === "totalTokenUsage")) {
            cumulativeTokenTotals.push(node)
          } else {
            tokenTotal += node
          }
        }
      }
      if (/toolCall|tool_call|toolName|tool_name/u.test(key)) toolCalls += 1
      return
    }

    for (const [childKey, childValue] of Object.entries(node)) {
      visit(childValue, childKey, pathWithKey)
    }
  }

  visit(value)
  return {
    commandFamilies,
    exitCodes,
    modelIds,
    sessionIds,
    durationsMs,
    timestamps,
    toolCalls,
    tokenTotal,
    ...(cumulativeTokenTotals.length === 0 ? {} : {
      cumulativeTokenTotal: Math.max(...cumulativeTokenTotals),
    }),
  }
}

const commandFamily = (argv: readonly string[]): string => {
  const normalized = normalizeTraceCommandArgv(argv)
  const [command, ...args] = normalized
  if (command === undefined) return "unknown"
  const nxIndex = normalized.findIndex((part) => part === "nx")
  if (nxIndex >= 0) {
    const runIndex = normalized.findIndex((part, index) => index > nxIndex && part === "run")
    if (runIndex >= 0 && normalized[runIndex + 1] !== undefined) {
      return `nx run ${normalized[runIndex + 1]}`
    }
    return "nx"
  }
  if (/^(?:bash|sh|zsh|fish)$/u.test(path.basename(command)) && args.some((arg) => arg === "-c" || arg === "-lc")) {
    return shellScriptCommandFamily(path.basename(command), args)
  }
  return [path.basename(command), ...args.slice(0, 2).map(redactInlineSecret)].join(" ")
}

const shellScriptCommandFamily = (
  shellName: string,
  args: readonly string[],
): string => {
  const commandIndex = args.findIndex((arg) => arg === "-c" || arg === "-lc")
  const script = commandIndex >= 0 ? args[commandIndex + 1] : undefined
  if (script === undefined) return `${shellName} -c [shell-script-redacted]`
  const nxTarget = script.match(/\bnx\s+run\s+([@A-Za-z0-9_.:-]+)/u)?.[1]
  if (nxTarget !== undefined) return `nx run ${nxTarget}`
  const explicitTarget = script.match(/\b((?:framework-language-service|framework-runtime|tend-opencode|workspace):[@A-Za-z0-9_.:-]+)\b/u)?.[1]
  if (explicitTarget !== undefined) return `nx run ${explicitTarget}`
  if (/\btrellis-ls\b[^\n;&|]*\b(?:fastpath|packet-fastpath)\b/u.test(script)) return "trellis-ls fastpath"
  if (/\btrellis-ls\b[^\n;&|]*\bdiagnostics\b/u.test(script)) return "trellis-ls diagnostics"
  if (/\btrellis-ls\b[^\n;&|]*\bfix/u.test(script)) return "trellis-ls fixes"
  if (/\btend-opencode\b[^\n;&|]*\bobserve\b/u.test(script)) return "tend-opencode observe"
  if (/\btend-opencode\b/u.test(script)) return "tend-opencode"
  if (/\brecipe-substrate-check\b/u.test(script)) return "nx run workspace:recipe-substrate-check"
  return `${shellName} -c [shell-script-redacted]`
}

const normalizeTraceCommandArgv = (argv: readonly string[]): readonly string[] =>
  argv
    .filter((part) => !/^[A-Za-z_][A-Za-z0-9_]*=/u.test(part))
    .map(redactInlineSecret)

const redactInlineSecret = (value: string): string =>
  /(?:token|secret|password|api[_-]?key|credential|cookie|auth)=/iu.test(value)
    ? "[REDACTED]"
    : value
      .replaceAll(/\bsk-[A-Za-z0-9_-]{12,}\b/gu, "sk-[REDACTED]")
      .replaceAll(/https?:\/\/[^\s]+/giu, "[url-redacted]")

const safeIdentifier = (value: string): string =>
  value.length <= 32 ? value : `sha256:${crypto.createHash("sha256").update(value).digest("hex").slice(0, 16)}`

const increment = (map: Map<string, number>, value: string): void => {
  map.set(value, (map.get(value) ?? 0) + 1)
}

const topCounts = (map: Map<string, number>, limit: number): readonly CountRecord[] =>
  [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }))

const defaultMeasurementSessionId = (workspaceRoot: string): string =>
  process.env.ATTUNE_MEASUREMENT_SESSION_ID
  ?? `measurement:${new Date().toISOString().slice(0, 10)}:${crypto.createHash("sha256").update(workspaceRoot).digest("hex").slice(0, 16)}`

const sanitizeDatabaseUrl = (databaseUrl: string): string => {
  try {
    const url = new URL(databaseUrl)
    if (url.password.length > 0) url.password = "[REDACTED]"
    return url.toString()
  } catch {
    return databaseUrl.length === 0 ? databaseUrl : "[database-url-redacted]"
  }
}
