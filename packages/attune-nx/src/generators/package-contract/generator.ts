import { joinPath } from "../../internal/paths.js"
import {
  type GeneratorTask,
  type GeneratorTree,
  writeTextIfChanged,
} from "../../internal/tree.js"
import { toNames } from "../../internal/names.js"
import {
  inferProjectRootFromDirectory,
  upsertSourceBom,
} from "../../internal/source-bom.js"

const operationKinds = [
  "codec",
  "query",
  "command",
  "projection",
  "event-facade",
  "atom-family",
  "resource-provider",
  "generator",
  "policy-rule",
  "joern-template",
] as const

const packageKinds = [
  "generator-tooling",
  "architecture-policy",
  "policy-plugin",
  "core-discovery-runtime",
  "semantic-recall-service",
  "foldkit-ui",
  "agent-extension",
  "joern-runtime-and-dsl",
  "property-proof-runtime",
  "platform-resource-provider",
  "day0-resource-runbook",
] as const

export type PackageContractOperationKind = (typeof operationKinds)[number]
export type PackageContractPackageKind = (typeof packageKinds)[number]

export interface PackageContractGeneratorSchema {
  readonly packageId: string
  readonly packageKind: PackageContractPackageKind
  readonly sourceRoot?: string
  readonly directory?: string
  readonly project?: string
  readonly operationId?: string
  readonly operationKind?: PackageContractOperationKind
  readonly operationName?: string
  readonly generatorVersion?: string
  readonly generatorRevision?: string
  readonly openspecChangeId?: string
}

interface PackageContractGeneratorModel {
  readonly packageId: string
  readonly packageKind: PackageContractPackageKind
  readonly sourceRoot: string
  readonly directory: string
  readonly project: string
  readonly operationId: string
  readonly operationKind: PackageContractOperationKind
  readonly operationName: string
  readonly operationNames: ReturnType<typeof toNames>
  readonly reactivityKey: string
  readonly atomId: string
  readonly laws: readonly string[]
  readonly generatedPath: string
  readonly workerPropertyPath: string
}

const literal = (value: string): string => JSON.stringify(value)

const stringArray = (values: readonly string[]): string =>
  values.length === 0
    ? "[] as const"
    : `[\n${values.map((value) => `    ${literal(value)},`).join("\n")}\n  ] as const`

const generatedFrameworkTestingImport = (): string => [
  ["im", "port"].join(""),
  "{",
  "  createPackageHarnessClient,",
  "  defineEvidenceProducer,",
  "  definePackageEvidenceProducerMap,",
  "  definePackageHarnessHandlers,",
  "  propertyRunEvidence,",
  "  publicAccessorHandler,",
  "  typeGuidancePartitionEvidence,",
  "}",
  ["fr", "om"].join(""),
  literal("@attune/framework-testing"),
].join("\n")

const operationLawIds = (
  operationKind: PackageContractOperationKind,
): readonly string[] => {
  const shared = ["schema.decode", "schema.encode", "schema.error-decode"]
  const byKind: Record<PackageContractOperationKind, readonly string[]> = {
    codec: [
      "determinism.same-input-same-output",
      "side-effect.readonly",
    ],
    query: [
      "determinism.same-input-same-output",
      "side-effect.readonly",
    ],
    command: ["side-effect.declared-boundary"],
    projection: [
      "side-effect.declared-boundary",
      "projection.event-decode",
      "projection.state-decode",
      "projection.deterministic-replay",
    ],
    "event-facade": [
      "side-effect.declared-boundary",
      "event-facade.event-schema",
      "event-facade.append-boundary",
    ],
    "atom-family": [
      "side-effect.no-durable-atom-write",
      "atom-family.base-refresh",
      "atom-family.derived-composes",
    ],
    "resource-provider": [
      "side-effect.declared-boundary",
      "resource.observe-before-apply",
      "resource.observed-idempotence",
    ],
    generator: [
      "determinism.same-input-same-output",
      "side-effect.virtual-tree-only",
      "generator.options-decode",
      "generator.deterministic-output",
      "generator.provenance-recorded",
      "generator.no-untracked-output",
    ],
    "policy-rule": [
      "determinism.same-input-same-output",
      "side-effect.readonly",
      "policy.finding-schema",
      "policy.deterministic-findings",
      "policy.stable-diagnostic-ids",
    ],
    "joern-template": [
      "determinism.same-input-same-output",
      "side-effect.declared-boundary",
      "joern.template-binding-schema",
      "joern.evidence-schema",
      "joern.deterministic-template",
      "joern.normalized-evidence",
    ],
  }
  return [
    ...shared,
    ...byKind[operationKind],
    "view.reactivity-key-moves",
    "view.atom-moves",
  ]
}

const operationMetadata = (model: PackageContractGeneratorModel): string => {
  const className = model.operationNames.className
  switch (model.operationKind) {
    case "atom-family":
      return "  atom: {\n    atomIds: PackageViews.atoms,\n  } as const,"
    case "event-facade":
      return `  event: {\n    eventSchema: ${literal(`${className}Input`)},\n    facade: true,\n  } as const,`
    case "generator":
      return `  generator: {\n    name: "@attune/nx:package-contract",\n    project: ${literal(model.project)},\n    output: "virtual-tree",\n  } as const,`
    case "joern-template":
      return `  joern: {\n    templateSchema: ${literal(`${className}Input`)},\n    bindingSchema: ${literal(`${className}Input`)},\n    evidenceSchema: ${literal(`${className}Output`)},\n  } as const,`
    case "policy-rule":
      return `  policy: {\n    findingSchema: ${literal(`${className}Output`)},\n  } as const,`
    case "projection":
      return `  projection: {\n    eventSchema: ${literal(`${className}Input`)},\n    stateSchema: ${literal(`${className}Output`)},\n    replay: true,\n  } as const,`
    case "resource-provider":
      return `  observes: {\n    schema: ${literal(`${className}Observation`)},\n  } as const,`
    case "codec":
    case "command":
    case "query":
      return ""
  }
}

const sourceRootFromDirectory = (
  directory: string,
  explicitSourceRoot: string | undefined,
): string => explicitSourceRoot ?? inferProjectRootFromDirectory(directory)

const directoryFor = (schema: PackageContractGeneratorSchema): string => {
  if (schema.directory !== undefined) {
    return schema.directory
  }
  if (schema.sourceRoot !== undefined && schema.sourceRoot !== ".") {
    return joinPath(schema.sourceRoot, "src")
  }
  return "src"
}

const projectFor = (
  schema: PackageContractGeneratorSchema,
  sourceRoot: string,
): string =>
  schema.project ??
  (sourceRoot === "." || sourceRoot === ""
    ? "workspace"
    : (sourceRoot.split("/").filter(Boolean).at(-1) ?? schema.packageId))

const modelFor = (
  schema: PackageContractGeneratorSchema,
): PackageContractGeneratorModel => {
  const directory = directoryFor(schema)
  const sourceRoot = sourceRootFromDirectory(directory, schema.sourceRoot)
  const operationId = schema.operationId ?? `${schema.packageId}-boundary`
  const operationName = schema.operationName ?? operationId
  const operationNames = toNames(operationName)
  const project = projectFor(schema, sourceRoot)
  const operationKind = schema.operationKind ?? "query"
  return {
    packageId: schema.packageId,
    packageKind: schema.packageKind,
    sourceRoot,
    directory,
    project,
    operationId,
    operationKind,
    operationName,
    operationNames,
    reactivityKey: `${schema.packageId}.${operationId}.changed`,
    atomId: `${operationNames.propertyName}Atom`,
    laws: operationLawIds(operationKind),
    generatedPath: joinPath(directory, "attune.package.generated.ts"),
    workerPropertyPath: joinPath(directory, "attune.package.property.ts"),
  }
}

const lawPartitions = (laws: readonly string[]): string =>
  laws
    .map(
      (id) =>
        `        {\n          id: ${literal(id)},\n          kind: "law",\n          from: "inferred-law",\n        },`,
    )
    .join("\n")

const metadataGuidanceSourceKind = (
  operationKind: PackageContractOperationKind,
): string | undefined => {
  const byKind: Partial<Record<PackageContractOperationKind, string>> = {
    generator: "generator-metadata",
    "joern-template": "joern-metadata",
    "policy-rule": "policy-metadata",
    projection: "projection-metadata",
    "resource-provider": "resource-metadata",
  }
  return byKind[operationKind]
}

const metadataGuidanceLabel = (
  operationKind: PackageContractOperationKind,
): string | undefined => {
  const byKind: Partial<Record<PackageContractOperationKind, string>> = {
    generator: "generator.metadata",
    "joern-template": "joern.metadata",
    "policy-rule": "policy.metadata",
    projection: "projection.metadata",
    "resource-provider": "resource.metadata",
  }
  return byKind[operationKind]
}

const kindSpecificGuidancePartitions = (
  model: PackageContractGeneratorModel,
): string => {
  const operationId = model.operationId
  const partition = (
    id: string,
    kind: string,
    from: string,
    label?: string,
  ): string =>
    `        {\n          id: ${literal(id)},\n          kind: ${literal(kind)},\n          from: ${literal(from)},${label === undefined ? "" : `\n          label: ${literal(label)},`}\n        },`

  switch (model.operationKind) {
    case "generator":
      return partition(
        `${operationId}.generator.provenance`,
        "generator-provenance",
        "generator.metadata",
        "@attune/nx:package-contract",
      )
    case "joern-template":
      return partition(
        `${operationId}.joern.template`,
        "joern-template",
        "joern.metadata",
      )
    case "policy-rule":
      return partition(
        `${operationId}.policy.finding`,
        "policy-finding",
        "policy.metadata",
      )
    case "projection":
      return partition(
        `${operationId}.projection.transition`,
        "projection-transition",
        "projection.metadata",
      )
    case "resource-provider":
      return [
        partition(
          `${operationId}.resource.observed`,
          "resource-state",
          "resource.metadata",
        ),
        partition(
          `${operationId}.destructive.gate`,
          "destructive-gate",
          "resource.metadata",
        ),
      ].join("\n")
    case "atom-family":
      return partition(
        `${operationId}.atom.family`,
        "atom",
        "atom.metadata",
      )
    case "codec":
    case "command":
    case "event-facade":
    case "query":
      return ""
  }
}

const contractSource = (model: PackageContractGeneratorModel): string => {
  const className = model.operationNames.className
  const operationProperty = model.operationNames.propertyName
  const metadata = operationMetadata(model)
  const metadataBlock = metadata.length > 0 ? `${metadata}\n` : ""
  const metadataSourceKind = metadataGuidanceSourceKind(model.operationKind)
  const metadataSourceLabel = metadataGuidanceLabel(model.operationKind)
  const kindPartitions = kindSpecificGuidancePartitions(model)
  const kindPartitionsBlock =
    kindPartitions.length === 0 ? "" : `${kindPartitions}\n`

  return `import { Layer, Schema } from "effect"
import {
  defineOperation,
  definePackageContract,
  definePackageViews,
  defineTypeGuidance,
  touches,
} from "@attune/framework-protocol"

/**
 * Generated by @attune/nx:package-contract.
 * Compatibility package-contract materialization feeds the mechanical program
 * index. The primary runtime model is project/source_file/symbol/schema/
 * edge/artifact/observation/diagnostic/repair facts.
 */
export const PackageViews = definePackageViews({
  reactivityKeys: ${stringArray([model.reactivityKey])},
  atoms: ${stringArray([model.atomId])},
})

export const ${className}Input = Schema.Struct({
  requestId: Schema.optional(Schema.String),
})
export type ${className}Input = Schema.Schema.Type<typeof ${className}Input>

export const ${className}Output = Schema.Struct({
  ok: Schema.Boolean,
})
export type ${className}Output = Schema.Schema.Type<typeof ${className}Output>

export const ${className}Error = Schema.Struct({
  message: Schema.String,
})
export type ${className}Error = Schema.Schema.Type<typeof ${className}Error>

export const ${className}Observation = Schema.Struct({
  observed: Schema.Boolean,
})
export type ${className}Observation = Schema.Schema.Type<typeof ${className}Observation>

export const ${operationProperty}Operation = defineOperation({
  id: ${literal(model.operationId)},
  name: ${literal(model.operationName)},
  kind: ${literal(model.operationKind)},
  input: ${className}Input,
  output: ${className}Output,
  error: ${className}Error,
  views: touches(PackageViews, {
    reactivityKeys: [${literal(model.reactivityKey)}],
    atoms: [${literal(model.atomId)}],
  } as const),
  laws: ${stringArray(model.laws)},
${metadataBlock}} as const)

export const PackageContract = definePackageContract({
  packageId: ${literal(model.packageId)},
  sourceRoot: ${literal(model.sourceRoot)},
  packageKind: ${literal(model.packageKind)},
  views: PackageViews,
  services: [] as const,
  operations: [${operationProperty}Operation] as const,
  provenance: {
    generator: "@attune/nx:package-contract",
    project: ${literal(model.project)},
  } as const,
  waivers: [] as const,
})
export type PackageContract = typeof PackageContract

export const PackageLayer = Layer.empty
export type PackageLayer = typeof PackageLayer

export const PackageHarnessAccessors = {
  ${literal(model.operationId)}: (_input: ${className}Input): ${className}Output => ({
    ok: true,
  }),
} as const
export type PackageHarnessAccessors = typeof PackageHarnessAccessors

export const PackageTestLayer = {
  layer: Layer.empty,
  provides: [] as const,
  requires: [] as const,
  publicAccessors: PackageHarnessAccessors,
} as const
export type PackageTestLayer = typeof PackageTestLayer

export const PackageTypeGuidance = defineTypeGuidance(PackageContract, {
  sourceLabels: [
    "contract.operation",
    "effect-schema.ast",
    "inferred-law",
    ${literal(`operation.kind.${model.operationKind}`)},
    ${metadataSourceLabel === undefined ? "" : `${literal(metadataSourceLabel)},`}
  ],
  sources: [
    {
      id: ${literal(`operation:${model.operationId}`)},
      label: ${literal(model.operationId)},
      kind: "contract-operation",
      operationId: ${literal(model.operationId)},
    },
    ${metadataSourceKind === undefined ? "" : `{
      id: ${literal(`metadata:${model.operationId}`)},
      label: ${literal(metadataSourceLabel ?? `${model.operationKind}.metadata`)},
      kind: ${literal(metadataSourceKind)},
      operationId: ${literal(model.operationId)},
    },`}
  ],
  operations: {
    ${literal(model.operationId)}: {
      sourceLabels: [
        ${literal(`operation.kind.${model.operationKind}`)},
        "effect-schema.ast",
        ${metadataSourceLabel === undefined ? "" : `${literal(metadataSourceLabel)},`}
      ],
      sources: [
        {
          id: ${literal(`operation:${model.operationId}`)},
          label: ${literal(model.operationId)},
          kind: "contract-operation",
          operationId: ${literal(model.operationId)},
        },
        ${metadataSourceKind === undefined ? "" : `{
          id: ${literal(`metadata:${model.operationId}`)},
          label: ${literal(metadataSourceLabel ?? `${model.operationKind}.metadata`)},
          kind: ${literal(metadataSourceKind)},
          operationId: ${literal(model.operationId)},
        },`}
      ],
      schemaSources: [
        {
          id: ${literal(`schema:${model.operationId}:input`)},
          role: "input",
          label: ${literal(`${className}Input`)},
          source: "effect-schema",
        },
        {
          id: ${literal(`schema:${model.operationId}:output`)},
          role: "output",
          label: ${literal(`${className}Output`)},
          source: "effect-schema",
        },
        {
          id: ${literal(`schema:${model.operationId}:error`)},
          role: "error",
          label: ${literal(`${className}Error`)},
          source: "effect-schema",
        },
      ],
      partitions: [
        {
          id: ${literal(`${model.operationId}.operation-id`)},
          kind: "operation-id",
          from: "contract.operation",
        },
        {
          id: ${literal(`${model.operationId}.operation-kind.${model.operationKind}`)},
          kind: "operation-kind",
          from: "operation.kind",
        },
${kindPartitionsBlock}      ],
      inputPartitions: [
        {
          id: ${literal(`${model.operationId}.input`)},
          kind: "schema-boundary",
          from: "schema.input",
          sourceId: ${literal(`schema:${model.operationId}:input`)},
          transformIds: [${literal(`${model.operationId}.schema-guided`)}],
        },
      ],
      outputPartitions: [
        {
          id: ${literal(`${model.operationId}.output.ok`)},
          kind: "output-variant",
          from: "schema.output",
          sourceId: ${literal(`schema:${model.operationId}:output`)},
        },
      ],
      errorPartitions: [
        {
          id: ${literal(`${model.operationId}.error.message`)},
          kind: "typed-error-variant",
          from: "schema.error",
          sourceId: ${literal(`schema:${model.operationId}:error`)},
        },
      ],
      lawPartitions: [
${lawPartitions(model.laws)}
      ],
      viewPartitions: [
        {
          id: ${literal(`${model.reactivityKey}.moves`)},
          kind: "reactivity-key",
          from: "touches.reactivity-key",
        },
        {
          id: ${literal(`${model.atomId}.moves`)},
          kind: "atom",
          from: "touches.atom",
        },
      ],
      coverageSearch: [
        {
          id: ${literal(`coverage:${model.operationId}:package-view`)},
          targetPartitionId: ${literal(`${model.reactivityKey}.moves`)},
          tier: "commit",
          required: true,
          priority: 10,
          reason: "Generated package contract keeps semantic view movement visible.",
        },
      ],
      transforms: [
        {
          id: ${literal(`${model.operationId}.schema-guided`)},
          kind: "schema-annotation",
          targetPartitionId: ${literal(`${model.operationId}.input`)},
          sourceLabel: "effect-schema.ast",
          reason: "Schema-derived arbitraries stay authoritative before coverage bias is applied.",
        },
      ],
      filters: [],
    },
  },
} as const)
export type PackageTypeGuidance = typeof PackageTypeGuidance
`
}

const generatedSource = (model: PackageContractGeneratorModel): string => {
  const operationProperty = model.operationNames.propertyName

  return `${generatedFrameworkTestingImport()}
import {
  PackageContract,
  PackageTestLayer,
  PackageTypeGuidance,
  PackageViews,
  ${operationProperty}Operation,
} from "./attune.package.js"

/**
 * Generated by @attune/nx:package-contract.
 * This module is deterministic source materialization, not checked-in report
 * truth. Runtime/cache facts belong under gitignored framework cache paths.
 */
export const PackageOperationRegistry = {
  ${literal(model.operationId)}: {
    operation: ${operationProperty}Operation,
    guidance: PackageTypeGuidance.operations[${literal(model.operationId)}],
    views: {
      reactivityKeys: PackageViews.reactivityKeys,
      atoms: PackageViews.atoms,
    },
  },
} as const
export type PackageOperationRegistry = typeof PackageOperationRegistry

export const PackageHarnessHandlers = definePackageHarnessHandlers(PackageContract, {
  ${literal(model.operationId)}: publicAccessorHandler(${literal(model.operationId)}),
} as const)
export type PackageHarnessHandlers = typeof PackageHarnessHandlers

export const PackageHarnessEvidenceProducers = definePackageEvidenceProducerMap(PackageContract, {
  ${literal(model.operationId)}: defineEvidenceProducer({
    id: ${literal(`${model.operationId}.property-evidence`)},
    operationId: ${literal(model.operationId)},
    produce: (context) => [
      propertyRunEvidence(context, ${literal(model.operationId)}, {
        harness: "schema-coded-package-harness",
        rpcId: ${literal(`${model.packageId}.operation.${model.operationId}`)},
        laws: ${stringArray(model.laws)},
      }),
      typeGuidancePartitionEvidence(context, ${literal(model.operationId)}, {
        partitionId: ${literal(`${model.operationId}.input`)},
        partitionKind: "schema-boundary",
        source: "generated-type-guidance",
        status: "miss",
      }),
      typeGuidancePartitionEvidence(context, ${literal(model.operationId)}, {
        partitionId: ${literal(`${model.reactivityKey}.moves`)},
        partitionKind: "reactivity-key",
        source: "generated-type-guidance",
        status: "miss",
      }),
    ],
  }),
} as const
export type PackageHarnessEvidenceProducers = typeof PackageHarnessEvidenceProducers

export const PackageHarnessClient = createPackageHarnessClient({
  contract: PackageContract,
  packageTestLayer: PackageTestLayer,
  handlers: PackageHarnessHandlers,
  evidenceProducers: PackageHarnessEvidenceProducers,
})
export type PackageHarnessClient = typeof PackageHarnessClient

export const PackageHarnessControls = PackageHarnessClient.controls
export type PackageHarnessControls = typeof PackageHarnessControls

export const PackageFuzzHandlers = PackageHarnessHandlers
export type PackageFuzzHandlers = typeof PackageFuzzHandlers

const propertyFor = <const Operation extends { readonly id: string; readonly laws: readonly string[] }>(
  operation: Operation,
) =>
  () => ({
    operationId: operation.id,
    laws: operation.laws,
    checks: [
      "schema.decode",
      "schema.encode",
      "harness.schema-coded-client",
      "harness.control.observe",
      "handler.exact-operation-map",
      "evidence.producer-map",
      "type-guidance.partitions",
      "view.atom-moves",
      "property.worker-compatible-module",
    ],
  } as const)

export const PackageProperties = {
  ${literal(model.operationId)}: propertyFor(${operationProperty}Operation),
} as const
export type PackageProperties = typeof PackageProperties

export const PackagePropertyEvidencePlan = {
  packageId: PackageContract.packageId,
  operationIds: [${literal(model.operationId)}],
  registry: "PackageOperationRegistry",
  harness: "PackageHarnessClient",
  handlerMap: "PackageHarnessHandlers",
  propertyMap: "PackageProperties",
  evidenceProducerMap: "PackageHarnessEvidenceProducers",
  workerModule: "./attune.package.property.js",
  evidenceRoot: ".attune/cache/property-evidence",
  checkedInProtocolReports: false,
} as const
export type PackagePropertyEvidencePlan = typeof PackagePropertyEvidencePlan

export const PackageAtomViewGraph = {
  packageId: PackageContract.packageId,
  operationEdges: [
    {
      operationId: ${literal(model.operationId)},
      reactivityKey: ${literal(model.reactivityKey)},
      atomId: ${literal(model.atomId)},
    },
  ],
} as const
export type PackageAtomViewGraph = typeof PackageAtomViewGraph

export const PackageGeneratedArtifacts = [
  {
    path: "./attune.package.generated.ts",
    kind: "operation-registry",
    owner: "@attune/nx:package-contract",
  },
  {
    path: "./attune.package.generated.ts",
    kind: "package-harness",
    owner: "@attune/nx:package-contract",
  },
  {
    path: "./attune.package.property.ts",
    kind: "worker-property-module",
    owner: "@attune/nx:package-contract",
  },
] as const
export type PackageGeneratedArtifacts = typeof PackageGeneratedArtifacts

export const PackageProtocolReportPolicy = {
  checkedInReports: "forbidden",
  allowedEphemeralRoots: [
    ".attune/cache",
    "dist/evidence",
    "coverage",
  ],
} as const
export type PackageProtocolReportPolicy = typeof PackageProtocolReportPolicy
`
}

const workerPropertySource = (
  model: PackageContractGeneratorModel,
): string => `import { assert, propertyFor } from "@fast-check/worker"

/**
 * Generated by @attune/nx:package-contract.
 * Worker properties are hoisted so @fast-check/worker can import this module
 * by URL. Later property-runtime materialization supplies Schema arbitraries.
 */
export const PackageWorkerPropertyBuilder = propertyFor(new URL(import.meta.url), {
  isolationLevel: "property",
  randomSource: "worker",
})

export const PackageWorkerAssert = assert

export const PackageWorkerProperties = {
  ${literal(model.operationId)}: {
    operationId: ${literal(model.operationId)},
    build: PackageWorkerPropertyBuilder,
    assert: PackageWorkerAssert,
    evidenceRoot: ".attune/cache/property-evidence",
    timeoutSeconds: 30,
    isolationLevel: "property",
    randomSource: "worker",
  },
} as const
export type PackageWorkerProperties = typeof PackageWorkerProperties
`

export default function packageContractGenerator(
  tree: GeneratorTree,
  schema: PackageContractGeneratorSchema,
): GeneratorTask {
  const model = modelFor(schema)
  const contractPath = joinPath(model.directory, "attune.package.ts")

  writeTextIfChanged(tree, contractPath, contractSource(model))
  writeTextIfChanged(tree, model.generatedPath, generatedSource(model))
  writeTextIfChanged(
    tree,
    model.workerPropertyPath,
    workerPropertySource(model),
  )

  upsertSourceBom(tree, {
    generatorName: "@attune/nx:package-contract",
    generatorVersion: schema.generatorVersion,
    generatorRevision: schema.generatorRevision,
    owningProject: model.project,
    projectRoot: model.sourceRoot,
    sourceShapeKind: "package-contract",
    options: {
      directory: model.directory,
      operationId: model.operationId,
      operationKind: model.operationKind,
      operationName: model.operationName,
      packageId: model.packageId,
      packageKind: model.packageKind,
      project: model.project,
      sourceRoot: model.sourceRoot,
    },
    ownedFiles: [
      contractPath,
      model.generatedPath,
      model.workerPropertyPath,
    ],
    editableRegions: [
      {
        file: contractPath,
        marker: "Generated by @attune/nx:package-contract",
        description:
          "Package boundary scaffold; add operations through package-contract sync/generation.",
      },
      {
        file: model.generatedPath,
        marker: "PackageOperationRegistry",
        description:
          "Generated operation registry, property evidence plan, atom view graph, and no-report policy.",
      },
      {
        file: model.workerPropertyPath,
        marker: "propertyFor(new URL(import.meta.url)",
        description:
          "Worker-compatible property module scaffold; property runtime supplies arbitraries.",
      },
    ],
    syncTargets: [
      { project: model.project, target: "sync-package-contract" },
    ],
    checkTargets: [
      { project: model.project, target: "typecheck" },
      { project: "workspace", target: "package-contracts-check" },
    ],
    openspecChangeId:
      schema.openspecChangeId ?? "standardize-effect-package-contracts",
  })
}
