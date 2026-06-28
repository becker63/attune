import { Effect } from "effect"
import fc from "fast-check"
import { parseSync } from "oxc-parser"
import { describe, expect, it } from "vitest"
import {
  ProjectMutator,
  ProjectMutatorLive,
  applyMutationPlan,
  buildProject,
  curatedSemanticProjectSeeds,
  printBuiltProject,
  casePlanArbitrary,
  type MutationPlan,
  type SemanticProjectSeed,
} from "../src/fuzz/index.js"

const seedById = (id: string): SemanticProjectSeed => {
  const seed = curatedSemanticProjectSeeds.find((candidate) => candidate.id === id)
  if (seed === undefined) {
    throw new Error(`Missing semantic seed ${id}`)
  }
  return seed
}

const parseProject = (seed: SemanticProjectSeed): readonly string[] =>
  seed.files.flatMap((file) => {
    const parsed = parseSync(file.path, file.source, { sourceType: "module" })
    return parsed.errors.map((error) => `${file.path}: ${String(error.message ?? error)}`)
  })

const plan = (
  seed: SemanticProjectSeed,
  steps: MutationPlan["steps"],
): MutationPlan => ({
  planId: `${seed.id}-plan`,
  replay: {
    fastCheckPath: "0:1",
    fastCheckSeed: 20260618,
  },
  steps,
})

const step = (
  seed: SemanticProjectSeed,
  kind: MutationPlan["steps"][number]["kind"],
  name: string,
  fileIndex = 0,
): MutationPlan["steps"][number] => ({
  kind,
  params: { name, value: name },
  targetFile: seed.files[fileIndex]?.path ?? seed.entrypoint,
})

describe("semantic ts-morph mutators", () => {
  it("builds and prints in-memory semantic projects without losing parseable files", () => {
    const seed = seedById("semantic-curated-ts-modules-import-export")
    const printed = printBuiltProject(buildProject(seed))

    expect(printed.files.map((file) => file.path)).toEqual(seed.files.map((file) => file.path).toSorted())
    expect(parseProject(printed)).toEqual([])
  })

  it("applies representative JS mutations and preserves OXC parseability", () => {
    const seed = seedById("semantic-curated-js-source-sink")
    const result = applyMutationPlan(seed, plan(seed, [
      step(seed, "function-wrap", "wrapJs"),
      step(seed, "async-boundary", "asyncJs"),
      step(seed, "object-destructure", "objectJs"),
      step(seed, "optional-chain", "optionalJs"),
      step(seed, "module-split", "moduleJs"),
      step(seed, "source-sink-flow", "flowJs"),
    ]), "js-case")

    expect(result.rejected).toEqual([])
    expect(result.case.mutations).toHaveLength(6)
    expect(result.case.project.files.some((file) => file.path.endsWith("split_moduleJs.js"))).toBeTruthy()
    expect(parseProject(result.case.project)).toEqual([])
  })

  it("applies representative TS and TSX mutations through the Effect service", async () => {
    const tsSeed = seedById("semantic-curated-ts-generic-decode")
    const tsxSeed = seedById("semantic-curated-tsx-component-flow")

    const cases = await Effect.runPromise(
      Effect.gen(function* () {
        const mutator = yield* ProjectMutator
        const tsCase = yield* mutator.apply({
          caseId: "ts-case",
          plan: plan(tsSeed, [
            step(tsSeed, "generic-decode", "decodeTs"),
            step(tsSeed, "function-wrap", "wrapTs"),
            step(tsSeed, "async-boundary", "asyncTs"),
            step(tsSeed, "object-destructure", "objectTs"),
            step(tsSeed, "optional-chain", "optionalTs"),
            step(tsSeed, "module-split", "moduleTs"),
            step(tsSeed, "source-sink-flow", "flowTs"),
          ]),
          seed: tsSeed,
        })
        const tsxCase = yield* mutator.apply({
          caseId: "tsx-case",
          plan: plan(tsxSeed, [
            step(tsxSeed, "jsx-prop-flow", "propsTsx"),
            step(tsxSeed, "generic-decode", "decodeTsx"),
            step(tsxSeed, "module-split", "moduleTsx"),
          ]),
          seed: tsxSeed,
        })
        return [tsCase, tsxCase]
      }).pipe(Effect.provide(ProjectMutatorLive)),
    )

    expect(cases.flatMap((semanticCase) => parseProject(semanticCase.project))).toEqual([])
    expect(cases[0]?.replay?.fastCheckSeed).toBe(20260618)
    expect(cases[1]?.mutations.some((mutation) => mutation.kind === "jsx-prop-flow")).toBeTruthy()
  })

  it("rejects unavailable semantic mutation sites without corrupting the project", () => {
    const seed = seedById("semantic-curated-js-source-sink")
    const result = applyMutationPlan(seed, plan(seed, [
      step(seed, "generic-decode", "noTsInJs"),
      step(seed, "jsx-prop-flow", "noJsxInJs"),
      step(seed, "source-sink-flow", "stillApplies"),
    ]), "rejection-case")

    expect(result.rejected.map((rejection) => rejection.kind)).toEqual([
      "generic-decode",
      "jsx-prop-flow",
    ])
    expect(result.applied.map((applied) => applied.kind)).toEqual(["source-sink-flow"])
    expect(parseProject(result.case.project)).toEqual([])
  })

  it("generates replayable semantic mutation plans that print parseable projects", () => {
    const seeds = [
      seedById("semantic-curated-js-source-sink"),
      seedById("semantic-curated-ts-generic-decode"),
      seedById("semantic-curated-tsx-component-flow"),
    ]
    const samples = fc.sample(casePlanArbitrary(seeds, 3), {
      numRuns: 8,
      seed: 20260618,
    })

    expect(samples.every((sample) => sample.plan.replay?.fastCheckSeed !== undefined)).toBeTruthy()
    for (const sample of samples) {
      const result = applyMutationPlan(sample.seed, sample.plan, sample.caseId)
      expect(parseProject(result.case.project)).toEqual([])
    }
  })
})
