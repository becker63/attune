import { Effect } from "effect"
import { Query } from "../../edge/runtime/Query.js"
import { emitSelect, emitTraversal } from "../../edge/runtime/emitCpgql.js"
import { CpgProgramBuilder } from "../program/CpgProgramBuilder.js"
import type { Finding, GraphFact, ProtocolDeviation } from "../program/Evidence.js"
import type { BoundLike, FlowFilterAst, GraphIncludeAst, VariableId } from "../program/model.js"
import type { FilterValue, TraversalSegment } from "./traversalAst.js"
import { selectionSchema } from './select.js';
import type { Selection, SelectionResult } from './select.js';
import type { Property } from "./property.js"
export type { FilterValue, RepeatModifier, TraversalSegment } from "./traversalAst.js"

const stepNames = [
  "call",
  "method",
  "argument",
  "ast",
  "parameter",
  "controlledBy",
  "isCall",
  "astParent",
] as const

type ProgramEffect<A> = Effect.Effect<A, never, CpgProgramBuilder>

export type FindingEvidenceBuilderShape = {
  readonly withRoot: (root: BoundLike) => Effect.Effect<readonly Finding[]>
  readonly withSource: (source: BoundLike) => FindingEvidenceBuilderShape
  readonly withSink: (sink: BoundLike) => FindingEvidenceBuilderShape
  readonly withFlow: (flow: BoundLike) => FindingEvidenceBuilderShape
  readonly withMissing: (missing: BoundLike) => FindingEvidenceBuilderShape
}

export type GraphPathRefShape = BoundLike & {
  readonly toFindings: () => FindingEvidenceBuilderShape
}

export type GraphFactRefShape = BoundLike & {
  readonly variable: VariableId
  readonly phase: "derived"
  readonly fact: any
}

export type MaterializedGraphRefShape = BoundLike & {
  readonly phase: "materialized"
  readonly materialization: unknown
  readonly paths: {
    readonly shortest: () => {
      readonly from: (source: BoundLike) => {
        readonly to: (sink: BoundLike) => {
          readonly weightedBy: (weight: unknown) => {
            readonly as: (name: string) => ProgramEffect<GraphPathRefShape>
          }
          readonly as: (name: string) => ProgramEffect<GraphPathRefShape>
        }
      }
    }
  }
  readonly connected: {
    readonly smallest: () => {
      readonly explaining: (...anchors: readonly BoundLike[]) => {
        readonly andMissing: (missing: BoundLike) => {
          readonly as: (name: string) => ProgramEffect<GraphPathRefShape>
        }
        readonly as: (name: string) => ProgramEffect<GraphPathRefShape>
      }
    }
  }
  readonly boundaries: {
    readonly crossedBetween: (source: BoundLike, sink: BoundLike) => ProgramEffect<GraphFactRefShape>
  }
  readonly centrality: {
    readonly bridgeNodes: () => ProgramEffect<GraphFactRefShape>
  }
  readonly neighborhood: {
    readonly around: (root: BoundLike) => {
      readonly withinDistance: (distance: number) => ProgramEffect<GraphFactRefShape>
    }
  }
  readonly toFindings: () => FindingEvidenceBuilderShape
  readonly toGraphFacts: () => {
    readonly from: (fact: GraphFactRefShape) => {
      readonly all: () => Effect.Effect<readonly GraphFact[]>
    }
    readonly all: () => Effect.Effect<readonly GraphFact[]>
  }
  readonly toProtocolDeviations: () => {
    readonly withRoot: (root: BoundLike) => {
      readonly withPresentSteps: (...steps: readonly BoundLike[]) => {
        readonly withMissingSteps: (...steps: readonly BoundLike[]) => Effect.Effect<readonly ProtocolDeviation[]>
      }
    }
  }
  readonly compareToSequence: (name: string) => {
    readonly expecting: (step: BoundLike) => {
      readonly then: (step: BoundLike) => {
        readonly then: (step: BoundLike) => {
          readonly then: (step: BoundLike) => {
            readonly missingSteps: () => {
              readonly as: (name: string) => ProgramEffect<GraphFactRefShape>
            }
          }
          readonly missingSteps: () => {
            readonly as: (name: string) => ProgramEffect<GraphFactRefShape>
          }
        }
        readonly missingSteps: () => {
          readonly as: (name: string) => ProgramEffect<GraphFactRefShape>
        }
      }
      readonly missingSteps: () => {
        readonly as: (name: string) => ProgramEffect<GraphFactRefShape>
      }
    }
  }
}

export class Traversal {
  constructor(readonly segments: readonly TraversalSegment[]) {}

  declare readonly call: Traversal
  declare readonly method: Traversal
  declare readonly argument: Traversal
  declare readonly ast: Traversal
  declare readonly parameter: Traversal
  declare readonly controlledBy: Traversal
  declare readonly isCall: Traversal
  declare readonly astParent: Traversal

  name(value: string | RegExp): Traversal {
    return new Traversal([...this.segments, { kind: "filter", name: "name", value }])
  }

  fullName(value: string | RegExp): Traversal {
    return new Traversal([
      ...this.segments,
      { kind: "filter", name: "fullName", value },
    ])
  }

  prop<A extends FilterValue>(property: Property<A>, value: A | RegExp): Traversal {
    return new Traversal([
      ...this.segments,
      { kind: "propertyFilter", property: property.cpgql, value },
    ])
  }

  whereRaw(predicate: string): Traversal {
    return new Traversal([...this.segments, { kind: "whereRaw", predicate }])
  }

  where(predicate: (node: Traversal) => Traversal | BoundLike): Traversal {
    const result = predicate(new Traversal([{ kind: "variable", name: "_" }]))
    return new Traversal([
      ...this.segments,
      {
        kind: "where",
        negated: false,
        segments: result instanceof Traversal ? result.segments : [{ kind: "variable", name: result.cpgqlName }],
      },
    ])
  }

  whereNot(predicate: (node: Traversal) => Traversal | BoundLike): Traversal {
    const result = predicate(new Traversal([{ kind: "variable", name: "_" }]))
    return new Traversal([
      ...this.segments,
      {
        kind: "where",
        negated: true,
        segments: result instanceof Traversal ? result.segments : [{ kind: "variable", name: result.cpgqlName }],
      },
    ])
  }

  repeat(step: (node: Traversal) => Traversal): RepeatTraversalBuilder {
    return new RepeatTraversalBuilder(this, step(new Traversal([{ kind: "variable", name: "_" }])).segments)
  }

  rawStep(cpgql: string): Traversal {
    return new Traversal([...this.segments, { cpgql, kind: "rawStep" }])
  }

  get dedup(): Traversal {
    return new Traversal([...this.segments, { kind: "operation", name: "dedup" }])
  }

  take(count: number): Traversal {
    return new Traversal([...this.segments, { kind: "operation", name: "take", value: count }])
  }

  select<const S extends Selection>(selection: S): Query<ReadonlyArray<SelectionResult<S>>> {
    return new Query(emitSelect(this.segments, selection), selectionSchema(selection), {
      segments: this.segments,
      selection,
    })
  }

  as(name: string): Effect.Effect<BoundTraversal, never, CpgProgramBuilder> {
    return CpgProgramBuilder.pipe(
      Effect.map((builder) => builder.bindTraversal(name, this) as BoundTraversal),
    )
  }

  reachableBy(source: BoundTraversal): FlowTraversal {
    return new FlowTraversal(this, source, "reachableBy")
  }

  reachableByFlows(source: BoundTraversal): FlowTraversal {
    return new FlowTraversal(this, source, "reachableByFlows")
  }

  materializeGraph(name: string): MaterializationBuilder {
    return new MaterializationBuilder(name, this)
  }

  toRows<const S extends Selection>(
    selection: S,
  ): Effect.Effect<ReadonlyArray<SelectionResult<S>>, never, CpgProgramBuilder> {
    return CpgProgramBuilder.pipe(
      Effect.map(
        (builder) =>
          builder.rows(this, selection) as unknown as ReadonlyArray<SelectionResult<S>>,
      ),
    )
  }
}

export class RepeatTraversalBuilder {
  constructor(
    private readonly traversal: Traversal,
    private readonly repeated: readonly TraversalSegment[],
  ) {}

  until(predicate: (node: Traversal) => Traversal): Traversal {
    return new Traversal([
      ...this.traversal.segments,
      {
        kind: "repeat",
        modifier: {
          kind: "until",
          segments: predicate(new Traversal([{ kind: "variable", name: "_" }])).segments,
        },
        segments: this.repeated,
      },
    ])
  }

  maxDepth(depth: number): Traversal {
    return new Traversal([
      ...this.traversal.segments,
      {
        kind: "repeat",
        modifier: { depth, kind: "maxDepth" },
        segments: this.repeated,
      },
    ])
  }
}

export class BoundTraversal extends Traversal implements BoundLike {
  readonly phase = "remote" as const

  constructor(
    readonly variable: VariableId,
    readonly bindingName: string,
    readonly cpgqlName: string,
  ) {
    super([{ kind: "variable", name: cpgqlName }])
  }
}

export class BoundFlow implements BoundLike {
  readonly phase = "flow" as const

  constructor(
    readonly variable: VariableId,
    readonly bindingName: string,
    readonly cpgqlName: string,
  ) {}

  materializeGraph(name: string): MaterializationBuilder {
    return new MaterializationBuilder(name, this)
  }
}

export class FlowTraversal {
  constructor(
    readonly sink: Traversal,
    readonly source: BoundTraversal,
    readonly relation: "reachableBy" | "reachableByFlows",
    readonly filters: readonly FlowFilterAst[] = [],
  ) {}

  where(predicate: (flow: FlowRef) => Traversal | FlowPredicate): FlowTraversal {
    return this.filter("Where", predicate)
  }

  whereNot(predicate: (flow: FlowRef) => Traversal | FlowPredicate): FlowTraversal {
    return this.filter("WhereNot", predicate)
  }

  private filter(
    tag: "Where" | "WhereNot",
    predicate: (flow: FlowRef) => Traversal | FlowPredicate,
  ): FlowTraversal {
    const result = predicate(new FlowRef())
    const cpgql = result instanceof Traversal ? emitTraversal(result.segments) : result.cpgql
    return new FlowTraversal(this.sink, this.source, this.relation, [
      ...this.filters,
      { _tag: tag, cpgql },
    ])
  }

  as(name: string): Effect.Effect<BoundFlow, never, CpgProgramBuilder> {
    return CpgProgramBuilder.pipe(
      Effect.map((builder) => builder.bindFlow(name, this) as BoundFlow),
    )
  }
}

export class FlowPredicate {
  constructor(readonly cpgql: string) {}
}

export class FlowElementsRef extends Traversal {
  constructor() {
    super([{ kind: "variable", name: "flow.elements" }])
  }

  intersects(bound: BoundLike): FlowPredicate {
    return new FlowPredicate(`flow.elements.exists(element => ${bound.cpgqlName}.l.contains(element))`)
  }
}

export class FlowRef {
  readonly elements = new FlowElementsRef()
}

export class MaterializationBuilder {
  readonly includes: GraphIncludeAst[] = []

  constructor(
    readonly name: string,
    readonly root: Traversal | BoundTraversal | BoundFlow,
  ) {}

  includingPath(): this {
    this.includes.push({ _tag: "Path" })
    return this
  }

  including(value: BoundLike | ((node: Traversal) => Traversal)): this {
    if (typeof value === "function") {
      this.includes.push({
        _tag: "Traversal",
        cpgql: emitTraversal(value(new Traversal([{ kind: "variable", name: "node" }])).segments),
      })
    } else {
      this.includes.push({
        _tag: "Traversal",
        cpgqlName: value.cpgqlName,
        phase: value.phase,
        variable: value.variable,
      })
    }
    return this
  }

  includingNearest(value: BoundLike): this {
    this.includes.push({
      _tag: "Nearest",
      cpgqlName: value.cpgqlName,
      phase: value.phase,
      variable: value.variable,
    })
    return this
  }

  includingMissing(value: BoundLike): this {
    this.includes.push({
      _tag: "Missing",
      cpgqlName: value.cpgqlName,
      phase: value.phase,
      variable: value.variable,
    })
    return this
  }

  as(name: string): Effect.Effect<MaterializedGraphRefShape, never, CpgProgramBuilder> {
    return CpgProgramBuilder.pipe(
      Effect.map(
        (builder) =>
          builder.bindMaterializedGraph(name, this) as MaterializedGraphRefShape,
      ),
    )
  }

  [Symbol.iterator](): Effect.EffectGenerator<
    Effect.Effect<MaterializedGraphRefShape, never, CpgProgramBuilder>
  > {
    return this.as(this.name)[Symbol.iterator]()
  }
}

export const addStepGetters = <const Name extends string>(
  names: readonly Name[],
): void => {
  for (const step of names) {
    if (Object.hasOwn(Traversal.prototype, step)) {continue}
    Object.defineProperty(Traversal.prototype, step, {
      configurable: true,
      get(this: Traversal) {
        return new Traversal([...this.segments, { kind: "step", name: step }])
      },
    })
  }
}

export const addPropertyFilterMethods = <const Name extends string>(
  methods: Record<Name, string>,
): void => {
  for (const [methodName, propertyName] of Object.entries(methods) as Array<
    [Name, string]
  >) {
    if (Object.hasOwn(Traversal.prototype, methodName)) {continue}
    Object.defineProperty(Traversal.prototype, methodName, {
      configurable: true,
      value(this: Traversal, value: FilterValue) {
        return new Traversal([
          ...this.segments,
          { kind: "propertyFilter", property: propertyName, value },
        ])
      },
    })
  }
}

addStepGetters(stepNames)

export const starter = (name: string): Traversal =>
  new Traversal([{ kind: "starter", name }])
