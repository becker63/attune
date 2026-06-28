import { readFileSync } from "node:fs"

export const frameworkRecipeReceiptMigrationPath =
  "packages/trellis/runtime/sql/0001_framework_recipe_receipt_spine.sql" as const

export const frameworkRecipeReceiptTables = [
  "framework_core.recipe",
  "framework_core.recipe_edge",
  "framework_core.recipe_io",
  "framework_event.recipe_run",
  "framework_event.recipe_receipt",
  "framework_event.recipe_receipt_metric",
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
  readonly latestReceipt: (recipeId: string) => FrameworkSqlStatement
  readonly receiptsByStatus: (
    status: FrameworkRecipeReceiptStatus,
  ) => FrameworkSqlStatement
}

export const frameworkRecipeReceiptKanelConfig =
  (): FrameworkRecipeReceiptKanelConfig => ({
    connectionEnv: "DATABASE_URL",
    schemas: ["framework_core", "framework_event", "framework_view"],
    outputPath: ".attune/cache/generated/framework-runtime/db/kanel",
    kyselyOutputPath:
      ".attune/cache/generated/framework-runtime/db/kanel/framework-recipe-receipt.database.generated.ts",
    migrationPath: frameworkRecipeReceiptMigrationPath,
  })

export const frameworkRecipeReceiptSqlValidationStatements =
  (): readonly FrameworkSqlValidationStatement[] => [
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

export const readFrameworkRecipeReceiptMigration = (
  workspaceRoot = process.cwd(),
): string =>
  readFileSync(`${workspaceRoot}/${frameworkRecipeReceiptMigrationPath}`, "utf8")
