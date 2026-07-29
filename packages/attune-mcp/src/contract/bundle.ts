import { Schema } from "effect";

import { AttuneToolkit, type AttuneOperationName } from "../tools/registry.js";
import { AttuneToolFailure, InvestigationId, InvocationId, ToolName } from "./schemas.js";

/** Closed JSON value used while assembling the contract bundle. */ type JsonValue =
  | null
  | boolean
  | number
  | string
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };
/** JSON object with deterministic string keys. */ type JsonObject = {
  /**
   * Maps a property name to its JSON value.
   *
   * @param key - Property name selected by the caller.
   * @returns The JSON value stored under that key.
   */
  readonly [key: string]: JsonValue;
};

/**
 * Narrows an unknown value to a non-array JSON object. @param value - Candidate value. @returns Whether it is
 * a JSON object.
 */
const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Recursively sorts object keys and rejects non-JSON input. @param value - Candidate contract value. @returns
 * A deterministic JSON value.
 */
const sorted = (value: unknown): JsonValue => {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "string"
  ) {
    return value;
  }
  if (Array.isArray(value)) return value.map(sorted);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, entry]) => [key, sorted(entry)]),
    );
  }
  throw new TypeError(`contract contains non-JSON ${typeof value}`);
};

/**
 * Flattens portable reference-free `allOf` fragments. @param value - JSON Schema fragment. @returns A
 * generator-friendly equivalent fragment.
 */
const flattenPortableAllOf = (value: JsonValue): JsonValue => {
  if (Array.isArray(value)) return value.map(flattenPortableAllOf);
  if (!isJsonObject(value)) return value;

  const normalized = Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, flattenPortableAllOf(entry)]),
  );
  const allOf = normalized.allOf;
  if (
    !Array.isArray(allOf) ||
    !allOf.every(
      (entry) => isJsonObject(entry) && !("$ref" in entry) && !("anyOf" in entry) && !("oneOf" in entry),
    )
  ) {
    return normalized;
  }

  const merged: Record<string, JsonValue> = { ...normalized };
  delete merged.allOf;
  for (const fragment of allOf) {
    if (!isJsonObject(fragment)) return normalized;
    for (const [key, entry] of Object.entries(fragment)) {
      const existing = merged[key];
      if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(entry)) {
        return normalized;
      }
      merged[key] = entry;
    }
  }
  return merged;
};

/**
 * Converts one Effect schema to a validated JSON Schema document. @param schema - Effect schema to convert.
 *
 * @returns Root schema and definitions.
 */
const effectDocument = (
  schema: Schema.Top,
): { readonly definitions: JsonObject; readonly schema: JsonObject } => {
  const value = sorted(flattenPortableAllOf(sorted(Schema.toJsonSchemaDocument(schema))));
  if (!isJsonObject(value) || !isJsonObject(value.definitions) || !isJsonObject(value.schema)) {
    throw new TypeError("Effect emitted an invalid JSON Schema document");
  }
  return { definitions: value.definitions, schema: value.schema };
};

/**
 * Creates a local definition reference. @param name - Definition name. @returns Its JSON Schema reference.
 */
const definitionRef = (name: string): { readonly $ref: string } => ({
  $ref: `#/$defs/${name}`,
});

/** Frozen MCP resource contracts included beside tool schemas. */ const resourceContracts = {
  artifact: {
    name: "ArtifactResourceParameters",
    uriTemplate: "attune://investigations/{investigationId}/artifacts/{tool}/{invocationId}/{+path}",
    schema: Schema.Struct({
      investigationId: InvestigationId,
      tool: ToolName,
      invocationId: InvocationId,
      path: Schema.String,
    }),
  },
  contracts: {
    name: "ContractsResourceParameters",
    uriTemplate: "attune://contracts",
    schema: Schema.Record(Schema.String, Schema.Never),
  },
  investigation: {
    name: "InvestigationResourceParameters",
    uriTemplate: "attune://investigations/{investigationId}",
    schema: Schema.Struct({ investigationId: InvestigationId }),
  },
  receipt: {
    name: "ReceiptResourceParameters",
    uriTemplate: "attune://investigations/{investigationId}/receipts/{tool}/{invocationId}",
    schema: Schema.Struct({
      investigationId: InvestigationId,
      tool: ToolName,
      invocationId: InvocationId,
    }),
  },
} as const;

/** Stable schema prefixes for the closed operation registry. */ const toolContractNames = {
  artifact_promote: "ArtifactPromote",
  ast_grep_run: "AstGrepRun",
  investigation_finalize: "InvestigationFinalize",
  joern_query: "JoernQuery",
  maude_run: "MaudeRun",
  property_run: "PropertyRun",
  repository_checkpoint: "RepositoryCheckpoint",
  repository_materialize: "RepositoryMaterialize",
} as const satisfies Record<AttuneOperationName, string>;

/** Root definition that makes every contract model reachable. */ const MODEL_CATALOG =
  "AttuneContractModelCatalog";

/**
 * Generates the closed MCP contract bundle. @remarks Tool and resource schemas are normalized, deduplicated,
 * and linked from one deterministic catalog.
 *
 * @returns The complete Draft 2020-12 JSON value.
 */
export const generateContractBundle = (): JsonValue => {
  const definitions: Record<string, JsonValue> = {};

  const mergeDefinition = (name: string, schema: JsonValue): void => {
    const normalized = sorted(schema);
    const existing = definitions[name];
    if (existing !== undefined && JSON.stringify(existing) !== JSON.stringify(normalized)) {
      throw new TypeError(`conflicting JSON Schema definition ${name}`);
    }
    definitions[name] = normalized;
  };

  const importSchema = (schema: Schema.Top, rootName: string): JsonObject => {
    const generated = effectDocument(schema);
    for (const [name, definition] of Object.entries(generated.definitions)) {
      mergeDefinition(name, definition);
    }

    if (generated.schema.$ref === `#/$defs/${rootName}` && definitions[rootName] !== undefined) {
      return definitionRef(rootName);
    }

    mergeDefinition(rootName, generated.schema);
    return definitionRef(rootName);
  };

  const failure = importSchema(AttuneToolFailure, "AttuneToolFailure");
  const tools: Record<string, JsonValue> = {};
  for (const name of Object.keys(AttuneToolkit.tools) as AttuneOperationName[]) {
    const tool = AttuneToolkit.tools[name];
    const model = toolContractNames[name];
    tools[name] = {
      failure,
      input: importSchema(tool.parametersSchema, `${model}Input`),
      result: importSchema(tool.successSchema, `${model}Result`),
    };
  }

  const resources: Record<string, JsonValue> = {};
  for (const [name, contract] of Object.entries(resourceContracts)) {
    resources[name] = {
      parameters: importSchema(contract.schema, contract.name),
      uriTemplate: contract.uriTemplate,
    };
  }

  mergeDefinition(MODEL_CATALOG, {
    anyOf: Object.keys(definitions).sort().map(definitionRef),
    title: "Attune MCP model catalog",
  });

  return sorted({
    $defs: definitions,
    $id: "https://attune.dev/contracts/attune-tools.schema.json",
    $ref: `#/$defs/${MODEL_CATALOG}`,
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "Attune MCP capability contract",
    "x-attune": {
      resources,
      schemaVersion: 1,
      tools,
    },
  });
};

/**
 * Serializes the generated contract bundle. @remarks Stable indentation and a trailing newline make byte
 * drift reviewable. @returns The deterministic JSON document.
 */
export const stringifyContractBundle = (): string =>
  `${JSON.stringify(generateContractBundle(), undefined, 2)}\n`;
