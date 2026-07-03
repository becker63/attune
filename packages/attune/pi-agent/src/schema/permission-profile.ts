import { defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema as S } from "effect"

export const PermissionDecision = S.Literals(["allow", "ask", "deny"])
export type PermissionDecision = typeof PermissionDecision.Type

export const PermissionRuleKind = S.Literals(["path", "command", "external-directory"])
export type PermissionRuleKind = typeof PermissionRuleKind.Type

export const PermissionRule = S.Struct({
  id: S.String,
  kind: PermissionRuleKind,
  pattern: S.String,
  decision: PermissionDecision,
  reason: S.String,
})
export type PermissionRule = typeof PermissionRule.Type

export const PermissionProfile = S.Struct({
  id: S.String,
  description: S.String,
  defaultDecision: PermissionDecision,
  rules: S.Array(PermissionRule),
})
export type PermissionProfile = typeof PermissionProfile.Type

export const PermissionCheck = S.Struct({
  subject: S.String,
  kind: PermissionRuleKind,
  normalizedSubject: S.String,
  decision: PermissionDecision,
  matchedRuleIds: S.Array(S.String),
  reason: S.String,
})
export type PermissionCheck = typeof PermissionCheck.Type

export const permissionProfileSchemaModule = (): readonly string[] => [
  "PermissionDecision",
  "PermissionRuleKind",
  "PermissionRule",
  "PermissionProfile",
  "PermissionCheck",
]

export const AttunePiPermissionProfileSchemaHandler = defineRecipeHandler<
  void,
  readonly string[]
>({
  id: "attune-pi-agent.schema.permission-profile.handler",
  recipeId: "attune-pi-agent.schema-catalog",
  sourcePath: "packages/attune/pi-agent/src/schema/permission-profile.ts",
  exportName: "permissionProfileSchemaModule",
  emitsReceipts: ["attune-pi-agent.schema.permission-profile.projected"],
  handler: () => Effect.succeed(permissionProfileSchemaModule()),
})

export const AttunePiPermissionProfileSchemaRecipeModule = [
  AttunePiPermissionProfileSchemaHandler,
] as const
