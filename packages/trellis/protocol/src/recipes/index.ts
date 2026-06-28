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
  "destroy",
  "prune",
] as const)
export type ManagedRecipeLifecycleAction = typeof ManagedRecipeLifecycleActionSchema.Type

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
export type RecipeDiagnosticId = string & { readonly RecipeDiagnosticId: unique symbol }
export type RecipeRepairId = string & { readonly RecipeRepairId: unique symbol }

export const recipeId = (value: string): RecipeId => stableId("recipe", value) as RecipeId
export const recipeRunId = (recipe: string, startedAt: string): RecipeRunId =>
  stableId("recipe-run", recipe, startedAt) as RecipeRunId
export const recipeReceiptId = (recipe: string, startedAt: string): RecipeReceiptId =>
  stableId("recipe-receipt", recipe, startedAt) as RecipeReceiptId
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

export const RecipeRegistry = {
  empty: (): RecipeRegistryApi => makeRecipeRegistry([]),
  fromRecipes: (
    recipes: readonly RecipeDefinition[],
  ): RecipeRegistryApi => makeRecipeRegistry(recipes),
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
