import { readFileSync } from "node:fs"
import { Context, Effect, Layer, Schema } from "effect"
import {
  defineAlchemyResource,
  defineRecipeHandler,
  defineRecipeLayer,
  defineRuntimeRecipe,
} from "@attune/framework-protocol"

import { RecipeReceiptStoreSummaryResource } from "./RecipeReceiptStore.js"

const frameworkRuntimeSqlRouteRecipeId = "framework-runtime.sql-route" as const
const frameworkRuntimeSqlRouteGenerationRecipeId =
  "framework-runtime.sql-route-generation" as const
const frameworkRuntimeSqlRouteSourcePath =
  "packages/trellis/runtime/src/SqlRoute.ts" as const

export const frameworkRecipeReceiptMigrationPath =
  "packages/trellis/runtime/sql/0001_framework_recipe_receipt_spine.sql" as const

export const frameworkRecipeReceiptTables = [
  "framework_core.recipe",
  "framework_core.recipe_edge",
  "framework_core.recipe_io",
  "framework_event.recipe_run",
  "framework_event.recipe_receipt",
  "framework_event.recipe_receipt_metric",
  "framework_event.recipe_observation",
  "framework_event.recipe_diagnostic",
  "framework_event.recipe_repair",
  "framework_view.recipe_health",
  "framework_view.repair_plan",
] as const

export type FrameworkRecipeReceiptTable = (typeof frameworkRecipeReceiptTables)[number]

export interface FrameworkSqlStatement {
  readonly sql: string
  readonly parameters: readonly unknown[]
}

export interface FrameworkRecipeReceiptKanelConfig {
  readonly connectionEnv: "DATABASE_URL"
  readonly schemas: readonly ["framework_core", "framework_event", "framework_view"]
  readonly tables: readonly FrameworkRecipeReceiptTable[]
  readonly outputPath: ".attune/cache/generated/framework-runtime/db/kanel"
  readonly kyselyOutputPath: ".attune/cache/generated/framework-runtime/db/kanel/framework-recipe-receipt.database.generated.ts"
  readonly migrationPath: typeof frameworkRecipeReceiptMigrationPath
}

export interface FrameworkRecipeReceiptSafeQlConfig {
  readonly connectionEnv: "DATABASE_URL"
  readonly migrations: readonly [typeof frameworkRecipeReceiptMigrationPath]
  readonly checkedStatements: readonly string[]
}

export interface FrameworkSqlValidationStatement {
  readonly name: string
  readonly sql: string
  readonly parameters: readonly unknown[]
}

export const RuntimeSqlRouteInput = Schema.Struct({
  packageId: Schema.optional(Schema.String),
  sourceRoot: Schema.optional(Schema.String),
  workspaceRoot: Schema.optional(Schema.String),
  stage: Schema.optional(Schema.Literals([
    "migrate",
    "generate-types",
    "validate-sql",
    "integration-test",
  ] as const)),
})
export type RuntimeSqlRouteInput = typeof RuntimeSqlRouteInput.Type

export const RuntimeSqlRouteOutput = Schema.Struct({
  migrationPath: Schema.String,
  kanelOutputPath: Schema.String,
  kyselyGeneratedTypesSource: Schema.String,
  safeQlStatementCount: Schema.Number,
  statementValidationErrorCount: Schema.Number,
  legacySubstrateMentionCount: Schema.Number,
})
export type RuntimeSqlRouteOutput = typeof RuntimeSqlRouteOutput.Type

export const RuntimeSqlGeneratedDirectoryOutput = Schema.Struct({
  outputPath: Schema.String,
  kyselyOutputPath: Schema.String,
  generatedTypesSource: Schema.String,
})
export type RuntimeSqlGeneratedDirectoryOutput =
  typeof RuntimeSqlGeneratedDirectoryOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const FrameworkRuntimeSqlRouteResource = defineAlchemyResource({
  id: "framework-runtime.sql-route.resource",
  kind: "runtime-sql",
  alchemyType: "attune:resource:RuntimeSqlRoute",
  ownerRecipeId: frameworkRuntimeSqlRouteRecipeId,
  producedBy: [frameworkRuntimeSqlRouteRecipeId],
  consumedBy: [
    frameworkRuntimeSqlRouteRecipeId,
    frameworkRuntimeSqlRouteGenerationRecipeId,
  ],
  addressFields: ["migrationPath", "kanelOutputPath", "safeQlStatementCount"],
  addressSchema: RuntimeSqlRouteOutput as never,
  stateSchema: RuntimeSqlRouteOutput as never,
  modes: ["read", "check", "project"],
  programmaticResourceExport: "FrameworkRuntimeSqlRouteProjectorLive",
  programmaticBridgeSourcePath: frameworkRuntimeSqlRouteSourcePath,
})

export const FrameworkRuntimeSqlGeneratedDirectoryResource =
// @attune-packet-target generated-runtime-projection eligible
  defineAlchemyResource({
    id: "framework-runtime.sql-generated-directory.resource",
    kind: "generated-directory",
    alchemyType: "attune:resource:GeneratedDirectory",
    ownerRecipeId: frameworkRuntimeSqlRouteGenerationRecipeId,
    producedBy: [frameworkRuntimeSqlRouteGenerationRecipeId],
    consumedBy: [frameworkRuntimeSqlRouteGenerationRecipeId],
    addressFields: ["outputPath", "kyselyOutputPath"],
    addressSchema: RuntimeSqlGeneratedDirectoryOutput as never,
    stateSchema: RuntimeSqlGeneratedDirectoryOutput as never,
    modes: ["read", "write", "project", "check"],
    programmaticResourceExport: "FrameworkRuntimeSqlRouteGenerationLive",
    programmaticBridgeSourcePath: frameworkRuntimeSqlRouteSourcePath,
  })

export interface FrameworkRuntimeSqlRouteProjectorService {
  readonly project: (
    input: RuntimeSqlRouteInput,
  ) => Effect.Effect<RuntimeSqlRouteOutput>
}

export class FrameworkRuntimeSqlRouteProjector extends Context.Service<
  FrameworkRuntimeSqlRouteProjector,
  FrameworkRuntimeSqlRouteProjectorService
>()("@attune/framework-runtime/FrameworkRuntimeSqlRouteProjector") {}

export interface FrameworkRuntimeSqlRouteGenerationService {
  readonly generate: (
    input: RuntimeSqlRouteInput,
  ) => Effect.Effect<RuntimeSqlRouteOutput>
}

export class FrameworkRuntimeSqlRouteGeneration extends Context.Service<
  FrameworkRuntimeSqlRouteGeneration,
  FrameworkRuntimeSqlRouteGenerationService
>()("@attune/framework-runtime/FrameworkRuntimeSqlRouteGeneration") {}

export type FrameworkRecipeReceiptStatus =
  | "planned"
  | "running"
  | "passed"
  | "failed"
  | "blocked"
  | "destroyed"
  | "pruned"

export interface FrameworkRecipeReceiptKyselyServiceContract {
  readonly databaseType: "KanelGeneratedFrameworkRecipeReceiptDatabase"
  readonly generatedTypesSource: "Kanel"
  readonly generatedTypesPath: FrameworkRecipeReceiptKanelConfig["kyselyOutputPath"]
  readonly bootstrapTypeStatus: "cache-generated-kanel-types-required"
  readonly insertMeasurementObservation: () => FrameworkSqlStatement
  readonly latestReceipt: (recipeId: string) => FrameworkSqlStatement
  readonly receiptsByStatus: (
    status: FrameworkRecipeReceiptStatus,
  ) => FrameworkSqlStatement
  readonly observationsForRecipe: (recipeId: string) => FrameworkSqlStatement
  readonly observationsByMeasurementSession: (sessionId: string) => FrameworkSqlStatement
  readonly commandObservationsByNxTarget: (target: string) => FrameworkSqlStatement
  readonly observationsByKind: (kind: string) => FrameworkSqlStatement
  readonly benchmarkObservationsByRun: (benchmarkRunId: string) => FrameworkSqlStatement
  readonly benchmarkObservationsByArm: (
    benchmarkRunId: string,
    armId: string,
  ) => FrameworkSqlStatement
  readonly benchmarkCodexThreadByRun: (
    benchmarkRunId: string,
    threadId: string,
  ) => FrameworkSqlStatement
  readonly benchmarkFinalJudgeByStatus: (
    benchmarkRunId: string,
    status: string,
  ) => FrameworkSqlStatement
  readonly benchmarkReportProjectionInputs: (
    benchmarkRunId: string,
  ) => FrameworkSqlStatement
  readonly benchmarkPacketObservationsByPacket: (
    benchmarkRunId: string,
    packetId: string,
  ) => FrameworkSqlStatement
  readonly benchmarkPacketObservationsByRule: (
    benchmarkRunId: string,
    ruleName: string,
  ) => FrameworkSqlStatement
  readonly benchmarkPacketObservationsByProfile: (
    benchmarkRunId: string,
    profile: string,
  ) => FrameworkSqlStatement
  readonly benchmarkPacketValidationByStatus: (
    benchmarkRunId: string,
    status: string,
  ) => FrameworkSqlStatement
  readonly benchmarkLoopObservationsByKind: (
    benchmarkRunId: string,
    loopKind: string,
  ) => FrameworkSqlStatement
  readonly benchmarkTargetStatusLatest: (
    benchmarkRunId: string,
  ) => FrameworkSqlStatement
  readonly benchmarkTargetStatusByGoalStatus: (
    benchmarkRunId: string,
    twentyXGoalStatus: string,
  ) => FrameworkSqlStatement
  readonly benchmarkExactPacketTargets: (
    benchmarkRunId: string,
    packetId: string,
  ) => FrameworkSqlStatement
  readonly benchmarkRegistrationObservations: (
    benchmarkRunId: string,
  ) => FrameworkSqlStatement
  readonly benchmarkHoldoutCommitments: (
    benchmarkRunId: string,
  ) => FrameworkSqlStatement
  readonly benchmarkHoldoutEvaluations: (
    benchmarkRunId: string,
  ) => FrameworkSqlStatement
  readonly benchmarkNegativeControls: (
    benchmarkRunId: string,
  ) => FrameworkSqlStatement
  readonly benchmarkAllInCostLedger: (
    benchmarkRunId: string,
  ) => FrameworkSqlStatement
  readonly benchmarkCorrectedScorecardInputs: (
    benchmarkRunId: string,
  ) => FrameworkSqlStatement
  readonly benchmarkAuditInputs: (
    benchmarkRunId: string,
  ) => FrameworkSqlStatement
  readonly openspecPacketObservationsByChange: (
    recipeId: string,
    changeId: string,
  ) => FrameworkSqlStatement
  readonly openspecPacketSelectedTargetDeltaInputs: (
    recipeId: string,
    changeId: string,
    packetFamilyCode: string,
    selectorSummary: string,
  ) => FrameworkSqlStatement
  readonly openspecPacketImplementationCommandInputs: (
    recipeId: string,
    implementationTitle: string,
  ) => FrameworkSqlStatement
}

export const frameworkRecipeReceiptKanelConfig =
  (): FrameworkRecipeReceiptKanelConfig => ({
    connectionEnv: "DATABASE_URL",
    schemas: ["framework_core", "framework_event", "framework_view"],
    tables: frameworkRecipeReceiptTables,
    outputPath: ".attune/cache/generated/framework-runtime/db/kanel",
    kyselyOutputPath:
      ".attune/cache/generated/framework-runtime/db/kanel/framework-recipe-receipt.database.generated.ts",
    migrationPath: frameworkRecipeReceiptMigrationPath,
  })

export const frameworkRecipeReceiptSqlValidationStatements =
  (): readonly FrameworkSqlValidationStatement[] => [
    {
      name: "measurement-observation-insert",
      sql: `
INSERT INTO framework_event.recipe_observation (
  observation_id,
  recipe_id,
  observation_kind,
  observed_at,
  source,
  payload
) VALUES ($1, $2, $3, $4, $5, $6::jsonb)
ON CONFLICT (observation_id) DO UPDATE SET
  observation_kind = EXCLUDED.observation_kind,
  observed_at = EXCLUDED.observed_at,
  source = EXCLUDED.source,
  payload = EXCLUDED.payload
`.trim(),
      parameters: [
        "measurement-observation-1",
        "tend-opencode.command-observation",
        "measurement.command.observed",
        "2026-06-28T00:00:00.000Z",
        "tend-opencode",
        { measurementSessionId: "measurement-session-1" },
      ],
    },
    {
      name: "recipe-health-by-recipe",
      sql: "SELECT * FROM framework_view.recipe_health WHERE recipe_id = $1",
      parameters: ["framework-runtime.local-timescaledb"],
    },
    {
      name: "recipe-receipts-by-status",
      sql: "SELECT * FROM framework_event.recipe_receipt WHERE receipt_status = $1",
      parameters: ["passed"],
    },
    {
      name: "recipe-receipt-metrics-by-recipe",
      sql: "SELECT * FROM framework_event.recipe_receipt_metric WHERE recipe_id = $1",
      parameters: ["framework-runtime.local-timescaledb"],
    },
    {
      name: "recipe-observations-by-recipe",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE recipe_id = $1 ORDER BY observed_at DESC",
      parameters: ["framework-runtime.local-timescaledb"],
    },
    {
      name: "measurement-observations-by-session",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'measurementSessionId' = $1 ORDER BY observed_at DESC",
      parameters: ["measurement-session-1"],
    },
    {
      name: "measurement-command-observations-by-recipe",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE observation_kind = $1 AND payload->>'inferredRecipeId' = $2 ORDER BY observed_at DESC",
      parameters: ["measurement.command.observed", "framework-runtime.local-timescaledb"],
    },
    {
      name: "measurement-command-observations-by-nx-target",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE observation_kind = $1 AND payload->>'knownNxTarget' = $2 ORDER BY observed_at DESC",
      parameters: ["measurement.command.observed", "framework-runtime:test"],
    },
    {
      name: "measurement-harness-proof-observations",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE observation_kind = $1 ORDER BY observed_at DESC",
      parameters: ["measurement.harness.proof"],
    },
    {
      name: "measurement-lifecycle-health-observations",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE recipe_id = $1 AND observation_kind = $2 ORDER BY observed_at DESC",
      parameters: ["framework-runtime.local-timescaledb", "local-timescaledb.sql-validated"],
    },
    {
      name: "measurement-report-projection-inputs",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'measurementSessionId' = $1 AND observation_kind IN ($2, $3, $4, $5, $6, $7, $8, $9, $10) ORDER BY observed_at ASC",
      parameters: [
        "measurement-session-1",
        "measurement.harness.proof",
        "measurement.command.observed",
        "measurement.trace.inventory.summary",
        "measurement.agent.metrics.summary",
        "measurement.recipe-spine.coverage",
        "measurement.edit-attempts.summary",
        "measurement.legacy-substrate.audit",
        "measurement.micro-experiment.summary",
        "measurement.migration-readiness.summary",
      ],
    },
    {
      name: "measurement-agent-metrics-by-session-phase",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'measurementSessionId' = $1 AND observation_kind = $2 AND payload->>'measurementPhase' = $3 ORDER BY observed_at DESC",
      parameters: [
        "measurement-session-1",
        "measurement.agent.metrics.summary",
        "treatment",
      ],
    },
    {
      name: "benchmark-observations-by-run",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 ORDER BY observed_at ASC, observation_id ASC",
      parameters: ["recipe-only-worktree-ab-benchmark:test"],
    },
    {
      name: "benchmark-observations-by-arm",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND payload->>'armId' = $2 ORDER BY observed_at ASC, observation_id ASC",
      parameters: ["recipe-only-worktree-ab-benchmark:test", "treatment"],
    },
    {
      name: "benchmark-observations-by-measurement-session",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'measurementSessionId' = $1 AND payload->>'benchmarkRunId' = $2 ORDER BY observed_at ASC, observation_id ASC",
      parameters: ["measurement-session-1", "recipe-only-worktree-ab-benchmark:test"],
    },
    {
      name: "benchmark-codex-thread-by-run",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND payload->>'threadId' = $2 AND observation_kind = $3 ORDER BY observed_at DESC, observation_id DESC",
      parameters: [
        "recipe-only-worktree-ab-benchmark:test",
        "codex-thread-1",
        "measurement.codex.thread.summary",
      ],
    },
    {
      name: "benchmark-final-judge-by-status",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND observation_kind = $2 AND payload->>'status' = $3 ORDER BY observed_at DESC, observation_id DESC",
      parameters: [
        "recipe-only-worktree-ab-benchmark:test",
        "measurement.benchmark.final-judge.summary",
        "completed",
      ],
    },
    {
      name: "benchmark-report-projection-inputs",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND observation_kind IN ($2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) ORDER BY observed_at ASC, observation_id ASC",
      parameters: [
        "recipe-only-worktree-ab-benchmark:test",
        "measurement.benchmark.run.started",
        "measurement.benchmark.run.completed",
        "measurement.benchmark.arm.started",
        "measurement.benchmark.arm.completed",
        "measurement.benchmark.plan.summary",
        "measurement.benchmark.final-judge.summary",
        "measurement.benchmark.holdout.evaluation",
        "measurement.codex.thread.summary",
        "measurement.codex.cluster.summary",
        "measurement.agent.tool-usage.summary",
        "measurement.benchmark.scorecard.summary",
        "measurement.benchmark.target-status.summary",
      ],
    },
    {
      name: "benchmark-packet-observations-by-packet",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND payload->>'packetId' = $2 ORDER BY observed_at ASC, observation_id ASC",
      parameters: [
        "effect-ls-packet-ablation:test",
        "effect-packet:test",
      ],
    },
    {
      name: "benchmark-packet-observations-by-rule",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND payload->>'ruleName' = $2 ORDER BY observed_at ASC, observation_id ASC",
      parameters: [
        "effect-ls-packet-ablation:test",
        "missingStarInYieldEffectGen",
      ],
    },
    {
      name: "benchmark-packet-observations-by-profile",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND payload->>'profile' = $2 ORDER BY observed_at ASC, observation_id ASC",
      parameters: [
        "effect-ls-packet-ablation:test",
        "effect-autofix-safe",
      ],
    },
    {
      name: "benchmark-packet-validation-by-status",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND observation_kind = $2 AND payload->>'status' = $3 ORDER BY observed_at DESC, observation_id DESC",
      parameters: [
        "effect-ls-packet-ablation:test",
        "measurement.benchmark.packet.validation-result",
        "cleared",
      ],
    },
    {
      name: "benchmark-packet-report-projection-inputs",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND observation_kind IN ($2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18) ORDER BY observed_at ASC, observation_id ASC",
      parameters: [
        "effect-ls-packet-ablation:test",
        "measurement.benchmark.run.started",
        "measurement.benchmark.run.completed",
        "measurement.benchmark.arm.started",
        "measurement.benchmark.arm.completed",
        "measurement.benchmark.plan.summary",
        "measurement.benchmark.packet-queue.selected",
        "measurement.benchmark.packet.started",
        "measurement.benchmark.packet.completed",
        "measurement.benchmark.packet.fix-preview",
        "measurement.benchmark.packet.apply-result",
        "measurement.benchmark.packet.validation-result",
        "measurement.benchmark.final-judge.summary",
        "measurement.codex.thread.summary",
        "measurement.codex.cluster.summary",
        "measurement.agent.tool-usage.summary",
        "measurement.benchmark.scorecard.summary",
        "measurement.benchmark.target-status.summary",
      ],
    },
    {
      name: "benchmark-loop-observations-by-kind",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND payload->>'loopKind' = $2 ORDER BY observed_at ASC, observation_id ASC",
      parameters: ["effect-packet-loop:test", "quick-turn"],
    },
    {
      name: "benchmark-target-status-latest",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND observation_kind = $2 ORDER BY observed_at DESC, observation_id DESC LIMIT 1",
      parameters: [
        "effect-packet-loop:test",
        "measurement.benchmark.target-status.summary",
      ],
    },
    {
      name: "benchmark-target-status-by-goal-status",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND observation_kind = $2 AND payload->>'twentyXGoalStatus' = $3 ORDER BY observed_at DESC, observation_id DESC",
      parameters: [
        "effect-packet-loop:test",
        "measurement.benchmark.target-status.summary",
        "candidate",
      ],
    },
    {
      name: "benchmark-exact-packet-targets",
      sql: "SELECT observation_id, observed_at, payload->'items' AS items FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND payload->>'packetId' = $2 AND observation_kind = $3 ORDER BY observed_at DESC, observation_id DESC",
      parameters: [
        "effect-packet-loop:test",
        "packet:test",
        "measurement.benchmark.target-packet.summary",
      ],
    },
    {
      name: "benchmark-registration-observations",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND observation_kind = $2 ORDER BY observed_at ASC, observation_id ASC",
      parameters: [
        "effect-packet-loop:test",
        "measurement.benchmark.loop.registered",
      ],
    },
    {
      name: "benchmark-holdout-commitments",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND observation_kind = $2 ORDER BY observed_at ASC, observation_id ASC",
      parameters: [
        "effect-packet-loop:test",
        "measurement.benchmark.holdout.commitment",
      ],
    },
    {
      name: "benchmark-holdout-evaluations",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND observation_kind = $2 ORDER BY observed_at ASC, observation_id ASC",
      parameters: [
        "effect-packet-loop:test",
        "measurement.benchmark.holdout.evaluation",
      ],
    },
    {
      name: "benchmark-negative-controls",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND observation_kind = $2 ORDER BY observed_at ASC, observation_id ASC",
      parameters: [
        "effect-packet-loop:test",
        "measurement.benchmark.negative-control.summary",
      ],
    },
    {
      name: "benchmark-all-in-cost-ledger",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND observation_kind IN ($2, $3, $4) ORDER BY observed_at ASC, observation_id ASC",
      parameters: [
        "effect-packet-loop:test",
        "measurement.codex.thread.summary",
        "measurement.codex.cluster.summary",
        "measurement.benchmark.cost-ledger.summary",
      ],
    },
    {
      name: "benchmark-corrected-scorecard-inputs",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND observation_kind IN ($2, $3, $4, $5, $6) ORDER BY observed_at ASC, observation_id ASC",
      parameters: [
        "effect-packet-loop:test",
        "measurement.benchmark.target-packet.summary",
        "measurement.benchmark.final-judge.summary",
        "measurement.benchmark.holdout.evaluation",
        "measurement.benchmark.scorecard.summary",
        "measurement.benchmark.target-status.summary",
      ],
    },
    {
      name: "benchmark-audit-inputs",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE payload->>'benchmarkRunId' = $1 AND observation_kind IN ($2, $3, $4, $5, $6, $7, $8) ORDER BY observed_at ASC, observation_id ASC",
      parameters: [
        "effect-packet-loop:test",
        "measurement.benchmark.loop.registered",
        "measurement.benchmark.holdout.commitment",
        "measurement.benchmark.holdout.evaluation",
        "measurement.benchmark.negative-control.summary",
        "measurement.benchmark.target-packet.summary",
        "measurement.benchmark.target-status.summary",
        "measurement.benchmark.audit.summary",
      ],
    },
    {
      name: "openspec-packet-observations-by-change",
      sql: "SELECT * FROM framework_event.recipe_observation WHERE recipe_id = $1 AND payload->>'changeId' = $2 AND observation_kind LIKE 'openspec.packet.%' ORDER BY observed_at ASC, observation_id ASC",
      parameters: [
        "tend-opencode.openspec-packet-sidecar",
        "compress-recipe-authoring-surface",
      ],
    },
    {
      name: "openspec-packet-selected-target-delta-inputs",
      sql: `
SELECT observation_id, observed_at, payload
FROM framework_event.recipe_observation
WHERE recipe_id = $1
  AND payload->>'changeId' = $2
  AND observation_kind = 'openspec.packet.selected-target.checked'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(payload->'candidateSummaries', '[]'::jsonb)) AS candidate(summary)
    WHERE candidate.summary->>'packetFamilyCode' = $3
      AND candidate.summary->>'selectorSummary' = $4
  )
ORDER BY observed_at ASC, observation_id ASC
`.trim(),
      parameters: [
        "tend-opencode.openspec-packet-sidecar",
        "compress-recipe-authoring-surface",
        "recipe-authoring/manual-recipe-id-inferable",
        "manual recipeId fields scoped to packages/attune/cocoindex-effect/src/CocoIndexClient.ts",
      ],
    },
    {
      name: "openspec-packet-implementation-command-inputs",
      sql: `
SELECT observation_id, observed_at, payload
FROM framework_event.recipe_observation
WHERE recipe_id = $1
  AND observation_kind = 'measurement.command.observed'
  AND (
    payload->>'command' LIKE '%' || $2 || '%'
    OR payload->>'commandLine' LIKE '%' || $2 || '%'
    OR payload->>'stdout' LIKE '%' || $2 || '%'
    OR payload->>'stderr' LIKE '%' || $2 || '%'
  )
ORDER BY
  CASE
    WHEN payload ? 'tokenTotal' AND payload->>'tokenTotal' <> '0' THEN 0
    WHEN payload->>'tokenMetricSource' IN ('opencode-json-events', 'stdout-json', 'delegated-stdio-estimate') THEN 0
    WHEN payload->>'stdout' LIKE '%"type":"step.finish"%' THEN 0
    ELSE 1
  END ASC,
  observed_at DESC,
  observation_id DESC
LIMIT 1
`.trim(),
      parameters: [
        "tend-opencode.command-observation",
        "recipe-authoring-source-path-slice",
      ],
    },
  ]

export const frameworkRecipeReceiptSafeQlConfig =
  (): FrameworkRecipeReceiptSafeQlConfig => ({
    connectionEnv: "DATABASE_URL",
    migrations: [frameworkRecipeReceiptMigrationPath],
    checkedStatements: frameworkRecipeReceiptSqlValidationStatements()
      .map((statement) => statement.sql),
  })

export const frameworkRecipeReceiptKyselyServiceContract =
  (): FrameworkRecipeReceiptKyselyServiceContract => ({
    databaseType: "KanelGeneratedFrameworkRecipeReceiptDatabase",
    generatedTypesSource: "Kanel",
    generatedTypesPath: frameworkRecipeReceiptKanelConfig().kyselyOutputPath,
  bootstrapTypeStatus: "cache-generated-kanel-types-required",
  insertMeasurementObservation: () => ({
    sql: frameworkRecipeReceiptSqlValidationStatements()
      .find((statement) => statement.name === "measurement-observation-insert")?.sql ?? "",
    parameters: [],
  }),
  latestReceipt: (recipeId) => ({
      sql: `
SELECT *
FROM framework_event.recipe_receipt
WHERE recipe_id = $1
ORDER BY COALESCE(completed_at, started_at) DESC, receipt_id DESC
LIMIT 1
`.trim(),
      parameters: [recipeId],
    }),
    receiptsByStatus: (status) => ({
      sql: `
SELECT *
FROM framework_event.recipe_receipt
WHERE receipt_status = $1
ORDER BY COALESCE(completed_at, started_at) DESC, receipt_id DESC
`.trim(),
      parameters: [status],
    }),
    observationsForRecipe: (recipeId) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE recipe_id = $1
ORDER BY observed_at DESC, observation_id DESC
`.trim(),
      parameters: [recipeId],
    }),
    observationsByMeasurementSession: (sessionId) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE payload->>'measurementSessionId' = $1
ORDER BY observed_at DESC, observation_id DESC
`.trim(),
      parameters: [sessionId],
    }),
    commandObservationsByNxTarget: (target) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE observation_kind = 'measurement.command.observed'
  AND payload->>'knownNxTarget' = $1
ORDER BY observed_at DESC, observation_id DESC
`.trim(),
      parameters: [target],
    }),
    observationsByKind: (kind) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE observation_kind = $1
ORDER BY observed_at DESC, observation_id DESC
`.trim(),
      parameters: [kind],
    }),
    benchmarkObservationsByRun: (benchmarkRunId) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE payload->>'benchmarkRunId' = $1
ORDER BY observed_at ASC, observation_id ASC
`.trim(),
      parameters: [benchmarkRunId],
    }),
    benchmarkObservationsByArm: (benchmarkRunId, armId) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE payload->>'benchmarkRunId' = $1
  AND payload->>'armId' = $2
ORDER BY observed_at ASC, observation_id ASC
`.trim(),
      parameters: [benchmarkRunId, armId],
    }),
    benchmarkCodexThreadByRun: (benchmarkRunId, threadId) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE payload->>'benchmarkRunId' = $1
  AND payload->>'threadId' = $2
  AND observation_kind = 'measurement.codex.thread.summary'
ORDER BY observed_at DESC, observation_id DESC
`.trim(),
      parameters: [benchmarkRunId, threadId],
    }),
    benchmarkFinalJudgeByStatus: (benchmarkRunId, status) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE payload->>'benchmarkRunId' = $1
  AND observation_kind = 'measurement.benchmark.final-judge.summary'
  AND payload->>'status' = $2
ORDER BY observed_at DESC, observation_id DESC
`.trim(),
      parameters: [benchmarkRunId, status],
    }),
    benchmarkReportProjectionInputs: (benchmarkRunId) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE payload->>'benchmarkRunId' = $1
  AND observation_kind IN (
    'measurement.benchmark.run.started',
    'measurement.benchmark.run.completed',
    'measurement.benchmark.arm.started',
    'measurement.benchmark.arm.completed',
	    'measurement.benchmark.plan.summary',
	    'measurement.benchmark.final-judge.summary',
	    'measurement.benchmark.holdout.evaluation',
	    'measurement.codex.thread.summary',
    'measurement.codex.cluster.summary',
    'measurement.agent.tool-usage.summary',
    'measurement.benchmark.scorecard.summary',
    'measurement.benchmark.target-status.summary'
  )
ORDER BY observed_at ASC, observation_id ASC
`.trim(),
      parameters: [benchmarkRunId],
    }),
    benchmarkPacketObservationsByPacket: (benchmarkRunId, packetId) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE payload->>'benchmarkRunId' = $1
  AND payload->>'packetId' = $2
ORDER BY observed_at ASC, observation_id ASC
`.trim(),
      parameters: [benchmarkRunId, packetId],
    }),
    benchmarkPacketObservationsByRule: (benchmarkRunId, ruleName) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE payload->>'benchmarkRunId' = $1
  AND payload->>'ruleName' = $2
ORDER BY observed_at ASC, observation_id ASC
`.trim(),
      parameters: [benchmarkRunId, ruleName],
    }),
    benchmarkPacketObservationsByProfile: (benchmarkRunId, profile) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE payload->>'benchmarkRunId' = $1
  AND payload->>'profile' = $2
ORDER BY observed_at ASC, observation_id ASC
`.trim(),
      parameters: [benchmarkRunId, profile],
    }),
    benchmarkPacketValidationByStatus: (benchmarkRunId, status) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE payload->>'benchmarkRunId' = $1
  AND observation_kind = 'measurement.benchmark.packet.validation-result'
  AND payload->>'status' = $2
ORDER BY observed_at DESC, observation_id DESC
`.trim(),
      parameters: [benchmarkRunId, status],
    }),
    benchmarkLoopObservationsByKind: (benchmarkRunId, loopKind) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE payload->>'benchmarkRunId' = $1
  AND payload->>'loopKind' = $2
ORDER BY observed_at ASC, observation_id ASC
`.trim(),
      parameters: [benchmarkRunId, loopKind],
    }),
    benchmarkTargetStatusLatest: (benchmarkRunId) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE payload->>'benchmarkRunId' = $1
  AND observation_kind = 'measurement.benchmark.target-status.summary'
ORDER BY observed_at DESC, observation_id DESC
LIMIT 1
`.trim(),
      parameters: [benchmarkRunId],
    }),
    benchmarkTargetStatusByGoalStatus: (benchmarkRunId, twentyXGoalStatus) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE payload->>'benchmarkRunId' = $1
  AND observation_kind = 'measurement.benchmark.target-status.summary'
  AND payload->>'twentyXGoalStatus' = $2
ORDER BY observed_at DESC, observation_id DESC
`.trim(),
      parameters: [benchmarkRunId, twentyXGoalStatus],
    }),
    benchmarkExactPacketTargets: (benchmarkRunId, packetId) => ({
      sql: `
SELECT observation_id, observed_at, payload->'items' AS items
FROM framework_event.recipe_observation
WHERE payload->>'benchmarkRunId' = $1
  AND payload->>'packetId' = $2
  AND observation_kind = 'measurement.benchmark.target-packet.summary'
ORDER BY observed_at DESC, observation_id DESC
`.trim(),
      parameters: [benchmarkRunId, packetId],
    }),
    benchmarkRegistrationObservations: (benchmarkRunId) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE payload->>'benchmarkRunId' = $1
  AND observation_kind = 'measurement.benchmark.loop.registered'
ORDER BY observed_at ASC, observation_id ASC
`.trim(),
      parameters: [benchmarkRunId],
    }),
    benchmarkHoldoutCommitments: (benchmarkRunId) => ({
      sql: `
	SELECT *
	FROM framework_event.recipe_observation
	WHERE payload->>'benchmarkRunId' = $1
	  AND observation_kind = 'measurement.benchmark.holdout.commitment'
	ORDER BY observed_at ASC, observation_id ASC
	`.trim(),
      parameters: [benchmarkRunId],
    }),
    benchmarkHoldoutEvaluations: (benchmarkRunId) => ({
      sql: `
	SELECT *
	FROM framework_event.recipe_observation
	WHERE payload->>'benchmarkRunId' = $1
	  AND observation_kind = 'measurement.benchmark.holdout.evaluation'
	ORDER BY observed_at ASC, observation_id ASC
	`.trim(),
      parameters: [benchmarkRunId],
    }),
    benchmarkNegativeControls: (benchmarkRunId) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE payload->>'benchmarkRunId' = $1
  AND observation_kind = 'measurement.benchmark.negative-control.summary'
ORDER BY observed_at ASC, observation_id ASC
`.trim(),
      parameters: [benchmarkRunId],
    }),
    benchmarkAllInCostLedger: (benchmarkRunId) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE payload->>'benchmarkRunId' = $1
  AND observation_kind IN (
    'measurement.codex.thread.summary',
    'measurement.codex.cluster.summary',
    'measurement.benchmark.cost-ledger.summary'
  )
ORDER BY observed_at ASC, observation_id ASC
`.trim(),
      parameters: [benchmarkRunId],
    }),
    benchmarkCorrectedScorecardInputs: (benchmarkRunId) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE payload->>'benchmarkRunId' = $1
  AND observation_kind IN (
	    'measurement.benchmark.target-packet.summary',
	    'measurement.benchmark.final-judge.summary',
	    'measurement.benchmark.holdout.evaluation',
	    'measurement.benchmark.scorecard.summary',
    'measurement.benchmark.target-status.summary'
  )
ORDER BY observed_at ASC, observation_id ASC
`.trim(),
      parameters: [benchmarkRunId],
    }),
    benchmarkAuditInputs: (benchmarkRunId) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE payload->>'benchmarkRunId' = $1
  AND observation_kind IN (
	    'measurement.benchmark.loop.registered',
	    'measurement.benchmark.holdout.commitment',
	    'measurement.benchmark.holdout.evaluation',
	    'measurement.benchmark.negative-control.summary',
    'measurement.benchmark.target-packet.summary',
    'measurement.benchmark.target-status.summary',
    'measurement.benchmark.audit.summary'
  )
ORDER BY observed_at ASC, observation_id ASC
`.trim(),
      parameters: [benchmarkRunId],
    }),
    openspecPacketObservationsByChange: (recipeId, changeId) => ({
      sql: `
SELECT *
FROM framework_event.recipe_observation
WHERE recipe_id = $1
  AND payload->>'changeId' = $2
  AND observation_kind LIKE 'openspec.packet.%'
ORDER BY observed_at ASC, observation_id ASC
`.trim(),
      parameters: [recipeId, changeId],
    }),
    openspecPacketSelectedTargetDeltaInputs: (
      recipeId,
      changeId,
      packetFamilyCode,
      selectorSummary,
    ) => ({
      sql: `
SELECT observation_id, observed_at, payload
FROM framework_event.recipe_observation
WHERE recipe_id = $1
  AND payload->>'changeId' = $2
  AND observation_kind = 'openspec.packet.selected-target.checked'
  AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(payload->'candidateSummaries', '[]'::jsonb)) AS candidate(summary)
    WHERE candidate.summary->>'packetFamilyCode' = $3
      AND candidate.summary->>'selectorSummary' = $4
  )
ORDER BY observed_at ASC, observation_id ASC
`.trim(),
      parameters: [recipeId, changeId, packetFamilyCode, selectorSummary],
    }),
    openspecPacketImplementationCommandInputs: (recipeId, implementationTitle) => ({
      sql: `
SELECT observation_id, observed_at, payload
FROM framework_event.recipe_observation
WHERE recipe_id = $1
  AND observation_kind = 'measurement.command.observed'
  AND (
    payload->>'command' LIKE '%' || $2 || '%'
    OR payload->>'commandLine' LIKE '%' || $2 || '%'
  )
ORDER BY observed_at DESC, observation_id DESC
LIMIT 1
`.trim(),
      parameters: [recipeId, implementationTitle],
    }),
  })

export const validateFrameworkRecipeReceiptSql = (
  sql: string,
): readonly string[] => {
  const missing = frameworkRecipeReceiptTables.filter((table) => !sql.includes(table))
  const forbidden = ["drizzle", "sqlite", "pgtyped"].filter((needle) =>
    sql.toLowerCase().includes(needle)
  )
  return [
    ...missing.map((table) => `missing table/view ${table}`),
    ...forbidden.map((needle) => `forbidden legacy substrate mention ${needle}`),
  ]
}

export const validateFrameworkRecipeReceiptStatements = (
  statements: readonly FrameworkSqlValidationStatement[] =
    frameworkRecipeReceiptSqlValidationStatements(),
): readonly string[] => {
  const tableReferences = [...frameworkRecipeReceiptTables]
  return statements.flatMap((statement) => {
    const normalizedSql = statement.sql.toLowerCase()
    const referencedKnownTable = tableReferences.some((table) =>
      normalizedSql.includes(table.toLowerCase())
    )
    const forbidden = ["drizzle", "sqlite", "pgtyped"].filter((needle) =>
      normalizedSql.includes(needle)
    )
    const placeholderCount = new Set(
      Array.from(statement.sql.matchAll(/\$(\d+)/gu), (match) => Number(match[1])),
    ).size
    return [
      ...(referencedKnownTable
        ? []
        : [`${statement.name} does not reference the managed recipe SQL spine`]),
      ...forbidden.map((needle) =>
        `${statement.name} contains forbidden legacy substrate mention ${needle}`
      ),
      ...(statement.sql.includes(";")
        ? [`${statement.name} must be a single statement without a semicolon`]
        : []),
      ...(placeholderCount === statement.parameters.length
        ? []
        : [
          `${statement.name} parameter count mismatch: ${placeholderCount} placeholders, ${statement.parameters.length} values`,
        ]),
    ]
  })
}

export const runtimeSqlRouteOutput = (
  _input: RuntimeSqlRouteInput = {},
): RuntimeSqlRouteOutput => {
  const statementValidationErrors = validateFrameworkRecipeReceiptStatements()
  return {
    migrationPath: frameworkRecipeReceiptKanelConfig().migrationPath,
    kanelOutputPath: frameworkRecipeReceiptKanelConfig().outputPath,
    kyselyGeneratedTypesSource:
      frameworkRecipeReceiptKyselyServiceContract().generatedTypesSource,
    safeQlStatementCount:
      frameworkRecipeReceiptSafeQlConfig().checkedStatements.length,
    statementValidationErrorCount: statementValidationErrors.length,
    legacySubstrateMentionCount: statementValidationErrors.filter((error) =>
      error.includes("forbidden legacy substrate mention")
    ).length,
  }
}

export const runtimeSqlGeneratedDirectoryOutput =
  (): RuntimeSqlGeneratedDirectoryOutput => {
    const kanel = frameworkRecipeReceiptKanelConfig()
    const kysely = frameworkRecipeReceiptKyselyServiceContract()
    return {
      outputPath: kanel.outputPath,
      kyselyOutputPath: kanel.kyselyOutputPath,
      generatedTypesSource: kysely.generatedTypesSource,
    }
  }

export const FrameworkRuntimeSqlRouteProjectorLive = Layer.succeed(
  FrameworkRuntimeSqlRouteProjector,
  {
    project: (input: RuntimeSqlRouteInput) =>
      Effect.succeed(runtimeSqlRouteOutput(input)),
  },
)

export const FrameworkRuntimeSqlRouteProjectorLayer = defineRecipeLayer({
  id: "framework-runtime.sql-route.layer",
  sourcePath: frameworkRuntimeSqlRouteSourcePath,
  exportName: "FrameworkRuntimeSqlRouteProjectorLive",
  layer: FrameworkRuntimeSqlRouteProjectorLive as never,
  provides: [{
    id: "framework-runtime.sql-route.service",
    service: FrameworkRuntimeSqlRouteProjector as never,
  }],
})

export const projectRuntimeSqlRoute = (
  input: RuntimeSqlRouteInput,
): Effect.Effect<RuntimeSqlRouteOutput, never, FrameworkRuntimeSqlRouteProjector> =>
  Effect.gen(function* projectRuntimeSqlRouteBody() {
    const projector = yield* FrameworkRuntimeSqlRouteProjector
    return yield* projector.project(input)
  })

export const FrameworkRuntimeSqlRouteHandler = defineRecipeHandler<
  RuntimeSqlRouteInput,
  RuntimeSqlRouteOutput,
  never,
  FrameworkRuntimeSqlRouteProjector
>({
  id: "framework-runtime.sql-route.handler",
  recipeId: frameworkRuntimeSqlRouteRecipeId,
  sourcePath: frameworkRuntimeSqlRouteSourcePath,
  exportName: "projectRuntimeSqlRoute",
  layer: FrameworkRuntimeSqlRouteProjectorLayer,
  emitsReceipts: ["framework-runtime.sql-route.projected"],
  handler: (input) => projectRuntimeSqlRoute(input) as never,
})

export const FrameworkRuntimeSqlRouteGenerationLive = Layer.succeed(
  FrameworkRuntimeSqlRouteGeneration,
  {
    generate: (input: RuntimeSqlRouteInput) =>
      Effect.succeed(runtimeSqlRouteOutput(input)),
  },
)

export const FrameworkRuntimeSqlRouteGenerationLayer = defineRecipeLayer({
  id: "framework-runtime.sql-route-generation.layer",
  sourcePath: frameworkRuntimeSqlRouteSourcePath,
  exportName: "FrameworkRuntimeSqlRouteGenerationLive",
  layer: FrameworkRuntimeSqlRouteGenerationLive as never,
  provides: [{
    id: "framework-runtime.sql-route-generation.service",
    service: FrameworkRuntimeSqlRouteGeneration as never,
  }],
})

export const generateRuntimeSqlRouteArtifacts = (
  input: RuntimeSqlRouteInput,
): Effect.Effect<RuntimeSqlRouteOutput, never, FrameworkRuntimeSqlRouteGeneration> =>
  Effect.gen(function* generateRuntimeSqlRouteArtifactsBody() {
    const generator = yield* FrameworkRuntimeSqlRouteGeneration
    return yield* generator.generate(input)
  })

export const FrameworkRuntimeSqlRouteGenerationHandler = defineRecipeHandler<
  RuntimeSqlRouteInput,
  RuntimeSqlRouteOutput,
  never,
  FrameworkRuntimeSqlRouteGeneration
>({
  id: "framework-runtime.sql-route-generation.handler",
  recipeId: frameworkRuntimeSqlRouteGenerationRecipeId,
  sourcePath: frameworkRuntimeSqlRouteSourcePath,
  exportName: "generateRuntimeSqlRouteArtifacts",
  layer: FrameworkRuntimeSqlRouteGenerationLayer,
  emitsReceipts: ["framework-runtime.sql-route.generated"],
  handler: (input) => generateRuntimeSqlRouteArtifacts(input) as never,
})

export const FrameworkRuntimeSqlRouteRecipe = defineRuntimeRecipe({
  id: frameworkRuntimeSqlRouteRecipeId,
  projectId: "framework-runtime",
  title: "Validate migration to TimescaleDB/Postgres to Kanel to Kysely to SafeQL route",
  inputSchema: RuntimeSqlRouteInput,
  outputSchema: RuntimeSqlRouteOutput,
  nxTarget: "framework-runtime:db:validate-sql",
  allowedFiles: [
    frameworkRuntimeSqlRouteSourcePath,
    "packages/trellis/runtime/sql/**",
    "packages/trellis/runtime/project.json",
  ],
  validationEvidence: [
    "framework-runtime:db:migrate",
    "framework-runtime:db:generate-types",
    "framework-runtime:db:validate-sql",
    "framework-runtime:db:integration-test",
    "framework-runtime:test",
  ],
  io: {
    inputSchema: RuntimeSqlRouteInput,
    outputSchema: RuntimeSqlRouteOutput,
    inputResources: [RecipeReceiptStoreSummaryResource],
    outputResources: [FrameworkRuntimeSqlRouteResource],
  },
  handler: FrameworkRuntimeSqlRouteHandler,
  alchemyDag: [
    {
      fromRecipeId: frameworkRuntimeSqlRouteRecipeId,
      toRecipeId: "framework-runtime.receipt-store-summary",
      resource: RecipeReceiptStoreSummaryResource,
      kind: "validates",
      modes: ["read", "observe", "check"],
    },
    {
      fromRecipeId: frameworkRuntimeSqlRouteRecipeId,
      toRecipeId: frameworkRuntimeSqlRouteGenerationRecipeId,
      resource: FrameworkRuntimeSqlRouteResource,
      kind: "projects",
      modes: ["read", "project", "check"],
    },
  ],
})

export const FrameworkRuntimeSqlRouteGenerationRecipe = defineRuntimeRecipe({
  id: frameworkRuntimeSqlRouteGenerationRecipeId,
  projectId: "framework-runtime",
  title: "Run SQL route generation and validation stages behind LocalTimescaleManagedRecipe",
  inputSchema: RuntimeSqlRouteInput,
  outputSchema: RuntimeSqlRouteOutput,
  nxTarget: "framework-runtime:db:generate-types",
  allowedFiles: [
    "packages/trellis/runtime/src/internal/db/LocalTimescaleCli.ts",
    frameworkRuntimeSqlRouteSourcePath,
    "packages/trellis/runtime/src/LocalTimescaleRecipe.ts",
    "packages/trellis/runtime/sql/**",
    "packages/trellis/runtime/project.json",
    "nix/**",
  ],
  validationEvidence: [
    "framework-runtime:db:migrate",
    "framework-runtime:db:generate-types",
    "framework-runtime:db:validate-sql",
    "framework-runtime:db:integration-test",
  ],
  io: {
    inputSchema: RuntimeSqlRouteInput,
    outputSchema: RuntimeSqlRouteOutput,
    inputResources: [FrameworkRuntimeSqlRouteResource],
    outputResources: [FrameworkRuntimeSqlGeneratedDirectoryResource],
  },
  handler: FrameworkRuntimeSqlRouteGenerationHandler,
  alchemyDag: [
    {
      fromRecipeId: frameworkRuntimeSqlRouteGenerationRecipeId,
      toRecipeId: "framework-runtime.local-timescaledb",
      resource: "framework-runtime.local-timescaledb.resource",
      kind: "manages",
      modes: ["read", "project", "check"],
    },
  ],
})

export const FrameworkRuntimeSqlRouteRecipes = [
  FrameworkRuntimeSqlRouteRecipe,
  FrameworkRuntimeSqlRouteGenerationRecipe,
] as const

export const readFrameworkRecipeReceiptMigration = (
  workspaceRoot = process.cwd(),
): string =>
  readFileSync(`${workspaceRoot}/${frameworkRecipeReceiptMigrationPath}`, "utf8")
