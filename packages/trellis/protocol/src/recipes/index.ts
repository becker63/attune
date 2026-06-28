import { Schema } from "effect"
import type { ProgramDiagnostic, ProgramRepairAction, SourceRange } from "../diagnostics/index.js"

export const RecipeIoRoleSchema = Schema.Literals(["input", "output", "observation", "receipt"] as const)
export type RecipeIoRole = typeof RecipeIoRoleSchema.Type

export const RecipeHealthStatusSchema = Schema.Literals([
  "clean",
  "stale",
  "failed",
  "blocked",
  "drifted",
  "superseded",
  "unknown",
] as const)
export type RecipeHealthStatus = typeof RecipeHealthStatusSchema.Type

export const RecipeRunStatusSchema = Schema.Literals([
  "planned",
  "running",
  "passed",
  "failed",
  "blocked",
  "destroyed",
  "pruned",
] as const)
export type RecipeRunStatus = typeof RecipeRunStatusSchema.Type

export const ManagedRecipeLifecycleActionSchema = Schema.Literals([
  "plan",
  "apply",
  "run",
  "check",
  "migrate",
  "validate-sql",
  "stop",
  "destroy",
  "prune",
] as const)
export type ManagedRecipeLifecycleAction = typeof ManagedRecipeLifecycleActionSchema.Type

export const RecipeInvocationActionSchema = Schema.Literals([
  "generate",
  "check",
  "repair",
  "plan",
  "apply",
  "destroy",
  "prune",
  "fuzz",
  "validate-sql",
  "migrate",
  "generate-types",
  "stop",
] as const)
export type RecipeInvocationAction = typeof RecipeInvocationActionSchema.Type

export const RecipeInvocationRequestedBySchema = Schema.Struct({
  kind: Schema.Literals(["human", "agent", "system", "ci", "tool"] as const),
  id: Schema.optional(Schema.String),
  name: Schema.optional(Schema.String),
})
export type RecipeInvocationRequestedBy = typeof RecipeInvocationRequestedBySchema.Type

export const RecipeInvocationSourceSchema = Schema.Struct({
  surface: Schema.Literals(["nx", "cli", "lsp", "tend", "opencode", "test", "policy"] as const),
  projectId: Schema.optional(Schema.String),
  target: Schema.optional(Schema.String),
  cwd: Schema.optional(Schema.String),
  sourcePath: Schema.optional(Schema.String),
})
export type RecipeInvocationSource = typeof RecipeInvocationSourceSchema.Type

export const RecipeInvocationSchema = Schema.Struct({
  recipeId: Schema.String,
  action: RecipeInvocationActionSchema,
  input: Schema.optional(Schema.Unknown),
  parameters: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  runId: Schema.optional(Schema.String),
  requestedBy: Schema.optional(RecipeInvocationRequestedBySchema),
  startedAt: Schema.optional(Schema.String),
  source: Schema.optional(RecipeInvocationSourceSchema),
})
export type RecipeInvocation = typeof RecipeInvocationSchema.Type

export const ManagedRecipeLifecycleSubstrateKindSchema = Schema.Literals([
  "database-service",
  "container-runtime",
  "schema-codegen",
  "query-service",
  "sql-validation",
] as const)
export type ManagedRecipeLifecycleSubstrateKind = typeof ManagedRecipeLifecycleSubstrateKindSchema.Type

export const ManagedRecipeLifecycleSubstrateSchema = Schema.Struct({
  id: Schema.String,
  kind: ManagedRecipeLifecycleSubstrateKindSchema,
  tool: Schema.String,
  lifecycleActions: Schema.Array(ManagedRecipeLifecycleActionSchema),
  nxTarget: Schema.optional(Schema.String),
  evidence: Schema.optional(Schema.Array(Schema.String)),
})
export type ManagedRecipeLifecycleSubstrate = typeof ManagedRecipeLifecycleSubstrateSchema.Type

export const RecipeKindSchema = Schema.Literals(["recipe", "managed-recipe"] as const)
export type RecipeKind = typeof RecipeKindSchema.Type

export type RecipeId = string & { readonly RecipeId: unique symbol }
export type RecipeRunId = string & { readonly RecipeRunId: unique symbol }
export type RecipeReceiptId = string & { readonly RecipeReceiptId: unique symbol }
export type RecipeObservationId = string & { readonly RecipeObservationId: unique symbol }
export type RecipeDiagnosticId = string & { readonly RecipeDiagnosticId: unique symbol }
export type RecipeRepairId = string & { readonly RecipeRepairId: unique symbol }

export const recipeId = (value: string): RecipeId => stableId("recipe", value) as RecipeId
export const recipeRunId = (recipe: string, startedAt: string): RecipeRunId =>
  stableId("recipe-run", recipe, startedAt) as RecipeRunId
export const recipeReceiptId = (recipe: string, startedAt: string): RecipeReceiptId =>
  stableId("recipe-receipt", recipe, startedAt) as RecipeReceiptId
export const recipeObservationId = (
  recipe: string,
  observationKind: string,
  observedAt: string,
): RecipeObservationId =>
  stableId("recipe-observation", recipe, observationKind, observedAt) as RecipeObservationId
export const recipeDiagnosticId = (recipe: string, code: string, startedAt: string): RecipeDiagnosticId =>
  stableId("recipe-diagnostic", recipe, code, startedAt) as RecipeDiagnosticId
export const recipeRepairId = (diagnosticId: string): RecipeRepairId =>
  stableId("recipe-repair", diagnosticId) as RecipeRepairId

export const RecipePublicTargetKindSchema = Schema.Literals(["check", "repair", "proof", "report"] as const)
export type RecipePublicTargetKind = typeof RecipePublicTargetKindSchema.Type

export const RecipePublicTargetSchema = Schema.Struct({
  kind: RecipePublicTargetKindSchema,
  target: Schema.String,
  evidenceRequirements: Schema.optional(Schema.Array(Schema.String)),
})
export type RecipePublicTarget = typeof RecipePublicTargetSchema.Type

export const RecipeDependencySchema = Schema.Struct({
  recipeId: Schema.String,
  reason: Schema.optional(Schema.String),
})
export type RecipeDependency = typeof RecipeDependencySchema.Type

export const RecipeIoSchema = Schema.Struct({
  id: Schema.String,
  recipeId: Schema.String,
  role: RecipeIoRoleSchema,
  name: Schema.String,
  schemaName: Schema.optional(Schema.String),
  hash: Schema.optional(Schema.String),
  payload: Schema.optional(Schema.Unknown),
})
export type RecipeIo = typeof RecipeIoSchema.Type

export const RecipeReceiptSchema = Schema.Struct({
  receiptId: Schema.String,
  recipeId: Schema.String,
  runId: Schema.String,
  status: RecipeRunStatusSchema,
  startedAt: Schema.String,
  completedAt: Schema.optional(Schema.String),
  command: Schema.optional(Schema.String),
  stdoutSummary: Schema.optional(Schema.String),
  stderrSummary: Schema.optional(Schema.String),
  outputHash: Schema.optional(Schema.String),
  validationEvidence: Schema.optional(Schema.Array(Schema.String)),
  payload: Schema.optional(Schema.Unknown),
})
export type RecipeReceipt = typeof RecipeReceiptSchema.Type

export const RecipeObservationSchema = Schema.Struct({
  observationId: Schema.String,
  recipeId: Schema.String,
  runId: Schema.optional(Schema.String),
  receiptId: Schema.optional(Schema.String),
  observationKind: Schema.String,
  observedAt: Schema.String,
  source: Schema.optional(Schema.String),
  payload: Schema.Unknown,
})
export type RecipeObservation = typeof RecipeObservationSchema.Type

export const GeneratedArtifactFreshnessPayloadSchema = Schema.Struct({
  artifactPath: Schema.String,
  ownerRecipeId: Schema.String,
  fresh: Schema.Boolean,
  projectionId: Schema.optional(Schema.String),
  source: Schema.optional(Schema.String),
  contentHash: Schema.optional(Schema.String),
})
export type GeneratedArtifactFreshnessPayload =
  typeof GeneratedArtifactFreshnessPayloadSchema.Type

export const RecipeSourceRangeSchema = Schema.Struct({
  start: Schema.Number,
  end: Schema.Number,
})

export const RecipeDiagnosticSchema = Schema.Struct({
  diagnosticId: Schema.String,
  recipeId: Schema.String,
  code: Schema.String,
  severity: Schema.Literals(["error", "warning", "info"] as const),
  message: Schema.String,
  sourcePath: Schema.optional(Schema.String),
  range: Schema.optional(RecipeSourceRangeSchema),
  cause: Schema.optional(Schema.Unknown),
  receiptId: Schema.optional(Schema.String),
})
export type RecipeDiagnostic = typeof RecipeDiagnosticSchema.Type

export const RecipeRepairSchema = Schema.Struct({
  repairId: Schema.String,
  recipeId: Schema.String,
  diagnosticId: Schema.optional(Schema.String),
  title: Schema.String,
  kind: Schema.Literals(["nx-target", "source-edit", "manual-review", "managed-lifecycle"] as const),
  nxTarget: Schema.optional(Schema.String),
  allowedFiles: Schema.Array(Schema.String),
  risk: Schema.Literals(["safe", "needs-review", "manual-only"] as const),
  evidenceRequirements: Schema.Array(Schema.String),
  payload: Schema.optional(Schema.Unknown),
})
export type RecipeRepair = typeof RecipeRepairSchema.Type

export const RecipeHealthSchema = Schema.Struct({
  recipeId: Schema.String,
  status: RecipeHealthStatusSchema,
  explanation: Schema.String,
  checkedAt: Schema.optional(Schema.String),
  receiptIds: Schema.Array(Schema.String),
  diagnosticIds: Schema.Array(Schema.String),
  repairIds: Schema.Array(Schema.String),
})
export type RecipeHealth = typeof RecipeHealthSchema.Type

export const RecipeRunSchema = Schema.Struct({
  runId: Schema.String,
  recipeId: Schema.String,
  action: Schema.optional(ManagedRecipeLifecycleActionSchema),
  status: RecipeRunStatusSchema,
  startedAt: Schema.String,
  completedAt: Schema.optional(Schema.String),
  inputHash: Schema.optional(Schema.String),
  outputHash: Schema.optional(Schema.String),
})
export type RecipeRun = typeof RecipeRunSchema.Type

export const RecipePlanSchema = Schema.Struct({
  recipeId: Schema.String,
  nxTarget: Schema.optional(Schema.String),
  dependencies: Schema.Array(RecipeDependencySchema),
  expectedInputs: Schema.Array(RecipeIoSchema),
  expectedOutputs: Schema.Array(RecipeIoSchema),
  repairs: Schema.Array(RecipeRepairSchema),
  health: RecipeHealthSchema,
})
export type RecipePlan = typeof RecipePlanSchema.Type

export const RecipeRecordSchema = Schema.Struct({
  recipeId: Schema.String,
  kind: RecipeKindSchema,
  projectId: Schema.optional(Schema.String),
  title: Schema.optional(Schema.String),
  nxTarget: Schema.optional(Schema.String),
  sourcePath: Schema.optional(Schema.String),
  resourceKind: Schema.optional(Schema.String),
  humanReviewRequired: Schema.Boolean,
})
export type RecipeRecord = typeof RecipeRecordSchema.Type

export const RecipeEdgeRecordSchema = Schema.Struct({
  recipeId: Schema.String,
  dependsOnRecipeId: Schema.String,
  reason: Schema.optional(Schema.String),
})
export type RecipeEdgeRecord = typeof RecipeEdgeRecordSchema.Type

export const RecipeReceiptStoreSnapshotSchema = Schema.Struct({
  recipes: Schema.Array(RecipeRecordSchema),
  edges: Schema.Array(RecipeEdgeRecordSchema),
  io: Schema.Array(RecipeIoSchema),
  runs: Schema.Array(RecipeRunSchema),
  receipts: Schema.Array(RecipeReceiptSchema),
  observations: Schema.Array(RecipeObservationSchema),
  diagnostics: Schema.Array(RecipeDiagnosticSchema),
  repairs: Schema.Array(RecipeRepairSchema),
  health: Schema.Array(RecipeHealthSchema),
})
export type RecipeReceiptStoreSnapshot = typeof RecipeReceiptStoreSnapshotSchema.Type

export const RecipeDbEmissionRecordSetSchema = Schema.Struct({
  recipes: Schema.Array(RecipeRecordSchema),
  edges: Schema.Array(RecipeEdgeRecordSchema),
  io: Schema.Array(RecipeIoSchema),
  health: Schema.Array(RecipeHealthSchema),
})
export type RecipeDbEmissionRecordSet = typeof RecipeDbEmissionRecordSetSchema.Type

export const ProjectionKindSchema = Schema.Literals([
  "nx-target",
  "recipe-db-emission",
  "recipe-receipt",
  "oxlint-diagnostic",
] as const)
export type ProjectionKind = typeof ProjectionKindSchema.Type

export const ProjectionDefinitionRecordSchema = Schema.Struct({
  projectionId: Schema.String,
  kind: ProjectionKindSchema,
})
export type ProjectionDefinitionRecord = typeof ProjectionDefinitionRecordSchema.Type

export const NxTargetProjectionTierSchema = Schema.Literals(["public", "internal"] as const)
export type NxTargetProjectionTier = typeof NxTargetProjectionTierSchema.Type

export const NxTargetProjectionSchema = Schema.Struct({
  projectionId: Schema.String,
  recipeId: Schema.String,
  projectId: Schema.String,
  targetName: Schema.String,
  target: Schema.String,
  tier: NxTargetProjectionTierSchema,
  surface: Schema.String,
  action: Schema.String,
  evidence: Schema.Array(Schema.String),
  metadata: Schema.Struct({
    attune: Schema.Struct({
      recipeId: Schema.String,
      projectionId: Schema.String,
      tier: NxTargetProjectionTierSchema,
      surface: Schema.String,
      action: Schema.String,
      evidence: Schema.Array(Schema.String),
    }),
  }),
})
export type NxTargetProjection = typeof NxTargetProjectionSchema.Type

export const NxTargetConformanceStatusSchema = Schema.Literals([
  "recipe-owned",
  "projection-owned",
  "internal",
  "orphaned",
] as const)
export type NxTargetConformanceStatus = typeof NxTargetConformanceStatusSchema.Type

export const NxTargetConformanceRecordSchema = Schema.Struct({
  targetName: Schema.String,
  status: NxTargetConformanceStatusSchema,
  guidance: Schema.String,
  recipeId: Schema.optional(Schema.String),
  projectionId: Schema.optional(Schema.String),
})
export type NxTargetConformanceRecord = typeof NxTargetConformanceRecordSchema.Type

export const RecipeRegistrySnapshotSchema = Schema.Struct({
  recipes: Schema.Array(RecipeRecordSchema),
  edges: Schema.Array(RecipeEdgeRecordSchema),
  duplicateRecipeIds: Schema.Array(Schema.String),
  topoOrder: Schema.Array(Schema.String),
})
export type RecipeRegistrySnapshot = typeof RecipeRegistrySnapshotSchema.Type

export interface RecipeDefinition<Input = unknown, Output = unknown> {
  readonly id: string
  readonly projectId?: string
  readonly title?: string
  readonly inputSchema: Schema.Schema<Input>
  readonly outputSchema: Schema.Schema<Output>
  readonly dependencies?: readonly RecipeDependency[]
  readonly sourcePath?: string
  readonly nxTarget?: string
  readonly allowedFiles?: readonly string[]
  readonly validationEvidence?: readonly string[]
  readonly publicTargets?: readonly RecipePublicTarget[]
}

export type RecipeFamilyRole =
  | "projection"
  | "diagnostic"
  | "repair"
  | "observation"
  | "invocation"

export interface RecipeFamilyDefinition<Input = unknown, Output = unknown>
  extends RecipeDefinition<Input, Output> {
  readonly recipeRole: RecipeFamilyRole
  readonly entrypoints?: readonly string[]
  readonly outputs?: readonly string[]
  readonly observedFiles?: readonly string[]
  readonly affectedFiles?: readonly string[]
}

export type ProjectionRecipeDefinition<Input = unknown, Output = unknown> =
  RecipeFamilyDefinition<Input, Output> & { readonly recipeRole: "projection" }
export type DiagnosticRecipeDefinition<Input = unknown, Output = unknown> =
  RecipeFamilyDefinition<Input, Output> & { readonly recipeRole: "diagnostic" }
export type RepairRecipeDefinition<Input = unknown, Output = unknown> =
  RecipeFamilyDefinition<Input, Output> & { readonly recipeRole: "repair" }
export type ObservationRecipeDefinition<Input = unknown, Output = unknown> =
  RecipeFamilyDefinition<Input, Output> & { readonly recipeRole: "observation" }
export type InvocationRecipeDefinition<Input = unknown, Output = unknown> =
  RecipeFamilyDefinition<Input, Output> & { readonly recipeRole: "invocation" }

export interface RecipePackageOwnershipGroup {
  readonly id: string
  readonly title?: string
  readonly files: readonly string[]
  readonly recipeIds: readonly string[]
}

export interface RecipePackageDefinition {
  readonly packageId: string
  readonly title?: string
  readonly kind?: string
  readonly sourceRoot: string
  readonly recipes: readonly RecipeDefinition[]
  readonly ownership?: readonly RecipePackageOwnershipGroup[]
}

export interface ExternalSchemaRecipeDefinition<Input = unknown, Output = unknown>
  extends Omit<RecipeDefinition<Input, Output>, "inputSchema" | "outputSchema"> {
  readonly inputSchema: unknown
  readonly outputSchema: unknown
}

export interface ManagedRecipeDefinition<Input = unknown, Output = unknown> extends RecipeDefinition<Input, Output> {
  readonly lifecycle: readonly ManagedRecipeLifecycleAction[]
  readonly resourceKind: string
  readonly lifecycleSubstrates?: readonly ManagedRecipeLifecycleSubstrate[]
  readonly observedState?: unknown
  readonly driftRepair?: RecipeRepair
  readonly humanReviewRequired?: boolean
}

export interface ExternalSchemaManagedRecipeDefinition<Input = unknown, Output = unknown>
  extends Omit<ManagedRecipeDefinition<Input, Output>, "inputSchema" | "outputSchema"> {
  readonly inputSchema: unknown
  readonly outputSchema: unknown
}

export const FrameworkProtocolRecipeSurfaceInput = Schema.Struct({
  packageId: Schema.String,
  sourceRoot: Schema.String,
})
export type FrameworkProtocolRecipeSurfaceInput = typeof FrameworkProtocolRecipeSurfaceInput.Type

export const FrameworkProtocolRecipeSurfaceOutput = Schema.Struct({
  exportedRecipeApi: Schema.Boolean,
  exportedRegistry: Schema.Boolean,
  supportsManagedRecipe: Schema.Boolean,
  supportsStableIds: Schema.Boolean,
})
export type FrameworkProtocolRecipeSurfaceOutput = typeof FrameworkProtocolRecipeSurfaceOutput.Type

export const defineRecipe = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
): RecipeDefinition<Input, Output> => recipe

export const defineProjectionRecipe = <Input, Output>(
  recipe: Omit<ProjectionRecipeDefinition<Input, Output>, "recipeRole">,
): ProjectionRecipeDefinition<Input, Output> => ({ ...recipe, recipeRole: "projection" })

export const defineDiagnosticRecipe = <Input, Output>(
  recipe: Omit<DiagnosticRecipeDefinition<Input, Output>, "recipeRole">,
): DiagnosticRecipeDefinition<Input, Output> => ({ ...recipe, recipeRole: "diagnostic" })

export const defineRepairRecipe = <Input, Output>(
  recipe: Omit<RepairRecipeDefinition<Input, Output>, "recipeRole">,
): RepairRecipeDefinition<Input, Output> => ({ ...recipe, recipeRole: "repair" })

export const defineObservationRecipe = <Input, Output>(
  recipe: Omit<ObservationRecipeDefinition<Input, Output>, "recipeRole">,
): ObservationRecipeDefinition<Input, Output> => ({ ...recipe, recipeRole: "observation" })

export const defineInvocationRecipe = <Input, Output>(
  recipe: Omit<InvocationRecipeDefinition<Input, Output>, "recipeRole">,
): InvocationRecipeDefinition<Input, Output> => ({ ...recipe, recipeRole: "invocation" })

export const defineRecipePackage = (
  recipePackage: RecipePackageDefinition,
): RecipePackageDefinition => recipePackage

export const defineExternalSchemaRecipe = <Input, Output>(
  recipe: ExternalSchemaRecipeDefinition<Input, Output>,
): RecipeDefinition<Input, Output> =>
  recipe as RecipeDefinition<Input, Output>

export const defineManagedRecipe = <Input, Output>(
  recipe: ManagedRecipeDefinition<Input, Output>,
): ManagedRecipeDefinition<Input, Output> => recipe

export const defineExternalSchemaManagedRecipe = <Input, Output>(
  recipe: ExternalSchemaManagedRecipeDefinition<Input, Output>,
): ManagedRecipeDefinition<Input, Output> =>
  recipe as ManagedRecipeDefinition<Input, Output>

export interface RecipeRegistryApi {
  readonly register: <Input, Output>(
    recipe: RecipeDefinition<Input, Output>,
  ) => RecipeRegistryApi
  readonly get: (id: string) => RecipeDefinition | undefined
  readonly list: () => readonly RecipeDefinition[]
  readonly dependenciesOf: (id: string) => readonly RecipeDependency[]
  readonly dependentsOf: (id: string) => readonly RecipeDependency[]
  readonly topoOrder: () => readonly string[]
  readonly snapshot: () => RecipeRegistrySnapshot
}

export interface ProjectionDefinition<Input, Output> {
  readonly id: string
  readonly kind: ProjectionKind
  readonly inputSchema: Schema.Schema<Input>
  readonly outputSchema: Schema.Schema<Output>
  readonly render: (input: Input) => Output
}

export interface ProjectionRegistryApi {
  readonly register: <Input, Output>(
    projection: ProjectionDefinition<Input, Output>,
  ) => ProjectionRegistryApi
  readonly get: (id: string) => ProjectionDefinition<unknown, unknown> | undefined
  readonly list: () => readonly ProjectionDefinitionRecord[]
  readonly render: <Input, Output>(id: string, input: Input) => Output | undefined
}

export const defineProjection = <Input, Output>(
  projection: ProjectionDefinition<Input, Output>,
): ProjectionDefinition<Input, Output> => projection

export const RecipeRegistry = {
  empty: (): RecipeRegistryApi => makeRecipeRegistry([]),
  fromRecipes: (
    recipes: readonly RecipeDefinition[],
  ): RecipeRegistryApi => makeRecipeRegistry(recipes),
}

export const ProjectionRegistry = {
  empty: (): ProjectionRegistryApi => makeProjectionRegistry([]),
  fromProjections: (
    projections: readonly ProjectionDefinition<any, any>[],
  ): ProjectionRegistryApi => makeProjectionRegistry(projections),
}

export const NxTarget = {
  fromRecipe: <Input, Output>(recipe: RecipeDefinition<Input, Output>): string =>
    recipe.nxTarget ?? `${recipe.id}:run`,
}

export const RecipePublicTargets = {
  fromRecipe: <Input, Output>(
    recipe: RecipeDefinition<Input, Output>,
  ): readonly RecipePublicTarget[] =>
    recipe.publicTargets ?? defaultPublicTargets(recipe),
}

export const HealthView = {
  fromRecipe: <Input, Output>(
    recipe: RecipeDefinition<Input, Output>,
    input: {
      readonly receipts?: readonly RecipeReceipt[]
      readonly diagnostics?: readonly RecipeDiagnostic[]
      readonly repairs?: readonly RecipeRepair[]
      readonly checkedAt?: string
    } = {},
  ): RecipeHealth => {
    const receipts = input.receipts ?? []
    const diagnostics = input.diagnostics ?? []
    const repairs = input.repairs ?? []
    const latestReceipt = receipts.at(-1)
    const status = healthStatusFrom(latestReceipt, diagnostics)

    return {
      recipeId: recipe.id,
      status,
      explanation: healthExplanation(recipe, status, latestReceipt, diagnostics),
      ...(input.checkedAt === undefined ? {} : { checkedAt: input.checkedAt }),
      receiptIds: receipts.map((receipt) => receipt.receiptId),
      diagnosticIds: diagnostics.map((diagnostic) => diagnostic.diagnosticId),
      repairIds: repairs.map((repair) => repair.repairId),
    }
  },
}

export const RecipeRepairPlan = {
  fromRecipe: <Input, Output>(
    recipe: RecipeDefinition<Input, Output>,
    diagnostics: readonly RecipeDiagnostic[],
  ): readonly RecipeRepair[] =>
    diagnostics.map((diagnostic) => recipeRepairFromDiagnostic(recipe, diagnostic)),
}

export const LspDiagnostic = {
  fromRecipe: <Input, Output>(
    recipe: RecipeDefinition<Input, Output>,
    diagnostic: RecipeDiagnostic,
  ): ProgramDiagnostic => ({
    code: diagnostic.code,
    severity: diagnostic.severity,
    projectId: recipe.projectId ?? recipe.id,
    sourcePath: diagnostic.sourcePath ?? recipe.sourcePath ?? recipe.id,
    explanation: diagnostic.message,
    cause: diagnostic.cause,
    suggestedActions: [programRepairActionFromRecipe(recipe, diagnostic)],
    relatedObservations: diagnostic.receiptId === undefined ? [] : [diagnostic.receiptId],
    ...(diagnostic.range === undefined ? {} : { range: diagnostic.range as SourceRange }),
  }),
}

export const RecipeObservationView = {
  generatedArtifactFreshness: (input: {
    readonly recipeId: string
    readonly artifactPath: string
    readonly fresh: boolean
    readonly observedAt: string
    readonly runId?: string
    readonly receiptId?: string
    readonly projectionId?: string
    readonly source?: string
    readonly contentHash?: string
  }): RecipeObservation => {
    const observationKind = "generated-artifact.freshness"
    return {
      observationId: recipeObservationId(input.recipeId, `${observationKind}:${input.artifactPath}`, input.observedAt),
      recipeId: input.recipeId,
      ...(input.runId === undefined ? {} : { runId: input.runId }),
      ...(input.receiptId === undefined ? {} : { receiptId: input.receiptId }),
      observationKind,
      observedAt: input.observedAt,
      ...(input.source === undefined ? {} : { source: input.source }),
      payload: {
        artifactPath: input.artifactPath,
        ownerRecipeId: input.recipeId,
        fresh: input.fresh,
        ...(input.projectionId === undefined ? {} : { projectionId: input.projectionId }),
        ...(input.source === undefined ? {} : { source: input.source }),
        ...(input.contentHash === undefined ? {} : { contentHash: input.contentHash }),
      } satisfies GeneratedArtifactFreshnessPayload,
    }
  },
}

export const AlchemyResourceDescriptor = {
  fromManagedRecipe: <Input, Output>(
    recipe: ManagedRecipeDefinition<Input, Output>,
  ): Readonly<{
    readonly id: string
    readonly kind: string
    readonly lifecycle: readonly ManagedRecipeLifecycleAction[]
    readonly requiresHumanReview: boolean
    readonly lifecycleSubstrates?: readonly ManagedRecipeLifecycleSubstrate[]
    readonly observedState?: unknown
  }> => ({
    id: recipe.id,
    kind: recipe.resourceKind,
    lifecycle: recipe.lifecycle,
    requiresHumanReview: recipe.humanReviewRequired ?? false,
    ...(recipe.lifecycleSubstrates === undefined ? {} : { lifecycleSubstrates: recipe.lifecycleSubstrates }),
    ...(recipe.observedState === undefined ? {} : { observedState: recipe.observedState }),
  }),
}

export const RecipeRecordView = {
  fromRecipe: <Input, Output>(recipe: RecipeDefinition<Input, Output>): RecipeRecord => ({
    recipeId: recipe.id,
    kind: isManagedRecipeDefinition(recipe) ? "managed-recipe" : "recipe",
    ...(recipe.projectId === undefined ? {} : { projectId: recipe.projectId }),
    ...(recipe.title === undefined ? {} : { title: recipe.title }),
    ...(recipe.nxTarget === undefined ? {} : { nxTarget: recipe.nxTarget }),
    ...(recipe.sourcePath === undefined ? {} : { sourcePath: recipe.sourcePath }),
    ...(isManagedRecipeDefinition(recipe) ? { resourceKind: recipe.resourceKind } : {}),
    humanReviewRequired: isManagedRecipeDefinition(recipe)
      ? recipe.humanReviewRequired ?? false
      : false,
  }),
}

export const RecipeEdgeRecordView = {
  fromRecipe: <Input, Output>(
    recipe: RecipeDefinition<Input, Output>,
  ): readonly RecipeEdgeRecord[] =>
    [...(recipe.dependencies ?? [])].map((dependency) => ({
      recipeId: recipe.id,
      dependsOnRecipeId: dependency.recipeId,
      ...(dependency.reason === undefined ? {} : { reason: dependency.reason }),
    })),
}

export const RecipeIoRecordView = {
  fromRecipe: <Input, Output>(
    recipe: RecipeDefinition<Input, Output>,
  ): readonly RecipeIo[] => [
    recipeIo(recipe.id, "input", "input", `${recipe.id}.input`),
    recipeIo(recipe.id, "output", "output", `${recipe.id}.output`),
  ],
}

export const RecipeDbEmissionView = {
  fromRecipes: (
    recipes: readonly RecipeDefinition[],
  ): RecipeDbEmissionRecordSet => ({
    recipes: recipes.map((recipe) => RecipeRecordView.fromRecipe(recipe)),
    edges: recipes.flatMap((recipe) => RecipeEdgeRecordView.fromRecipe(recipe)),
    io: recipes.flatMap((recipe) => RecipeIoRecordView.fromRecipe(recipe)),
    health: recipes.map((recipe) => HealthView.fromRecipe(recipe)),
  }),
}

export const NxTargetProjectionView = {
  fromRecipe: <Input, Output>(
    recipe: RecipeDefinition<Input, Output>,
  ): readonly NxTargetProjection[] =>
    RecipePublicTargets.fromRecipe(recipe).map((target) => {
      const projectId = recipe.projectId ?? projectNameFromRecipeId(recipe.id)
      const projectionId = "framework.projection.nx-target"
      const targetName = targetNameFromNxTarget(target.target)
      const evidence = [...(target.evidenceRequirements ?? [])]
      return {
        projectionId,
        recipeId: recipe.id,
        projectId,
        targetName,
        target: target.target,
        tier: "public",
        surface: target.kind,
        action: target.kind,
        evidence,
        metadata: {
          attune: {
            recipeId: recipe.id,
            projectionId,
            tier: "public",
            surface: target.kind,
            action: target.kind,
            evidence,
          },
        },
      } satisfies NxTargetProjection
    }),
  fromRecipes: (
    recipes: readonly RecipeDefinition[],
  ): readonly NxTargetProjection[] =>
    recipes.flatMap((recipe) => NxTargetProjectionView.fromRecipe(recipe))
      .sort((left, right) =>
        left.projectId.localeCompare(right.projectId) ||
        left.targetName.localeCompare(right.targetName) ||
        left.recipeId.localeCompare(right.recipeId)
      ),
}

export const RecipeProjectionCatalog = [
  defineProjection({
    id: "framework.projection.nx-target",
    kind: "nx-target",
    inputSchema: Schema.Array(Schema.Unknown) as Schema.Schema<readonly RecipeDefinition[]>,
    outputSchema: Schema.Array(NxTargetProjectionSchema),
    render: NxTargetProjectionView.fromRecipes,
  }),
  defineProjection({
    id: "framework.projection.recipe-db-emission",
    kind: "recipe-db-emission",
    inputSchema: Schema.Array(Schema.Unknown) as Schema.Schema<readonly RecipeDefinition[]>,
    outputSchema: RecipeDbEmissionRecordSetSchema,
    render: RecipeDbEmissionView.fromRecipes,
  }),
  defineProjection({
    id: "framework.projection.recipe-receipt",
    kind: "recipe-receipt",
    inputSchema: RecipeReceiptSchema,
    outputSchema: RecipeReceiptSchema,
    render: (receipt) => receipt,
  }),
  defineProjection({
    id: "framework.projection.oxlint-diagnostic",
    kind: "oxlint-diagnostic",
    inputSchema: RecipeDiagnosticSchema,
    outputSchema: RecipeDiagnosticSchema,
    render: (diagnostic) => diagnostic,
  }),
] as const

export const NxTargetConformance = {
  checkProjectJson: (input: {
    readonly projectName: string
    readonly projectJson: unknown
    readonly projections?: readonly NxTargetProjection[]
  }): readonly NxTargetConformanceRecord[] => {
    const projectJson = asJsonRecord(input.projectJson)
    const targets = asJsonRecord(projectJson?.["targets"])
    if (targets === undefined) return []

    return Object.entries(targets)
      .flatMap(([targetName, target]) => {
        const targetRecord = asJsonRecord(target)
        if (targetRecord === undefined) return []
        return [classifyNxTarget({
          projectName: input.projectName,
          targetName,
          target: targetRecord,
          targets,
          projections: input.projections ?? [],
        })]
      })
      .sort((left, right) => left.targetName.localeCompare(right.targetName))
  },
  orphanedTargets: (
    records: readonly NxTargetConformanceRecord[],
  ): readonly NxTargetConformanceRecord[] =>
    records.filter((record) => record.status === "orphaned"),
  isConformant: (records: readonly NxTargetConformanceRecord[]): boolean =>
    NxTargetConformance.orphanedTargets(records).length === 0,
}

export const recipeIo = (
  recipeId: string,
  role: RecipeIoRole,
  name: string,
  schemaName?: string,
): RecipeIo => ({
  id: `${recipeId}:${role}:${name}`,
  recipeId,
  role,
  name,
  ...(schemaName === undefined ? {} : { schemaName }),
})

const makeRecipeRegistry = (
  initialRecipes: readonly RecipeDefinition[],
): RecipeRegistryApi => {
  const recipes = new Map<string, RecipeDefinition>()
  const duplicateRecipeIds = new Set<string>()
  const registerMutable = (recipe: RecipeDefinition): void => {
    if (recipes.has(recipe.id)) duplicateRecipeIds.add(recipe.id)
    recipes.set(recipe.id, recipe)
  }
  for (const recipe of initialRecipes) registerMutable(recipe)

  const api: RecipeRegistryApi = {
    register: (recipe) => {
      registerMutable(recipe)
      return api
    },
    get: (id) => recipes.get(id),
    list: () => [...recipes.values()].sort((left, right) => left.id.localeCompare(right.id)),
    dependenciesOf: (id) => [...(recipes.get(id)?.dependencies ?? [])],
    dependentsOf: (id) =>
      [...recipes.values()]
        .filter((recipe) => recipe.dependencies?.some((dependency) => dependency.recipeId === id) === true)
        .map((recipe) => ({ recipeId: recipe.id, reason: `depends on ${id}` })),
    topoOrder: () => topoOrder([...recipes.values()]),
    snapshot: () => ({
      recipes: api.list().map((recipe) => RecipeRecordView.fromRecipe(recipe)),
      edges: api.list().flatMap((recipe) => RecipeEdgeRecordView.fromRecipe(recipe)),
      duplicateRecipeIds: [...duplicateRecipeIds].sort(),
      topoOrder: api.topoOrder(),
    }),
  }
  return api
}

const makeProjectionRegistry = (
  initialProjections: readonly ProjectionDefinition<any, any>[],
): ProjectionRegistryApi => {
  const projections = new Map<string, ProjectionDefinition<any, any>>()
  const api: ProjectionRegistryApi = {
    register: (projection) => {
      projections.set(projection.id, projection)
      return api
    },
    get: (id) => projections.get(id),
    list: () =>
      [...projections.values()]
        .map((projection) => ({
          projectionId: projection.id,
          kind: projection.kind,
        }))
        .sort((left, right) => left.projectionId.localeCompare(right.projectionId)),
    render: (id, input) => {
      const projection = projections.get(id)
      if (projection === undefined) return undefined
      return projection.render(input) as never
    },
  }
  for (const projection of initialProjections) api.register(projection)
  return api
}

const topoOrder = (
  recipes: readonly RecipeDefinition[],
): readonly string[] => {
  const byId = new Map(recipes.map((recipe) => [recipe.id, recipe]))
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const ordered: string[] = []
  const visit = (id: string): void => {
    if (visited.has(id)) return
    if (visiting.has(id)) {
      ordered.push(id)
      visited.add(id)
      return
    }
    visiting.add(id)
    const recipe = byId.get(id)
    for (const dependency of recipe?.dependencies ?? []) {
      if (byId.has(dependency.recipeId)) visit(dependency.recipeId)
    }
    visiting.delete(id)
    visited.add(id)
    ordered.push(id)
  }
  for (const recipe of [...recipes].sort((left, right) => left.id.localeCompare(right.id))) {
    visit(recipe.id)
  }
  return ordered
}

const isManagedRecipeDefinition = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
): recipe is ManagedRecipeDefinition<Input, Output> =>
  "resourceKind" in recipe

const defaultPublicTargets = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
): readonly RecipePublicTarget[] => {
  const projectId = recipe.projectId ?? projectNameFromRecipeId(recipe.id)
  return [
    {
      kind: "check",
      target: recipe.nxTarget ?? `${projectId}:check`,
      evidenceRequirements: [...(recipe.validationEvidence ?? [])],
    },
    {
      kind: "repair",
      target: `${projectId}:repair`,
      evidenceRequirements: [...(recipe.validationEvidence ?? [])],
    },
    {
      kind: "proof",
      target: `${projectId}:proof`,
      evidenceRequirements: [...(recipe.validationEvidence ?? [])],
    },
    {
      kind: "report",
      target: `${projectId}:report`,
      evidenceRequirements: [...(recipe.validationEvidence ?? [])],
    },
  ]
}

const targetNameFromNxTarget = (target: string): string => {
  const [, targetName] = target.split(":")
  return targetName ?? target
}

const conventionalPublicTargetNames = new Set([
  "check",
  "repair",
  "generate",
  "check-generated",
  "fuzz",
  "proof",
  "plan",
  "apply",
  "destroy",
  "migrate",
  "validate-sql",
  "generate-types",
])

const classifyNxTarget = (input: {
  readonly projectName: string
  readonly targetName: string
  readonly target: JsonRecord
  readonly targets: JsonRecord
  readonly projections: readonly NxTargetProjection[]
}): NxTargetConformanceRecord => {
  const attune = attuneMetadata(input.target)
  const expectedProjection = input.projections.find((projection) =>
    projection.projectId === input.projectName && projection.targetName === input.targetName
  )
  const recipeId = stringValue(attune?.["recipeId"]) ?? expectedProjection?.recipeId
  const projectionId = stringValue(attune?.["projectionId"]) ?? expectedProjection?.projectionId
  const tier = stringValue(attune?.["tier"])

  if (tier === "internal" && hasPublicParent(input.targetName, input.target, input.targets)) {
    return {
      targetName: input.targetName,
      status: "internal",
      guidance: "Internal target is linked to a public parent target.",
      ...(recipeId === undefined ? {} : { recipeId }),
      ...(projectionId === undefined ? {} : { projectionId }),
    }
  }

  if (attune?.["recipeId"] !== undefined) {
    return {
      targetName: input.targetName,
      status: "recipe-owned",
      guidance: "Target declares metadata.attune.recipeId.",
      recipeId: stringValue(attune["recipeId"]) ?? "",
      ...(projectionId === undefined ? {} : { projectionId }),
    }
  }

  if (attune?.["projectionId"] !== undefined || expectedProjection !== undefined) {
    return {
      targetName: input.targetName,
      status: "projection-owned",
      guidance: expectedProjection === undefined
        ? "Target declares metadata.attune.projectionId."
        : "Target matches a ProjectionRegistry Nx target projection.",
      ...(recipeId === undefined ? {} : { recipeId }),
      projectionId: projectionId ?? "framework.projection.nx-target",
    }
  }

  if (conventionalPublicTargetNames.has(input.targetName)) {
    return {
      targetName: input.targetName,
      status: "orphaned",
      guidance: "Add recipe metadata, projection metadata, route through RecipeInvocation, or mark the target internal with a public parent.",
    }
  }

  return {
    targetName: input.targetName,
    status: "internal",
    guidance: "Target is not part of the public recipe workflow vocabulary.",
  }
}

type JsonRecord = Record<string, unknown>

const asJsonRecord = (value: unknown): JsonRecord | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as JsonRecord
    : undefined

const attuneMetadata = (target: JsonRecord): JsonRecord | undefined =>
  asJsonRecord(asJsonRecord(target["metadata"])?.["attune"])

const stringValue = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined

const hasPublicParent = (
  targetName: string,
  target: JsonRecord,
  targets: JsonRecord,
): boolean => {
  const attune = attuneMetadata(target)
  const parent = stringValue(attune?.["publicParentTarget"])
  if (parent !== undefined) return asJsonRecord(targets[parent]) !== undefined
  return targetName.startsWith("attune:repair-") && asJsonRecord(targets["repair"]) !== undefined
}

const projectNameFromRecipeId = (recipeId: string): string => {
  const [projectId] = recipeId.split(/[.:/]/u)
  return projectId === undefined || projectId.length === 0 ? "workspace" : projectId
}

const healthStatusFrom = (
  latestReceipt: RecipeReceipt | undefined,
  diagnostics: readonly RecipeDiagnostic[],
): RecipeHealthStatus => {
  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) return "failed"
  if (diagnostics.length > 0) return "stale"
  if (latestReceipt === undefined) return "unknown"
  if (latestReceipt.status === "blocked") return "blocked"
  if (latestReceipt.status === "failed") return "failed"
  if (latestReceipt.status === "passed") return "clean"
  if (latestReceipt.status === "destroyed" || latestReceipt.status === "pruned") return "superseded"
  return "unknown"
}

const healthExplanation = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
  status: RecipeHealthStatus,
  latestReceipt: RecipeReceipt | undefined,
  diagnostics: readonly RecipeDiagnostic[],
): string => {
  if (diagnostics.length > 0) {
    return `${recipe.id} has ${diagnostics.length} recipe diagnostic(s).`
  }
  if (latestReceipt !== undefined) {
    return `${recipe.id} latest receipt ${latestReceipt.receiptId} is ${latestReceipt.status}.`
  }
  return `${recipe.id} has not recorded a recipe receipt yet.`
}

const recipeRepairFromDiagnostic = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
  diagnostic: RecipeDiagnostic,
): RecipeRepair => ({
  repairId: `recipe-repair:${diagnostic.diagnosticId}`,
  recipeId: recipe.id,
  diagnosticId: diagnostic.diagnosticId,
  title: `Repair ${diagnostic.code}`,
  kind: recipe.nxTarget === undefined ? "manual-review" : "nx-target",
  nxTarget: recipe.nxTarget,
  allowedFiles: [...(recipe.allowedFiles ?? [])],
  risk: recipe.allowedFiles === undefined ? "needs-review" : "safe",
  evidenceRequirements: [...(recipe.validationEvidence ?? [])],
})

const stableId = (
  prefix: string,
  ...parts: readonly string[]
): string =>
  [prefix, ...parts]
    .map((part) => part.trim().replace(/[^a-zA-Z0-9_.:-]+/gu, "-"))
    .filter((part) => part.length > 0)
    .join(":")

const programRepairActionFromRecipe = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
  diagnostic: RecipeDiagnostic,
): ProgramRepairAction => ({
  id: `recipe-action:${diagnostic.diagnosticId}`,
  title: `Run ${NxTarget.fromRecipe(recipe)}`,
  kind: "nx-check",
  target: NxTarget.fromRecipe(recipe),
  options: {
    recipeId: recipe.id,
    diagnosticId: diagnostic.diagnosticId,
  },
})

export const FrameworkProtocolRecipes = [
  defineRecipe({
    id: "framework-protocol.recipe-kernel-contract",
    projectId: "framework-protocol",
    title: "Define Recipe, ManagedRecipe, registry, receipt, diagnostic, repair, and health contracts",
    inputSchema: FrameworkProtocolRecipeSurfaceInput,
    outputSchema: FrameworkProtocolRecipeSurfaceOutput,
    nxTarget: "framework-protocol:test",
    sourcePath: "packages/trellis/protocol/src/recipes/index.ts",
    allowedFiles: ["packages/trellis/protocol/**"],
    validationEvidence: ["framework-protocol:test", "framework-protocol:typecheck"],
  }),
  defineRecipe({
    id: "framework-protocol.recipe-projections",
    projectId: "framework-protocol",
    title: "Project recipes into Nx, LSP, records, edges, public targets, and Alchemy descriptors",
    inputSchema: FrameworkProtocolRecipeSurfaceInput,
    outputSchema: FrameworkProtocolRecipeSurfaceOutput,
    dependencies: [{ recipeId: "framework-protocol.recipe-kernel-contract" }],
    nxTarget: "framework-protocol:test",
    sourcePath: "packages/trellis/protocol/src/recipes/index.ts",
    allowedFiles: ["packages/trellis/protocol/**", "packages/trellis/language-service/**", "packages/trellis/nx/**"],
    validationEvidence: ["framework-protocol:test", "framework-nx:test", "framework-language-service:test"],
  }),
] as const
