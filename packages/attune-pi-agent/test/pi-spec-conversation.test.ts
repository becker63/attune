import { Schema } from "effect"
import { describe, expect, it } from "vitest"

import {
  AttuneSpecConversationState,
  ImplementationSpec,
  answerAttuneSpecConversation,
  startAttuneSpecConversation,
} from "../src/index.js"

const rawPrompt = "Model Pi permission policies in Regofile and generate Pi policy artifacts."

describe("Pi /attune-spec conversation adapter", () => {
  it("starts with a renderable assistant question", () => {
    const turn = startAttuneSpecConversation({
      rawPrompt,
      sessionId: "attune-spec-test",
    })

    expect(turn.awaitingQuestion?.id).toBe("affectedPackages")
    expect(turn.messagesToRender).toEqual([
      expect.objectContaining({
        id: "attune-spec-test-message-001",
        kind: "spec-question",
        role: "assistant",
      }),
    ])
    expect(turn.messagesToRender[0]?.content).toContain("Question 1 of 6")
    expect(Schema.decodeUnknownSync(AttuneSpecConversationState)(turn.state).phase).toBe(
      "questioning",
    )
  })

  it("advances answers turn by turn and finishes with a decoded spec draft", () => {
    let turn = startAttuneSpecConversation({
      rawPrompt,
      sessionId: "attune-spec-flow",
    })

    turn = answerAttuneSpecConversation({
      state: turn.state,
      answer: "attune-pi-agent",
    })
    expect(turn.awaitingQuestion?.id).toBe("scope")
    expect(turn.state.answers.at(-1)).toEqual({
      questionId: "affectedPackages",
      value: ["attune-pi-agent"],
    })

    turn = answerAttuneSpecConversation({
      state: turn.state,
      answer: [
        "Define Regofile-backed permission profile schemas.",
        "Generate deterministic Pi policy artifacts.",
      ],
    })
    turn = answerAttuneSpecConversation({
      state: turn.state,
      answer: "Do not deploy.\nDo not SSH.\nDo not mutate secrets.",
    })
    turn = answerAttuneSpecConversation({
      state: turn.state,
      answer: [
        "Model permission policy input.",
        "Emit generated Pi policy artifact.",
        "Add property and mutation obligations.",
      ],
    })
    turn = answerAttuneSpecConversation({
      state: turn.state,
      answer: [
        "NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp corepack pnpm exec nx run attune-pi-agent:typecheck",
        "NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp corepack pnpm exec nx run attune-pi-agent:test",
        "NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp corepack pnpm exec nx run attune-pi-agent:property",
      ],
    })
    turn = answerAttuneSpecConversation({
      state: turn.state,
      answer: "Codex evidence review\nTaylor PR review",
    })

    expect(turn.awaitingQuestion).toBeNull()
    expect(turn.messagesToRender).toEqual([
      expect.objectContaining({
        kind: "spec-draft-ready",
        role: "assistant",
      }),
    ])
    expect(turn.messagesToRender[0]?.content).toContain("Spec draft ready.")

    const draft = Schema.decodeUnknownSync(ImplementationSpec)(turn.draft)
    expect(draft.id).toBe("model-pi-permission-policies-in-regofile-and-generate-pi-policy-artifacts")
    expect(draft.affectedPackages).toEqual(["attune-pi-agent"])
    expect(draft.validationCommands).toHaveLength(3)
    expect(turn.state.phase).toBe("draft-ready")
  })

  it("keeps command answers line-oriented instead of splitting shell syntax on commas", () => {
    let turn = startAttuneSpecConversation({
      rawPrompt,
      sessionId: "attune-spec-commands",
    })

    turn = answerAttuneSpecConversation({ state: turn.state, answer: "attune-pi-agent" })
    turn = answerAttuneSpecConversation({ state: turn.state, answer: "Scope" })
    turn = answerAttuneSpecConversation({ state: turn.state, answer: "No deploy" })
    turn = answerAttuneSpecConversation({ state: turn.state, answer: "Task" })
    turn = answerAttuneSpecConversation({
      state: turn.state,
      answer: "node script.mjs --label one,two\nnode other.mjs",
    })

    expect(turn.state.answers.at(-1)).toEqual({
      questionId: "validationCommands",
      value: ["node script.mjs --label one,two", "node other.mjs"],
    })
  })

  it("ignores Pi editor hint comments in list answers", () => {
    let turn = startAttuneSpecConversation({
      rawPrompt,
      sessionId: "attune-spec-hints",
    })

    turn = answerAttuneSpecConversation({
      state: turn.state,
      answer: "# One item per line\nattune-pi-agent",
    })

    expect(turn.state.answers.at(-1)).toEqual({
      questionId: "affectedPackages",
      value: ["attune-pi-agent"],
    })
  })

  it("rejects answers that do not target the active question", () => {
    const turn = startAttuneSpecConversation({ rawPrompt })

    expect(() => {
      answerAttuneSpecConversation({
        state: turn.state,
        questionId: "scope",
        answer: "Wrong slot",
      })
    }).toThrow("Expected answer")
  })
})
