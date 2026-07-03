import { Context, Effect, Layer, Schema } from "effect"
import {
  RecipeReceiptStoreSnapshotSchema,
  RecipeEdgeRecordView,
  RecipeRecordView,
  defineAlchemyResource,
  defineObservationRecipe,
  defineProjectionRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
  type RecipeDefinition,
  type RecipeDiagnostic,
  type RecipeEdgeRecord,
  type RecipeHealth,
  type RecipeIo,
  type RecipeObservation,
  type RecipePlan,
  type RecipeReceipt,
  type RecipeReceiptStoreSnapshot,
  type RecipeRecord,
  type RecipeRepair,
  type RecipeRun,
} from "@attune/framework-protocol"

const recipeReceiptStoreSnapshotRecipeId = "framework-runtime.receipt-store-snapshot"
const recipeReceiptStoreSummaryRecipeId = "framework-runtime.receipt-store-summary"
const recipeReceiptStoreSourcePath = "packages/trellis/runtime/src/RecipeReceiptStore.ts"

export const RecipeReceiptStoreSummarySchema = Schema.Struct({
  recipeCount: Schema.Number,
  edgeCount: Schema.Number,
  ioCount: Schema.Number,
  runCount: Schema.Number,
  receiptCount: Schema.Number,
  observationCount: Schema.Number,
  diagnosticCount: Schema.Number,
  repairCount: Schema.Number,
  healthCount: Schema.Number,
})
export type RecipeReceiptStoreSummary = typeof RecipeReceiptStoreSummarySchema.Type

// @attune-packet-target generated-runtime-projection eligible
export const RecipeReceiptStoreSnapshotResource = defineAlchemyResource({
  id: "framework-runtime.receipt-store-snapshot.resource",
  kind: "observation-stream",
  alchemyType: "attune:resource:ObservationStream",
  ownerRecipeId: recipeReceiptStoreSnapshotRecipeId,
  producedBy: [recipeReceiptStoreSnapshotRecipeId],
  consumedBy: [recipeReceiptStoreSnapshotRecipeId, recipeReceiptStoreSummaryRecipeId],
  addressFields: ["recipes", "runs", "receipts", "observations"],
  addressSchema: RecipeReceiptStoreSnapshotSchema as never,
  stateSchema: RecipeReceiptStoreSnapshotSchema as never,
  modes: ["read", "observe", "project"],
  programmaticResourceExport: "RecipeReceiptStoreSnapshotProjectorLive",
  programmaticBridgeSourcePath: recipeReceiptStoreSourcePath,
})

// @attune-packet-target generated-runtime-projection eligible
export const RecipeReceiptStoreSummaryResource = defineAlchemyResource({
  id: "framework-runtime.receipt-store-summary.resource",
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: recipeReceiptStoreSummaryRecipeId,
  producedBy: [recipeReceiptStoreSummaryRecipeId],
  consumedBy: [recipeReceiptStoreSummaryRecipeId],
  addressFields: ["recipeCount", "receiptCount", "observationCount"],
  addressSchema: RecipeReceiptStoreSnapshotSchema as never,
  stateSchema: RecipeReceiptStoreSummarySchema as never,
  modes: ["read", "project", "observe"],
  programmaticResourceExport: "RecipeReceiptStoreSummaryProjectorLive",
  programmaticBridgeSourcePath: recipeReceiptStoreSourcePath,
})

export interface RecipeReceiptStoreRunRecord {
  readonly run: RecipeRun
  readonly receipt: RecipeReceipt
  readonly health: RecipeHealth
  readonly diagnostics: readonly RecipeDiagnostic[]
  readonly repairs: readonly RecipeRepair[]
  readonly observations?: readonly RecipeObservation[]
}

export interface RecipeReceiptStoreRecipeView {
  readonly recipe: RecipeRecord | undefined
  readonly latestReceipt: RecipeReceipt | undefined
  readonly receipts: readonly RecipeReceipt[]
  readonly runs: readonly RecipeRun[]
  readonly observations: readonly RecipeObservation[]
  readonly health: RecipeHealth | undefined
  readonly diagnostics: readonly RecipeDiagnostic[]
  readonly repairs: readonly RecipeRepair[]
}

export interface RecipeReceiptStoreApi {
  readonly registerRecipe: <Input, Output, Error = unknown, Requirements = never>(
    recipe: RecipeDefinition<Input, Output, Error, Requirements>,
  ) => Effect.Effect<void>
  readonly recordPlan: (plan: RecipePlan) => Effect.Effect<void>
  readonly recordRunResult: (record: RecipeReceiptStoreRunRecord) => Effect.Effect<void>
  readonly recordObservation: (observation: RecipeObservation) => Effect.Effect<void>
  readonly recipeView: (recipeId: string) => Effect.Effect<RecipeReceiptStoreRecipeView>
  readonly receiptById: (receiptId: string) => Effect.Effect<RecipeReceipt | undefined>
  readonly receiptsForRecipe: (recipeId: string) => Effect.Effect<readonly RecipeReceipt[]>
  readonly receiptsByStatus: (status: RecipeReceipt["status"]) => Effect.Effect<readonly RecipeReceipt[]>
  readonly runsForRecipe: (recipeId: string) => Effect.Effect<readonly RecipeRun[]>
  readonly observationsForRecipe: (recipeId: string) => Effect.Effect<readonly RecipeObservation[]>
  readonly observationsForRun: (runId: string) => Effect.Effect<readonly RecipeObservation[]>
  readonly observationsForReceipt: (receiptId: string) => Effect.Effect<readonly RecipeObservation[]>
  readonly observationsByKind: (observationKind: string) => Effect.Effect<readonly RecipeObservation[]>
  readonly latestReceipt: (recipeId: string) => Effect.Effect<RecipeReceipt | undefined>
  readonly healthForRecipe: (recipeId: string) => Effect.Effect<RecipeHealth | undefined>
  readonly diagnosticsForRecipe: (recipeId: string) => Effect.Effect<readonly RecipeDiagnostic[]>
  readonly repairsForRecipe: (recipeId: string) => Effect.Effect<readonly RecipeRepair[]>
  readonly snapshot: () => Effect.Effect<RecipeReceiptStoreSnapshot>
}

export interface RecipeReceiptStoreSnapshotProjectorService {
  readonly snapshot: (
    input: RecipeReceiptStoreSnapshot,
  ) => Effect.Effect<RecipeReceiptStoreSnapshot>
}

export class RecipeReceiptStoreSnapshotProjector extends Context.Service<
  RecipeReceiptStoreSnapshotProjector,
  RecipeReceiptStoreSnapshotProjectorService
>()("@attune/framework-runtime/RecipeReceiptStoreSnapshotProjector") {}

export interface RecipeReceiptStoreSummaryProjectorService {
  readonly summarize: (
    input: RecipeReceiptStoreSnapshot,
  ) => Effect.Effect<RecipeReceiptStoreSummary>
}

export class RecipeReceiptStoreSummaryProjector extends Context.Service<
  RecipeReceiptStoreSummaryProjector,
  RecipeReceiptStoreSummaryProjectorService
>()("@attune/framework-runtime/RecipeReceiptStoreSummaryProjector") {}

export const emptyRecipeReceiptStoreSnapshot = (): RecipeReceiptStoreSnapshot => ({
  recipes: [],
  edges: [],
  io: [],
  runs: [],
  receipts: [],
  observations: [],
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
  const observations = keyed(initial.observations, (observation) => observation.observationId)
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
        for (const observation of record.observations ?? []) {
          observations.set(observation.observationId, observation)
        }
      }),
    recordObservation: (observation) =>
      Effect.sync(() => {
        observations.set(observation.observationId, observation)
      }),
    recipeView: (recipeId) =>
      Effect.sync(() => {
        const recipeReceipts = sortedByCompletedAt([...receipts.values()].filter((receipt) => receipt.recipeId === recipeId))
        return {
          recipe: recipes.get(recipeId),
          latestReceipt: recipeReceipts.at(-1),
          receipts: recipeReceipts,
          runs: sortedByStartedAt([...runs.values()].filter((run) => run.recipeId === recipeId)),
          observations: sortedByObservedAtDesc(
            [...observations.values()].filter((observation) => observation.recipeId === recipeId),
          ),
          health: health.get(recipeId),
          diagnostics: sortById(
            [...diagnostics.values()].filter((diagnostic) => diagnostic.recipeId === recipeId),
            (diagnostic) => diagnostic.diagnosticId,
          ),
          repairs: sortById(
            [...repairs.values()].filter((repair) => repair.recipeId === recipeId),
            (repair) => repair.repairId,
          ),
        }
      }),
    receiptById: (receiptId) => Effect.sync(() => receipts.get(receiptId)),
    receiptsForRecipe: (recipeId) =>
      Effect.sync(() =>
        sortedByCompletedAt([...receipts.values()].filter((receipt) => receipt.recipeId === recipeId))
      ),
    receiptsByStatus: (status) =>
      Effect.sync(() =>
        sortedByCompletedAt([...receipts.values()].filter((receipt) => receipt.status === status))
      ),
    runsForRecipe: (recipeId) =>
      Effect.sync(() =>
        sortedByStartedAt([...runs.values()].filter((run) => run.recipeId === recipeId))
      ),
    observationsForRecipe: (recipeId) =>
      Effect.sync(() =>
        sortedByObservedAtDesc([...observations.values()].filter((observation) => observation.recipeId === recipeId))
      ),
    observationsForRun: (runId) =>
      Effect.sync(() =>
        sortedByObservedAtDesc([...observations.values()].filter((observation) => observation.runId === runId))
      ),
    observationsForReceipt: (receiptId) =>
      Effect.sync(() =>
        sortedByObservedAtDesc([...observations.values()].filter((observation) => observation.receiptId === receiptId))
      ),
    observationsByKind: (observationKind) =>
      Effect.sync(() =>
        sortedByObservedAtDesc(
          [...observations.values()].filter((observation) => observation.observationKind === observationKind),
        )
      ),
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
        observations: sortById([...observations.values()], (observation) => observation.observationId),
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

export const RecipeReceiptStoreSnapshotProjectorLive = Layer.succeed(
  RecipeReceiptStoreSnapshotProjector,
  {
    snapshot: (input: RecipeReceiptStoreSnapshot) =>
      createInMemoryRecipeReceiptStore(input).snapshot(),
  },
)

export const RecipeReceiptStoreSnapshotProjectorLayer = defineRecipeLayer({
  id: "framework-runtime.receipt-store-snapshot.layer",
  sourcePath: recipeReceiptStoreSourcePath,
  exportName: "RecipeReceiptStoreSnapshotProjectorLive",
  layer: RecipeReceiptStoreSnapshotProjectorLive as never,
  provides: [{
    id: "framework-runtime.receipt-store-snapshot.service",
    service: RecipeReceiptStoreSnapshotProjector as never,
  }],
})

export const RecipeReceiptStoreSummaryProjectorLive = Layer.succeed(
  RecipeReceiptStoreSummaryProjector,
  {
    summarize: (input: RecipeReceiptStoreSnapshot) =>
      Effect.succeed(summarizeRecipeReceiptStoreSnapshot(input)),
  },
)

export const RecipeReceiptStoreSummaryProjectorLayer = defineRecipeLayer({
  id: "framework-runtime.receipt-store-summary.layer",
  sourcePath: recipeReceiptStoreSourcePath,
  exportName: "RecipeReceiptStoreSummaryProjectorLive",
  layer: RecipeReceiptStoreSummaryProjectorLive as never,
  provides: [{
    id: "framework-runtime.receipt-store-summary.service",
    service: RecipeReceiptStoreSummaryProjector as never,
  }],
})

export const projectRecipeReceiptStoreSnapshot = (
  input: RecipeReceiptStoreSnapshot,
): Effect.Effect<RecipeReceiptStoreSnapshot, never, RecipeReceiptStoreSnapshotProjector> =>
  Effect.gen(function* projectRecipeReceiptStoreSnapshotBody() {
    const projector = yield* RecipeReceiptStoreSnapshotProjector
    return yield* projector.snapshot(input)
  })

export const summarizeRecipeReceiptStoreSnapshot = (
  snapshot: RecipeReceiptStoreSnapshot,
): RecipeReceiptStoreSummary => ({
  recipeCount: snapshot.recipes.length,
  edgeCount: snapshot.edges.length,
  ioCount: snapshot.io.length,
  runCount: snapshot.runs.length,
  receiptCount: snapshot.receipts.length,
  observationCount: snapshot.observations.length,
  diagnosticCount: snapshot.diagnostics.length,
  repairCount: snapshot.repairs.length,
  healthCount: snapshot.health.length,
})

export const projectRecipeReceiptStoreSummary = (
  input: RecipeReceiptStoreSnapshot,
): Effect.Effect<RecipeReceiptStoreSummary, never, RecipeReceiptStoreSummaryProjector> =>
  Effect.gen(function* projectRecipeReceiptStoreSummaryBody() {
    const projector = yield* RecipeReceiptStoreSummaryProjector
    return yield* projector.summarize(input)
  })

export const RecipeReceiptStoreSnapshotHandler = defineRecipeHandler<
  RecipeReceiptStoreSnapshot,
  RecipeReceiptStoreSnapshot,
  never,
  RecipeReceiptStoreSnapshotProjector
>({
  id: "framework-runtime.receipt-store-snapshot.handler",
  recipeId: recipeReceiptStoreSnapshotRecipeId,
  sourcePath: recipeReceiptStoreSourcePath,
  exportName: "projectRecipeReceiptStoreSnapshot",
  layer: RecipeReceiptStoreSnapshotProjectorLayer,
  emitsReceipts: ["framework-runtime.receipt-store.snapshot.projected"],
  handler: (input) => projectRecipeReceiptStoreSnapshot(input) as never,
})

export const RecipeReceiptStoreSummaryHandler = defineRecipeHandler<
  RecipeReceiptStoreSnapshot,
  RecipeReceiptStoreSummary,
  never,
  RecipeReceiptStoreSummaryProjector
>({
  id: "framework-runtime.receipt-store-summary.handler",
  recipeId: recipeReceiptStoreSummaryRecipeId,
  sourcePath: recipeReceiptStoreSourcePath,
  exportName: "projectRecipeReceiptStoreSummary",
  layer: RecipeReceiptStoreSummaryProjectorLayer,
  emitsReceipts: ["framework-runtime.receipt-store.summary.projected"],
  handler: (input) => projectRecipeReceiptStoreSummary(input) as never,
})

export const RecipeReceiptStoreSnapshotRecipe = defineObservationRecipe({
  id: recipeReceiptStoreSnapshotRecipeId,
  projectId: "framework-runtime",
  title: "Project recipe receipt store state into the observation resource graph",
  inputSchema: RecipeReceiptStoreSnapshotSchema as never,
  outputSchema: RecipeReceiptStoreSnapshotSchema as never,
  allowedFiles: [recipeReceiptStoreSourcePath],
  validationEvidence: ["framework-runtime:typecheck", "framework-runtime:test"],
  io: {
    inputSchema: RecipeReceiptStoreSnapshotSchema as never,
    outputSchema: RecipeReceiptStoreSnapshotSchema as never,
    inputResources: [RecipeReceiptStoreSnapshotResource],
    outputResources: [RecipeReceiptStoreSnapshotResource],
  },
  handler: RecipeReceiptStoreSnapshotHandler,
  alchemyDag: [{
    fromRecipeId: recipeReceiptStoreSnapshotRecipeId,
    toRecipeId: recipeReceiptStoreSummaryRecipeId,
    resource: RecipeReceiptStoreSnapshotResource,
    kind: "projects",
    modes: ["read", "observe", "project"],
  }],
})

// @attune-packet-target generated-runtime-projection eligible
export const RecipeReceiptStoreSummaryRecipe = defineProjectionRecipe({
  id: recipeReceiptStoreSummaryRecipeId,
  projectId: "framework-runtime",
  title: "Summarize recipe receipt store state for runtime reporting",
  inputSchema: RecipeReceiptStoreSnapshotSchema as never,
  outputSchema: RecipeReceiptStoreSummarySchema as never,
  allowedFiles: [recipeReceiptStoreSourcePath],
  validationEvidence: ["framework-runtime:typecheck", "framework-runtime:test"],
  io: {
    inputSchema: RecipeReceiptStoreSnapshotSchema as never,
    outputSchema: RecipeReceiptStoreSummarySchema as never,
    inputResources: [RecipeReceiptStoreSnapshotResource],
    outputResources: [RecipeReceiptStoreSummaryResource],
  },
  handler: RecipeReceiptStoreSummaryHandler,
})

export const RecipeReceiptStoreRecipes = [
  RecipeReceiptStoreSnapshotRecipe,
  RecipeReceiptStoreSummaryRecipe,
] as const

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

function sortedByStartedAt(
  values: readonly RecipeRun[],
): RecipeRun[] {
  return [...values].sort((left, right) =>
    left.startedAt.localeCompare(right.startedAt) ||
    left.runId.localeCompare(right.runId)
  )
}

function sortedByObservedAtDesc(
  values: readonly RecipeObservation[],
): RecipeObservation[] {
  return [...values].sort((left, right) =>
    right.observedAt.localeCompare(left.observedAt) ||
    right.observationId.localeCompare(left.observationId)
  )
}

function timestampFor(receipt: RecipeReceipt): string {
  return receipt.completedAt ?? receipt.startedAt
}
