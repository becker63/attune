import { Effect, Layer, Schema } from "effect"
import { parseSync } from "oxc-parser"
import { describe, expect, it } from "vitest"
import {
  CounterexampleStoreInMemory,
  ProjectCorpusStore,
  ProjectCorpusStoreLive,
  ProjectCorpusStoreWithCounterexamplesLive,
  projectTemplateFromCounterexampleCandidate,
  SemanticProjectSeed,
  type CounterexampleCandidate,
  type SemanticProjectSeed as SemanticProjectSeedType,
} from "../src/fuzz/index.js"

const candidate: CounterexampleCandidate = {
  failureClass: "oracle-disagreement",
  mutators: [
    {
      kind: "optional-chain",
      value: "safeAccess",
    },
    {
      kind: "source-sink-injection",
      value: "commandFlow",
    },
  ],
  query: {
    fingerprint: "semantic-call-select-code",
  },
  replay: {
    fastCheckPath: "1:0:2",
    fastCheckSeed: 20260618,
  },
  seedId: "semantic-curated-ts-generic-decode",
  source:
    "declare function sink(value: unknown): unknown\nexport function handler(input: { readonly body?: { readonly command?: string } }) {\n  return sink(input.body?.command)\n}\n",
  syntaxFlavor: "ts",
  title: "Semantic optional chain disagreement",
}

describe("semantic corpus", () => {
  it("loads semantic project seeds through Effect Schema", async () => {
    const seeds = await Effect.runPromise(
      Effect.gen(function* () {
        const corpus = yield* ProjectCorpusStore
        return yield* corpus.list
      }).pipe(Effect.provide(ProjectCorpusStoreLive)),
    )

    expect(seeds.length).toBeGreaterThan(0)
    expect(Schema.decodeUnknownSync(Schema.Array(SemanticProjectSeed))(seeds)).toHaveLength(
      seeds.length,
    )
    expect(new Set(seeds.map((seed) => seed.id)).size).toBe(seeds.length)
    expect(seeds.every((seed) => seed.files.length > 0)).toBeTruthy()
  })

  it("covers JS, TS, JSX, TSX, modules, async, generic, class, destructuring, and source/sink syntax", async () => {
    const seeds = await Effect.runPromise(
      Effect.gen(function* () {
        const corpus = yield* ProjectCorpusStore
        return yield* corpus.list
      }).pipe(Effect.provide(ProjectCorpusStoreLive)),
    )

    const files = seeds.flatMap((seed: SemanticProjectSeedType) => seed.files)
    const syntaxFlavors = new Set(files.map((file) => file.syntaxFlavor))
    const tags = new Set(seeds.flatMap((seed: SemanticProjectSeedType) => seed.tags))

    expect(syntaxFlavors).toEqual(new Set(["js", "ts", "jsx", "tsx"]))
    expect([...tags]).toEqual(
      expect.arrayContaining([
        "modules",
        "import-export",
        "async-flow",
        "generic-decode",
        "class-method",
        "object-destructuring",
        "source-sink-flow",
      ]),
    )

    const diagnostics = files.flatMap((file) =>
      parseSync(file.path, file.source, { sourceType: "module" }).errors.map((error) =>
        String(error.message ?? error)
      )
    )
    expect(diagnostics).toEqual([])
  })

  it("adapts promoted counterexamples into replayable semantic project seeds", async () => {
    const seed = projectTemplateFromCounterexampleCandidate(candidate)

    expect(seed).toMatchObject({
      entrypoint: "src/semantic-curated-ts-generic-decode.ts",
      id: "semantic-promoted-counterexample-semantic-curated-ts-generic-decode-semantic-call-select-code",
      origin: "promoted-counterexample",
      title: "Semantic optional chain disagreement",
    })
    expect(seed?.files[0]).toMatchObject({
      source: candidate.source,
      syntaxFlavor: "ts",
      tags: expect.arrayContaining(["counterexample", "oracle-disagreement"]),
    })

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

    expect(seeds.some((item) => item.id === seed?.id)).toBeTruthy()
    expect(seeds.some((item) => item.origin === "curated")).toBeTruthy()
  })
})
