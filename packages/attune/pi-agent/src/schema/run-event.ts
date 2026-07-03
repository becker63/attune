import { defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema as S } from "effect"

export const RunEventType = S.Literals([
  "run.started",
  "spec.decoded",
  "plan.created",
  "task.started",
  "command.started",
  "command.completed",
  "property.failure_found",
  "mutation.survivor_found",
  "evidence.updated",
  "review.completed",
  "run.completed",
  "run.failed",
])
export type RunEventType = typeof RunEventType.Type

export const RunEvent = S.Struct({
  id: S.String,
  runId: S.String,
  type: RunEventType,
  occurredAt: S.String,
  summary: S.String,
  refs: S.Array(S.String),
})
export type RunEvent = typeof RunEvent.Type

export const runEventSchemaModule = (): readonly string[] => [
  "RunEventType",
  "RunEvent",
]

export const AttunePiRunEventSchemaHandler = defineRecipeHandler<
  void,
  readonly string[]
>({
  id: "attune-pi-agent.schema.run-event.handler",
  recipeId: "attune-pi-agent.schema-catalog",
  sourcePath: "packages/attune/pi-agent/src/schema/run-event.ts",
  exportName: "runEventSchemaModule",
  emitsReceipts: ["attune-pi-agent.schema.run-event.projected"],
  handler: () => Effect.succeed(runEventSchemaModule()),
})

export const AttunePiRunEventSchemaRecipeModule = [
  AttunePiRunEventSchemaHandler,
] as const
