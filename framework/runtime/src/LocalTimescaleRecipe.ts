import { Effect, Schema } from "effect"
import {
  ManagedRecipeLifecycleActionSchema,
  defineManagedExecutableRecipe,
  type ManagedRecipeLifecycleAction,
  type ManagedRecipeLifecycleSubstrate,
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
  }),
  receiptStore: Schema.Struct({
    implementation: Schema.String,
    durable: Schema.Boolean,
  }),
})
export type LocalTimescaleManagedRecipeOutput =
  typeof LocalTimescaleManagedRecipeOutput.Type

export const localTimescaleLifecycleSubstrates =
  (): readonly ManagedRecipeLifecycleSubstrate[] => [
    {
      id: "local-timescaledb.service",
      kind: "database-service",
      tool: "TimescaleDB/Postgres",
      lifecycleActions: ["plan", "apply", "check", "destroy", "prune"],
      nxTarget: "framework-runtime:db:migrate",
      evidence: [frameworkRecipeReceiptMigrationPath],
    },
    {
      id: "local-timescaledb.image",
      kind: "container-runtime",
      tool: "nix2container",
      lifecycleActions: ["plan", "apply", "check", "destroy"],
      evidence: [
        "nix/toolchains/postgres-timescale.nix",
        "nix/containers/local-timescaledb.nix",
      ],
    },
    {
      id: "local-timescaledb.compose",
      kind: "container-runtime",
      tool: "Arion",
      lifecycleActions: ["plan", "apply", "check", "destroy"],
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
      lifecycleActions: ["check"],
      nxTarget: "framework-runtime:db:validate-sql",
      evidence: [frameworkRecipeReceiptMigrationPath],
    },
  ]

export const localTimescaleLifecycleOutput = (
  input: LocalTimescaleManagedRecipeInput,
  action: ManagedRecipeLifecycleAction = input.action ?? "check",
): LocalTimescaleManagedRecipeOutput => ({
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
    applied: input.runIntegration === true && (action === "apply" || action === "check"),
  },
  sqlRoute: {
    kanel: frameworkRecipeReceiptKanelConfig() satisfies FrameworkRecipeReceiptKanelConfig,
    kysely: "FrameworkRecipeReceiptKyselyServiceContract",
    safeql: frameworkRecipeReceiptSafeQlConfig() satisfies FrameworkRecipeReceiptSafeQlConfig,
  },
  serviceClosure: {
    arionComposeFile: "nix/compose/local-timescaledb.arion.nix",
    nix2containerImage: ".#local-timescaledb-image",
    databaseUrl: input.databaseUrlEnv ?? "DATABASE_URL",
  },
  receiptStore: {
    implementation: "PostgresRecipeReceiptStore",
    durable: true,
  },
})

export const LocalTimescaleManagedRecipe = defineManagedExecutableRecipe({
  id: "framework-runtime.local-timescaledb",
  projectId: "framework-runtime",
  title: "Local TimescaleDB/Postgres recipe receipt spine",
  inputSchema: LocalTimescaleManagedRecipeInput,
  outputSchema: LocalTimescaleManagedRecipeOutput,
  nxTarget: "framework-runtime:db:migrate",
  sourcePath: "framework/runtime/src/LocalTimescaleRecipe.ts",
  allowedFiles: ["framework/runtime/**", "nix/**", "scripts/**"],
  validationEvidence: [
    "framework-runtime:db:migrate",
    "framework-runtime:db:generate-types",
    "framework-runtime:db:validate-sql",
    "framework-runtime:db:integration-test",
    "framework-runtime:test",
  ],
  lifecycle: ["plan", "apply", "check", "destroy", "prune"],
  resourceKind: "timescaledb-postgres-recipe-receipts",
  lifecycleSubstrates: localTimescaleLifecycleSubstrates(),
  observedState: {
    integrationGuard: "ATTUNE_RUN_DB_INTEGRATION=1",
    status: "unit-contract-ready",
  },
  driftRepair: {
    repairId: "recipe-repair:framework-runtime.local-timescaledb:drift",
    recipeId: "framework-runtime.local-timescaledb",
    title: "Repair local TimescaleDB recipe receipt drift",
    kind: "managed-lifecycle",
    nxTarget: "framework-runtime:db:migrate",
    allowedFiles: ["framework/runtime/**", "nix/**"],
    risk: "needs-review",
    evidenceRequirements: ["framework-runtime:db:validate-sql", "framework-runtime:test"],
  },
  humanReviewRequired: false,
  execute: (input) => Effect.succeed(localTimescaleLifecycleOutput(input)),
})
