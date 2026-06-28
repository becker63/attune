import { Schema } from "effect"
import { describe, expect, it } from "vitest"
import {
  MeasurementCommandObservationPayloadSchema,
  MeasurementHarnessProofPayloadSchema,
  MeasurementLifecycleHealthPayloadSchema,
  MeasurementMicroExperimentSummaryPayloadSchema,
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
      knownNxTarget: "framework-runtime:typecheck",
      targetId: "framework-runtime:typecheck",
      inferredRecipeId: "framework-runtime.local-timescaledb",
      rawOutputStored: false,
    }).rawOutputStored).toBe(false)

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
      commandFamilies: [{ value: "nx", count: 2 }],
      repeatedCommandPatterns: [{ value: "framework-runtime:typecheck", count: 2 }],
      exitCodes: [{ value: "0", count: 2 }],
      toolCalls: 3,
      tokenTotal: 42,
      modelIds: [{ value: "gpt-5", count: 1 }],
      sessionIds: [{ value: "session-1", count: 1 }],
      privacy,
    }).traceFiles).toBe(2)

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
      },
      treatment: {
        mode: "treatment",
        fileReads: 7,
        shellCommands: 3,
        repeatedCommands: 0,
        failedCommands: 0,
        expensiveChecks: 1,
      },
      comparison: {
        shellCommandDelta: -1,
        repeatedCommandDelta: -1,
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
