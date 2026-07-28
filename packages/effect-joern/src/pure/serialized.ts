import { Traversal } from "./builder/traversal.js";
import type {
  FilterValue,
  RepeatModifier,
  TraversalSegment,
} from "./builder/traversalAst.js";
import { cpg } from "./generated/cpg.js";
import { prop } from "./generated/prop.js";
import { generatedSchema } from "./generated/schema.js";

type JsonScalar = string | number | boolean;
export type SerializedPattern =
  | string
  | { readonly regex: string; readonly flags?: string };
export type SerializedValue = JsonScalar | SerializedPattern;

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

export type SerializedRepeatModifier =
  | {
      readonly kind: "until";
      readonly segments: readonly SerializedTraversalSegment[];
    }
  | { readonly kind: "maxDepth"; readonly depth: number };

/** JSON form accepted by consumers of the generated DSL. */
export interface SerializedQuery {
  readonly version: 1;
  readonly cpgSchemaVersion: typeof generatedSchema.version;
  readonly cpgSchemaHash: typeof generatedSchema.hash;
  readonly segments: readonly SerializedTraversalSegment[];
  readonly select: Readonly<Record<string, string>>;
}

const STARTERS = new Set(Object.keys(cpg));
const PROPERTIES = new Set(Object.keys(prop));
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

const invalid = (message: string): never => {
  throw new TypeError(`invalid generated Joern DSL: ${message}`);
};

const text = (value: string, label: string): string =>
  value.length > 0 ? value : invalid(`${label} is empty`);

const pattern = (value: SerializedPattern, label: string): string | RegExp => {
  if (typeof value === "string") return text(value, label);
  const flags = value.flags ?? "";
  if (!/^[ims]*$/u.test(flags) || new Set(flags).size !== flags.length) {
    invalid(`${label} has unsupported regex flags`);
  }
  return new RegExp(text(value.regex, label), flags);
};

const value = (input: SerializedValue, label: string): FilterValue =>
  typeof input === "object" ? pattern(input, label) : input;

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

const segments = (
  input: readonly SerializedTraversalSegment[],
  nested = false,
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

/** Validates JSON data against the pinned generated surface and emits CPGQL. */
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
