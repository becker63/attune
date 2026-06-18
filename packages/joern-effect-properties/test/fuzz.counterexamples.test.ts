import { Effect, Layer } from "effect"
import { describe, expect, it } from "vitest"
import {
  CounterexampleStore,
  CounterexampleStoreInMemory,
  ProjectCorpusStore,
  ProjectCorpusStoreLive,
  ProjectCorpusStoreWithCounterexamplesLive,
  type CounterexampleCandidate,
} from "../src/fuzz/index.js"

const candidate: CounterexampleCandidate = {
  failureClass: "schema-decode",
  mutators: [
    {
      kind: "optional-chain",
      value: "safeAccess",
    },
  ],
  query: {
    fingerprint: "call-select-code",
    recipe: "cpg.call.select({ code: prop.code })",
  },
  replay: {
    fastCheckPath: "2:1:0",
    fastCheckSeed: 20260617,
  },
  seedId: "curated-ts-generic-decode",
  source: "declare function sink(value: unknown): unknown\nexport const value = sink(input?.body?.command)\n",
  syntaxFlavor: "ts",
  title: "Shrunk decode failure",
}

describe("fuzz counterexample promotion", () => {
  it("records fixture candidates and exposes promoted corpus seeds", async () => {
    const promoted = await Effect.runPromise(
      Effect.gen(function* () {
        const counterexamples = yield* CounterexampleStore
        yield* counterexamples.record(candidate)
        return yield* counterexamples.promotedSeeds
      }).pipe(Effect.provide(CounterexampleStoreInMemory())),
    )

    expect(promoted).toHaveLength(1)
    expect(promoted[0]).toMatchObject({
      id: "promoted-counterexample-curated-ts-generic-decode-call-select-code",
      origin: "promoted-counterexample",
      source: candidate.source,
      syntaxFlavor: "ts",
      title: "Shrunk decode failure",
    })
  })

  it("includes promoted counterexamples in the corpus through service composition", async () => {
    const layer = Layer.provide(
      ProjectCorpusStoreWithCounterexamplesLive,
      CounterexampleStoreInMemory([candidate]),
    )

    const seeds = await Effect.runPromise(
      Effect.gen(function* () {
        const corpus = yield* ProjectCorpusStore
        return yield* corpus.list
      }).pipe(Effect.provide(layer)),
    )

    expect(seeds.some((seed) => seed.origin === "promoted-counterexample")).toBeTruthy()
    expect(seeds.some((seed) => seed.id === "semantic-curated-ts-generic-decode")).toBeTruthy()
  })

  it("does not read or include counterexamples in the default corpus layer", async () => {
    const seeds = await Effect.runPromise(
      Effect.gen(function* () {
        const corpus = yield* ProjectCorpusStore
        return yield* corpus.list
      }).pipe(Effect.provide(ProjectCorpusStoreLive)),
    )

    expect(seeds.some((seed) => seed.origin === "promoted-counterexample")).toBeFalsy()
  })
})
