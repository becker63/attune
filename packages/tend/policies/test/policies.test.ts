import { describe, expect, it } from "vitest"
import { TendPolicyRecipes } from "../src/recipes.js"
import {
  compressWithOpenRtk,
  defaultOpenCodeForcingPolicy,
  evaluateForcedToolPolicy,
  futureCodexForcingPolicy,
  selectMagicContext,
} from "../src/index.js"

describe("@attune/tend-policies", () => {
  it("forces OpenCode and future Codex through Tend tools", () => {
    expect(TendPolicyRecipes.map((recipe) => recipe.id)).toEqual([
      "tend-policies.forced-tool-policy",
      "tend-policies.magic-context-selection",
      "tend-policies.openrtk-compression",
      "tend-policies.test-suite",
    ])
    expect(TendPolicyRecipes.some((recipe) => recipe.sourcePath === "packages/tend/policies/src/recipes.ts"))
      .toBe(false)
    expect(defaultOpenCodeForcingPolicy().requiredTools).toContain("openrtk.compress")
    expect(futureCodexForcingPolicy()).toMatchObject({
      agentKind: "codex",
      policyId: "tend.policy.codex-forcing-contract",
    })
    expect(evaluateForcedToolPolicy({
      sessionId: "session-1",
      requestedTool: "raw-shell-long-output",
    })).toMatchObject({
      decision: "block",
      requiredTool: "tend.observe",
    })
  })

  it("produces Magic Context and OpenRTK packets", () => {
    expect(selectMagicContext({
      sessionId: "session-1",
      policyDecisionId: "policy-1",
      contextRefs: ["a", "b", "c"],
      maxRetained: 2,
    })).toMatchObject({
      retainedContextRefs: ["a", "b"],
      droppedContextRefs: ["c"],
      droppedTokenEstimate: 100,
    })
    expect(compressWithOpenRtk({
      sessionId: "session-1",
      command: {
        commandObservationId: "command-1",
        sessionId: "session-1",
        command: "nx affected -t test",
        status: "succeeded",
        occurredAt: "2026-06-28T00:00:00.000Z",
        tokens: { totalTokens: 1000 },
      },
      policyDecisionId: "policy-1",
    })).toMatchObject({
      codec: "openrtk.command-output-v1",
      compressedTokenEstimate: 250,
      droppedTokenEstimate: 750,
    })
  })
})
