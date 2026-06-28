import { MultiDirectedGraph } from "graphology"
import type { AbstractGraph } from "graphology-types"
import { Data, Effect, Schema } from "effect"
import type { BoundLike } from "./model.js"
import { JsonObject, JsonValue, type JsonValue as JsonValueType } from "../../edge/runtime/json.js"

export const NodeKind = Schema.String
export const EdgeKind = Schema.String

export class EvidenceNode extends Schema.Class<EvidenceNode>("EvidenceNode")({
  code: Schema.NullOr(Schema.String),
  column: Schema.NullOr(Schema.Number),
  file: Schema.NullOr(Schema.String),
  fullName: Schema.optional(Schema.NullOr(Schema.String)),
  id: Schema.String,
  kind: NodeKind,
  line: Schema.NullOr(Schema.Number),
  name: Schema.optional(Schema.NullOr(Schema.String)),
  raw: Schema.optional(JsonValue),
  role: Schema.optional(Schema.String),
}) {}

export class EvidenceEdge extends Schema.Class<EvidenceEdge>("EvidenceEdge")({
  id: Schema.String,
  kind: EdgeKind,
  raw: Schema.optional(JsonValue),
  role: Schema.optional(Schema.String),
  source: Schema.String,
  target: Schema.String,
  weight: Schema.optional(Schema.Number),
}) {}

export class EvidenceGraph extends Schema.Class<EvidenceGraph>("EvidenceGraph")({
  edges: Schema.Array(EvidenceEdge),
  nodes: Schema.Array(EvidenceNode),
}) {}

export class Finding extends Schema.Class<Finding>("Finding")({
  column: Schema.NullOr(Schema.Number),
  evidence: JsonObject,
  file: Schema.NullOr(Schema.String),
  line: Schema.NullOr(Schema.Number),
  root: JsonValue,
  ruleId: Schema.String,
  severity: Schema.Literal("info", "warning", "error"),
  title: Schema.String,
}) {}

export class GraphFact extends Schema.Class<GraphFact>("GraphFact")({
  evidence: JsonObject,
  kind: Schema.String,
  nodes: Schema.Array(EvidenceNode),
  title: Schema.String,
}) {}

export class ProtocolDeviation extends Schema.Class<ProtocolDeviation>(
  "ProtocolDeviation",
)({
  graph: EvidenceGraph,
  missingSteps: Schema.Array(JsonValue),
  presentSteps: Schema.Array(JsonValue),
  root: JsonValue,
  title: Schema.String,
}) {}

export class GraphMaterializationError extends Data.TaggedError(
  "GraphMaterializationError",
)<{
  readonly message: string
  readonly evidence: JsonValueType
}> {}

export class GraphAnalysisError extends Data.TaggedError("GraphAnalysisError")<{
  readonly message: string
  readonly operation: string
}> {}

type NodeAttrs = Schema.Schema.Type<typeof EvidenceNode>
type EdgeAttrs = Schema.Schema.Type<typeof EvidenceEdge>

export const evidenceNodeSummary = (node: NodeAttrs | null | undefined): JsonValueType =>
  node === null || node === undefined
    ? null
    : {
        code: node.code,
        file: node.file,
        id: node.id,
        kind: node.kind,
        line: node.line,
        role: node.role ?? null,
      }

export const evidenceGraphSummary = (
  graph: Schema.Schema.Type<typeof EvidenceGraph>,
): JsonObject => ({
  edgeCount: graph.edges.length,
  nodeCount: graph.nodes.length,
})

export class CpgGraph {
  private constructor(private readonly graph: AbstractGraph<NodeAttrs, EdgeAttrs>) {}

  static fromEvidence(
    evidence: Schema.Schema.Type<typeof EvidenceGraph>,
  ): Effect.Effect<CpgGraph, GraphMaterializationError> {
    return Effect.try({
      catch: (cause) =>
        new GraphMaterializationError({
          message: "Failed to instantiate Graphology CPG evidence graph",
          evidence: {
            cause: String(cause),
            graph: evidenceGraphSummary(evidence),
          },
        }),
      try: () => {
        const graph = new MultiDirectedGraph<NodeAttrs, EdgeAttrs>()
        for (const node of evidence.nodes) graph.mergeNode(node.id, new EvidenceNode(node))
        for (const edge of evidence.edges) {
          graph.mergeDirectedEdgeWithKey(edge.id, edge.source, edge.target, new EvidenceEdge(edge))
        }
        return new CpgGraph(graph)
      },
    })
  }

  raw(): AbstractGraph<NodeAttrs, EdgeAttrs> {
    return this.graph
  }

  node(id: string): NodeAttrs | undefined {
    return this.graph.hasNode(id) ? this.graph.getNodeAttributes(id) : undefined
  }

  anchor(bound: BoundLike): NodeAttrs | undefined {
    const candidates = [bound.variable, bound.bindingName]
    for (const id of candidates) {
      if (this.graph.hasNode(id)) {return this.graph.getNodeAttributes(id)}
    }
    for (const id of this.graph.nodes()) {
      const node = this.graph.getNodeAttributes(id)
      if (node.role === bound.bindingName || node.role === bound.variable) {return node}
    }
    return undefined
  }

  private pathFromPrevious(
    endId: string,
    previous: ReadonlyMap<string, string>,
  ): readonly NodeAttrs[] {
    const path = [endId]
    let cursor = endId
    while (previous.has(cursor)) {
      const next = previous.get(cursor)
      if (next === undefined) {break}
      cursor = next
      path.push(cursor)
    }
    return path.reverse().map((id) => this.graph.getNodeAttributes(id))
  }

  private shortestPathFromIds(startId: string, endId: string): readonly NodeAttrs[] {
    const queue: string[] = [startId]
    const seen = new Set(queue)
    const previous = new Map<string, string>()

    for (let index = 0; index < queue.length; index++) {
      const current = queue[index]
      if (current === undefined) {continue}
      for (const neighbor of this.graph.outNeighbors(current)) {
        if (seen.has(neighbor)) {continue}
        seen.add(neighbor)
        previous.set(neighbor, current)
        if (neighbor === endId) {return this.pathFromPrevious(endId, previous)}
        queue.push(neighbor)
      }
    }

    return []
  }

  shortestPath(
    from: BoundLike,
    to: BoundLike,
  ): Effect.Effect<readonly NodeAttrs[], GraphAnalysisError> {
    return Effect.try({
      catch: () =>
        new GraphAnalysisError({
          message: "Failed to compute shortest path",
          operation: "paths.shortest",
        }),
      try: () => {
        const start = this.anchor(from)
        const end = this.anchor(to)
        if (!start || !end) return []
        if (start.id === end.id) return [start]
        return this.shortestPathFromIds(start.id, end.id)
      },
    })
  }

  connectedSubgraph(
    anchors: readonly BoundLike[],
  ): Effect.Effect<readonly NodeAttrs[], GraphAnalysisError> {
    const resolved = anchors.flatMap((anchor) => {
      const node = this.anchor(anchor)
      return node ? [node] : []
    })
    if (resolved.length <= 1) {return Effect.succeed(resolved)}

    const [first, ...rest] = resolved
    if (!first) {return Effect.succeed([])}
    const byId = new Map<string, NodeAttrs>([[first.id, first]])

    return Effect.forEach(rest, (node) => {
      const pseudoBound: BoundLike = {
        bindingName: node.id,
        cpgqlName: node.id,
        phase: "derived",
        variable: node.id,
      }
      const firstBound: BoundLike = {
        bindingName: first.id,
        cpgqlName: first.id,
        phase: "derived",
        variable: first.id,
      }
      return this.shortestPath(firstBound, pseudoBound)
    }).pipe(
      Effect.map((paths) => {
        for (const path of paths) {
          for (const pathNode of path) {byId.set(pathNode.id, pathNode)}
        }
        return [...byId.values()]
      }),
    )
  }

  bridgeNodes(): readonly NodeAttrs[] {
    const nodes = this.graph.nodes()
    return nodes
      .filter((id) => this.graph.inDegree(id) > 0 && this.graph.outDegree(id) > 0)
      .map((id) => this.graph.getNodeAttributes(id))
  }

  neighborhood(root: BoundLike, distance: number): readonly NodeAttrs[] {
    const start = this.anchor(root)
    if (!start) {return []}
    const queue: Array<{ readonly id: string; readonly depth: number }> = [
      { depth: 0, id: start.id },
    ]
    const seen = new Set([start.id])
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index]
      if (current === undefined) {continue}
      if (current.depth >= distance) {continue}
      for (const neighbor of [
        ...this.graph.outNeighbors(current.id),
        ...this.graph.inNeighbors(current.id),
      ]) {
        if (seen.has(neighbor)) {continue}
        seen.add(neighbor)
        queue.push({ depth: current.depth + 1, id: neighbor })
      }
    }
    return [...seen].map((id) => this.graph.getNodeAttributes(id))
  }
}

export const findingFromNode = (
  title: string,
  root: NodeAttrs | undefined,
  graph: Schema.Schema.Type<typeof EvidenceGraph>,
  evidence: JsonObject = {},
): Finding =>
  new Finding({
    column: root?.column ?? null,
    evidence: {
      graph: evidenceGraphSummary(graph),
      ...evidence,
    },
    file: root?.file ?? null,
    line: root?.line ?? null,
    root: root?.id ?? null,
    ruleId: title.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, ""),
    severity: "warning",
    title,
  })

export const graphFact = (
  title: string,
  kind: string,
  nodes: readonly NodeAttrs[],
  evidence: JsonObject = {},
): GraphFact =>
  new GraphFact({
    evidence,
    kind,
    nodes: [...nodes],
    title,
  })

export const protocolDeviation = (
  title: string,
  root: JsonValueType,
  missingSteps: readonly JsonValueType[],
  graph: Schema.Schema.Type<typeof EvidenceGraph>,
  presentSteps: readonly JsonValueType[] = [],
): ProtocolDeviation =>
  new ProtocolDeviation({
    graph: new EvidenceGraph({
      nodes: graph.nodes.map((node) => new EvidenceNode(node)),
      edges: graph.edges.map((edge) => new EvidenceEdge(edge)),
    }),
    missingSteps: [...missingSteps],
    presentSteps: [...presentSteps],
    root,
    title,
  })
