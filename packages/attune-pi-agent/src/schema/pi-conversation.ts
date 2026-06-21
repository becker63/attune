import { Schema as S } from "effect"

import { ImplementationSpec } from "./implementation-spec.js"
import {
  SpecInterviewAnswer,
  SpecInterviewPhase,
  SpecInterviewQuestion,
} from "./spec-interview.js"

export const PiConversationRole = S.Literals(["assistant", "user"])
export type PiConversationRole = typeof PiConversationRole.Type

export const PiMessageKind = S.Literals([
  "spec-question",
  "spec-answer",
  "spec-draft-ready",
  "spec-system-note",
])
export type PiMessageKind = typeof PiMessageKind.Type

export const PiConversationMessage = S.Struct({
  id: S.String,
  role: PiConversationRole,
  kind: PiMessageKind,
  content: S.String,
})
export type PiConversationMessage = typeof PiConversationMessage.Type

export const AttuneSpecConversationState = S.Struct({
  sessionId: S.String,
  rawPrompt: S.String,
  answers: S.Array(SpecInterviewAnswer),
  phase: SpecInterviewPhase,
  activeQuestionId: S.NullOr(S.String),
  messages: S.Array(PiConversationMessage),
})
export type AttuneSpecConversationState = typeof AttuneSpecConversationState.Type

export const AttuneSpecConversationTurn = S.Struct({
  state: AttuneSpecConversationState,
  messagesToRender: S.Array(PiConversationMessage),
  awaitingQuestion: S.NullOr(SpecInterviewQuestion),
  draft: S.NullOr(ImplementationSpec),
})
export type AttuneSpecConversationTurn = typeof AttuneSpecConversationTurn.Type
