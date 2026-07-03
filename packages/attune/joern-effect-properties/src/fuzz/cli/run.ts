import { Effect, Layer, Schema } from "effect"
import {
  defineAlchemyResource,
  defineRecipe,
  defineRecipeHandler,
  defineRecipeLayer,
} from "@attune/framework-protocol"
import { CounterexampleStoreLive } from "../services/counterexamples.js"
import { FuzzOracleLive } from "../services/oracle.js"
import type { FuzzerRunConfig } from "../domain/model.js"
import { FuzzTelemetryLive } from "../services/telemetry.js"
import { SemanticAdmitterLive } from "../services/admission.js"
import { SemanticCorpusStoreWithCounterexamplesLive } from "../services/corpus.js"
import { SemanticFuzzScheduler, SemanticFuzzSchedulerLive } from "../pipeline/runner.js"
import { SemanticMutatorLive } from "../services/mutator.js"
import { makePropertyHarnessRuntimeLayer } from "../config/runtime.js"
import type { PropertyHarnessConfig } from "../config/runtime.js"

export const makeFuzzerLive = (
  harness?: Parameters<typeof makePropertyHarnessRuntimeLayer>[0],
) => {
  const runtime = makePropertyHarnessRuntimeLayer(harness)
  return Layer.provide(
    Layer.mergeAll(
      Layer.provide(SemanticCorpusStoreWithCounterexamplesLive, CounterexampleStoreLive),
      SemanticAdmitterLive,
      SemanticFuzzSchedulerLive,
      SemanticMutatorLive,
      FuzzOracleLive,
      FuzzTelemetryLive,
    ),
    runtime,
  )
}

export const FuzzerLive = makeFuzzerLive()

export const runFuzzer = (
  config: FuzzerRunConfig,
  harness?: Partial<PropertyHarnessConfig> & Readonly<{
    readonly localEvents?: boolean
    readonly runId?: string
    readonly workspaceRootPath?: string
    readonly workerCount?: number
  }>,
) =>
  SemanticFuzzScheduler.pipe(
    Effect.flatMap((scheduler) => scheduler.run(config)),
    Effect.provide(makeFuzzerLive(harness)),
  )

const fuzzerRuntimeRecipeId = "joern-effect-properties.fuzzer-runtime" as const
const fuzzerRuntimeSourcePath = "packages/attune/joern-effect-properties/src/fuzz/cli/run.ts" as const

export const FuzzerRuntimeInput = Schema.Struct({
  preset: Schema.optional(Schema.String),
})
export type FuzzerRuntimeInput = typeof FuzzerRuntimeInput.Type

export const FuzzerRuntimeOutput = Schema.Struct({
  runtimeReady: Schema.Boolean,
})
export type FuzzerRuntimeOutput = typeof FuzzerRuntimeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const FuzzerRuntimeResource = defineAlchemyResource({
  id: "joern-effect-properties.fuzzer-runtime.resource",
  kind: "external-service",
  alchemyType: "attune:resource:Runtime",
  ownerRecipeId: fuzzerRuntimeRecipeId,
  producedBy: [fuzzerRuntimeRecipeId],
  consumedBy: [
    fuzzerRuntimeRecipeId,
    "joern-effect-properties.worker-fuzzer",
    "joern-effect-properties.property-validation-worker",
  ],
  addressFields: ["preset"],
  addressSchema: FuzzerRuntimeInput as never,
  stateSchema: FuzzerRuntimeOutput as never,
  modes: ["read", "invoke", "check"],
  programmaticResourceExport: "makeFuzzerLive",
  programmaticBridgeSourcePath: fuzzerRuntimeSourcePath,
})

export const FuzzerRuntimeLayer = defineRecipeLayer({
  id: "joern-effect-properties.fuzzer-runtime.layer",
  sourcePath: fuzzerRuntimeSourcePath,
  exportName: "FuzzerLive",
  layer: FuzzerLive as never,
  provides: [
    { id: "joern-effect-properties.semantic-fuzz-scheduler", service: SemanticFuzzScheduler as never },
  ],
})

export const FuzzerRuntimeHandler = defineRecipeHandler<
  FuzzerRuntimeInput,
  FuzzerRuntimeOutput,
  never,
  SemanticFuzzScheduler
>({
  id: "joern-effect-properties.fuzzer-runtime.handler",
  recipeId: fuzzerRuntimeRecipeId,
  sourcePath: fuzzerRuntimeSourcePath,
  exportName: "makeFuzzerLive",
  layer: FuzzerRuntimeLayer,
  emitsReceipts: ["joern-effect-properties.fuzzer-runtime.ready"],
  handler: () => Effect.succeed({ runtimeReady: true }) as never,
})

export const FuzzerRuntimeRecipe = defineRecipe({
  id: fuzzerRuntimeRecipeId,
  projectId: "joern-effect-properties",
  title: "Own Joern property fuzzer runtime Layer",
  inputSchema: FuzzerRuntimeInput as never,
  outputSchema: FuzzerRuntimeOutput as never,
  nxTarget: "joern-effect-properties:test",
  allowedFiles: [fuzzerRuntimeSourcePath],
  validationEvidence: ["joern-effect-properties:test"],
  io: {
    inputSchema: FuzzerRuntimeInput as never,
    outputSchema: FuzzerRuntimeOutput as never,
    inputResources: [FuzzerRuntimeResource],
    outputResources: [FuzzerRuntimeResource],
  },
  handler: FuzzerRuntimeHandler as never,
})

export const FuzzerRuntimeRecipes = [FuzzerRuntimeRecipe] as const
