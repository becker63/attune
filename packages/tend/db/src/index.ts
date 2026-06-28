import { readFileSync } from "node:fs"
import { Schema } from "effect"
import { defineRecipe } from "@attune/framework-protocol"

export const tendControlMigrationPath =
  "packages/tend/db/sql/0001_tend_control_spine.sql" as const

export const tendRequiredRelations = [
  "tend_core.session",
  "tend_core.context_decision",
  "tend_core.openrtk_action",
  "tend_core.tool_call",
  "tend_core.long_job",
  "tend_core.artifact_ref",
  "tend_event.event",
  "tend_event.token_usage",
  "tend_event.token_metric",
  "tend_event.command_output_sample",
  "tend_event.long_job_observation",
  "tend_view.token_usage_by_session_5m",
  "tend_view.command_output_by_class_5m",
  "tend_view.long_job_latency_5m",
  "tend_outbox.wakeup",
] as const

export const TendEventInsertContract = Schema.Struct({
  statementName: Schema.String,
  sql: Schema.String,
  parameters: Schema.Array(Schema.String),
})
export type TendEventInsertContract = typeof TendEventInsertContract.Type

export const tendEventInsertContract = (): TendEventInsertContract => ({
  statementName: "tend_event.event.insert",
  sql: `
INSERT INTO tend_event.event (
  event_id,
  session_id,
  event_kind,
  occurred_at,
  recipe_id,
  receipt_id,
  payload
) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
ON CONFLICT (event_id) DO UPDATE SET
  payload = EXCLUDED.payload,
  receipt_id = EXCLUDED.receipt_id
`.trim(),
  parameters: ["eventId", "sessionId", "kind", "occurredAt", "recipeId", "receiptId", "payload"],
})

export const tendKanelConfig = () => ({
  connectionEnv: "DATABASE_URL",
  schemas: ["tend_core", "tend_event", "tend_view", "tend_outbox"] as const,
  outputPath: ".attune/cache/generated/tend/db/kanel",
  migrationPath: tendControlMigrationPath,
})

export const tendSafeQlConfig = () => ({
  connectionEnv: "DATABASE_URL",
  migrations: [tendControlMigrationPath] as const,
  checkedStatements: [
    tendEventInsertContract().sql,
    "SELECT * FROM tend_view.token_usage_by_session_5m WHERE session_id = $1",
    "SELECT * FROM tend_outbox.wakeup WHERE session_id = $1",
  ] as const,
})

export const readTendControlMigration = (workspaceRoot = process.cwd()): string =>
  readFileSync(`${workspaceRoot}/${tendControlMigrationPath}`, "utf8")

export const validateTendControlMigration = (sql: string): readonly string[] =>
  tendRequiredRelations
    .filter((relation) => !sql.includes(relation))
    .map((relation) => `missing Tend relation ${relation}`)

export const TendDbRecipes = [
  defineRecipe({
    id: "tend-db.control-spine",
    projectId: "tend-db",
    title: "Apply Tend TimescaleDB/Postgres control spine",
    inputSchema: Schema.Struct({ migrationSql: Schema.String }),
    outputSchema: Schema.Struct({ diagnostics: Schema.Array(Schema.String) }),
    nxTarget: "tend-db:test",
    sourcePath: "packages/tend/db/sql/0001_tend_control_spine.sql",
    allowedFiles: ["packages/tend/db/**"],
    validationEvidence: ["tend-db:test", "framework-runtime:db:validate-sql"],
  }),
] as const
