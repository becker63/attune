import { Context, Effect, Layer } from "effect"
import {
  RecipeEdgeRecordView,
  RecipeRecordView,
  type RecipeDefinition,
  type RecipeDiagnostic,
  type RecipeEdgeRecord,
  type RecipeHealth,
  type RecipeIo,
  type RecipePlan,
  type RecipeReceipt,
  type RecipeReceiptStoreSnapshot,
  type RecipeRecord,
  type RecipeRepair,
  type RecipeRun,
} from "@attune/framework-protocol"

export interface RecipeReceiptStoreRunRecord {
  readonly run: RecipeRun
  readonly receipt: RecipeReceipt
  readonly health: RecipeHealth
  readonly diagnostics: readonly RecipeDiagnostic[]
  readonly repairs: readonly RecipeRepair[]
}

export interface RecipeReceiptStoreApi {
  readonly registerRecipe: <Input, Output>(
    recipe: RecipeDefinition<Input, Output>,
  ) => Effect.Effect<void>
  readonly recordPlan: (plan: RecipePlan) => Effect.Effect<void>
  readonly recordRunResult: (record: RecipeReceiptStoreRunRecord) => Effect.Effect<void>
  readonly latestReceipt: (recipeId: string) => Effect.Effect<RecipeReceipt | undefined>
  readonly healthForRecipe: (recipeId: string) => Effect.Effect<RecipeHealth | undefined>
  readonly diagnosticsForRecipe: (recipeId: string) => Effect.Effect<readonly RecipeDiagnostic[]>
  readonly repairsForRecipe: (recipeId: string) => Effect.Effect<readonly RecipeRepair[]>
  readonly snapshot: () => Effect.Effect<RecipeReceiptStoreSnapshot>
}

export const emptyRecipeReceiptStoreSnapshot = (): RecipeReceiptStoreSnapshot => ({
  recipes: [],
  edges: [],
  io: [],
  runs: [],
  receipts: [],
  diagnostics: [],
  repairs: [],
  health: [],
})

export const createInMemoryRecipeReceiptStore = (
  initial: RecipeReceiptStoreSnapshot = emptyRecipeReceiptStoreSnapshot(),
): RecipeReceiptStoreApi => {
  const recipes = keyed(initial.recipes, (recipe) => recipe.recipeId)
  const edges = keyed(initial.edges, (edge) => `${edge.recipeId}:${edge.dependsOnRecipeId}`)
  const io = keyed(initial.io, (item) => item.id)
  const runs = keyed(initial.runs, (run) => run.runId)
  const receipts = keyed(initial.receipts, (receipt) => receipt.receiptId)
  const diagnostics = keyed(initial.diagnostics, (diagnostic) => diagnostic.diagnosticId)
  const repairs = keyed(initial.repairs, (repair) => repair.repairId)
  const health = keyed(initial.health, (item) => item.recipeId)

  const putRecipeRecord = (record: RecipeRecord): void => {
    recipes.set(record.recipeId, record)
  }
  const putEdgeRecord = (record: RecipeEdgeRecord): void => {
    edges.set(`${record.recipeId}:${record.dependsOnRecipeId}`, record)
  }
  const putIo = (record: RecipeIo): void => {
    io.set(record.id, record)
  }

  return {
    registerRecipe: (recipe) =>
      Effect.sync(() => {
        putRecipeRecord(RecipeRecordView.fromRecipe(recipe))
        for (const edge of RecipeEdgeRecordView.fromRecipe(recipe)) putEdgeRecord(edge)
      }),
    recordPlan: (plan) =>
      Effect.sync(() => {
        for (const item of [...plan.expectedInputs, ...plan.expectedOutputs]) putIo(item)
        for (const repair of plan.repairs) repairs.set(repair.repairId, repair)
        health.set(plan.health.recipeId, plan.health)
      }),
    recordRunResult: (record) =>
      Effect.sync(() => {
        runs.set(record.run.runId, record.run)
        receipts.set(record.receipt.receiptId, record.receipt)
        health.set(record.health.recipeId, record.health)
        for (const diagnostic of record.diagnostics) {
          diagnostics.set(diagnostic.diagnosticId, diagnostic)
        }
        for (const repair of record.repairs) repairs.set(repair.repairId, repair)
      }),
    latestReceipt: (recipeId) =>
      Effect.sync(() =>
        sortedByCompletedAt([...receipts.values()].filter((receipt) => receipt.recipeId === recipeId)).at(-1)
      ),
    healthForRecipe: (recipeId) => Effect.sync(() => health.get(recipeId)),
    diagnosticsForRecipe: (recipeId) =>
      Effect.sync(() =>
        sortById(
          [...diagnostics.values()].filter((diagnostic) => diagnostic.recipeId === recipeId),
          (diagnostic) => diagnostic.diagnosticId,
        )
      ),
    repairsForRecipe: (recipeId) =>
      Effect.sync(() =>
        sortById(
          [...repairs.values()].filter((repair) => repair.recipeId === recipeId),
          (repair) => repair.repairId,
        )
      ),
    snapshot: () =>
      Effect.sync(() => ({
        recipes: sortById([...recipes.values()], (recipe) => recipe.recipeId),
        edges: sortById([...edges.values()], (edge) => `${edge.recipeId}:${edge.dependsOnRecipeId}`),
        io: sortById([...io.values()], (item) => item.id),
        runs: sortById([...runs.values()], (run) => run.runId),
        receipts: sortById([...receipts.values()], (receipt) => receipt.receiptId),
        diagnostics: sortById([...diagnostics.values()], (diagnostic) => diagnostic.diagnosticId),
        repairs: sortById([...repairs.values()], (repair) => repair.repairId),
        health: sortById([...health.values()], (item) => item.recipeId),
      })),
  }
}

export class RecipeReceiptStore extends Context.Service<
  RecipeReceiptStore,
  RecipeReceiptStoreApi
>()("@attune/framework-runtime/RecipeReceiptStore") {}

export const RecipeReceiptStoreLive: Layer.Layer<RecipeReceiptStore> = Layer.succeed(
  RecipeReceiptStore,
  createInMemoryRecipeReceiptStore(),
)

function keyed<A>(
  values: readonly A[],
  key: (value: A) => string,
): Map<string, A> {
  return new Map(values.map((value) => [key(value), value]))
}

function sortById<A>(
  values: readonly A[],
  key: (value: A) => string,
): A[] {
  return [...values].sort((left, right) => key(left).localeCompare(key(right)))
}

function sortedByCompletedAt(
  values: readonly RecipeReceipt[],
): RecipeReceipt[] {
  return [...values].sort((left, right) =>
    timestampFor(left).localeCompare(timestampFor(right)) ||
    left.receiptId.localeCompare(right.receiptId)
  )
}

function timestampFor(receipt: RecipeReceipt): string {
  return receipt.completedAt ?? receipt.startedAt
}
