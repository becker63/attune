import { defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema as S } from "effect"

export const TaskKind = S.Literals([
  "pure-implementation",
  "test-strengthening",
  "generator-update",
  "integration-work",
  "human-review-required",
])
export type TaskKind = typeof TaskKind.Type

export const PlannedTask = S.Struct({
  id: S.String,
  title: S.String,
  kind: TaskKind,
  description: S.String,
  dependsOn: S.Array(S.String),
  affectedPackages: S.Array(S.String),
  validationCommands: S.Array(S.String),
  humanReviewRequired: S.Boolean,
})
export type PlannedTask = typeof PlannedTask.Type

export const RiskClassification = S.Literals(["low", "medium", "high", "safety-critical"])
export type RiskClassification = typeof RiskClassification.Type

export const TaskPlan = S.Struct({
  specId: S.String,
  tasks: S.Array(PlannedTask),
  affectedPackages: S.Array(S.String),
  validationSequence: S.Array(S.String),
  risk: RiskClassification,
  reviewGates: S.Array(S.String),
})
export type TaskPlan = typeof TaskPlan.Type

export const taskPlanSchemaModule = (): readonly string[] => [
  "TaskKind",
  "PlannedTask",
  "RiskClassification",
  "TaskPlan",
]

export const AttunePiTaskPlanSchemaHandler = defineRecipeHandler<
  void,
  readonly string[]
>({
  id: "attune-pi-agent.schema.task-plan.handler",
  recipeId: "attune-pi-agent.schema-catalog",
  sourcePath: "packages/attune/pi-agent/src/schema/task-plan.ts",
  exportName: "taskPlanSchemaModule",
  emitsReceipts: ["attune-pi-agent.schema.task-plan.projected"],
  handler: () => Effect.succeed(taskPlanSchemaModule()),
})

export const AttunePiTaskPlanSchemaRecipeModule = [
  AttunePiTaskPlanSchemaHandler,
] as const
