import { defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema as S } from "effect"

import { ImplementationSpec } from "./implementation-spec.js"

export const SpecInterviewAnswerKind = S.Literals([
  "text",
  "markdown",
  "list",
  "package-list",
  "command-list",
])
export type SpecInterviewAnswerKind = typeof SpecInterviewAnswerKind.Type

export const SpecInterviewQuestion = S.Struct({
  id: S.String,
  prompt: S.String,
  rationale: S.String,
  answerKind: SpecInterviewAnswerKind,
  required: S.Boolean,
})
export type SpecInterviewQuestion = typeof SpecInterviewQuestion.Type

export const SpecInterviewAnswer = S.Struct({
  questionId: S.String,
  value: S.Union([S.String, S.Array(S.String)]),
})
export type SpecInterviewAnswer = typeof SpecInterviewAnswer.Type

export const SpecInterviewInput = S.Struct({
  rawPrompt: S.String,
  answers: S.Array(SpecInterviewAnswer),
})
export type SpecInterviewInput = typeof SpecInterviewInput.Type

export const SuggestedObligation = S.Struct({
  id: S.String,
  claim: S.String,
  kind: S.String,
  rationale: S.String,
})
export type SuggestedObligation = typeof SuggestedObligation.Type

export const SpecInterviewPhase = S.Literals(["questioning", "draft-ready"])
export type SpecInterviewPhase = typeof SpecInterviewPhase.Type

export const SpecInterviewResult = S.Struct({
  phase: SpecInterviewPhase,
  questions: S.Array(SpecInterviewQuestion),
  missingConstraints: S.Array(S.String),
  suggestedTestObligations: S.Array(SuggestedObligation),
  suggestedPropertyObligations: S.Array(SuggestedObligation),
  suggestedMutationObligations: S.Array(SuggestedObligation),
  draft: S.NullOr(ImplementationSpec),
})
export type SpecInterviewResult = typeof SpecInterviewResult.Type

export const specInterviewSchemaModule = (): readonly string[] => [
  "SpecInterviewAnswerKind",
  "SpecInterviewQuestion",
  "SpecInterviewAnswer",
  "SpecInterviewInput",
  "SuggestedObligation",
  "SpecInterviewPhase",
  "SpecInterviewResult",
]

export const AttunePiSpecInterviewSchemaHandler = defineRecipeHandler<
  void,
  readonly string[]
>({
  id: "attune-pi-agent.schema.spec-interview.handler",
  recipeId: "attune-pi-agent.schema-catalog",
  sourcePath: "packages/attune/pi-agent/src/schema/spec-interview.ts",
  exportName: "specInterviewSchemaModule",
  emitsReceipts: ["attune-pi-agent.schema.spec-interview.projected"],
  handler: () => Effect.succeed(specInterviewSchemaModule()),
})

export const AttunePiSpecInterviewSchemaRecipeModule = [
  AttunePiSpecInterviewSchemaHandler,
] as const
