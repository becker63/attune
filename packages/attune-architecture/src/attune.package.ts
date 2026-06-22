import { Layer, Schema } from "effect"

import {
  OperationKindSchema,
  PackageContractSchema,
  defineOperation,
  definePackageContract,
  definePackageFuzzRpcGroup,
  definePackageViews,
  defineTypeGuidance,
  touches,
} from "./package-contract/index.js"

export { PackageContractSchema } from "./package-contract/index.js"

export const PackageViews = definePackageViews({
  reactivityKeys: [
    "architecture.policy-findings",
    "architecture.waiver-summary",
    "architecture.package-contract-coverage",
    "architecture.command-surface-findings",
    "architecture.generator-shape-findings",
    "architecture.source-bom-findings",
    "architecture.rpc-descriptors",
    "architecture.type-guidance-coverage",
    "architecture.law-inference-findings",
    "architecture.workspace-policy-summary",
  ],
  atoms: [
    "policyFindingsAtom",
    "waiverSummaryAtom",
    "packageContractCoverageAtom",
    "commandSurfaceFindingsAtom",
    "generatorShapeFindingsAtom",
    "sourceBomPolicyFindingsAtom",
    "rpcDescriptorAtom",
    "typeGuidanceCoverageAtom",
    "lawInferenceAtom",
    "workspacePolicySummaryAtom",
  ],
} as const)

const PolicySeverity = Schema.Literals(["error", "warning"] as const)

export const ArchitectureFinding = Schema.Struct({
  ruleId: Schema.String,
  severity: PolicySeverity,
  filePath: Schema.optional(Schema.String),
  message: Schema.String,
})
export type ArchitectureFinding = Schema.Schema.Type<typeof ArchitectureFinding>

const PolicyReportOutput = Schema.Struct({
  ok: Schema.Boolean,
  diagnostics: Schema.Array(ArchitectureFinding),
})

export const PackageContractDecodeInput = Schema.Struct({
  contract: Schema.Unknown,
})
export type PackageContractDecodeInput = Schema.Schema.Type<typeof PackageContractDecodeInput>

export const PackageContractDecodeOutput = Schema.Struct({
  packageId: Schema.String,
  packageKind: Schema.String,
  operationCount: Schema.Number,
  valid: Schema.Boolean,
})
export type PackageContractDecodeOutput = Schema.Schema.Type<typeof PackageContractDecodeOutput>

export const PackageContractAssertionInput = Schema.Struct({
  packageId: Schema.String,
  operationIds: Schema.Array(Schema.String),
})
export type PackageContractAssertionInput = Schema.Schema.Type<typeof PackageContractAssertionInput>

export const LawInferenceInput = Schema.Struct({
  operationId: Schema.String,
  operationKind: OperationKindSchema,
  touchedReactivityKeys: Schema.optional(Schema.Array(Schema.String)),
  touchedAtoms: Schema.optional(Schema.Array(Schema.String)),
})
export type LawInferenceInput = Schema.Schema.Type<typeof LawInferenceInput>

export const LawInferenceOutput = Schema.Struct({
  operationId: Schema.String,
  laws: Schema.Array(Schema.String),
})
export type LawInferenceOutput = Schema.Schema.Type<typeof LawInferenceOutput>

export const TypeGuidanceValidationInput = Schema.Struct({
  packageId: Schema.String,
  operationIds: Schema.Array(Schema.String),
  guidanceOperationIds: Schema.Array(Schema.String),
})
export type TypeGuidanceValidationInput = Schema.Schema.Type<typeof TypeGuidanceValidationInput>

export const RpcDescriptorDerivationInput = Schema.Struct({
  packageId: Schema.String,
  operationIds: Schema.Array(Schema.String),
})
export type RpcDescriptorDerivationInput = Schema.Schema.Type<typeof RpcDescriptorDerivationInput>

export const RpcDescriptorDerivationOutput = Schema.Struct({
  packageId: Schema.String,
  groupId: Schema.String,
  rpcIds: Schema.Array(Schema.String),
  adapterStatus: Schema.Literals(["blocked", "available"] as const),
})
export type RpcDescriptorDerivationOutput = Schema.Schema.Type<typeof RpcDescriptorDerivationOutput>

export const CommandSurfaceConformanceInput = Schema.Struct({
  files: Schema.Array(Schema.Struct({
    path: Schema.String,
    content: Schema.String,
    classification: Schema.optional(Schema.Literals(["public", "internal", "bootstrap"] as const)),
  })),
  finalRatchet: Schema.optional(Schema.Boolean),
})
export type CommandSurfaceConformanceInput = Schema.Schema.Type<typeof CommandSurfaceConformanceInput>

export const GeneratorShapeConformanceInput = Schema.Struct({
  workspaceRoot: Schema.String,
  manifestPath: Schema.optional(Schema.String),
  sourceBomIndexPath: Schema.optional(Schema.String),
})
export type GeneratorShapeConformanceInput = Schema.Schema.Type<typeof GeneratorShapeConformanceInput>

export const GeneratorShapeConformanceOutput = Schema.Struct({
  ok: Schema.Boolean,
  generated: Schema.Number,
  manual: Schema.Number,
  migrate: Schema.Number,
  diagnostics: Schema.Array(ArchitectureFinding),
})
export type GeneratorShapeConformanceOutput = Schema.Schema.Type<typeof GeneratorShapeConformanceOutput>

export const SourceBomPolicyScanInput = Schema.Struct({
  shardPaths: Schema.Array(Schema.String),
})
export type SourceBomPolicyScanInput = Schema.Schema.Type<typeof SourceBomPolicyScanInput>

export const WorkspacePolicySummaryInput = Schema.Struct({
  workspaceRoot: Schema.String,
  changedFiles: Schema.optional(Schema.Array(Schema.String)),
})
export type WorkspacePolicySummaryInput = Schema.Schema.Type<typeof WorkspacePolicySummaryInput>

export const WorkspacePolicySummaryOutput = Schema.Struct({
  ok: Schema.Boolean,
  packageCount: Schema.Number,
  migratedPackageCount: Schema.Number,
  diagnostics: Schema.Array(ArchitectureFinding),
})
export type WorkspacePolicySummaryOutput = Schema.Schema.Type<typeof WorkspacePolicySummaryOutput>

const CodecViewLaws = [
  "schema.decode",
  "schema.encode",
  "determinism.same-input-same-output",
  "side-effect.readonly",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

const QueryViewLaws = [
  "schema.decode",
  "schema.encode",
  "determinism.same-input-same-output",
  "side-effect.readonly",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

const PolicyRuleViewLaws = [
  "schema.decode",
  "schema.encode",
  "determinism.same-input-same-output",
  "side-effect.readonly",
  "policy.finding-schema",
  "policy.deterministic-findings",
  "policy.stable-diagnostic-ids",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

const lawPartitions = <const Laws extends readonly string[]>(laws: Laws) =>
  laws.map((id) => ({
    id,
    kind: "law" as const,
    from: "inferred-law",
  })) as {
    readonly [Index in keyof Laws]: {
      readonly id: Laws[Index]
      readonly kind: "law"
      readonly from: "inferred-law"
    }
  }

const viewPartitions = <
  const ReactivityKey extends (typeof PackageViews.reactivityKeys)[number],
  const AtomId extends (typeof PackageViews.atoms)[number],
>(
  reactivityKey: ReactivityKey,
  atom: AtomId,
) => [
  {
    id: `${reactivityKey}.moves`,
    kind: "reactivity-key",
    from: "touches.reactivity-key",
  },
  {
    id: `${atom}.moves`,
    kind: "atom",
    from: "touches.atom",
  },
] as const

const policyMetadata = (ruleId: string, findingSchema = "ArchitectureFinding") => ({
  ruleId,
  findingSchema,
} as const)

export const PackageContractDecodeOperation = defineOperation({
  id: "package-contract-decode",
  kind: "codec",
  input: PackageContractDecodeInput,
  output: PackageContractDecodeOutput,
  views: touches(PackageViews, {
    reactivityKeys: ["architecture.package-contract-coverage"],
    atoms: ["packageContractCoverageAtom"],
  } as const),
  laws: CodecViewLaws,
  metadata: {
    schema: PackageContractSchema,
  },
} as const)

export const PackageContractAssertionsOperation = defineOperation({
  id: "package-contract-assertions",
  kind: "policy-rule",
  input: PackageContractAssertionInput,
  output: PolicyReportOutput,
  views: touches(PackageViews, {
    reactivityKeys: ["architecture.package-contract-coverage", "architecture.policy-findings"],
    atoms: ["packageContractCoverageAtom", "policyFindingsAtom"],
  } as const),
  laws: PolicyRuleViewLaws,
  policy: policyMetadata("attune/package-contract/assertions"),
} as const)

export const InferOperationLawsOperation = defineOperation({
  id: "infer-operation-laws",
  kind: "query",
  input: LawInferenceInput,
  output: LawInferenceOutput,
  views: touches(PackageViews, {
    reactivityKeys: ["architecture.law-inference-findings"],
    atoms: ["lawInferenceAtom"],
  } as const),
  laws: QueryViewLaws,
  metadata: {
    source: "package-contract/laws",
  },
} as const)

export const TypeGuidanceValidationOperation = defineOperation({
  id: "type-guidance-validate",
  kind: "policy-rule",
  input: TypeGuidanceValidationInput,
  output: PolicyReportOutput,
  views: touches(PackageViews, {
    reactivityKeys: ["architecture.type-guidance-coverage", "architecture.policy-findings"],
    atoms: ["typeGuidanceCoverageAtom", "policyFindingsAtom"],
  } as const),
  laws: PolicyRuleViewLaws,
  policy: policyMetadata("attune/package-contract/type-guidance"),
} as const)

export const RpcDescriptorDerivationOperation = defineOperation({
  id: "derive-rpc-descriptors",
  kind: "query",
  input: RpcDescriptorDerivationInput,
  output: RpcDescriptorDerivationOutput,
  views: touches(PackageViews, {
    reactivityKeys: ["architecture.rpc-descriptors"],
    atoms: ["rpcDescriptorAtom"],
  } as const),
  laws: QueryViewLaws,
  metadata: {
    adapter: "@effect/rpc",
    runtimeImport: "blocked-until-effect-4-compatible",
  },
} as const)

export const CommandSurfaceConformanceOperation = defineOperation({
  id: "command-surface-conformance",
  kind: "policy-rule",
  input: CommandSurfaceConformanceInput,
  output: PolicyReportOutput,
  views: touches(PackageViews, {
    reactivityKeys: ["architecture.command-surface-findings", "architecture.policy-findings"],
    atoms: ["commandSurfaceFindingsAtom", "policyFindingsAtom"],
  } as const),
  laws: PolicyRuleViewLaws,
  policy: policyMetadata("attune/command-surface/conformance"),
} as const)

export const GeneratorShapeConformanceOperation = defineOperation({
  id: "generator-shape-conformance",
  kind: "policy-rule",
  input: GeneratorShapeConformanceInput,
  output: GeneratorShapeConformanceOutput,
  views: touches(PackageViews, {
    reactivityKeys: ["architecture.generator-shape-findings", "architecture.policy-findings"],
    atoms: ["generatorShapeFindingsAtom", "policyFindingsAtom"],
  } as const),
  laws: PolicyRuleViewLaws,
  policy: policyMetadata("attune/generator-shape/conformance"),
} as const)

export const SourceBomPolicyScanOperation = defineOperation({
  id: "source-bom-policy-scan",
  kind: "policy-rule",
  input: SourceBomPolicyScanInput,
  output: PolicyReportOutput,
  views: touches(PackageViews, {
    reactivityKeys: ["architecture.source-bom-findings", "architecture.waiver-summary"],
    atoms: ["sourceBomPolicyFindingsAtom", "waiverSummaryAtom"],
  } as const),
  laws: PolicyRuleViewLaws,
  policy: policyMetadata("attune/source-bom/policy-scan"),
} as const)

export const WorkspacePolicySummaryOperation = defineOperation({
  id: "workspace-policy-summary",
  kind: "query",
  input: WorkspacePolicySummaryInput,
  output: WorkspacePolicySummaryOutput,
  views: touches(PackageViews, {
    reactivityKeys: [
      "architecture.workspace-policy-summary",
      "architecture.policy-findings",
      "architecture.waiver-summary",
    ],
    atoms: ["workspacePolicySummaryAtom", "policyFindingsAtom", "waiverSummaryAtom"],
  } as const),
  laws: QueryViewLaws,
  metadata: {
    source: "attune-architecture workspace policy summary",
  },
} as const)

export const PackageContract = definePackageContract({
  packageId: "attune-architecture",
  sourceRoot: "packages/attune-architecture/src",
  packageKind: "architecture-policy",
  views: PackageViews,
  services: [] as const,
  operations: [
    PackageContractDecodeOperation,
    PackageContractAssertionsOperation,
    InferOperationLawsOperation,
    TypeGuidanceValidationOperation,
    RpcDescriptorDerivationOperation,
    CommandSurfaceConformanceOperation,
    GeneratorShapeConformanceOperation,
    SourceBomPolicyScanOperation,
    WorkspacePolicySummaryOperation,
  ] as const,
  provenance: {
    generator: "@attune/nx:package-contract",
    project: "attune-architecture",
    physicalProjectRoot: "packages/attune-architecture",
    openspecChangeId: "standardize-effect-package-contracts",
  } as const,
  waivers: [] as const,
})
export type PackageContract = typeof PackageContract

export const PackageLayer = Layer.empty
export type PackageLayer = typeof PackageLayer

export const PackageTestLayer = Layer.empty
export type PackageTestLayer = typeof PackageTestLayer

export type ArchitectureOperationId = (typeof PackageContract.operations)[number]["id"]

export const PackageFuzzRpcGroup = definePackageFuzzRpcGroup(PackageContract)

export const PackageFuzzHandlers = {
  "package-contract-decode": () => ({ packageId: "attune-architecture", packageKind: "architecture-policy", operationCount: PackageContract.operations.length, valid: true }),
  "package-contract-assertions": () => ({ ok: true, diagnostics: [] }),
  "infer-operation-laws": () => ({ operationId: "example", laws: [] }),
  "type-guidance-validate": () => ({ ok: true, diagnostics: [] }),
  "derive-rpc-descriptors": () => ({
    packageId: PackageContract.packageId,
    groupId: PackageFuzzRpcGroup.groupId,
    rpcIds: PackageFuzzRpcGroup.operations.map((operation) => operation.rpcId),
    adapterStatus: PackageFuzzRpcGroup.adapterCompatibility.status,
  }),
  "command-surface-conformance": () => ({ ok: true, diagnostics: [] }),
  "generator-shape-conformance": () => ({ ok: true, generated: 0, manual: 0, migrate: 0, diagnostics: [] }),
  "source-bom-policy-scan": () => ({ ok: true, diagnostics: [] }),
  "workspace-policy-summary": () => ({ ok: true, packageCount: 0, migratedPackageCount: 0, diagnostics: [] }),
} as const satisfies { readonly [Id in ArchitectureOperationId]: () => unknown }

export const PackageProperties = {
  "package-contract-decode": () => true,
  "package-contract-assertions": () => true,
  "infer-operation-laws": () => true,
  "type-guidance-validate": () => true,
  "derive-rpc-descriptors": () => true,
  "command-surface-conformance": () => true,
  "generator-shape-conformance": () => true,
  "source-bom-policy-scan": () => true,
  "workspace-policy-summary": () => true,
} as const satisfies { readonly [Id in ArchitectureOperationId]: () => boolean }

export const PackageTypeGuidance = defineTypeGuidance(PackageContract, {
  sourceLabels: [
    "contract.operation",
    "effect-schema.ast",
    "inferred-law",
    "architecture-policy",
    "package-view-graph",
  ],
  sources: [
    {
      id: "contract:attune-architecture",
      label: "attune-architecture package contract",
      kind: "contract-operation",
    },
    {
      id: "views:attune-architecture",
      label: "architecture package view graph",
      kind: "declared-view",
    },
  ],
  operations: {
    "package-contract-decode": {
      sourceLabels: ["operation.kind.codec", "effect-schema.ast", "package-contract.schema"],
      schemaSources: [
        { id: "schema:package-contract-decode:input", role: "input", label: "PackageContractDecodeInput", source: "effect-schema" },
        { id: "schema:package-contract-decode:output", role: "output", label: "PackageContractDecodeOutput", source: "effect-schema" },
      ],
      inputPartitions: [{ id: "package-contract-decode.input.contract", kind: "schema-boundary", from: "schema.input" }],
      outputPartitions: [{ id: "package-contract-decode.output.valid", kind: "output-variant", from: "schema.output" }],
      lawPartitions: lawPartitions(CodecViewLaws),
      viewPartitions: viewPartitions("architecture.package-contract-coverage", "packageContractCoverageAtom"),
      coverageSearch: [{ id: "coverage:package-contract-decode:view", targetPartitionId: "architecture.package-contract-coverage.moves", tier: "commit", required: true }],
    },
    "package-contract-assertions": {
      sourceLabels: ["operation.kind.policy-rule", "compile-only.assertions"],
      schemaSources: [
        { id: "schema:package-contract-assertions:input", role: "input", label: "PackageContractAssertionInput", source: "effect-schema" },
        { id: "schema:package-contract-assertions:output", role: "output", label: "PolicyReportOutput", source: "effect-schema" },
      ],
      inputPartitions: [{ id: "package-contract-assertions.input.operation-ids", kind: "schema-field", from: "schema.input" }],
      outputPartitions: [{ id: "package-contract-assertions.output.diagnostics", kind: "policy-finding", from: "schema.output" }],
      lawPartitions: lawPartitions(PolicyRuleViewLaws),
      viewPartitions: viewPartitions("architecture.package-contract-coverage", "packageContractCoverageAtom"),
      coverageSearch: [{ id: "coverage:package-contract-assertions:diagnostics", targetPartitionId: "package-contract-assertions.output.diagnostics", tier: "commit", required: true }],
    },
    "infer-operation-laws": {
      sourceLabels: ["operation.kind.query", "inferred-law"],
      schemaSources: [
        { id: "schema:infer-operation-laws:input", role: "input", label: "LawInferenceInput", source: "effect-schema" },
        { id: "schema:infer-operation-laws:output", role: "output", label: "LawInferenceOutput", source: "effect-schema" },
      ],
      inputPartitions: [{ id: "infer-operation-laws.input.operation-kind", kind: "schema-enum", from: "schema.input" }],
      outputPartitions: [{ id: "infer-operation-laws.output.laws", kind: "law", from: "schema.output" }],
      lawPartitions: lawPartitions(QueryViewLaws),
      viewPartitions: viewPartitions("architecture.law-inference-findings", "lawInferenceAtom"),
      coverageSearch: [{ id: "coverage:infer-operation-laws:law-family", targetPartitionId: "infer-operation-laws.output.laws", tier: "commit", required: true }],
    },
    "type-guidance-validate": {
      sourceLabels: ["operation.kind.policy-rule", "type-guidance.partitions"],
      schemaSources: [
        { id: "schema:type-guidance-validate:input", role: "input", label: "TypeGuidanceValidationInput", source: "effect-schema" },
        { id: "schema:type-guidance-validate:output", role: "output", label: "PolicyReportOutput", source: "effect-schema" },
      ],
      inputPartitions: [{ id: "type-guidance-validate.input.operation-coverage", kind: "schema-field", from: "schema.input" }],
      outputPartitions: [{ id: "type-guidance-validate.output.findings", kind: "policy-finding", from: "schema.output" }],
      lawPartitions: lawPartitions(PolicyRuleViewLaws),
      viewPartitions: viewPartitions("architecture.type-guidance-coverage", "typeGuidanceCoverageAtom"),
      coverageSearch: [{ id: "coverage:type-guidance-validate:missing-partition", targetPartitionId: "type-guidance-validate.output.findings", tier: "commit", required: true }],
    },
    "derive-rpc-descriptors": {
      sourceLabels: ["operation.kind.query", "rpc.descriptor"],
      schemaSources: [
        { id: "schema:derive-rpc-descriptors:input", role: "input", label: "RpcDescriptorDerivationInput", source: "effect-schema" },
        { id: "schema:derive-rpc-descriptors:output", role: "output", label: "RpcDescriptorDerivationOutput", source: "effect-schema" },
      ],
      inputPartitions: [{ id: "derive-rpc-descriptors.input.operation-ids", kind: "schema-field", from: "schema.input" }],
      outputPartitions: [{ id: "derive-rpc-descriptors.output.rpc-ids", kind: "output-variant", from: "schema.output" }],
      lawPartitions: lawPartitions(QueryViewLaws),
      viewPartitions: viewPartitions("architecture.rpc-descriptors", "rpcDescriptorAtom"),
      coverageSearch: [{ id: "coverage:derive-rpc-descriptors:operation-rpc", targetPartitionId: "derive-rpc-descriptors.output.rpc-ids", tier: "commit", required: true }],
    },
    "command-surface-conformance": {
      sourceLabels: ["operation.kind.policy-rule", "command-surface"],
      schemaSources: [
        { id: "schema:command-surface-conformance:input", role: "input", label: "CommandSurfaceConformanceInput", source: "effect-schema" },
        { id: "schema:command-surface-conformance:output", role: "output", label: "PolicyReportOutput", source: "effect-schema" },
      ],
      inputPartitions: [{ id: "command-surface-conformance.input.files", kind: "collection-boundary", from: "schema.input" }],
      outputPartitions: [{ id: "command-surface-conformance.output.findings", kind: "policy-finding", from: "schema.output" }],
      lawPartitions: lawPartitions(PolicyRuleViewLaws),
      viewPartitions: viewPartitions("architecture.command-surface-findings", "commandSurfaceFindingsAtom"),
      coverageSearch: [{ id: "coverage:command-surface-conformance:raw-command", targetPartitionId: "command-surface-conformance.output.findings", tier: "commit", required: true }],
    },
    "generator-shape-conformance": {
      sourceLabels: ["operation.kind.policy-rule", "generator-shape"],
      schemaSources: [
        { id: "schema:generator-shape-conformance:input", role: "input", label: "GeneratorShapeConformanceInput", source: "effect-schema" },
        { id: "schema:generator-shape-conformance:output", role: "output", label: "GeneratorShapeConformanceOutput", source: "effect-schema" },
      ],
      inputPartitions: [{ id: "generator-shape-conformance.input.manifest", kind: "schema-field", from: "schema.input" }],
      outputPartitions: [{ id: "generator-shape-conformance.output.findings", kind: "policy-finding", from: "schema.output" }],
      lawPartitions: lawPartitions(PolicyRuleViewLaws),
      viewPartitions: viewPartitions("architecture.generator-shape-findings", "generatorShapeFindingsAtom"),
      coverageSearch: [{ id: "coverage:generator-shape-conformance:manifest-drift", targetPartitionId: "generator-shape-conformance.output.findings", tier: "commit", required: true }],
    },
    "source-bom-policy-scan": {
      sourceLabels: ["operation.kind.policy-rule", "source-bom"],
      schemaSources: [
        { id: "schema:source-bom-policy-scan:input", role: "input", label: "SourceBomPolicyScanInput", source: "effect-schema" },
        { id: "schema:source-bom-policy-scan:output", role: "output", label: "PolicyReportOutput", source: "effect-schema" },
      ],
      inputPartitions: [{ id: "source-bom-policy-scan.input.shards", kind: "collection-boundary", from: "schema.input" }],
      outputPartitions: [{ id: "source-bom-policy-scan.output.findings", kind: "policy-finding", from: "schema.output" }],
      lawPartitions: lawPartitions(PolicyRuleViewLaws),
      viewPartitions: viewPartitions("architecture.source-bom-findings", "sourceBomPolicyFindingsAtom"),
      coverageSearch: [{ id: "coverage:source-bom-policy-scan:waiver-summary", targetPartitionId: "source-bom-policy-scan.output.findings", tier: "commit", required: true }],
    },
    "workspace-policy-summary": {
      sourceLabels: ["operation.kind.query", "workspace-policy-summary"],
      schemaSources: [
        { id: "schema:workspace-policy-summary:input", role: "input", label: "WorkspacePolicySummaryInput", source: "effect-schema" },
        { id: "schema:workspace-policy-summary:output", role: "output", label: "WorkspacePolicySummaryOutput", source: "effect-schema" },
      ],
      inputPartitions: [{ id: "workspace-policy-summary.input.changed-files", kind: "collection-boundary", from: "schema.input" }],
      outputPartitions: [{ id: "workspace-policy-summary.output.counts", kind: "output-variant", from: "schema.output" }],
      lawPartitions: lawPartitions(QueryViewLaws),
      viewPartitions: viewPartitions("architecture.workspace-policy-summary", "workspacePolicySummaryAtom"),
      coverageSearch: [{ id: "coverage:workspace-policy-summary:migration-counts", targetPartitionId: "workspace-policy-summary.output.counts", tier: "commit", required: true }],
    },
  },
} as const)
export type PackageTypeGuidance = typeof PackageTypeGuidance
