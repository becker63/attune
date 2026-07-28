import { readFile } from "node:fs/promises";
import { isDeepStrictEqual } from "node:util";

import type {
  ApiManifest,
  DocumentationDiagnostic,
  DocumentationPolicy,
  SourceSpan,
} from "./model.ts";

type JsonObject = Readonly<Record<string, unknown>>;

const object = (value: unknown): JsonObject | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : undefined;

const kindOf = (value: unknown): string => {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
};

const resolveReference = (
  root: JsonObject,
  reference: string,
): JsonObject | undefined => {
  if (!reference.startsWith("#/")) return undefined;
  let current: unknown = root;
  for (const encoded of reference.slice(2).split("/")) {
    const key = encoded.replaceAll("~1", "/").replaceAll("~0", "~");
    const record = object(current);
    if (record === undefined || !(key in record)) return undefined;
    current = record[key];
  }
  return object(current);
};

const schemaIssues = (
  value: unknown,
  schema: JsonObject,
  root: JsonObject,
  path: string,
): readonly string[] => {
  if (typeof schema.$ref === "string") {
    const resolved = resolveReference(root, schema.$ref);
    return resolved === undefined
      ? [`${path} has unresolved schema reference ${schema.$ref}.`]
      : schemaIssues(value, resolved, root, path);
  }
  const issues: string[] = [];
  if (
    typeof schema.type === "string" &&
    !(
      kindOf(value) === schema.type ||
      (schema.type === "number" && kindOf(value) === "integer")
    )
  ) {
    return [`${path} must be ${schema.type}; received ${kindOf(value)}.`];
  }
  if ("const" in schema && !isDeepStrictEqual(value, schema.const)) {
    issues.push(`${path} must equal the schema constant.`);
  }
  if (
    Array.isArray(schema.enum) &&
    !schema.enum.some((candidate) => isDeepStrictEqual(candidate, value))
  ) {
    issues.push(`${path} is not an allowed value.`);
  }
  if (typeof value === "string") {
    if (
      typeof schema.minLength === "number" &&
      value.length < schema.minLength
    ) {
      issues.push(`${path} is shorter than ${schema.minLength}.`);
    }
    if (
      typeof schema.pattern === "string" &&
      !new RegExp(schema.pattern, "u").test(value)
    ) {
      issues.push(`${path} does not match ${schema.pattern}.`);
    }
    if (schema.format === "uri") {
      try {
        new URL(value);
      } catch {
        issues.push(`${path} must be an absolute URI.`);
      }
    }
  }
  if (typeof value === "number" && typeof schema.minimum === "number") {
    if (value < schema.minimum) issues.push(`${path} is below the minimum.`);
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) {
      issues.push(`${path} has too few items.`);
    }
    if (
      schema.uniqueItems === true &&
      new Set(value.map((item) => JSON.stringify(item))).size !== value.length
    ) {
      issues.push(`${path} has duplicate items.`);
    }
    const itemSchema = object(schema.items);
    if (itemSchema !== undefined) {
      value.forEach((item, index) =>
        issues.push(
          ...schemaIssues(item, itemSchema, root, `${path}[${index}]`),
        ),
      );
    }
  }
  const record = object(value);
  if (record !== undefined) {
    const properties = object(schema.properties) ?? {};
    if (Array.isArray(schema.required)) {
      for (const required of schema.required) {
        if (typeof required === "string" && !(required in record)) {
          issues.push(`${path}.${required} is required.`);
        }
      }
    }
    if (schema.additionalProperties === false) {
      for (const key of Object.keys(record)) {
        if (!(key in properties)) {
          issues.push(`${path}.${key} is not allowed.`);
        }
      }
    }
    for (const [key, child] of Object.entries(properties)) {
      const childSchema = object(child);
      if (key in record && childSchema !== undefined) {
        issues.push(
          ...schemaIssues(record[key], childSchema, root, `${path}.${key}`),
        );
      }
    }
  }
  return issues;
};

export const assertApiManifestSchema = async (
  manifest: unknown,
  schemaPath: string,
): Promise<void> => {
  const schema = object(JSON.parse(await readFile(schemaPath, "utf8")));
  if (schema === undefined) throw new Error(`Invalid schema: ${schemaPath}`);
  const issues = schemaIssues(manifest, schema, schema, "$");
  if (issues.length > 0) {
    throw new Error(`API manifest schema failed:\n${issues.join("\n")}`);
  }
};

export const readDocumentationPolicy = async (
  path: string,
): Promise<DocumentationPolicy> =>
  JSON.parse(await readFile(path, "utf8")) as DocumentationPolicy;

const documented = (summary: string, remarks: string): boolean =>
  summary.trim().length > 0 || remarks.trim().length > 0;

const validSpan = (span: SourceSpan | undefined): boolean =>
  span !== undefined &&
  span.start >= 0 &&
  span.end > span.start &&
  span.line >= 1 &&
  span.endLine >= span.line &&
  /^[a-f0-9]{64}$/u.test(span.digest);

export const auditManifest = (
  manifest: ApiManifest,
  policy: DocumentationPolicy,
): readonly DocumentationDiagnostic[] => {
  const diagnostics: DocumentationDiagnostic[] = [];
  const add = (
    code: DocumentationDiagnostic["code"],
    symbolId: string,
    message: string,
  ) => diagnostics.push({ code, severity: "error", symbolId, message });

  if (
    policy.publicNames !== undefined &&
    !isDeepStrictEqual(
      manifest.symbols.map((symbol) => symbol.exportName),
      policy.publicNames,
    )
  ) {
    add(
      "missing-documentation",
      "package",
      `Root exports must be ${policy.publicNames.join(", ")} in source order.`,
    );
  }
  if (!documented(manifest.package.documentation.summary, "")) {
    add("missing-documentation", "package", "Package TSDoc is required.");
  }
  for (const rule of policy.requiredDocumentation) {
    const matches = manifest.symbols.filter((symbol) =>
      new RegExp(rule.exportNamePattern, "u").test(symbol.exportName),
    );
    if (matches.length < rule.minMatches) {
      add(
        "missing-documentation",
        `policy:${rule.name}`,
        `${rule.name} matched ${matches.length}; expected ${rule.minMatches}. ${rule.rationale}`,
      );
    }
  }
  const known = new Set(
    manifest.symbols.flatMap((symbol) => [symbol.id, symbol.exportName]),
  );
  const allowed = new Set(
    policy.allowedRelationTargets.map((target) => target.toLowerCase()),
  );
  for (const symbol of manifest.symbols) {
    if (
      !documented(symbol.documentation.summary, symbol.documentation.remarks)
    ) {
      add(
        "missing-documentation",
        symbol.id,
        `${symbol.exportName} needs source TSDoc.`,
      );
    }
    if (!validSpan(symbol.provenance.declaration)) {
      add(
        "missing-provenance",
        symbol.id,
        "Declaration provenance is invalid.",
      );
    }
    if (symbol.pageExample.principal !== symbol.exportName) {
      add(
        "missing-example",
        symbol.id,
        "The symbol page example must identify its own export.",
      );
    }
    for (const member of symbol.members) {
      if (
        !documented(member.documentation.summary, member.documentation.remarks)
      ) {
        add(
          "missing-documentation",
          member.id,
          `${symbol.exportName}.${member.name} needs source TSDoc.`,
        );
      }
      if (member.pageExample.principal !== member.name) {
        add(
          "missing-example",
          member.id,
          "The member page example must identify its own member.",
        );
      }
    }
    for (const relation of [
      ...symbol.relations,
      ...symbol.members.flatMap((member) => member.relations),
    ]) {
      const target = relation.target.replaceAll("`", "");
      if (
        !known.has(target) &&
        !known.has(`${manifest.package.name}#${target}`) &&
        !allowed.has(target.toLowerCase())
      ) {
        add(
          "invalid-relation",
          symbol.id,
          `${relation.kind} references unknown target ${relation.target}.`,
        );
      }
    }
  }
  return diagnostics;
};
