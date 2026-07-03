import { defineAlchemyRecipeDagEdge, defineAlchemyResource, defineRecipe, defineRecipeHandler } from "@attune/framework-protocol"
import { Context, Effect, Layer, Schema } from "effect"
import {
  CounterexampleCandidate,
  type CounterexampleCandidate as CounterexampleCandidateType,
  type CorpusSeed,
} from "../domain/model.js"

export interface CounterexampleStoreService {
  readonly list: Effect.Effect<readonly CounterexampleCandidateType[]>
  readonly promotedSeeds: Effect.Effect<readonly CorpusSeed[]>
  readonly record: (candidate: CounterexampleCandidateType) => Effect.Effect<void>
}

export class CounterexampleStore extends Context.Tag(
  "attune/joern-effect-properties/fuzz/CounterexampleStore",
)<CounterexampleStore, CounterexampleStoreService>() {}

const slug = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "")
    .slice(0, 80) || "counterexample"

const promotedSeedId = (
  candidate: CounterexampleCandidateType,
  index: number,
): string => {
  const fingerprint = candidate.query?.fingerprint
  return [
    "promoted-counterexample",
    slug(candidate.seedId),
    fingerprint === undefined ? `${index + 1}` : slug(fingerprint),
  ].join("-")
}

export const promoteCounterexampleCandidate = (
  candidate: CounterexampleCandidateType,
  index = 0,
): CorpusSeed => ({
  id: promotedSeedId(candidate, index),
  origin: "promoted-counterexample",
  source: candidate.source,
  syntaxFlavor: candidate.syntaxFlavor,
  title: candidate.title ?? `Promoted ${candidate.failureClass} counterexample`,
})

export const makeInMemoryCounterexampleStore = (
  initialCandidates: readonly CounterexampleCandidateType[] = [],
): CounterexampleStoreService => {
  const candidates = [
    ...Schema.decodeUnknownSync(Schema.Array(CounterexampleCandidate))(initialCandidates),
  ]

  return {
    list: Effect.sync(() => [...candidates]),
    promotedSeeds: Effect.sync(() => candidates.map(promoteCounterexampleCandidate)),
    record: (candidate) =>
      Effect.sync(() => {
        candidates.push(Schema.decodeUnknownSync(CounterexampleCandidate)(candidate))
      }),
  }
}

export const CounterexampleStoreInMemory = (
  initialCandidates: readonly CounterexampleCandidateType[] = [],
): Layer.Layer<CounterexampleStore> =>
  Layer.effect(
    CounterexampleStore,
    Effect.sync(() => makeInMemoryCounterexampleStore(initialCandidates)),
  )

export const CounterexampleStoreLive: Layer.Layer<CounterexampleStore> =
  CounterexampleStoreInMemory()

const JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeId = "joern-effect-properties.fuzz.services.counterexamples" as const
const JoernEffectPropertiesFuzzServicesCounterexamplesLocalResourceId = "joern-effect-properties.fuzz.services.counterexamples.resource" as const
const JoernEffectPropertiesFuzzServicesCounterexamplesLocalHandlerId = "joern-effect-properties.fuzz.services.counterexamples.handler" as const
const JoernEffectPropertiesFuzzServicesCounterexamplesLocalSourcePath = "packages/attune/joern-effect-properties/src/fuzz/services/counterexamples.ts" as const
const JoernEffectPropertiesFuzzServicesCounterexamplesLocalSourceSurfaceRecipeId = "joern-effect-properties.source-surface" as const

export const JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeInput = Schema.Struct({
  path: Schema.Literal(JoernEffectPropertiesFuzzServicesCounterexamplesLocalSourcePath),
})
export type JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeInput = typeof JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeInput.Type

export const JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeOutput = Schema.Struct({
  expressed: Schema.Boolean,
  path: Schema.Literal(JoernEffectPropertiesFuzzServicesCounterexamplesLocalSourcePath),
})
export type JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeOutput = typeof JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernEffectPropertiesFuzzServicesCounterexamplesLocalResource = defineAlchemyResource({
  id: JoernEffectPropertiesFuzzServicesCounterexamplesLocalResourceId,
  kind: "file",
  alchemyType: "attune:resource:File",
  ownerRecipeId: JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeId,
  producedBy: [JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeId],
  consumedBy: [JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeId, JoernEffectPropertiesFuzzServicesCounterexamplesLocalSourceSurfaceRecipeId],
  addressFields: ["path"],
  addressSchema: JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeInput as never,
  stateSchema: JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeOutput as never,
  modes: ["read", "check"],
})

export const JoernEffectPropertiesFuzzServicesCounterexamplesLocalHandler = defineRecipeHandler<
  JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeInput,
  JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeOutput
>({
  id: JoernEffectPropertiesFuzzServicesCounterexamplesLocalHandlerId,
  recipeId: JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeId,
  sourcePath: JoernEffectPropertiesFuzzServicesCounterexamplesLocalSourcePath,
  exportName: "JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipes",
  emitsReceipts: ["joern-effect-properties.fuzz.services.counterexamples.expressed"],
  handler: (input) =>
    Effect.succeed({
      expressed: true,
      path: input.path,
    }) as never,
})

export const JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipe = defineRecipe({
  id: JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeId,
  projectId: "joern-effect-properties",
  title: "Express src/fuzz/services/counterexamples.ts as a file-local recipe",
  inputSchema: JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeInput as never,
  outputSchema: JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeOutput as never,
  nxTarget: "joern-effect-properties:typecheck",
  allowedFiles: [JoernEffectPropertiesFuzzServicesCounterexamplesLocalSourcePath],
  validationEvidence: ["joern-effect-properties:typecheck"],
  io: {
    inputSchema: JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeInput as never,
    outputSchema: JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeOutput as never,
    inputResources: [JoernEffectPropertiesFuzzServicesCounterexamplesLocalResource],
    outputResources: [JoernEffectPropertiesFuzzServicesCounterexamplesLocalResource],
  },
  handler: JoernEffectPropertiesFuzzServicesCounterexamplesLocalHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipeId,
      toRecipeId: JoernEffectPropertiesFuzzServicesCounterexamplesLocalSourceSurfaceRecipeId,
      resource: JoernEffectPropertiesFuzzServicesCounterexamplesLocalResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
  ],
})

export const JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipes = [JoernEffectPropertiesFuzzServicesCounterexamplesLocalRecipe] as const
