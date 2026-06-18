import { Effect } from "effect"
import { loadAxiomConfig, makeAxiomClient } from "../../events.js"

export type QueryFeedbackEntry = Readonly<{
  readonly count: number
  readonly fingerprint: string
  readonly rows: number
}>

export type QueryFeedbackSnapshot = Readonly<{
  readonly entries: Readonly<Record<string, QueryFeedbackEntry>>
  readonly source: "axiom" | "disabled" | "unavailable" | "failed"
}>

const emptySnapshot = (source: QueryFeedbackSnapshot["source"]): QueryFeedbackSnapshot => ({
  entries: {},
  source,
})

const numberFrom = (value: unknown): number => {
  if (typeof value === "number") {
    return value
  }
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const stringFrom = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined

const asRecord = (value: unknown): Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null ? value as Readonly<Record<string, unknown>> : {}

const readAggregation = (
  aggregations: unknown,
  index: number,
): number => {
  if (!Array.isArray(aggregations)) {
    return 0
  }
  return numberFrom(asRecord(aggregations[index])["value"])
}

const parseLegacyTotals = (value: unknown): Readonly<Record<string, QueryFeedbackEntry>> => {
  const buckets = asRecord(asRecord(value)["buckets"])
  const totals = buckets["totals"]
  if (!Array.isArray(totals)) {
    return {}
  }

  return Object.fromEntries(
    totals.flatMap((entry): readonly [string, QueryFeedbackEntry][] => {
      const record = asRecord(entry)
      const group = asRecord(record["group"])
      const fingerprint = stringFrom(group["fingerprint"])
      if (fingerprint === undefined) {
        return []
      }
      const aggregations = record["aggregations"]
      return [[
        fingerprint,
        {
          count: readAggregation(aggregations, 0),
          fingerprint,
          rows: readAggregation(aggregations, 1),
        },
      ]]
    }),
  )
}

let cachedSnapshot: Promise<QueryFeedbackSnapshot> | undefined

export const loadQueryFeedbackSnapshot = (
  enabled: boolean,
): Effect.Effect<QueryFeedbackSnapshot> =>
  Effect.promise(async () => {
    if (!enabled) {
      return emptySnapshot("disabled")
    }
    if (cachedSnapshot !== undefined) {
      return await cachedSnapshot
    }

    cachedSnapshot = (async () => {
      const config = loadAxiomConfig()
      if (config === undefined) {
        return emptySnapshot("unavailable")
      }
      const apl = `['${config.dataset}'] | where ['service.name'] == 'joern-effect-properties' | where ['attributes.event.name'] == 'attune.fuzz.query_completed' | where ['attributes.queryFingerprint'] startswith 'generated-' | summarize count=count(), rows=sum(['attributes.rowCount']) by fingerprint=['attributes.queryFingerprint']`
      try {
        const result = await makeAxiomClient(config).query(apl, { format: "legacy" })
        return {
          entries: parseLegacyTotals(result),
          source: "axiom",
        }
      } catch {
        return emptySnapshot("failed")
      }
    })()

    return await cachedSnapshot
  })
