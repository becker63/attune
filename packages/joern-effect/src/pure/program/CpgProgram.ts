import { Effect, Schema } from "effect"
import { Query } from "../../edge/runtime/Query.js"
import { emitSelect, emitTraversal, escapeScalaString } from "../../edge/runtime/emitCpgql.js"
import { Joern } from '../../edge/runtime/Joern.js';
import type { JoernService } from '../../edge/runtime/Joern.js';
import type { Selection, SelectionResult } from "../builder/select.js"
import { selectionSchema } from "../builder/select.js"
import {
  BoundFlow,
  BoundTraversal,
  FlowTraversal,
  MaterializationBuilder,
  type MaterializedGraphRefShape,
  Traversal,
} from '../builder/traversal.js';
import { CpgProgramBuilder } from "./CpgProgramBuilder.js"
import type { CpgProgramBuilderService } from "./CpgProgramBuilder.js"
import { CpgGraph, EvidenceGraph, evidenceGraphSummary, evidenceNodeSummary, findingFromNode, graphFact, GraphAnalysisError, GraphMaterializationError, protocolDeviation } from './Evidence.js';
import type { GraphFact, ProtocolDeviation, Finding } from './Evidence.js';
import type { BindingAst, BindingPhase, BoundLike, GraphIncludeAst, VariableId } from "./model.js"

export type CompiledCpgProgram<Out> = {
  readonly title: string
  readonly cpgql: string
  readonly bindings: readonly BindingAst[]
  readonly output: ProgramOutput<Out> | Out
  readonly planSummary: string
}

export type RowsOutput<Row> = {
  readonly _tag: "RowsOutput"
  readonly traversal: Traversal
  readonly selection: Selection
  readonly schema: Schema.Schema<ReadonlyArray<Row>>
}

export type FindingsOutput = {
  readonly _tag: "FindingsOutput"
  readonly title: string
  readonly graph: MaterializedGraphRef
  readonly root?: BoundLike
  readonly source?: BoundLike
  readonly sink?: BoundLike
  readonly flow?: BoundLike
  readonly path?: GraphPathRef
}

export type GraphFactsOutput = {
  readonly _tag: "GraphFactsOutput"
  readonly title: string
  readonly graph: MaterializedGraphRef
  readonly fact?: GraphFactRef
}

export type ProtocolDeviationOutput = {
  readonly _tag: "ProtocolDeviationOutput"
  readonly title: string
  readonly graph: MaterializedGraphRef
  readonly root?: BoundLike
  readonly presentSteps: readonly BoundLike[]
  readonly missingSteps: readonly BoundLike[]
}

export type ProgramOutput<Out> =
  | RowsOutput<Out extends ReadonlyArray<infer Row> ? Row : never>
  | FindingsOutput
  | GraphFactsOutput
  | ProtocolDeviationOutput

const isProgramOutput = (value: unknown): value is ProgramOutput<unknown> =>
  typeof value === "object" &&
  value !== null &&
  "_tag" in value &&
  (value as { readonly _tag?: string })._tag?.endsWith("Output") === true

const safeName = (name: string, fallback: string): string => {
  const cleaned = name
    .replace(/[^a-zA-Z0-9]+(.)/gu, (_, char: string) => char.toUpperCase())
    .replace(/[^a-zA-Z0-9]/gu, "")
  const candidate = cleaned.length === 0 ? fallback : cleaned
  return  /^[a-zA-Z_]/u.test(candidate) ? candidate : `v${candidate}`
}

export class CpgProgramBuilderState {
  private counter = 0
  private readonly usedCpgqlNames = new Map<string, number>()
  readonly bindings: BindingAst[] = []

  nextId(): VariableId {
    this.counter += 1
    return `v${this.counter}`
  }

  nextCpgqlName(name: string, fallback: string): string {
    const base = safeName(name, fallback)
    const seen = this.usedCpgqlNames.get(base) ?? 0
    this.usedCpgqlNames.set(base, seen + 1)
    return seen === 0 ? base : `${base}${seen + 1}`
  }
}

type InternalCpgProgramBuilderService = {
  readonly state: CpgProgramBuilderState
  readonly bindTraversal: (name: string, traversal: Traversal) => BoundTraversal
  readonly bindFlow: (name: string, flow: FlowTraversal) => BoundFlow
  readonly bindMaterializedGraph: (
    name: string,
    materialization: MaterializationBuilder,
  ) => MaterializedGraphRef
  readonly bindGraphPath: (name: string, path: GraphPathBuilder) => GraphPathRef
  readonly bindGraphFact: (name: string, fact: GraphFactBuilder) => GraphFactRef
  readonly rows: <S extends Selection>(
    traversal: Traversal,
    selection: S,
  ) => RowsOutput<SelectionResult<S>>
}

const makeBuilder = (): InternalCpgProgramBuilderService => {
  const state = new CpgProgramBuilderState()

  return {
    bindFlow: (name: string, flow: FlowTraversal) => {
      const variable = state.nextId()
      const cpgqlName = state.nextCpgqlName(name, variable)
      state.bindings.push({
        _tag: "RemoteFlowBinding",
        variable,
        name,
        cpgqlName,
        phase: "flow",
        source: flow.source.variable,
        ...(flow.sink instanceof BoundTraversal ? { sink: flow.sink.variable } : {}),
        relation: flow.relation,
        filters: flow.filters,
        cpgql: flowCpgql(flow),
      })
      return new BoundFlow(variable, name, cpgqlName)
    },
    bindGraphFact: (name: string, fact: GraphFactBuilder) => {
      const variable = state.nextId()
      const cpgqlName = state.nextCpgqlName(name, variable)
      state.bindings.push({
        _tag: "GraphPassBinding",
        variable,
        name,
        cpgqlName,
        phase: "derived",
        root: fact.graph.variable,
      })
      return new GraphFactRef(variable, name, cpgqlName, fact)
    },
    bindGraphPath: (name: string, path: GraphPathBuilder) => {
      const variable = state.nextId()
      const cpgqlName = state.nextCpgqlName(name, variable)
      state.bindings.push({
        _tag: "GraphPassBinding",
        variable,
        name,
        cpgqlName,
        phase: "derived",
        root: path.graph.variable,
      })
      return new GraphPathRef(variable, name, cpgqlName, path)
    },
    bindMaterializedGraph: (name: string, materialization: MaterializationBuilder) => {
      const variable = state.nextId()
      const cpgqlName = state.nextCpgqlName(name, variable)
      const root =
        materialization.root instanceof BoundTraversal ||
        materialization.root instanceof BoundFlow
          ? materialization.root.variable
          : undefined
      state.bindings.push({
        _tag: "MaterializedGraphBinding",
        variable,
        name,
        cpgqlName,
        phase: "materialized",
        ...(root === undefined ? {} : { root }),
        includes: materialization.includes,
        cpgql: materializationQuery(materialization),
      })
      return new MaterializedGraphRef(variable, name, cpgqlName, materialization)
    },
    bindTraversal: (name: string, traversal: Traversal) => {
      const variable = state.nextId()
      const cpgqlName = state.nextCpgqlName(name, variable)
      state.bindings.push({
        _tag: "RemoteTraversalBinding",
        variable,
        name,
        cpgqlName,
        phase: "remote",
        cpgql: emitTraversal(traversal.segments),
      })
      return new BoundTraversal(variable, name, cpgqlName)
    },
    rows: <S extends Selection>(traversal: Traversal, selection: S) => ({
      _tag: "RowsOutput",
      traversal,
      selection,
      schema: selectionSchema(selection),
    }),
    state,
  }
}

export class MaterializedGraphRef implements BoundLike {
  readonly phase = "materialized" as const
  readonly paths = new GraphPathsApi(this)
  readonly connected = new ConnectedGraphApi(this)
  readonly boundaries = new GraphBoundaryApi(this)
  readonly centrality = new GraphCentralityApi(this)
  readonly neighborhood = new GraphNeighborhoodApi(this)

  constructor(
    readonly variable: VariableId,
    readonly bindingName: string,
    readonly cpgqlName: string,
    readonly materialization: MaterializationBuilder,
  ) {}

  toFindings(): FindingEvidenceBuilder {
    return new FindingEvidenceBuilder(this)
  }

  toGraphFacts(): GraphFactsBuilder {
    return new GraphFactsBuilder(this)
  }

  toProtocolDeviations(): ProtocolDeviationBuilder {
    return new ProtocolDeviationBuilder(this)
  }

  compareToSequence(name: string): ProtocolSequenceBuilder {
    return new ProtocolSequenceBuilder(this, name)
  }
}

export class GraphPathsApi {
  constructor(readonly graph: MaterializedGraphRef) {}
  shortest(): ShortestPathBuilder {
    return new ShortestPathBuilder(this.graph)
  }
}

export class ShortestPathBuilder {
  private source?: BoundLike
  private sink?: BoundLike

  constructor(readonly graph: MaterializedGraphRef) {}

  from(source: BoundLike): this {
    this.source = source
    return this
  }

  to(sink: BoundLike): this {
    this.sink = sink
    return this
  }

  weightedBy(_weight: unknown): this {
    return this
  }

  as(name: string): Effect.Effect<GraphPathRef, never, CpgProgramBuilder> {
    return CpgProgramBuilder.pipe(
      Effect.map((builder) =>
        builder.bindGraphPath(name, new GraphPathBuilder(this.graph, this.source, this.sink)) as GraphPathRef,
      ),
    )
  }
}

export class ConnectedGraphApi {
  constructor(readonly graph: MaterializedGraphRef) {}
  smallest(): ConnectedSmallestBuilder {
    return new ConnectedSmallestBuilder(this.graph)
  }
}

export class GraphBoundaryApi {
  constructor(readonly graph: MaterializedGraphRef) {}
  crossedBetween(source: BoundLike, sink: BoundLike): Effect.Effect<GraphFactRef, never, CpgProgramBuilder> {
    return CpgProgramBuilder.pipe(
      Effect.map((builder) =>
        builder.bindGraphFact(
          "boundary crossing",
          new GraphFactBuilder(this.graph, "BoundaryCrossing", [source, sink]),
        ) as GraphFactRef,
      ),
    )
  }
}

export class GraphCentralityApi {
  constructor(readonly graph: MaterializedGraphRef) {}
  bridgeNodes(): Effect.Effect<GraphFactRef, never, CpgProgramBuilder> {
    return CpgProgramBuilder.pipe(
      Effect.map((builder) =>
        builder.bindGraphFact("bridge nodes", new GraphFactBuilder(this.graph, "BridgeNodes")) as GraphFactRef,
      ),
    )
  }
}

export class GraphNeighborhoodApi {
  constructor(readonly graph: MaterializedGraphRef) {}
  around(root: BoundLike): NeighborhoodDistanceBuilder {
    return new NeighborhoodDistanceBuilder(this.graph, root)
  }
}

export class NeighborhoodDistanceBuilder {
  constructor(
    readonly graph: MaterializedGraphRef,
    readonly root: BoundLike,
  ) {}
  withinDistance(distance: number): Effect.Effect<GraphFactRef, never, CpgProgramBuilder> {
    return CpgProgramBuilder.pipe(
      Effect.map((builder) =>
        builder.bindGraphFact(
          `neighborhood within ${distance}`,
          new GraphFactBuilder(this.graph, "Neighborhood", [this.root], { distance }),
        ) as GraphFactRef,
      ),
    )
  }
}

export class ProtocolSequenceBuilder {
  private steps: readonly BoundLike[] = []

  constructor(
    readonly graph: MaterializedGraphRef,
    readonly name: string,
  ) {}

  expecting(step: BoundLike): this {
    this.steps = [step]
    return this
  }

  then(step: BoundLike): this {
    this.steps = [...this.steps, step]
    return this
  }

  missingSteps(): MissingStepsBuilder {
    return new MissingStepsBuilder(this.graph, this.name, this.steps)
  }
}

export class MissingStepsBuilder {
  constructor(
    readonly graph: MaterializedGraphRef,
    readonly sequenceName: string,
    readonly expectedSteps: readonly BoundLike[],
  ) {}

  as(name: string): Effect.Effect<GraphFactRef, never, CpgProgramBuilder> {
    return CpgProgramBuilder.pipe(
      Effect.map((builder) =>
        builder.bindGraphFact(
          name,
          new GraphFactBuilder(this.graph, "MissingSteps", this.expectedSteps, {
            sequenceName: this.sequenceName,
          }),
        ) as GraphFactRef,
      ),
    )
  }
}

export class ConnectedSmallestBuilder {
  private anchors: readonly BoundLike[] = []

  constructor(readonly graph: MaterializedGraphRef) {}

  explaining(...anchors: readonly BoundLike[]): this {
    this.anchors = anchors
    return this
  }

  andMissing(_missing: BoundLike): this {
    return this
  }

  as(name: string): Effect.Effect<GraphPathRef, never, CpgProgramBuilder> {
    const [source, sink] = this.anchors
    return CpgProgramBuilder.pipe(
      Effect.map((builder) =>
        builder.bindGraphPath(name, new GraphPathBuilder(this.graph, source, sink)) as GraphPathRef,
      ),
    )
  }
}

export class GraphPathBuilder {
  constructor(
    readonly graph: MaterializedGraphRef,
    readonly source?: BoundLike,
    readonly sink?: BoundLike,
  ) {}
}

export class GraphPathRef implements BoundLike {
  readonly phase = "derived" as const

  constructor(
    readonly variable: VariableId,
    readonly bindingName: string,
    readonly cpgqlName: string,
    readonly path: GraphPathBuilder,
  ) {}

  toFindings(): FindingEvidenceBuilder {
    return new FindingEvidenceBuilder(this.path.graph, this)
  }
}

export type GraphFactOperation =
  | "BoundaryCrossing"
  | "BridgeNodes"
  | "Neighborhood"
  | "ConnectedSubgraph"
  | "MissingSteps"

export class GraphFactBuilder {
  constructor(
    readonly graph: MaterializedGraphRef,
    readonly operation: GraphFactOperation,
    readonly anchors: readonly BoundLike[] = [],
    readonly options: Record<string, unknown> = {},
  ) {}
}

export class GraphFactRef implements BoundLike {
  readonly phase = "derived" as const

  constructor(
    readonly variable: VariableId,
    readonly bindingName: string,
    readonly cpgqlName: string,
    readonly fact: GraphFactBuilder,
  ) {}
}

export class GraphFactsBuilder {
  constructor(
    readonly graph: MaterializedGraphRef,
    readonly fact?: GraphFactRef,
  ) {}

  from(fact: GraphFactRef): GraphFactsBuilder {
    return new GraphFactsBuilder(this.graph, fact)
  }

  all(): Effect.Effect<readonly GraphFact[]> {
    return Effect.succeed(this.output() as unknown as readonly GraphFact[])
  }

  private output(): GraphFactsOutput {
    return {
      _tag: "GraphFactsOutput",
      graph: this.graph,
      title: this.fact?.bindingName ?? this.graph.bindingName,
      ...(this.fact === undefined ? {} : { fact: this.fact }),
    }
  }
}

export class ProtocolDeviationBuilder {
  private root?: BoundLike
  private presentSteps: readonly BoundLike[] = []
  private missingSteps: readonly BoundLike[] = []

  constructor(readonly graph: MaterializedGraphRef) {}

  withRoot(root: BoundLike): this {
    this.root = root
    return this
  }

  withPresentSteps(...steps: readonly BoundLike[]): this {
    this.presentSteps = steps
    return this
  }

  withMissingSteps(...steps: readonly BoundLike[]): Effect.Effect<readonly ProtocolDeviation[]> {
    this.missingSteps = steps
    return Effect.succeed(this.output() as unknown as readonly ProtocolDeviation[])
  }

  private output(): ProtocolDeviationOutput {
    return {
      _tag: "ProtocolDeviationOutput",
      title: this.graph.bindingName,
      graph: this.graph,
      ...(this.root === undefined ? {} : { root: this.root }),
      presentSteps: this.presentSteps,
      missingSteps: this.missingSteps,
    }
  }
}

export class FindingEvidenceBuilder {
  private root?: BoundLike
  private source?: BoundLike
  private sink?: BoundLike
  private flow?: BoundLike

  constructor(
    readonly graph: MaterializedGraphRef,
    readonly path?: GraphPathRef,
  ) {}

  withRoot(root: BoundLike): Effect.Effect<readonly Finding[]> {
    this.root = root
    return Effect.succeed(this.output() as unknown as readonly Finding[])
  }

  withSource(source: BoundLike): this {
    this.source = source
    return this
  }

  withSink(sink: BoundLike): this {
    this.sink = sink
    return this
  }

  withFlow(flow: BoundLike): this {
    this.flow = flow
    return this
  }

  withMissing(_missing: BoundLike): this {
    return this
  }

  private output(): FindingsOutput {
    return {
      _tag: "FindingsOutput",
      graph: this.graph,
      title: this.path?.bindingName ?? this.graph.bindingName,
      ...(this.root === undefined ? {} : { root: this.root }),
      ...(this.source === undefined ? {} : { source: this.source }),
      ...(this.sink === undefined ? {} : { sink: this.sink }),
      ...(this.flow === undefined ? {} : { flow: this.flow }),
      ...(this.path === undefined ? {} : { path: this.path }),
    }
  }
}

export const GraphWeights = {
  preferDataFlowEdges: () => ({ _tag: "PreferDataFlowEdges" as const }),
}

const flowCpgql = (flow: FlowTraversal): string => {
  const base = `${emitTraversal(flow.sink.segments)}.${flow.relation}(${flow.source.cpgqlName})`
  return flow.filters.reduce((cpgql, filter) => {
    const method = filter._tag === "WhereNot" ? "filterNot" : "filter"
    return `${cpgql}.${method}(flow => ${filter.cpgql})`
  }, base)
}

const defsFor = (bindings: readonly BindingAst[]): string =>
  bindings
    .filter((binding) => binding.cpgql && binding._tag !== "MaterializedGraphBinding")
    .map((binding) => `def ${binding.cpgqlName} = ${binding.cpgql}`)
    .join("\n\n")

const edgeLabels = [
  "ALIAS_OF",
  "ARGUMENT",
  "AST",
  "BINDS",
  "BINDS_TO",
  "CALL",
  "CAPTURE",
  "CAPTURED_BY",
  "CATCH_BODY",
  "CDG",
  "CFG",
  "CONDITION",
  "CONTAINS",
  "DOMINATE",
  "DO_BODY",
  "EVAL_TYPE",
  "FALSE_BODY",
  "FINALLY_BODY",
  "FOR_BODY",
  "FOR_INIT",
  "FOR_UPDATE",
  "IMPORTS",
  "INHERITS_FROM",
  "IS_CALL_FOR_IMPORT",
  "JUMP_ARGUMENT",
  "PARAMETER_LINK",
  "POST_DOMINATE",
  "REACHING_DEF",
  "RECEIVER",
  "REF",
  "SOURCE_FILE",
  "TAGGED_BY",
  "TRUE_BODY",
  "TRY_BODY",
] as const

const edgeAccessor = (label: string): string =>
  `_${label.toLowerCase().replace(/_+([a-z0-9])/gu, (_, char: string) => char.toUpperCase())}Out`

const nodeListFor = (
  cpgqlName: string,
  phase: BindingPhase | undefined,
): string =>
  phase === "flow"
    ? `${cpgqlName}.l.flatMap(_.elements).toList`
    : `${cpgqlName}.l`

const includeNodeExpr = (include: GraphIncludeAst): string | undefined => {
  if (include._tag === "Missing") {return undefined}
  if (include._tag === "Path") {return "__rootNodes"}
  if (include.cpgqlName) {return nodeListFor(include.cpgqlName, include.phase)}
  if (include.cpgql) {return `__rootNodes.flatMap(node => __jeToStoredNodes(${include.cpgql})).toList`}
  return undefined
}

const materializationQuery = (materialization: MaterializationBuilder): string => {
  const {root} = materialization
  const rootRole =
    root instanceof BoundFlow || root instanceof BoundTraversal
      ? root.bindingName
      : materialization.name
  const rootNodes =
    root instanceof BoundFlow
      ? nodeListFor(root.cpgqlName, root.phase)
      : root instanceof BoundTraversal
        ? nodeListFor(root.cpgqlName, root.phase)
        : `${emitTraversal(root.segments)}.l`
  const includeExprs = materialization.includes
    .map(includeNodeExpr)
    .filter((expr): expr is string => Boolean(expr))

  const edgeCases = edgeLabels
    .map((label) => {
      const accessor = edgeAccessor(label)
      return `  scala.util.Try(n.${accessor}.map(dst => __jeEdge(n, dst, "${label}")).toList).getOrElse(List.empty)`
    })
    .join(",\n")

  return `import io.shiftleft.codepropertygraph.generated.nodes.StoredNode

def __jeProp(n: StoredNode, name: String): Option[Any] =
  n.properties.get(name)

def __jeStringProp(n: StoredNode, name: String): Any =
  __jeProp(n, name).map(_.toString).orNull

def __jeNumberProp(n: StoredNode, name: String): Any =
  __jeProp(n, name).flatMap(value => scala.util.Try(value.toString.toDouble).toOption).orNull

def __jeNode(n: StoredNode, role: String): Map[String, Any] =
  Map(
    "id" -> n.id.toString,
    "kind" -> n.label,
    "role" -> role,
    "code" -> __jeStringProp(n, "CODE"),
    "name" -> __jeStringProp(n, "NAME"),
    "fullName" -> __jeStringProp(n, "FULL_NAME"),
    "file" -> __jeStringProp(n, "FILENAME"),
    "line" -> __jeNumberProp(n, "LINE_NUMBER"),
    "column" -> __jeNumberProp(n, "COLUMN_NUMBER")
  )

def __jeToStoredNodes(value: Any): List[StoredNode] =
  value match {
    case null => List.empty
    case node: StoredNode => List(node)
    case iterator: Iterator[_] => iterator.collect { case node: StoredNode => node }.toList
    case iterable: Iterable[_] => iterable.collect { case node: StoredNode => node }.toList
    case _ => List.empty
  }

def __jeEdge(src: StoredNode, dst: StoredNode, kind: String): Map[String, Any] =
  Map(
    "id" -> s"\${src.id}:\${kind}:\${dst.id}",
    "kind" -> kind,
    "source" -> src.id.toString,
    "target" -> dst.id.toString,
    "role" -> kind
  )

def __jeEdges(n: StoredNode): List[Map[String, Any]] =
  List(
${edgeCases}
  ).flatten

val __rootNodes = ${rootNodes}.collect { case n: StoredNode => n }
val __includeNodes = List(
  __rootNodes${includeExprs.length > 0 ? `,\n  ${includeExprs.map((expr) => `${expr}.collect { case n: StoredNode => n }`).join(",\n  ")}` : ""}
).flatten
val __nodes = __includeNodes.groupBy(_.id).values.map(_.head).toList
val __rootNodeIds = __rootNodes.map(_.id.toString).toSet
val __nodeIds = __nodes.map(_.id.toString).toSet
val __edges = __nodes
  .flatMap(__jeEdges)
  .filter(edge => __nodeIds.contains(edge("target").asInstanceOf[String]))
  .groupBy(edge => edge("id").asInstanceOf[String])
  .values
  .map(_.head)
  .toList
val __nodesJson = __nodes.map(node =>
  __jeNode(
    node,
    if (__rootNodeIds.contains(node.id.toString)) "${escapeScalaString(rootRole)}" else "${escapeScalaString(materialization.name)}"
  )
).toJson
val __edgesJson = __edges.toJson

val __jeResultJson = s"""{"nodes":\${__nodesJson},"edges":\${__edgesJson}}"""
println(__jeResultJson)
__jeResultJson`
}

const compileOutput = <Out>(
  title: string,
  bindings: readonly BindingAst[],
  output: ProgramOutput<Out> | Out,
): string => {
  const asBlock = (body: string): string => `{
${body}
}`
  const withDefs = (defs: string, query: string): string =>
    defs ? asBlock(`${defs}\n\n${query}`) : query

  if (output instanceof MaterializedGraphRef) {
    const defs = defsFor(bindings)
    const query = materializationQuery(output.materialization)
    return withDefs(defs, query)
  }
  if (!isProgramOutput(output)) {return defsFor(bindings)}
  if (output._tag === "RowsOutput") {
    const defs = defsFor(bindings)
    const query = emitSelect(output.traversal.segments, output.selection)
    return withDefs(defs, query)
  }
  const defs = defsFor(bindings)
  const graph =
    output._tag === "FindingsOutput" ||
    output._tag === "GraphFactsOutput" ||
    output._tag === "ProtocolDeviationOutput"
      ? output.graph
      : undefined
  const query = graph ? materializationQuery(graph.materialization) : ""
  return withDefs(defs, query)
}

const runFindings = (
  joern: JoernService,
  bindings: readonly BindingAst[],
  output: FindingsOutput,
): Effect.Effect<
  readonly Finding[],
  | import("../../edge/runtime/errors.js").JoernError
  | import("../../edge/runtime/errors.js").JoernDecodeError
  | GraphMaterializationError
  | GraphAnalysisError
> => {
  const query = new Query(
    compileOutput(output.title, bindings, output),
    EvidenceGraph,
    { output },
  )
  return joern.query(query).pipe(
    Effect.flatMap((evidence) =>
      CpgGraph.fromEvidence(evidence).pipe(
        Effect.flatMap((graph) => {
          const pathEffect =
            output.path?.path.source && output.path.path.sink
              ? graph.shortestPath(output.path.path.source, output.path.path.sink)
              : Effect.succeed([])
          return pathEffect.pipe(
            Effect.map((path) => {
              const root = output.root ? graph.anchor(output.root) : evidence.nodes[0]
              return [
                findingFromNode(output.title, root, evidence, {
                  ...(path.length === 0 ? {} : { path: path.map(evidenceNodeSummary) }),
                  ...(output.source ? { source: evidenceNodeSummary(graph.anchor(output.source)) } : {}),
                  ...(output.sink ? { sink: evidenceNodeSummary(graph.anchor(output.sink)) } : {}),
                }),
              ] as const
            }),
          )
        }),
      ),
    ),
  )
}

const queryEvidence = (
  joern: JoernService,
  title: string,
  bindings: readonly BindingAst[],
  graph: MaterializedGraphRefShape,
): Effect.Effect<
  Schema.Schema.Type<typeof EvidenceGraph>,
  import("../../edge/runtime/errors.js").JoernError | import("../../edge/runtime/errors.js").JoernDecodeError
> =>
  joern.query(
    new Query(
      compileOutput(title, bindings, graph),
      EvidenceGraph,
      { bindings, graph },
    ),
  )

const runGraphFacts = (
  joern: JoernService,
  bindings: readonly BindingAst[],
  output: GraphFactsOutput,
): Effect.Effect<
  readonly GraphFact[],
  | import("../../edge/runtime/errors.js").JoernError
  | import("../../edge/runtime/errors.js").JoernDecodeError
  | GraphMaterializationError
  | GraphAnalysisError
> =>
  queryEvidence(joern, output.title, bindings, output.graph).pipe(
    Effect.flatMap((evidence) =>
      CpgGraph.fromEvidence(evidence).pipe(
        Effect.flatMap((graph) => {
          const fact = output.fact?.fact
          if (!fact) {
            return Effect.succeed([
              graphFact(output.title, "EvidenceGraph", evidence.nodes, { graph: evidenceGraphSummary(evidence) }),
            ])
          }
          switch (fact.operation) {
            case "BridgeNodes":
              return Effect.succeed([graphFact(output.title, fact.operation, graph.bridgeNodes(), { graph: evidenceGraphSummary(evidence) })])
            case "Neighborhood": {
              const root = fact.anchors[0]
              const distance = Number(fact.options.distance ?? 1)
              return Effect.succeed([
                graphFact(
                  output.title,
                  fact.operation,
                  root ? graph.neighborhood(root, distance) : [],
                  { distance, graph: evidenceGraphSummary(evidence) },
                ),
              ])
            }
            case "BoundaryCrossing":
            case "ConnectedSubgraph":
            case "MissingSteps":
              return graph.connectedSubgraph(fact.anchors).pipe(
                Effect.map((nodes) => [
                  graphFact(output.title, fact.operation, nodes, {
                    graph: evidenceGraphSummary(evidence),
                    ...fact.options,
                  }),
                ]),
              )
          }
        }),
      ),
    ),
  )

const runProtocolDeviations = (
  joern: JoernService,
  bindings: readonly BindingAst[],
  output: ProtocolDeviationOutput,
): Effect.Effect<
  readonly ProtocolDeviation[],
  | import("../../edge/runtime/errors.js").JoernError
  | import("../../edge/runtime/errors.js").JoernDecodeError
  | GraphMaterializationError
> =>
  queryEvidence(joern, output.title, bindings, output.graph).pipe(
    Effect.flatMap((evidence) =>
      CpgGraph.fromEvidence(evidence).pipe(
        Effect.map((graph) => {
          const root = output.root ? graph.anchor(output.root) : evidence.nodes[0] ?? null
          return [
            protocolDeviation(
              output.title,
              evidenceNodeSummary(root),
              output.missingSteps.map((step) => evidenceNodeSummary(graph.anchor(step)) ?? step.bindingName),
              evidence,
              output.presentSteps.map((step) => evidenceNodeSummary(graph.anchor(step)) ?? step.bindingName),
            ),
          ] as const
        }),
      ),
    ),
  )

export class CpgProgramDefinition<Out, E = never> {
  constructor(
    readonly title: string,
    readonly body: Effect.Effect<Out, E, CpgProgramBuilder>,
  ) {}
}

export const CpgProgram = {
  compile: <Out, E>(
    program: CpgProgramDefinition<Out, E>,
  ): Effect.Effect<CompiledCpgProgram<Out>, E> => {
    const builder = makeBuilder()
    return (program.body as Effect.Effect<
      ProgramOutput<Out> | Out,
      E,
      CpgProgramBuilder
    >).pipe(
      Effect.provideService(CpgProgramBuilder, builder as CpgProgramBuilderService),
      Effect.map((output) => {
        const cpgql = compileOutput(program.title, builder.state.bindings, output)
        return {
          title: program.title,
          cpgql,
          bindings: builder.state.bindings,
          output,
          planSummary: `${builder.state.bindings.length} symbolic bindings compiled for ${program.title}`,
        }
      }),
    )
  },

  effect: <Out, E>(
    title: string,
    body: Effect.Effect<Out, E, CpgProgramBuilder>,
  ): CpgProgramDefinition<Out, E> => new CpgProgramDefinition(title, body),

  runEvidenceGraph: <E>(
    program: CpgProgramDefinition<MaterializedGraphRefShape, E>,
  ): Effect.Effect<
    Schema.Schema.Type<typeof EvidenceGraph>,
    | E
    | import("../../edge/runtime/errors.js").JoernError
    | import("../../edge/runtime/errors.js").JoernDecodeError,
    Joern
  > => {
    const builder = makeBuilder()
    return program.body.pipe(
      Effect.provideService(CpgProgramBuilder, builder as CpgProgramBuilderService),
      Effect.flatMap((graph) =>
        Joern.pipe(
          Effect.flatMap((joern) =>
            queryEvidence(joern, program.title, builder.state.bindings, graph),
          ),
        ),
      ),
    )
  },

  run: <Out, E>(
    program: CpgProgramDefinition<Out, E>,
  ): Effect.Effect<
    Out,
    | E
    | import("../../edge/runtime/errors.js").JoernError
    | import("../../edge/runtime/errors.js").JoernDecodeError
    | GraphMaterializationError
    | GraphAnalysisError,
    Joern
  > => {
    const builder = makeBuilder()
    return (program.body as Effect.Effect<
      ProgramOutput<Out> | Out,
      E,
      CpgProgramBuilder
    >).pipe(
      Effect.provideService(CpgProgramBuilder, builder as CpgProgramBuilderService),
      Effect.flatMap((output) =>
        Joern.pipe(
          Effect.flatMap((joern) => {
            if (output instanceof MaterializedGraphRef) {
              return queryEvidence(
                joern,
                program.title,
                builder.state.bindings,
                output,
              ) as Effect.Effect<Out, never, never>
            }
            if (!isProgramOutput(output)) return Effect.succeed(output as Out)
            if (output._tag === "RowsOutput") {
              const query = new Query(
                compileOutput(program.title, builder.state.bindings, output),
                output.schema,
                { bindings: builder.state.bindings, output },
              )
              return joern.query(query) as Effect.Effect<Out, never, never>
            }
            if (output._tag === "GraphFactsOutput") {
              return runGraphFacts(joern, builder.state.bindings, output) as Effect.Effect<Out, never, never>
            }
            if (output._tag === "ProtocolDeviationOutput") {
              return runProtocolDeviations(joern, builder.state.bindings, output) as Effect.Effect<Out, never, never>
            }
            return runFindings(joern, builder.state.bindings, output) as Effect.Effect<Out, never, never>
          }),
        ),
      ),
    )
  },
}
