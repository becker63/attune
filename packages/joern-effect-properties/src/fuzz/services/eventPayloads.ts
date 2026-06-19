import { Effect } from "effect"
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
