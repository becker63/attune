import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Effect, Schema } from "effect"
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

const JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeId = "joern-effect-properties.fuzz.services.query-feedback" as const
const JoernEffectPropertiesFuzzServicesQueryFeedbackLocalResourceId = "joern-effect-properties.fuzz.services.query-feedback.resource" as const
const JoernEffectPropertiesFuzzServicesQueryFeedbackLocalHandlerId = "joern-effect-properties.fuzz.services.query-feedback.handler" as const
const JoernEffectPropertiesFuzzServicesQueryFeedbackLocalSourcePath = "packages/attune/joern-effect-properties/src/fuzz/services/queryFeedback.ts" as const
const JoernEffectPropertiesFuzzServicesQueryFeedbackLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesFuzzServicesQueryFeedbackLocalSourcePath),
})
export type JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeInput = typeof JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeInput.Type

export const JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesFuzzServicesQueryFeedbackLocalSourcePath),
})
export type JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeOutput = typeof JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesFuzzServicesQueryFeedbackLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesFuzzServicesQueryFeedbackLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeId,
  producedBy: [JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeId],
  consumedBy: [JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeId, JoernEffectPropertiesFuzzServicesQueryFeedbackLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesFuzzServicesQueryFeedbackLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeInput,
  JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeOutput
>({
  id: JoernEffectPropertiesFuzzServicesQueryFeedbackLocalHandlerId,
  recipeId: JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeId,
  sourcePath: JoernEffectPropertiesFuzzServicesQueryFeedbackLocalSourcePath,
  exportName: "JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipes",
  emitsReceipts: ["joern-effect-properties.fuzz.services.query-feedback.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/fuzz/services/queryFeedback.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesFuzzServicesQueryFeedbackLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesFuzzServicesQueryFeedbackLocalResource],
    outputResources: [JoernEffectPropertiesFuzzServicesQueryFeedbackLocalResource],
  },
  handler: JoernEffectPropertiesFuzzServicesQueryFeedbackLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipeId,
      toRecipeId: JoernEffectPropertiesFuzzServicesQueryFeedbackLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesFuzzServicesQueryFeedbackLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipes = [JoernEffectPropertiesFuzzServicesQueryFeedbackLocalRecipe] as const
