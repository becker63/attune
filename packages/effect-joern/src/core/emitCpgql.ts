import type { Selection } from "../pure/builder/select.js";
import type {
  FilterValue,
  TraversalSegment,
} from "../pure/builder/traversalAst.js";

/**
 * Escapes a JavaScript string for a Scala string literal.
 *
 * @remarks
 *   Backslashes are escaped before quotes and control characters, preventing a
 *   caller value from changing the surrounding generated expression.
 * @param value - Untrusted literal content.
 * @returns Content safe to place between Scala double quotes.
 */
export const escapeScalaString = (value: string): string =>
  value
    .replaceAll("\\", "\\\\")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\t", "\\t");

/**
 * Converts a string or JavaScript regular expression to Joern regex syntax.
 *
 * @remarks
 *   Only flags understood by Joern's inline regex form are retained.
 * @param pattern - Literal pattern or regular expression.
 * @returns Joern-compatible pattern text with supported inline flags.
 */
export const patternToJoernRegex = (pattern: string | RegExp): string => {
  if (typeof pattern === "string") return pattern;

  const flags = pattern.flags
    .split("")
    .filter((flag) => "ims".includes(flag))
    .join("");
  return flags.length > 0 ? `(?${flags})${pattern.source}` : pattern.source;
};

/**
 * Emits one traversal filter value as CPGQL.
 *
 * @param value - Typed filter value to encode.
 * @returns CPGQL literal text.
 */
function emitValue(value: FilterValue): string {
  if (value instanceof RegExp) {
    return `"${escapeScalaString(patternToJoernRegex(value))}"`;
  }
  if (typeof value === "string") {
    return `"${escapeScalaString(value)}"`;
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return String(value);
}

/**
 * Emits a traversal nested inside a Joern lambda.
 *
 * @param segments - Nested traversal segments.
 * @param parameter - Lambda parameter used for a leading `_` variable.
 * @returns CPGQL traversal text.
 */
function emitLambdaTraversal(
  segments: readonly TraversalSegment[],
  parameter: string = "_",
): string {
  const [first, ...rest] = segments;
  if (first?.kind === "variable" && first.name === "_") {
    return `${parameter}${rest.map(emitSegment).join("")}`;
  }
  return emitTraversal(segments);
}

/**
 * Emits an optional repeat bound.
 *
 * @param modifier - Until or maximum-depth bound.
 * @returns CPGQL suffix for the repeat operation.
 */
function emitRepeatModifier(
  modifier: Extract<TraversalSegment, { readonly kind: "repeat" }>["modifier"],
): string {
  if (!modifier) {
    return "";
  }
  switch (modifier.kind) {
    case "until":
      return `(_.until(${emitLambdaTraversal(modifier.segments)}))`;
    case "maxDepth":
      return `(_.maxDepth(${modifier.depth}))`;
  }
}

/**
 * Emits one normalized traversal segment.
 *
 * @param segment - Segment selected by the pure query builder.
 * @returns CPGQL for that segment.
 */
function emitSegment(segment: TraversalSegment): string {
  switch (segment.kind) {
    case "starter":
      return `cpg.${segment.name}`;
    case "variable":
      return segment.name;
    case "step":
      return `.${segment.name}`;
    case "filter":
      return `.${segment.name}("${escapeScalaString(patternToJoernRegex(segment.value))}")`;
    case "propertyFilter":
      return `.${segment.property}(${emitValue(segment.value)})`;
    case "whereRaw":
      return `.where(${segment.predicate})`;
    case "where":
      return `.${segment.negated ? "whereNot" : "where"}(${emitLambdaTraversal(segment.segments)})`;
    case "repeat":
      return `.repeat(${emitLambdaTraversal(segment.segments)})${emitRepeatModifier(segment.modifier)}`;
    case "rawStep":
      return segment.cpgql.startsWith(".")
        ? segment.cpgql
        : `.${segment.cpgql}`;
    case "operation":
      return segment.name === "take"
        ? `.take(${segment.value ?? 0})`
        : ".dedup";
  }
}

/**
 * Emits a complete ordered traversal.
 *
 * @remarks
 *   Segment rendering is deterministic so the same typed traversal has stable
 *   CPGQL bytes for tests, diagnostics, and transport.
 * @param segments - Normalized traversal program.
 * @returns Complete CPGQL traversal text.
 */
export function emitTraversal(segments: readonly TraversalSegment[]): string {
  return segments.map(emitSegment).join("");
}

/**
 * Emits a traversal whose selected properties become a JSON object.
 *
 * @remarks
 *   Property-owned imports and expressions remain correlated with their aliases
 *   before the result is serialized through Joern's `toJson`.
 * @param segments - Traversal that selects each source node.
 * @param selection - Alias-to-property selection contract.
 * @returns Complete CPGQL including required imports.
 */
export const emitSelect = (
  segments: readonly TraversalSegment[],
  selection: Selection,
): string => {
  const imports = [
    ...new Set(
      Object.values(selection).flatMap(
        (property) => property.selectImports ?? [],
      ),
    ),
  ];
  const entries = Object.entries(selection)
    .map(
      ([alias, property]) =>
        `    "${escapeScalaString(alias)}" -> ${
          property.selectCpgql?.({ node: "n", segments }) ??
          `n.${property.cpgql}`
        }`,
    )
    .join(",\n");

  const query = `${emitTraversal(segments)}
  .map(n => Map(
${entries}
  ))
  .toJson`;
  return imports.length > 0 ? `${imports.join("\n")}\n${query}` : query;
};
