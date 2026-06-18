import { Context, Effect, Layer } from "effect"
import type { FuzzerRunConfig } from "../domain/model.js"
import { emitFuzzEvent, flushFuzzTelemetry } from "./eventPayloads.js"
import { PropertyHarnessRuntime } from "../config/runtime.js"
import type { PropertyHarnessConfig } from "../config/runtime.js"

export interface FuzzTelemetryService {
  readonly emit: (
    config: Pick<FuzzerRunConfig, "target">,
    eventType: string,
    payload: Readonly<Record<string, unknown>>,
  ) => Effect.Effect<void>
  readonly flush: Effect.Effect<void>
}

export class FuzzTelemetry extends Context.Tag("attune/joern-effect-properties/fuzz/FuzzTelemetry")<
  FuzzTelemetry,
  FuzzTelemetryService
>() {}

export const makeFuzzTelemetry = (runtime: PropertyHarnessConfig): FuzzTelemetryService => ({
  emit: (config, eventType, payload) => emitFuzzEvent(runtime.eventRuntime, config, eventType, payload),
  flush: flushFuzzTelemetry(runtime.eventRuntime),
})

export const FuzzTelemetryLive: Layer.Layer<FuzzTelemetry, never, PropertyHarnessRuntime> = Layer.effect(
  FuzzTelemetry,
  PropertyHarnessRuntime.pipe(Effect.map(makeFuzzTelemetry)),
)
