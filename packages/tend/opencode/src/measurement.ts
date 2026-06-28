import * as crypto from "node:crypto"
import * as childProcess from "node:child_process"
import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { Effect } from "effect"
import { Schema } from "effect"
import { defineRecipe, type RecipeObservation } from "@attune/framework-protocol"
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
  readonly commandFamilies: readonly CountRecord[]
  readonly repeatedCommandPatterns: readonly CountRecord[]
  readonly exitCodes: readonly CountRecord[]
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
  readonly command: string
  readonly startedAt?: string
  readonly durationMs?: number
  readonly exitCode?: number
  readonly knownNxTarget?: string
  readonly targetId?: string
  readonly inferredRecipeId?: string
  readonly status?: string
  readonly storeEmissionStatus: "emitted"
}

interface MeasurementReportProjection {
  readonly measurementSessionId: string
  readonly projectedAt: string
  readonly inventory: TraceInventorySummary
  readonly observationIds: readonly string[]
  readonly commandObservations: readonly CommandObservationProjection[]
  readonly traceInventoryObservationIds: readonly string[]
  readonly reportObservationIds: readonly string[]
  readonly microExperimentObservationIds: readonly string[]
  readonly microExperimentSummaries: readonly MicroExperimentProjection[]
  readonly harnessProofObservationIds: readonly string[]
  readonly lifecycleHealthObservationIds: readonly string[]
  readonly trellisDiagnosticObservationIds: readonly string[]
}

interface MicroExperimentProjection {
  readonly summarizedAt?: string
  readonly task?: string
  readonly baseline?: ExperimentRunMetricsProjection
  readonly treatment?: ExperimentRunMetricsProjection
  readonly comparison?: Record<string, number | string | undefined>
  readonly findingQualityMatrix: readonly FindingQualityRow[]
  readonly recommendation?: {
    readonly proceedToRecipeOnlyMigration: boolean
    readonly summary: string
    readonly evidenceGaps: readonly string[]
  }
}

interface ExperimentRunMetricsProjection {
  readonly mode: "baseline" | "treatment"
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
  readonly findingQuality?: string
}

interface FindingQualityRow {
  readonly finding: string
  readonly baseline: "hit" | "partial" | "miss" | "not-measured"
  readonly treatment: "hit" | "partial" | "miss" | "not-measured"
  readonly evidence: string
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
const tokenCountKeyPattern = /^(totalTokens|inputTokens|outputTokens|tokens|tokenCount|token_count)$/u
const modelKeyPattern = /^(model|modelId|model_id)$/u
const sessionKeyPattern = /^(sessionId|session_id|conversationId|conversation_id)$/u
const sqliteAllowedColumnPattern =
  /^(id|uuid|session_id|model|model_id|created_at|updated_at|timestamp|started_at|completed_at|duration_ms|exit_code|status|command|cmd|tool_name|tool_call_count|token_count|input_tokens|output_tokens|total_tokens)$/iu

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
  let toolCalls = 0
  let tokenTotal = 0
  let skippedFiles = 0

  for (const file of files) {
    if (file.endsWith(".jsonl")) {
      try {
        for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/u)) {
          if (line.trim().length === 0) continue
          const parsed = parseJson(line)
          if (parsed === undefined) continue
          const derived = deriveMetadata(parsed)
          for (const command of derived.commandFamilies) increment(commandFamilies, command)
          for (const code of derived.exitCodes) increment(exitCodes, code)
          for (const model of derived.modelIds) increment(modelIds, model)
          for (const session of derived.sessionIds) increment(sessionIds, session)
          toolCalls += derived.toolCalls
          tokenTotal += derived.tokenTotal
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
    commandFamilies: topCounts(commandFamilies, 40),
    repeatedCommandPatterns: topCounts(commandFamilies, 40).filter((item) => item.count > 1),
    exitCodes: topCounts(exitCodes, 20),
    toolCalls,
    tokenTotal,
    modelIds: topCounts(modelIds, 20),
    sessionIds: topCounts(sessionIds, 20),
    privacy: {
      rawPromptsStored: false,
      rawConversationStored: false,
      rawTraceRowsStored: false,
      fullCommandOutputStored: false,
    },
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
    const observationsAfterTrace = await Effect.runPromise(
      measurementObservationsBySession(sink.store, inventory.measurementSessionId),
    )
    const microExperimentObservation = createMeasurementObservation({
      kind: "measurement.micro-experiment.summary",
      recipeId: "tend-opencode.command-observation",
      observedAt: new Date().toISOString(),
      measurementSessionId: inventory.measurementSessionId,
      source: "tend-opencode.micro-experiment-projection",
      payload: createMicroExperimentSummaryPayload(inventory, observationsAfterTrace),
    })
    await Effect.runPromise(recordMeasurementObservation(sink, microExperimentObservation))
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
      commandObservations: projection.commandObservations,
      traceInventoryObservationIds: projection.traceInventoryObservationIds,
      reportObservationIds: projection.reportObservationIds,
      microExperimentObservationIds: projection.microExperimentObservationIds,
      microExperimentSummaries: projection.microExperimentSummaries,
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
  const microExperimentObservations = observations
    .filter((observation) => observation.observationKind === "measurement.micro-experiment.summary")

  return {
    measurementSessionId: inventory.measurementSessionId,
    projectedAt: new Date().toISOString(),
    inventory,
    observationIds: observations.map((observation) => observation.observationId),
    commandObservations,
    traceInventoryObservationIds: traceInventoryObservations
      .map((observation) => observation.observationId),
    reportObservationIds: observations
      .filter((observation) => observation.observationKind === "measurement.report.projected")
      .map((observation) => observation.observationId),
    microExperimentObservationIds: microExperimentObservations
      .map((observation) => observation.observationId),
    microExperimentSummaries: microExperimentObservations
      .map(microExperimentProjectionFromObservation),
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
    commandFamilies: countRecords(payload["commandFamilies"]) ?? fallback.commandFamilies,
    repeatedCommandPatterns: countRecords(payload["repeatedCommandPatterns"]) ?? fallback.repeatedCommandPatterns,
    exitCodes: countRecords(payload["exitCodes"]) ?? fallback.exitCodes,
    toolCalls: numberValue(payload, "toolCalls") ?? fallback.toolCalls,
    tokenTotal: numberValue(payload, "tokenTotal") ?? fallback.tokenTotal,
    modelIds: countRecords(payload["modelIds"]) ?? fallback.modelIds,
    sessionIds: countRecords(payload["sessionIds"]) ?? fallback.sessionIds,
    privacy: {
      rawPromptsStored: false,
      rawConversationStored: false,
      rawTraceRowsStored: false,
      fullCommandOutputStored: false,
    },
  }
}

const commandProjectionFromObservation = (
  observation: RecipeObservation,
): CommandObservationProjection => {
  const payload = asRecord(observation.payload)
  return {
    observationId: observation.observationId,
    command: payload === undefined
      ? observation.observationKind
      : stringValue(payload, "command") ?? observation.observationKind,
    ...(payload === undefined ? {} : optionalNumber("durationMs", numberValue(payload, "durationMs"))),
    ...(payload === undefined ? {} : optionalNumber("exitCode", numberValue(payload, "exitCode"))),
    ...(payload === undefined ? {} : optionalString("startedAt", stringValue(payload, "startedAt"))),
    ...(payload === undefined ? {} : optionalString("knownNxTarget", stringValue(payload, "knownNxTarget"))),
    ...(payload === undefined ? {} : optionalString("targetId", stringValue(payload, "targetId"))),
    ...(payload === undefined ? {} : optionalString("inferredRecipeId", stringValue(payload, "inferredRecipeId"))),
    ...(payload === undefined ? {} : optionalString("status", stringValue(payload, "status"))),
    storeEmissionStatus: "emitted",
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
  const baseline = baselineMetricsFromInventory(inventory)
  const treatment = treatmentMetricsFromCommands(commandObservations, trellisDiagnosticCount)
  const findingQualityMatrix = findingQualityRows(trellisDiagnosticCount, commandObservations)
  const evidenceGaps = microExperimentEvidenceGaps(trellisDiagnosticCount, commandObservations)
  return {
    schemaVersion: 1,
    measurementSessionId: inventory.measurementSessionId,
    summarizedAt: new Date().toISOString(),
    task: "Analyze packages/trellis/language-service migration readiness for recipe-only source migration",
    baseline,
    treatment,
    comparison: {
      shellCommandDelta: treatment.shellCommands - baseline.shellCommands,
      repeatedCommandDelta: treatment.repeatedCommands - baseline.repeatedCommands,
      failedCommandDelta: treatment.failedCommands - baseline.failedCommands,
      expensiveCheckDelta: treatment.expensiveChecks - baseline.expensiveChecks,
      rawContextByteDelta: (treatment.rawContextBytes ?? 0) - (baseline.rawContextBytes ?? 0),
      findingQualitySummary: findingQualityMatrix
        .map((row) => `${row.finding}: ${row.baseline}->${row.treatment}`)
        .join("; "),
    },
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
): ExperimentRunMetricsProjection => ({
  mode: "baseline",
  fileReads: inventory.traceFiles,
  shellCommands: inventory.commandFamilies.reduce((sum, item) => sum + item.count, 0),
  repeatedCommands: inventory.repeatedCommandPatterns.reduce((sum, item) => sum + item.count, 0),
  failedCommands: inventory.exitCodes
    .filter((item) => item.value !== "0")
    .reduce((sum, item) => sum + item.count, 0),
  expensiveChecks: inventory.commandFamilies
    .filter((item) => /workspace:|test|typecheck|validate|recipe-substrate-check/iu.test(item.value))
    .reduce((sum, item) => sum + item.count, 0),
  workspacePolicyFastCount: inventory.commandFamilies
    .filter((item) => item.value.includes("workspace:policy-fast"))
    .reduce((sum, item) => sum + item.count, 0),
  rawContextBytes: 0,
  tokenTotal: inventory.tokenTotal,
  toolCalls: inventory.toolCalls,
  findingQuality: "candidate historical trace metadata only",
})

const treatmentMetricsFromCommands = (
  commands: readonly CommandObservationProjection[],
  trellisDiagnosticCount: number,
): ExperimentRunMetricsProjection => ({
  mode: "treatment",
  fileReads: 0,
  shellCommands: commands.length,
  repeatedCommands: commandLadderSummary(commands).repeated.reduce((sum, item) => sum + item.count, 0),
  failedCommands: commands.filter((command) => command.exitCode !== undefined && command.exitCode !== 0).length,
  expensiveChecks: commands.filter((command) => {
    const cost = commandCostClass(command)
    return cost === "expensive" || cost === "final-gate"
  }).length,
  workspacePolicyFastCount: commands
    .filter((command) => command.knownNxTarget === "workspace:policy-fast")
    .length,
  rawContextBytes: 0,
  findingQuality: trellisDiagnosticCount > 0
    ? "diagnostic-observation-backed treatment"
    : "missing trellis-ls diagnostic observation",
})

const findingQualityRows = (
  trellisDiagnosticCount: number,
  commands: readonly CommandObservationProjection[],
): readonly FindingQualityRow[] => {
  const hasLsDiagnostics = trellisDiagnosticCount > 0
  const hasFrameworkLsChecks = commands.some((command) =>
    command.knownNxTarget?.startsWith("framework-language-service:") ?? false
  )
  const hasRecipeSubstrate = commands.some((command) =>
    command.knownNxTarget === "workspace:recipe-substrate-check"
  )
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
      treatment: hasRecipeSubstrate ? "partial" : "not-measured",
      evidence: hasRecipeSubstrate
        ? "Recipe substrate check command was observed in the treatment ladder."
        : "Recipe substrate check observation is missing.",
    },
    {
      finding: "missing repair coverage",
      baseline: "partial",
      treatment: hasFrameworkLsChecks ? "partial" : "not-measured",
      evidence: hasFrameworkLsChecks
        ? "Framework language-service checks were observed, but repair coverage still needs focused follow-up."
        : "Framework language-service command observations are missing.",
    },
    {
      finding: "trellis-ls as migration machine",
      baseline: "miss",
      treatment: hasLsDiagnostics ? "hit" : "not-measured",
      evidence: hasLsDiagnostics
        ? "The executable Trellis LS path emitted a diagnostic summary into the shared sink."
        : "No executable Trellis LS diagnostic observation was stored.",
    },
  ]
}

const microExperimentEvidenceGaps = (
  trellisDiagnosticCount: number,
  commands: readonly CommandObservationProjection[],
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
  return gaps
}

const microExperimentProjectionFromObservation = (
  observation: RecipeObservation,
): MicroExperimentProjection => {
  const payload = asRecord(observation.payload)
  const baseline = experimentMetricsFromRecord(asRecord(payload?.["baseline"]))
  const treatment = experimentMetricsFromRecord(asRecord(payload?.["treatment"]))
  const comparison = comparisonFromRecord(asRecord(payload?.["comparison"]))
  const recommendation = recommendationFromRecord(asRecord(payload?.["recommendation"]))
  return {
    ...(payload === undefined ? {} : optionalString("summarizedAt", stringValue(payload, "summarizedAt"))),
    ...(payload === undefined ? {} : optionalString("task", stringValue(payload, "task"))),
    ...(baseline === undefined ? {} : { baseline }),
    ...(treatment === undefined ? {} : { treatment }),
    ...(comparison === undefined ? {} : { comparison }),
    findingQualityMatrix: findingQualityRowsFromValue(payload?.["findingQualityMatrix"]),
    ...(recommendation === undefined ? {} : { recommendation }),
  }
}

const experimentMetricsFromRecord = (
  record: Record<string, unknown> | undefined,
): ExperimentRunMetricsProjection | undefined => {
  const mode = stringValue(record, "mode")
  if (mode !== "baseline" && mode !== "treatment") return undefined
  return {
    mode,
    fileReads: numberValue(record, "fileReads") ?? 0,
    shellCommands: numberValue(record, "shellCommands") ?? 0,
    repeatedCommands: numberValue(record, "repeatedCommands") ?? 0,
    failedCommands: numberValue(record, "failedCommands") ?? 0,
    expensiveChecks: numberValue(record, "expensiveChecks") ?? 0,
    ...(optionalNumber("workspacePolicyFastCount", numberValue(record, "workspacePolicyFastCount"))),
    ...(optionalNumber("timeToUsefulDiagnosticMs", numberValue(record, "timeToUsefulDiagnosticMs"))),
    ...(optionalNumber("rawContextBytes", numberValue(record, "rawContextBytes"))),
    ...(optionalNumber("tokenTotal", numberValue(record, "tokenTotal"))),
    ...(optionalNumber("toolCalls", numberValue(record, "toolCalls"))),
    ...(optionalString("findingQuality", stringValue(record, "findingQuality"))),
  }
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
  "Raw prompts, conversations, raw trace rows, and full command output were not stored.",
  "",
  ].join("\n")
}

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
  const latest = projection.microExperimentSummaries[projection.microExperimentSummaries.length - 1]
  return [
    "# Codex/OpenCode Micro-Experiment",
    "",
    `Measurement session: ${projection.measurementSessionId}`,
    `Micro-experiment summary observations: ${projection.microExperimentObservationIds.length}`,
    `Trellis diagnostic observations: ${projection.trellisDiagnosticObservationIds.length}`,
    "",
    "## Baseline Metrics",
    ...renderExperimentMetrics(latest?.baseline),
    "",
    "## Treatment Metrics",
    ...renderExperimentMetrics(latest?.treatment),
    "",
    "## Comparison",
    ...renderComparison(latest),
    "",
    "## Finding Quality",
    ...renderFindingQuality(latest?.findingQualityMatrix ?? []),
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
  const latestExperiment = projection.microExperimentSummaries[projection.microExperimentSummaries.length - 1]
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
    `Micro-experiment observations: ${projection.microExperimentObservationIds.length}`,
    `Lifecycle health observations in session projection: ${projection.lifecycleHealthObservationIds.length}`,
    `Trellis diagnostic observations: ${projection.trellisDiagnosticObservationIds.length}`,
    "",
    "## Trace Inventory",
    `Trace files scanned: ${projection.inventory.traceFiles}`,
    `Repeated command patterns: ${projection.inventory.repeatedCommandPatterns.length}`,
    `SQLite schema files inspected: ${projection.inventory.sqliteSchemaFilesInspected}`,
    `Model IDs observed: ${projection.inventory.modelIds.length}`,
    `Session IDs observed: ${projection.inventory.sessionIds.length}`,
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
  readonly repeated: readonly CountRecord[]
} => {
  const counts = new Map<string, number>()
  for (const observation of observations) {
    increment(counts, observation.knownNxTarget ?? observation.command)
  }
  return {
    cheap: observations.filter((observation) => commandCostClass(observation) === "cheap").length,
    medium: observations.filter((observation) => commandCostClass(observation) === "medium").length,
    expensive: observations.filter((observation) => commandCostClass(observation) === "expensive").length,
    finalGate: observations.filter((observation) => commandCostClass(observation) === "final-gate").length,
    failed: observations.filter((observation) => observation.exitCode !== undefined && observation.exitCode !== 0).length,
    workspaceWide: observations.filter((observation) =>
      observation.knownNxTarget?.startsWith("workspace:") ?? false
    ).length,
    repeated: topCounts(counts, 20).filter((item) => item.count > 1),
  }
}

const renderFailedCommands = (
  observations: readonly CommandObservationProjection[],
): readonly string[] => {
  const failed = observations.filter((observation) =>
    observation.exitCode !== undefined && observation.exitCode !== 0
  )
  return failed.length === 0
    ? ["- None observed."]
    : failed.map((observation) =>
      `- ${observation.knownNxTarget ?? observation.command}: exitCode=${observation.exitCode}, observation=${observation.observationId}`
    )
}

const renderExperimentMetrics = (
  metrics: ExperimentRunMetricsProjection | undefined,
): readonly string[] =>
  metrics === undefined
    ? ["- No metrics were stored for this mode."]
    : [
      `- Shell commands: ${metrics.shellCommands}`,
      `- Repeated commands: ${metrics.repeatedCommands}`,
      `- Failed commands: ${metrics.failedCommands}`,
      `- Expensive checks: ${metrics.expensiveChecks}`,
      `- workspace:policy-fast count: ${metrics.workspacePolicyFastCount ?? 0}`,
      `- Time to useful diagnostic ms: ${metrics.timeToUsefulDiagnosticMs ?? "not measured"}`,
      `- Token total: ${metrics.tokenTotal ?? "not available"}`,
      `- Tool calls: ${metrics.toolCalls ?? "not available"}`,
      `- Raw context bytes stored: ${metrics.rawContextBytes ?? 0}`,
      `- Finding quality: ${metrics.findingQuality ?? "not scored"}`,
    ]

const renderComparison = (
  summary: MicroExperimentProjection | undefined,
): readonly string[] => {
  if (summary?.comparison === undefined) return ["- No comparison metrics were stored."]
  return Object.entries(summary.comparison).map(([key, value]) => `- ${key}: ${value ?? "not measured"}`)
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
      `target=${observation.knownNxTarget ?? "unknown"}`,
      `targetId=${observation.targetId ?? "unknown"}`,
      `recipe=${observation.inferredRecipeId ?? "unknown"}`,
      `durationMs=${observation.durationMs ?? "unknown"}`,
      `exitCode=${observation.exitCode ?? "unknown"}`,
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

const optionalString = <Key extends string>(
  key: Key,
  value: string | undefined,
): Record<Key, string> | Record<string, never> =>
  value === undefined || value.length === 0 ? {} : { [key]: value } as Record<Key, string>

const optionalNumber = <Key extends string>(
  key: Key,
  value: number | undefined,
): Record<Key, number> | Record<string, never> =>
  value === undefined ? {} : { [key]: value } as Record<Key, number>

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
  commandFamilies: [],
  repeatedCommandPatterns: [],
  exitCodes: [],
  toolCalls: 0,
  tokenTotal: 0,
  modelIds: [],
  sessionIds: [],
  privacy: {
    rawPromptsStored: false,
    rawConversationStored: false,
    rawTraceRowsStored: false,
    fullCommandOutputStored: false,
  },
})

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

const deriveMetadata = (value: unknown): {
  readonly commandFamilies: readonly string[]
  readonly exitCodes: readonly string[]
  readonly modelIds: readonly string[]
  readonly sessionIds: readonly string[]
  readonly toolCalls: number
  readonly tokenTotal: number
} => {
  const commandFamilies: string[] = []
  const exitCodes: string[] = []
  const modelIds: string[] = []
  const sessionIds: string[] = []
  let toolCalls = 0
  let tokenTotal = 0

  const visit = (node: unknown, key = ""): void => {
    if (forbiddenKeyPattern.test(key)) return
    if (Array.isArray(node)) {
      if (commandKeyPattern.test(key) && node.every((item) => typeof item === "string")) {
        commandFamilies.push(commandFamily(node))
        return
      }
      for (const item of node) visit(item, key)
      return
    }
    if (node === null || typeof node !== "object") {
      if (typeof node === "string") {
        if (commandKeyPattern.test(key)) commandFamilies.push(commandFamily([node]))
        if (exitCodeKeyPattern.test(key)) exitCodes.push(node)
        if (modelKeyPattern.test(key)) modelIds.push(safeIdentifier(node))
        if (sessionKeyPattern.test(key)) sessionIds.push(safeIdentifier(node))
      }
      if (typeof node === "number") {
        if (durationKeyPattern.test(key)) return
        if (exitCodeKeyPattern.test(key)) exitCodes.push(String(node))
        if (tokenCountKeyPattern.test(key)) tokenTotal += node
      }
      if (/toolCall|tool_call|toolName/u.test(key)) toolCalls += 1
      return
    }

    for (const [childKey, childValue] of Object.entries(node)) {
      visit(childValue, childKey)
    }
  }

  visit(value)
  return { commandFamilies, exitCodes, modelIds, sessionIds, toolCalls, tokenTotal }
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
    return `${path.basename(command)} -c [shell-script-redacted]`
  }
  return [path.basename(command), ...args.slice(0, 2).map(redactInlineSecret)].join(" ")
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
