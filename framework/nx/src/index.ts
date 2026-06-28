import {
  hashProgramValue,
  NxTarget,
  RecipePublicTargets,
  RecipeRepairPlan,
  type ProgramArtifactRecord,
  type ProgramDiagnostic,
  type RecipeDefinition,
  type RecipeDiagnostic,
  type RecipePublicTargetKind,
  type RecipeRepair,
  type ProgramSchemaDescriptor,
  type ProgramSymbolDescriptor,
} from "@attune/framework-protocol"
import { Schema } from "effect"
import type { TargetConfiguration } from "nx/src/devkit-exports"

export * from "./recipes.js"

export interface FrameworkNxActionPlan {
  readonly actionId: string
  readonly title: string
  readonly sourcePath: string
  readonly projectId: string
  readonly symbolId?: string
  readonly generatorOrTarget: string
  readonly options: Readonly<Record<string, unknown>>
  readonly validationTarget?: string
}

export interface AttuneRepairPlan {
  readonly diagnosticId: string
  readonly safety: "safe" | "needs-review" | "manual-only"
  readonly target: string
  readonly command: string
  readonly generator?: string
  readonly route?: string
  readonly repairKind: string
  readonly changes: readonly {
    readonly path: string
    readonly kind: "create" | "update" | "delete" | "regenerate"
    readonly generated: boolean
  }[]
  readonly doNotEdit?: readonly string[]
  readonly validateAfter?: readonly string[]
  readonly explanation: string
}

export const FrameworkNxActionPlanSchema = Schema.Struct({
  actionId: Schema.String,
  title: Schema.String,
  sourcePath: Schema.String,
  projectId: Schema.String,
  symbolId: Schema.optional(Schema.String),
  generatorOrTarget: Schema.String,
  options: Schema.Record(Schema.String, Schema.Unknown),
  validationTarget: Schema.optional(Schema.String),
})

export const AttuneRepairPlanSchema = Schema.Struct({
  diagnosticId: Schema.String,
  safety: Schema.Literals(["safe", "needs-review", "manual-only"] as const),
  target: Schema.String,
  command: Schema.String,
  generator: Schema.optional(Schema.String),
  route: Schema.optional(Schema.String),
  repairKind: Schema.String,
  changes: Schema.Array(Schema.Struct({
    path: Schema.String,
    kind: Schema.Literals(["create", "update", "delete", "regenerate"] as const),
    generated: Schema.Boolean,
  })),
  doNotEdit: Schema.optional(Schema.Array(Schema.String)),
  validateAfter: Schema.optional(Schema.Array(Schema.String)),
  explanation: Schema.String,
})

export const FrameworkNxRecipePublicTargetSchema = Schema.Struct({
  recipeId: Schema.String,
  projectId: Schema.String,
  kind: Schema.Literals(["check", "repair", "proof", "report"] as const),
  target: Schema.String,
  command: Schema.String,
  sourcePath: Schema.String,
  evidenceRequirements: Schema.Array(Schema.String),
  targetConfiguration: Schema.Unknown,
})

export const FrameworkNxGeneratedArtifactKindSchema = Schema.Literals([
  "program-harness",
  "symbol-registry",
  "observation-scaffold",
  "atom-projection-edges",
  "schema-observations",
] as const)
export type FrameworkNxGeneratedArtifactKind = typeof FrameworkNxGeneratedArtifactKindSchema.Type

export interface FrameworkNxGeneratedArtifact {
  readonly kind: FrameworkNxGeneratedArtifactKind
  readonly path: string
  readonly generatorId: string
  readonly content: string
  readonly contentHash: string
}

export interface FrameworkNxDescriptorHashRecord {
  readonly recordId: string
  readonly schemaDescriptorId: string
  readonly projectId: string
  readonly sourcePath: string
  readonly descriptorHash: string
  readonly status: "current"
}

export interface FrameworkNxReportOutputFinding {
  readonly path: string
  readonly reason: string
  readonly suggestedTarget: string
}

export interface FrameworkNxRecipePublicTarget {
  readonly recipeId: string
  readonly projectId: string
  readonly kind: RecipePublicTargetKind
  readonly target: string
  readonly command: string
  readonly sourcePath: string
  readonly evidenceRequirements: readonly string[]
  readonly targetConfiguration: TargetConfiguration
}

export interface FrameworkNxMaterializationPlan {
  readonly projectId: string
  readonly schemaDescriptorId: string
  readonly sourcePath: string
  readonly descriptorHashRecord: FrameworkNxDescriptorHashRecord
  readonly actions: readonly FrameworkNxActionPlan[]
  readonly artifacts: readonly FrameworkNxGeneratedArtifact[]
  readonly generatedArtifactRecords: readonly ProgramArtifactRecord[]
  readonly checkedInReportFindings: readonly FrameworkNxReportOutputFinding[]
}

const generatorTargets = {
  protocolMaterialize: "@attune/framework-nx:protocol-materialize",
  programHarness: "@attune/framework-nx:program-harness",
  symbolRegistry: "@attune/framework-nx:symbol-registry",
  observationScaffold: "@attune/framework-nx:observation-scaffold",
  atomProjectionEdge: "@attune/framework-nx:atom-projection-edge",
  schemaObservations: "@attune/framework-nx:schema-observations",
  frameworkDiagnostics: "workspace:attune-check",
  packageContract: "@attune/nx:package-contract",
  effectService: "@attune/nx:effect-service",
  joernTemplate: "@attune/nx:joern-template",
  cocoindexMcpTool: "@attune/nx:cocoindex-mcp-tool",
} as const

export const frameworkRepairTargets = {
  workspaceCheck: "workspace:attune-check",
  workspaceRepair: "workspace:attune-repair",
  projectCheck: (project: string): string => `${project}:attune-check`,
  projectRepair: (project: string): string => `${project}:attune-repair`,
  internalProjectRepairSymbolRegistry: (project: string): string => `${project}:attune:repair-symbol-registry`,
  internalProjectRepairPropertyObservations: (project: string): string =>
    `${project}:attune:repair-property-observations`,
  internalProjectRepairSchemaObservations: (project: string): string => `${project}:attune:repair-schema-observations`,
  internalProjectRepairObservations: (project: string): string => `${project}:attune:repair-observations`,
  internalProjectRepairArtifactFreshness: (project: string): string =>
    `${project}:attune:repair-artifact-freshness`,
} as const

const repairRoutes = {
  "attune/recipe/missing-project-declaration": {
    generator: generatorTargets.packageContract,
    repairKind: "recipe-declaration",
    changePath: "src/attune.package.ts",
  },
  "attune/recipe/stale-project-declaration": {
    generator: generatorTargets.packageContract,
    repairKind: "recipe-declaration",
    changePath: "src/attune.package.ts",
  },
  "attune/recipe/missing-symbol-registry": {
    generator: generatorTargets.symbolRegistry,
    repairKind: "symbol-registry",
    changePath: ".attune/cache/generated/<project>/attune-symbol-registry.ts",
  },
  "attune/recipe/missing-observation-scaffold": {
    generator: generatorTargets.observationScaffold,
    repairKind: "observation-scaffold",
    changePath: ".attune/cache/generated/<project>/attune-observation-scaffold.ts",
  },
  "attune/recipe/missing-schema-observations": {
    generator: generatorTargets.schemaObservations,
    repairKind: "schema-observations",
    changePath: ".attune/cache/generated/<project>/attune-schema-observations.ts",
  },
  "attune/recipe/missing-effect-service-boundary": {
    generator: generatorTargets.effectService,
    repairKind: "effect-service",
    changePath: "src/<service>.ts",
  },
  "attune/recipe/missing-atom-projection-edge": {
    generator: generatorTargets.atomProjectionEdge,
    repairKind: "atom-projection-edge",
    changePath: ".attune/cache/generated/<project>/attune-atom-projection-edges.ts",
  },
  "attune/recipe/missing-joern-template": {
    generator: generatorTargets.joernTemplate,
    repairKind: "joern-template",
    changePath: "src/templates/<template>.ts",
  },
  "attune/recipe/missing-cocoindex-tool": {
    generator: generatorTargets.cocoindexMcpTool,
    repairKind: "cocoindex-tool",
    changePath: "src/tools/<tool>.ts",
  },
} as const

const generatedFileNames: Record<FrameworkNxGeneratedArtifactKind, string> = {
  "program-harness": "attune-program-harness.ts",
  "symbol-registry": "attune-symbol-registry.ts",
  "observation-scaffold": "attune-observation-scaffold.ts",
  "atom-projection-edges": "attune-atom-projection-edges.ts",
  "schema-observations": "attune-schema-observations.ts",
}

const artifactGeneratorIds: Record<FrameworkNxGeneratedArtifactKind, string> = {
  "program-harness": generatorTargets.programHarness,
  "symbol-registry": generatorTargets.symbolRegistry,
  "observation-scaffold": generatorTargets.observationScaffold,
  "atom-projection-edges": generatorTargets.atomProjectionEdge,
  "schema-observations": generatorTargets.schemaObservations,
}

const reportPathPatterns = [
  /(^|[/.-])protocol[-.]?delta(s)?([/.-]|$)/i,
  /(^|[/.-])obligation[-.]?report(s)?([/.-]|$)/i,
  /(^|[/.-])observations[-.]?summar(y|ies)([/.-]|$)/i,
  /(^|[/.-])architecture[-.]?(summar(y|ies)|report(s)?)([/.-]|$)/i,
  /(^|[/.-])generated[-.]?report(s)?([/.-]|$)/i,
  /(^|[/.-])linear[-.]?summar(y|ies)([/.-]|$)/i,
  /(^|[/.-])github[-.]?summar(y|ies)([/.-]|$)/i,
  /(^|[/.-])cloud[-.]?agent[-.]?report(s)?([/.-]|$)/i,
]

export const createFrameworkNxActionPlan = (
  plan: FrameworkNxActionPlan,
): FrameworkNxActionPlan => plan

const validationTargetFor = (projectId: string): string => `${projectId}:check-generated`

const optionalOperation = (symbolId: string | undefined): Record<string, string> =>
  symbolId === undefined ? {} : { symbolId }

export const protocolMaterializeAction = (
  projectId: string,
  sourcePath: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.protocol.materialize",
    title: "Refresh protocol materialization",
    sourcePath,
    projectId,
    generatorOrTarget: generatorTargets.protocolMaterialize,
    options: { projectId },
    validationTarget: validationTargetFor(projectId),
  })

export const symbolRegistryAction = (
  projectId: string,
  sourcePath: string,
  symbolId?: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.program.symbol-registry",
    title: "Generate symbol registry",
    sourcePath,
    projectId,
    ...optionalOperation(symbolId),
    generatorOrTarget: generatorTargets.symbolRegistry,
    options: {
      projectId,
      ...optionalOperation(symbolId),
    },
    validationTarget: validationTargetFor(projectId),
  })

export const programHarnessAction = (
  projectId: string,
  sourcePath: string,
  symbolId?: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.protocol.program-harness",
    title: "Generate Schema-coded package harness",
    sourcePath,
    projectId,
    ...optionalOperation(symbolId),
    generatorOrTarget: generatorTargets.programHarness,
    options: {
      projectId,
      ...optionalOperation(symbolId),
    },
    validationTarget: validationTargetFor(projectId),
  })

export const observationScaffoldAction = (
  projectId: string,
  sourcePath: string,
  symbolId?: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.program.observation-scaffold",
    title: "Generate observation scaffold",
    sourcePath,
    projectId,
    ...optionalOperation(symbolId),
    generatorOrTarget: generatorTargets.observationScaffold,
    options: {
      projectId,
      ...optionalOperation(symbolId),
    },
    validationTarget: validationTargetFor(projectId),
  })

export const atomProjectionEdgeAction = (
  projectId: string,
  sourcePath: string,
  symbolId?: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.program.atom-projection-edge",
    title: "Generate missing atom projection edge",
    sourcePath,
    projectId,
    ...optionalOperation(symbolId),
    generatorOrTarget: generatorTargets.atomProjectionEdge,
    options: {
      projectId,
      ...optionalOperation(symbolId),
    },
    validationTarget: validationTargetFor(projectId),
  })

export const schemaObservationsAction = (
  projectId: string,
  sourcePath: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.program.schema-observations",
    title: "Refresh schema observations",
    sourcePath,
    projectId,
    generatorOrTarget: generatorTargets.schemaObservations,
    options: { projectId },
    validationTarget: validationTargetFor(projectId),
  })

export const frameworkDiagnosticsAction = (
  projectId: string,
  sourcePath: string,
): FrameworkNxActionPlan =>
  createFrameworkNxActionPlan({
    actionId: "attune.protocol.framework-diagnostics",
    title: "Run framework diagnostics",
    sourcePath,
    projectId,
    generatorOrTarget: generatorTargets.frameworkDiagnostics,
    options: { projectId },
    validationTarget: generatorTargets.frameworkDiagnostics,
  })

export const frameworkNxActionPlanFromRecipe = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
): FrameworkNxActionPlan => {
  const target = NxTarget.fromRecipe(recipe)
  const projectId = recipe.projectId ?? projectNameFromRecipeId(recipe.id)

  return createFrameworkNxActionPlan({
    actionId: `attune.recipe.${recipe.id}`,
    title: recipe.title ?? `Run recipe ${recipe.id}`,
    sourcePath: recipe.sourcePath ?? recipe.id,
    projectId,
    generatorOrTarget: target,
    options: {
      projectId,
      recipeId: recipe.id,
    },
    validationTarget: target,
  })
}

export const frameworkNxPublicTargetsFromRecipe = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
): readonly FrameworkNxRecipePublicTarget[] => {
  const projectId = recipe.projectId ?? projectNameFromRecipeId(recipe.id)

  return RecipePublicTargets.fromRecipe(recipe).map((target) => ({
    recipeId: recipe.id,
    projectId,
    kind: target.kind,
    target: target.target,
    command: `nx run ${target.target}`,
    sourcePath: recipe.sourcePath ?? recipe.id,
    evidenceRequirements: [...(target.evidenceRequirements ?? recipe.validationEvidence ?? [])],
    targetConfiguration: recipePublicTargetConfiguration(recipe, target.kind, target.target),
  }))
}

const recipePublicTargetConfiguration = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
  kind: RecipePublicTargetKind,
  target: string,
): TargetConfiguration => ({
  executor: "@attune/nx:toolchain",
  metadata: {
    description: `Recipe ${kind} projection for ${recipe.id}.`,
    attune: {
      tier: "public",
      surface: kind,
      recipeId: recipe.id,
    },
  },
  options: {
    targetProject: recipe.projectId ?? projectNameFromRecipeId(recipe.id),
    tool: "workspace",
    action: "check",
    toolId: "nx-targets",
    parameters: {
      targets: [target],
      recipeId: recipe.id,
      recipeSurface: kind,
    },
    dryRun: false,
  },
})

export const repairPlanFromRecipeRepair = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
  repair: RecipeRepair,
): AttuneRepairPlan => {
  const target = repair.nxTarget ?? NxTarget.fromRecipe(recipe)
  const changePaths = repair.allowedFiles.length === 0
    ? [recipe.sourcePath ?? recipe.id]
    : repair.allowedFiles

  return {
    diagnosticId: repair.diagnosticId ?? repair.repairId,
    safety: repair.risk,
    target,
    command: `nx run ${target}`,
    route: `recipe:${recipe.id}`,
    repairKind: repair.kind,
    changes: changePaths.map((path) => ({
      path,
      kind: repair.kind === "managed-lifecycle" ? "regenerate" : "update",
      generated: isGeneratedRepairPath(path),
    })),
    doNotEdit: [
      "framework-owned generated artifacts unless the recipe repair route writes them",
    ],
    validateAfter: repair.evidenceRequirements.length === 0 ? [target] : repair.evidenceRequirements,
    explanation: repair.title,
  }
}

export const repairPlansFromRecipeDiagnostic = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
  diagnostic: RecipeDiagnostic,
): readonly AttuneRepairPlan[] =>
  RecipeRepairPlan.fromRecipe(recipe, [diagnostic]).map((repair) =>
    repairPlanFromRecipeRepair(recipe, repair)
  )

export const generatedArtifactPath = (
  sourcePath: string,
  kind: FrameworkNxGeneratedArtifactKind,
  projectId = projectNameFromSourcePath(sourcePath),
): string => `.attune/cache/generated/${projectId}/${generatedFileNames[kind]}`

export const createDescriptorHashRecord = (
  descriptor: ProgramSchemaDescriptor,
): FrameworkNxDescriptorHashRecord => ({
  recordId: `${descriptor.schemaDescriptorId}:descriptor-hash`,
  schemaDescriptorId: descriptor.schemaDescriptorId,
  projectId: descriptor.projectId,
  sourcePath: descriptor.sourcePath,
  descriptorHash: descriptor.descriptorHash,
  status: "current",
})

export const hashGeneratedArtifactContent = (content: string): string =>
  hashProgramValue(content)

export const createGeneratedArtifact = (
  descriptor: ProgramSchemaDescriptor,
  kind: FrameworkNxGeneratedArtifactKind,
): FrameworkNxGeneratedArtifact => {
  const content = generatedArtifactContent(descriptor, kind)
  return {
    kind,
    path: generatedArtifactPath(descriptor.sourcePath, kind, descriptor.projectId),
    generatorId: artifactGeneratorIds[kind],
    content,
    contentHash: hashGeneratedArtifactContent(content),
  }
}

export const createGeneratedArtifactRecord = (
  descriptor: ProgramSchemaDescriptor,
  artifact: FrameworkNxGeneratedArtifact,
  actualContent?: string,
): ProgramArtifactRecord => {
  const actualHash = actualContent === undefined ? undefined : hashGeneratedArtifactContent(actualContent)
  return {
    artifactId: `${descriptor.projectId}:${artifact.kind}`,
    schemaDescriptorId: descriptor.schemaDescriptorId,
    projectId: descriptor.projectId,
    path: artifact.path,
    generatorId: artifact.generatorId,
    expectedHash: artifact.contentHash,
    ...(actualHash === undefined ? {} : { actualHash }),
    status: actualHash === undefined
      ? "missing"
      : actualHash === artifact.contentHash
        ? "current"
        : "stale",
  }
}

export const createFrameworkMaterializationPlan = (
  descriptor: ProgramSchemaDescriptor,
  actualGeneratedContent: Readonly<Record<string, string>> = {},
  candidateOutputPaths: readonly string[] = [],
): FrameworkNxMaterializationPlan => {
  const artifacts = ([
    "program-harness",
    "symbol-registry",
    "observation-scaffold",
    "atom-projection-edges",
    "schema-observations",
  ] as const).map((kind) => createGeneratedArtifact(descriptor, kind))

  return {
    projectId: descriptor.projectId,
    schemaDescriptorId: descriptor.schemaDescriptorId,
    sourcePath: descriptor.sourcePath,
    descriptorHashRecord: createDescriptorHashRecord(descriptor),
    actions: [
      protocolMaterializeAction(descriptor.projectId, descriptor.sourcePath),
      frameworkDiagnosticsAction(descriptor.projectId, descriptor.sourcePath),
      programHarnessAction(descriptor.projectId, descriptor.sourcePath),
      symbolRegistryAction(descriptor.projectId, descriptor.sourcePath),
      observationScaffoldAction(descriptor.projectId, descriptor.sourcePath),
      atomProjectionEdgeAction(descriptor.projectId, descriptor.sourcePath),
      schemaObservationsAction(descriptor.projectId, descriptor.sourcePath),
    ],
    artifacts,
    generatedArtifactRecords: artifacts.map((artifact) =>
      createGeneratedArtifactRecord(descriptor, artifact, actualGeneratedContent[artifact.path])
    ),
    checkedInReportFindings: detectCheckedInReportOutputs([
      ...candidateOutputPaths,
      ...artifacts.map((artifact) => artifact.path),
    ]),
  }
}

export const detectCheckedInReportOutputs = (
  paths: readonly string[],
): readonly FrameworkNxReportOutputFinding[] =>
  paths
    .filter((path) => !isEphemeralOutputPath(path))
    .filter((path) => reportPathPatterns.some((pattern) => pattern.test(path)))
    .map((path) => ({
      path,
      reason: "Protocol reports and summaries must be emitted to stdout, CI artifacts, or gitignored cache paths.",
      suggestedTarget: frameworkRepairTargets.workspaceCheck,
    }))

export const hasCheckedInReportOutputs = (paths: readonly string[]): boolean =>
  detectCheckedInReportOutputs(paths).length > 0

const projectNameFromSourcePath = (sourcePath: string): string => {
  const normalized = sourcePath.replaceAll("\\", "/")
  const match = /^(?:packages|framework)\/(?<project>[^/]+)\//u.exec(normalized)
  return match?.groups?.project ?? "workspace"
}

const projectNameFromRecipeId = (recipeId: string): string => {
  const [projectId] = recipeId.split(/[.:/]/u)
  return projectId === undefined || projectId.length === 0 ? "workspace" : projectId
}

export const repairPlanForDiagnostic = (
  diagnostic: Pick<ProgramDiagnostic, "code" | "projectId" | "sourcePath" | "explanation"> & {
    readonly diagnosticId?: string
  },
): AttuneRepairPlan | undefined => {
  const route = repairRoutes[diagnostic.code as keyof typeof repairRoutes]
  if (route === undefined) return undefined

  const target = frameworkRepairTargets.projectRepair(diagnostic.projectId)
  const changePath = route.changePath.replace("<project>", diagnostic.projectId)

  return {
    diagnosticId: diagnostic.diagnosticId ?? diagnostic.code,
    safety: "safe",
    target,
    command: `nx run ${target} --diagnostic ${diagnostic.diagnosticId ?? diagnostic.code}`,
    generator: route.generator,
    repairKind: route.repairKind,
    changes: [{
      path: changePath,
      kind: route.repairKind === "recipe-declaration" ? "update" : "regenerate",
      generated: changePath.includes(".attune/cache/") || changePath.includes(".generated."),
    }],
    doNotEdit: [
      "src/attune.generated.ts",
      "src/attune.contract.generated.ts",
      "framework-owned package-contract typecheck aggregate",
      "framework-owned recipe receipt/cache projections",
    ],
    validateAfter: [
      frameworkRepairTargets.projectCheck(diagnostic.projectId),
      `${diagnostic.projectId}:typecheck`,
      `${diagnostic.projectId}:test`,
    ],
    explanation: diagnostic.explanation,
  }
}

const isGeneratedRepairPath = (path: string): boolean =>
  path.startsWith(".attune/cache/") ||
  path.includes("/generated/") ||
  path.includes(".generated.") ||
  path.includes("framework/architecture/src/generated/")

const isEphemeralOutputPath = (path: string): boolean => {
  const normalized = path.replaceAll("\\", "/")
  return normalized.startsWith(".attune/cache/") ||
    normalized.startsWith(".nx/cache/") ||
    normalized.includes("/.attune/cache/") ||
    normalized.includes("/.nx/cache/")
}

const generatedArtifactContent = (
  descriptor: ProgramSchemaDescriptor,
  kind: FrameworkNxGeneratedArtifactKind,
): string => {
  switch (kind) {
    case "program-harness":
      return programHarnessContent(descriptor)
    case "symbol-registry":
      return symbolRegistryContent(descriptor)
    case "observation-scaffold":
      return observationScaffoldContent(descriptor)
    case "atom-projection-edges":
      return atomProjectionEdgeContent(descriptor)
    case "schema-observations":
      return schemaObservationsContent(descriptor)
  }
}

const header = (target: string, descriptor: ProgramSchemaDescriptor): string =>
  [
    `// Generated by ${target}.`,
    `// Source: ${descriptor.sourcePath}`,
    `// Descriptor: ${descriptor.descriptorHash}`,
    "",
  ].join("\n")

const programHarnessContent = (descriptor: ProgramSchemaDescriptor): string =>
  `${header(generatorTargets.programHarness, descriptor)}import {
  createProgramHarnessClient,
  defineObservationProducer,
  defineProjectObservationProducerMap,
  defineProgramHarnessHandlers,
  propertyRunObservation,
  publicAccessorHandler,
} from "@attune/framework-testing"
import {
  PackageContract,
  programTestLayer,
} from "../attune.package.js"

export const ProgramHarnessSymbolIds = ${tsLiteral(descriptor.operations.map((operation) => operation.id))} as const

export const ProgramHarnessProtocol = ${tsLiteral({
    projectId: descriptor.projectId,
    schemaDescriptorId: descriptor.schemaDescriptorId,
    descriptorHash: descriptor.descriptorHash,
    controls: [
      "reset",
      "snapshot",
      "observe",
      "flush-observations",
      "replay-counterexample",
      "get-coverage",
      "get-atom-graph",
    ],
    operations: descriptor.operations.map((operation) => ({
      symbolId: operation.id,
      operationKind: operation.kind,
      rpcId: `${descriptor.projectId}.operation.${operation.id}`,
      payloadSchema: `${descriptor.projectId}.${operation.id}.input`,
      successSchema: `${descriptor.projectId}.${operation.id}.output`,
      ...(operation.errorSchema === undefined
        ? {}
        : { errorSchema: `${descriptor.projectId}.${operation.id}.error` }),
      evidenceSchema: `${descriptor.projectId}.${operation.id}.observations`,
      replaySchema: `${descriptor.projectId}.${operation.id}.replay`,
    })),
    effectRpcBackend: {
      adapter: "@effect/rpc",
      status: "optional",
      reason: "Schema-coded harness protocol is the root; runtime RPC remains a future backend.",
    },
  })} as const

export const ProgramHarnessHandlers = defineProgramHarnessHandlers(PackageContract, {
${descriptor.operations.map((operation) => `  ${JSON.stringify(operation.id)}: publicAccessorHandler(${JSON.stringify(operation.id)}),`).join("\n")}
} as const)
export type ProgramHarnessHandlers = typeof ProgramHarnessHandlers

export const ProgramHarnessObservationProducers = defineProjectObservationProducerMap(PackageContract, {
${descriptor.operations.map((operation) => `  ${JSON.stringify(operation.id)}: defineObservationProducer({
    id: ${JSON.stringify(`${operation.id}.observation-scaffold`)},
    symbolId: ${JSON.stringify(operation.id)},
    produce: (context) => [
      propertyRunObservation(context, ${JSON.stringify(operation.id)}, {
        harness: "schema-coded-program-harness",
        rpcId: ${JSON.stringify(`${descriptor.projectId}.operation.${operation.id}`)},
        laws: ${tsLiteral(operation.laws ?? [])},
      }),
    ],
  }),`).join("\n")}
} as const)
export type ProgramHarnessObservationProducers = typeof ProgramHarnessObservationProducers

export const ProgramHarnessClient = createProgramHarnessClient({
  contract: PackageContract,
  programTestLayer: programTestLayer,
  handlers: ProgramHarnessHandlers,
  observationProducers: ProgramHarnessObservationProducers,
})
export type ProgramHarnessClient = typeof ProgramHarnessClient
`

const symbolRegistryContent = (descriptor: ProgramSchemaDescriptor): string =>
  `${header(generatorTargets.symbolRegistry, descriptor)}export const SymbolRegistry = ${tsLiteral({
    projectId: descriptor.projectId,
    schemaDescriptorId: descriptor.schemaDescriptorId,
    descriptorHash: descriptor.descriptorHash,
    symbols: descriptor.operations.map((operation) => ({
      symbolId: operation.id,
      symbolKind: operation.kind,
      inputSchema: operation.inputSchema,
      outputSchema: operation.outputSchema,
      ...(operation.errorSchema === undefined ? {} : { errorSchema: operation.errorSchema }),
      diagnosticRules: operation.laws ?? [],
      projectionEdges: normalizeProjectionEdges(operation),
    })),
  })} as const

export type SymbolRegistry = typeof SymbolRegistry
`

const observationScaffoldContent = (descriptor: ProgramSchemaDescriptor): string =>
  `${header(generatorTargets.observationScaffold, descriptor)}export const ObservationScaffold = ${tsLiteral({
    projectId: descriptor.projectId,
    schemaDescriptorId: descriptor.schemaDescriptorId,
    descriptorHash: descriptor.descriptorHash,
    observationKinds: ["schema-decode", "property-run", "diagnostic-rule-observed", "atom-movement"],
    symbols: descriptor.operations.map((operation) => ({
      symbolId: operation.id,
      symbolKind: operation.kind,
      requiredObservations: [
        "schema-decode",
        "property-run",
        ...((operation.laws?.length ?? 0) > 0 ? ["diagnostic-rule-observed"] : []),
        ...(hasTouchedProjectionEdges(operation) ? ["atom-movement", "reactivity-key"] : []),
      ],
      diagnosticRules: operation.laws ?? [],
      projectionEdges: normalizeProjectionEdges(operation),
    })),
  })} as const

export type ObservationScaffold = typeof ObservationScaffold
`

const atomProjectionEdgeContent = (descriptor: ProgramSchemaDescriptor): string =>
  `${header(generatorTargets.atomProjectionEdge, descriptor)}export const AtomProjectionEdges = ${tsLiteral({
    projectId: descriptor.projectId,
    schemaDescriptorId: descriptor.schemaDescriptorId,
    descriptorHash: descriptor.descriptorHash,
    reactivityKeys: descriptor.views.reactivityKeys,
    atoms: descriptor.views.atoms,
    edges: descriptor.operations.flatMap(symbolProjectionEdges),
  })} as const

export type AtomProjectionEdges = typeof AtomProjectionEdges
`

const schemaObservationsContent = (descriptor: ProgramSchemaDescriptor): string =>
  `${header(generatorTargets.schemaObservations, descriptor)}export const SchemaObservations = ${tsLiteral({
    projectId: descriptor.projectId,
    schemaDescriptorId: descriptor.schemaDescriptorId,
    descriptorHash: descriptor.descriptorHash,
    sourceLabels: [
      "project.symbol",
      "effect-schema.ast",
      "diagnostic-rule",
      "atom-projection-edge",
    ],
    symbols: Object.fromEntries(
      descriptor.operations.map((operation) => [
        operation.id,
        {
          symbolId: operation.id,
          symbolKind: operation.kind,
          sourceLabels: ["project.symbol", `${operation.kind}.metadata`],
          schemaSources: [
            { id: `${operation.id}.input`, schema: operation.inputSchema, role: "input" },
            { id: `${operation.id}.output`, schema: operation.outputSchema, role: "output" },
            ...(operation.errorSchema === undefined
              ? []
              : [{ id: `${operation.id}.error`, schema: operation.errorSchema, role: "error" }]),
          ],
          partitions: [
            `${operation.id}.input`,
            `${operation.id}.output`,
            ...((operation.laws ?? []).map((law) => `${operation.id}.diagnostic-rule.${law}`)),
            ...((operation.views?.reactivityKeys ?? []).map((key) => `${operation.id}.reactivity.${key}`)),
            ...((operation.views?.atoms ?? []).map((atom) => `${operation.id}.atom.${atom}`)),
          ],
          coverageSearch: [
            `${operation.id}.${operation.kind}.schema-branches`,
            ...(hasTouchedProjectionEdges(operation) ? [`${operation.id}.atom-graph-movement`] : []),
          ],
        },
      ]),
    ),
  })} as const

export type SchemaObservations = typeof SchemaObservations
`

const normalizeProjectionEdges = (
  operation: ProgramSymbolDescriptor,
): { readonly reactivityKeys: readonly string[]; readonly atoms: readonly string[] } => ({
  reactivityKeys: operation.views?.reactivityKeys ?? [],
  atoms: operation.views?.atoms ?? [],
})

const hasTouchedProjectionEdges = (operation: ProgramSymbolDescriptor): boolean =>
  (operation.views?.reactivityKeys?.length ?? 0) > 0 ||
  (operation.views?.atoms?.length ?? 0) > 0

const symbolProjectionEdges = (
  operation: ProgramSymbolDescriptor,
): readonly {
  readonly symbolId: string
  readonly reactivityKey?: string
  readonly atomId?: string
}[] => {
  const keys = operation.views?.reactivityKeys ?? []
  const atoms = operation.views?.atoms ?? []

  if (keys.length === 0) {
    return atoms.map((atomId) => ({
      symbolId: operation.id,
      atomId,
    }))
  }

  if (atoms.length === 0) {
    return keys.map((reactivityKey) => ({
      symbolId: operation.id,
      reactivityKey,
    }))
  }

  return keys.flatMap((reactivityKey) =>
    atoms.map((atomId) => ({
      symbolId: operation.id,
      reactivityKey,
      atomId,
    }))
  )
}

const tsLiteral = (value: unknown): string =>
  JSON.stringify(value, null, 2)
