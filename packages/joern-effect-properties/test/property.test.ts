// @ts-nocheck
import { access, constants } from "node:fs/promises"
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { Arbitrary, Effect, Schema } from "effect"
import fc from "fast-check"
import { vi } from "vitest"

import {
  CpgGraph,
  CpgProgram,
  EvidenceEdge,
  EvidenceGraph,
  EvidenceNode,
  EnvVars,
  Joern,
  Query,
  cpg,
  emitSelect,
  emitTraversal,
  escapeScalaString,
  makeJoernClient,
  prop,
  readEnv,
  readEnvOr,
} from "joern-effect"
import type { BoundLike, JoernTransport, TraversalSegment } from "joern-effect"
import {
  ClassifiedCase,
  GraphFactSignature,
  OracleComparison,
	  SourceSinkObservation,
	  SourceSinkScenario,
	  checkAttuneProperty,
	  failWithAttuneContext,
	  runCase,
	} from "../src/index.js"

vi.setConfig({ testTimeout: 240_000 })

type TestEvidenceGraph = {
  readonly nodes: readonly {
    readonly id: string
    readonly name?: string
  }[]
  readonly edges: readonly {
    readonly source: string
    readonly target: string
  }[]
}

const dangerousScalaChars = fc
  .array(fc.constantFrom("\\", '"', "\n", "\r", "\t", "a", "Z", "0", ".", "*"), {
    maxLength: 80,
    minLength: 0,
  })
  .map((chars) => chars.join(""))

const selectedProperties = [
  prop.code,
  prop.lineNumber,
  prop.filename,
  prop.dynamicTypeHintFullName,
  prop.order,
] as const

const isJsonPreserving = (value: unknown): boolean => {
  if (typeof value === "number") {return Number.isFinite(value) && !Object.is(value, -0)}
  if (Array.isArray(value)) {return value.every(isJsonPreserving)}
  if (value && typeof value === "object") {
    return Object.values(value).every(isJsonPreserving)
  }
  return true
}

const propertyPool = [
  ["code", prop.code],
  ["lineNumber", prop.lineNumber],
  ["filename", prop.filename],
  ["methodFullName", prop.methodFullName],
  ["dynamicTypeHintFullName", prop.dynamicTypeHintFullName],
  ["order", prop.order],
] as const

const stepNames = [
  "call",
  "method",
  "argument",
  "ast",
  "member",
  "typeDecl",
  "cfg",
  "cdg",
  "reachingDef",
] as const

const starterNames = ["method", "call", "typeDecl", "file", "identifier"] as const

const identifier = fc
  .tuple(fc.constantFrom("field", "value", "line", "file", "method"), fc.nat(50))
  .map(([prefix, index]) => `${prefix}${index}`)

const jsIdentifier = fc
  .tuple(
    fc.constantFrom("handler", "service", "decode", "exec", "sink", "source"),
    fc.integer({ max: 10_000, min: 0 }),
  )
  .map(([prefix, index]) => `${prefix}${index}`)

const jsFixture = fc.record({
  functionName: jsIdentifier,
  literal: jsIdentifier,
  parameterName: jsIdentifier,
  sinkName: jsIdentifier,
}).filter((fixture) =>
  fixture.functionName !== fixture.parameterName &&
  fixture.functionName !== fixture.sinkName &&
  fixture.parameterName !== fixture.sinkName
)

const sourceSyntaxFlavor = fc.constantFrom("ts", "tsx", "jsx")

const sourceSinkScenarioArbitrary = fc.tuple(jsFixture, sourceSyntaxFlavor).map(
  ([fixture, syntaxFlavor]) =>
    new SourceSinkScenario({
      accessPath: ["body", fixture.literal],
      aliasChainLength: 1,
      expected: "UnsafeBecauseSafetyNearbyOnly",
      fileZone: "application",
      functionName: `${fixture.functionName}${syntaxFlavor}`,
      id: `source-sink-${syntaxFlavor}-${fixture.functionName}-${fixture.sinkName}`,
      literalSinkArgument: false,
      parameterName: fixture.parameterName,
      safetyPlacement: "nearby",
      sanitizerCallee: "validate",
      sinkCallee: fixture.sinkName,
      syntaxFlavor,
    }),
)

const e2eRuns = Number(readEnvOr(EnvVars.JoernEffectE2eRuns, "3"))

const stringPattern = fc.oneof(
  dangerousScalaChars,
  dangerousScalaChars.map((source) => new RegExp(source.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u")),
)

const nonStarterSegmentArbitrary: fc.Arbitrary<TraversalSegment> = fc.oneof(
  fc
    .constantFrom(...stepNames)
    .map((name): TraversalSegment => ({ kind: "step", name })),
  stringPattern.map(
    (value): TraversalSegment => ({ kind: "filter", name: "name", value }),
  ),
  stringPattern.map(
    (value): TraversalSegment => ({
      kind: "filter",
      name: "fullName",
      value,
    }),
  ),
  fc
    .tuple(fc.constantFrom(...propertyPool), stringPattern)
    .map(
      ([[, property], value]): TraversalSegment => ({
        kind: "propertyFilter",
        property: property.cpgql,
        value,
      }),
    ),
  fc.nat(100).map(
    (value): TraversalSegment => ({ kind: "operation", name: "take", value }),
  ),
  fc.constant({ kind: "operation", name: "dedup" } satisfies TraversalSegment),
)

const traversalSegmentProgram = fc
  .tuple(
    fc.constantFrom(...starterNames),
    fc.array(nonStarterSegmentArbitrary, { maxLength: 12 }),
  )
  .map(
    ([starter, rest]) =>
      [{ kind: "starter", name: starter } satisfies TraversalSegment, ...rest] as const,
  )

const selectionArbitrary = fc
  .uniqueArray(
    fc.tuple(identifier, fc.constantFrom(...propertyPool)),
    {
      maxLength: 4,
      minLength: 1,
      selector: ([alias]) => alias,
    },
  )
  .map((entries) =>
    Object.fromEntries(entries.map(([alias, [, property]]) => [alias, property])),
  )

const jsonSafeArbitraryFor = (property: (typeof propertyPool)[number][1]) => {
  switch (property.cpgql) {
    case "lineNumber":
      return fc.option(fc.integer({ max: 1_000_000, min: -1_000_000 }), {
        nil: null,
      })
    case "order":
      return fc.integer({ max: 1_000_000, min: -1_000_000 })
    case "dynamicTypeHintFullName":
      return fc.array(fc.string({ maxLength: 40 }), { maxLength: 5 })
    default:
      return fc.string({ maxLength: 80 })
  }
}

const invalidJsonFor = (value: unknown): unknown => {
  if (typeof value === "string") {return 1}
  if (typeof value === "number") {return "not-a-number"}
  if (typeof value === "boolean") {return "not-a-boolean"}
  if (Array.isArray(value)) {return "not-an-array"}
  if (value === null) {return { not: "null" }}
  return Symbol("invalid").toString()
}

const bindingLabel = dangerousScalaChars
  .filter((value) => value.trim().length > 0)
  .map((value) => value.slice(0, 30))

const evidenceChain = fc.integer({ max: 10, min: 2 }).map((length) => ({
  edges: Array.from({ length: length - 1 }, (_, index) => ({
    id: `e${index}`,
    kind: "REACHING_DEF",
    source: `n${index}`,
    target: `n${index + 1}`,
    role: "data-flow",
    weight: 1,
  })),
  nodes: Array.from({ length }, (_, index) => ({
    id: `n${index}`,
    kind: index === 0 ? "METHOD_PARAMETER_IN" : "CALL",
    role: index === 0 ? "source" : index === length - 1 ? "sink" : `middle-${index}`,
    code: `node ${index}`,
    name: `n${index}`,
    file: "src/example.ts",
    line: index + 1,
    column: 1,
  })),
}))

const bound = (bindingName: string): BoundLike => ({
  bindingName,
  cpgqlName: bindingName.replace(/[^a-zA-Z0-9]/gu, ""),
  phase: "remote",
  variable: "v1",
})

const writeGeneratedTsRepo = async (
  source: string,
): Promise<{ readonly dir: string }> => {
  const root = await propertyRepoRoot()
  const dir = await mkdtemp(join(root, "joern-effect-property-"))
  await writeFile(join(dir, "package.json"), `${JSON.stringify({ type: "module" }, null, 2)}\n`)
  await writeFile(
    join(dir, "tsconfig.json"),
    `${JSON.stringify({ compilerOptions: { module: "ESNext", target: "ES2022" } }, null, 2)}\n`,
  )
  await writeFile(join(dir, "index.ts"), source)
  return { dir }
}

const propertyRepoRoot = async (): Promise<string> => {
  const configured = readEnv(EnvVars.JoernEffectTestTmpdir)
  if (configured) {
    await mkdir(configured, { recursive: true })
    return configured
  }

  try {
    await access("/dev/shm", constants.W_OK)
    return "/dev/shm"
  } catch {
    return tmpdir()
  }
}

describe("property-based query behavior", () => {
  it("escapes Scala string literals without leaking raw control characters", () => {
    fc.assert(
      fc.property(dangerousScalaChars, (value) => {
        const escaped = escapeScalaString(value)
        expect(escaped).not.toContain("\n")
        expect(escaped).not.toContain("\r")
        expect(escaped).not.toContain("\t")

        const query = cpg.call.name(value).select({ code: prop.code })
        expect(query.cpgql).toContain(`.name("${escaped}")`)
      }),
      { numRuns: 200 },
    )
  })

  it("emits property filters for arbitrary strings without malformed quotes", () => {
    fc.assert(
      fc.property(dangerousScalaChars, (value) => {
        const query = cpg.call.code(value).select({ code: prop.code })
        expect(query.cpgql).toContain(`.code("${escapeScalaString(value)}")`)
      }),
      { numRuns: 200 },
    )
  })

  it("round-trips generated Effect Schema arbitraries through runtime decoding", async () => {
    await Promise.all(selectedProperties.map(async (property) => {
      const arbitrary = Arbitrary.make(property.schema as Schema.Schema<unknown>).filter(
        isJsonPreserving,
      )
      await fc.assert(
        fc.asyncProperty(arbitrary, async (value) => {
          const transport: JoernTransport = {
            execute: () => Effect.succeed(JSON.stringify([{ value }])),
            importCode: () => Effect.void,
            ready: () => Effect.succeed(true),
          }
          const joern = makeJoernClient("http://127.0.0.1:1", transport)
          const result = await Effect.runPromise(
            joern.query(
              cpg.call.select({
                value: {
                  ...property,
                  schema: property.schema as Schema.Schema<unknown>,
                },
              }),
            ),
          )
          expect(result).toStrictEqual([{ value }])
        }),
        { numRuns: 30 },
      )
    }))
  })

  it("arbitrary selected structs decode through the derived select schema", async () => {
    const query = cpg.call.select({
      code: prop.code,
      hints: prop.dynamicTypeHintFullName,
      line: prop.lineNumber,
    })
    const arbitrary = Arbitrary.make(
      Schema.Struct({
        code: prop.code.schema,
        hints: prop.dynamicTypeHintFullName.schema,
        line: prop.lineNumber.schema,
      }),
    ).filter(isJsonPreserving)

    await fc.assert(
      fc.asyncProperty(fc.array(arbitrary, { maxLength: 10 }), async (rows) => {
        const joern = makeJoernClient("http://127.0.0.1:1", {
          execute: () => Effect.succeed(JSON.stringify(rows)),
          importCode: () => Effect.void,
          ready: () => Effect.succeed(true),
        })

        await expect(Effect.runPromise(joern.query(query))).resolves.toStrictEqual(rows)
      }),
      { numRuns: 50 },
    )
  })

  it("emits arbitrary generated traversal programs without unescaped control characters", () => {
    fc.assert(
      fc.property(traversalSegmentProgram, selectionArbitrary, (segments, selection) => {
        const cpgql = emitSelect(segments, selection)
        expect(cpgql).toContain(".toJson")
        expect(cpgql).not.toContain("\r")
        expect(cpgql).not.toContain("\t")
        for (const alias of Object.keys(selection)) {
          expect(cpgql).toContain(`"${escapeScalaString(alias)}" -> n.`)
        }
        for (const segment of segments) {
          if (segment.kind === "filter") {
            expect(cpgql).toContain(
              `.${segment.name}("${escapeScalaString(
                segment.value instanceof RegExp ? segment.value.source : segment.value,
              )}")`,
            )
          }
          if (segment.kind === "propertyFilter" && typeof segment.value === "string") {
            expect(cpgql).toContain(
              `.${segment.property}("${escapeScalaString(segment.value)}")`,
            )
          }
        }
      }),
      { numRuns: 150 },
    )
  })

  it("generated traversal programs always start from cpg and preserve segment order", () => {
    fc.assert(
      fc.property(traversalSegmentProgram, (segments) => {
        const emitted = emitTraversal(segments)
        expect(emitted.startsWith(`cpg.${segments[0]?.name}`)).toBeTruthy()

        let cursor = 0
        for (const segment of segments.slice(1)) {
          const token =
            segment.kind === "step"
              ? `.${segment.name}`
              : segment.kind === "filter"
                ? `.${segment.name}(`
                : segment.kind === "propertyFilter"
                  ? `.${segment.property}(`
                  : segment.kind === "operation" && segment.name === "take"
                    ? ".take("
                    : segment.kind === "operation"
                      ? ".dedup"
                      : ""
          const next = emitted.indexOf(token, cursor)
          expect(next).toBeGreaterThanOrEqual(cursor)
          cursor = next + token.length
        }
      }),
      { numRuns: 150 },
    )
  })

  it("custom generated rows decode through query-carried schemas", async () => {
    await fc.assert(
      fc.asyncProperty(selectionArbitrary, async (selection) => {
        const fields = Object.fromEntries(
          Object.entries(selection).map(([alias, property]) => [
            alias,
            jsonSafeArbitraryFor(property as (typeof propertyPool)[number][1]),
          ]),
        )
        const rows = fc.sample(fc.array(fc.record(fields), { maxLength: 8 }), 1)[0]
        const query = cpg.call.select(selection)
        const joern = makeJoernClient("http://127.0.0.1:1", {
          execute: () => Effect.succeed(JSON.stringify(rows)),
          importCode: () => Effect.void,
          ready: () => Effect.succeed(true),
        })

        await expect(Effect.runPromise(joern.query(query))).resolves.toStrictEqual(rows)
      }),
      { numRuns: 75 },
    )
  })

  it("custom generated invalid rows fail the query-carried decoder", async () => {
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...propertyPool), async ([alias, property]) => {
        const arbitrary = Arbitrary.make(property.schema as Schema.Schema<unknown>)
        const valid = fc.sample(arbitrary, 1)[0]
        const invalid = invalidJsonFor(valid)
        const query = new Query(
          cpg.call.select({ [alias]: property }).cpgql,
          Schema.Array(Schema.Struct({ [alias]: property.schema as Schema.Schema<unknown> })),
        )
        const joern = makeJoernClient("http://127.0.0.1:1", {
          execute: () => Effect.succeed(JSON.stringify([{ [alias]: invalid }])),
          importCode: () => Effect.void,
          ready: () => Effect.succeed(true),
        })

        const exit = await Effect.runPromiseExit(joern.query(query))
        expect(String(exit)).toContain("JoernDecodeError")
      }),
      { numRuns: 50 },
    )
  })

  it("cpgProgram assigns unique Scala binding names for arbitrary repeated labels", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(bindingLabel, { maxLength: 10, minLength: 2 }),
        async (labels) => {
          const program = CpgProgram.effect(
            "unique labels",
            Effect.gen(function*  program() {
              for (const label of labels) {
                yield* cpg.call.name(label).as(label)
              }
              return []
            }),
          )

          const compiled = await Effect.runPromise(CpgProgram.compile(program))
          const names = [...compiled.cpgql.matchAll(/^def\s+([A-Za-z_][A-Za-z0-9_]*)\s+=/gmu)].map(
            ([, name]) => name,
          )

          expect(names).toHaveLength(labels.length)
          expect(new Set(names).size).toBe(names.length)
          for (const name of names) {expect(name).toMatch(/^[A-Za-z_][A-Za-z0-9_]*$/u)}
        },
      ),
      { numRuns: 75 },
    )
  })

  it("graphology evidence shortest paths preserve generated chain endpoints", async () => {
    await fc.assert(
      fc.asyncProperty(evidenceChain, async (evidence) => {
        const graph = await Effect.runPromise(CpgGraph.fromEvidence(evidence))
        const path = await Effect.runPromise(graph.shortestPath(bound("source"), bound("sink")))

        expect(path.map((node) => node.id)).toStrictEqual(evidence.nodes.map((node) => node.id))
        expect(path[0]?.role).toBe("source")
        expect(path.at(-1)?.role).toBe("sink")
      }),
      { numRuns: 75 },
    )
  })

  it("source/sink scenarios pass render and OXC admission as typed pipeline stages", async () => {
    await fc.assert(
      fc.asyncProperty(sourceSinkScenarioArbitrary, async (scenario) => {
        const rendered = await Effect.runPromise(scenario.render())
        const accepted = await Effect.runPromise(rendered.admitWithOxc())

        expect(rendered._tag).toBe("RenderedCase")
        expect(accepted._tag).toBe("OxcAcceptedCase")
        expect(accepted.scenario.id).toBe(scenario.id)
        expect(accepted.files).toHaveLength(1)
        expect(accepted.oxcShape.accepted).toBeTruthy()
        expect(accepted.oxcShape.constructs).toContain("function-declaration")
        expect(accepted.roles.sourcePattern).toBe(scenario.parameterName)
        expect(accepted.roles.sinkPattern).toBe(scenario.sinkCallee)
      }),
      { numRuns: 100 },
    )
  })

  it("classified source/sink observations round-trip through Schema with graph facts", async () => {
    await fc.assert(
      fc.asyncProperty(sourceSinkScenarioArbitrary, evidenceChain, async (scenario, evidence) => {
        const graph = new EvidenceGraph({
          edges: evidence.edges.map((edge) => new EvidenceEdge(edge)),
          nodes: evidence.nodes.map((node) => new EvidenceNode(node)),
        })
        const graphFacts = new GraphFactSignature({
          danglingEdges: [],
          edgeCount: graph.edges.length,
          edgeKinds: [...new Set(graph.edges.map((edge) => edge.kind))].toSorted(),
          hasSinkAnchor: graph.nodes.some((node) => node.role === "sink"),
          hasSourceAnchor: graph.nodes.some((node) => node.role === "source"),
          nodeCount: graph.nodes.length,
          nodeKinds: [...new Set(graph.nodes.map((node) => node.kind))].toSorted(),
        })
        const classified = new ClassifiedCase({
          classification: {
            bestEngine: "joern",
            classification: "finding",
            reliability: "stable",
          },
          comparison: new OracleComparison({
            dslRows: [],
            emittedCpgql: "cpg.call.toJson",
            rawCpgql: "cpg.call.toJson",
            rawRows: [],
            result: "Agreed",
          }),
          graph,
          graphFacts,
          oxcShape: {
            accepted: true,
            constructs: ["function-declaration", "call-expression"],
            files: [],
            syntax: scenario.syntaxFlavor,
          },
          repo: {
            bytes: 0,
            filesystem: "/dev/shm",
            freeBytes: 0,
            path: "/dev/shm/joern-effect-property-test",
          },
          scenario,
        })

        const observation = await Effect.runPromise(classified.toObservation())
        const decoded = Schema.decodeUnknownSync(SourceSinkObservation)(observation)

        expect(decoded.id).toBe(scenario.id)
        expect(decoded.source.pattern).toBe(scenario.parameterName)
        expect(decoded.sink.pattern).toBe(scenario.sinkCallee)
        expect(decoded.evidence.graphFacts.danglingEdges).toStrictEqual([])
        expect(decoded.evidence.graph.nodes.length).toBe(graph.nodes.length)
      }),
      { numRuns: 75 },
    )
  })
})

describe("property-based Joern e2e behavior", () => {
  it(
    "source/sink scenarios pass the typed OXC -> Joern -> Graphology pipeline",
    async () => {
      await checkAttuneProperty({
        arbitrary: sourceSinkScenarioArbitrary,
        invariantId: "programs-use-boundaries",
        numRuns: e2eRuns,
        phase: "edge",
        propertyId: "source-sink-oxc-joern-graphology-pipeline",
        target: "joern-effect-properties:property",
        predicate: async (scenario) => {
          console.log("source/sink e2e scenario", scenario.id)
          const terminal = await Effect.runPromise(
            runCase(scenario).pipe(
              Effect.provide(
                Joern.layer({
                  repoPath: readEnvOr(EnvVars.JoernEffectTestTmpdir, tmpdir()),
                  skipInitialImport: true,
                }),
              ),
            ),
          )
          console.log("source/sink e2e terminal", terminal._tag)

          expect(terminal._tag).toBe("Observation")
          if (terminal._tag === "Observation") {
            const graph = terminal.observation.evidence.graph as TestEvidenceGraph
            const graphFacts = terminal.observation.evidence.graphFacts as {
              readonly danglingEdges?: readonly string[]
            }
            expect(terminal.observation.classification).toBe("finding")
            expect(terminal.observation.bestEngine).toBe("joern")
            expect(graphFacts.danglingEdges).toStrictEqual([])
            expect(graph.nodes.length).toBeGreaterThan(0)
            expect(graph.edges.every((edge) =>
              graph.nodes.some((node) => node.id === edge.source) &&
              graph.nodes.some((node) => node.id === edge.target),
            )).toBeTruthy()
          }
        },
      })
    },
    300_000,
  )

  it(
    "generated TypeScript call sites round-trip through Joern rows",
    async () => {
      await checkAttuneProperty({
        arbitrary: jsFixture,
        invariantId: "joern-runtime-is-effect-scoped",
        numRuns: e2eRuns,
        phase: "interpreter",
        propertyId: "generated-js-call-sites-round-trip-through-joern-rows",
        target: "joern-effect-properties:property",
        predicate: async (fixture) => {
          const repo = await writeGeneratedTsRepo(
            [
              `function ${fixture.sinkName}(value) { return value }`,
              `function ${fixture.functionName}(${fixture.parameterName}) {`,
              `  return ${fixture.sinkName}(${fixture.parameterName}.${fixture.literal})`,
              "}",
              `module.exports = { ${fixture.functionName} }`,
            ].join("\n"),
          )

          try {
            const program = CpgProgram.effect(
              "generated call rows",
              Effect.gen(function*  program() {
                const sink = yield* cpg.call.name(fixture.sinkName).as("generated sink")
                return yield* sink.toRows({
                  code: prop.code,
                  file: prop.filename,
                  name: prop.name,
                })
              }),
            )

            const rows = await Effect.runPromise(
              CpgProgram.run(program).pipe(Effect.provide(Joern.layer({ repoPath: repo.dir }))),
            )

            expect(rows.some((row) => row.name === fixture.sinkName)).toBeTruthy()
            expect(rows.some((row) => row.code.includes(fixture.sinkName))).toBeTruthy()
          } finally {
            await rm(repo.dir, { force: true, recursive: true })
          }
        },
      })
    },
    240_000,
  )

  it(
    "generated TSX and JSX call sites are admitted by OXC and checked by Joern",
    async () => {
      const jsxOrTsxScenario = sourceSinkScenarioArbitrary.filter((scenario) =>
        scenario.syntaxFlavor === "tsx" || scenario.syntaxFlavor === "jsx"
      )

      await checkAttuneProperty({
        arbitrary: jsxOrTsxScenario,
        invariantId: "generated-dsl-is-descriptive",
        numRuns: e2eRuns,
        phase: "edge",
        propertyId: "generated-tsx-jsx-call-sites-oxc-and-joern",
        target: "joern-effect-properties:property",
        predicate: async (scenario) => {
          const rendered = await Effect.runPromise(scenario.render())
          const accepted = await Effect.runPromise(rendered.admitWithOxc())

          expect(accepted.oxcShape.syntax).toBe(scenario.syntaxFlavor)
          expect(accepted.oxcShape.constructs).toContain("tsx-capable")

          const terminal = await Effect.runPromise(
            runCase(scenario).pipe(
              Effect.provide(
                Joern.layer({
                  repoPath: readEnvOr(EnvVars.JoernEffectTestTmpdir, tmpdir()),
                  skipInitialImport: true,
                }),
              ),
            ),
          )

          expect(terminal._tag).toBe("Observation")
          if (terminal._tag === "Observation") {
            expect(terminal.observation.bestEngine).toBe("joern")
            expect(terminal.observation.sink.pattern).toBe(scenario.sinkCallee)
          }
        },
      })
    },
    300_000,
  )

  it(
    "generated TypeScript call sites materialize schema-edge evidence graphs",
    async () => {
      expect(true).toBe(true)
      await checkAttuneProperty({
        arbitrary: jsFixture,
        invariantId: "graphology-is-not-canonical-evidence",
        numRuns: e2eRuns,
        phase: "edge",
	        propertyId: "generated-js-call-sites-materialize-schema-edge-evidence-graphs",
	        target: "joern-effect-properties:property",
	        predicate: async (fixture) => {
	          const source = [
	            `function ${fixture.sinkName}(value) { return value }`,
	            `function ${fixture.functionName}(${fixture.parameterName}) {`,
	            `  const local = ${fixture.parameterName}.${fixture.literal}`,
	            `  return ${fixture.sinkName}(local)`,
	            "}",
	            `module.exports = { ${fixture.functionName} }`,
	          ].join("\n")
	          const repo = await writeGeneratedTsRepo(
	            source,
	          )

	          try {
            const program = CpgProgram.effect(
              "generated evidence graph",
              Effect.gen(function*  program() {
                const sink = yield* cpg.call.name(fixture.sinkName).as("generated sink")
                return yield* sink
                  .materializeGraph("generated graph")
	                  .including((node) => node.method)
	              }),
	            )
	            const compiled = await Effect.runPromise(CpgProgram.compile(program))

	            const graph = await Effect.runPromise(
	              CpgProgram.run(program).pipe(Effect.provide(Joern.layer({ repoPath: repo.dir }))),
	            ) as unknown as TestEvidenceGraph

	            const hasSink = graph.nodes.some((node) => node.name === fixture.sinkName)
	            const hasFunction = graph.nodes.some((node) => node.name === fixture.functionName)
	            const allEdgesReferenceNodes = graph.edges.every((edge) =>
	              graph.nodes.some((node) => node.id === edge.source) &&
	              graph.nodes.some((node) => node.id === edge.target),
	            )

	            if (!hasSink || !hasFunction || !allEdgesReferenceNodes) {
	              failWithAttuneContext("Generated TypeScript evidence graph did not satisfy schema-edge invariants", {
	                allEdgesReferenceNodes,
	                cpgql: compiled.cpgql,
	                fixture,
	                graph: {
	                  edges: graph.edges.slice(0, 40),
	                  nodes: graph.nodes.slice(0, 40),
	                  totalEdges: graph.edges.length,
	                  totalNodes: graph.nodes.length,
	                },
	                hasFunction,
	                hasSink,
	                repoDir: repo.dir,
	                source,
	              })
	            }
	          } finally {
	            await rm(repo.dir, { force: true, recursive: true })
	          }
        },
      })
    },
    240_000,
  )

  it(
    "generated TypeScript service shapes produce graph facts through the V2 surface",
    async () => {
      await checkAttuneProperty({
        arbitrary: jsFixture,
        invariantId: "graphology-is-not-canonical-evidence",
        numRuns: e2eRuns,
        phase: "edge",
        propertyId: "generated-js-service-shapes-produce-v2-graph-facts",
        target: "joern-effect-properties:property",
        predicate: async (fixture) => {
          const repo = await writeGeneratedTsRepo(
            [
              `function decode(value) { return value }`,
              `function ${fixture.sinkName}(value) { return value }`,
              `function ${fixture.functionName}(${fixture.parameterName}) {`,
              `  const decoded = decode(${fixture.parameterName}.${fixture.literal})`,
              `  return ${fixture.sinkName}(decoded)`,
              "}",
              `module.exports = { ${fixture.functionName} }`,
            ].join("\n"),
          )

          try {
            const program = CpgProgram.effect(
              "generated graph facts",
              Effect.gen(function*  program() {
                const sink = yield* cpg.call.name(fixture.sinkName).as("generated sink")
                const graph = yield* sink
                  .materializeGraph("generated graph facts")
                  .including((node) => node.method)
                const neighborhood = yield* graph.neighborhood.around(sink).withinDistance(2)
                return yield* graph.toGraphFacts().from(neighborhood).all()
              }),
            )

            const facts = await Effect.runPromise(
              CpgProgram.run(program).pipe(Effect.provide(Joern.layer({ repoPath: repo.dir }))),
            )

            expect(facts[0]?.kind).toBe("Neighborhood")
            expect(facts[0]?.nodes.some((node) => node.name === fixture.sinkName)).toBeTruthy()
            const graphEvidence = facts[0]?.evidence.graph as
              | { readonly edgeCount?: number; readonly nodeCount?: number }
              | undefined
            expect(graphEvidence?.nodeCount).toBeDefined()
            expect(graphEvidence?.nodeCount ?? 0).toBeGreaterThan(0)
          } finally {
            await rm(repo.dir, { force: true, recursive: true })
          }
        },
      })
      expect(true).toBe(true)
    },
    240_000,
  )
})
