import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  MeasurementBaselineSessionSelectionPayloadSchema,
  MeasurementAgentMetricsSummaryPayloadSchema,
  MeasurementCommandObservationPayloadSchema,
  MeasurementEditAttemptSummaryPayloadSchema,
  MeasurementHarnessProofPayloadSchema,
  MeasurementLifecycleHealthPayloadSchema,
  MeasurementLegacySubstrateAuditPayloadSchema,
  MeasurementMigrationReadinessSummaryPayloadSchema,
  MeasurementMicroExperimentSummaryPayloadSchema,
  MeasurementRecipeSpineCoveragePayloadSchema,
  MeasurementReportProjectionPayloadSchema,
  MeasurementTraceInventorySummaryPayloadSchema,
} from "../src/index.js"

const privacy = {
  rawPromptsStored: false,
  rawConversationStored: false,
  rawTraceRowsStored: false,
  fullCommandOutputStored: false,
} as const

const outputSummary = {
  text: "ok",
  byteLength: 2,
  lineCount: 1,
  truncated: false,
  sha256: "2689367b205c16ce836ea2af1ca243e63d45fc130b5a7abcb825aafa821d4a4e",
  redacted: false,
} as const

const historicalSession = {
  sessionId: "sha256:baseline-session",
  score: 117,
  scoreReasons: ["matched command signal: trellis-ls", "enough samples: 3 command events"],
  startedAt: "2026-06-28T00:00:00.000Z",
  completedAt: "2026-06-28T00:00:30.000Z",
  wallTimeMs: 30_000,
  commandEvents: 3,
  uniqueCommandFamilies: 2,
  repeatedCommandFamilies: 1,
  repeatedCommandInvocations: 2,
  exitCodeEvents: 3,
  failedCommands: 1,
  successfulCommands: 2,
  commandSuccessRate: 2 / 3,
  expensiveChecks: 2,
  workspacePolicyFastCount: 0,
  timeToFirstUsefulDiagnosticMs: 5_000,
  durationMs: {
    count: 3,
    total: 90,
    min: 20,
    max: 40,
    average: 30,
    p50: 30,
    p95: 40,
  },
  tokenTotal: 42,
  toolCalls: 4,
  modelIds: [{ value: "gpt-5", count: 1 }],
  commandFamilies: [
    { value: "nx run framework-language-service:test", count: 2 },
    { value: "trellis-ls diagnostics", count: 1 },
  ],
  exitCodes: [{ value: "0", count: 2 }, { value: "1", count: 1 }],
  matchedSignals: ["trellis-ls", "framework-language-service"],
  hasAttuneTrellisSignal: true,
  hasEnoughSamples: true,
  giantCatchallPenalty: false,
  privacy,
} as const

describe("MeasurementObservation payload schemas", () => {
  it("decodes the item 3.3 measurement payload shapes", () => {
    expect(Schema.decodeUnknownSync(MeasurementHarnessProofPayloadSchema)({
      schemaVersion: 1,
      measurementSessionId: "measurement:test",
      passed: true,
      runtime: {
        flakeProvided: true,
        runtimeKind: "upstream-opencode",
        upstreamIntegrated: true,
      },
      plugins: [{
        name: "@attune/tend-opencode",
        loaded: true,
        capability: "commandObservation",
      }],
      upstream: {
        available: true,
        command: ["tend-opencode", "fingerprint", "--format", "json"],
      },
      pluginHookExercise: {
        passed: true,
        skipped: false,
        durationMs: 10,
      },
      leakageCheck: {
        rawPromptPresent: false,
        rawConversationPresent: false,
      },
      privacy,
    }).passed).toBe(true)

    expect(Schema.decodeUnknownSync(MeasurementCommandObservationPayloadSchema)({
      schemaVersion: 1,
      measurementSessionId: "measurement:test",
      command: "pnpm exec nx run framework-runtime:typecheck --output-style=static",
      argv: ["pnpm", "exec", "nx", "run", "framework-runtime:typecheck", "--output-style=static"],
      cwd: "/workspace/attune",
      startedAt: "2026-06-28T00:00:00.000Z",
      completedAt: "2026-06-28T00:00:01.000Z",
      durationMs: 1000,
      exitCode: 0,
      status: "succeeded",
      stdoutSummary: outputSummary,
      stderrSummary: outputSummary,
      measurementPhase: "treatment",
      knownNxTarget: "framework-runtime:typecheck",
      targetId: "framework-runtime:typecheck",
      inferredRecipeId: "framework-runtime.local-timescaledb",
      tokenTotal: 42,
      toolCalls: 3,
      tokenMetricSource: "stdout-json",
      rawOutputStored: false,
    }).tokenTotal).toBe(42)

    expect(Schema.decodeUnknownSync(MeasurementTraceInventorySummaryPayloadSchema)({
      measurementSessionId: "measurement:test",
      scannedAt: "2026-06-28T00:00:02.000Z",
      codexHome: "/home/becker/.codex",
      traceFiles: 2,
      sqliteFiles: 1,
      jsonlFiles: 1,
      skippedFiles: 0,
      sqliteSchemaFilesInspected: 1,
      sqliteSchemaFilesSkipped: 0,
      sqliteSchemas: [{
        fileId: "sha256:sqlite-file",
        fileKind: "sqlite",
        inspected: true,
        tableCount: 1,
        tables: [{
          tableName: "sessions",
          allowlistedColumns: ["session_id", "model_id", "created_at"],
          skippedColumnCount: 2,
        }],
      }],
      commandEventCount: 2,
      uniqueCommandFamilies: 1,
      repeatedCommandFamilyCount: 1,
      repeatedCommandInvocationCount: 2,
      exitCodeEventCount: 2,
      failedExitCodeCount: 1,
      timestampRange: {
        count: 2,
        earliest: "2026-06-28T00:00:00.000Z",
        latest: "2026-06-28T00:00:01.000Z",
        spanMs: 1000,
      },
      durationMs: {
        count: 2,
        total: 30,
        min: 10,
        max: 20,
        average: 15,
        p50: 10,
        p95: 20,
      },
      commandFamilies: [{ value: "nx", count: 2 }],
      repeatedCommandPatterns: [{ value: "framework-runtime:typecheck", count: 2 }],
      exitCodes: [{ value: "0", count: 2 }],
      comparableSessionCandidates: [historicalSession],
      selectedBaselineSession: historicalSession,
      toolCalls: 3,
      tokenTotal: 42,
      modelIds: [{ value: "gpt-5", count: 1 }],
      sessionIds: [{ value: "session-1", count: 1 }],
      privacy,
    }).traceFiles).toBe(2)

    expect(Schema.decodeUnknownSync(MeasurementAgentMetricsSummaryPayloadSchema)({
      schemaVersion: 1,
      measurementSessionId: "measurement:test",
      measurementPhase: "treatment",
      capturedAt: "2026-06-28T00:00:02.250Z",
      source: "codex-trace-window-v1",
      tokenTotal: 1234,
      toolCalls: 5,
      sampleCount: 7,
      traceFilesScanned: 2,
      windowCount: 3,
      startedAt: "2026-06-28T00:00:00.000Z",
      completedAt: "2026-06-28T00:00:30.000Z",
      tokenMetricSource: "trace-jsonl-window:cumulative-delta+tool-call-count",
      privacy,
    }).tokenTotal).toBe(1234)

    expect(Schema.decodeUnknownSync(MeasurementRecipeSpineCoveragePayloadSchema)({
      schemaVersion: 1,
      measurementSessionId: "measurement:test",
      capturedAt: "2026-06-28T00:00:02.300Z",
      recipeCount: 4,
      edgeCount: 3,
      ioCount: 5,
      runCount: 6,
      receiptCount: 7,
      observationCount: 8,
      diagnosticCount: 2,
      repairCount: 1,
      healthCount: 4,
      frameworkSchemasPreserved: true,
      observationStore: "framework_event.recipe_observation",
      privacy,
    }).observationCount).toBe(8)

    expect(Schema.decodeUnknownSync(MeasurementEditAttemptSummaryPayloadSchema)({
      schemaVersion: 1,
      measurementSessionId: "measurement:test",
      capturedAt: "2026-06-28T00:00:02.350Z",
      dirtyPathCount: 3,
      sourceEditCount: 2,
      reportExportEditCount: 1,
      generatedPrivateLedgerEditAttempts: 0,
      generatedPrivateLedgerPathClasses: [],
      privacy,
    }).generatedPrivateLedgerEditAttempts).toBe(0)

    expect(Schema.decodeUnknownSync(MeasurementLegacySubstrateAuditPayloadSchema)({
      schemaVersion: 1,
      measurementSessionId: "measurement:test",
      capturedAt: "2026-06-28T00:00:02.400Z",
      scannedPathCount: 42,
      historicalReferenceCount: 8,
      enforcementReferenceCount: 6,
      testFixtureReferenceCount: 5,
      measurementInventoryReferenceCount: 2,
      blockingLiveReferenceCount: 0,
      privacy,
    }).blockingLiveReferenceCount).toBe(0)

    expect(Schema.decodeUnknownSync(MeasurementBaselineSessionSelectionPayloadSchema)({
      schemaVersion: 1,
      measurementSessionId: "measurement:test",
      selectedAt: "2026-06-28T00:00:02.500Z",
      selectedSessionId: historicalSession.sessionId,
      score: historicalSession.score,
      scoreReasons: historicalSession.scoreReasons,
      candidateCount: 1,
      selectionMethod: "safe-session-comparability-score-v1",
      selectedSession: historicalSession,
      privacy,
    }).selectedSessionId).toBe(historicalSession.sessionId)

    expect(Schema.decodeUnknownSync(MeasurementMicroExperimentSummaryPayloadSchema)({
      measurementSessionId: "measurement:test",
      summarizedAt: "2026-06-28T00:00:03.000Z",
      task: "Analyze packages/trellis/language-service migration readiness",
      baseline: {
        mode: "baseline",
        fileReads: 12,
        shellCommands: 4,
        repeatedCommands: 1,
        failedCommands: 0,
        expensiveChecks: 1,
        successfulCommands: 4,
        knownExitCodeCommands: 4,
        commandSuccessRate: 1,
        durationSampleCount: 2,
        durationAverageMs: 50,
        uniqueCommandFamilies: 3,
      },
      selectedBaselineSession: historicalSession,
      selectedBaseline: {
        mode: "baseline",
        fileReads: 0,
        shellCommands: 3,
        repeatedCommands: 2,
        failedCommands: 1,
        expensiveChecks: 2,
        tokenTotal: 42,
        toolCalls: 4,
        durationP50Ms: 30,
        durationP95Ms: 40,
      },
      treatment: {
        mode: "treatment",
        fileReads: 7,
        shellCommands: 3,
        repeatedCommands: 0,
        failedCommands: 0,
        expensiveChecks: 1,
        successfulCommands: 3,
        knownExitCodeCommands: 3,
        commandSuccessRate: 1,
        durationSampleCount: 3,
        durationAverageMs: 25,
        storeEmittedCommands: 3,
        uniqueTargets: 2,
        uniqueRecipes: 2,
        trellisDiagnosticObservations: 1,
      },
      comparison: {
        shellCommandDelta: -1,
        repeatedCommandDelta: -1,
        durationAverageDeltaMs: -25,
        commandSuccessRateDelta: 0,
      },
      selectedBaselineComparison: {
        shellCommandDelta: 0,
        repeatedCommandDelta: -2,
        failedCommandDelta: -1,
        tokenDelta: -42,
      },
      findingQualityMatrix: [{
        finding: "trellis-ls as migration machine",
        baseline: "partial",
        treatment: "hit",
        evidence: "treatment diagnostics include recipe-only source profile.",
      }],
      recommendation: {
        proceedToRecipeOnlyMigration: false,
        summary: "Need more diagnostic coverage first.",
        evidenceGaps: ["missing treatment diagnostics"],
      },
      privacy,
    }).recommendation?.proceedToRecipeOnlyMigration).toBe(false)

    expect(Schema.decodeUnknownSync(MeasurementMigrationReadinessSummaryPayloadSchema)({
      schemaVersion: 1,
      measurementSessionId: "measurement:test",
      summarizedAt: "2026-06-28T00:00:03.500Z",
      proceedToRecipeOnlyMigration: false,
      gates: [{
        gate: "phase-token-tool-metrics",
        status: "blocked",
        evidence: "treatment token/tool metrics are missing",
        followUp: "Record phase-level agent metrics.",
      }],
      privacy,
    }).gates[0]?.gate).toBe("phase-token-tool-metrics")

    expect(Schema.decodeUnknownSync(MeasurementLifecycleHealthPayloadSchema)({
      measurementSessionId: "measurement:test",
      checkedAt: "2026-06-28T00:00:04.000Z",
      source: "framework-runtime.local-timescaledb",
      lifecycleOwner: "framework-runtime",
      service: {
        dataDir: ".attune/state/local-timescaledb",
        databaseUrl: "ATTUNE_RECIPE_STORE_URL",
        port: 54329,
        storeMode: "local-postgres",
        ready: true,
      },
      migration: {
        path: "packages/trellis/runtime/sql/0001_framework_recipe_receipt_spine.sql",
        applied: true,
      },
      schemaState: {
        frameworkCore: true,
        frameworkEvent: true,
        frameworkView: true,
      },
      sqlValidation: {
        valid: true,
        statementCount: 8,
      },
      lastLifecycleAction: "check",
    }).service.ready).toBe(true)

    expect(Schema.decodeUnknownSync(MeasurementReportProjectionPayloadSchema)({
      reportPath: "reports/tend-opencode-codex-measurement/tend-opencode-measurement-report.md",
      measurementSessionId: "measurement:test",
      inputObservationIds: ["observation-1"],
      generatedAt: "2026-06-28T00:00:05.000Z",
      privacy,
    }).inputObservationIds).toEqual(["observation-1"])
  })

  it("rejects raw command output and unsafe privacy summaries", () => {
    expect(() =>
      Schema.decodeUnknownSync(MeasurementCommandObservationPayloadSchema)({
        schemaVersion: 1,
        command: "echo unsafe",
        argv: ["echo", "unsafe"],
        cwd: "/workspace/attune",
        startedAt: "2026-06-28T00:00:00.000Z",
        completedAt: "2026-06-28T00:00:01.000Z",
        durationMs: 1000,
        exitCode: 0,
        status: "succeeded",
        stdoutSummary: outputSummary,
        stderrSummary: outputSummary,
        rawOutputStored: true,
      })
    ).toThrow()

    expect(() =>
      Schema.decodeUnknownSync(MeasurementReportProjectionPayloadSchema)({
        reportPath: "reports/tend-opencode-codex-measurement/report.md",
        measurementSessionId: "measurement:test",
        inputObservationIds: [],
        privacy: {
          ...privacy,
          rawPromptsStored: true,
        },
      })
    ).toThrow()
  })
})
