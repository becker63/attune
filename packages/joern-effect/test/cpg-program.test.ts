import { Effect, Layer } from "effect"
import { vi } from "vitest"

import { CpgProgram, GraphWeights, Joern, cpg, prop } from "joern-effect"

vi.setConfig({ testTimeout: 120_000 })

const evidence = {
  edges: [
    {
      id: "flow-1",
      kind: "REACHING_DEF",
      source: "source-node",
      target: "sink-node",
      role: "data-flow",
      weight: 1,
    },
    {
      id: "decode-provider",
      kind: "AST",
      source: "decode-node",
      target: "provider-node",
      role: "sequence",
      weight: 1,
    },
    {
      id: "provider-span",
      kind: "AST",
      source: "provider-node",
      target: "span-node",
      role: "sequence",
      weight: 1,
    },
  ],
  nodes: [
    {
      id: "source-node",
      kind: "METHOD_PARAMETER_IN",
      role: "request source",
      code: "req",
      name: "req",
      file: "src/server.ts",
      line: 3,
      column: 12,
    },
    {
      id: "decode-node",
      kind: "CALL",
      role: "decode step",
      code: "Schema.decodeUnknown(schema)(input)",
      name: "decodeUnknown",
      file: "src/server.ts",
      line: 4,
      column: 5,
    },
    {
      id: "provider-node",
      kind: "CALL",
      role: "provider call",
      code: "openai.responses.create(input)",
      name: "openai.responses.create",
      file: "src/server.ts",
      line: 5,
      column: 5,
    },
    {
      id: "span-node",
      kind: "CALL",
      role: "tracing step",
      code: "Effect.withSpan('provider')",
      name: "Effect.withSpan",
      file: "src/server.ts",
      line: 6,
      column: 5,
    },
    {
      id: "sink-node",
      kind: "CALL",
      role: "process execution argument",
      code: "exec(req.query.cmd)",
      name: "exec",
      file: "src/server.ts",
      line: 7,
      column: 5,
    },
  ],
}

describe("CpgProgram", () => {
  it("compiles yield-bound traversals into named Joern definitions", () => {
    const program = CpgProgram.effect(
      "rows",
      Effect.gen(function*  program() {
        const call = yield* cpg.call.name("exec|spawn").as("dangerous call")
        return yield* call.toRows({ code: prop.code, line: prop.lineNumber })
      }),
    )

    return Effect.runPromise(
      CpgProgram.compile(program).pipe(
        Effect.tap((compiled) =>
          Effect.sync(() => {
            expect(compiled.cpgql).toContain("def dangerousCall = cpg.call.name")
            expect(compiled.cpgql).toContain("dangerousCall\n  .map(n => Map(")
            expect(compiled.planSummary).toContain("1 symbolic bindings")
          }),
        ),
      ),
    )
  })

  it("emits Joern-shaped where, whereNot, repeat, and flow filters", () => {
    const program = CpgProgram.effect(
      "control syntax",
      Effect.gen(function*  program() {
        const sanitizer = yield* cpg.call.name("sanitize|escape").as("sanitizer calls")
        const source = yield* cpg.identifier.name("input").as("source")
        const sink = yield* cpg.call
          .where((_) => _.argument.index(1).code(".*unsafe.*"))
          .whereNot((_) => _.method.name(".*test.*"))
          .repeat((_) => _.astParent)
          .until((_) => _.isCall.name("Effect.gen"))
          .as("sink")
        const flows = yield* sink
          .reachableByFlows(source)
          .whereNot((flow) => flow.elements.intersects(sanitizer))
          .as("flows without sanitizer")
        return yield* flows.materializeGraph("flow graph").includingPath()
      }),
    )

    return Effect.runPromise(
      CpgProgram.compile(program).pipe(
        Effect.tap((compiled) =>
          Effect.sync(() => {
            expect(compiled.cpgql).toContain('.where(_.argument.index(1).code(".*unsafe.*"))')
            expect(compiled.cpgql).toContain('.whereNot(_.method.name(".*test.*"))')
            expect(compiled.cpgql).toContain('.repeat(_.astParent)(_.until(_.isCall.name("Effect.gen")))')
            expect(compiled.cpgql).toContain(".filterNot(flow => flow.elements.exists")
            expect(compiled.cpgql).toContain("def __jeEdge(src: StoredNode, dst: StoredNode, kind: String)")
            expect(compiled.cpgql).toContain('n._astOut.map(dst => __jeEdge(n, dst, "AST"))')
            expect(compiled.cpgql).toContain('n._reachingDefOut.map(dst => __jeEdge(n, dst, "REACHING_DEF"))')
            expect(compiled.cpgql).not.toContain("_astOut()")
            expect(compiled.cpgql).toContain("val __edgesJson = __edges.toJson")
            expect(compiled.cpgql).toContain('"edges":${__edgesJson}')
          }),
        ),
      ),
    )
  })

  it("runs spec-shaped materialization and local shortest-path findings with a fixture Joern layer", () => {
    const program = CpgProgram.effect(
      "request input reaches process execution",
      Effect.gen(function*  program() {
        const source = yield* cpg.method
          .parameter
          .name("req|request|ctx")
          .as("request source")

        const sink = yield* cpg.call
          .name("exec|spawn|eval")
          .argument
          .index(1)
          .as("process execution argument")

        const flows = yield* sink
          .reachableByFlows(source)
          .as("data-flow paths")

        const graph = yield* flows
          .materializeGraph("evidence graph")
          .includingPath()
          .including((node) => node.method)

        const explanation = yield* graph
          .paths
          .shortest()
          .from(source)
          .to(sink)
          .weightedBy(GraphWeights.preferDataFlowEdges())
          .as("shortest explanation path")

        return yield* explanation
          .toFindings()
          .withSource(source)
          .withSink(sink)
          .withFlow(flows)
          .withRoot(sink)
      }),
    )

    const layer = Layer.succeed(Joern, {
      query: <A>() => Effect.succeed(evidence as A),
      queryRaw: () => Effect.succeed(JSON.stringify(evidence)),
    })

    return Effect.runPromise(
      CpgProgram.run(program).pipe(
        Effect.provide(layer),
        Effect.tap((findings) =>
          Effect.sync(() => {
            expect(findings).toHaveLength(1)
            expect(findings[0]?.title).toBe("shortest explanation path")
            expect(findings[0]?.file).toBe("src/server.ts")
            expect(findings[0]?.line).toBe(7)
            expect(findings[0]?.evidence.path).toStrictEqual([
              expect.objectContaining({ id: "source-node" }),
              expect.objectContaining({ id: "sink-node" }),
            ])
          }),
        ),
      ),
    )
  })

  it("runs local graph facts, neighborhoods, and protocol deviations", () => {
    const graphFactsProgram = CpgProgram.effect(
      "graph facts",
      Effect.gen(function*  graphFactsProgram() {
        const root = yield* cpg.call.name("openai").as("provider call")
        const graph = yield* root
          .materializeGraph("provider neighborhood")
          .including((node) => node.method)

        const bridgeNodes = yield* graph.centrality.bridgeNodes()
        yield* graph.boundaries.crossedBetween(root, bridgeNodes)
        yield* graph.neighborhood.around(root).withinDistance(2)

        return yield* graph.toGraphFacts().from(bridgeNodes).all()
      }),
    )

    const protocolProgram = CpgProgram.effect(
      "provider calls missing service protocol steps",
      Effect.gen(function*  protocolProgram() {
        const providerCall = yield* cpg.call.name("openai").as("provider call")
        const graph = yield* providerCall.materializeGraph("provider protocol graph")
        const decode = yield* cpg.call.name("Schema.decode").as("decode step")
        const mapError = yield* cpg.call.name("Effect.mapError").as("error mapping step")
        const span = yield* cpg.call.name("Effect.withSpan").as("tracing step")
        const missingSteps = yield* graph
          .compareToSequence("expected service protocol")
          .expecting(decode)
          .then(providerCall)
          .then(mapError)
          .then(span)
          .missingSteps()
          .as("missing protocol steps")

        return yield* graph
          .toProtocolDeviations()
          .withRoot(providerCall)
          .withPresentSteps(decode, span)
          .withMissingSteps(missingSteps)
      }),
    )

    const layer = Layer.succeed(Joern, {
      query: <A>() => Effect.succeed(evidence as A),
      queryRaw: () => Effect.succeed(JSON.stringify(evidence)),
    })

    return Effect.runPromise(
      Effect.all({
        deviations: CpgProgram.run(protocolProgram).pipe(Effect.provide(layer)),
        facts: CpgProgram.run(graphFactsProgram).pipe(Effect.provide(layer)),
      }).pipe(
        Effect.tap(({ deviations, facts }) =>
          Effect.sync(() => {
            expect(facts[0]?.kind).toBe("BridgeNodes")
            expect(facts[0]?.nodes.map((node) => node.id)).toContain("provider-node")
            expect(deviations[0]?.title).toBe("provider protocol graph")
            expect(deviations[0]?.missingSteps).toStrictEqual(["missing protocol steps"])
          }),
        ),
      ),
    )
  })
})
