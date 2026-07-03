import { defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema as S } from "effect"

export const MutationSurvivorClassification = S.Literals([
  "missing-assertion",
  "missing-property",
  "equivalent-mutant",
  "dead-branch",
  "semantic-ambiguity",
  "implementation-bug",
  "irrelevant-mutant",
  "needs-human-review",
])
export type MutationSurvivorClassification = typeof MutationSurvivorClassification.Type

export const MutationObligation = S.Struct({
  id: S.String,
  targetPackage: S.String,
  targetFiles: S.Array(S.String),
  mutationCommand: S.String,
  expectedKillThreshold: S.Number,
  survivorPolicy: S.String,
  equivalentMutantPolicy: S.String,
  requiredClassification: S.Array(MutationSurvivorClassification),
})
export type MutationObligation = typeof MutationObligation.Type

export const MutationSurvivor = S.Struct({
  id: S.String,
  file: S.String,
  mutatorName: S.String,
  location: S.String,
  classification: MutationSurvivorClassification,
  rationale: S.String,
})
export type MutationSurvivor = typeof MutationSurvivor.Type

export const MutationReport = S.Struct({
  obligationId: S.String,
  command: S.String,
  mutationScore: S.Number,
  killed: S.Number,
  survived: S.Number,
  survivors: S.Array(MutationSurvivor),
})
export type MutationReport = typeof MutationReport.Type

export const mutationSchemaModule = (): readonly string[] => [
  "MutationSurvivorClassification",
  "MutationObligation",
  "MutationSurvivor",
  "MutationReport",
]

export const AttunePiMutationSchemaHandler = defineRecipeHandler<
  void,
  readonly string[]
>({
  id: "attune-pi-agent.schema.mutation.handler",
  recipeId: "attune-pi-agent.schema-catalog",
  sourcePath: "packages/attune/pi-agent/src/schema/mutation.ts",
  exportName: "mutationSchemaModule",
  emitsReceipts: ["attune-pi-agent.schema.mutation.projected"],
  handler: () => Effect.succeed(mutationSchemaModule()),
})

export const AttunePiMutationSchemaRecipeModule = [
  AttunePiMutationSchemaHandler,
] as const
