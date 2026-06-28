import { Schema } from "effect"
import { defineRecipe } from "@attune/framework-protocol"
import {
  TendMagicContextDecisionSchema,
  TendOpenRtkCompressionActionSchema,
  TendPolicyDecisionSchema,
  type TendCommandObservation,
  type TendMagicContextDecision,
  type TendOpenRtkCompressionAction,
  type TendPolicyDecision,
} from "@attune/tend-core"

export const TendForcedToolPolicySchema = Schema.Struct({
  policyId: Schema.String,
  agentKind: Schema.Literals(["opencode", "codex"] as const),
  requiredTools: Schema.Array(Schema.String),
  forbiddenDirectTools: Schema.Array(Schema.String),
})
export type TendForcedToolPolicy = typeof TendForcedToolPolicySchema.Type

export const defaultOpenCodeForcingPolicy = (): TendForcedToolPolicy => ({
  policyId: "tend.policy.opencode-forcing",
  agentKind: "opencode",
  requiredTools: [
    "tend.observe",
    "magic-context.select",
    "openrtk.compress",
    "tend.long-job.register",
    "tend.report.tokens",
  ],
  forbiddenDirectTools: ["raw-shell-long-output", "direct-context-drop", "untagged-wakeup"],
})

export const futureCodexForcingPolicy = (): TendForcedToolPolicy => ({
  ...defaultOpenCodeForcingPolicy(),
  policyId: "tend.policy.codex-forcing-contract",
  agentKind: "codex",
})

export const evaluateForcedToolPolicy = (input: {
  readonly sessionId: string
  readonly requestedTool: string
  readonly recipeId?: string
  readonly runId?: string
  readonly receiptId?: string
  readonly observationId?: string
  readonly policy?: TendForcedToolPolicy
}): TendPolicyDecision => {
  const policy = input.policy ?? defaultOpenCodeForcingPolicy()
  const forbidden = policy.forbiddenDirectTools.includes(input.requestedTool)
  return {
    decisionId: `policy:${input.sessionId}:${input.requestedTool}`,
    sessionId: input.sessionId,
    policyName: policy.policyId,
    decision: forbidden ? "block" : "force-tool",
    reason: forbidden
      ? `${input.requestedTool} bypasses Tend/OpenRTK/Magic Context.`
      : `${input.requestedTool} must be mediated by Tend.`,
    requiredTool: forbidden ? "tend.observe" : input.requestedTool,
    ...(input.recipeId === undefined ? {} : { recipeId: input.recipeId }),
    ...(input.runId === undefined ? {} : { runId: input.runId }),
    ...(input.receiptId === undefined ? {} : { receiptId: input.receiptId }),
    ...(input.observationId === undefined ? {} : { observationId: input.observationId }),
  }
}

export const selectMagicContext = (input: {
  readonly sessionId: string
  readonly policyDecisionId: string
  readonly contextRefs: readonly string[]
  readonly maxRetained: number
  readonly recipeId?: string
  readonly runId?: string
  readonly receiptId?: string
  readonly observationId?: string
}): TendMagicContextDecision => {
  const retainedContextRefs = input.contextRefs.slice(0, input.maxRetained)
  const droppedContextRefs = input.contextRefs.slice(input.maxRetained)
  return {
    decisionId: `magic-context:${input.sessionId}`,
    sessionId: input.sessionId,
    retainedContextRefs,
    droppedContextRefs,
    retainedTokenEstimate: retainedContextRefs.length * 100,
    droppedTokenEstimate: droppedContextRefs.length * 100,
    policyDecisionId: input.policyDecisionId,
    ...(input.recipeId === undefined ? {} : { recipeId: input.recipeId }),
    ...(input.runId === undefined ? {} : { runId: input.runId }),
    ...(input.receiptId === undefined ? {} : { receiptId: input.receiptId }),
    ...(input.observationId === undefined ? {} : { observationId: input.observationId }),
  }
}

export const compressWithOpenRtk = (input: {
  readonly sessionId: string
  readonly command: TendCommandObservation
  readonly policyDecisionId?: string
}): TendOpenRtkCompressionAction => {
  const originalTokenEstimate = input.command.tokens?.totalTokens ?? input.command.command.length
  const compressedTokenEstimate = Math.ceil(originalTokenEstimate / 4)
  return {
    actionId: `openrtk:${input.command.commandObservationId}`,
    sessionId: input.sessionId,
    sourceObservationIds: [input.command.commandObservationId],
    codec: "openrtk.command-output-v1",
    ...(input.command.recipeId === undefined ? {} : { recipeId: input.command.recipeId }),
    ...(input.command.runId === undefined ? {} : { runId: input.command.runId }),
    ...(input.command.receiptId === undefined ? {} : { receiptId: input.command.receiptId }),
    ...(input.command.observationId === undefined ? {} : { observationId: input.command.observationId }),
    summary: `Compressed output for ${input.command.command}.`,
    originalTokenEstimate,
    compressedTokenEstimate,
    droppedTokenEstimate: Math.max(0, originalTokenEstimate - compressedTokenEstimate),
    ...(input.policyDecisionId === undefined ? {} : { policyDecisionId: input.policyDecisionId }),
  }
}

export const TendPolicyRecipes = [
  defineRecipe({
    id: "tend-policies.forcing-harness",
    projectId: "tend-policies",
    title: "Force OpenCode and future Codex through Tend, Magic Context, and OpenRTK",
    inputSchema: TendForcedToolPolicySchema,
    outputSchema: Schema.Struct({
      policy: TendForcedToolPolicySchema,
      magicContext: TendMagicContextDecisionSchema,
      openrtk: TendOpenRtkCompressionActionSchema,
      decision: TendPolicyDecisionSchema,
    }),
    nxTarget: "tend-policies:test",
    sourcePath: "packages/tend/policies/src/index.ts",
    allowedFiles: ["packages/tend/policies/**"],
    validationEvidence: ["tend-policies:test", "tend-policies:typecheck"],
  }),
] as const
