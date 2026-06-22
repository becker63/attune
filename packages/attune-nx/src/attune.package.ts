import { Layer, Schema } from "effect"
import {
  OperationKindSchema,
  PackageKindSchema,
  defineOperation,
  definePackageContract,
  definePackageViews,
  defineTypeGuidance,
  touches,
} from "@attune/framework-protocol"

export { PackageContractSchema } from "@attune/framework-protocol"

/**
 * Generated-shape contract customized for @attune/nx itself.
 * The generator grammar package is intentionally hand-authored, but its public
 * boundary is still auditable through the same package-contract surface that it
 * emits for the rest of the repo.
 */
export const PackageViews = definePackageViews({
  reactivityKeys: [
    "attune-nx.generator-plan.changed",
    "attune-nx.generated-diff.changed",
    "attune-nx.provenance.changed",
    "attune-nx.contract-graph.changed",
    "attune-nx.executor-intent.changed",
  ],
  atoms: [
    "generatorPlanAtom",
    "generatedDiffAtom",
    "provenanceAtom",
    "contractGraphAtom",
    "generatorInventoryAtom",
    "executorIntentAtom",
  ],
} as const)

export const AttuneNxOperationError = Schema.Struct({
  code: Schema.String,
  message: Schema.String,
  path: Schema.optional(Schema.String),
})
export type AttuneNxOperationError = Schema.Schema.Type<typeof AttuneNxOperationError>

export const GeneratedFile = Schema.Struct({
  path: Schema.String,
  kind: Schema.Literals(["source", "barrel", "schema", "ledger", "test", "metadata"] as const),
})
export type GeneratedFile = Schema.Schema.Type<typeof GeneratedFile>

export const GeneratorPlanOutput = Schema.Struct({
  files: Schema.Array(GeneratedFile),
  sourceBomUpdated: Schema.Boolean,
  deterministic: Schema.Boolean,
})
export type GeneratorPlanOutput = Schema.Schema.Type<typeof GeneratorPlanOutput>

export const EffectServiceGeneratorInput = Schema.Struct({
  name: Schema.String,
  directory: Schema.optional(Schema.String),
  export: Schema.optional(Schema.Boolean),
  tag: Schema.optional(Schema.String),
  operationId: Schema.optional(Schema.String),
  operationKind: Schema.optional(OperationKindSchema),
  project: Schema.optional(Schema.String),
})
export type EffectServiceGeneratorInput = Schema.Schema.Type<typeof EffectServiceGeneratorInput>

export const PackageContractGeneratorInput = Schema.Struct({
  packageId: Schema.String,
  packageKind: PackageKindSchema,
  sourceRoot: Schema.optional(Schema.String),
  directory: Schema.optional(Schema.String),
  project: Schema.optional(Schema.String),
  operationId: Schema.optional(Schema.String),
  operationKind: Schema.optional(OperationKindSchema),
  operationName: Schema.optional(Schema.String),
})
export type PackageContractGeneratorInput = Schema.Schema.Type<typeof PackageContractGeneratorInput>

export const AtomViewGeneratorInput = Schema.Struct({
  name: Schema.String,
  packageId: Schema.optional(Schema.String),
  operationId: Schema.optional(Schema.String),
  directory: Schema.optional(Schema.String),
  export: Schema.optional(Schema.Boolean),
  reactivityKey: Schema.optional(Schema.String),
  baseAtomId: Schema.optional(Schema.String),
  derivedAtomId: Schema.optional(Schema.String),
  packageViewAtomId: Schema.optional(Schema.String),
  project: Schema.optional(Schema.String),
})
export type AtomViewGeneratorInput = Schema.Schema.Type<typeof AtomViewGeneratorInput>

export const GeneratorInventoryInput = Schema.Struct({
  includeMissingCapabilities: Schema.optional(Schema.Boolean),
})
export type GeneratorInventoryInput = Schema.Schema.Type<typeof GeneratorInventoryInput>

export const GeneratorInventoryOutput = Schema.Struct({
  entries: Schema.Array(Schema.Struct({
    id: Schema.String,
    publicName: Schema.String,
    kind: Schema.Literals(["scaffold", "sync"] as const),
  })),
  capabilityGaps: Schema.Array(Schema.String),
})
export type GeneratorInventoryOutput = Schema.Schema.Type<typeof GeneratorInventoryOutput>

export const PackageContractGraphInferenceInput = Schema.Struct({
  projectName: Schema.String,
  projectRoot: Schema.String,
  sourceRoot: Schema.optional(Schema.String),
  targetNames: Schema.optional(Schema.Array(Schema.String)),
})
export type PackageContractGraphInferenceInput = Schema.Schema.Type<typeof PackageContractGraphInferenceInput>

export const PackageContractGraphInferenceOutput = Schema.Struct({
  contractPath: Schema.String,
  targetSemantics: Schema.Array(Schema.Struct({
    targetName: Schema.String,
    category: Schema.String,
    cacheable: Schema.Boolean,
  })),
  requiredEvidence: Schema.Array(Schema.String),
})
export type PackageContractGraphInferenceOutput = Schema.Schema.Type<typeof PackageContractGraphInferenceOutput>

export const SourceBomProvenanceUpsertInput = Schema.Struct({
  generatorName: Schema.String,
  owningProject: Schema.String,
  projectRoot: Schema.String,
  sourceShapeKind: Schema.String,
  ownedFiles: Schema.Array(Schema.String),
  openspecChangeId: Schema.optional(Schema.String),
})
export type SourceBomProvenanceUpsertInput = Schema.Schema.Type<typeof SourceBomProvenanceUpsertInput>

export const SourceBomProvenanceUpsertOutput = Schema.Struct({
  shardPath: Schema.String,
  optionsHash: Schema.String,
  updated: Schema.Boolean,
})
export type SourceBomProvenanceUpsertOutput = Schema.Schema.Type<typeof SourceBomProvenanceUpsertOutput>

export const ExecutorIntentNormalizationInput = Schema.Struct({
  executor: Schema.Literals(["attune:package-check", "attune:generated", "attune:toolchain"] as const),
  options: Schema.Unknown,
  projectName: Schema.optional(Schema.String),
  targetName: Schema.optional(Schema.String),
})
export type ExecutorIntentNormalizationInput = Schema.Schema.Type<typeof ExecutorIntentNormalizationInput>

export const ExecutorIntentNormalizationOutput = Schema.Struct({
  accepted: Schema.Boolean,
  executionMode: Schema.Literals(["intent-only"] as const),
  diagnostics: Schema.Array(Schema.String),
})
export type ExecutorIntentNormalizationOutput = Schema.Schema.Type<typeof ExecutorIntentNormalizationOutput>

const generatorLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "determinism.same-input-same-output",
  "side-effect.virtual-tree-only",
  "generator.options-decode",
  "generator.deterministic-output",
  "generator.provenance-recorded",
  "generator.no-untracked-output",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

const queryLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "determinism.same-input-same-output",
  "side-effect.readonly",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

const commandLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "side-effect.declared-boundary",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

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

export const generateEffectServiceOperation = defineOperation({
  id: "generate-effect-service",
  name: "Generate Effect Service",
  kind: "generator",
  input: EffectServiceGeneratorInput,
  output: GeneratorPlanOutput,
  error: AttuneNxOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "attune-nx.generator-plan.changed",
      "attune-nx.generated-diff.changed",
      "attune-nx.provenance.changed",
    ],
    atoms: ["generatorPlanAtom", "generatedDiffAtom", "provenanceAtom"],
  } as const),
  laws: generatorLaws,
  generator: {
    name: "@attune/nx:effect-service",
    project: "attune-nx",
    output: "virtual-tree",
  } as const,
} as const)

export const generatePackageContractOperation = defineOperation({
  id: "generate-package-contract",
  name: "Generate Package Contract",
  kind: "generator",
  input: PackageContractGeneratorInput,
  output: GeneratorPlanOutput,
  error: AttuneNxOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "attune-nx.generator-plan.changed",
      "attune-nx.generated-diff.changed",
      "attune-nx.provenance.changed",
      "attune-nx.contract-graph.changed",
    ],
    atoms: ["generatorPlanAtom", "generatedDiffAtom", "provenanceAtom", "contractGraphAtom"],
  } as const),
  laws: generatorLaws,
  generator: {
    name: "@attune/nx:package-contract",
    project: "attune-nx",
    output: "virtual-tree",
  } as const,
} as const)

export const generateAtomViewOperation = defineOperation({
  id: "generate-atom-view",
  name: "Generate Atom View",
  kind: "generator",
  input: AtomViewGeneratorInput,
  output: GeneratorPlanOutput,
  error: AttuneNxOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "attune-nx.generator-plan.changed",
      "attune-nx.generated-diff.changed",
      "attune-nx.provenance.changed",
      "attune-nx.contract-graph.changed",
    ],
    atoms: ["generatorPlanAtom", "generatedDiffAtom", "provenanceAtom", "contractGraphAtom"],
  } as const),
  laws: generatorLaws,
  generator: {
    name: "@attune/nx:atom-view",
    project: "attune-nx",
    output: "virtual-tree",
  } as const,
} as const)

export const queryGeneratorInventoryOperation = defineOperation({
  id: "query-generator-inventory",
  name: "Query Generator Inventory",
  kind: "query",
  input: GeneratorInventoryInput,
  output: GeneratorInventoryOutput,
  error: AttuneNxOperationError,
  views: touches(PackageViews, {
    reactivityKeys: ["attune-nx.generator-plan.changed"],
    atoms: ["generatorInventoryAtom"],
  } as const),
  laws: queryLaws,
} as const)

export const inferPackageContractGraphOperation = defineOperation({
  id: "infer-package-contract-graph",
  name: "Infer Package Contract Graph",
  kind: "query",
  input: PackageContractGraphInferenceInput,
  output: PackageContractGraphInferenceOutput,
  error: AttuneNxOperationError,
  views: touches(PackageViews, {
    reactivityKeys: ["attune-nx.contract-graph.changed"],
    atoms: ["contractGraphAtom"],
  } as const),
  laws: queryLaws,
} as const)

export const upsertSourceBomProvenanceOperation = defineOperation({
  id: "upsert-source-bom-provenance",
  name: "Upsert Source BOM Provenance",
  kind: "command",
  input: SourceBomProvenanceUpsertInput,
  output: SourceBomProvenanceUpsertOutput,
  error: AttuneNxOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "attune-nx.generated-diff.changed",
      "attune-nx.provenance.changed",
    ],
    atoms: ["generatedDiffAtom", "provenanceAtom"],
  } as const),
  laws: commandLaws,
} as const)

export const normalizeExecutorIntentOperation = defineOperation({
  id: "normalize-executor-intent",
  name: "Normalize Executor Intent",
  kind: "policy-rule",
  input: ExecutorIntentNormalizationInput,
  output: ExecutorIntentNormalizationOutput,
  error: AttuneNxOperationError,
  views: touches(PackageViews, {
    reactivityKeys: ["attune-nx.executor-intent.changed"],
    atoms: ["executorIntentAtom"],
  } as const),
  laws: policyRuleLaws,
  policy: {
    findingSchema: "ExecutorIntentNormalizationOutput",
    ruleId: "attune-nx/typed-executor-intent",
  } as const,
} as const)

export const PackageContract = definePackageContract({
  packageId: "attune-nx",
  sourceRoot: "packages/attune-nx",
  packageKind: "generator-tooling",
  views: PackageViews,
  services: [] as const,
  operations: [
    generateEffectServiceOperation,
    generatePackageContractOperation,
    generateAtomViewOperation,
    queryGeneratorInventoryOperation,
    inferPackageContractGraphOperation,
    upsertSourceBomProvenanceOperation,
    normalizeExecutorIntentOperation,
  ] as const,
  provenance: {
    generator: "@attune/nx:package-contract",
    customizedFor: "attune-nx generator grammar",
    openspecChangeId: "standardize-effect-package-contracts",
  } as const,
  waivers: [] as const,
} as const)
export type PackageContract = typeof PackageContract

export const PackageLayer = {
  layer: Layer.empty,
  provides: [] as const,
  requires: [] as const,
  metadata: {
    packageId: "attune-nx",
    role: "generator-tooling-runtime",
  },
} as const
export type PackageLayer = typeof PackageLayer

export const PackageTestLayer = {
  layer: Layer.empty,
  provides: [] as const,
  requires: [] as const,
  metadata: {
    packageId: "attune-nx",
    role: "generator-tooling-test-runtime",
  },
} as const
export type PackageTestLayer = typeof PackageTestLayer

export const PackageFuzzHandlers = {
  "generate-effect-service": () => generatorOutput("effect-service.ts"),
  "generate-package-contract": () => generatorOutput("attune.package.ts"),
  "generate-atom-view": () => generatorOutput("atom-view.atom-graph.ts"),
  "query-generator-inventory": () => ({
    entries: [
      { id: "effect-service", publicName: "@attune/nx:effect-service", kind: "scaffold" },
      { id: "package-contract", publicName: "@attune/nx:package-contract", kind: "scaffold" },
      { id: "atom-view", publicName: "@attune/nx:atom-view", kind: "scaffold" },
    ],
    capabilityGaps: [],
  }),
  "infer-package-contract-graph": () => ({
    contractPath: "packages/attune-nx/src/attune.package.ts",
    targetSemantics: [
      { targetName: "sync-package-contract", category: "sync", cacheable: false },
      { targetName: "check-generated", category: "generation", cacheable: true },
    ],
    requiredEvidence: ["Source BOM ownership", "operation-to-Reactivity edges"],
  }),
  "upsert-source-bom-provenance": () => ({
    shardPath: "packages/attune-nx/attune.source-bom.json",
    optionsHash: "fnv1a32:contract",
    updated: true,
  }),
  "normalize-executor-intent": () => ({
    accepted: true,
    executionMode: "intent-only",
    diagnostics: [],
  }),
} as const
export type PackageFuzzHandlers = typeof PackageFuzzHandlers

export const PackageProperties = {
  "generate-effect-service": propertyFor(generateEffectServiceOperation),
  "generate-package-contract": propertyFor(generatePackageContractOperation),
  "generate-atom-view": propertyFor(generateAtomViewOperation),
  "query-generator-inventory": propertyFor(queryGeneratorInventoryOperation),
  "infer-package-contract-graph": propertyFor(inferPackageContractGraphOperation),
  "upsert-source-bom-provenance": propertyFor(upsertSourceBomProvenanceOperation),
  "normalize-executor-intent": propertyFor(normalizeExecutorIntentOperation),
} as const
export type PackageProperties = typeof PackageProperties

export const PackageTypeGuidance = defineTypeGuidance(PackageContract, {
  sourceLabels: [
    "contract.operation",
    "effect-schema.ast",
    "inferred-law",
    "nx-generator-grammar",
    "source-bom-provenance",
  ],
  operations: {
    "generate-effect-service": operationGuidance(generateEffectServiceOperation, {
      laws: generatorLaws,
      inputPartitionId: "generate-effect-service.options",
      outputPartitionId: "generate-effect-service.generated-files",
      coverageTargetId: "generate-effect-service.generated-files",
      transformId: "generate-effect-service.schema-annotations",
    }),
    "generate-package-contract": operationGuidance(generatePackageContractOperation, {
      laws: generatorLaws,
      inputPartitionId: "generate-package-contract.options",
      outputPartitionId: "generate-package-contract.generated-contract",
      coverageTargetId: "generate-package-contract.generated-contract",
      transformId: "generate-package-contract.contract-shape",
    }),
    "generate-atom-view": operationGuidance(generateAtomViewOperation, {
      laws: generatorLaws,
      inputPartitionId: "generate-atom-view.options",
      outputPartitionId: "generate-atom-view.atom-graph",
      coverageTargetId: "generate-atom-view.atom-graph",
      transformId: "generate-atom-view.atom-shape",
    }),
    "query-generator-inventory": operationGuidance(queryGeneratorInventoryOperation, {
      laws: queryLaws,
      inputPartitionId: "query-generator-inventory.include-missing",
      outputPartitionId: "query-generator-inventory.capability-gaps",
      coverageTargetId: "query-generator-inventory.capability-gaps",
      transformId: "query-generator-inventory.capability-partitions",
    }),
    "infer-package-contract-graph": operationGuidance(inferPackageContractGraphOperation, {
      laws: queryLaws,
      inputPartitionId: "infer-package-contract-graph.project-root",
      outputPartitionId: "infer-package-contract-graph.target-semantics",
      coverageTargetId: "infer-package-contract-graph.target-semantics",
      transformId: "infer-package-contract-graph.nx-graph-bias",
    }),
    "upsert-source-bom-provenance": operationGuidance(upsertSourceBomProvenanceOperation, {
      laws: commandLaws,
      inputPartitionId: "upsert-source-bom-provenance.owned-files",
      outputPartitionId: "upsert-source-bom-provenance.options-hash",
      coverageTargetId: "upsert-source-bom-provenance.options-hash",
      transformId: "upsert-source-bom-provenance.provenance-corpus",
    }),
    "normalize-executor-intent": operationGuidance(normalizeExecutorIntentOperation, {
      laws: policyRuleLaws,
      inputPartitionId: "normalize-executor-intent.executor-kind",
      outputPartitionId: "normalize-executor-intent.diagnostics",
      coverageTargetId: "normalize-executor-intent.diagnostics",
      transformId: "normalize-executor-intent.shell-rejection",
      filterId: "normalize-executor-intent.valid-executor-options",
    }),
  },
} as const)
export type PackageTypeGuidance = typeof PackageTypeGuidance

type OperationWithGuidance = {
  readonly id: string
  readonly kind: string
  readonly input: unknown
  readonly output: unknown
  readonly error: unknown
  readonly views: {
    readonly reactivityKeys?: readonly string[]
    readonly atoms?: readonly string[]
  }
  readonly laws: readonly string[]
}

type LawPartition<Laws extends readonly string[]> = readonly {
  readonly id: Laws[number]
  readonly kind: "law"
  readonly from: "inferred-law"
}[]

type GuidanceOptions<Laws extends readonly string[]> = {
  readonly laws: Laws
  readonly inputPartitionId: string
  readonly outputPartitionId: string
  readonly coverageTargetId: string
  readonly transformId: string
  readonly filterId?: string
}

function generatorOutput(path: string): GeneratorPlanOutput {
  return {
    deterministic: true,
    files: [{ path, kind: "source" }],
    sourceBomUpdated: true,
  }
}

function propertyFor<const Operation extends OperationWithGuidance>(operation: Operation) {
  return {
    property: {
      operationId: operation.id,
      laws: operation.laws,
      checks: [
        "schema.decode",
        "schema.encode",
        "handler.exact-operation-map",
        "view.atom-moves",
      ],
    },
  } as const
}

function operationGuidance<
  const Operation extends OperationWithGuidance,
  const Laws extends readonly string[],
>(
  operation: Operation,
  options: GuidanceOptions<Laws>,
) {
  const inputSchemaId = `schema:${operation.id}:input`
  const outputSchemaId = `schema:${operation.id}:output`
  const errorSchemaId = `schema:${operation.id}:error`

  return {
    sourceLabels: [
      `operation.kind.${operation.kind}`,
      "effect-schema.ast",
      "nx.graph.metadata",
    ],
    sources: [
      {
        id: `operation:${operation.id}`,
        label: operation.id,
        kind: "contract-operation",
        operationId: operation.id,
      },
    ],
    schemaSources: [
      {
        id: inputSchemaId,
        role: "input",
        label: `${operation.id}.input`,
        source: "effect-schema",
      },
      {
        id: outputSchemaId,
        role: "output",
        label: `${operation.id}.output`,
        source: "effect-schema",
      },
      {
        id: errorSchemaId,
        role: "error",
        label: `${operation.id}.error`,
        source: "effect-schema",
      },
    ],
    inputPartitions: [
      {
        id: options.inputPartitionId,
        kind: "schema-boundary",
        from: "schema.input",
        sourceId: inputSchemaId,
        transformIds: [options.transformId],
        ...(options.filterId ? { filterIds: [options.filterId] } : {}),
      },
    ],
    outputPartitions: [
      {
        id: options.outputPartitionId,
        kind: "output-variant",
        from: "schema.output",
        sourceId: outputSchemaId,
      },
    ],
    errorPartitions: [
      {
        id: `${operation.id}.typed-error`,
        kind: "typed-error-variant",
        from: "schema.error",
        sourceId: errorSchemaId,
      },
    ],
    lawPartitions: lawPartitions(options.laws),
    viewPartitions: [
      ...viewPartitions(operation.id, "reactivity-key", operation.views.reactivityKeys ?? []),
      ...viewPartitions(operation.id, "atom", operation.views.atoms ?? []),
    ],
    coverageSearch: [
      {
        id: `coverage:${operation.id}:semantic`,
        targetPartitionId: options.coverageTargetId,
        tier: "commit",
        required: true,
        priority: 10,
        reason: "FastCheck should search the declared package boundary before agents add bespoke tests.",
      },
    ],
    transforms: [
      {
        id: options.transformId,
        kind: "schema-annotation",
        targetPartitionId: options.inputPartitionId,
        sourceLabel: "effect-schema.ast",
        reason: "Schema-derived arbitrary generation is the first source of package-boundary examples.",
      },
    ],
    filters: options.filterId
      ? [
        {
          id: options.filterId,
          kind: "operation-precondition",
          reason: "Executor options are typed before shell rejection and intent construction.",
          targetPartitionId: options.inputPartitionId,
          expectedAcceptanceRate: 0.9,
        },
      ]
      : [],
  } as const
}

function lawPartitions<const Laws extends readonly string[]>(laws: Laws): LawPartition<Laws> {
  return laws.map((id) => ({
    id,
    kind: "law",
    from: "inferred-law",
  })) as LawPartition<Laws>
}

function viewPartitions(
  operationId: string,
  kind: "reactivity-key" | "atom",
  values: readonly string[],
) {
  return values.map((value) => ({
    id: `${operationId}.${kind}.${value}`,
    kind,
    from: kind === "reactivity-key" ? "touches.reactivity-key" : "touches.atom",
    label: value,
  })) as readonly {
    readonly id: string
    readonly kind: "reactivity-key" | "atom"
    readonly from: "touches.reactivity-key" | "touches.atom"
    readonly label: string
  }[]
}
