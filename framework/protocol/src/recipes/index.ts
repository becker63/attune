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

export const RecipeKindSchema = Schema.Literals(["recipe", "managed-recipe"] as const)
export type RecipeKind = typeof RecipeKindSchema.Type

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
}

export interface ManagedRecipeDefinition<Input = unknown, Output = unknown> extends RecipeDefinition<Input, Output> {
  readonly lifecycle: readonly ManagedRecipeLifecycleAction[]
  readonly resourceKind: string
  readonly observedState?: unknown
  readonly driftRepair?: RecipeRepair
  readonly humanReviewRequired?: boolean
}

export const defineRecipe = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
): RecipeDefinition<Input, Output> => recipe

export const defineManagedRecipe = <Input, Output>(
  recipe: ManagedRecipeDefinition<Input, Output>,
): ManagedRecipeDefinition<Input, Output> => recipe

export const NxTarget = {
  fromRecipe: <Input, Output>(recipe: RecipeDefinition<Input, Output>): string =>
    recipe.nxTarget ?? `${recipe.id}:run`,
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
    readonly observedState?: unknown
  }> => ({
    id: recipe.id,
    kind: recipe.resourceKind,
    lifecycle: recipe.lifecycle,
    requiresHumanReview: recipe.humanReviewRequired ?? false,
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

export const recipeIo = (
  recipeId: string,
  role: RecipeIoRole,
  name: string,
): RecipeIo => ({
  id: `${recipeId}:${role}:${name}`,
  recipeId,
  role,
  name,
})

const isManagedRecipeDefinition = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
): recipe is ManagedRecipeDefinition<Input, Output> =>
  "resourceKind" in recipe

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
