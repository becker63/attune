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

export const OxlintPolicyBuildOutput = Schema.Struct({
  entrypoint: Schema.Literal("packages/trellis/oxlint-policy/dist/index.js"),
})
export type OxlintPolicyBuildOutput = typeof OxlintPolicyBuildOutput.Type

export const FrameworkOxlintPolicyRecipes = [
  defineRecipe({
    id: "effect-oxlint-policy.plugin-entrypoint",
    projectId: "effect-oxlint-policy",
    title: "Build the Oxlint JS plugin entrypoint",
    inputSchema: Schema.Struct({
      sourceEntrypoint: Schema.Literal("packages/trellis/oxlint-policy/src/index.ts"),
    }),
    outputSchema: OxlintPolicyBuildOutput,
    nxTarget: "effect-oxlint-policy:build",
    sourcePath: "packages/trellis/oxlint-policy/src/recipes.ts",
    allowedFiles: [
      "packages/trellis/oxlint-policy/src/**",
      "packages/trellis/oxlint-policy/config/**",
      "packages/trellis/oxlint-policy/project.json",
    ],
    validationEvidence: ["effect-oxlint-policy:build", "workspace:policy-fast"],
  }),
  defineRecipe({
    id: "effect-oxlint-policy.policy-pack",
    projectId: "effect-oxlint-policy",
    title: "Run the Attune effect-oxlint policy pack",
    inputSchema: OxlintPolicyRuleInput,
    outputSchema: OxlintPolicyRunOutput,
    nxTarget: "effect-oxlint-policy:policy",
    sourcePath: "packages/trellis/oxlint-policy/src/recipes.ts",
    allowedFiles: [
      "packages/trellis/oxlint-policy/src/**",
      "packages/trellis/oxlint-policy/config/**",
      "packages/trellis/oxlint-policy/project.json",
      "project.json",
    ],
    validationEvidence: [
      "effect-oxlint-policy:policy",
      "effect-oxlint-policy:test",
      "effect-oxlint-policy:build",
    ],
  }),
  defineRecipe({
    id: "effect-oxlint-policy.raw-env-rule",
    projectId: "effect-oxlint-policy",
    title: "Detect raw process.env usage outside adapters",
    inputSchema: OxlintPolicyRuleInput,
    outputSchema: OxlintPolicyRunOutput,
    nxTarget: "effect-oxlint-policy:test",
    sourcePath: "packages/trellis/oxlint-policy/src/recipes.ts",
    allowedFiles: ["packages/trellis/oxlint-policy/**"],
    validationEvidence: ["effect-oxlint-policy:test"],
  }),
  defineRecipe({
    id: "effect-oxlint-policy.raw-node-api-rule",
    projectId: "effect-oxlint-policy",
    title: "Detect raw Node API usage outside adapters",
    inputSchema: OxlintPolicyRuleInput,
    outputSchema: OxlintPolicyRunOutput,
    nxTarget: "effect-oxlint-policy:test",
    sourcePath: "packages/trellis/oxlint-policy/src/recipes.ts",
    allowedFiles: ["packages/trellis/oxlint-policy/**"],
    validationEvidence: ["effect-oxlint-policy:test"],
  }),
  defineRecipe({
    id: "effect-oxlint-policy.architecture-shape-rule",
    projectId: "effect-oxlint-policy",
    title: "Detect hand-authored architecture shapes",
    inputSchema: OxlintPolicyRuleInput,
    outputSchema: OxlintPolicyRunOutput,
    nxTarget: "effect-oxlint-policy:test",
    sourcePath: "packages/trellis/oxlint-policy/src/recipes.ts",
    allowedFiles: ["packages/trellis/oxlint-policy/**", "packages/attune/nx/**"],
    validationEvidence: ["effect-oxlint-policy:test", "workspace:policy-fast"],
  }),
  defineRecipe({
    id: "effect-oxlint-policy.script-workflow-rule",
    projectId: "effect-oxlint-policy",
    title: "Detect package-local scripts containing workflow behavior",
    inputSchema: OxlintPolicyRuleInput,
    outputSchema: OxlintPolicyRunOutput,
    nxTarget: "effect-oxlint-policy:test",
    sourcePath: "packages/trellis/oxlint-policy/src/recipes.ts",
    allowedFiles: [
      "packages/trellis/oxlint-policy/**",
      "packages/**/scripts/**",
    ],
    validationEvidence: ["effect-oxlint-policy:test"],
  }),
  defineRecipe({
    id: "effect-oxlint-policy.nx-target-ownership-rule",
    projectId: "effect-oxlint-policy",
    title: "Detect public Nx targets without recipe or projection ownership",
    inputSchema: OxlintPolicyRuleInput,
    outputSchema: OxlintPolicyRunOutput,
    nxTarget: "effect-oxlint-policy:test",
    sourcePath: "packages/trellis/oxlint-policy/src/recipes.ts",
    allowedFiles: [
      "packages/trellis/oxlint-policy/**",
      "packages/**/project.json",
      "project.json",
    ],
    validationEvidence: ["effect-oxlint-policy:test"],
  }),
  defineRecipe({
    id: "effect-oxlint-policy.private-ledger-rule",
    projectId: "effect-oxlint-policy",
    title: "Detect private ledgers without recipe receipt spine linkage",
    inputSchema: OxlintPolicyRuleInput,
    outputSchema: OxlintPolicyRunOutput,
    nxTarget: "effect-oxlint-policy:test",
    sourcePath: "packages/trellis/oxlint-policy/src/recipes.ts",
    allowedFiles: [
      "packages/trellis/oxlint-policy/**",
      "packages/trellis/runtime/**",
      "packages/tend/**",
    ],
    validationEvidence: ["effect-oxlint-policy:test"],
  }),
  defineRecipe({
    id: "effect-oxlint-policy.managed-recipe-substrate-rule",
    projectId: "effect-oxlint-policy",
    title: "Detect ManagedRecipe declarations without lifecycle substrate provenance",
    inputSchema: OxlintPolicyRuleInput,
    outputSchema: OxlintPolicyRunOutput,
    nxTarget: "effect-oxlint-policy:test",
    sourcePath: "packages/trellis/oxlint-policy/src/recipes.ts",
    allowedFiles: [
      "packages/trellis/oxlint-policy/**",
      "packages/**/src/recipes.ts",
      "packages/trellis/runtime/src/LocalTimescaleRecipe.ts",
    ],
    validationEvidence: ["effect-oxlint-policy:test"],
  }),
  defineRecipe({
    id: "effect-oxlint-policy.generated-artifact-ownership-rule",
    projectId: "effect-oxlint-policy",
    title: "Detect generated artifacts without recipe or projection ownership",
    inputSchema: OxlintPolicyRuleInput,
    outputSchema: OxlintPolicyRunOutput,
    nxTarget: "effect-oxlint-policy:test",
    sourcePath: "packages/trellis/oxlint-policy/src/recipes.ts",
    allowedFiles: [
      "packages/trellis/oxlint-policy/**",
      "packages/**/src/generated/**",
      "packages/**/*.generated.ts",
    ],
    validationEvidence: ["effect-oxlint-policy:test"],
  }),
  defineRecipe({
    id: "effect-oxlint-policy.raw-postgres-boundary-rule",
    projectId: "effect-oxlint-policy",
    title: "Detect raw Postgres clients outside Trellis runtime DB boundaries",
    inputSchema: OxlintPolicyRuleInput,
    outputSchema: OxlintPolicyRunOutput,
    nxTarget: "effect-oxlint-policy:test",
    sourcePath: "packages/trellis/oxlint-policy/src/recipes.ts",
    allowedFiles: [
      "packages/trellis/oxlint-policy/**",
      "packages/trellis/runtime/src/PostgresRecipeReceiptStore.ts",
      "packages/trellis/runtime/src/SqlRoute.ts",
      "packages/trellis/runtime/test/**",
    ],
    validationEvidence: ["effect-oxlint-policy:test"],
  }),
] as const
