import { emitSelect } from "../../core/emitCpgql.js";
import { Query } from "../../core/Query.js";
import type { Property } from "./property.js";
import { selectionSchema } from "./select.js";
import type { Selection, SelectionResult } from "./select.js";
import type { TraversalSegment } from "./traversalAst.js";

export type {
  FilterValue,
  RepeatModifier,
  TraversalSegment,
} from "./traversalAst.js";

type PropertyFilterValue<A> =
  Exclude<A, null | readonly unknown[]> extends infer Value
    ? Value extends string
      ? Value | RegExp
      : Value extends number | boolean
        ? Value
        : never
    : never;

export class Traversal {
  constructor(readonly segments: readonly TraversalSegment[]) {}

  private step(name: string): Traversal {
    return new Traversal([...this.segments, { kind: "step", name }]);
  }

  get argument(): Traversal {
    return this.step("argument");
  }

  get ast(): Traversal {
    return this.step("ast");
  }

  get astParent(): Traversal {
    return this.step("astParent");
  }

  get call(): Traversal {
    return this.step("call");
  }

  get controlledBy(): Traversal {
    return this.step("controlledBy");
  }

  get isCall(): Traversal {
    return this.step("isCall");
  }

  get method(): Traversal {
    return this.step("method");
  }

  get parameter(): Traversal {
    return this.step("parameter");
  }

  name(value: string | RegExp): Traversal {
    return new Traversal([
      ...this.segments,
      { kind: "filter", name: "name", value },
    ]);
  }

  fullName(value: string | RegExp): Traversal {
    return new Traversal([
      ...this.segments,
      { kind: "filter", name: "fullName", value },
    ]);
  }

  prop<A>(property: Property<A>, value: PropertyFilterValue<A>): Traversal {
    return new Traversal([
      ...this.segments,
      { kind: "propertyFilter", property: property.cpgql, value },
    ]);
  }

  whereRaw(predicate: string): Traversal {
    return new Traversal([...this.segments, { kind: "whereRaw", predicate }]);
  }

  where(predicate: (node: Traversal) => Traversal): Traversal {
    const result = predicate(new Traversal([{ kind: "variable", name: "_" }]));
    return new Traversal([
      ...this.segments,
      {
        kind: "where",
        negated: false,
        segments: result.segments,
      },
    ]);
  }

  whereNot(predicate: (node: Traversal) => Traversal): Traversal {
    const result = predicate(new Traversal([{ kind: "variable", name: "_" }]));
    return new Traversal([
      ...this.segments,
      {
        kind: "where",
        negated: true,
        segments: result.segments,
      },
    ]);
  }

  repeat(step: (node: Traversal) => Traversal): RepeatTraversalBuilder {
    return new RepeatTraversalBuilder(
      this,
      step(new Traversal([{ kind: "variable", name: "_" }])).segments,
    );
  }

  rawStep(cpgql: string): Traversal {
    return new Traversal([...this.segments, { cpgql, kind: "rawStep" }]);
  }

  get dedup(): Traversal {
    return new Traversal([
      ...this.segments,
      { kind: "operation", name: "dedup" },
    ]);
  }

  take(count: number): Traversal {
    return new Traversal([
      ...this.segments,
      { kind: "operation", name: "take", value: count },
    ]);
  }

  select<const S extends Selection>(
    selection: S,
  ): Query<ReadonlyArray<SelectionResult<S>>> {
    return new Query(
      emitSelect(this.segments, selection),
      selectionSchema(selection),
      {
        segments: this.segments,
        selection,
      },
    );
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
          segments: predicate(new Traversal([{ kind: "variable", name: "_" }]))
            .segments,
        },
        segments: this.repeated,
      },
    ]);
  }

  maxDepth(depth: number): Traversal {
    return new Traversal([
      ...this.traversal.segments,
      {
        kind: "repeat",
        modifier: { depth, kind: "maxDepth" },
        segments: this.repeated,
      },
    ]);
  }
}

export const starter = (name: string): Traversal =>
  new Traversal([{ kind: "starter", name }]);
