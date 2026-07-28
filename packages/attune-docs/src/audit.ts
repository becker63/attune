import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";

import type {
  ApiManifest,
  DocumentationDiagnostic,
  DocumentationPolicy,
} from "./model.ts";

type JsonObject = Readonly<Record<string, unknown>>;

const asObject = (value: unknown): JsonObject | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;

const valueType = (value: unknown): string => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
};

const resolveLocalReference = (
  root: JsonObject,
  reference: string,
): JsonObject | undefined => {
  if (!reference.startsWith("#/")) return undefined;
  let current: unknown = root;
  for (const encodedSegment of reference.slice(2).split("/")) {
    const segment = encodedSegment.replaceAll("~1", "/").replaceAll("~0", "~");
    const object = asObject(current);
    if (object === undefined || !(segment in object)) return undefined;
    current = object[segment];
  }
  return asObject(current);
};

const schemaIssues = (
  value: unknown,
  schema: JsonObject,
  root: JsonObject,
  path: string,
): readonly string[] => {
  const issues: string[] = [];
  if (typeof schema.$ref === "string") {
    const referenced = resolveLocalReference(root, schema.$ref);
    if (referenced === undefined) {
      return [`${path} uses unsupported schema reference ${schema.$ref}.`];
    }
    issues.push(...schemaIssues(value, referenced, root, path));
  }

  if (typeof schema.type === "string") {
    const actual = valueType(value);
    const matches =
      schema.type === "number"
        ? actual === "number" || actual === "integer"
        : actual === schema.type;
    if (!matches) {
      return [...issues, `${path} must be ${schema.type}; received ${actual}.`];
    }
  }
  if ("const" in schema && !isDeepStrictEqual(value, schema.const)) {
    issues.push(`${path} must equal the schema constant.`);
  }
  if (
    Array.isArray(schema.enum) &&
    !schema.enum.some((candidate) => isDeepStrictEqual(value, candidate))
  ) {
    issues.push(`${path} is not one of the allowed values.`);
  }

  if (typeof value === "string") {
    if (
      typeof schema.minLength === "number" &&
      value.length < schema.minLength
    ) {
      issues.push(
        `${path} must contain at least ${schema.minLength} characters.`,
      );
    }
    if (
      typeof schema.pattern === "string" &&
      !new RegExp(schema.pattern, "u").test(value)
    ) {
      issues.push(`${path} does not match ${schema.pattern}.`);
    }
    if (schema.format === "uri") {
      try {
        const parsed = new URL(value);
        if (parsed.protocol.length === 0) throw new Error("missing URI scheme");
      } catch {
        issues.push(`${path} must be an absolute URI.`);
      }
    }
  }

  if (typeof value === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum) {
      issues.push(`${path} must be at least ${schema.minimum}.`);
    }
  }

  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      issues.push(`${path} must contain at least ${schema.minItems} items.`);
    }
    if (
      schema.uniqueItems === true &&
      value.some((item, index) =>
        value
          .slice(index + 1)
          .some((candidate) => isDeepStrictEqual(item, candidate)),
      )
    ) {
      issues.push(`${path} must not contain duplicate items.`);
    }
    const itemSchema = asObject(schema.items);
    if (itemSchema !== undefined) {
      for (const [index, item] of value.entries()) {
        issues.push(
          ...schemaIssues(item, itemSchema, root, `${path}[${index}]`),
        );
      }
    }
  }

  const object = asObject(value);
  if (object !== undefined) {
    const properties = asObject(schema.properties) ?? {};
    if (Array.isArray(schema.required)) {
      for (const required of schema.required) {
        if (typeof required === "string" && !(required in object)) {
          issues.push(`${path}.${required} is required.`);
        }
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(object)) {
        if (!(key in properties)) {
          issues.push(`${path}.${key} is not an allowed property.`);
        }
      }
    }
    for (const [key, propertySchemaValue] of Object.entries(properties)) {
      if (!(key in object)) continue;
      const propertySchema = asObject(propertySchemaValue);
      if (propertySchema !== undefined) {
        issues.push(
          ...schemaIssues(object[key], propertySchema, root, `${path}.${key}`),
        );
      }
    }
  }

  return issues;
};

/**
 * Validate an emitted manifest against the checked-in JSON Schema.
 *
 * The schema deliberately uses a small auditable Draft 2020-12 subset:
 * local references, structural types, constants/enums, string constraints,
 * array cardinality/uniqueness, numeric minimums, and closed objects.
 */
export const assertApiManifestSchema = async (
  manifest: unknown,
  schemaPath: string,
): Promise<void> => {
  const schema = asObject(JSON.parse(await readFile(schemaPath, "utf8")));
  if (schema === undefined) {
    throw new Error(`API manifest schema is not an object: ${schemaPath}`);
  }
  const issues = schemaIssues(manifest, schema, schema, "$");
  if (issues.length > 0) {
    throw new Error(
      `Generated API manifest failed ${schemaPath}:\n${issues.join("\n")}`,
    );
  }
};

const normalizeRelationTarget = (target: string): string =>
  target
    .replaceAll("`", "")
    .replace(/^\{@link\s+/u, "")
    .replace(/\}$/u, "")
    .split(/[|\s]/u)[0]!
    .trim();

export const readDocumentationPolicy = async (
  path: string,
): Promise<DocumentationPolicy> =>
  JSON.parse(await readFile(path, "utf8")) as DocumentationPolicy;

const minimumMatches = (rule: object, name: string): number => {
  const configured = (rule as { readonly minMatches?: unknown }).minMatches;
  if (
    typeof configured !== "number" ||
    !Number.isSafeInteger(configured) ||
    configured < 1
  ) {
    throw new Error(
      `Documentation policy rule ${name} must declare a positive integer minMatches.`,
    );
  }
  return configured;
};

export const auditManifest = (
  manifest: ApiManifest,
  policy: DocumentationPolicy,
): readonly DocumentationDiagnostic[] => {
  const diagnostics: DocumentationDiagnostic[] = [];
  const symbolNames = new Set(
    manifest.symbols.flatMap((symbol) => [symbol.id, symbol.exportName]),
  );
  const allowedTargets = new Set(
    policy.allowedRelationTargets.map((target) => target.toLowerCase()),
  );

  for (const rule of policy.requiredDocumentation) {
    const pattern = new RegExp(rule.exportNamePattern, "u");
    const matching = manifest.symbols.filter((candidate) =>
      pattern.test(candidate.exportName),
    );
    const minimum = minimumMatches(rule, rule.name);
    if (matching.length < minimum) {
      diagnostics.push({
        code: "missing-documentation",
        severity: "error",
        symbolId: `policy:${rule.name}`,
        message: `Documentation policy “${rule.name}” requires at least ${minimum} matching export${minimum === 1 ? "" : "s"}, but found ${matching.length}. ${rule.rationale}`,
      });
    }
    for (const symbol of matching) {
      if (symbol.summary.length === 0 && symbol.remarks.length === 0) {
        diagnostics.push({
          code: "missing-documentation",
          severity: "error",
          symbolId: symbol.id,
          message: `${symbol.exportName} matches policy “${rule.name}” but has no TSDoc. ${rule.rationale}`,
        });
      }
    }
  }

  for (const rule of policy.requiredRelations) {
    const pattern = new RegExp(rule.exportNamePattern, "u");
    const matching = manifest.symbols.filter((candidate) =>
      pattern.test(candidate.exportName),
    );
    const minimum = minimumMatches(rule, rule.name);
    if (matching.length < minimum) {
      diagnostics.push({
        code: "missing-relation",
        severity: "error",
        symbolId: `policy:${rule.name}`,
        message: `Lifecycle policy “${rule.name}” requires at least ${minimum} matching export${minimum === 1 ? "" : "s"}, but found ${matching.length}. ${rule.rationale}`,
      });
    }
    for (const symbol of matching) {
      if (
        !symbol.relations.some(
          (relation) =>
            relation.source === "descriptor" &&
            rule.anyOf.includes(relation.kind),
        )
      ) {
        diagnostics.push({
          code: "missing-relation",
          severity: "error",
          symbolId: symbol.id,
          message: `${symbol.exportName} matches policy “${rule.name}” but its descriptor declares none of ${rule.anyOf.join(", ")}. TSDoc relation tags are explanatory and do not satisfy this rule. ${rule.rationale}`,
        });
      }
    }
  }

  for (const symbol of manifest.symbols) {
    for (const relation of symbol.relations) {
      const target = normalizeRelationTarget(relation.target);
      if (
        !symbolNames.has(target) &&
        !symbolNames.has(`attune-mcp#${target}`) &&
        !allowedTargets.has(target.toLowerCase())
      ) {
        diagnostics.push({
          code: "invalid-relation",
          severity: "error",
          symbolId: symbol.id,
          message: `${relation.kind} references unknown target “${relation.target}”.`,
        });
      }
    }
  }

  return diagnostics.sort((left, right) =>
    `${left.symbolId}:${left.code}`.localeCompare(
      `${right.symbolId}:${right.code}`,
    ),
  );
};
