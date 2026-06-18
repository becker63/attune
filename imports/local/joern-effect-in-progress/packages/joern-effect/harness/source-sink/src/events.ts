import {
  makeEvent,
  type AttuneEvent,
  type EventBase,
} from "@attune/eventing"

export const propertyRunId = (): string =>
  "joern-effect-harness-property"

export const writePropertyEvent = (_event: AttuneEvent): void => {}

export const propertyEventBase = (
  input: Readonly<{
    readonly invariantId: string
    readonly phase: "pure" | "bridge" | "harness" | "edge"
    readonly target: string
  }>,
  runId: string,
): EventBase => ({
  invariant: input.invariantId,
  pack: "joern-effect",
  phase: input.phase,
  project: "joern-effect",
  runId,
  target: input.target,
})

export const makePropertyEvent = (
  base: EventBase,
  input: Readonly<{
    readonly eventType: string
    readonly payload?: Readonly<Record<string, unknown>>
  }>,
): AttuneEvent =>
  makeEvent(base, {
    eventType: input.eventType,
    source: "property",
    ...(input.payload === undefined ? {} : { payload: input.payload }),
  })
