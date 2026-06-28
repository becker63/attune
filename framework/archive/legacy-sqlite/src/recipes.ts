import { defineRecipe } from "@attune/framework-protocol"
import { Schema } from "effect"

export const FrameworkSqliteQuarantineReason =
  "SQLite program fact/index stores are ARS legacy quarantine fixtures; recipe receipts and durable substrate work move to local TimescaleDB/Postgres." as const

export const SqliteLegacyQuarantineInput = Schema.Struct({
  path: Schema.String,
  mode: Schema.Literals(["memory", "cache-file"] as const),
})
export type SqliteLegacyQuarantineInput = typeof SqliteLegacyQuarantineInput.Type

export const SqliteLegacyQuarantineOutput = Schema.Struct({
  quarantine: Schema.Literal("legacy-quarantine"),
  backend: Schema.Literals(["memory", "node:sqlite"] as const),
  replacementSubstrate: Schema.Literal("framework-runtime.postgres-recipe-receipts"),
  removalPath: Schema.String,
})
export type SqliteLegacyQuarantineOutput = typeof SqliteLegacyQuarantineOutput.Type

export const FrameworkSqliteQuarantineRecipes = [
  defineRecipe({
    id: "framework-sqlite.legacy-quarantine",
    projectId: "framework-sqlite",
    title: "Quarantine legacy SQLite program fact/index stores",
    inputSchema: SqliteLegacyQuarantineInput,
    outputSchema: SqliteLegacyQuarantineOutput,
    nxTarget: "framework-sqlite:test",
    sourcePath: "framework/sqlite/src/recipes.ts",
    allowedFiles: ["framework/sqlite/**"],
    validationEvidence: ["framework-sqlite:test"],
  }),
] as const
