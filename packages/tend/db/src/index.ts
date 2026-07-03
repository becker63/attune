import { readFileSync } from "node:fs"
import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  defineRuntimeRecipe,
} from "@attune/framework-protocol"
import { Context, Effect, Layer, Schema } from "effect"

export const tendControlMigrationPath =
  "packages/tend/db/sql/0001_tend_control_spine.sql" as const
export const TendDbControlSpineRecipeId = "tend-db.control-spine" as const
export const TendDbSqlValidationRouteRecipeId = "tend-db.sql-validation-route" as const
export const TendDbTestSuiteRecipeId = "tend-db.test-suite" as const
export const TendDbConfigRecipeId = "tend-db.config-surface" as const
export const TendDbSourcePath = "packages/tend/db/src/index.ts" as const
export const TendDbTypecheckTarget = "tend-db:typecheck" as const

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

export const tendRecipeSpineLinkRequirements = [
  {
    relation: "tend_core.session",
    columns: ["recipe_id", "run_id", "observation_id"],
  },
  {
    relation: "tend_core.context_decision",
    columns: ["recipe_id", "run_id", "receipt_id", "observation_id"],
  },
  {
    relation: "tend_core.openrtk_action",
    columns: ["source_observation_ids", "recipe_id", "run_id", "receipt_id", "observation_id"],
  },
  {
    relation: "tend_core.tool_call",
    columns: ["recipe_id", "run_id", "receipt_id", "observation_id"],
  },
  {
    relation: "tend_core.long_job",
    columns: ["recipe_id", "run_id", "receipt_id", "observation_id"],
  },
  {
    relation: "tend_event.event",
    columns: ["recipe_id", "run_id", "receipt_id", "observation_id"],
  },
  {
    relation: "tend_event.token_usage",
    columns: ["event_id", "recipe_id", "run_id", "receipt_id", "observation_id"],
  },
  {
    relation: "tend_event.token_metric",
    columns: ["event_id", "recipe_id", "run_id", "receipt_id", "observation_id"],
  },
  {
    relation: "tend_event.command_output_sample",
    columns: ["command_observation_id", "recipe_id", "run_id", "receipt_id", "observation_id"],
  },
  {
    relation: "tend_event.long_job_observation",
    columns: ["observation_id", "recipe_id", "run_id", "receipt_id"],
  },
  {
    relation: "tend_outbox.wakeup",
    columns: ["target_recipe_id", "run_id", "receipt_id", "observation_id"],
  },
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
  run_id,
  receipt_id,
  observation_id,
  payload
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
ON CONFLICT (event_id) DO UPDATE SET
  payload = EXCLUDED.payload,
  run_id = EXCLUDED.run_id,
  receipt_id = EXCLUDED.receipt_id
`.trim(),
  parameters: [
    "eventId",
    "sessionId",
    "kind",
    "occurredAt",
    "recipeId",
    "runId",
    "receiptId",
    "observationId",
    "payload",
  ],
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
    "SELECT * FROM tend_event.event WHERE recipe_id = $1 AND observation_id = $2",
    "SELECT * FROM tend_event.command_output_sample WHERE observation_id = $1",
  ] as const,
})

export const readTendControlMigration = (workspaceRoot = process.cwd()): string =>
  readFileSync(`${workspaceRoot}/${tendControlMigrationPath}`, "utf8")

export const validateTendControlMigration = (sql: string): readonly string[] =>
  [
    ...tendRequiredRelations
      .filter((relation) => !sql.includes(relation))
      .map((relation) => `missing Tend relation ${relation}`),
    ...validateTendRecipeSpineLinks(sql),
  ]

export const validateTendRecipeSpineLinks = (sql: string): readonly string[] =>
  tendRecipeSpineLinkRequirements.flatMap(({ relation, columns }) => {
    const body = tableBody(sql, relation)
    if (body === undefined) return [`missing Tend relation ${relation}`]
    return columns
      .filter((column) => !new RegExp(`\\b${escapeRegExp(column)}\\b`, "u").test(body))
      .map((column) => `missing Tend recipe-spine link ${relation}.${column}`)
  })

const tableBody = (sql: string, relation: string): string | undefined => {
  const match = new RegExp(
    `CREATE TABLE IF NOT EXISTS ${escapeRegExp(relation)}\\s*\\((?<body>[\\s\\S]*?)\\);`,
    "u",
  ).exec(sql)
  return match?.groups?.body
}

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")

export interface TendDbFilesystemService {
  readonly readTextFile: (path: string) => Effect.Effect<string>
}

export class TendDbFilesystem extends Context.Service<
  TendDbFilesystem,
  TendDbFilesystemService
>()("@attune/TendDbFilesystem") {}

export const TendDbFilesystemLive = defineRecipeLayer({
  id: "tend-db.filesystem-layer",
  sourcePath: "packages/tend/db/src/index.ts",
  exportName: "TendDbFilesystemLive",
  layer: Layer.succeed(TendDbFilesystem, {
    readTextFile: (file) => Effect.sync(() => readFileSync(file, "utf8")),
  }),
  provides: [{
    id: "tend-db.filesystem",
    service: TendDbFilesystem,
  }],
})

export const readTendControlMigrationEffect = (
  workspaceRoot = process.cwd(),
): Effect.Effect<string, never, TendDbFilesystem> =>
  Effect.gen(function* readTendControlMigrationFromLayer() {
    const filesystem = yield* TendDbFilesystem
    return yield* filesystem.readTextFile(`${workspaceRoot}/${tendControlMigrationPath}`)
  })

export const TendDbAddress = Schema.Struct({
  packageRoot: Schema.Literal("packages/tend/db"),
  recipeId: Schema.String,
})
export type TendDbAddress = typeof TendDbAddress.Type

export const TendDbSqlValidationInput = Schema.Struct({
  migrationSql: Schema.String,
})
export type TendDbSqlValidationInput = typeof TendDbSqlValidationInput.Type

export const TendDbSqlValidationOutput = Schema.Struct({
  recipeId: Schema.String,
  runtimeBoundary: Schema.String,
  diagnostics: Schema.Array(Schema.String),
})
export type TendDbSqlValidationOutput = typeof TendDbSqlValidationOutput.Type

export const TendDbTestReport = Schema.Struct({
  recipeId: Schema.String,
  runtimeBoundary: Schema.String,
})
export type TendDbTestReport = typeof TendDbTestReport.Type

// @attune-packet-target generated-runtime-projection eligible
export const TendDbPackageResource = defineAlchemyResource({
  id: "tend-db.package-root",
  kind: "directory",
  alchemyType: "attune:resource:Directory",
  consumedBy: [
    TendDbControlSpineRecipeId,
    TendDbSqlValidationRouteRecipeId,
    TendDbTestSuiteRecipeId,
    TendDbConfigRecipeId,
  ],
  addressSchema: TendDbAddress,
  stateSchema: Schema.Struct({
    sourceRoot: Schema.Literal("packages/tend/db/src"),
    packageId: Schema.Literal("tend-db"),
  }),
  modes: ["read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendDbMigrationSqlResource = defineAlchemyResource({
  id: "tend-db.control-spine-sql",
  kind: "runtime-sql",
  alchemyType: "attune:resource:RuntimeSql",
  ownerRecipeId: TendDbControlSpineRecipeId,
  consumedBy: [TendDbControlSpineRecipeId, TendDbSqlValidationRouteRecipeId],
  programmaticResourceExport: "readTendControlMigrationEffect",
  programmaticBridgeSourcePath: TendDbSourcePath,
  addressSchema: TendDbAddress,
  stateSchema: Schema.Struct({
    path: Schema.Literal("packages/tend/db/sql/0001_tend_control_spine.sql"),
    migrationName: Schema.Literal("0001_tend_control_spine"),
  }),
  modes: ["read", "check"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendDbRuntimeRouteResource = defineAlchemyResource({
  id: "tend-db.runtime-route",
  kind: "database",
  alchemyType: "attune:resource:DatabaseRoute",
  ownerRecipeId: TendDbSqlValidationRouteRecipeId,
  producedBy: [TendDbControlSpineRecipeId, TendDbSqlValidationRouteRecipeId],
  programmaticResourceExport: "tendEventInsertContract",
  programmaticProviderExport: "tendSafeQlConfig",
  programmaticBridgeSourcePath: TendDbSourcePath,
  addressSchema: TendDbAddress,
  stateSchema: Schema.Struct({
    migrationPath: Schema.Literal(tendControlMigrationPath),
    kanelOutputPath: Schema.Literal(".attune/cache/generated/tend/db/kanel"),
    insertStatement: Schema.Literal("tend_event.event.insert"),
  }),
  modes: ["project", "check"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendDbValidationReportResource = defineAlchemyResource({
  id: "tend-db.sql-validation-report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: TendDbSqlValidationRouteRecipeId,
  producedBy: [
    TendDbControlSpineRecipeId,
    TendDbSqlValidationRouteRecipeId,
    TendDbTestSuiteRecipeId,
  ],
  addressSchema: TendDbAddress,
  stateSchema: TendDbSqlValidationOutput,
  modes: ["check", "observe"],
})

export const summarizeTendDbControlSpine = (
  input: TendDbSqlValidationInput,
): TendDbSqlValidationOutput => ({
  recipeId: TendDbControlSpineRecipeId,
  runtimeBoundary: tendEventInsertContract().statementName,
  diagnostics: [...validateTendControlMigration(input.migrationSql)],
})

export const summarizeTendDbSqlValidationRoute = (
  input: TendDbSqlValidationInput,
): TendDbSqlValidationOutput => ({
  recipeId: TendDbSqlValidationRouteRecipeId,
  runtimeBoundary: `${tendKanelConfig().connectionEnv}:${tendSafeQlConfig().connectionEnv}`,
  diagnostics: [...validateTendControlMigration(input.migrationSql)],
})

export const TendDbControlSpineHandler = defineRecipeHandler<TendDbSqlValidationInput, TendDbSqlValidationOutput>({
  id: "tend-db.control-spine.handler",
  recipeId: TendDbControlSpineRecipeId,
  sourcePath: TendDbSourcePath,
  exportName: "summarizeTendDbControlSpine",
  layer: TendDbFilesystemLive,
  handler: (input) => Effect.succeed(summarizeTendDbControlSpine(input)),
  emitsReceipts: ["tend-db.sql-validation-report"],
})

export const TendDbSqlValidationRouteHandler = defineRecipeHandler<TendDbSqlValidationInput, TendDbSqlValidationOutput>({
  id: "tend-db.sql-validation-route.handler",
  recipeId: TendDbSqlValidationRouteRecipeId,
  sourcePath: TendDbSourcePath,
  exportName: "summarizeTendDbSqlValidationRoute",
  layer: TendDbFilesystemLive,
  handler: (input) => Effect.succeed(summarizeTendDbSqlValidationRoute(input)),
  emitsReceipts: ["tend-db.sql-validation-route"],
})

export const TendDbControlSpineDagEdge = defineAlchemyRecipeDagEdge({
  fromRecipeId: TendDbControlSpineRecipeId,
  toRecipeId: TendDbSqlValidationRouteRecipeId,
  resource: TendDbValidationReportResource,
  kind: "validates",
  modes: ["check", "observe"],
  validationTargets: [TendDbTypecheckTarget],
})

// @attune-packet-target generated-runtime-projection eligible
export const tendDbControlSpineRecipe = defineProjectionRecipe({
  id: TendDbControlSpineRecipeId,
  projectId: "tend-db",
  title: "Route Tend control-spine state through recipe runtime boundaries",
  inputSchema: TendDbSqlValidationInput,
  outputSchema: TendDbSqlValidationOutput,
  allowedFiles: [
    TendDbSourcePath,
    "packages/tend/db/sql/0001_tend_control_spine.sql",
  ],
  validationEvidence: [TendDbTypecheckTarget],
  io: {
    inputSchema: TendDbSqlValidationInput,
    outputSchema: TendDbSqlValidationOutput,
    inputResources: [TendDbMigrationSqlResource],
    outputResources: [TendDbRuntimeRouteResource, TendDbValidationReportResource],
  },
  handler: TendDbControlSpineHandler,
  alchemyDag: [TendDbControlSpineDagEdge],
})

export const tendDbSqlValidationRouteRecipe = defineRuntimeRecipe({
  id: TendDbSqlValidationRouteRecipeId,
  projectId: "tend-db",
  title: "Validate Tend SQL access as a runtime-owned query route",
  inputSchema: TendDbSqlValidationInput,
  outputSchema: TendDbSqlValidationOutput,
  allowedFiles: [
    TendDbSourcePath,
    "packages/tend/db/sql/0001_tend_control_spine.sql",
  ],
  validationEvidence: [TendDbTypecheckTarget],
  io: {
    inputSchema: TendDbSqlValidationInput,
    outputSchema: TendDbSqlValidationOutput,
    inputResources: [TendDbMigrationSqlResource],
    outputResources: [TendDbRuntimeRouteResource, TendDbValidationReportResource],
  },
  handler: TendDbSqlValidationRouteHandler,
})

export const TendDbProductionRecipes = [
  tendDbControlSpineRecipe,
  tendDbSqlValidationRouteRecipe,
] as const
