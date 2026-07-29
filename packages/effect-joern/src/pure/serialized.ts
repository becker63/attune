import { Traversal } from "./builder/traversal.js";
import type {
  FilterValue,
  RepeatModifier,
  TraversalSegment,
} from "./builder/traversalAst.js";
import { cpg } from "./generated/cpg.js";
import { prop } from "./generated/prop.js";
import { generatedSchema } from "./generated/schema.js";

/** JSON primitive that can become one typed Joern filter value. */
type JsonScalar = string | number | boolean;

/**
 * Serializable literal or regular-expression pattern.
 *
 * @remarks
 *   A string remains a literal filter. The object form makes regular-expression
 *   intent explicit and admits only the `i`, `m`, and `s` flags supported by
 *   the Joern emitter.
 */
export type SerializedPattern =
  | string
  | { readonly regex: string; readonly flags?: string };

/**
 * JSON-safe scalar accepted by a serialized property filter.
 *
 * @remarks
 *   The tagged pattern form preserves regular-expression intent across the JSON
 *   boundary; numbers and booleans remain exact scalar comparisons.
 */
export type SerializedValue = JsonScalar | SerializedPattern;

/**
 * Versioned JSON syntax for one immutable traversal operation.
 *
 * @remarks
 *   The union mirrors the data-only {@link Traversal} segment language without
 *   admitting executable callbacks. Starter, step, and property names are
 *   validated against the pinned generated schema before CPGQL is emitted.
 */
export type SerializedTraversalSegment =
  | { readonly kind: "starter"; readonly name: string }
  | { readonly kind: "variable"; readonly name: "_" }
  | { readonly kind: "step"; readonly name: string }
  | {
      readonly kind: "propertyFilter";
      readonly property: string;
      readonly value: SerializedValue;
    }
  | { readonly kind: "whereRaw"; readonly predicate: string }
  | {
      readonly kind: "where";
      readonly negated: boolean;
      readonly segments: readonly SerializedTraversalSegment[];
    }
  | {
      readonly kind: "repeat";
      readonly segments: readonly SerializedTraversalSegment[];
      readonly modifier?: SerializedRepeatModifier;
    }
  | { readonly kind: "rawStep"; readonly cpgql: string }
  | {
      readonly kind: "operation";
      readonly name: "dedup" | "take";
      readonly value?: number;
    }
  | {
      readonly kind: "filter";
      readonly name: "name" | "fullName";
      readonly value: SerializedPattern;
    };

/**
 * Serializable termination policy for a repeated traversal.
 *
 * @remarks
 *   `until` embeds another validated nested traversal, while `maxDepth`
 *   supplies a positive mechanical bound. An absent modifier is preserved for
 *   wire compatibility and normalized by the compiler.
 */
export type SerializedRepeatModifier =
  | {
      readonly kind: "until";
      readonly segments: readonly SerializedTraversalSegment[];
    }
  | { readonly kind: "maxDepth"; readonly depth: number };

/**
 * Versioned JSON query accepted by consumers of the generated DSL.
 *
 * @remarks
 *   Both schema fields must equal the checked-in {@link generatedSchema}
 *   identity. That gate prevents a serialized traversal from silently compiling
 *   against starters or properties different from those its producer observed.
 */
export interface SerializedQuery {
  /** Serialized-query protocol version understood by this compiler. */
  readonly version: 1;
  /** Generated CPG schema version expected by the producer. */
  readonly cpgSchemaVersion: typeof generatedSchema.version;
  /** Content hash identifying the exact generated CPG schema. */
  readonly cpgSchemaHash: typeof generatedSchema.hash;
  /** Ordered traversal operations beginning at one generated starter. */
  readonly segments: readonly SerializedTraversalSegment[];
  /** Output aliases mapped to generated property names. */
  readonly select: Readonly<Record<string, string>>;
}

/** Generated starter names accepted at the traversal root. */
const STARTERS = new Set(Object.keys(cpg));

/** Generated property names accepted by filters and selections. */
const PROPERTIES = new Set(Object.keys(prop));

/** Curated relation and filter steps supported by the serialized boundary. */
const STEPS = new Set([
  "argument",
  "ast",
  "astParent",
  "call",
  "controlledBy",
  "isCall",
  "method",
  "parameter",
]);

/**
 * Stops compilation with a consistently prefixed validation failure.
 *
 * @param message - Caller-actionable reason the serialized query is invalid.
 * @returns This function never returns because it throws a {@link TypeError}.
 */
const invalid = (message: string): never => {
  throw new TypeError(`invalid generated Joern DSL: ${message}`);
};

/**
 * Requires a nonempty string at a serialized text boundary.
 *
 * @param value - Candidate text from the serialized query.
 * @param label - Field description included in a validation failure.
 * @returns The original nonempty text.
 */
const text = (value: string, label: string): string =>
  value.length > 0 ? value : invalid(`${label} is empty`);

/**
 * Restores one serialized filter pattern.
 *
 * @param value - Literal text or explicit regular-expression record.
 * @param label - Field description included in a validation failure.
 * @returns Literal text or a regular expression with validated flags.
 */
const pattern = (value: SerializedPattern, label: string): string | RegExp => {
  if (typeof value === "string") return text(value, label);
  const flags = value.flags ?? "";
  if (!/^[ims]*$/u.test(flags) || new Set(flags).size !== flags.length) {
    invalid(`${label} has unsupported regex flags`);
  }
  return new RegExp(text(value.regex, label), flags);
};

/**
 * Restores one JSON-safe scalar as a builder filter value.
 *
 * @param input - Serialized scalar or regular-expression record.
 * @param label - Field description used when validating a pattern.
 * @returns Filter value accepted by the traversal emitter.
 */
const value = (input: SerializedValue, label: string): FilterValue =>
  typeof input === "object" ? pattern(input, label) : input;

/**
 * Validates and restores an optional repeat modifier.
 *
 * @param input - Serialized semantic or mechanical repeat bound.
 * @returns A normalized repeat modifier, or `undefined` when none was supplied.
 */
const modifier = (
  input: SerializedRepeatModifier | undefined,
): RepeatModifier | undefined => {
  if (input === undefined) return undefined;
  if (input.kind === "maxDepth") {
    if (!Number.isSafeInteger(input.depth) || input.depth < 1) {
      invalid("repeat maxDepth must be a positive integer");
    }
    return input;
  }
  return { kind: "until", segments: segments(input.segments, true) };
};

/**
 * Validates serialized traversal operations and restores emitter segments.
 *
 * @remarks
 *   Top-level traversals must begin with a generated starter. Nested traversals
 *   instead begin with the synthetic `_` variable used by Joern lambdas. Every
 *   generated name is checked before it can reach CPGQL emission.
 * @param input - Serialized traversal operations in their requested order.
 * @param nested - Whether the operations belong to a nested Joern lambda.
 * @returns Normalized segments accepted by the pure traversal emitter.
 */
const segments = (
  input: readonly SerializedTraversalSegment[],
  nested: boolean = false,
): readonly TraversalSegment[] => {
  if (input.length === 0) invalid("traversal has no segments");
  return input.map((segment, index) => {
    switch (segment.kind) {
      case "starter":
        if (nested || index !== 0 || !STARTERS.has(segment.name)) {
          invalid(`unknown or misplaced starter ${segment.name}`);
        }
        return segment;
      case "variable":
        if (!nested || index !== 0)
          invalid("variable is only valid at nested traversal start");
        return segment;
      case "step":
        return STEPS.has(segment.name)
          ? segment
          : invalid(`unknown generated traversal step ${segment.name}`);
      case "propertyFilter":
        if (!PROPERTIES.has(segment.property)) {
          invalid(`unknown generated property ${segment.property}`);
        }
        return {
          ...segment,
          property: prop[segment.property as keyof typeof prop].cpgql,
          value: value(segment.value, segment.property),
        };
      case "filter":
        return { ...segment, value: pattern(segment.value, segment.name) };
      case "whereRaw":
        return {
          ...segment,
          predicate: text(segment.predicate, "raw predicate"),
        };
      case "rawStep":
        return { ...segment, cpgql: text(segment.cpgql, "raw step") };
      case "where":
        return { ...segment, segments: segments(segment.segments, true) };
      case "repeat": {
        const repeated = segments(segment.segments, true);
        const repeatModifier = modifier(segment.modifier);
        return repeatModifier === undefined
          ? { kind: "repeat", segments: repeated }
          : { kind: "repeat", segments: repeated, modifier: repeatModifier };
      }
      case "operation":
        if (
          segment.name === "take" &&
          (!Number.isSafeInteger(segment.value) || (segment.value ?? 0) < 0)
        ) {
          invalid("take requires a non-negative integer");
        }
        return segment;
    }
  });
};

/**
 * Validates a serialized query against the pinned generated surface.
 *
 * @remarks
 *   Compilation first authenticates the generated schema identity, then
 *   validates every traversal and selected property before delegating to the
 *   same typed {@link Traversal} emitter used by local callers. Invalid input is
 *   rejected before any query crosses the Joern transport boundary.
 * @param input - Complete versioned query received from the JSON boundary.
 * @returns Deterministic CPGQL for the validated traversal and selection.
 * @throws A `TypeError` when schema identity, traversal syntax, bounds, or
 *   selected properties are invalid.
 */
export const compileSerializedQuery = (input: SerializedQuery): string => {
  if (
    input.version !== 1 ||
    input.cpgSchemaVersion !== generatedSchema.version ||
    input.cpgSchemaHash !== generatedSchema.hash
  ) {
    invalid("schema version or hash does not match the pinned generated CPG");
  }
  const selection = Object.fromEntries(
    Object.entries(input.select).map(([alias, property]) => {
      if (!text(alias, "selection alias") || !PROPERTIES.has(property)) {
        invalid(`unknown generated selection property ${property}`);
      }
      return [alias, prop[property as keyof typeof prop]];
    }),
  );
  if (Object.keys(selection).length === 0)
    invalid("selection has no properties");
  return new Traversal(segments(input.segments)).select(selection).cpgql;
};
