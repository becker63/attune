import { Data, Effect, Ref, Schema } from "effect"
import { appendFile, mkdir } from "node:fs/promises"
import { dirname } from "node:path"

export const EventSource = Schema.Union([
  Schema.Literal("buck"),
  Schema.Literal("fork"),
  Schema.Literal("dsl"),
  Schema.Literal("property"),
  Schema.Literal("joern"),
  Schema.Literal("decode"),
  Schema.Literal("materialize"),
  Schema.Literal("script"),
  Schema.Literal("codex"),
  Schema.Literal("typescript"),
  Schema.Literal("oxlint"),
  Schema.Literal("nix"),
])

export type EventSource = Schema.Schema.Type<typeof EventSource>

export const EventSeverity = Schema.Union([
  Schema.Literal("error"),
  Schema.Literal("warning"),
  Schema.Literal("info"),
])

export type EventSeverity = Schema.Schema.Type<typeof EventSeverity>

export class AttuneEventEnvelope extends Schema.Class<AttuneEventEnvelope>(
  "AttuneEventEnvelope",
)({
  attempt: Schema.optional(Schema.Number),
  branch: Schema.optional(Schema.String),
  codexSessionId: Schema.optional(Schema.String),
  commitSha: Schema.optional(Schema.String),
  eventId: Schema.String,
  eventType: Schema.String,
  invariant: Schema.optional(Schema.String),
  occurredAt: Schema.String,
  pack: Schema.optional(Schema.String),
  payload: Schema.Record(Schema.String, Schema.Unknown),
  phase: Schema.optional(Schema.String),
  project: Schema.String,
  runId: Schema.String,
  source: EventSource,
  target: Schema.String,
  zone: Schema.optional(Schema.String),
}) {}

export type AttuneEvent = Schema.Schema.Type<typeof AttuneEventEnvelope>

export class EventSinkError extends Data.TaggedError("EventSinkError")<{
  readonly message: string
  readonly cause?: string
}> {}

export type EventSink = {
  readonly emit: (event: AttuneEvent) => Effect.Effect<void, EventSinkError>
  readonly emitMany: (events: readonly AttuneEvent[]) => Effect.Effect<void, EventSinkError>
}

export type EventBase = Readonly<{
  readonly project: string
  readonly target: string
  readonly runId: string
  readonly pack?: string
  readonly phase?: string
  readonly invariant?: string
  readonly zone?: string
  readonly commitSha?: string
  readonly branch?: string
  readonly codexSessionId?: string
  readonly attempt?: number
}>

const secretLike = /(xaat|xapt|Bearer)\S+|api[_-]?key|token|authorization/giu

export const redactSecrets = (value: string): string =>
  value.replace(secretLike, "[REDACTED]")

export const normalizeEvent = (event: AttuneEvent): AttuneEvent =>
  new AttuneEventEnvelope({
    ...event,
    payload: Object.fromEntries(
      Object.entries(event.payload).map(([key, value]) => [
        key,
        typeof value === "string" ? redactSecrets(value) : value,
      ]),
    ),
  })

export const makeEventId = (): string =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`

export const makeRunId = (project: string, phase: string): string =>
  `${project}-${phase}-${new Date().toISOString().replace(/[:.]/gu, "-")}`

export const makeEvent = (
  base: EventBase,
  input: Readonly<{
    readonly eventType: string
    readonly source: EventSource
    readonly payload?: Readonly<Record<string, unknown>>
  }>,
): AttuneEvent =>
  normalizeEvent(new AttuneEventEnvelope({
    ...base,
    eventId: makeEventId(),
    eventType: input.eventType,
    occurredAt: new Date().toISOString(),
    payload: input.payload ?? {},
    source: input.source,
  }))

export const makeNoopEventSink = (): EventSink => ({
  emit: () => Effect.void,
  emitMany: () => Effect.void,
})

export const makeInMemoryEventSink = (): Effect.Effect<
  EventSink & { readonly events: Effect.Effect<readonly AttuneEvent[]> }
> =>
  Ref.make<readonly AttuneEvent[]>([]).pipe(
    Effect.map((ref) => ({
      emit: (event) => Ref.update(ref, (events) => [...events, event]),
      emitMany: (nextEvents) =>
        Ref.update(ref, (events) => [...events, ...nextEvents]),
      events: Ref.get(ref),
    })),
  )

export const makeJsonlEventSink = (path: string): EventSink => ({
  emit: (event) =>
    Effect.tryPromise({
      catch: (cause) =>
        new EventSinkError({
          cause: redactSecrets(String(cause)),
          message: `Failed to append Attune event to ${path}`,
        }),
      try: async () => {
        await mkdir(dirname(path), { recursive: true })
        await appendFile(path, `${JSON.stringify(normalizeEvent(event))}\n`, "utf8")
      },
    }),
  emitMany: (events) =>
    Effect.tryPromise({
      catch: (cause) =>
        new EventSinkError({
          cause: redactSecrets(String(cause)),
          message: `Failed to append Attune events to ${path}`,
        }),
      try: async () => {
        if (events.length === 0) {return}
        await mkdir(dirname(path), { recursive: true })
        await appendFile(
          path,
          `${events.map((event) => JSON.stringify(normalizeEvent(event))).join("\n")}\n`,
          "utf8",
        )
      },
    }),
})

export const makeJsonFileEventSink = makeJsonlEventSink

export const makeCompositeEventSink = (sinks: readonly EventSink[]): EventSink => ({
  emit: (event) => Effect.forEach(sinks, (sink) => sink.emit(event)).pipe(Effect.asVoid),
  emitMany: (events) =>
    Effect.forEach(sinks, (sink) => sink.emitMany(events)).pipe(Effect.asVoid),
})
