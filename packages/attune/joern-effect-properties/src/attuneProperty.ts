import {
  flushPropertyEvents,
  makeSpanId,
  makePropertyEvent,
  makeTraceId,
  propertyEventBase,
  propertyRunId,
  type PropertyPhase,
  writePropertyEvent,
} from "./events.js"
import fc from "fast-check"

export type AttunePhase = PropertyPhase

export type AttunePropertyInput<T> = Readonly<{
  readonly propertyId: string
  readonly invariantId: string
  readonly phase: AttunePhase
  readonly target: string
  readonly arbitrary: fc.Arbitrary<T>
  readonly numRuns: number
  readonly predicate: (value: T) => boolean | void | Promise<boolean | void>
}>

export type AttunePropertyFailureContext = Readonly<Record<string, unknown>>

type AttunePropertyContextCarrier = Readonly<{
  readonly attuneContext?: AttunePropertyFailureContext
}>

const summarizeCase = (value: unknown): string => {
  try {
    const summary = JSON.stringify(value)
    return summary.length > 2_000 ? `${summary.slice(0, 2_000)}...` : summary
  } catch (error) {
    return String(error)
  }
}

export const failWithAttuneContext = (
  message: string,
  context: AttunePropertyFailureContext,
): never => {
  const error = new Error(message) as Error & AttunePropertyContextCarrier
  Object.assign(error, { attuneContext: context })
  throw error
}

export const attachAttuneContext = <E extends Error>(
  error: E,
  context: AttunePropertyFailureContext,
): E & AttunePropertyContextCarrier =>
  Object.assign(error, { attuneContext: context })

const failureContext = (error: unknown): AttunePropertyFailureContext | undefined => {
  if (!error || typeof error !== "object") {
    return undefined
  }
  const context = (error as AttunePropertyContextCarrier).attuneContext
  return context === undefined ? undefined : context
}

const stringifyContextField = (value: unknown): string | undefined => {
  if (value === undefined) {
    return undefined
  }
  if (typeof value === "string") {
    return value
  }
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const summarizeFailure = (error: unknown): Readonly<Record<string, unknown>> => {
  const context = failureContext(error)
  const contextJson = stringifyContextField(context)
  const summary = contextJson === undefined
    ? String(error)
    : `${String(error)}\nATTUNE_CONTEXT=${contextJson}`
  const base = {
    ...(context === undefined ? {} : {
      attuneContextJson: contextJson,
      cpgql: stringifyContextField(context["cpgql"]),
      fixtureJson: stringifyContextField(context["fixture"]),
      graphJson: stringifyContextField(context["graph"]),
      repoDir: stringifyContextField(context["repoDir"]),
      source: stringifyContextField(context["source"]),
    }),
    errorName: error instanceof Error ? error.name : typeof error,
    summary,
  }
  if (error && typeof error === "object") {
    try {
      return {
        ...base,
        errorFields: JSON.parse(JSON.stringify(error)) as unknown,
      }
    } catch {
      return {
        ...base,
        errorFields: Object.fromEntries(
          Object.entries(error).map(([key, value]) => [key, String(value)]),
        ),
      }
    }
  }
  return base
}

export const checkAttuneProperty = async <T>(
  input: AttunePropertyInput<T>,
): Promise<void> => {
  const runId = propertyRunId()
  const seed = 1337
  const base = propertyEventBase(input, runId)
  const traceId = makeTraceId()
  const suiteSpanId = makeSpanId()
  writePropertyEvent(makePropertyEvent(base, {
    eventType: "attune.property.suite_started",
    payload: {
      invariantId: input.invariantId,
      "otel.span_id": suiteSpanId,
      "otel.trace_id": traceId,
      propertyId: input.propertyId,
      seed,
    },
  }))
  await flushPropertyEvents()

  let caseIndex = 0
  const property = fc.asyncProperty(input.arbitrary, async (value) => {
    const startedAt = Date.now()
    const spanId = makeSpanId()
    const currentCaseIndex = caseIndex
    caseIndex += 1
    writePropertyEvent(makePropertyEvent(base, {
      eventType: "attune.property.case_started",
      payload: {
        caseIndex: currentCaseIndex,
        caseSummary: summarizeCase(value),
        invariantId: input.invariantId,
        "otel.parent_span_id": suiteSpanId,
        "otel.span_id": spanId,
        "otel.trace_id": traceId,
        propertyId: input.propertyId,
        seed,
      },
    }))
    try {
      const result = await input.predicate(value)
      writePropertyEvent(makePropertyEvent(base, {
        eventType: "attune.property.case_completed",
        payload: {
          caseIndex: currentCaseIndex,
          durationMs: Date.now() - startedAt,
          invariantId: input.invariantId,
          "otel.parent_span_id": suiteSpanId,
          "otel.span_id": spanId,
          "otel.trace_id": traceId,
          propertyId: input.propertyId,
          seed,
        },
      }))
      if (currentCaseIndex % 10 === 0) {
        await flushPropertyEvents()
      }
      return result === undefined ? true : result
    } catch (error) {
      writePropertyEvent(makePropertyEvent(base, {
        eventType: "attune.property.case_failed",
        payload: {
          caseIndex: currentCaseIndex,
          caseSummary: summarizeCase(value),
          durationMs: Date.now() - startedAt,
          invariantId: input.invariantId,
          "otel.parent_span_id": suiteSpanId,
          "otel.span_id": spanId,
          "otel.trace_id": traceId,
          propertyId: input.propertyId,
          seed,
          ...summarizeFailure(error),
        },
      }))
      await flushPropertyEvents()
      throw error
    }
  })
  const details = await fc.check(property, {
    endOnFailure: true,
    numRuns: input.numRuns,
    seed,
  })

  if (details.failed) {
    writePropertyEvent(makePropertyEvent(base, {
      eventType: "attune.property.counterexample_found",
      payload: {
        counterexample: details.counterexample,
        invariantId: input.invariantId,
        "otel.parent_span_id": suiteSpanId,
        "otel.span_id": makeSpanId(),
        "otel.trace_id": traceId,
        path: details.counterexamplePath,
        propertyId: input.propertyId,
        seed,
        ...summarizeFailure(details.error),
      },
    }))
    writePropertyEvent(makePropertyEvent(base, {
      eventType: "attune.property.shrink_completed",
      payload: {
        invariantId: input.invariantId,
        "otel.parent_span_id": suiteSpanId,
        "otel.span_id": makeSpanId(),
        "otel.trace_id": traceId,
        path: details.counterexamplePath,
        propertyId: input.propertyId,
        seed,
      },
    }))
    writePropertyEvent(makePropertyEvent(base, {
      eventType: "attune.property.failed",
      payload: {
        invariantId: input.invariantId,
        "otel.parent_span_id": suiteSpanId,
        "otel.span_id": suiteSpanId,
        "otel.trace_id": traceId,
        propertyId: input.propertyId,
        seed,
        ...summarizeFailure(details.error),
      },
    }))
    await flushPropertyEvents()
    throw details.error
  }

  writePropertyEvent(makePropertyEvent(base, {
    eventType: "attune.property.case_accepted",
    payload: {
      invariantId: input.invariantId,
      numRuns: input.numRuns,
      "otel.parent_span_id": suiteSpanId,
      "otel.span_id": makeSpanId(),
      "otel.trace_id": traceId,
      propertyId: input.propertyId,
      seed,
    },
  }))
  writePropertyEvent(makePropertyEvent(base, {
    eventType: "attune.property.suite_completed",
    payload: {
      invariantId: input.invariantId,
      numRuns: input.numRuns,
      "otel.span_id": suiteSpanId,
      "otel.trace_id": traceId,
      propertyId: input.propertyId,
      seed,
    },
  }))
  await flushPropertyEvents()
}
