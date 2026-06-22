import { Layer, Schema } from "effect"
import {
  defineOperation,
  definePackageContract,
  definePackageViews,
  defineTypeGuidance,
  touches,
} from "@attune/framework-protocol"

export { PackageContractSchema } from "@attune/framework-protocol"

export const PolicyRuleIds = [
  "no-raw-process-env",
  "no-raw-node-apis",
  "no-arbitrary-package-manager-surfaces",
  "no-hand-authored-architecture-shapes",
] as const

export const PolicyRuleId = Schema.Literals(PolicyRuleIds)
export type PolicyRuleId = typeof PolicyRuleId.Type

export const PolicySeverity = Schema.Literals(["problem", "suggestion"] as const)
export type PolicySeverity = typeof PolicySeverity.Type

export const PolicyFinding = Schema.Struct({
  adapterBoundary: Schema.optional(Schema.Boolean),
  filename: Schema.String,
  message: Schema.String,
  nodeKind: Schema.optional(Schema.String),
  ruleFamily: Schema.String,
  ruleId: PolicyRuleId,
  severity: PolicySeverity,
})
export type PolicyFinding = typeof PolicyFinding.Type

export const PolicyRuleOutput = Schema.Struct({
  findings: Schema.Array(PolicyFinding),
  ruleId: PolicyRuleId,
})
export type PolicyRuleOutput = typeof PolicyRuleOutput.Type

export const PolicyRuleError = Schema.Struct({
  message: Schema.String,
  ruleId: PolicyRuleId,
})
export type PolicyRuleError = typeof PolicyRuleError.Type

export const UnsafeEnvProcessAccessInput = Schema.Struct({
  expressionPath: Schema.Array(Schema.String),
  filename: Schema.String,
  nodeKind: Schema.Literal("MemberExpression"),
})
export type UnsafeEnvProcessAccessInput = typeof UnsafeEnvProcessAccessInput.Type

export const DirectNodeApiInput = Schema.Struct({
  callPath: Schema.optional(Schema.Array(Schema.String)),
  filename: Schema.String,
  importSource: Schema.optional(Schema.String),
  nodeKind: Schema.Literals(["ImportDeclaration", "CallExpression"] as const),
})
export type DirectNodeApiInput = typeof DirectNodeApiInput.Type

export const ArbitraryPackageManagerSurfaceInput = Schema.Struct({
  command: Schema.optional(Schema.String),
  filename: Schema.String,
  surfaceKind: Schema.Literals([
    "package-script",
    "run-command",
    "package-manager-invocation",
    "nix-invocation",
    "tool-wrapper",
  ] as const),
})
export type ArbitraryPackageManagerSurfaceInput =
  typeof ArbitraryPackageManagerSurfaceInput.Type

export const NonGeneratedRepeatedShapeInput = Schema.Struct({
  filename: Schema.String,
  generatedBy: Schema.optional(Schema.String),
  shapeKind: Schema.Literals([
    "effect-service",
    "package-contract",
    "atom-view",
    "joern-template",
    "cocoindex-mcp-tool",
  ] as const),
})
export type NonGeneratedRepeatedShapeInput =
  typeof NonGeneratedRepeatedShapeInput.Type

export const PackageViews = definePackageViews({
  reactivityKeys: [
    "effect-oxlint-policy.rule-source.changed",
    "effect-oxlint-policy.oxlint-config.changed",
    "effect-oxlint-policy.adapter-allowlist.changed",
    "effect-oxlint-policy.scanned-source-partitions.changed",
    "effect-oxlint-policy.policy-results.changed",
  ],
  atoms: [
    "policyRuleRegistryAtom",
    "adapterAllowlistAtom",
    "policyResultAtom",
    "ruleFindingAtom",
    "waiverSummaryAtom",
    "rawEnvFindingAtom",
    "rawNodeApiFindingAtom",
    "packageManagerSurfaceFindingAtom",
    "serviceShapeFindingAtom",
  ],
} as const)

const policyRuleLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "determinism.same-input-same-output",
  "side-effect.readonly",
  "policy.finding-schema",
  "policy.deterministic-findings",
  "policy.stable-diagnostic-ids",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

const commonPolicyKeys = [
  "effect-oxlint-policy.rule-source.changed",
  "effect-oxlint-policy.scanned-source-partitions.changed",
  "effect-oxlint-policy.policy-results.changed",
] as const

const commonFindingAtoms = [
  "policyResultAtom",
  "ruleFindingAtom",
] as const

export const noRawProcessEnvOperation = defineOperation({
  id: "no-raw-process-env",
  name: "No raw process.env",
  kind: "policy-rule",
  input: UnsafeEnvProcessAccessInput,
  output: PolicyRuleOutput,
  error: PolicyRuleError,
  views: touches(PackageViews, {
    reactivityKeys: [
      ...commonPolicyKeys,
      "effect-oxlint-policy.adapter-allowlist.changed",
    ],
    atoms: [
      ...commonFindingAtoms,
      "adapterAllowlistAtom",
      "rawEnvFindingAtom",
      "waiverSummaryAtom",
    ],
  } as const),
  laws: policyRuleLaws,
  policy: {
    exportedRule: "noRawProcessEnv",
    findingSchema: "PolicyFinding",
    ruleFamily: "unsafe-env-process-access",
    ruleName: "no-raw-process-env",
  } as const,
} as const)

export const noRawNodeApisOperation = defineOperation({
  id: "no-raw-node-apis",
  name: "No raw Node APIs",
  kind: "policy-rule",
  input: DirectNodeApiInput,
  output: PolicyRuleOutput,
  error: PolicyRuleError,
  views: touches(PackageViews, {
    reactivityKeys: [
      ...commonPolicyKeys,
      "effect-oxlint-policy.adapter-allowlist.changed",
    ],
    atoms: [
      ...commonFindingAtoms,
      "adapterAllowlistAtom",
      "rawNodeApiFindingAtom",
      "waiverSummaryAtom",
    ],
  } as const),
  laws: policyRuleLaws,
  policy: {
    exportedRule: "noRawNodeApis",
    findingSchema: "PolicyFinding",
    rawSources: [
      "fs",
      "fs/promises",
      "node:fs",
      "node:fs/promises",
      "child_process",
      "node:child_process",
      "process",
      "node:process",
    ],
    ruleFamily: "direct-node-api-access",
    ruleName: "no-raw-node-apis",
  } as const,
} as const)

export const noArbitraryPackageManagerSurfacesOperation = defineOperation({
  id: "no-arbitrary-package-manager-surfaces",
  name: "No arbitrary package-manager surfaces",
  kind: "policy-rule",
  input: ArbitraryPackageManagerSurfaceInput,
  output: PolicyRuleOutput,
  error: PolicyRuleError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "effect-oxlint-policy.oxlint-config.changed",
      "effect-oxlint-policy.scanned-source-partitions.changed",
      "effect-oxlint-policy.policy-results.changed",
    ],
    atoms: [
      ...commonFindingAtoms,
      "packageManagerSurfaceFindingAtom",
      "waiverSummaryAtom",
    ],
  } as const),
  laws: policyRuleLaws,
  policy: {
    exportedRule: null,
    findingSchema: "PolicyFinding",
    ruleFamily: "arbitrary-package-manager-script-surfaces",
    ruleName: "no-arbitrary-package-manager-surfaces",
  } as const,
} as const)

export const noHandAuthoredArchitectureShapesOperation = defineOperation({
  id: "no-hand-authored-architecture-shapes",
  name: "No hand-authored architecture shapes",
  kind: "policy-rule",
  input: NonGeneratedRepeatedShapeInput,
  output: PolicyRuleOutput,
  error: PolicyRuleError,
  views: touches(PackageViews, {
    reactivityKeys: [
      ...commonPolicyKeys,
    ],
    atoms: [
      ...commonFindingAtoms,
      "serviceShapeFindingAtom",
      "waiverSummaryAtom",
    ],
  } as const),
  laws: policyRuleLaws,
  policy: {
    exportedRule: "noHandAuthoredArchitectureShapes",
    findingSchema: "PolicyFinding",
    ruleFamily: "non-generated-repeated-shapes",
    ruleName: "no-hand-authored-architecture-shapes",
    requiredGenerator: "@attune/nx",
  } as const,
} as const)

export const PackageContract = definePackageContract({
  packageId: "effect-oxlint-policy",
  sourceRoot: "packages/effect-oxlint-policy",
  packageKind: "policy-plugin",
  views: PackageViews,
  services: [] as const,
  operations: [
    noRawProcessEnvOperation,
    noRawNodeApisOperation,
    noArbitraryPackageManagerSurfacesOperation,
    noHandAuthoredArchitectureShapesOperation,
  ] as const,
  provenance: {
    generator: "@attune/nx:package-contract",
    project: "effect-oxlint-policy",
  } as const,
  waivers: [
    {
      id: "effect-oxlint-policy/no-arbitrary-package-manager-surfaces-runtime",
      category: "legacy-boundary",
      owner: "effect-oxlint-policy-migration-agent",
      reason:
        "The package contract reserves the policy-rule boundary requested by Phase 4; the concrete oxlint rule is owned by the command-surface policy follow-up.",
      review: "standardize-effect-package-contracts phase4 tooling-command-surface-agent",
    },
  ] as const,
})
export type PackageContract = typeof PackageContract

export const PackageLayer = Layer.empty
export type PackageLayer = typeof PackageLayer

export const PackageTestLayer = Layer.empty
export type PackageTestLayer = typeof PackageTestLayer

export const PackageFuzzHandlers = {
  "no-raw-process-env": () => ({
    findings: [] as readonly PolicyFinding[],
    ruleId: "no-raw-process-env" as const,
  }),
  "no-raw-node-apis": () => ({
    findings: [] as readonly PolicyFinding[],
    ruleId: "no-raw-node-apis" as const,
  }),
  "no-arbitrary-package-manager-surfaces": () => ({
    findings: [] as readonly PolicyFinding[],
    ruleId: "no-arbitrary-package-manager-surfaces" as const,
  }),
  "no-hand-authored-architecture-shapes": () => ({
    findings: [] as readonly PolicyFinding[],
    ruleId: "no-hand-authored-architecture-shapes" as const,
  }),
} as const
export type PackageFuzzHandlers = typeof PackageFuzzHandlers

export const PackageProperties = {
  "no-raw-process-env": {
    property: "Schema-derived env access fixtures produce stable policy findings.",
  },
  "no-raw-node-apis": {
    property: "Schema-derived Node API fixtures produce stable policy findings.",
  },
  "no-arbitrary-package-manager-surfaces": {
    property:
      "Schema-derived command surface fixtures produce stable policy findings.",
  },
  "no-hand-authored-architecture-shapes": {
    property:
      "Schema-derived repeated-shape fixtures require @attune/nx generator provenance.",
  },
} as const
export type PackageProperties = typeof PackageProperties

const policyLawPartitions = policyRuleLaws.map((id) => ({
  id,
  kind: "law" as const,
  from: "inferred-law",
}))

const policySchemaSources = (
  operationId: PolicyRuleId,
  inputLabel: string,
) => [
  {
    id: `schema:${operationId}:input`,
    role: "input" as const,
    label: inputLabel,
    source: "effect-schema",
  },
  {
    id: `schema:${operationId}:output`,
    role: "output" as const,
    label: "PolicyRuleOutput",
    source: "effect-schema",
  },
  {
    id: `schema:${operationId}:error`,
    role: "error" as const,
    label: "PolicyRuleError",
    source: "effect-schema",
  },
] as const

export const PackageTypeGuidance = defineTypeGuidance(PackageContract, {
  sourceLabels: [
    "contract.operation",
    "effect-schema.ast",
    "operation.kind.policy-rule",
    "policy-metadata",
    "declared-view",
  ],
  sources: [
    {
      id: "contract:effect-oxlint-policy",
      label: "effect-oxlint-policy package contract",
      kind: "contract-operation",
    },
  ],
  operations: {
    "no-raw-process-env": {
      sourceLabels: [
        "operation.kind.policy-rule",
        "effect-schema.ast",
        "policy-metadata.raw-env",
      ],
      schemaSources: policySchemaSources(
        "no-raw-process-env",
        "UnsafeEnvProcessAccessInput",
      ),
      inputPartitions: [
        {
          id: "raw-env.member-expression",
          kind: "schema-literal",
          from: "schema.nodeKind",
          sourceId: "schema:no-raw-process-env:input",
        },
        {
          id: "raw-env.adapter-allowlist",
          kind: "policy-finding",
          from: "policy.adapter-boundary",
        },
      ],
      outputPartitions: [
        {
          id: "raw-env.findings.none",
          kind: "output-variant",
          from: "policy.findings.empty",
        },
        {
          id: "raw-env.findings.present",
          kind: "policy-finding",
          from: "policy.findings.nonempty",
        },
      ],
      errorPartitions: [
        {
          id: "raw-env.error.message",
          kind: "typed-error-variant",
          from: "schema.error",
        },
      ],
      lawPartitions: policyLawPartitions,
      viewPartitions: [
        {
          id: "effect-oxlint-policy.policy-results.changed.moves",
          kind: "reactivity-key",
          from: "touches.reactivity-key",
        },
        {
          id: "rawEnvFindingAtom.moves",
          kind: "atom",
          from: "touches.atom",
        },
      ],
      coverageSearch: [
        {
          id: "coverage:no-raw-process-env:allowed-and-rejected",
          targetPartitionId: "raw-env.adapter-allowlist",
          tier: "commit",
          required: true,
          priority: 10,
          reason:
            "Policy evidence must exercise both approved adapter and rejected raw process.env paths.",
        },
      ],
    },
    "no-raw-node-apis": {
      sourceLabels: [
        "operation.kind.policy-rule",
        "effect-schema.ast",
        "policy-metadata.raw-node",
      ],
      schemaSources: policySchemaSources(
        "no-raw-node-apis",
        "DirectNodeApiInput",
      ),
      inputPartitions: [
        {
          id: "raw-node.import-source",
          kind: "schema-field",
          from: "schema.optional-field",
          sourceId: "schema:no-raw-node-apis:input",
        },
        {
          id: "raw-node.process-call",
          kind: "schema-branch",
          from: "schema.nodeKind",
          sourceId: "schema:no-raw-node-apis:input",
        },
      ],
      outputPartitions: [
        {
          id: "raw-node.findings.none",
          kind: "output-variant",
          from: "policy.findings.empty",
        },
        {
          id: "raw-node.findings.present",
          kind: "policy-finding",
          from: "policy.findings.nonempty",
        },
      ],
      errorPartitions: [
        {
          id: "raw-node.error.message",
          kind: "typed-error-variant",
          from: "schema.error",
        },
      ],
      lawPartitions: policyLawPartitions,
      viewPartitions: [
        {
          id: "effect-oxlint-policy.policy-results.changed.moves",
          kind: "reactivity-key",
          from: "touches.reactivity-key",
        },
        {
          id: "rawNodeApiFindingAtom.moves",
          kind: "atom",
          from: "touches.atom",
        },
      ],
      coverageSearch: [
        {
          id: "coverage:no-raw-node-apis:imports-and-calls",
          targetPartitionId: "raw-node.process-call",
          tier: "commit",
          required: true,
          priority: 10,
          reason:
            "Policy evidence must reach both raw import and process call visitors.",
        },
      ],
    },
    "no-arbitrary-package-manager-surfaces": {
      sourceLabels: [
        "operation.kind.policy-rule",
        "effect-schema.ast",
        "policy-metadata.command-surface",
      ],
      schemaSources: policySchemaSources(
        "no-arbitrary-package-manager-surfaces",
        "ArbitraryPackageManagerSurfaceInput",
      ),
      inputPartitions: [
        {
          id: "command-surface.package-script",
          kind: "schema-literal",
          from: "schema.surfaceKind",
          sourceId: "schema:no-arbitrary-package-manager-surfaces:input",
        },
        {
          id: "command-surface.run-command",
          kind: "schema-literal",
          from: "schema.surfaceKind",
          sourceId: "schema:no-arbitrary-package-manager-surfaces:input",
        },
      ],
      outputPartitions: [
        {
          id: "command-surface.findings.none",
          kind: "output-variant",
          from: "policy.findings.empty",
        },
        {
          id: "command-surface.findings.present",
          kind: "policy-finding",
          from: "policy.findings.nonempty",
        },
      ],
      errorPartitions: [
        {
          id: "command-surface.error.message",
          kind: "typed-error-variant",
          from: "schema.error",
        },
      ],
      lawPartitions: policyLawPartitions,
      viewPartitions: [
        {
          id: "effect-oxlint-policy.oxlint-config.changed.moves",
          kind: "reactivity-key",
          from: "touches.reactivity-key",
        },
        {
          id: "packageManagerSurfaceFindingAtom.moves",
          kind: "atom",
          from: "touches.atom",
        },
      ],
      coverageSearch: [
        {
          id: "coverage:no-arbitrary-package-manager-surfaces:script-forms",
          targetPartitionId: "command-surface.package-script",
          tier: "commit",
          required: true,
          priority: 9,
          reason:
            "Policy evidence must bias toward direct package-manager and script command surfaces.",
        },
      ],
    },
    "no-hand-authored-architecture-shapes": {
      sourceLabels: [
        "operation.kind.policy-rule",
        "effect-schema.ast",
        "policy-metadata.generator-use",
      ],
      schemaSources: policySchemaSources(
        "no-hand-authored-architecture-shapes",
        "NonGeneratedRepeatedShapeInput",
      ),
      inputPartitions: [
        {
          id: "shape.effect-service",
          kind: "schema-literal",
          from: "schema.shapeKind",
          sourceId: "schema:no-hand-authored-architecture-shapes:input",
        },
        {
          id: "shape.generator-provenance",
          kind: "generator-provenance",
          from: "policy.required-generator",
        },
      ],
      outputPartitions: [
        {
          id: "shape.findings.none",
          kind: "output-variant",
          from: "policy.findings.empty",
        },
        {
          id: "shape.findings.present",
          kind: "policy-finding",
          from: "policy.findings.nonempty",
        },
      ],
      errorPartitions: [
        {
          id: "shape.error.message",
          kind: "typed-error-variant",
          from: "schema.error",
        },
      ],
      lawPartitions: policyLawPartitions,
      viewPartitions: [
        {
          id: "effect-oxlint-policy.policy-results.changed.moves",
          kind: "reactivity-key",
          from: "touches.reactivity-key",
        },
        {
          id: "serviceShapeFindingAtom.moves",
          kind: "atom",
          from: "touches.atom",
        },
      ],
      coverageSearch: [
        {
          id: "coverage:no-hand-authored-architecture-shapes:generator-use",
          targetPartitionId: "shape.generator-provenance",
          tier: "commit",
          required: true,
          priority: 10,
          reason:
            "Generator-use policy evidence must distinguish generated @attune/nx homes from hand-authored repeated shapes.",
        },
      ],
    },
  },
} as const)
export type PackageTypeGuidance = typeof PackageTypeGuidance
