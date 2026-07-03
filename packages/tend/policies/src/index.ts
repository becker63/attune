import {
  defineAlchemyResource,
  defineObservationRecipe,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
import {
  TendMagicContextDecisionSchema,
  TendCommandObservationSchema,
  TendOpenRtkCompressionActionSchema,
  TendPolicyDecisionSchema,
  type TendCommandObservation,
  type TendMagicContextDecision,
  type TendOpenRtkCompressionAction,
  type TendPolicyDecision,
} from "@attune/tend-core"

export const TendPoliciesTypecheckValidationTargets = ["tend-policies:typecheck"] as const
export const TendPoliciesForcedToolPolicyRecipeId = "tend-policies.forced-tool-policy" as const
export const TendPoliciesMagicContextSelectionRecipeId = "tend-policies.magic-context-selection" as const
export const TendPoliciesOpenRtkCompressionRecipeId = "tend-policies.openrtk-compression" as const
export const TendPoliciesTestSuiteRecipeId = "tend-policies.test-suite" as const
const tendPoliciesForcedToolPolicyHandlerId = "tend-policies.forced-tool-policy.handler" as const
const tendPoliciesMagicContextSelectionHandlerId = "tend-policies.magic-context-selection.handler" as const
const tendPoliciesOpenRtkCompressionHandlerId = "tend-policies.openrtk-compression.handler" as const

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

export const TendPolicyRecipeAddress = Schema.Struct({
  packageRoot: Schema.Literal("packages/tend/policies"),
  recipeId: Schema.String,
})
export type TendPolicyRecipeAddress = typeof TendPolicyRecipeAddress.Type

export const TendPolicyRecipeOutput = Schema.Struct({
  recipeId: Schema.String,
  decisionLinked: Schema.Boolean,
})
export type TendPolicyRecipeOutput = typeof TendPolicyRecipeOutput.Type

export const ForcedToolPolicyInput = Schema.Struct({
  sessionId: Schema.String,
  requestedTool: Schema.String,
  recipeId: Schema.optional(Schema.String),
  runId: Schema.optional(Schema.String),
  receiptId: Schema.optional(Schema.String),
  observationId: Schema.optional(Schema.String),
  policy: Schema.optional(TendForcedToolPolicySchema),
})
export type ForcedToolPolicyInput = typeof ForcedToolPolicyInput.Type

export const MagicContextSelectionInput = Schema.Struct({
  sessionId: Schema.String,
  policyDecisionId: Schema.String,
  contextRefs: Schema.Array(Schema.String),
  maxRetained: Schema.Number,
  recipeId: Schema.optional(Schema.String),
  runId: Schema.optional(Schema.String),
  receiptId: Schema.optional(Schema.String),
  observationId: Schema.optional(Schema.String),
})
export type MagicContextSelectionInput = typeof MagicContextSelectionInput.Type

export const OpenRtkCompressionInput = Schema.Struct({
  sessionId: Schema.String,
  command: TendCommandObservationSchema,
  policyDecisionId: Schema.optional(Schema.String),
})
export type OpenRtkCompressionInput = typeof OpenRtkCompressionInput.Type

// @attune-packet-target generated-runtime-projection eligible
export const TendPolicyPackageResource = defineAlchemyResource({
  id: "tend-policies.package-root",
  kind: "directory",
  alchemyType: "attune:resource:Directory",
  consumedBy: [
    TendPoliciesForcedToolPolicyRecipeId,
    TendPoliciesMagicContextSelectionRecipeId,
    TendPoliciesOpenRtkCompressionRecipeId,
    TendPoliciesTestSuiteRecipeId,
  ],
  addressSchema: TendPolicyRecipeAddress,
  stateSchema: Schema.Struct({
    sourceRoot: Schema.Literal("packages/tend/policies/src"),
    packageId: Schema.Literal("tend-policies"),
  }),
  modes: ["read"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendPolicyDecisionResource = defineAlchemyResource({
  id: "tend-policies.policy-decision",
  kind: "observation-stream",
  alchemyType: "attune:resource:ObservationStream",
  producedBy: [TendPoliciesForcedToolPolicyRecipeId],
  consumedBy: [TendPoliciesMagicContextSelectionRecipeId, TendPoliciesOpenRtkCompressionRecipeId],
  addressSchema: TendPolicyRecipeAddress,
  stateSchema: TendPolicyDecisionSchema,
  modes: ["project", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendMagicContextDecisionResource = defineAlchemyResource({
  id: "tend-policies.magic-context-decision",
  kind: "observation-stream",
  alchemyType: "attune:resource:ObservationStream",
  producedBy: [TendPoliciesMagicContextSelectionRecipeId],
  consumedBy: [TendPoliciesOpenRtkCompressionRecipeId],
  addressSchema: TendPolicyRecipeAddress,
  stateSchema: TendMagicContextDecisionSchema,
  modes: ["project", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendOpenRtkCompressionResource = defineAlchemyResource({
  id: "tend-policies.openrtk-compression-action",
  kind: "report",
  alchemyType: "attune:resource:Report",
  producedBy: [TendPoliciesOpenRtkCompressionRecipeId],
  addressSchema: TendPolicyRecipeAddress,
  stateSchema: TendOpenRtkCompressionActionSchema,
  modes: ["project", "observe"],
})

// @attune-packet-target generated-runtime-projection eligible
export const TendPolicyTestReportResource = defineAlchemyResource({
  id: "tend-policies.test-report",
  kind: "report",
  alchemyType: "attune:resource:Report",
  producedBy: [TendPoliciesTestSuiteRecipeId],
  addressSchema: TendPolicyRecipeAddress,
  stateSchema: TendPolicyRecipeOutput,
  modes: ["check", "observe"],
})

export const tendPoliciesForcedToolPolicyRecipe = defineObservationRecipe({
  id: TendPoliciesForcedToolPolicyRecipeId,
  projectId: "tend-policies",
  title: "Evaluate Tend forced-tool policy as recipe evidence",
  inputSchema: ForcedToolPolicyInput,
  outputSchema: TendPolicyDecisionSchema,
  allowedFiles: [
    "packages/tend/policies/src/index.ts",
    "packages/tend/policies/vitest.config.ts",
  ],
  validationEvidence: ["tend-policies:typecheck"],
  io: {
    inputSchema: ForcedToolPolicyInput,
    outputSchema: TendPolicyDecisionSchema,
    inputResources: [TendPolicyPackageResource],
    outputResources: [TendPolicyDecisionResource],
  },
  handler: defineRecipeHandler<ForcedToolPolicyInput, typeof TendPolicyDecisionSchema.Type>({
    id: tendPoliciesForcedToolPolicyHandlerId,
    recipeId: TendPoliciesForcedToolPolicyRecipeId,
    sourcePath: "packages/tend/policies/src/index.ts",
    exportName: "evaluateForcedToolPolicy",
    handler: (input) =>
      Effect.succeed(evaluateForcedToolPolicy({
        sessionId: input.sessionId,
        requestedTool: input.requestedTool,
        ...(input.recipeId === undefined ? {} : { recipeId: input.recipeId }),
        ...(input.runId === undefined ? {} : { runId: input.runId }),
        ...(input.receiptId === undefined ? {} : { receiptId: input.receiptId }),
        ...(input.observationId === undefined ? {} : { observationId: input.observationId }),
        ...(input.policy === undefined ? {} : { policy: input.policy }),
      })),
    emitsReceipts: ["tend.policy.decision"],
  }),
  alchemyDag: [{
    fromRecipeId: TendPoliciesForcedToolPolicyRecipeId,
    toRecipeId: TendPoliciesMagicContextSelectionRecipeId,
    resource: TendPolicyDecisionResource,
    kind: "observes",
    modes: ["project", "observe"],
    validationTargets: TendPoliciesTypecheckValidationTargets,
  }],
})

// @attune-packet-target generated-runtime-projection eligible
export const tendPoliciesMagicContextSelectionRecipe = defineProjectionRecipe({
  id: TendPoliciesMagicContextSelectionRecipeId,
  title: "Select Magic Context through recipe-linked policy decisions",
  inputSchema: MagicContextSelectionInput,
  outputSchema: TendMagicContextDecisionSchema,
  allowedFiles: ["packages/tend/policies/src/index.ts"],
  validationEvidence: ["tend-policies:typecheck"],
  io: {
    inputSchema: MagicContextSelectionInput,
    outputSchema: TendMagicContextDecisionSchema,
    inputResources: [TendPolicyDecisionResource],
    outputResources: [TendMagicContextDecisionResource],
  },
  handler: defineRecipeHandler<MagicContextSelectionInput, typeof TendMagicContextDecisionSchema.Type>({
    id: tendPoliciesMagicContextSelectionHandlerId,
    recipeId: TendPoliciesMagicContextSelectionRecipeId,
    sourcePath: "packages/tend/policies/src/index.ts",
    exportName: "selectMagicContext",
    handler: (input) =>
      Effect.succeed(selectMagicContext({
        sessionId: input.sessionId,
        policyDecisionId: input.policyDecisionId,
        contextRefs: input.contextRefs,
        maxRetained: input.maxRetained,
        ...(input.recipeId === undefined ? {} : { recipeId: input.recipeId }),
        ...(input.runId === undefined ? {} : { runId: input.runId }),
        ...(input.receiptId === undefined ? {} : { receiptId: input.receiptId }),
        ...(input.observationId === undefined ? {} : { observationId: input.observationId }),
      })),
    emitsReceipts: ["tend.magic-context.decision"],
  }),
  alchemyDag: [{
    fromRecipeId: TendPoliciesMagicContextSelectionRecipeId,
    toRecipeId: TendPoliciesOpenRtkCompressionRecipeId,
    resource: TendMagicContextDecisionResource,
    kind: "projects",
    modes: ["project", "observe"],
    validationTargets: TendPoliciesTypecheckValidationTargets,
  }],
})

// @attune-packet-target generated-runtime-projection eligible
export const tendPoliciesOpenRtkCompressionRecipe = defineProjectionRecipe({
  id: TendPoliciesOpenRtkCompressionRecipeId,
  title: "Project OpenRTK compression actions from policy receipts",
  inputSchema: OpenRtkCompressionInput,
  outputSchema: TendOpenRtkCompressionActionSchema,
  allowedFiles: ["packages/tend/policies/src/index.ts"],
  validationEvidence: ["tend-policies:typecheck"],
  io: {
    inputSchema: OpenRtkCompressionInput,
    outputSchema: TendOpenRtkCompressionActionSchema,
    inputResources: [TendPolicyDecisionResource, TendMagicContextDecisionResource],
    outputResources: [TendOpenRtkCompressionResource],
  },
  handler: defineRecipeHandler<OpenRtkCompressionInput, typeof TendOpenRtkCompressionActionSchema.Type>({
    id: tendPoliciesOpenRtkCompressionHandlerId,
    recipeId: TendPoliciesOpenRtkCompressionRecipeId,
    sourcePath: "packages/tend/policies/src/index.ts",
    exportName: "compressWithOpenRtk",
    handler: (input) =>
      Effect.succeed(compressWithOpenRtk({
        sessionId: input.sessionId,
        command: input.command,
        ...(input.policyDecisionId === undefined ? {} : { policyDecisionId: input.policyDecisionId }),
      })),
    emitsReceipts: ["tend.openrtk.compression"],
  }),
})

export const TendPolicyProductionRecipes = [
  tendPoliciesForcedToolPolicyRecipe,
  tendPoliciesMagicContextSelectionRecipe,
  tendPoliciesOpenRtkCompressionRecipe,
] as const
