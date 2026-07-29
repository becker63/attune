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

/**
 * Scalar filter input permitted by one generated property result type.
 *
 * @remarks
 *   Nullable and collection branches are removed because one Joern property
 *   filter compares one scalar. String-valued properties additionally accept a
 *   regular expression while numeric and boolean properties retain their exact
 *   scalar kind.
 * @typeParam A - Result type decoded by the generated property.
 */
type PropertyFilterValue<A> =
  Exclude<A, null | readonly unknown[]> extends infer Value
    ? Value extends string
      ? Value | RegExp
      : Value extends number | boolean
        ? Value
        : never
    : never;

/**
 * Immutable description of a Joern traversal under construction.
 *
 * @remarks
 *   Each operation appends one data-only {@link TraversalSegment}; no query is
 *   sent until the caller hands the resulting {@link Query} to a Joern service.
 *   {@link Traversal.select} closes the builder by pairing emitted CPGQL with
 *   decoders for the selected properties.
 */
export class Traversal {
  /**
   * Creates a traversal from an ordered segment history.
   *
   * @remarks
   *   Builder operations preserve this history and return a new traversal, so
   *   branching from an earlier value cannot mutate another query.
   * @param segments - Normalized traversal operations in emission order.
   */
  constructor(readonly segments: readonly TraversalSegment[]) {}

  /**
   * Appends one generated Joern step.
   *
   * @param name - Canonical step name supplied by this module.
   * @returns A new traversal whose history ends with the step.
   */
  private step(name: string): Traversal {
    return new Traversal([...this.segments, { kind: "step", name }]);
  }

  /**
   * Traverses to arguments associated with the current nodes.
   *
   * @remarks
   *   The getter appends Joern's canonical `argument` step while preserving the
   *   prior traversal as an immutable value.
   * @returns A traversal ending at argument nodes.
   */
  get argument(): Traversal {
    return this.step("argument");
  }

  /**
   * Traverses the abstract-syntax-tree descendants of the current nodes.
   *
   * @remarks
   *   The generated step remains part of the inspectable segment history used
   *   for deterministic CPGQL emission.
   * @returns A traversal ending at AST descendants.
   */
  get ast(): Traversal {
    return this.step("ast");
  }

  /**
   * Traverses from each current node to its abstract-syntax-tree parent.
   *
   * @remarks
   *   This is the generated inverse boundary for callers that need to recover
   *   structural context without writing raw CPGQL.
   * @returns A traversal ending at AST parent nodes.
   */
  get astParent(): Traversal {
    return this.step("astParent");
  }

  /**
   * Traverses to calls associated with the current nodes.
   *
   * @remarks
   *   The operation records a typed `call` step and leaves execution to the
   *   eventual Joern query boundary.
   * @returns A traversal ending at call nodes.
   */
  get call(): Traversal {
    return this.step("call");
  }

  /**
   * Traverses to control dependencies for the current nodes.
   *
   * @remarks
   *   The resulting segment expresses Joern's `controlledBy` relation without
   *   interpreting or executing the control-flow query locally.
   * @returns A traversal ending at controlling nodes.
   */
  get controlledBy(): Traversal {
    return this.step("controlledBy");
  }

  /**
   * Restricts the current traversal to call nodes.
   *
   * @remarks
   *   Unlike {@link Traversal.call}, this appends Joern's `isCall` filter step
   *   and therefore keeps only matching nodes in the current traversal.
   * @returns A traversal restricted to call nodes.
   */
  get isCall(): Traversal {
    return this.step("isCall");
  }

  /**
   * Traverses to methods associated with the current nodes.
   *
   * @remarks
   *   The builder retains the `method` step as data so emission remains stable
   *   and inspectable before execution.
   * @returns A traversal ending at method nodes.
   */
  get method(): Traversal {
    return this.step("method");
  }

  /**
   * Traverses to parameters associated with the current nodes.
   *
   * @remarks
   *   The canonical step avoids a raw expression while preserving the existing
   *   traversal history.
   * @returns A traversal ending at parameter nodes.
   */
  get parameter(): Traversal {
    return this.step("parameter");
  }

  /**
   * Filters nodes by their short name.
   *
   * @remarks
   *   String values remain literal filters; regular expressions preserve
   *   pattern intent for the CPGQL emitter.
   * @param value - Literal name or JavaScript regular expression to match.
   * @returns A traversal with the name filter appended.
   */
  name(value: string | RegExp): Traversal {
    return new Traversal([
      ...this.segments,
      { kind: "filter", name: "name", value },
    ]);
  }

  /**
   * Filters nodes by their fully qualified name.
   *
   * @remarks
   *   The filter is retained as a typed segment so the emitter can escape
   *   literal strings and translate supported regular-expression flags.
   * @param value - Literal full name or JavaScript regular expression.
   * @returns A traversal with the full-name filter appended.
   */
  fullName(value: string | RegExp): Traversal {
    return new Traversal([
      ...this.segments,
      { kind: "filter", name: "fullName", value },
    ]);
  }

  /**
   * Filters nodes through one generated property definition.
   *
   * @remarks
   *   The property supplies the canonical Joern step while its decoded type
   *   restricts filters to one scalar comparison. Nullable and collection
   *   result shapes cannot be passed as filter values.
   * @typeParam A - Value decoded when the property is selected.
   * @param property - Generated property whose Joern step performs the filter.
   * @param value - Scalar value or supported pattern compared by that step.
   * @returns A traversal with the typed property filter appended.
   */
  prop<A>(property: Property<A>, value: PropertyFilterValue<A>): Traversal {
    return new Traversal([
      ...this.segments,
      { kind: "propertyFilter", property: property.cpgql, value },
    ]);
  }

  /**
   * Appends an advanced caller-authored Joern predicate.
   *
   * @remarks
   *   The predicate crosses the typed builder boundary unchanged. Prefer
   *   {@link Traversal.where} when the predicate can be expressed with typed
   *   traversal operations.
   * @param predicate - Exact CPGQL predicate placed inside `where`.
   * @returns A traversal carrying the raw predicate.
   */
  whereRaw(predicate: string): Traversal {
    return new Traversal([...this.segments, { kind: "whereRaw", predicate }]);
  }

  /**
   * Keeps nodes for which a nested traversal succeeds.
   *
   * @remarks
   *   The callback receives a fresh lambda-local traversal rooted at `_`. Only
   *   the callback's segment description is retained; the callback does not
   *   contact Joern.
   * @param predicate - Builder for the positive nested traversal.
   * @returns A traversal with a positive `where` segment appended.
   */
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

  /**
   * Keeps nodes for which a nested traversal does not succeed.
   *
   * @remarks
   *   As with {@link Traversal.where}, the callback only constructs immutable
   *   lambda segments. The stored negation is applied later during emission.
   * @param predicate - Builder for the nested traversal to negate.
   * @returns A traversal with a negative `where` segment appended.
   */
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

  /**
   * Describes a nested traversal that must be repeated under a bound.
   *
   * @remarks
   *   Repetition remains incomplete until the returned
   *   {@link RepeatTraversalBuilder} receives either a semantic `until`
   *   condition or a mechanical maximum depth.
   * @param step - Builder for the lambda-local traversal to repeat.
   * @returns A builder that requires the repeat termination policy.
   */
  repeat(step: (node: Traversal) => Traversal): RepeatTraversalBuilder {
    return new RepeatTraversalBuilder(
      this,
      step(new Traversal([{ kind: "variable", name: "_" }])).segments,
    );
  }

  /**
   * Appends an exact caller-authored CPGQL step.
   *
   * @remarks
   *   This escape hatch performs no schema validation or escaping. Prefer the
   *   generated steps when the required traversal is available there.
   * @param cpgql - Exact step text, with or without a leading period.
   * @returns A traversal carrying the raw step.
   */
  rawStep(cpgql: string): Traversal {
    return new Traversal([...this.segments, { cpgql, kind: "rawStep" }]);
  }

  /**
   * Removes duplicate nodes from the current traversal.
   *
   * @remarks
   *   Deduplication is recorded as an ordered terminal operation and does not
   *   mutate the traversal from which it was derived.
   * @returns A traversal with Joern's `dedup` operation appended.
   */
  get dedup(): Traversal {
    return new Traversal([
      ...this.segments,
      { kind: "operation", name: "dedup" },
    ]);
  }

  /**
   * Limits the traversal to at most a caller-selected number of nodes.
   *
   * @remarks
   *   The typed builder records the requested count directly. Callers decoding
   *   untrusted JSON should use the serialized-query compiler, which validates
   *   that its count is a non-negative integer.
   * @param count - Maximum number of nodes requested from Joern.
   * @returns A traversal with Joern's `take` operation appended.
   */
  take(count: number): Traversal {
    return new Traversal([
      ...this.segments,
      { kind: "operation", name: "take", value: count },
    ]);
  }

  /**
   * Finalizes the traversal with a typed property selection.
   *
   * @remarks
   *   The same generated property definitions drive both CPGQL emission and the
   *   runtime decoder, preserving the relationship between each alias and its
   *   decoded value.
   * @typeParam S - Alias-to-property selection that determines each result row.
   * @param selection - Generated properties to select under caller-owned
   *   aliases.
   * @returns A query whose decoder accepts an array of correlated result rows.
   */
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

/**
 * Pending repeated traversal together with its required termination policy.
 *
 * @remarks
 *   The builder prevents an unbounded repeat from becoming a {@link Traversal}:
 *   callers must choose either a semantic stop predicate or a maximum depth
 *   before they can continue the query.
 */
export class RepeatTraversalBuilder {
  /**
   * Captures a source traversal and the lambda-local segment to repeat.
   *
   * @remarks
   *   Construction stores data only; applying a modifier produces a new
   *   traversal without executing the repeated program.
   * @param traversal - Traversal to which the repeat operation will be
   *   appended.
   * @param repeated - Lambda-local segment history repeated by Joern.
   */
  constructor(
    private readonly traversal: Traversal,
    private readonly repeated: readonly TraversalSegment[],
  ) {}

  /**
   * Repeats until a nested traversal predicate succeeds.
   *
   * @remarks
   *   The predicate receives a fresh `_`-rooted traversal. Its segments become
   *   the semantic termination condition attached to the repeated program.
   * @param predicate - Builder for the repeat termination condition.
   * @returns The source traversal with a bounded repeat appended.
   */
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

  /**
   * Repeats no more than the requested traversal depth.
   *
   * @remarks
   *   The depth is retained as a mechanical bound for Joern. The typed builder
   *   does not validate the number; serialized callers are validated before the
   *   same segment reaches emission.
   * @param depth - Maximum number of repeat steps requested from Joern.
   * @returns The source traversal with the depth-bounded repeat appended.
   */
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

/**
 * Starts a traversal at one generated CPG collection.
 *
 * @remarks
 *   Generated `cpg` properties call this helper with schema-owned names, making
 *   the first segment an explicit and deterministic root for later operations.
 * @param name - Generated Joern starter name.
 * @returns A traversal containing only the starter segment.
 */
export const starter = (name: string): Traversal =>
  new Traversal([{ kind: "starter", name }]);
