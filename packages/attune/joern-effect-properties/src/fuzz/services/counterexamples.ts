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
