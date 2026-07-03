import { Context, Effect, Layer, Schema } from "effect"
import {
  RecipeReceiptStoreSnapshotSchema,
  RecipeEdgeRecordView,
  RecipeRecordView,
  defineAlchemyResource,
  defineObservationRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  type RecipeDefinition,
  type RecipeDiagnostic,
  type RecipeHealth,
  type RecipeIo,
  type RecipeObservation,
  type RecipeReceipt,
  type RecipeReceiptStoreSnapshot,
  type RecipeRecord,
  type RecipeRepair,
  type RecipeRun,
} from "@attune/framework-protocol"
import {
  type RecipeReceiptStoreApi,
  type RecipeReceiptStoreRecipeView,
  type RecipeReceiptStoreRunRecord,
} from "./RecipeReceiptStore.js"

export interface PostgresQueryResult<Row extends Record<string, unknown>> {
  readonly rows: readonly Row[]
}

export interface PostgresQueryClient {
  readonly query: <Row extends Record<string, unknown> = Record<string, unknown>>(
    sql: string,
    parameters?: readonly unknown[],
  ) => Promise<PostgresQueryResult<Row>>
}

export const createPostgresRecipeReceiptStore = (
  client: PostgresQueryClient,
): RecipeReceiptStoreApi => ({
  registerRecipe: (recipe) => postgresEffect(async () => {
    const record = RecipeRecordView.fromRecipe(recipe)
    await client.query(recipeUpsertSql, [
      record.recipeId,
      record.kind,
      record.projectId ?? null,
      record.title ?? null,
      record.nxTarget ?? null,
      record.sourcePath ?? null,
      record.resourceKind ?? null,
      record.humanReviewRequired,
    ])
    for (const edge of RecipeEdgeRecordView.fromRecipe(recipe)) {
      await client.query(recipeEdgeUpsertSql, [
        edge.recipeId,
        edge.dependsOnRecipeId,
        edge.reason ?? null,
      ])
    }
  }),
  recordPlan: (plan) => postgresEffect(async () => {
    for (const item of [...plan.expectedInputs, ...plan.expectedOutputs]) {
      await upsertIo(client, item)
    }
    for (const repair of plan.repairs) await upsertRepair(client, repair)
    await upsertHealth(client, plan.health)
  }),
  recordRunResult: (record) => postgresEffect(async () => {
    await upsertRun(client, record.run)
    await upsertReceipt(client, record.receipt)
    for (const diagnostic of record.diagnostics) await upsertDiagnostic(client, diagnostic)
    for (const repair of record.repairs) await upsertRepair(client, repair)
    for (const observation of record.observations ?? []) await upsertObservation(client, observation)
    await upsertHealth(client, record.health)
  }),
  recordObservation: (observation) =>
    postgresEffect(() => upsertObservation(client, observation)),
  recipeView: (recipeId) => postgresEffect(async () => {
    const [recipe, receipts, runs, observations, health, diagnostics, repairs] = await Promise.all([
      selectOne(client, recipeSelectSql, [recipeId], recipeRecordFromRow),
      selectMany(client, receiptsForRecipeSql, [recipeId], receiptFromRow),
      selectMany(client, runsForRecipeSql, [recipeId], runFromRow),
      selectMany(client, observationsForRecipeSql, [recipeId], observationFromRow),
      selectOne(client, healthForRecipeSql, [recipeId], healthFromRow),
      selectMany(client, diagnosticsForRecipeSql, [recipeId], diagnosticFromRow),
      selectMany(client, repairsForRecipeSql, [recipeId], repairFromRow),
    ])
    return {
      recipe,
      latestReceipt: receipts[0],
      receipts,
      runs,
      observations,
      health,
      diagnostics,
      repairs,
    } satisfies RecipeReceiptStoreRecipeView
  }),
  receiptById: (receiptId) =>
    postgresEffect(() => selectOne(client, receiptByIdSql, [receiptId], receiptFromRow)),
  receiptsForRecipe: (recipeId) =>
    postgresEffect(() => selectMany(client, receiptsForRecipeSql, [recipeId], receiptFromRow)),
  receiptsByStatus: (status) =>
    postgresEffect(() => selectMany(client, receiptsByStatusSql, [status], receiptFromRow)),
  runsForRecipe: (recipeId) =>
    postgresEffect(() => selectMany(client, runsForRecipeSql, [recipeId], runFromRow)),
  observationsForRecipe: (recipeId) =>
    postgresEffect(() => selectMany(client, observationsForRecipeSql, [recipeId], observationFromRow)),
  observationsForRun: (runId) =>
    postgresEffect(() => selectMany(client, observationsForRunSql, [runId], observationFromRow)),
  observationsForReceipt: (receiptId) =>
    postgresEffect(() => selectMany(client, observationsForReceiptSql, [receiptId], observationFromRow)),
  observationsByKind: (observationKind) =>
    postgresEffect(() => selectMany(client, observationsByKindSql, [observationKind], observationFromRow)),
  latestReceipt: (recipeId) =>
    postgresEffect(() => selectOne(client, latestReceiptSql, [recipeId], receiptFromRow)),
  healthForRecipe: (recipeId) =>
    postgresEffect(() => selectOne(client, healthForRecipeSql, [recipeId], healthFromRow)),
  diagnosticsForRecipe: (recipeId) =>
    postgresEffect(() => selectMany(client, diagnosticsForRecipeSql, [recipeId], diagnosticFromRow)),
  repairsForRecipe: (recipeId) =>
    postgresEffect(() => selectMany(client, repairsForRecipeSql, [recipeId], repairFromRow)),
  snapshot: () => postgresEffect(async () => ({
    recipes: await selectMany(client, recipeSnapshotSql, [], recipeRecordFromRow),
    edges: await selectMany(client, edgeSnapshotSql, [], (row) => ({
      recipeId: stringCell(row, "recipe_id"),
      dependsOnRecipeId: stringCell(row, "depends_on_recipe_id"),
      ...optionalStringField(row, "reason", "reason"),
    })),
    io: await selectMany(client, ioSnapshotSql, [], ioFromRow),
    runs: await selectMany(client, runSnapshotSql, [], runFromRow),
    receipts: await selectMany(client, receiptSnapshotSql, [], receiptFromRow),
    observations: await selectMany(client, observationSnapshotSql, [], observationFromRow),
    diagnostics: await selectMany(client, diagnosticSnapshotSql, [], diagnosticFromRow),
    repairs: await selectMany(client, repairSnapshotSql, [], repairFromRow),
    health: await selectMany(client, healthSnapshotSql, [], healthFromRow),
  } satisfies RecipeReceiptStoreSnapshot)),
})

const postgresEffect = <A>(effect: () => Promise<A>): Effect.Effect<A> =>
  Effect.promise(effect)

const recipeUpsertSql = `
INSERT INTO framework_core.recipe (
  recipe_id,
  recipe_kind,
  project_id,
  title,
  nx_target,
  source_path,
  resource_kind,
  human_review_required
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (recipe_id) DO UPDATE SET
  recipe_kind = EXCLUDED.recipe_kind,
  project_id = EXCLUDED.project_id,
  title = EXCLUDED.title,
  nx_target = EXCLUDED.nx_target,
  source_path = EXCLUDED.source_path,
  resource_kind = EXCLUDED.resource_kind,
  human_review_required = EXCLUDED.human_review_required,
  updated_at = now()
`

const recipeEdgeUpsertSql = `
INSERT INTO framework_core.recipe_edge (
  recipe_id,
  depends_on_recipe_id,
  reason
) VALUES ($1, $2, $3)
ON CONFLICT (recipe_id, depends_on_recipe_id) DO UPDATE SET
  reason = EXCLUDED.reason
`

const ioUpsertSql = `
INSERT INTO framework_core.recipe_io (
  io_id,
  recipe_id,
  io_role,
  name,
  schema_name,
  content_hash,
  payload
) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
ON CONFLICT (io_id) DO UPDATE SET
  io_role = EXCLUDED.io_role,
  name = EXCLUDED.name,
  schema_name = EXCLUDED.schema_name,
  content_hash = EXCLUDED.content_hash,
  payload = EXCLUDED.payload
`

const runUpsertSql = `
INSERT INTO framework_event.recipe_run (
  run_id,
  recipe_id,
  lifecycle_action,
  run_status,
  started_at,
  completed_at,
  input_hash,
  output_hash
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (run_id) DO UPDATE SET
  lifecycle_action = EXCLUDED.lifecycle_action,
  run_status = EXCLUDED.run_status,
  completed_at = EXCLUDED.completed_at,
  input_hash = EXCLUDED.input_hash,
  output_hash = EXCLUDED.output_hash
`

const receiptUpsertSql = `
INSERT INTO framework_event.recipe_receipt (
  receipt_id,
  recipe_id,
  run_id,
  receipt_status,
  started_at,
  completed_at,
  command,
  stdout_summary,
  stderr_summary,
  output_hash,
  validation_evidence,
  payload
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
ON CONFLICT (receipt_id) DO UPDATE SET
  receipt_status = EXCLUDED.receipt_status,
  completed_at = EXCLUDED.completed_at,
  command = EXCLUDED.command,
  stdout_summary = EXCLUDED.stdout_summary,
  stderr_summary = EXCLUDED.stderr_summary,
  output_hash = EXCLUDED.output_hash,
  validation_evidence = EXCLUDED.validation_evidence,
  payload = EXCLUDED.payload
`

const observationUpsertSql = `
INSERT INTO framework_event.recipe_observation (
  observation_id,
  recipe_id,
  run_id,
  receipt_id,
  observation_kind,
  observed_at,
  source,
  payload
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
ON CONFLICT (observation_id) DO UPDATE SET
  recipe_id = EXCLUDED.recipe_id,
  run_id = EXCLUDED.run_id,
  receipt_id = EXCLUDED.receipt_id,
  observation_kind = EXCLUDED.observation_kind,
  observed_at = EXCLUDED.observed_at,
  source = EXCLUDED.source,
  payload = EXCLUDED.payload
`

const diagnosticUpsertSql = `
INSERT INTO framework_event.recipe_diagnostic (
  diagnostic_id,
  recipe_id,
  receipt_id,
  code,
  severity,
  message,
  source_path,
  range_start,
  range_end,
  cause
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
ON CONFLICT (diagnostic_id) DO UPDATE SET
  receipt_id = EXCLUDED.receipt_id,
  severity = EXCLUDED.severity,
  message = EXCLUDED.message,
  source_path = EXCLUDED.source_path,
  range_start = EXCLUDED.range_start,
  range_end = EXCLUDED.range_end,
  cause = EXCLUDED.cause
`

const repairUpsertSql = `
INSERT INTO framework_event.recipe_repair (
  repair_id,
  recipe_id,
  diagnostic_id,
  title,
  repair_kind,
  nx_target,
  allowed_files,
  risk,
  evidence_requirements,
  payload
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
ON CONFLICT (repair_id) DO UPDATE SET
  diagnostic_id = EXCLUDED.diagnostic_id,
  title = EXCLUDED.title,
  repair_kind = EXCLUDED.repair_kind,
  nx_target = EXCLUDED.nx_target,
  allowed_files = EXCLUDED.allowed_files,
  risk = EXCLUDED.risk,
  evidence_requirements = EXCLUDED.evidence_requirements,
  payload = EXCLUDED.payload
`

const healthUpsertSql = `
INSERT INTO framework_event.recipe_diagnostic (
  diagnostic_id,
  recipe_id,
  code,
  severity,
  message
) VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (diagnostic_id) DO UPDATE SET
  message = EXCLUDED.message
`

const recipeSelectSql = "SELECT * FROM framework_core.recipe WHERE recipe_id = $1"
const recipeSnapshotSql = "SELECT * FROM framework_core.recipe ORDER BY recipe_id"
const edgeSnapshotSql = "SELECT * FROM framework_core.recipe_edge ORDER BY recipe_id, depends_on_recipe_id"
const ioSnapshotSql = "SELECT * FROM framework_core.recipe_io ORDER BY io_id"
const runSnapshotSql = "SELECT * FROM framework_event.recipe_run ORDER BY started_at, run_id"
const receiptSnapshotSql = "SELECT * FROM framework_event.recipe_receipt ORDER BY COALESCE(completed_at, started_at), receipt_id"
const observationSnapshotSql = "SELECT * FROM framework_event.recipe_observation ORDER BY observation_id"
const diagnosticSnapshotSql = "SELECT * FROM framework_event.recipe_diagnostic ORDER BY diagnostic_id"
const repairSnapshotSql = "SELECT * FROM framework_event.recipe_repair ORDER BY repair_id"
const healthSnapshotSql = "SELECT * FROM framework_view.recipe_health ORDER BY recipe_id"
const latestReceiptSql = `
SELECT *
FROM framework_event.recipe_receipt
WHERE recipe_id = $1
ORDER BY COALESCE(completed_at, started_at) DESC, receipt_id DESC
LIMIT 1
`
const receiptByIdSql = "SELECT * FROM framework_event.recipe_receipt WHERE receipt_id = $1"
const receiptsForRecipeSql = `
SELECT *
FROM framework_event.recipe_receipt
WHERE recipe_id = $1
ORDER BY COALESCE(completed_at, started_at) DESC, receipt_id DESC
`
const receiptsByStatusSql = `
SELECT *
FROM framework_event.recipe_receipt
WHERE receipt_status = $1
ORDER BY COALESCE(completed_at, started_at) DESC, receipt_id DESC
`
const runsForRecipeSql = `
SELECT *
FROM framework_event.recipe_run
WHERE recipe_id = $1
ORDER BY started_at, run_id
`
const observationsForRecipeSql = `
SELECT *
FROM framework_event.recipe_observation
WHERE recipe_id = $1
ORDER BY observed_at DESC, observation_id DESC
`
const observationsForRunSql = `
SELECT *
FROM framework_event.recipe_observation
WHERE run_id = $1
ORDER BY observed_at DESC, observation_id DESC
`
const observationsForReceiptSql = `
SELECT *
FROM framework_event.recipe_observation
WHERE receipt_id = $1
ORDER BY observed_at DESC, observation_id DESC
`
const observationsByKindSql = `
SELECT *
FROM framework_event.recipe_observation
WHERE observation_kind = $1
ORDER BY observed_at DESC, observation_id DESC
`
const healthForRecipeSql = "SELECT * FROM framework_view.recipe_health WHERE recipe_id = $1"
const diagnosticsForRecipeSql = "SELECT * FROM framework_event.recipe_diagnostic WHERE recipe_id = $1 ORDER BY diagnostic_id"
const repairsForRecipeSql = "SELECT * FROM framework_event.recipe_repair WHERE recipe_id = $1 ORDER BY repair_id"

const upsertIo = (client: PostgresQueryClient, item: RecipeIo): Promise<unknown> =>
  client.query(ioUpsertSql, [
    item.id,
    item.recipeId,
    item.role,
    item.name,
    item.schemaName ?? null,
    item.hash ?? null,
    json(item.payload),
  ])

const upsertRun = (client: PostgresQueryClient, run: RecipeRun): Promise<unknown> =>
  client.query(runUpsertSql, [
    run.runId,
    run.recipeId,
    run.action ?? null,
    run.status,
    run.startedAt,
    run.completedAt ?? null,
    run.inputHash ?? null,
    run.outputHash ?? null,
  ])

const upsertReceipt = (client: PostgresQueryClient, receipt: RecipeReceipt): Promise<unknown> =>
  client.query(receiptUpsertSql, [
    receipt.receiptId,
    receipt.recipeId,
    receipt.runId,
    receipt.status,
    receipt.startedAt,
    receipt.completedAt ?? null,
    receipt.command ?? null,
    receipt.stdoutSummary ?? null,
    receipt.stderrSummary ?? null,
    receipt.outputHash ?? null,
    receipt.validationEvidence ?? [],
    json(receipt.payload),
  ])

const upsertObservation = (
  client: PostgresQueryClient,
  observation: RecipeObservation,
): Promise<unknown> =>
  client.query(observationUpsertSql, [
    observation.observationId,
    observation.recipeId,
    observation.runId ?? null,
    observation.receiptId ?? null,
    observation.observationKind,
    observation.observedAt,
    observation.source ?? null,
    jsonRequired(observation.payload),
  ])

const upsertDiagnostic = (
  client: PostgresQueryClient,
  diagnostic: RecipeDiagnostic,
): Promise<unknown> =>
  client.query(diagnosticUpsertSql, [
    diagnostic.diagnosticId,
    diagnostic.recipeId,
    diagnostic.receiptId ?? null,
    diagnostic.code,
    diagnostic.severity,
    diagnostic.message,
    diagnostic.sourcePath ?? null,
    diagnostic.range?.start ?? null,
    diagnostic.range?.end ?? null,
    json(diagnostic.cause),
  ])

const upsertRepair = (client: PostgresQueryClient, repair: RecipeRepair): Promise<unknown> =>
  client.query(repairUpsertSql, [
    repair.repairId,
    repair.recipeId,
    repair.diagnosticId ?? null,
    repair.title,
    repair.kind,
    repair.nxTarget ?? null,
    repair.allowedFiles,
    repair.risk,
    repair.evidenceRequirements,
    json(repair.payload),
  ])

const upsertHealth = (client: PostgresQueryClient, health: RecipeHealth): Promise<unknown> =>
  client.query(healthUpsertSql, [
    `health:${health.recipeId}`,
    health.recipeId,
    `attune/recipe/health/${health.status}`,
    health.status === "failed" || health.status === "blocked" ? "error" : "info",
    health.explanation,
  ])

async function selectOne<A>(
  client: PostgresQueryClient,
  sql: string,
  parameters: readonly unknown[],
  decode: (row: Record<string, unknown>) => A,
): Promise<A | undefined> {
  const rows = await selectMany(client, sql, parameters, decode)
  return rows[0]
}

async function selectMany<A>(
  client: PostgresQueryClient,
  sql: string,
  parameters: readonly unknown[],
  decode: (row: Record<string, unknown>) => A,
): Promise<readonly A[]> {
  const result = await client.query(sql, parameters)
  return result.rows.map(decode)
}

const recipeRecordFromRow = (row: Record<string, unknown>): RecipeRecord => ({
  recipeId: stringCell(row, "recipe_id"),
  kind: recipeKindCell(row, "recipe_kind"),
  ...optionalStringField(row, "project_id", "projectId"),
  ...optionalStringField(row, "title", "title"),
  ...optionalStringField(row, "nx_target", "nxTarget"),
  ...optionalStringField(row, "source_path", "sourcePath"),
  ...optionalStringField(row, "resource_kind", "resourceKind"),
  humanReviewRequired: booleanCell(row, "human_review_required"),
})

const ioFromRow = (row: Record<string, unknown>): RecipeIo => ({
  id: stringCell(row, "io_id"),
  recipeId: stringCell(row, "recipe_id"),
  role: stringCell(row, "io_role") as RecipeIo["role"],
  name: stringCell(row, "name"),
  ...optionalStringField(row, "schema_name", "schemaName"),
  ...optionalStringField(row, "content_hash", "hash"),
  ...optionalUnknownField(row, "payload", "payload"),
})

const runFromRow = (row: Record<string, unknown>): RecipeRun => ({
  runId: stringCell(row, "run_id"),
  recipeId: stringCell(row, "recipe_id"),
  ...optionalLifecycleActionField(row),
  status: stringCell(row, "run_status") as RecipeRun["status"],
  startedAt: stringCell(row, "started_at"),
  ...optionalStringField(row, "completed_at", "completedAt"),
  ...optionalStringField(row, "input_hash", "inputHash"),
  ...optionalStringField(row, "output_hash", "outputHash"),
})

const receiptFromRow = (row: Record<string, unknown>): RecipeReceipt => ({
  receiptId: stringCell(row, "receipt_id"),
  recipeId: stringCell(row, "recipe_id"),
  runId: stringCell(row, "run_id"),
  status: stringCell(row, "receipt_status") as RecipeReceipt["status"],
  startedAt: stringCell(row, "started_at"),
  ...optionalStringField(row, "completed_at", "completedAt"),
  ...optionalStringField(row, "command", "command"),
  ...optionalStringField(row, "stdout_summary", "stdoutSummary"),
  ...optionalStringField(row, "stderr_summary", "stderrSummary"),
  ...optionalStringField(row, "output_hash", "outputHash"),
  validationEvidence: arrayCell(row, "validation_evidence"),
  ...optionalUnknownField(row, "payload", "payload"),
})

const observationFromRow = (row: Record<string, unknown>): RecipeObservation => ({
  observationId: stringCell(row, "observation_id"),
  recipeId: stringCell(row, "recipe_id"),
  ...optionalStringField(row, "run_id", "runId"),
  ...optionalStringField(row, "receipt_id", "receiptId"),
  observationKind: stringCell(row, "observation_kind"),
  observedAt: stringCell(row, "observed_at"),
  ...optionalStringField(row, "source", "source"),
  payload: requiredUnknownCell(row, "payload"),
})

const diagnosticFromRow = (row: Record<string, unknown>): RecipeDiagnostic => ({
  diagnosticId: stringCell(row, "diagnostic_id"),
  recipeId: stringCell(row, "recipe_id"),
  code: stringCell(row, "code"),
  severity: stringCell(row, "severity") as RecipeDiagnostic["severity"],
  message: stringCell(row, "message"),
  ...optionalStringField(row, "source_path", "sourcePath"),
  ...optionalStringField(row, "receipt_id", "receiptId"),
  ...(row["range_start"] === null || row["range_start"] === undefined
    ? {}
    : { range: { start: numberCell(row, "range_start"), end: numberCell(row, "range_end") } }),
  ...optionalUnknownField(row, "cause", "cause"),
})

const repairFromRow = (row: Record<string, unknown>): RecipeRepair => ({
  repairId: stringCell(row, "repair_id"),
  recipeId: stringCell(row, "recipe_id"),
  ...optionalStringField(row, "diagnostic_id", "diagnosticId"),
  title: stringCell(row, "title"),
  kind: stringCell(row, "repair_kind") as RecipeRepair["kind"],
  ...optionalStringField(row, "nx_target", "nxTarget"),
  allowedFiles: arrayCell(row, "allowed_files"),
  risk: stringCell(row, "risk") as RecipeRepair["risk"],
  evidenceRequirements: arrayCell(row, "evidence_requirements"),
  ...optionalUnknownField(row, "payload", "payload"),
})

const healthFromRow = (row: Record<string, unknown>): RecipeHealth => ({
  recipeId: stringCell(row, "recipe_id"),
  status: stringCell(row, "health_status") as RecipeHealth["status"],
  explanation: `Recipe ${stringCell(row, "recipe_id")} health is ${stringCell(row, "health_status")}.`,
  ...optionalStringField(row, "checked_at", "checkedAt"),
  receiptIds: row["latest_receipt_id"] === null || row["latest_receipt_id"] === undefined
    ? []
    : [stringCell(row, "latest_receipt_id")],
  diagnosticIds: [],
  repairIds: [],
})

const recipeKindCell = (
  row: Record<string, unknown>,
  key: string,
): RecipeRecord["kind"] =>
  stringCell(row, key) === "managed-recipe" ? "managed-recipe" : "recipe"

const stringCell = (row: Record<string, unknown>, key: string): string => {
  const value = row[key]
  if (value instanceof Date) return value.toISOString()
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  throw new TypeError(`Expected string-compatible Postgres cell ${key}.`)
}

const numberCell = (row: Record<string, unknown>, key: string): number => {
  const value = row[key]
  if (typeof value === "number") return value
  if (typeof value === "string") return Number(value)
  throw new TypeError(`Expected numeric Postgres cell ${key}.`)
}

const booleanCell = (row: Record<string, unknown>, key: string): boolean =>
  row[key] === true

const arrayCell = (row: Record<string, unknown>, key: string): readonly string[] => {
  const value = row[key]
  if (Array.isArray(value)) return value.map(String)
  return []
}

const optionalStringField = <Key extends string>(
  row: Record<string, unknown>,
  sourceKey: string,
  targetKey: Key,
): Partial<Record<Key, string>> => {
  const value = row[sourceKey]
  if (value === null || value === undefined) return {}
  return { [targetKey]: stringCell(row, sourceKey) } as Partial<Record<Key, string>>
}

const optionalUnknownField = <Key extends string>(
  row: Record<string, unknown>,
  sourceKey: string,
  targetKey: Key,
): Partial<Record<Key, unknown>> => {
  const value = row[sourceKey]
  if (value === null || value === undefined) return {}
  return { [targetKey]: value } as Partial<Record<Key, unknown>>
}

const requiredUnknownCell = (row: Record<string, unknown>, key: string): unknown => {
  if (!(key in row)) throw new TypeError(`Expected Postgres cell ${key}.`)
  return row[key]
}

const json = (value: unknown): string | null =>
  value === undefined ? null : JSON.stringify(value)

const jsonRequired = (value: unknown): string =>
  JSON.stringify(value === undefined ? null : value)

const optionalLifecycleActionField = (
  row: Record<string, unknown>,
): Pick<RecipeRun, "action"> | {} => {
  const value = row["lifecycle_action"]
  if (value === null || value === undefined) return {}
  return { action: stringCell(row, "lifecycle_action") as RecipeRun["action"] }
}

const postgresRecipeReceiptStoreRecipeId =
  "framework-runtime.postgres-recipe-receipt-store" as const
const postgresRecipeReceiptStoreSourcePath =
  "packages/trellis/runtime/src/PostgresRecipeReceiptStore.ts" as const

export const PostgresRecipeReceiptStoreContractInputSchema = Schema.Struct({
  databaseUrlEnv: Schema.optional(Schema.String),
  schemaRoot: Schema.Literal("framework_event"),
})
export type PostgresRecipeReceiptStoreContractInput =
  typeof PostgresRecipeReceiptStoreContractInputSchema.Type

export const PostgresRecipeReceiptStoreContractOutputSchema = Schema.Struct({
  storeFactory: Schema.Literal("createPostgresRecipeReceiptStore"),
  writeStatementCount: Schema.Number,
  readStatementCount: Schema.Number,
  snapshotSupported: Schema.Boolean,
  receiptStoreSnapshotSchema: Schema.Literal("RecipeReceiptStoreSnapshotSchema"),
})
export type PostgresRecipeReceiptStoreContractOutput =
  typeof PostgresRecipeReceiptStoreContractOutputSchema.Type

// @attune-packet-target generated-runtime-projection eligible
export const PostgresRecipeReceiptStoreDatabaseResource = defineAlchemyResource({
  id: "framework-runtime.postgres-recipe-receipt-store.database",
  kind: "database",
  alchemyType: "attune:resource:PostgresRecipeReceiptStore",
  ownerRecipeId: postgresRecipeReceiptStoreRecipeId,
  producedBy: [postgresRecipeReceiptStoreRecipeId],
  consumedBy: [postgresRecipeReceiptStoreRecipeId],
  addressFields: ["databaseUrlEnv", "schemaRoot"],
  addressSchema: PostgresRecipeReceiptStoreContractInputSchema as never,
  stateSchema: RecipeReceiptStoreSnapshotSchema as never,
  modes: ["read", "write", "observe", "check"],
  programmaticResourceExport: "PostgresRecipeReceiptStoreContractLive",
  programmaticBridgeSourcePath: postgresRecipeReceiptStoreSourcePath,
})

// @attune-packet-target generated-runtime-projection eligible
export const PostgresRecipeReceiptStoreContractResource = defineAlchemyResource({
  id: "framework-runtime.postgres-recipe-receipt-store.contract",
  kind: "report",
  alchemyType: "attune:resource:PostgresRecipeReceiptStoreContract",
  ownerRecipeId: postgresRecipeReceiptStoreRecipeId,
  producedBy: [postgresRecipeReceiptStoreRecipeId],
  consumedBy: [postgresRecipeReceiptStoreRecipeId],
  addressFields: ["storeFactory", "writeStatementCount", "readStatementCount"],
  addressSchema: PostgresRecipeReceiptStoreContractOutputSchema as never,
  stateSchema: PostgresRecipeReceiptStoreContractOutputSchema as never,
  modes: ["read", "observe", "project"],
  programmaticResourceExport: "PostgresRecipeReceiptStoreContractLive",
  programmaticBridgeSourcePath: postgresRecipeReceiptStoreSourcePath,
})

export interface PostgresRecipeReceiptStoreContractService {
  readonly describe: (
    input: PostgresRecipeReceiptStoreContractInput,
  ) => Effect.Effect<PostgresRecipeReceiptStoreContractOutput>
}

export class PostgresRecipeReceiptStoreContract extends Context.Service<
  PostgresRecipeReceiptStoreContract,
  PostgresRecipeReceiptStoreContractService
>()("@attune/framework-runtime/PostgresRecipeReceiptStoreContract") {}

const postgresReceiptStoreWriteStatements = [
  recipeUpsertSql,
  recipeEdgeUpsertSql,
  ioUpsertSql,
  runUpsertSql,
  receiptUpsertSql,
  observationUpsertSql,
  diagnosticUpsertSql,
  repairUpsertSql,
  healthUpsertSql,
] as const

const postgresReceiptStoreReadStatements = [
  recipeSelectSql,
  receiptsForRecipeSql,
  runsForRecipeSql,
  observationsForRecipeSql,
  healthForRecipeSql,
  diagnosticsForRecipeSql,
  repairsForRecipeSql,
  receiptByIdSql,
  receiptsByStatusSql,
  observationsForRunSql,
  observationsForReceiptSql,
  observationsByKindSql,
  latestReceiptSql,
  recipeSnapshotSql,
  edgeSnapshotSql,
  ioSnapshotSql,
  runSnapshotSql,
  receiptSnapshotSql,
  observationSnapshotSql,
  diagnosticSnapshotSql,
  repairSnapshotSql,
  healthSnapshotSql,
] as const

export const postgresRecipeReceiptStoreContractOutput =
  (): PostgresRecipeReceiptStoreContractOutput => ({
    storeFactory: "createPostgresRecipeReceiptStore",
    writeStatementCount: postgresReceiptStoreWriteStatements.length,
    readStatementCount: postgresReceiptStoreReadStatements.length,
    snapshotSupported: true,
    receiptStoreSnapshotSchema: "RecipeReceiptStoreSnapshotSchema",
  })

export const PostgresRecipeReceiptStoreContractLive = Layer.succeed(
  PostgresRecipeReceiptStoreContract,
  {
    describe: (_input: PostgresRecipeReceiptStoreContractInput) =>
      Effect.succeed(postgresRecipeReceiptStoreContractOutput()),
  },
)

export const PostgresRecipeReceiptStoreContractLayer = defineRecipeLayer({
  id: "framework-runtime.postgres-recipe-receipt-store.layer",
  sourcePath: postgresRecipeReceiptStoreSourcePath,
  exportName: "PostgresRecipeReceiptStoreContractLive",
  layer: PostgresRecipeReceiptStoreContractLive as never,
  provides: [{
    id: "framework-runtime.postgres-recipe-receipt-store.service",
    service: PostgresRecipeReceiptStoreContract as never,
  }],
})

export const describePostgresRecipeReceiptStore = (
  input: PostgresRecipeReceiptStoreContractInput,
): Effect.Effect<PostgresRecipeReceiptStoreContractOutput, never, PostgresRecipeReceiptStoreContract> =>
  Effect.gen(function* describePostgresRecipeReceiptStoreBody() {
    const contract = yield* PostgresRecipeReceiptStoreContract
    return yield* contract.describe(input)
  })

export const PostgresRecipeReceiptStoreHandler = defineRecipeHandler<
  PostgresRecipeReceiptStoreContractInput,
  PostgresRecipeReceiptStoreContractOutput,
  never,
  PostgresRecipeReceiptStoreContract
>({
  id: "framework-runtime.postgres-recipe-receipt-store.handler",
  recipeId: postgresRecipeReceiptStoreRecipeId,
  sourcePath: postgresRecipeReceiptStoreSourcePath,
  exportName: "describePostgresRecipeReceiptStore",
  layer: PostgresRecipeReceiptStoreContractLayer,
  emitsReceipts: ["framework-runtime.postgres-recipe-receipt-store.described"],
  handler: (input) => describePostgresRecipeReceiptStore(input) as never,
})

export const PostgresRecipeReceiptStoreRecipe = defineObservationRecipe({
  id: postgresRecipeReceiptStoreRecipeId,
  projectId: "framework-runtime",
  title: "Describe durable Postgres recipe receipt store operations",
  inputSchema: PostgresRecipeReceiptStoreContractInputSchema,
  outputSchema: PostgresRecipeReceiptStoreContractOutputSchema,
  nxTarget: "framework-runtime:test",
  allowedFiles: [postgresRecipeReceiptStoreSourcePath],
  validationEvidence: ["framework-runtime:typecheck", "framework-runtime:test"],
  io: {
    inputSchema: PostgresRecipeReceiptStoreContractInputSchema,
    outputSchema: PostgresRecipeReceiptStoreContractOutputSchema,
    inputResources: [PostgresRecipeReceiptStoreDatabaseResource],
    outputResources: [PostgresRecipeReceiptStoreContractResource],
  },
  handler: PostgresRecipeReceiptStoreHandler,
  alchemyDag: [{
    fromRecipeId: postgresRecipeReceiptStoreRecipeId,
    toRecipeId: "framework-runtime.receipt-store-summary",
    resource: PostgresRecipeReceiptStoreContractResource,
    kind: "observes",
    modes: ["read", "observe", "project"],
  }],
})

export const PostgresRecipeReceiptStoreRecipes = [
  PostgresRecipeReceiptStoreRecipe,
] as const
