import {
  makePropertyEvent,
  propertyEventBase,
  propertyRunId,
  writePropertyEvent,
} from "./events.js"
import fc from "fast-check"

export type AttunePhase = "pure" | "bridge" | "harness" | "edge"

export type AttunePropertyInput<T> = Readonly<{
  readonly propertyId: string
  readonly invariantId: string
  readonly phase: AttunePhase
  readonly target: string
  readonly arbitrary: fc.Arbitrary<T>
  readonly numRuns: number
  readonly predicate: (value: T) => boolean | void | Promise<boolean | void>
}>

export const checkAttuneProperty = async <T>(
  input: AttunePropertyInput<T>,
): Promise<void> => {
  const runId = propertyRunId()
  const seed = 1337
  const base = propertyEventBase(input, runId)
  writePropertyEvent(makePropertyEvent(base, {
    eventType: "attune.property.suite_started",
    payload: {
      invariantId: input.invariantId,
      propertyId: input.propertyId,
      seed,
    },
  }))

  const property = fc.asyncProperty(input.arbitrary, async (value) => {
    const result = await input.predicate(value)
    return result === undefined ? true : result
  })
  const details = await fc.check(property, {
    numRuns: input.numRuns,
    seed,
  })

  if (details.failed) {
    writePropertyEvent(makePropertyEvent(base, {
      eventType: "attune.property.counterexample_found",
      payload: {
        counterexample: details.counterexample,
        invariantId: input.invariantId,
        path: details.counterexamplePath,
        propertyId: input.propertyId,
        seed,
        summary: String(details.error),
      },
    }))
    writePropertyEvent(makePropertyEvent(base, {
      eventType: "attune.property.shrink_completed",
      payload: {
        invariantId: input.invariantId,
        path: details.counterexamplePath,
        propertyId: input.propertyId,
        seed,
      },
    }))
    writePropertyEvent(makePropertyEvent(base, {
      eventType: "attune.property.failed",
      payload: {
        invariantId: input.invariantId,
        propertyId: input.propertyId,
        seed,
        summary: String(details.error),
      },
    }))
    throw details.error
  }

  writePropertyEvent(makePropertyEvent(base, {
    eventType: "attune.property.case_accepted",
    payload: {
      invariantId: input.invariantId,
      numRuns: input.numRuns,
      propertyId: input.propertyId,
      seed,
    },
  }))
  writePropertyEvent(makePropertyEvent(base, {
    eventType: "attune.property.suite_completed",
    payload: {
      invariantId: input.invariantId,
      numRuns: input.numRuns,
      propertyId: input.propertyId,
      seed,
    },
  }))
}
