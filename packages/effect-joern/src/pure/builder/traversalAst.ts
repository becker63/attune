/**
 * Scalar literal accepted by a traversal property filter.
 *
 * @remarks
 *   Regular expressions retain pattern semantics while other values emit as
 *   escaped Scala literals.
 */
export type FilterValue = string | number | boolean | RegExp;

/**
 * Closed syntax tree understood by the deterministic CPGQL emitter.
 *
 * @remarks
 *   Builder methods append these data-only segments. Keeping raw CPGQL isolated
 *   in explicit variants lets the ordinary path remain typed and inspectable.
 */
export type TraversalSegment =
  | {
      /** Begins a traversal from a named CPG collection. */
      readonly kind: "starter";
      /** Joern starter name. */
      readonly name: string;
    }
  | {
      /** Refers to a lambda-local traversal variable. */
      readonly kind: "variable";
      /** Variable emitted into CPGQL. */
      readonly name: string;
    }
  | {
      /** Appends a named traversal step. */
      readonly kind: "step";
      /** Joern step name. */
      readonly name: string;
    }
  | {
      /** Filters one property by a typed scalar. */
      readonly kind: "propertyFilter";
      /** Joern property step. */
      readonly property: string;
      /** Scalar compared by the property step. */
      readonly value: FilterValue;
    }
  | {
      /** Applies a caller-authored where predicate. */
      readonly kind: "whereRaw";
      /** Exact predicate expression. */
      readonly predicate: string;
    }
  | {
      /** Applies a nested positive or negative traversal predicate. */
      readonly kind: "where";
      /** Selects `whereNot` when true. */
      readonly negated: boolean;
      /** Nested predicate traversal. */
      readonly segments: readonly TraversalSegment[];
    }
  | {
      /** Repeats a nested traversal. */
      readonly kind: "repeat";
      /** Traversal repeated from each source node. */
      readonly segments: readonly TraversalSegment[];
      /** Optional termination or depth bound. */
      readonly modifier?: RepeatModifier;
    }
  | {
      /** Appends an explicit raw CPGQL step. */
      readonly kind: "rawStep";
      /** Caller-authored step text. */
      readonly cpgql: string;
    }
  | {
      /** Applies a terminal traversal operation. */
      readonly kind: "operation";
      /** Supported terminal operation. */
      readonly name: "dedup" | "take";
      /** Item bound used by `take`. */
      readonly value?: number;
    }
  | {
      /** Filters a canonical name-bearing step. */
      readonly kind: "filter";
      /** Name property selected for filtering. */
      readonly name: "name" | "fullName";
      /** Literal or regular-expression filter. */
      readonly value: string | RegExp;
    };

/**
 * Bound applied to a repeated traversal.
 *
 * @remarks
 *   An `until` traversal expresses a semantic stop condition; `maxDepth`
 *   provides a mechanical upper bound.
 */
export type RepeatModifier =
  | {
      /** Stops once a nested predicate succeeds. */
      readonly kind: "until";
      /** Predicate evaluated after each repetition. */
      readonly segments: readonly TraversalSegment[];
    }
  | {
      /** Stops after a fixed traversal depth. */
      readonly kind: "maxDepth";
      /** Maximum number of repeated steps. */
      readonly depth: number;
    };
