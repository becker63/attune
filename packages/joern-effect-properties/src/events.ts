import { randomUUID } from "node:crypto"
import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { AxiomWithoutBatching } from "@axiomhq/js"

export type PropertyPhase = "pure" | "decode" | "interpreter" | "harness" | "edge"

export type EventBase = Readonly<{
  readonly invariant: string
  readonly pack: string
  readonly phase: PropertyPhase
  readonly project: string
  readonly runId: string
  readonly target: string
}>

export type PropertyEvent = EventBase & Readonly<{
  readonly eventType: string
  readonly source: "property"
  readonly payload?: Readonly<Record<string, unknown>>
}>

export type AxiomConfig = Readonly<{
  readonly dataset: string
  readonly domain: string
  readonly token: string
}>

export type PropertyEventRuntime = Readonly<{
  readonly axiom?: AxiomConfig
  readonly localEvents: boolean
  readonly runId: string
}>

type OtelAnyValue = Readonly<
  | { readonly boolValue: boolean }
  | { readonly doubleValue: number }
  | { readonly intValue: string }
  | { readonly stringValue: string }
>

type OtelAttribute = Readonly<{
  readonly key: string
  readonly value: OtelAnyValue
}>

type OtelLogRecord = Readonly<{
  readonly attributes: readonly OtelAttribute[]
  readonly body: OtelAnyValue
  readonly event: PropertyEvent
  readonly eventId: string
  readonly observedTimeUnixNano: string
  readonly severityText: "INFO" | "ERROR" | "WARN"
  readonly spanId?: string
  readonly timeUnixNano: string
  readonly traceId?: string
}>

type OtelLogExportRequest = Readonly<{
  readonly resourceLogs: readonly Readonly<{
    readonly resource: Readonly<{
      readonly attributes: readonly OtelAttribute[]
    }>
    readonly scopeLogs: readonly Readonly<{
      readonly logRecords: readonly OtelLogRecord[]
      readonly scope: Readonly<{
        readonly name: string
        readonly version: string
      }>
    }>[]
  }>[]
}>

const workspaceRoot = (): string =>
  resolve(new URL("../../..", import.meta.url).pathname)

const reportRoot = (runId: string): string =>
  join(workspaceRoot(), "reports", "joern-effect-properties", runId)

const eventsFile = (runId: string): string =>
  join(reportRoot(runId), "property-events.jsonl")

const redactToken = (value: string): string =>
  value.length <= 8 ? "<redacted>" : `${value.slice(0, 4)}...${value.slice(-4)}`

const parseEnvFile = (path: string): Readonly<Record<string, string>> => {
  if (!existsSync(path)) {
    return {}
  }

  return Object.fromEntries(
    readFileSync(path, "utf8")
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"))
      .map((line) => {
        const separator = line.indexOf("=")
        if (separator === -1) {
          return [line, ""]
        }
        const key = line.slice(0, separator).trim()
        const rawValue = line.slice(separator + 1).trim()
        const value = rawValue.replace(/^["']|["']$/gu, "")
        return [key, value]
      }),
  )
}

const envCandidates = (): readonly string[] => {
  const root = workspaceRoot()
  const current = workspaceRoot()
  const ancestors: string[] = []
  let cursor = current
  while (cursor !== dirname(cursor)) {
    ancestors.push(cursor)
    cursor = dirname(cursor)
  }
  ancestors.push(cursor)

  return [
    ...ancestors.map((path) => join(path, ".env")),
    join(root, ".env"),
    join(root, "..", "both", "joern-effect", ".env"),
    join(root, "..", "joern-effect", ".env"),
  ]
}

export const loadAxiomConfig = (): AxiomConfig | undefined => {
  const fileEnv = Object.assign({}, ...envCandidates().map(parseEnvFile))
  const token = fileEnv["AXIOM_TOKEN"]
  const dataset =
    fileEnv["AXIOM_DATASET"] ??
    fileEnv["AXIOM_DATASET_NAME"]
  const domain =
    fileEnv["AXIOM_DOMAIN"] ??
    "api.axiom.co"

  if (!token || !dataset) {
    return undefined
  }

  return { dataset, domain, token }
}

export const makeAxiomClient = (
  config: AxiomConfig,
): AxiomWithoutBatching =>
  new AxiomWithoutBatching({
    ...(config.domain === "api.axiom.co" ? {} : { url: `https://${config.domain}` }),
    token: config.token,
  })

const defaultAxiomConfig = loadAxiomConfig()
const defaultRuntime: PropertyEventRuntime = {
  ...(defaultAxiomConfig === undefined ? {} : { axiom: defaultAxiomConfig }),
  localEvents: false,
  runId: `joern-effect-property-${Date.now()}`,
}

export const defaultPropertyEventRuntime = (): PropertyEventRuntime => defaultRuntime

export const propertyRunId = (): string => defaultRuntime.runId

const eventSeverity = (eventType: string): "INFO" | "ERROR" | "WARN" => {
  if (eventType.includes("failed") || eventType.includes("counterexample")) {
    return "ERROR"
  }
  if (eventType.includes("disabled") || eventType.includes("unavailable")) {
    return "WARN"
  }
  return "INFO"
}

const toUnixNano = (date: Date): string =>
  `${BigInt(date.getTime()) * 1_000_000n}`

const otelValue = (value: unknown): OtelAnyValue => {
  if (typeof value === "boolean") {
    return { boolValue: value }
  }
  if (typeof value === "number") {
    return Number.isInteger(value) ? { intValue: String(value) } : { doubleValue: value }
  }
  if (typeof value === "bigint") {
    return { intValue: String(value) }
  }
  if (typeof value === "string") {
    return { stringValue: value }
  }
  return { stringValue: JSON.stringify(value) }
}

const otelAttributes = (input: Readonly<Record<string, unknown>>): readonly OtelAttribute[] =>
  Object.entries(input)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => ({ key, value: otelValue(value) }))

const toOtelLogRecord = (event: PropertyEvent): OtelLogRecord => {
  const now = new Date()
  const spanId = typeof event.payload?.["otel.span_id"] === "string"
    ? event.payload["otel.span_id"]
    : undefined
  const traceId = typeof event.payload?.["otel.trace_id"] === "string"
    ? event.payload["otel.trace_id"]
    : undefined
  return {
    attributes: otelAttributes({
      "attune.invariant.id": event.invariant,
      "attune.pack": event.pack,
      "attune.phase": event.phase,
      "attune.project": event.project,
      "attune.run.id": event.runId,
      "attune.source": event.source,
      "attune.target": event.target,
      "event.name": event.eventType,
      "service.name": "joern-effect-properties",
      "telemetry.sdk.language": "typescript",
      "telemetry.sdk.name": "opentelemetry",
      ...event.payload,
    }),
    body: { stringValue: event.eventType },
    event,
    eventId: randomUUID(),
    observedTimeUnixNano: toUnixNano(now),
    severityText: eventSeverity(event.eventType),
    ...(spanId === undefined ? {} : { spanId }),
    timeUnixNano: toUnixNano(now),
    ...(traceId === undefined ? {} : { traceId }),
  }
}

const toOtelExportRequest = (records: readonly OtelLogRecord[]): OtelLogExportRequest => ({
  resourceLogs: [{
    resource: {
      attributes: otelAttributes({
        "service.name": "joern-effect-properties",
        "service.namespace": "attune",
        "telemetry.sdk.language": "typescript",
        "telemetry.sdk.name": "opentelemetry",
      }),
    },
    scopeLogs: [{
      logRecords: records,
      scope: {
        name: "attune.joern-effect.properties",
        version: "0.1.0",
      },
    }],
  }],
})

const telemetryUnavailableEvent = (runtime: PropertyEventRuntime, reason: string): OtelLogRecord => toOtelLogRecord(makePropertyEvent({
  invariant: "telemetry",
  pack: "joern-effect",
  phase: "harness",
  project: "joern-effect",
  runId: runtime.runId,
  target: "joern-effect-properties:property",
}, {
  eventType: "attune.property.telemetry_unavailable",
  payload: { reason },
}))

const telemetryExportFailedEvent = (
  runtime: PropertyEventRuntime,
  config: AxiomConfig,
  status: number,
): OtelLogRecord => toOtelLogRecord(makePropertyEvent({
  invariant: "telemetry",
  pack: "joern-effect",
  phase: "harness",
  project: "joern-effect",
  runId: runtime.runId,
  target: "joern-effect-properties:property",
}, {
  eventType: "attune.property.telemetry_export_failed",
  payload: {
    dataset: config.dataset,
    status,
    token: redactToken(config.token),
  },
}))

const telemetryExportCompletedEvent = (
  runtime: PropertyEventRuntime,
  config: AxiomConfig,
  eventCount: number,
): OtelLogRecord => toOtelLogRecord(makePropertyEvent({
  invariant: "telemetry",
  pack: "joern-effect",
  phase: "harness",
  project: "joern-effect",
  runId: runtime.runId,
  target: "joern-effect-properties:property",
}, {
  eventType: "attune.property.telemetry_export_completed",
  payload: {
    dataset: config.dataset,
    eventCount,
  },
}))

const toLocalRecord = (record: OtelLogRecord): Readonly<Record<string, unknown>> => ({
  ...record,
  isoTime: new Date(Number(BigInt(record.timeUnixNano) / 1_000_000n)).toISOString(),
  event: record.event,
})

const axiomQueue: OtelLogRecord[] = []

const appendLocalRecord = (runtime: PropertyEventRuntime, record: OtelLogRecord): void => {
  if (!runtime.localEvents) {
    return
  }
  const file = eventsFile(runtime.runId)
  mkdirSync(dirname(file), { recursive: true })
  appendFileSync(file, `${JSON.stringify(toLocalRecord(record))}\n`)
}

export function writePropertyEvent(event: PropertyEvent): void
export function writePropertyEvent(runtime: PropertyEventRuntime, event: PropertyEvent): void
export function writePropertyEvent(
  runtimeOrEvent: PropertyEventRuntime | PropertyEvent,
  maybeEvent?: PropertyEvent,
): void {
  const runtime = maybeEvent === undefined ? defaultRuntime : runtimeOrEvent as PropertyEventRuntime
  const event = maybeEvent ?? runtimeOrEvent as PropertyEvent
  const record = toOtelLogRecord(event)
  appendLocalRecord(runtime, record)
  axiomQueue.push(record)
}

export const flushPropertyEvents = async (runtime: PropertyEventRuntime = defaultRuntime): Promise<void> => {
  if (axiomQueue.length === 0) {
    return
  }

  const config = runtime.axiom
  if (!config) {
    appendLocalRecord(runtime, telemetryUnavailableEvent(runtime, "missing Axiom config"))
    axiomQueue.length = 0
    return
  }

  const batch = axiomQueue.splice(0, axiomQueue.length)
  const response = await fetch(`https://${config.domain}/v1/logs`, {
    body: JSON.stringify(toOtelExportRequest(batch)),
    headers: {
      "Authorization": `Bearer ${config.token}`,
      "Content-Type": "application/json",
      "x-axiom-dataset": config.dataset,
    },
    method: "POST",
  }).catch(() => {
    appendLocalRecord(runtime, telemetryExportFailedEvent(runtime, config, 0))
    return undefined
  })

  if (!response) {
    return
  }

  if (!response.ok) {
    appendLocalRecord(runtime, telemetryExportFailedEvent(runtime, config, response.status))
    axiomQueue.unshift(...batch)
    return
  }

  appendLocalRecord(runtime, telemetryExportCompletedEvent(runtime, config, batch.length))
}

export const queryRecentPropertyEvents = async (
  limit = 20,
): Promise<unknown> => {
  const config = loadAxiomConfig()
  if (!config) {
    return { _tag: "AxiomUnavailable", reason: "missing AXIOM_TOKEN or AXIOM_DATASET" }
  }

  return await makeAxiomClient(config).query(
    `['${config.dataset}'] | where ['service.name'] == 'joern-effect-properties' | sort by _time desc | limit ${limit}`,
    { format: "legacy" },
  )
}

export const makeTraceId = (): string =>
  randomUUID().replace(/-/gu, "")

export const makeSpanId = (): string =>
  randomUUID().replace(/-/gu, "").slice(0, 16)

export const propertyEventBase = (
  input: Readonly<{
    readonly invariantId: string
    readonly phase: PropertyPhase
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
): PropertyEvent => ({
  ...base,
  eventType: input.eventType,
  source: "property",
  ...(input.payload === undefined ? {} : { payload: input.payload }),
})
