import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
import {
  flushPropertyEvents,
  makePropertyEvent,
  makeSpanId,
  makeTraceId,
  propertyEventBase,
  writePropertyEvent,
} from "../../events.js"
import type { PropertyEventRuntime } from "../../events.js"
import type { AdmissionResult, FuzzCase, FuzzerRunConfig, FuzzerRunSummary } from "../domain/model.js"

const eventBase = (runtime: PropertyEventRuntime, target: string) => propertyEventBase({
  invariantId: "joern-effect-corpus-fuzzer",
  phase: "edge",
  target,
}, runtime.runId)

export const emitFuzzEvent = (
  runtime: PropertyEventRuntime,
  config: Pick<FuzzerRunConfig, "target">,
  eventType: string,
  payload: Readonly<Record<string, unknown>>,
): Effect.Effect<void> => Effect.sync(() => {
  writePropertyEvent(runtime, makePropertyEvent(eventBase(runtime, config.target), {
    eventType,
    payload,
  }))
})

export const flushFuzzTelemetry = (runtime: PropertyEventRuntime): Effect.Effect<void> =>
  Effect.promise(() => flushPropertyEvents(runtime))

export const casePayload = (
  input: Readonly<{
    readonly admission?: AdmissionResult
    readonly fuzzCase: FuzzCase
    readonly traceId: string
    readonly spanId: string
    readonly parentSpanId: string
  }>,
): Readonly<Record<string, unknown>> => ({
  caseId: input.fuzzCase.caseId,
  corpusSeedId: input.fuzzCase.seed.id,
  corpusSeedOrigin: input.fuzzCase.seed.origin,
  diagnostics: input.admission?.diagnostics,
  accepted: input.admission?.accepted,
  fastCheckPath: input.fuzzCase.replay?.fastCheckPath,
  fastCheckSeed: input.fuzzCase.replay?.fastCheckSeed,
  mutatorSequence: input.fuzzCase.mutators.map((step) => `${step.kind}:${step.value}`).join(","),
  "otel.parent_span_id": input.parentSpanId,
  "otel.span_id": input.spanId,
  "otel.trace_id": input.traceId,
  sourceBytes: input.admission?.files.reduce((total, file) => total + file.sourceBytes, 0) ?? Buffer.byteLength(input.fuzzCase.source),
  syntaxFlavor: input.fuzzCase.syntaxFlavor,
})

export const runPayload = (
  summary: FuzzerRunSummary,
  traceId: string,
  spanId: string,
): Readonly<Record<string, unknown>> => ({
  accepted: summary.accepted,
  cases: summary.cases,
  mode: summary.mode,
  rejected: summary.rejected,
  seed: summary.seed,
  "otel.span_id": spanId,
  "otel.trace_id": traceId,
})

export const makeFuzzTrace = () => ({
  spanId: makeSpanId(),
  traceId: makeTraceId(),
})

const JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeId = "joern-effect-properties.fuzz.services.event-payloads" as const
const JoernEffectPropertiesFuzzServicesEventPayloadsLocalResourceId = "joern-effect-properties.fuzz.services.event-payloads.resource" as const
const JoernEffectPropertiesFuzzServicesEventPayloadsLocalHandlerId = "joern-effect-properties.fuzz.services.event-payloads.handler" as const
const JoernEffectPropertiesFuzzServicesEventPayloadsLocalSourcePath = "packages/attune/joern-effect-properties/src/fuzz/services/eventPayloads.ts" as const
const JoernEffectPropertiesFuzzServicesEventPayloadsLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesFuzzServicesEventPayloadsLocalSourcePath),
})
export type JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeInput = typeof JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeInput.Type

export const JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesFuzzServicesEventPayloadsLocalSourcePath),
})
export type JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeOutput = typeof JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesFuzzServicesEventPayloadsLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesFuzzServicesEventPayloadsLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeId,
  producedBy: [JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeId],
  consumedBy: [JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeId, JoernEffectPropertiesFuzzServicesEventPayloadsLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesFuzzServicesEventPayloadsLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeInput,
  JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeOutput
>({
  id: JoernEffectPropertiesFuzzServicesEventPayloadsLocalHandlerId,
  recipeId: JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeId,
  sourcePath: JoernEffectPropertiesFuzzServicesEventPayloadsLocalSourcePath,
  exportName: "JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipes",
  emitsReceipts: ["joern-effect-properties.fuzz.services.event-payloads.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/fuzz/services/eventPayloads.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesFuzzServicesEventPayloadsLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesFuzzServicesEventPayloadsLocalResource],
    outputResources: [JoernEffectPropertiesFuzzServicesEventPayloadsLocalResource],
  },
  handler: JoernEffectPropertiesFuzzServicesEventPayloadsLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipeId,
      toRecipeId: JoernEffectPropertiesFuzzServicesEventPayloadsLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesFuzzServicesEventPayloadsLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipes = [JoernEffectPropertiesFuzzServicesEventPayloadsLocalRecipe] as const
