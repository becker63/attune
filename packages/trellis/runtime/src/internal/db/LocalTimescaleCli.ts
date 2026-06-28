import { spawnSync } from "node:child_process"
import { mkdirSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import {
  frameworkRecipeReceiptKanelConfig,
  frameworkRecipeReceiptSafeQlConfig,
  frameworkRecipeReceiptSqlValidationStatements,
  frameworkRecipeReceiptTables,
  readFrameworkRecipeReceiptMigration,
  validateFrameworkRecipeReceiptStatements,
  validateFrameworkRecipeReceiptSql,
} from "../../SqlRoute.js"

let stage = "unknown"

export function runLocalTimescaleCli(argv: readonly string[] = process.argv.slice(2)): void {
  const requestedStage = argv[0]

  if (requestedStage === undefined) {
    throw new Error(
      "Expected db lifecycle stage: plan, apply, check, stop, destroy, prune, migrate, generate-types, validate-sql, or integration-test.",
    )
  }

  stage = requestedStage

  switch (stage) {
    case "plan": {
      console.log(JSON.stringify({
        stage,
        managedRecipe: "framework-runtime.local-timescaledb",
        lifecycle: ["plan", "apply", "check", "migrate", "validate-sql", "stop", "destroy", "prune"],
        serviceClosure: localTimescale,
        genericTables: frameworkRecipeReceiptTables,
      }))
      break
    }
    case "apply": {
      console.log(JSON.stringify(applyLiveDatabase()))
      break
    }
    case "check": {
      console.log(JSON.stringify(checkLiveDatabase()))
      break
    }
    case "stop": {
      console.log(JSON.stringify(stopLiveDatabase()))
      break
    }
    case "destroy": {
      console.log(JSON.stringify(destroyLiveDatabase("destroy")))
      break
    }
    case "prune": {
      console.log(JSON.stringify(destroyLiveDatabase("prune")))
      break
    }
    case "migrate": {
      const sql = readFrameworkRecipeReceiptMigration(workspaceRoot())
      const diagnostics = validateFrameworkRecipeReceiptSql(sql)
      if (diagnostics.length > 0) throw new Error(diagnostics.join("\n"))
      const integration = integrationEnabled()
        ? applyMigrationAgainstLiveDb()
        : "skipped; set ATTUNE_RUN_DB_INTEGRATION=1 for live apply"
      console.log(JSON.stringify({
        stage,
        migration: "packages/trellis/runtime/sql/0001_framework_recipe_receipt_spine.sql",
        integration,
      }))
      break
    }
    case "generate-types": {
      const diagnostics = validateStaticSqlRoute()
      if (diagnostics.length > 0) throw new Error(diagnostics.join("\n"))
      const generation = integrationEnabled()
        ? generateKyselyTypesFromLiveDb()
        : {
          generated: false,
          integration:
            `skipped; set ${localTimescale.integrationGuard} to generate from live Postgres metadata`,
        }
      console.log(JSON.stringify({
        stage,
        generator: "Kanel",
        config: frameworkRecipeReceiptKanelConfig(),
        generatedTypes: generation,
      }))
      break
    }
    case "validate-sql": {
      const diagnostics = validateStaticSqlRoute()
      if (diagnostics.length > 0) throw new Error(diagnostics.join("\n"))
      const integration = integrationEnabled()
        ? validateSqlAgainstLiveDb()
        : "static migration/statement validation"
      console.log(JSON.stringify({
        stage,
        validator: "SafeQL",
        config: frameworkRecipeReceiptSafeQlConfig(),
        integration,
      }))
      break
    }
    case "integration-test": {
      const diagnostics = validateStaticSqlRoute()
      if (diagnostics.length > 0) throw new Error(diagnostics.join("\n"))
      if (!integrationEnabled()) {
        console.log(JSON.stringify(skippedLive("integration-test")))
        break
      }
      let apply: Record<string, unknown> | undefined
      let check: Record<string, unknown> | undefined
      let generatedTypes: Record<string, unknown> | undefined
      let sqlValidation: Record<string, unknown> | undefined
      let destroy: Record<string, unknown> | undefined
      let prune: Record<string, unknown> | undefined

      try {
        apply = applyLiveDatabase()
        check = checkLiveDatabase()
        generatedTypes = generateKyselyTypesFromLiveDb()
        sqlValidation = validateSqlAgainstLiveDb()
      } finally {
        destroy = destroyLiveDatabase("destroy")
        prune = destroyLiveDatabase("prune")
      }

      console.log(JSON.stringify({
        stage,
        managedRecipe: "framework-runtime.local-timescaledb",
        guard: localTimescale.integrationGuard,
        lifecycle: ["plan", "apply", "check", "migrate", "validate-sql", "stop", "destroy", "prune"],
        apply,
        check,
        generatedTypes,
        sqlValidation,
        destroy,
        prune,
      }))
      break
    }
    default:
      throw new Error(`Unsupported db lifecycle stage: ${stage}`)
  }
}

const localTimescale = {
  composeFile: "nix/compose/local-timescaledb.arion.nix",
  imageAttr: ".#local-timescaledb-image",
  dataDir: process.env["ATTUNE_LOCAL_RECIPE_STORE_DATA_DIR"] ?? `${workspaceRoot()}/.attune/state/local-timescaledb`,
  port: Number(process.env["ATTUNE_RECIPE_STORE_PORT"] ?? "54329"),
  databaseUrl: process.env["ATTUNE_RECIPE_STORE_URL"]
    ?? process.env["DATABASE_URL"]
    ?? "postgresql://attune@127.0.0.1:54329/postgres",
  storeMode: process.env["ATTUNE_RECIPE_STORE_MODE"] ?? "local-postgres",
  integrationGuard: "ATTUNE_RUN_DB_INTEGRATION=1",
} as const

function workspaceRoot(): string {
  return new URL("../../../../../..", import.meta.url).pathname.replace(/\/$/, "")
}

function integrationEnabled(): boolean {
  return process.env["ATTUNE_RUN_DB_INTEGRATION"] === "1"
}

function validateStaticSqlRoute(): readonly string[] {
  const sql = readFrameworkRecipeReceiptMigration(workspaceRoot())
  return [
    ...validateFrameworkRecipeReceiptSql(sql),
    ...validateFrameworkRecipeReceiptStatements(),
  ]
}

function applyLiveDatabase(): Record<string, unknown> {
  if (!integrationEnabled()) return skippedLive("apply")

  ensureLiveDatabase()
  const migration = applyMigrationAgainstLiveDb()
  const verification = verifyGenericSpine()
  return {
    stage,
    managedRecipe: "framework-runtime.local-timescaledb",
    action: "apply",
    serviceClosure: localTimescale,
    migration,
    verification,
  }
}

function checkLiveDatabase(): Record<string, unknown> {
  if (!integrationEnabled()) return skippedLive("check")

  ensureLiveDatabase()
  return {
    stage,
    managedRecipe: "framework-runtime.local-timescaledb",
    action: "check",
    serviceClosure: localTimescale,
    readiness: runPsqlScalar("SELECT 1"),
    verification: verifyGenericSpine(),
  }
}

function destroyLiveDatabase(action: "destroy" | "prune"): Record<string, unknown> {
  if (!integrationEnabled()) return skippedLive(action)

  runNixDevelop(["arion", "-f", localTimescale.composeFile, "down"])
  return {
    stage,
    managedRecipe: "framework-runtime.local-timescaledb",
    action,
    serviceClosure: localTimescale,
    destroyed: true,
    pruned: action === "prune",
  }
}

function stopLiveDatabase(): Record<string, unknown> {
  if (!integrationEnabled()) return skippedLive("stop")

  runNixDevelop(["arion", "-f", localTimescale.composeFile, "down"])
  return {
    stage,
    managedRecipe: "framework-runtime.local-timescaledb",
    action: "stop",
    serviceClosure: localTimescale,
    stopped: true,
    pruned: false,
  }
}

function skippedLive(action: string): Record<string, unknown> {
  return {
    stage,
    managedRecipe: "framework-runtime.local-timescaledb",
    action,
    integration: `skipped; set ${localTimescale.integrationGuard} for live TimescaleDB/Postgres lifecycle`,
    serviceClosure: localTimescale,
  }
}

function applyMigrationAgainstLiveDb(): Record<string, unknown> {
  ensureLiveDatabase()
  runNixDevelop([
    "psql",
    localTimescale.databaseUrl,
    "-v",
    "ON_ERROR_STOP=1",
    "-f",
    "packages/trellis/runtime/sql/0001_framework_recipe_receipt_spine.sql",
  ])
  return {
    applied: true,
    path: "packages/trellis/runtime/sql/0001_framework_recipe_receipt_spine.sql",
  }
}

function generateKyselyTypesFromLiveDb(): Record<string, unknown> {
  ensureLiveDatabase()
  applyMigrationAgainstLiveDb()

  const config = frameworkRecipeReceiptKanelConfig()
  const kanel = runKanelFromLiveDb()
  const columns = runPsqlJson<readonly CatalogColumn[]>(`
SELECT COALESCE(json_agg(row_to_json(metadata)), '[]'::json)
FROM (
  SELECT
    namespace.nspname AS schema_name,
    class.relname AS table_name,
    CASE class.relkind
      WHEN 'v' THEN 'view'
      WHEN 'm' THEN 'materialized-view'
      ELSE 'table'
    END AS relation_kind,
    attribute.attnum AS ordinal_position,
    attribute.attname AS column_name,
    format_type(attribute.atttypid, attribute.atttypmod) AS data_type,
    attribute.attnotnull AS not_null,
    pg_get_expr(attribute_default.adbin, attribute_default.adrelid) AS column_default
  FROM pg_class class
  JOIN pg_namespace namespace ON namespace.oid = class.relnamespace
  JOIN pg_attribute attribute ON attribute.attrelid = class.oid
  LEFT JOIN pg_attrdef attribute_default
    ON attribute_default.adrelid = class.oid
    AND attribute_default.adnum = attribute.attnum
  WHERE namespace.nspname IN ('framework_core', 'framework_event', 'framework_view')
    AND class.relkind IN ('r', 'p', 'v', 'm')
    AND attribute.attnum > 0
    AND NOT attribute.attisdropped
  ORDER BY namespace.nspname, class.relname, attribute.attnum
) metadata
`)
  const artifact = renderKyselyDatabaseArtifact(columns)
  writeWorkspaceFile(config.kyselyOutputPath, artifact)

  return {
    generated: true,
    source: "live-postgres-catalog",
    generator: "Kanel plus Kysely catalog projection",
    toolchain: sqlToolchainEvidence(),
    kanel,
    artifact: config.kyselyOutputPath,
    relations: relationNames(columns).length,
    columns: columns.length,
  }
}

function validateSqlAgainstLiveDb(): Record<string, unknown> {
  ensureLiveDatabase()
  const migration = applyMigrationAgainstLiveDb()
  const verification = verifyGenericSpine()
  const safeql = validateSafeQlAgainstLiveDb()
  const statements = frameworkRecipeReceiptSqlValidationStatements()
  const prepared = statements.map((statement, index) => {
    const preparedName = `attune_recipe_sql_validation_${index}`
    runPsqlScalar([
      `PREPARE ${preparedName} AS ${statement.sql}`,
      `EXPLAIN EXECUTE ${preparedName}(${statement.parameters.map(sqlLiteral).join(", ")})`,
      `DEALLOCATE ${preparedName}`,
    ].join(";\n"))
    return statement.name
  })

  return {
    migration,
    verification,
    validator: "SafeQL ESLint check-sql plus live PREPARE/EXPLAIN",
    toolchain: sqlToolchainEvidence(),
    safeql,
    preparedStatements: prepared,
  }
}

function runKanelFromLiveDb(): Record<string, unknown> {
  const config = frameworkRecipeReceiptKanelConfig()
  const kanelConfigPath = ".attune/cache/generated/framework-runtime/db/kanel.config.cjs"
  const kanelOutputPath = `${config.outputPath}/raw`
  writeWorkspaceFile(kanelConfigPath, [
    "module.exports = {",
    `  connection: process.env.DATABASE_URL ?? ${JSON.stringify(localTimescale.databaseUrl)},`,
    `  schemas: ${JSON.stringify(config.schemas)},`,
    `  outputPath: ${JSON.stringify(kanelOutputPath)},`,
    "  preDeleteOutputFolder: true,",
    "  resolveViews: true,",
    "  enumStyle: \"type\",",
    "  tsModuleFormat: \"explicit-esm\",",
    "}",
    "",
  ].join("\n"))
  const stdout = runWorkspaceCommand(["node_modules/.bin/kanel", "-c", kanelConfigPath], {
    DATABASE_URL: localTimescale.databaseUrl,
  })

  return {
    generator: "Kanel",
    version: packageVersion("kanel"),
    configPath: kanelConfigPath,
    outputPath: kanelOutputPath,
    stdoutSummary: lastNonEmptyLine(stdout),
  }
}

function validateSafeQlAgainstLiveDb(): Record<string, unknown> {
  const safeqlDir = ".attune/cache/generated/framework-runtime/db/safeql"
  const sqlSourcePath = `${safeqlDir}/framework-recipe-receipt.safeql.js`
  const runnerPath = `${safeqlDir}/run-safeql.mjs`

  writeWorkspaceFile(sqlSourcePath, [
    "const sql = (strings, ...values) => ({ strings, values })",
    "const recipeId = \"framework-runtime.local-timescaledb\"",
    "const status = \"passed\"",
    "export const recipeHealth = sql`SELECT * FROM framework_view.recipe_health WHERE recipe_id = ${recipeId}`",
    "export const receiptsByStatus = sql`SELECT * FROM framework_event.recipe_receipt WHERE receipt_status = ${status}`",
    "export const receiptMetrics = sql`SELECT * FROM framework_event.recipe_receipt_metric WHERE recipe_id = ${recipeId}`",
    "export const recipeObservations = sql`SELECT * FROM framework_event.recipe_observation WHERE recipe_id = ${recipeId} ORDER BY observed_at DESC`",
    "",
  ].join("\n"))
  writeWorkspaceFile(runnerPath, [
    "import { ESLint } from \"eslint\"",
    "import safeql from \"@ts-safeql/eslint-plugin/config\"",
    "",
    `const sourcePath = ${JSON.stringify(sqlSourcePath)}`,
    "const safeqlConfig = safeql.configs.connections([{",
    "  databaseUrl: process.env.DATABASE_URL,",
    "  targets: [{ tag: \"sql\", skipTypeAnnotations: true }],",
    "}])",
    "const eslint = new ESLint({",
    "  cwd: process.cwd(),",
    "  overrideConfigFile: true,",
    "  overrideConfig: [{",
    "    files: [sourcePath],",
    "    languageOptions: { ecmaVersion: 2023, sourceType: \"module\" },",
    "    ...safeqlConfig,",
    "  }],",
    "})",
    "const results = await eslint.lintFiles([sourcePath])",
    "const messages = results.flatMap((result) => result.messages.map((message) => ({",
    "  ruleId: message.ruleId,",
    "  message: message.message,",
    "  line: message.line,",
    "  column: message.column,",
    "})))",
    "if (messages.length > 0) {",
    "  console.error(JSON.stringify(messages, null, 2))",
    "  process.exit(1)",
    "}",
    "console.log(JSON.stringify({ checkedFiles: results.length, messages: 0 }))",
    "",
  ].join("\n"))

  const stdout = runWorkspaceCommand(["node", runnerPath], {
    DATABASE_URL: localTimescale.databaseUrl,
  })

  return {
    validator: "@ts-safeql/eslint-plugin check-sql",
    version: packageVersion("@ts-safeql/eslint-plugin"),
    sourcePath: sqlSourcePath,
    result: JSON.parse(lastNonEmptyLine(stdout)) as unknown,
  }
}

function verifyGenericSpine(): Record<string, unknown> {
  const missingTables = frameworkRecipeReceiptTables.filter((table) =>
    runPsqlScalar(`SELECT to_regclass('${table}') IS NOT NULL`) !== "t"
  )
  const extension = runPsqlScalar("SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb')")
  const hypertableCount = runPsqlScalar(`
SELECT count(*)
FROM timescaledb_information.hypertables
WHERE hypertable_schema = 'framework_event'
  AND hypertable_name = 'recipe_receipt_metric'
`)

  if (missingTables.length > 0) {
    throw new Error(`Missing generic recipe spine tables: ${missingTables.join(", ")}`)
  }
  if (extension !== "t") {
    throw new Error("TimescaleDB extension is not installed in the live database.")
  }
  if (hypertableCount !== "1") {
    throw new Error("framework_event.recipe_receipt_metric is not a Timescale hypertable.")
  }

  return {
    genericTables: frameworkRecipeReceiptTables.length,
    timescaleExtension: true,
    hypertable: "framework_event.recipe_receipt_metric",
  }
}

function waitForPostgres(): void {
  const attempts = 30
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      if (runPsqlScalar("SELECT 1") === "1") return
    } catch (error) {
      if (attempt === attempts) throw error
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000)
  }
}

function ensureLiveDatabase(): void {
  runNixDevelop(["arion", "-f", localTimescale.composeFile, "up", "-d"])
  waitForPostgres()
}

function runPsqlScalar(sql: string): string {
  return lastNonEmptyLine(runNixDevelop([
    "psql",
    localTimescale.databaseUrl,
    "-v",
    "ON_ERROR_STOP=1",
    "-At",
    "-c",
    sql,
  ]))
}

function runPsqlJson<A>(sql: string): A {
  return JSON.parse(runPsqlScalar(sql)) as A
}

function lastNonEmptyLine(value: string): string {
  return value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .at(-1) ?? ""
}

interface CatalogColumn {
  readonly schema_name: string
  readonly table_name: string
  readonly relation_kind: "table" | "view" | "materialized-view"
  readonly ordinal_position: number
  readonly column_name: string
  readonly data_type: string
  readonly not_null: boolean
  readonly column_default: string | null
}

function renderKyselyDatabaseArtifact(columns: readonly CatalogColumn[]): string {
  const relations = new Map<string, CatalogColumn[]>()
  for (const column of columns) {
    const key = `${column.schema_name}.${column.table_name}`
    relations.set(key, [...relations.get(key) ?? [], column])
  }

  return [
    "/* eslint-disable */",
    "// Generated by framework-runtime:db:generate-types from live Postgres metadata.",
    "// Cache-only artifact; rerun with ATTUNE_RUN_DB_INTEGRATION=1 after schema changes.",
    "",
    "export type Generated<T> = T;",
    "export type Timestamp = string;",
    "export type Json = unknown;",
    "",
    "export interface FrameworkRecipeReceiptDatabase {",
    ...Array.from(relations.entries()).flatMap(([relationName, relationColumns]) => [
      `  readonly ${JSON.stringify(relationName)}: {`,
      ...relationColumns.map((column) =>
        `    readonly ${column.column_name}: ${columnType(column)};`
      ),
      "  };",
    ]),
    "}",
    "",
  ].join("\n")
}

function columnType(column: CatalogColumn): string {
  const baseType = postgresTypeToTypescript(column.data_type)
  const generatedType = column.column_default === null ? baseType : `Generated<${baseType}>`
  return column.not_null ? generatedType : `${generatedType} | null`
}

function postgresTypeToTypescript(dataType: string): string {
  if (dataType.endsWith("[]")) {
    return `readonly ${postgresTypeToTypescript(dataType.slice(0, -2))}[]`
  }

  switch (dataType) {
    case "bigint":
    case "double precision":
    case "integer":
    case "numeric":
    case "real":
    case "smallint":
      return "number"
    case "boolean":
      return "boolean"
    case "json":
    case "jsonb":
      return "Json"
    case "timestamp with time zone":
    case "timestamp without time zone":
      return "Timestamp"
    case "text":
    case "uuid":
      return "string"
    default:
      return "unknown"
  }
}

function relationNames(columns: readonly CatalogColumn[]): readonly string[] {
  return Array.from(new Set(columns.map((column) =>
    `${column.schema_name}.${column.table_name}`
  )))
}

function writeWorkspaceFile(path: string, contents: string): void {
  const absolutePath = `${workspaceRoot()}/${path}`
  mkdirSync(absolutePath.slice(0, absolutePath.lastIndexOf("/")), { recursive: true })
  writeFileSync(absolutePath, contents, "utf8")
}

function sqlLiteral(value: unknown): string {
  if (typeof value === "number") return String(value)
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE"
  if (value === null) return "NULL"
  if (typeof value === "object") return `'${JSON.stringify(value).replaceAll("'", "''")}'`
  return `'${String(value).replaceAll("'", "''")}'`
}

function sqlToolchainEvidence(): Record<string, unknown> {
  const safeqlProbe = runWorkspaceCommand([
    "node",
    "-e",
    "import('@ts-safeql/eslint-plugin').then((m) => { if (!m.rules?.['check-sql']) process.exit(1); console.log('check-sql') })",
  ])

  return {
    kanel: {
      package: "kanel",
      version: packageVersion("kanel"),
      cli: lastNonEmptyLine(runWorkspaceCommand(["node_modules/.bin/kanel", "--version"])),
    },
    kysely: {
      package: "kysely",
      version: packageVersion("kysely"),
    },
    safeql: {
      package: "@ts-safeql/eslint-plugin",
      version: packageVersion("@ts-safeql/eslint-plugin"),
      rule: lastNonEmptyLine(safeqlProbe),
    },
    libpgQuery: {
      package: "libpg-query",
      version: packageVersion("libpg-query"),
    },
    pg: {
      package: "pg",
      version: packageVersion("pg"),
    },
  }
}

function packageVersion(packageName: string): string {
  return lastNonEmptyLine(runWorkspaceCommand([
    "node",
    "-p",
    `require(${JSON.stringify(`./node_modules/${packageName}/package.json`)}).version`,
  ]))
}

function runWorkspaceCommand(
  args: readonly string[],
  env: Readonly<Record<string, string>> = {},
): string {
  const [command, ...commandArgs] = args
  if (command === undefined) throw new Error("Expected command")
  const result = spawnSync(command, commandArgs, {
    cwd: workspaceRoot(),
    env: {
      ...process.env,
      ...env,
    },
    encoding: "utf8",
    timeout: 120_000,
  })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    throw new Error([
      `Command failed: ${args.join(" ")}`,
      result.stdout.trim(),
      result.stderr.trim(),
    ].filter((line) => line.length > 0).join("\n"))
  }
  return result.stdout
}

function runNixDevelop(args: readonly string[]): string {
  const result = spawnSync("nix", ["develop", "--command", ...args], {
    cwd: workspaceRoot(),
    env: {
      ...process.env,
      DATABASE_URL: localTimescale.databaseUrl,
      ATTUNE_RECIPE_STORE_URL: localTimescale.databaseUrl,
      ATTUNE_LOCAL_RECIPE_STORE_DATA_DIR: localTimescale.dataDir,
      ATTUNE_RECIPE_STORE_MODE: localTimescale.storeMode,
    },
    encoding: "utf8",
    timeout: 120_000,
  })
  if (result.error !== undefined) throw result.error
  if (result.status !== 0) {
    throw new Error([
      `Command failed: nix develop --command ${args.join(" ")}`,
      result.stdout.trim(),
      result.stderr.trim(),
    ].filter((line) => line.length > 0).join("\n"))
  }
  return result.stdout
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runLocalTimescaleCli(process.argv.slice(2))
}
