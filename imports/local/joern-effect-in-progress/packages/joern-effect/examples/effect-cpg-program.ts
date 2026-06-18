import { Effect } from "effect"
import { CpgProgram, GraphWeights, Joern, cpg } from "joern-effect"

export const requestInputToProcessExecution = CpgProgram.effect(
  "request input reaches process execution",
  Effect.gen(function* () {
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
      .as("source-to-sink data-flow paths")

    const graph = yield* flows
      .materializeGraph("source-to-sink evidence graph")
      .includingPath()
      .including((node) => node.controlledBy)
      .including((node) => node.method)

    const shortestExplanation = yield* graph
      .paths
      .shortest()
      .from(source)
      .to(sink)
      .weightedBy(GraphWeights.preferDataFlowEdges())
      .as("shortest explanation path")

    return yield* shortestExplanation
      .toFindings()
      .withSource(source)
      .withSink(sink)
      .withFlow(flows)
      .withRoot(sink)
  }),
)

export const throwableEscapesEffect = CpgProgram.effect(
  "throwable operation escapes the Effect error channel",
  Effect.gen(function* () {
    const throwable = yield* cpg.call
      .name("JSON.parse|Response.json|new Promise")
      .as("throwable call")

    const effectRegion = yield* throwable
      .repeat((_) => _.astParent)
      .until((_) => _.isCall.name("Effect.gen|Effect.flatMap|pipe"))
      .as("containing Effect region")

    const safetyBoundary = yield* throwable
      .repeat((_) => _.astParent)
      .until((_) =>
        _.isCall.name(
          "Effect.try|Effect.tryPromise|Schema.decode|Schema.decodeUnknown",
        ),
      )
      .as("Effect safety boundary")

    const unprotected = yield* throwable
      .whereNot(() => safetyBoundary)
      .as("unprotected throwable call")

    const graph = yield* unprotected
      .materializeGraph("local AST evidence")
      .including((call) => call.repeat((_) => _.astParent).maxDepth(5))
      .including((call) => call.controlledBy)
      .includingMissing(safetyBoundary)

    const explanation = yield* graph
      .connected
      .smallest()
      .explaining(unprotected, effectRegion)
      .andMissing(safetyBoundary)
      .as("minimal explanation graph")

    return yield* explanation
      .toFindings()
      .withRoot(unprotected)
  }),
)

export const providerProtocolDeviation = CpgProgram.effect(
  "provider calls missing service protocol steps",
  Effect.gen(function* () {
    const providerCall = yield* cpg.call
      .name(".*(openai|cerebras|anthropic|generateText|embed).*")
      .as("provider call")

    const graph = yield* providerCall
      .materializeGraph("provider call neighborhood")
      .including((call) => call.method.ast.isCall)

    const decode = yield* cpg.call
      .name("Schema.decode|Schema.decodeUnknown")
      .as("decode step")
    const mapError = yield* cpg.call.name("Effect.mapError").as("error mapping step")
    const span = yield* cpg.call
      .name("Effect.withSpan|Effect.withSpanScoped")
      .as("tracing step")

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

export const compiledRequestInputToProcessExecution = CpgProgram.compile(
  requestInputToProcessExecution,
)

export const runRequestInputToProcessExecution = (repoPath: string) =>
  CpgProgram.run(requestInputToProcessExecution).pipe(
    Effect.provide(Joern.layer({ repoPath })),
  )
