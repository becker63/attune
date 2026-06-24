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

const symbolKinds = [
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

const projectKinds = [
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

export type ProjectFactsSymbolKind = (typeof symbolKinds)[number]
export type ProjectFactsProjectKind = (typeof projectKinds)[number]

export interface ProjectFactsGeneratorSchema {
  readonly projectId: string
  readonly projectKind: ProjectFactsProjectKind
  readonly sourceRoot?: string
  readonly directory?: string
  readonly owningProject?: string
  readonly symbolId?: string
  readonly symbolKind?: ProjectFactsSymbolKind
  readonly symbolName?: string
  readonly generatorVersion?: string
  readonly generatorRevision?: string
  readonly openspecChangeId?: string
}

interface ProjectFactsGeneratorModel {
  readonly projectId: string
  readonly projectKind: ProjectFactsProjectKind
  readonly sourceRoot: string
  readonly directory: string
  readonly owningProject: string
  readonly symbolId: string
  readonly symbolKind: ProjectFactsSymbolKind
  readonly symbolName: string
  readonly symbolNames: ReturnType<typeof toNames>
  readonly reactivityKey: string
  readonly atomId: string
  readonly diagnosticRules: readonly string[]
  readonly generatedPath: string
  readonly workerObservationPath: string
}

const literal = (value: string): string => JSON.stringify(value)

const stringArray = (values: readonly string[]): string =>
  values.length === 0
    ? "[] as const"
    : `[\n${values.map((value) => `    ${literal(value)},`).join("\n")}\n  ] as const`

const symbolDiagnosticRules = (
  symbolKind: ProjectFactsSymbolKind,
): readonly string[] => {
  const shared = [
    "schema.decode",
    "schema.encode",
    "schema.error-decode",
  ]
  const byKind: Record<ProjectFactsSymbolKind, readonly string[]> = {
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
      "joern.observation-schema",
      "joern.deterministic-template",
      "joern.normalized-observation",
    ],
  }
  return [
    ...shared,
    ...byKind[symbolKind],
    "reactivity-key.moves",
    "atom.moves",
  ]
}

const symbolMetadata = (model: ProjectFactsGeneratorModel): string => {
  const className = model.symbolNames.className
  switch (model.symbolKind) {
    case "atom-family":
      return `      observes: ProjectRuntimeRoots.atoms.map((id) => ({\n        id,\n        kind: "atom" as const,\n      })),`
    case "event-facade":
      return `      observes: [\n        {\n          id: ${literal(`${model.symbolId}.event-schema`)},\n          kind: "schema" as const,\n        },\n      ],`
    case "generator":
      return `      observes: [\n        {\n          id: ${literal("@attune/nx:project-facts")},\n          kind: "artifact-provenance" as const,\n        },\n      ],`
    case "joern-template":
      return `      observes: [\n        {\n          id: ${literal(`${className}Output`)},\n          kind: "schema" as const,\n        },\n      ],`
    case "policy-rule":
      return `      observes: [\n        {\n          id: ${literal(`${className}Output`)},\n          kind: "diagnostic" as const,\n        },\n      ],`
    case "projection":
      return `      observes: [\n        {\n          id: ${literal(`${model.symbolId}.transition`)},\n          kind: "edge" as const,\n        },\n      ],`
    case "resource-provider":
      return `      observes: [\n        {\n          id: ${literal(`${model.symbolId}.resource.observed`)},\n          kind: "observation" as const,\n        },\n        {\n          id: ${literal(`${model.symbolId}.destructive.gate`)},\n          kind: "diagnostic" as const,\n        },\n      ],`
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

const directoryFor = (schema: ProjectFactsGeneratorSchema): string => {
  if (schema.directory !== undefined) {
    return schema.directory
  }
  if (schema.sourceRoot !== undefined && schema.sourceRoot !== ".") {
    return joinPath(schema.sourceRoot, "src")
  }
  return "src"
}

const owningProjectFor = (
  schema: ProjectFactsGeneratorSchema,
  sourceRoot: string,
): string =>
  schema.owningProject ??
  (sourceRoot === "." || sourceRoot === ""
    ? "workspace"
    : (sourceRoot.split("/").filter(Boolean).at(-1) ?? schema.projectId))

const modelFor = (
  schema: ProjectFactsGeneratorSchema,
): ProjectFactsGeneratorModel => {
  const directory = directoryFor(schema)
  const sourceRoot = sourceRootFromDirectory(directory, schema.sourceRoot)
  const symbolId = schema.symbolId ?? `${schema.projectId}-boundary`
  const symbolName = schema.symbolName ?? symbolId
  const symbolNames = toNames(symbolName)
  const owningProject = owningProjectFor(schema, sourceRoot)
  const symbolKind = schema.symbolKind ?? "query"
  return {
    projectId: schema.projectId,
    projectKind: schema.projectKind,
    sourceRoot,
    directory,
    owningProject,
    symbolId,
    symbolKind,
    symbolName,
    symbolNames,
    reactivityKey: `${schema.projectId}.${symbolId}.changed`,
    atomId: `${symbolNames.propertyName}Atom`,
    diagnosticRules: symbolDiagnosticRules(symbolKind),
    generatedPath: joinPath(directory, "attune.project-facts.generated.ts"),
    workerObservationPath: joinPath(directory, "attune.project-observations.ts"),
  }
}

const diagnosticRuleObjects = (ids: readonly string[]): string =>
  ids
    .map(
      (id) =>
        `        {\n          id: ${literal(id)},\n          reason: "Generated symbol diagnostic rule.",\n        },`,
    )
    .join("\n")

const contractSource = (model: ProjectFactsGeneratorModel): string => {
  const className = model.symbolNames.className
  const symbolProperty = model.symbolNames.propertyName
  const metadata = symbolMetadata(model)
  const metadataBlock = metadata.length > 0 ? `\n${metadata}` : ""

  return `import { Layer, Schema } from "effect"
import { defineAttuneProjectFacts } from "@attune/framework-protocol"

/**
 * Generated by @attune/nx:project-facts.
 * This file declares mechanical project/source_file/symbol/schema/edge/
 * artifact/observation/diagnostic/repair facts for the program index.
 */
export const ProjectRuntimeRoots = {
  reactivityKeys: ${stringArray([model.reactivityKey])},
  atoms: ${stringArray([model.atomId])},
} as const

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

export const ProjectFacts = defineAttuneProjectFacts({
  id: ${literal(model.projectId)},
  kind: ${literal(model.projectKind)},
  symbols: [
    {
      id: ${literal(model.symbolId)},
      name: ${literal(model.symbolName)},
      kind: ${literal(model.symbolKind)},
      input: ${className}Input,
      output: ${className}Output,
      error: ${className}Error,
      writes: [
        {
          id: ${literal(model.reactivityKey)},
          kind: "reactivity-key" as const,
        },
        {
          id: ${literal(model.atomId)},
          kind: "atom" as const,
        },
      ],
      invariants: [
${diagnosticRuleObjects(model.diagnosticRules)}
      ],${metadataBlock}
    },
  ],
  edges: [
    ...ProjectRuntimeRoots.reactivityKeys.map((id) => ({
      id,
      kind: "reactivity-key" as const,
    })),
    ...ProjectRuntimeRoots.atoms.map((id) => ({
      id,
      kind: "atom" as const,
    })),
  ],
} as const)
export type ProjectFacts = typeof ProjectFacts

export const ProjectLayer = Layer.empty
export type ProjectLayer = typeof ProjectLayer

export const ProgramSymbolAccessors = {
  ${literal(model.symbolId)}: (_input: ${className}Input): ${className}Output => ({
    ok: true,
  }),
} as const
export type ProgramSymbolAccessors = typeof ProgramSymbolAccessors

export const programTestLayer = {
  layer: ProjectLayer,
  provides: [] as const,
  requires: [] as const,
  publicAccessors: ProgramSymbolAccessors,
} as const
export type programTestLayer = typeof programTestLayer
`
}

const generatedSource = (model: ProjectFactsGeneratorModel): string =>
  `import {
  ProjectFacts,
  ProjectRuntimeRoots,
  ${model.symbolNames.className}Input,
  ${model.symbolNames.className}Output,
} from "./attune.package.js"

/**
 * Generated by @attune/nx:project-facts.
 * Deterministic artifact facts are derived from source and are not workflow
 * truth. Runtime/cache rows live under framework-owned program-index storage.
 */
export const ProgramSymbolRegistry = {
  ${literal(model.symbolId)}: {
    symbol: ProjectFacts.symbols[0],
    input: ${model.symbolNames.className}Input,
    output: ${model.symbolNames.className}Output,
    writes: {
      reactivityKeys: ProjectRuntimeRoots.reactivityKeys,
      atoms: ProjectRuntimeRoots.atoms,
    },
  },
} as const
export type ProgramSymbolRegistry = typeof ProgramSymbolRegistry

export const ProgramObservationPlan = {
  projectId: ProjectFacts.id,
  symbolIds: [${literal(model.symbolId)}],
  registry: "ProgramSymbolRegistry",
  workerModule: "./attune.project-observations.js",
  observationRoot: ".attune/cache/observations",
  checkedInReports: false,
  diagnosticRules: ${stringArray(model.diagnosticRules)},
} as const
export type ProgramObservationPlan = typeof ProgramObservationPlan

export const ProgramRuntimeGraph = {
  projectId: ProjectFacts.id,
  symbolEdges: [
    {
      symbolId: ${literal(model.symbolId)},
      reactivityKey: ${literal(model.reactivityKey)},
      atomId: ${literal(model.atomId)},
    },
  ],
} as const
export type ProgramRuntimeGraph = typeof ProgramRuntimeGraph

export const ProgramGeneratedArtifacts = [
  {
    path: "./attune.project-facts.generated.ts",
    kind: "symbol-registry",
    owner: "@attune/nx:project-facts",
  },
  {
    path: "./attune.project-facts.generated.ts",
    kind: "observation-plan",
    owner: "@attune/nx:project-facts",
  },
  {
    path: "./attune.project-observations.ts",
    kind: "worker-observation-module",
    owner: "@attune/nx:project-facts",
  },
] as const
export type ProgramGeneratedArtifacts = typeof ProgramGeneratedArtifacts

export const ProgramReportPolicy = {
  checkedInReports: "forbidden",
  allowedEphemeralRoots: [
    ".attune/cache",
    "dist/observations",
    "coverage",
  ],
} as const
export type ProgramReportPolicy = typeof ProgramReportPolicy
`

const workerObservationSource = (
  model: ProjectFactsGeneratorModel,
): string => `import { assert, propertyFor } from "@fast-check/worker"

/**
 * Generated by @attune/nx:project-facts.
 * Worker observation builders are URL-addressable so framework runtime can
 * collect local observations without checked-in report artifacts.
 */
export const ProgramWorkerObservationBuilder = propertyFor(new URL(import.meta.url), {
  isolationLevel: "observation",
  randomSource: "worker",
})

export const ProgramWorkerAssert = assert

export const ProgramWorkerObservations = {
  ${literal(model.symbolId)}: {
    symbolId: ${literal(model.symbolId)},
    build: ProgramWorkerObservationBuilder,
    assert: ProgramWorkerAssert,
    observationRoot: ".attune/cache/observations",
    timeoutSeconds: 30,
    isolationLevel: "observation",
    randomSource: "worker",
  },
} as const
export type ProgramWorkerObservations = typeof ProgramWorkerObservations
`

export default function projectFactsGenerator(
  tree: GeneratorTree,
  schema: ProjectFactsGeneratorSchema,
): GeneratorTask {
  const model = modelFor(schema)
  const contractPath = joinPath(model.directory, "attune.package.ts")

  writeTextIfChanged(tree, contractPath, contractSource(model))
  writeTextIfChanged(tree, model.generatedPath, generatedSource(model))
  writeTextIfChanged(
    tree,
    model.workerObservationPath,
    workerObservationSource(model),
  )

  upsertSourceBom(tree, {
    generatorName: "@attune/nx:project-facts",
    generatorVersion: schema.generatorVersion,
    generatorRevision: schema.generatorRevision,
    owningProject: model.owningProject,
    projectRoot: model.sourceRoot,
    sourceShapeKind: "project-facts",
    options: {
      directory: model.directory,
      owningProject: model.owningProject,
      projectId: model.projectId,
      projectKind: model.projectKind,
      sourceRoot: model.sourceRoot,
      symbolId: model.symbolId,
      symbolKind: model.symbolKind,
      symbolName: model.symbolName,
    },
    ownedFiles: [
      contractPath,
      model.generatedPath,
      model.workerObservationPath,
    ],
    editableRegions: [
      {
        file: contractPath,
        marker: "Generated by @attune/nx:project-facts",
        description:
          "Project facts scaffold; add program symbols through project-facts sync/generation.",
      },
      {
        file: model.generatedPath,
        marker: "ProgramSymbolRegistry",
        description:
          "Generated symbol registry, observation plan, runtime graph, and no-report policy.",
      },
      {
        file: model.workerObservationPath,
        marker: "propertyFor(new URL(import.meta.url)",
        description:
          "Worker-compatible observation module scaffold; runtime supplies inputs.",
      },
    ],
    syncTargets: [
      { project: model.owningProject, target: "sync-project-facts" },
    ],
    checkTargets: [
      { project: model.owningProject, target: "typecheck" },
      { project: "workspace", target: "attune-check" },
    ],
    openspecChangeId:
      schema.openspecChangeId ?? "promote-program-index-runtime-substrate",
  })
}
