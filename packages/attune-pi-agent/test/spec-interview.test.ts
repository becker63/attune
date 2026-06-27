import { Schema } from "effect"
import { describe, expect, it } from "vitest"

import {
  ImplementationSpec,
  SpecInterviewResult,
  attuneSpec,
} from "../src/index.js"

const rawPrompt = "Model Pi permission policies in Regofile and generate Pi policy artifacts."

describe("/attune-spec interview loop", () => {
  it("asks ordered questions when the raw prompt is under-constrained", () => {
    const result = attuneSpec({ rawPrompt, answers: [] })

    expect(Schema.decodeUnknownSync(SpecInterviewResult)(result).phase).toBe("questioning")
    expect(result.draft).toBeNull()
    expect(result.questions.map((question) => question.id)).toEqual([
      "affectedPackages",
      "scope",
      "nonGoals",
    ])
    expect(result.missingConstraints).toContain("Which validation commands prove this slice?")
    expect(result.suggestedPropertyObligations.map((obligation) => obligation.id)).toContain(
      "permission-normalization",
    )
    expect(result.suggestedMutationObligations.map((obligation) => obligation.id)).toContain(
      "permission-deny-mutants",
    )
  })

  it("emits a schema-decodable draft once required answers are present", () => {
    const result = attuneSpec({
      rawPrompt,
      answers: [
        { questionId: "id", value: "ATT-50" },
        { questionId: "affectedPackages", value: ["attune-pi-agent"] },
        {
          questionId: "scope",
          value: [
            "Define Regofile-backed permission profile schemas.",
            "Generate deterministic Pi policy artifacts.",
          ],
        },
        {
          questionId: "nonGoals",
          value: [
            "Do not deploy.",
            "Do not SSH.",
            "Do not mutate secrets.",
          ],
        },
        {
          questionId: "tasks",
          value: [
            "Model permission policy input.",
            "Emit generated Pi policy artifact.",
            "Add property and mutation obligations.",
          ],
        },
        {
          questionId: "validationCommands",
          value: [
            "NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec nx run attune-pi-agent:typecheck",
            "NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec nx run attune-pi-agent:test",
            "NX_DAEMON=false TMPDIR=/tmp TEMP=/tmp TMP=/tmp pnpm exec nx run attune-pi-agent:property",
          ],
        },
        {
          questionId: "reviewGates",
          value: ["Codex evidence review", "Taylor PR review"],
        },
      ],
    })

    expect(result.phase).toBe("draft-ready")
    expect(result.questions).toHaveLength(0)

    const draft = Schema.decodeUnknownSync(ImplementationSpec)(result.draft)
    expect(draft.id).toBe("att-50")
    expect(draft.affectedPackages).toEqual(["attune-pi-agent"])
    expect(draft.permissionProfile.defaultDecision).toBe("ask")
    expect(draft.artifactPolicy.root).toBe(".attune-runs/att-50")
    expect(draft.forbiddenActions.map((action) => action.action)).toEqual(
      expect.arrayContaining([
        "modify .env*, *.env, *.env.*, or ~/.ssh/*",
        "run deploy, kubectl, SSH, sudo, git reset --hard, or git clean -fdx",
      ]),
    )
  })
})
