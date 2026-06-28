import { Effect, Schema } from "effect"
import {
  ManagedRecipeLifecycleActionSchema,
  defineManagedExecutableRecipe,
  recipeObservationId,
  type ManagedRecipeLifecycleAction,
  type ManagedRecipeLifecycleSubstrate,
  type RecipeObservation,
} from "./RecipeKernel.js"
import {
  frameworkRecipeReceiptKanelConfig,
  frameworkRecipeReceiptMigrationPath,
  frameworkRecipeReceiptSafeQlConfig,
  type FrameworkRecipeReceiptKanelConfig,
  type FrameworkRecipeReceiptSafeQlConfig,
} from "./SqlRoute.js"

export const LocalTimescaleManagedRecipeInput = Schema.Struct({
  workspaceRoot: Schema.String,
  databaseUrlEnv: Schema.optional(Schema.String),
  dataDir: Schema.optional(Schema.String),
  port: Schema.optional(Schema.Number),
  storeMode: Schema.optional(Schema.String),
  action: Schema.optional(ManagedRecipeLifecycleActionSchema),
  runIntegration: Schema.optional(Schema.Boolean),
})
export type LocalTimescaleManagedRecipeInput =
  typeof LocalTimescaleManagedRecipeInput.Type

export const LocalTimescaleManagedRecipeOutput = Schema.Struct({
  serviceName: Schema.String,
  action: ManagedRecipeLifecycleActionSchema,
  managedBy: Schema.Literals(["Effect Alchemy ManagedRecipe"] as const),
  readiness: Schema.Struct({
    check: Schema.String,
    ready: Schema.Boolean,
    integrationGuard: Schema.String,
  }),
  migration: Schema.Struct({
    path: Schema.String,
    applied: Schema.Boolean,
  }),
  sqlRoute: Schema.Struct({
    kanel: Schema.Unknown,
    kysely: Schema.String,
    safeql: Schema.Unknown,
  }),
  serviceClosure: Schema.Struct({
    arionComposeFile: Schema.String,
    nix2containerImage: Schema.String,
    databaseUrl: Schema.String,
    dataDir: Schema.String,
    port: Schema.Number,
    storeMode: Schema.String,
  }),
  receiptStore: Schema.Struct({
    implementation: Schema.String,
    durable: Schema.Boolean,
  }),
})
export type LocalTimescaleManagedRecipeOutput =
  typeof LocalTimescaleManagedRecipeOutput.Type

export const LocalTimescaleManagedRecipeId = "framework-runtime.local-timescaledb" as const

export const LocalTimescaleObservationKindSchema = Schema.Literals([
  "local-timescaledb.service-planned",
  "local-timescaledb.service-ready",
  "local-timescaledb.service-stopped",
  "local-timescaledb.migration-applied",
  "local-timescaledb.sql-validated",
  "local-timescaledb.kanel-generated",
  "local-timescaledb.safeql-validated",
  "local-timescaledb.destroyed",
  "local-timescaledb.pruned",
] as const)
export type LocalTimescaleObservationKind = typeof LocalTimescaleObservationKindSchema.Type

export interface LocalTimescaleObservationInput {
  readonly output: LocalTimescaleManagedRecipeOutput
  readonly observationKind: LocalTimescaleObservationKind
  readonly observedAt: string
  readonly runId?: string
  readonly receiptId?: string
  readonly source?: string
}

export const localTimescaleLifecycleSubstrates =
  (): readonly ManagedRecipeLifecycleSubstrate[] => [
    {
      id: "local-timescaledb.service",
      kind: "database-service",
      tool: "TimescaleDB/Postgres",
      lifecycleActions: ["plan", "apply", "check", "migrate", "validate-sql", "stop", "destroy", "prune"],
      nxTarget: "framework-runtime:db:apply",
      evidence: [frameworkRecipeReceiptMigrationPath],
    },
    {
      id: "local-timescaledb.image",
      kind: "container-runtime",
      tool: "nix2container",
      lifecycleActions: ["plan", "apply", "check", "stop", "destroy"],
      evidence: [
        "nix/toolchains/postgres-timescale.nix",
        "nix/containers/local-timescaledb.nix",
      ],
    },
    {
      id: "local-timescaledb.compose",
      kind: "container-runtime",
      tool: "Arion",
      lifecycleActions: ["plan", "apply", "check", "stop", "destroy"],
      evidence: ["nix/compose/local-timescaledb.arion.nix"],
    },
    {
      id: "framework-recipe-spine.types",
      kind: "schema-codegen",
      tool: "Kanel",
      lifecycleActions: ["apply", "check"],
      nxTarget: "framework-runtime:db:generate-types",
      evidence: [".attune/cache/generated/framework-runtime/db/kanel"],
    },
    {
      id: "framework-recipe-spine.query-service",
      kind: "query-service",
      tool: "Kysely",
      lifecycleActions: ["apply", "check"],
      evidence: ["FrameworkRecipeReceiptKyselyServiceContract"],
    },
    {
      id: "framework-recipe-spine.safeql",
      kind: "sql-validation",
      tool: "SafeQL",
      lifecycleActions: ["check", "validate-sql"],
      nxTarget: "framework-runtime:db:validate-sql",
      evidence: [frameworkRecipeReceiptMigrationPath],
    },
  ]

export const localTimescaleLifecycleOutput = (
  input: LocalTimescaleManagedRecipeInput,
  action: ManagedRecipeLifecycleAction = input.action ?? "check",
): LocalTimescaleManagedRecipeOutput => {
  const port = input.port ?? 54329
  const dataDir = input.dataDir ?? `${input.workspaceRoot}/.attune/state/local-timescaledb`
  return {
    serviceName: "local-timescaledb",
    action,
    managedBy: "Effect Alchemy ManagedRecipe",
    readiness: {
      check: "SELECT 1",
      ready: input.runIntegration === true,
      integrationGuard: "ATTUNE_RUN_DB_INTEGRATION=1",
    },
    migration: {
      path: frameworkRecipeReceiptMigrationPath,
      applied: input.runIntegration === true
        && (action === "apply" || action === "check" || action === "migrate" || action === "validate-sql"),
    },
    sqlRoute: {
      kanel: frameworkRecipeReceiptKanelConfig() satisfies FrameworkRecipeReceiptKanelConfig,
      kysely: "FrameworkRecipeReceiptKyselyServiceContract",
      safeql: frameworkRecipeReceiptSafeQlConfig() satisfies FrameworkRecipeReceiptSafeQlConfig,
    },
    serviceClosure: {
      arionComposeFile: "nix/compose/local-timescaledb.arion.nix",
      nix2containerImage: ".#local-timescaledb-image",
      databaseUrl: input.databaseUrlEnv ?? "ATTUNE_RECIPE_STORE_URL",
      dataDir,
      port,
      storeMode: input.storeMode ?? "local-postgres",
    },
    receiptStore: {
      implementation: "PostgresRecipeReceiptStore",
      durable: true,
    },
  }
}

export const localTimescaleObservationPayload = (
  output: LocalTimescaleManagedRecipeOutput,
  observationKind: LocalTimescaleObservationKind,
): Record<string, unknown> => ({
  alchemy: {
    resourceId: "local-timescaledb",
    resourceKind: "timescaledb-postgres-recipe-receipts",
    phase: output.action,
    provider: "effect-alchemy",
  },
  observation: {
    kind: observationKind,
    recipeId: LocalTimescaleManagedRecipeId,
  },
  service: {
    name: output.serviceName,
    databaseUrl: output.serviceClosure.databaseUrl,
    dataDir: output.serviceClosure.dataDir,
    port: output.serviceClosure.port,
    storeMode: output.serviceClosure.storeMode,
    ready: output.readiness.ready,
    readinessCheck: output.readiness.check,
    integrationGuard: output.readiness.integrationGuard,
  },
  migration: output.migration,
  sqlRoute: {
    kanel: output.sqlRoute.kanel,
    kysely: output.sqlRoute.kysely,
    safeql: output.sqlRoute.safeql,
  },
  receiptStore: output.receiptStore,
})

export const localTimescaleObservation = (
  input: LocalTimescaleObservationInput,
): RecipeObservation => ({
  observationId: recipeObservationId(
    LocalTimescaleManagedRecipeId,
    input.observationKind,
    input.observedAt,
  ),
  recipeId: LocalTimescaleManagedRecipeId,
  ...(input.runId === undefined ? {} : { runId: input.runId }),
  ...(input.receiptId === undefined ? {} : { receiptId: input.receiptId }),
  observationKind: input.observationKind,
  observedAt: input.observedAt,
  source: input.source ?? "framework-runtime.local-timescaledb",
  payload: localTimescaleObservationPayload(input.output, input.observationKind),
})

export const localTimescaleLifecycleObservationKinds = (
  output: LocalTimescaleManagedRecipeOutput,
): readonly LocalTimescaleObservationKind[] => [
  ...(output.action === "plan" ? ["local-timescaledb.service-planned" as const] : []),
  ...(output.readiness.ready ? ["local-timescaledb.service-ready" as const] : []),
  ...(output.action === "stop" ? ["local-timescaledb.service-stopped" as const] : []),
  ...(output.migration.applied || output.action === "migrate" ? ["local-timescaledb.migration-applied" as const] : []),
  ...(
    output.action === "check" || output.action === "apply" || output.action === "validate-sql"
      ? [
        "local-timescaledb.sql-validated" as const,
        "local-timescaledb.kanel-generated" as const,
        "local-timescaledb.safeql-validated" as const,
      ]
      : []
  ),
  ...(output.action === "destroy" ? ["local-timescaledb.destroyed" as const] : []),
  ...(output.action === "prune" ? ["local-timescaledb.pruned" as const] : []),
]

export const localTimescaleLifecycleObservations = (
  output: LocalTimescaleManagedRecipeOutput,
  options: Omit<LocalTimescaleObservationInput, "output" | "observationKind">,
): readonly RecipeObservation[] =>
  localTimescaleLifecycleObservationKinds(output).map((observationKind) =>
    localTimescaleObservation({
      ...options,
      output,
      observationKind,
    })
  )

export const LocalTimescaleManagedRecipe = defineManagedExecutableRecipe({
  id: LocalTimescaleManagedRecipeId,
  projectId: "framework-runtime",
  title: "Local TimescaleDB/Postgres recipe receipt spine",
  inputSchema: LocalTimescaleManagedRecipeInput,
  outputSchema: LocalTimescaleManagedRecipeOutput,
  nxTarget: "framework-runtime:db:migrate",
  sourcePath: "packages/trellis/runtime/src/LocalTimescaleRecipe.ts",
  allowedFiles: ["packages/trellis/runtime/**", "nix/**"],
  validationEvidence: [
    "framework-runtime:db:migrate",
    "framework-runtime:db:generate-types",
    "framework-runtime:db:validate-sql",
    "framework-runtime:db:integration-test",
    "framework-runtime:test",
  ],
  lifecycle: ["plan", "apply", "check", "migrate", "validate-sql", "stop", "destroy", "prune"],
  resourceKind: "timescaledb-postgres-recipe-receipts",
  lifecycleSubstrates: localTimescaleLifecycleSubstrates(),
  observedState: {
    integrationGuard: "ATTUNE_RUN_DB_INTEGRATION=1",
    dataDirEnv: "ATTUNE_LOCAL_RECIPE_STORE_DATA_DIR",
    databaseUrlEnv: "ATTUNE_RECIPE_STORE_URL",
    storeModeEnv: "ATTUNE_RECIPE_STORE_MODE",
    status: "unit-contract-ready",
  },
  driftRepair: {
    repairId: "recipe-repair:framework-runtime.local-timescaledb:drift",
    recipeId: "framework-runtime.local-timescaledb",
    title: "Repair local TimescaleDB recipe receipt drift",
    kind: "managed-lifecycle",
    nxTarget: "framework-runtime:db:migrate",
    allowedFiles: ["packages/trellis/runtime/**", "nix/**"],
    risk: "needs-review",
    evidenceRequirements: ["framework-runtime:db:validate-sql", "framework-runtime:test"],
  },
  humanReviewRequired: false,
  observations: ({ output, run, receipt }) =>
    localTimescaleLifecycleObservations(output, {
      observedAt: receipt.completedAt ?? receipt.startedAt,
      runId: run.runId,
      receiptId: receipt.receiptId,
    }),
  execute: (input) => Effect.succeed(localTimescaleLifecycleOutput(input)),
})
