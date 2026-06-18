import { Effect, Layer } from "effect"
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
    readonly workerCount?: number
  }>,
) =>
  SemanticFuzzScheduler.pipe(
    Effect.flatMap((scheduler) => scheduler.run(config)),
    Effect.provide(makeFuzzerLive(harness)),
  )
