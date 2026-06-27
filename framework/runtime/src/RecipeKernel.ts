import { Context, Data, Effect, Layer, Schema } from "effect"
import type { ProviderService } from "alchemy/Provider"
import type {
  Resource as AlchemyResource,
  ResourceBinding,
  ResourceClass,
  ResourceLike,
} from "alchemy/Resource"
import {
  AlchemyResourceDescriptor,
  HealthView,
  NxTarget,
  RecipeRepairPlan,
  recipeIo,
  type ManagedRecipeDefinition,
  type ManagedRecipeLifecycleAction,
  type RecipeDefinition,
  type RecipeDiagnostic,
  type RecipeHealth,
  type RecipePlan,
  type RecipeReceipt,
  type RecipeRepair,
  type RecipeRun,
} from "@attune/framework-protocol"
import type { RecipeReceiptStoreApi } from "./RecipeReceiptStore.js"

export * from "@attune/framework-protocol"

export class RecipeExecutionError extends Data.TaggedError("RecipeExecutionError")<{
  readonly recipeId: string
  readonly message: string
  readonly cause?: unknown
}> {}

export interface ExecutableRecipeDefinition<Input = unknown, Output = unknown>
  extends RecipeDefinition<Input, Output> {
  readonly execute: (input: Input) => Effect.Effect<Output, unknown>
}

export interface ManagedExecutableRecipeDefinition<Input = unknown, Output = unknown>
  extends ManagedRecipeDefinition<Input, Output> {
  readonly execute: (input: Input) => Effect.Effect<Output, unknown>
}

export interface RecipeRunResult<Output = unknown> {
  readonly run: RecipeRun
  readonly receipt: RecipeReceipt
  readonly output: Output
  readonly health: RecipeHealth
  readonly diagnostics: readonly RecipeDiagnostic[]
  readonly repairs: readonly RecipeRepair[]
}

export interface RecipePlannerApi {
  readonly plan: <Input, Output>(
    recipe: RecipeDefinition<Input, Output>,
    input?: Input,
  ) => Effect.Effect<RecipePlan, never>
  readonly planManaged: <Input, Output>(
    recipe: ManagedRecipeDefinition<Input, Output>,
    input?: Input,
  ) => Effect.Effect<RecipePlan, never>
}

export interface RecipeRunnerApi {
  readonly run: <Input, Output>(
    recipe: ExecutableRecipeDefinition<Input, Output>,
    input: Input,
  ) => Effect.Effect<RecipeRunResult<Output>, RecipeExecutionError>
  readonly runManaged: <Input, Output>(
    recipe: ManagedExecutableRecipeDefinition<Input, Output>,
    input: Input,
    action?: ManagedRecipeLifecycleAction,
  ) => Effect.Effect<RecipeRunResult<Output>, RecipeExecutionError>
}

export interface ManagedRecipeAlchemyProps<Input = unknown, Output = unknown> {
  readonly recipe: ManagedExecutableRecipeDefinition<Input, Output>
  readonly input: Input
  readonly action?: ManagedRecipeLifecycleAction
}

export interface ManagedRecipeAlchemyOutput<Output = unknown> {
  readonly provider: "attune:alchemy:managed-recipe"
  readonly id: string
  readonly descriptor: ReturnType<typeof AlchemyResourceDescriptor.fromManagedRecipe>
  readonly run: RecipeRun
  readonly receipt: RecipeReceipt
  readonly health: RecipeHealth
  readonly output: Output
  readonly diagnostics: readonly RecipeDiagnostic[]
  readonly repairs: readonly RecipeRepair[]
  readonly bindings?: readonly ManagedRecipeAlchemyResourceBinding[]
}

export interface ManagedRecipeAlchemyBinding {
  readonly kind:
    | "recipe"
    | "lifecycle"
    | "receipt"
    | "health"
    | "diagnostic"
    | "repair"
    | "human-review"
  readonly recipeId: string
  readonly value: string
}

export type ManagedRecipeAlchemyResourceBinding = ResourceBinding<ManagedRecipeAlchemyBinding>

export type ManagedRecipeAlchemyResource<Input = any, Output = any> = AlchemyResource<
  "attune:alchemy:ManagedRecipe",
  ManagedRecipeAlchemyProps<Input, Output>,
  ManagedRecipeAlchemyOutput<Output>,
  ManagedRecipeAlchemyBinding
>

export const ManagedRecipeAlchemyType = "attune:alchemy:ManagedRecipe" as const

export type AlchemyResourceFactory = <R extends ResourceLike>(
  type: R["Type"],
) => ResourceClass<R>

export const ManagedRecipeAlchemy = (
  resource: AlchemyResourceFactory,
): ResourceClass<ManagedRecipeAlchemyResource<any, any>> =>
  resource<ManagedRecipeAlchemyResource<any, any>>(ManagedRecipeAlchemyType)

export const defineExecutableRecipe = <Input, Output>(
  recipe: ExecutableRecipeDefinition<Input, Output>,
): ExecutableRecipeDefinition<Input, Output> => recipe

export const defineManagedExecutableRecipe = <Input, Output>(
  recipe: ManagedExecutableRecipeDefinition<Input, Output>,
): ManagedExecutableRecipeDefinition<Input, Output> => recipe

export const makeRecipePlanner = (
  store?: RecipeReceiptStoreApi,
): RecipePlannerApi => {
  const basePlan = <Input, Output>(
    recipe: RecipeDefinition<Input, Output>,
    extraRepairs: readonly RecipeRepair[] = [],
  ): RecipePlan => {
    const repairs = [
      ...(recipe.allowedFiles === undefined ? [] : [plannedRepair(recipe)]),
      ...extraRepairs,
    ]

    return {
      recipeId: recipe.id,
      nxTarget: NxTarget.fromRecipe(recipe),
      dependencies: [...(recipe.dependencies ?? [])],
      expectedInputs: [recipeIo(recipe.id, "input", "input")],
      expectedOutputs: [recipeIo(recipe.id, "output", "output")],
      repairs,
      health: HealthView.fromRecipe(recipe, { repairs }),
    }
  }

  return {
    plan: (recipe) => persistPlan(store, recipe, basePlan(recipe)),
    planManaged: <Input, Output>(recipe: ManagedRecipeDefinition<Input, Output>) =>
      persistPlan(
        store,
        recipe,
        basePlan(recipe, recipe.driftRepair === undefined ? [] : [recipe.driftRepair]),
      ),
  }
}

export const makeRecipeRunner = (
  store?: RecipeReceiptStoreApi,
): RecipeRunnerApi => {
  const run = <Input, Output>(
    recipe: ExecutableRecipeDefinition<Input, Output>,
    input: Input,
    action?: ManagedRecipeLifecycleAction,
  ): Effect.Effect<RecipeRunResult<Output>, RecipeExecutionError> => {
    const startedAt = new Date().toISOString()
    const runId = `recipe-run:${recipe.id}:${startedAt}`

    return decodeRecipeInput(recipe, input).pipe(
      Effect.flatMap((decodedInput) => recipe.execute(decodedInput)),
      Effect.flatMap((output) => decodeRecipeOutput(recipe, output)),
      Effect.mapError((cause) =>
        new RecipeExecutionError({
          recipeId: recipe.id,
          message: `Recipe ${recipe.id} failed.`,
          cause,
        })
      ),
      Effect.match({
        onFailure: (error) => failedRecipeResult(recipe, runId, startedAt, error, action),
        onSuccess: (output) => passedRecipeResult(recipe, runId, startedAt, output, action),
      }),
      Effect.flatMap((result) => persistRunResult(store, recipe, result)),
    )
  }

  return {
    run: (recipe, input) => run(recipe, input),
    runManaged: (recipe, input, action = "run") => run(recipe, input, action),
  }
}

export const managedRecipeAlchemyOutput = <Input, Output>(
  recipe: ManagedExecutableRecipeDefinition<Input, Output>,
  result: RecipeRunResult<Output>,
  bindings: readonly ManagedRecipeAlchemyResourceBinding[] = [],
): ManagedRecipeAlchemyOutput<Output> => ({
  provider: "attune:alchemy:managed-recipe",
  id: recipe.id,
  descriptor: AlchemyResourceDescriptor.fromManagedRecipe(recipe),
  run: result.run,
  receipt: result.receipt,
    health: result.health,
    output: result.output,
    diagnostics: result.diagnostics,
    repairs: result.repairs,
    bindings,
})

export const managedRecipeAlchemyBindings = <Input, Output>(
  recipe: ManagedRecipeDefinition<Input, Output>,
  result: Pick<RecipeRunResult<Output>, "receipt" | "health" | "diagnostics" | "repairs">,
): readonly ManagedRecipeAlchemyResourceBinding[] => [
  binding("recipe", recipe.id, recipe.id),
  ...recipe.lifecycle.map((action) => binding("lifecycle", recipe.id, action)),
  binding("receipt", recipe.id, result.receipt.receiptId),
  binding("health", recipe.id, result.health.status),
  ...result.diagnostics.map((diagnostic) => binding("diagnostic", recipe.id, diagnostic.diagnosticId)),
  ...result.repairs.map((repair) => binding("repair", recipe.id, repair.repairId)),
  ...(recipe.driftRepair === undefined ? [] : [binding("repair", recipe.id, recipe.driftRepair.repairId)]),
  ...(recipe.humanReviewRequired === true ? [binding("human-review", recipe.id, "required")] : []),
]

export const makeManagedRecipeAlchemyProvider = (
  runner: RecipeRunnerApi = makeRecipeRunner(),
): ProviderService<ManagedRecipeAlchemyResource<any, any>> => ({
  version: 2,
  read: ({ output }) => Effect.succeed(output),
  reconcile: ({ news, bindings }) =>
    runner.runManaged(news.recipe, news.input, news.action ?? "apply").pipe(
      Effect.map((result) => managedRecipeAlchemyOutput(
        news.recipe,
        result,
        mergeAlchemyBindings(bindings ?? [], managedRecipeAlchemyBindings(news.recipe, result)),
      )),
    ),
  delete: () => Effect.void,
  list: () => Effect.succeed([]),
})

export class RecipePlanner extends Context.Service<
  RecipePlanner,
  RecipePlannerApi
>()("@attune/framework-runtime/RecipePlanner") {}

export class RecipeRunner extends Context.Service<
  RecipeRunner,
  RecipeRunnerApi
>()("@attune/framework-runtime/RecipeRunner") {}

export const RecipePlannerLive: Layer.Layer<RecipePlanner> = Layer.succeed(
  RecipePlanner,
  makeRecipePlanner(),
)

export const RecipeRunnerLive: Layer.Layer<RecipeRunner> = Layer.succeed(
  RecipeRunner,
  makeRecipeRunner(),
)

const decodeRecipeInput = <Input, Output>(
  recipe: ExecutableRecipeDefinition<Input, Output>,
  input: Input,
): Effect.Effect<Input, unknown> =>
  Effect.try({
    try: () =>
      Schema.decodeUnknownSync(recipe.inputSchema as never)(input) as Input,
    catch: (cause) => cause,
  })

const decodeRecipeOutput = <Input, Output>(
  recipe: ExecutableRecipeDefinition<Input, Output>,
  output: Output,
): Effect.Effect<Output, unknown> =>
  Effect.try({
    try: () =>
      Schema.decodeUnknownSync(recipe.outputSchema as never)(output) as Output,
    catch: (cause) => cause,
  })

const passedRecipeResult = <Input, Output>(
  recipe: ExecutableRecipeDefinition<Input, Output>,
  runId: string,
  startedAt: string,
  output: Output,
  action?: ManagedRecipeLifecycleAction,
): RecipeRunResult<Output> => {
  const completedAt = new Date().toISOString()
  const runRecord: RecipeRun = {
    runId,
    recipeId: recipe.id,
    ...(action === undefined ? {} : { action }),
    status: "passed",
    startedAt,
    completedAt,
  }
  const receipt: RecipeReceipt = {
    receiptId: `recipe-receipt:${recipe.id}:${startedAt}`,
    recipeId: recipe.id,
    runId,
    status: "passed",
    startedAt,
    completedAt,
    command: NxTarget.fromRecipe(recipe),
    validationEvidence: [...(recipe.validationEvidence ?? [])],
  }

  return {
    run: runRecord,
    receipt,
    output,
    diagnostics: [],
    repairs: [],
    health: HealthView.fromRecipe(recipe, { receipts: [receipt], checkedAt: completedAt }),
  }
}

const failedRecipeResult = <Input, Output>(
  recipe: ExecutableRecipeDefinition<Input, Output>,
  runId: string,
  startedAt: string,
  error: RecipeExecutionError,
  action?: ManagedRecipeLifecycleAction,
): RecipeRunResult<Output> => {
  const completedAt = new Date().toISOString()
  const runRecord: RecipeRun = {
    runId,
    recipeId: recipe.id,
    ...(action === undefined ? {} : { action }),
    status: "failed",
    startedAt,
    completedAt,
  }
  const receipt: RecipeReceipt = {
    receiptId: `recipe-receipt:${recipe.id}:${startedAt}`,
    recipeId: recipe.id,
    runId,
    status: "failed",
    startedAt,
    completedAt,
    command: NxTarget.fromRecipe(recipe),
    stderrSummary: error.message,
    validationEvidence: [...(recipe.validationEvidence ?? [])],
  }
  const diagnostic: RecipeDiagnostic = {
    diagnosticId: `recipe-diagnostic:${recipe.id}:${startedAt}:failed`,
    recipeId: recipe.id,
    code: "attune/recipe/run-failed",
    severity: "error",
    message: error.message,
    cause: error.cause,
    receiptId: receipt.receiptId,
    ...(recipe.sourcePath === undefined ? {} : { sourcePath: recipe.sourcePath }),
  }
  const repairs = RecipeRepairPlan.fromRecipe(recipe, [diagnostic])

  return {
    run: runRecord,
    receipt,
    output: undefined as Output,
    diagnostics: [diagnostic],
    repairs,
    health: HealthView.fromRecipe(recipe, {
      receipts: [receipt],
      diagnostics: [diagnostic],
      repairs,
      checkedAt: completedAt,
    }),
  }
}

const plannedRepair = <Input, Output>(
  recipe: RecipeDefinition<Input, Output>,
): RecipeRepair => ({
  repairId: `recipe-repair:${recipe.id}:planned`,
  recipeId: recipe.id,
  title: `Run ${NxTarget.fromRecipe(recipe)}`,
  kind: "nx-target",
  nxTarget: NxTarget.fromRecipe(recipe),
  allowedFiles: [...(recipe.allowedFiles ?? [])],
  risk: "safe",
  evidenceRequirements: [...(recipe.validationEvidence ?? [])],
})

const binding = (
  kind: ManagedRecipeAlchemyBinding["kind"],
  recipeId: string,
  value: string,
): ManagedRecipeAlchemyResourceBinding => ({
  sid: `${recipeId}:${kind}:${value}`,
  data: {
    kind,
    recipeId,
    value,
  },
})

const mergeAlchemyBindings = (
  left: readonly ManagedRecipeAlchemyResourceBinding[],
  right: readonly ManagedRecipeAlchemyResourceBinding[],
): readonly ManagedRecipeAlchemyResourceBinding[] => {
  const bySid = new Map<string, ManagedRecipeAlchemyResourceBinding>()
  for (const item of [...left, ...right]) bySid.set(item.sid, item)
  return [...bySid.values()].sort((a, b) => a.sid.localeCompare(b.sid))
}

const persistPlan = <Input, Output>(
  store: RecipeReceiptStoreApi | undefined,
  recipe: RecipeDefinition<Input, Output>,
  plan: RecipePlan,
): Effect.Effect<RecipePlan, never> => {
  if (store === undefined) return Effect.succeed(plan)

  return store.registerRecipe(recipe).pipe(
    Effect.flatMap(() => store.healthForRecipe(recipe.id)),
    Effect.flatMap((storedHealth) => {
      const projectedPlan = storedHealth === undefined ? plan : { ...plan, health: storedHealth }
      return store.recordPlan(projectedPlan).pipe(Effect.as(projectedPlan))
    }),
  )
}

const persistRunResult = <Input, Output>(
  store: RecipeReceiptStoreApi | undefined,
  recipe: RecipeDefinition<Input, Output>,
  result: RecipeRunResult<Output>,
): Effect.Effect<RecipeRunResult<Output>, never> => {
  if (store === undefined) return Effect.succeed(result)

  return store.registerRecipe(recipe).pipe(
    Effect.flatMap(() => store.recordRunResult(result)),
    Effect.as(result),
  )
}
