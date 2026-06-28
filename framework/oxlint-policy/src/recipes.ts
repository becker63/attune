import { defineRecipe } from "@attune/framework-protocol"
import { Schema } from "effect"

export const OxlintPolicyRuleInput = Schema.Struct({
  filename: Schema.String,
  source: Schema.String,
})
export type OxlintPolicyRuleInput = typeof OxlintPolicyRuleInput.Type

export const OxlintPolicyFinding = Schema.Struct({
  ruleName: Schema.String,
  message: Schema.String,
  accepted: Schema.Boolean,
})
export type OxlintPolicyFinding = typeof OxlintPolicyFinding.Type

export const OxlintPolicyRunOutput = Schema.Struct({
  pluginName: Schema.Literal("attune"),
  findings: Schema.Array(OxlintPolicyFinding),
})
export type OxlintPolicyRunOutput = typeof OxlintPolicyRunOutput.Type

export const FrameworkOxlintPolicyRecipes = [
  defineRecipe({
    id: "effect-oxlint-policy.raw-env-rule",
    projectId: "effect-oxlint-policy",
    title: "Detect raw process.env usage outside adapters",
    inputSchema: OxlintPolicyRuleInput,
    outputSchema: OxlintPolicyRunOutput,
    nxTarget: "effect-oxlint-policy:test",
    sourcePath: "framework/oxlint-policy/src/recipes.ts",
    allowedFiles: ["framework/oxlint-policy/**"],
    validationEvidence: ["effect-oxlint-policy:test"],
  }),
  defineRecipe({
    id: "effect-oxlint-policy.raw-node-api-rule",
    projectId: "effect-oxlint-policy",
    title: "Detect raw Node API usage outside adapters",
    inputSchema: OxlintPolicyRuleInput,
    outputSchema: OxlintPolicyRunOutput,
    nxTarget: "effect-oxlint-policy:test",
    sourcePath: "framework/oxlint-policy/src/recipes.ts",
    allowedFiles: ["framework/oxlint-policy/**"],
    validationEvidence: ["effect-oxlint-policy:test"],
  }),
  defineRecipe({
    id: "effect-oxlint-policy.architecture-shape-rule",
    projectId: "effect-oxlint-policy",
    title: "Detect hand-authored architecture shapes",
    inputSchema: OxlintPolicyRuleInput,
    outputSchema: OxlintPolicyRunOutput,
    nxTarget: "effect-oxlint-policy:test",
    sourcePath: "framework/oxlint-policy/src/recipes.ts",
    allowedFiles: ["framework/oxlint-policy/**", "packages/attune-nx/**"],
    validationEvidence: ["effect-oxlint-policy:test", "workspace:policy-fast"],
  }),
] as const
