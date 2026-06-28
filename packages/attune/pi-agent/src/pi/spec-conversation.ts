import { Schema } from "effect"

import { attuneSpec } from "../commands/attune-spec.js"
import {
  AttuneSpecConversationState,
  AttuneSpecConversationTurn,
  type PiConversationMessage,
} from "../schema/pi-conversation.js"
import type {
  SpecInterviewAnswer,
  SpecInterviewQuestion,
  SpecInterviewResult,
} from "../schema/spec-interview.js"

export interface StartAttuneSpecConversationInput {
  readonly rawPrompt: string
  readonly sessionId?: string
}

export interface AnswerAttuneSpecConversationInput {
  readonly state: AttuneSpecConversationState
  readonly answer: string | ReadonlyArray<string>
  readonly questionId?: string
}

const requiredQuestionOrder = [
  "affectedPackages",
  "scope",
  "nonGoals",
  "tasks",
  "validationCommands",
  "reviewGates",
] as const

export const startAttuneSpecConversation = (
  input: StartAttuneSpecConversationInput,
): AttuneSpecConversationTurn => {
  const result = attuneSpec({ rawPrompt: input.rawPrompt, answers: [] })
  const sessionId = input.sessionId ?? conversationSessionId(input.rawPrompt)
  const messagesToRender = renderAssistantMessages({
    result,
    sessionId,
    messageOffset: 0,
  })
  const state = conversationState({
    answers: [],
    messages: messagesToRender,
    rawPrompt: input.rawPrompt,
    result,
    sessionId,
  })

  return Schema.decodeUnknownSync(AttuneSpecConversationTurn)({
    state,
    messagesToRender,
    awaitingQuestion: result.questions[0] ?? null,
    draft: result.draft,
  })
}

export const answerAttuneSpecConversation = (
  input: AnswerAttuneSpecConversationInput,
): AttuneSpecConversationTurn => {
  const state = Schema.decodeUnknownSync(AttuneSpecConversationState)(input.state)
  const activeQuestion = findActiveQuestion(state)
  const questionId = input.questionId ?? state.activeQuestionId

  if (questionId === null || questionId === undefined || activeQuestion === undefined) {
    throw new Error("No active /attune-spec question is awaiting an answer.")
  }

  if (questionId !== activeQuestion.id) {
    throw new Error(`Expected answer for ${activeQuestion.id}, received ${questionId}.`)
  }

  const answer = normalizeConversationAnswer(activeQuestion, input.answer)
  const userMessage = nextMessage(state, {
    content: renderUserAnswer(answer),
    kind: "spec-answer",
    role: "user",
  })
  const answers = replaceAnswer(state.answers, answer)
  const result = attuneSpec({ rawPrompt: state.rawPrompt, answers })
  const assistantMessages = renderAssistantMessages({
    result,
    sessionId: state.sessionId,
    messageOffset: state.messages.length + 1,
  })
  const messagesToRender = assistantMessages
  const nextState = conversationState({
    answers,
    messages: [...state.messages, userMessage, ...assistantMessages],
    rawPrompt: state.rawPrompt,
    result,
    sessionId: state.sessionId,
  })

  return Schema.decodeUnknownSync(AttuneSpecConversationTurn)({
    state: nextState,
    messagesToRender,
    awaitingQuestion: result.questions[0] ?? null,
    draft: result.draft,
  })
}

const conversationState = (input: {
  readonly answers: ReadonlyArray<SpecInterviewAnswer>
  readonly messages: ReadonlyArray<PiConversationMessage>
  readonly rawPrompt: string
  readonly result: SpecInterviewResult
  readonly sessionId: string
}): AttuneSpecConversationState => ({
  sessionId: input.sessionId,
  rawPrompt: input.rawPrompt,
  answers: [...input.answers],
  phase: input.result.phase,
  activeQuestionId: input.result.questions[0]?.id ?? null,
  messages: [...input.messages],
})

const renderAssistantMessages = (input: {
  readonly messageOffset: number
  readonly result: SpecInterviewResult
  readonly sessionId: string
}): PiConversationMessage[] => {
  const question = input.result.questions[0]

  if (question !== undefined) {
    return [
      {
        id: messageId(input.sessionId, input.messageOffset + 1),
        role: "assistant",
        kind: "spec-question",
        content: renderQuestion(input.result, question),
      },
    ]
  }

  if (input.result.draft !== null) {
    return [
      {
        id: messageId(input.sessionId, input.messageOffset + 1),
        role: "assistant",
        kind: "spec-draft-ready",
        content: renderDraftReady(input.result.draft),
      },
    ]
  }

  return [
    {
      id: messageId(input.sessionId, input.messageOffset + 1),
      role: "assistant",
      kind: "spec-system-note",
      content: "No next question is available yet. Add more context or restart /attune-spec.",
    },
  ]
}

const renderQuestion = (
  result: SpecInterviewResult,
  question: SpecInterviewQuestion,
): string => {
  const questionNumber = requiredQuestionOrder.findIndex((id) => id === question.id) + 1
  const missing = result.missingConstraints.length
  const suggestions = [
    ...result.suggestedTestObligations,
    ...result.suggestedPropertyObligations,
    ...result.suggestedMutationObligations,
  ]
  const suggestionText = suggestions.length === 0
    ? ""
    : `\n\nLikely obligations: ${suggestions.map((suggestion) => suggestion.id).join(", ")}.`

  return [
    `Question ${questionNumber} of ${requiredQuestionOrder.length}: ${question.prompt}`,
    "",
    question.rationale,
    "",
    `Answer kind: ${question.answerKind}.`,
    `Missing constraints remaining: ${missing}.`,
    suggestionText,
  ].filter((line) => line.length > 0).join("\n")
}

const renderDraftReady = (draft: NonNullable<SpecInterviewResult["draft"]>): string =>
  [
    "Spec draft ready.",
    "",
    `Spec: ${draft.title}`,
    `ID: \`${draft.id}\``,
    `Affected packages: ${draft.affectedPackages.join(", ")}`,
    `Tasks: ${draft.tasks.length}`,
    `Validation commands: ${draft.validationCommands.length}`,
    `Review gates: ${draft.reviewGates.length}`,
    "",
    "Next step: review the generated ImplementationSpec before planning or execution.",
  ].join("\n")

const normalizeConversationAnswer = (
  question: SpecInterviewQuestion,
  value: string | ReadonlyArray<string>,
): SpecInterviewAnswer => ({
  questionId: question.id,
  value: typeof value === "string"
    ? parseAnswerText(question, value)
    : [...value].map((entry) => entry.trim()).filter(Boolean),
})

const parseAnswerText = (
  question: SpecInterviewQuestion,
  value: string,
): string | string[] => {
  const trimmed = value.trim()

  if (question.answerKind === "text" || question.answerKind === "markdown") {
    return trimmed
  }

  const delimiter = question.answerKind === "command-list" ? /\r?\n/u : /\r?\n|,/u
  return trimmed
    .split(delimiter)
    .map((entry) => entry.replace(/^[-*]\s*/u, "").trim())
    .filter((entry) => entry.length > 0 && !entry.startsWith("#"))
}

const findActiveQuestion = (
  state: AttuneSpecConversationState,
): SpecInterviewQuestion | undefined =>
  attuneSpec({
    rawPrompt: state.rawPrompt,
    answers: state.answers,
  }).questions.find((question) => question.id === state.activeQuestionId)

const replaceAnswer = (
  answers: ReadonlyArray<SpecInterviewAnswer>,
  answer: SpecInterviewAnswer,
): SpecInterviewAnswer[] => [
  ...answers.filter((existing) => existing.questionId !== answer.questionId),
  answer,
]

const nextMessage = (
  state: AttuneSpecConversationState,
  message: Omit<PiConversationMessage, "id">,
): PiConversationMessage => ({
  id: messageId(state.sessionId, state.messages.length + 1),
  ...message,
})

const renderUserAnswer = (answer: SpecInterviewAnswer): string => {
  if (typeof answer.value === "string") {
    return answer.value
  }

  return answer.value.map((entry) => `- ${entry}`).join("\n")
}

const conversationSessionId = (rawPrompt: string): string => {
  const slug = rawPrompt
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 48)

  return `attune-spec-${slug.length > 0 ? slug : "session"}`
}

const messageId = (sessionId: string, index: number): string =>
  `${sessionId}-message-${String(index).padStart(3, "0")}`
