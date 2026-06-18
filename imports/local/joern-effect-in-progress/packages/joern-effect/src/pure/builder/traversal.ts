import { Effect } from "effect"
import { Query } from "../../edge/runtime/Query.js"
import { emitSelect } from "../../edge/runtime/emitCpgql.js"
import { BoundTraversal, CpgProgramBuilder, FlowTraversal, MaterializationBuilder } from '../program/CpgProgram.js';
import type { BoundLike } from '../program/CpgProgram.js';
import { selectionSchema } from './select.js';
import type { Selection, SelectionResult } from './select.js';
import type { Property } from "./property.js"

export type FilterValue =
  | string
  | number
  | boolean
  | RegExp
  | null
  | readonly (string | number | boolean | null)[]

export type TraversalSegment =
  | { readonly kind: "starter"; readonly name: string }
  | { readonly kind: "variable"; readonly name: string }
  | { readonly kind: "step"; readonly name: string }
  | { readonly kind: "propertyFilter"; readonly property: string; readonly value: FilterValue }
  | { readonly kind: "whereRaw"; readonly predicate: string }
  | { readonly kind: "where"; readonly negated: boolean; readonly segments: readonly TraversalSegment[] }
  | { readonly kind: "repeat"; readonly segments: readonly TraversalSegment[]; readonly modifier?: RepeatModifier }
  | { readonly kind: "rawStep"; readonly cpgql: string }
  | { readonly kind: "operation"; readonly name: "dedup" | "take"; readonly value?: number }
  | {
      readonly kind: "filter"
      readonly name: "name" | "fullName"
      readonly value: string | RegExp
    }

export type RepeatModifier =
  | { readonly kind: "until"; readonly segments: readonly TraversalSegment[] }
  | { readonly kind: "maxDepth"; readonly depth: number }

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

type StepName = (typeof stepNames)[number]

export class Traversal {
  constructor(readonly segments: readonly TraversalSegment[]) {}

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
      Effect.map((builder) => builder.bindTraversal(name, this)),
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

export interface Traversal extends Record<StepName, Traversal> {}

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
