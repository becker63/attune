import { Context, Layer } from "effect"
import { loadAxiomConfig } from "../../events.js"
import type { PropertyEventRuntime } from "../../events.js"

export type PropertyHarnessConfig = Readonly<{
  readonly eventRuntime: PropertyEventRuntime
  readonly workerCount: number
}>

export class PropertyHarnessRuntime extends Context.Tag(
  "attune/joern-effect-properties/fuzz/PropertyHarnessRuntime",
)<PropertyHarnessRuntime, PropertyHarnessConfig>() {}

export const makePropertyHarnessConfig = (
  input: Partial<PropertyHarnessConfig> & Readonly<{
    readonly localEvents?: boolean
    readonly runId?: string
    readonly workerCount?: number
  }> = {},
): PropertyHarnessConfig => {
  const axiom = loadAxiomConfig()
  return {
    eventRuntime: input.eventRuntime ?? {
      ...(axiom === undefined ? {} : { axiom }),
      localEvents: input.localEvents ?? false,
      runId: input.runId ?? `joern-effect-property-${Date.now()}`,
    },
    workerCount: Math.max(1, Math.floor(input.workerCount ?? 2)),
  }
}

export const makePropertyHarnessRuntimeLayer = (
  input?: Parameters<typeof makePropertyHarnessConfig>[0],
): Layer.Layer<PropertyHarnessRuntime> =>
  Layer.succeed(PropertyHarnessRuntime, makePropertyHarnessConfig(input))
