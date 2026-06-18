import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { Effect, Schema } from "effect"
import fc from "fast-check"
import {
  CpgGraph,
  EvidenceEdge,
  EvidenceGraph,
  EvidenceNode,
  Joern,
  Query,
  cpg,
  emitTraversal,
  makeJoernClient,
  prop,
  readEnvOr,
  EnvVars,
} from "joern-effect"
import type { JoernTransport, TraversalSegment } from "joern-effect"
import { checkAttuneProperty } from "../src/attuneProperty.js"

const starterNames = ["method", "call", "typeDecl", "file", "identifier"] as const
const stepNames = ["call", "method", "argument", "ast", "parameter"] as const

const segmentProgram = fc
  .tuple(
    fc.constantFrom(...starterNames),
    fc.array(fc.constantFrom(...stepNames), { maxLength: 8 }),
  )
  .map(([starter, steps]) => [
    { kind: "starter", name: starter } satisfies TraversalSegment,
    ...steps.map((name): TraversalSegment => ({ kind: "step", name })),
  ])

const propertyPool = [
  ["code", prop.code],
  ["lineNumber", prop.lineNumber],
  ["filename", prop.filename],
] as const

const validRow = fc.record({
  code: fc.string({ maxLength: 80 }),
  filename: fc.string({ maxLength: 80 }),
  lineNumber: fc.option(fc.integer({ max: 100_000, min: 0 }), { nil: null }),
})

const evidenceChain = fc.integer({ max: 12, min: 2 }).map((length) =>
  new EvidenceGraph({
    edges: Array.from({ length: length - 1 }, (_, index) =>
      new EvidenceEdge({
        id: `e${index}`,
        kind: "REACHING_DEF",
        source: `n${index}`,
        target: `n${index + 1}`,
      }),
    ),
    nodes: Array.from({ length }, (_, index) =>
      new EvidenceNode({
        code: `node ${index}`,
        column: 1,
        file: "src/example.ts",
        id: `n${index}`,
        kind: index === 0 ? "METHOD_PARAMETER_IN" : "CALL",
        line: index + 1,
        role: index === 0 ? "source" : index === length - 1 ? "sink" : `middle-${index}`,
      }),
    ),
  }),
)

const bound = (name: string) => ({
  bindingName: name,
  cpgqlName: name,
  phase: "remote" as const,
  variable: "v1",
})

describe("attune pure property pressure", () => {
  it("builder generated traversal step sequences preserve order", async () => {
    await checkAttuneProperty({
      arbitrary: segmentProgram,
      invariantId: "builder-mutation-is-local",
      numRuns: 125,
      phase: "pure",
      propertyId: "builder-step-order-preserved",
      target: "joern-effect:property:pure",
      predicate: (segments) => {
        const emitted = emitTraversal(segments)
        let cursor = 0
        for (const segment of segments) {
          const token =
            segment.kind === "starter"
              ? `cpg.${segment.name}`
              : segment.kind === "step"
                ? `.${segment.name}`
                : ""
          if (token === "") {continue}
          const next = emitted.indexOf(token, cursor)
          expect(next).toBeGreaterThanOrEqual(cursor)
          cursor = next + token.length
        }
      },
    })
  })

  it("builder construction does not emit execution-shaped query text", async () => {
    await checkAttuneProperty({
      arbitrary: fc.constantFrom(...propertyPool),
      invariantId: "builder-mutation-is-local",
      numRuns: 40,
      phase: "pure",
      propertyId: "builder-construction-is-descriptive",
      target: "joern-effect:property:pure",
      predicate: ([alias, property]) => {
        const query = cpg.call.select({ [alias]: property })
        expect(query.cpgql).toContain(".toJson")
        expect(query.cpgql).not.toContain("importCode")
        expect(query.cpgql).not.toContain("runPromise")
      },
    })
  })
})

describe("attune decode property pressure", () => {
  it("decode validates generated valid rows and rejects malformed rows structurally", async () => {
    await checkAttuneProperty({
      arbitrary: validRow,
      invariantId: "unknown-is-owned-by-decode",
      numRuns: 60,
      phase: "decode",
      propertyId: "decode-valid-invalid-rows",
      target: "joern-effect:property:decode",
      predicate: async (row) => {
        const query = new Query(
          cpg.call.select({
            code: prop.code,
            filename: prop.filename,
            lineNumber: prop.lineNumber,
          }).cpgql,
          Schema.Array(Schema.Struct({
            code: prop.code.schema,
            filename: prop.filename.schema,
            lineNumber: prop.lineNumber.schema,
          })),
        )
        const validTransport: JoernTransport = {
          execute: () => Effect.succeed(JSON.stringify([row])),
          importCode: () => Effect.void,
          ready: () => Effect.succeed(true),
        }
        const joern = makeJoernClient("http://127.0.0.1:1", validTransport)
        await expect(Effect.runPromise(joern.query(query))).resolves.toStrictEqual([row])

        const invalid = { ...row, lineNumber: "not-a-number" }
        const invalidJoern = makeJoernClient("http://127.0.0.1:1", {
          execute: () => Effect.succeed(JSON.stringify([invalid])),
          importCode: () => Effect.void,
          ready: () => Effect.succeed(true),
        })
        const exit = await Effect.runPromiseExit(invalidJoern.query(query))
        expect(String(exit)).toContain("JoernDecodeError")
      },
    })
  })
})

describe("attune pure evidence property pressure", () => {
  it("evidence graphology materialization has no dangling generated edges", async () => {
    await checkAttuneProperty({
      arbitrary: evidenceChain,
      invariantId: "graphology-is-not-canonical-evidence",
      numRuns: 80,
      phase: "pure",
      propertyId: "evidence-no-dangling-edges",
      target: "joern-effect:property:pure",
      predicate: async (graph) => {
        const materialized = await Effect.runPromise(CpgGraph.fromEvidence(graph))
        const nodeIds = new Set(graph.nodes.map((node) => node.id))
        expect(graph.edges.every((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))).toBeTruthy()
        const path = await Effect.runPromise(materialized.shortestPath(bound("source"), bound("sink")))
        expect(path[0]?.role).toBe("source")
        expect(path.at(-1)?.role).toBe("sink")
      },
    })
  })
})

describe(
  "attune loop Joern property pressure",
  () => {
    it("joern runtime smoke is Effect-scoped", async () => {
      await checkAttuneProperty({
        arbitrary: fc.string({ maxLength: 20 }),
        invariantId: "joern-runtime-is-effect-scoped",
        numRuns: Number(readEnvOr(EnvVars.JoernEffectE2eRuns, "1")),
        phase: "interpreter",
        propertyId: "joern-runtime-effect-scoped-smoke",
        target: "joern-effect:property:joern",
        predicate: async (suffix) => {
          const root = readEnvOr(EnvVars.JoernEffectTestTmpdir, "/dev/shm")
          await mkdir(root, { recursive: true })
          const repo = await mkdtemp(join(root, "joern-runtime-smoke-"))
          await writeFile(join(repo, "index.js"), "function smoke(value) { return value }\n")

          try {
            const result = await Effect.runPromise(
              Joern.pipe(
                Effect.flatMap((joern) => joern.queryRaw("cpg.metaData.toJson")),
                Effect.provide(
                  Joern.layer({
                    repoPath: repo,
                  }),
                ),
              ),
            )
            expect(`${result}${suffix}`).toContain("[")
          } finally {
            await rm(repo, { force: true, recursive: true })
          }
        },
      })
    })
  },
)
