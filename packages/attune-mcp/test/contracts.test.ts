import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { Schema } from "effect";
import { Tool } from "effect/unstable/ai";

import {
  generateContractBundle,
  stringifyContractBundle,
} from "../src/contract/bundle.js";
import {
  ArtifactUri,
  FreeFormReferences,
  InvestigationId,
  InvocationId,
  RepositoryRelativePath,
} from "../src/contract/schemas.js";
import { AttuneToolkit } from "../src/tools/registry.js";

type JsonObject = { readonly [key: string]: unknown };
type ContractBundle = JsonObject & {
  readonly $defs: JsonObject;
  readonly "x-attune": {
    readonly resources: JsonObject;
    readonly tools: JsonObject;
  };
};

const bundle = (): ContractBundle =>
  generateContractBundle() as unknown as ContractBundle;

const isRecord = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const record = (value: unknown): JsonObject => {
  if (!isRecord(value)) throw new TypeError("expected JSON object");
  return value as JsonObject;
};

const localTarget = (contract: ContractBundle, reference: unknown): unknown => {
  const prefix = "#/$defs/";
  const label = String(reference);
  const name =
    typeof reference === "string" && reference.startsWith(prefix)
      ? reference.slice(prefix.length)
      : "";
  if (name === "" || name.includes("/"))
    throw new TypeError(`invalid local definition reference ${label}`);
  const target = contract.$defs[name];
  if (target === undefined)
    throw new TypeError(`unresolved local definition reference ${label}`);
  return target;
};

const contractFile = (name: string): string =>
  fileURLToPath(new URL(`../../../contracts/${name}`, import.meta.url));

const normalizeCompatibility = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeCompatibility);
  if (!isRecord(value)) return value;
  const normalized = Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "description")
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, item]) => [key, normalizeCompatibility(item)]),
  );
  if (!Array.isArray(normalized.allOf)) return normalized;
  const fragments = normalized.allOf.filter(
    (item) => !isRecord(item) || Object.keys(item).length > 0,
  );
  if (
    fragments.every(
      (item) =>
        isRecord(item) &&
        !("$ref" in item) &&
        !("anyOf" in item) &&
        !("oneOf" in item),
    )
  ) {
    delete normalized.allOf;
    for (const fragment of fragments) Object.assign(normalized, fragment);
  } else {
    normalized.allOf = fragments;
  }
  return normalized;
};

const expectedTools = [
  ["repository_materialize", "RepositoryMaterialize"],
  ["repository_checkpoint", "RepositoryCheckpoint"],
  ["joern_query", "JoernQuery"],
  ["maude_run", "MaudeRun"],
  ["property_run", "PropertyRun"],
  ["ast_grep_run", "AstGrepRun"],
  ["artifact_promote", "ArtifactPromote"],
  ["investigation_finalize", "InvestigationFinalize"],
] as const;
const expectedResources = ["Artifact", "Contracts", "Investigation", "Receipt"];

describe("frozen capability ABI", () => {
  it("keeps the built root declaration at exactly six concepts", async () => {
    const path = fileURLToPath(new URL("../dist/index.d.mts", import.meta.url));
    const declaration = await readFile(path, "utf8");
    expect(declaration.match(/^export /gmu)).toHaveLength(1);
    const list = declaration.match(/^export \{ ([^}]*) \};$/mu)?.[1] ?? "";
    const names = list
      .split(",")
      .map((name) => name.trim().replace(/^type /u, ""));
    expect(names.sort().join(",")).toBe(
      "Attune,AttuneReceipt,AttuneToolFailure,AttuneToolkit,Investigation,InvestigationLifecycleError",
    );
  });

  it("publishes exactly eight mechanical tools", () => {
    expect(Object.keys(AttuneToolkit.tools)).toEqual(
      expectedTools.map(([name]) => name),
    );
    expect(JSON.stringify(generateContractBundle())).not.toContain(
      "joern_reindex",
    );
  });

  it("keeps identities and paths narrow", () => {
    const valid = [
      [InvestigationId, "01K00000000000000000000000"],
      [InvocationId, "activegraph:event-1"],
      [RepositoryRelativePath, "rules/a.yml"],
    ] as const;
    for (const [schema, value] of valid)
      expect(Schema.decodeUnknownSync(schema)(value)).toBe(value);
    const invalid = [
      [RepositoryRelativePath, "../outside", /repository-relative/u],
      [
        ArtifactUri,
        "attune://investigations/01K00000000000000000000000/artifacts/maude/call-1/../secret",
        /artifact URI/u,
      ],
    ] as const;
    for (const [schema, value, message] of invalid)
      expect(() => Schema.decodeUnknownSync(schema)(value)).toThrow(message);
  });

  it("accepts opaque unknown references without an ontology", () => {
    const references = Schema.decodeUnknownSync(FreeFormReferences)([
      {
        ref: "activegraph://fork/unknown-object",
        note: "The agent decides what this means.",
      },
      { ref: "human:gap-left-intentionally-unmodeled" },
    ]);
    expect(references).toHaveLength(2);
    expect(JSON.stringify(references)).not.toContain("role");
  });

  it("matches the checked-in deterministic contract bytes", async () => {
    const [checkedIn, digest] = await Promise.all([
      readFile(contractFile("attune-tools.schema.json"), "utf8"),
      readFile(contractFile("attune-tools.sha256"), "utf8"),
    ]);
    expect(checkedIn).toBe(stringifyContractBundle());
    expect(digest.trim()).toBe(
      createHash("sha256").update(checkedIn).digest("hex"),
    );
  });

  it("exports one self-contained Draft 2020-12 compound schema", () => {
    const contract = bundle();
    expect(contract.$schema).toBe(
      "https://json-schema.org/draft/2020-12/schema",
    );
    expect(contract.$ref).toBe("#/$defs/AttuneContractModelCatalog");
    expect(contract).not.toHaveProperty("definitions");
    expect(contract).not.toHaveProperty("dialect");

    const visit = (value: unknown): void => {
      if (Array.isArray(value)) {
        for (const item of value) visit(item);
        return;
      }
      if (!isRecord(value)) return;
      for (const [key, item] of Object.entries(value)) {
        if (key === "$ref") localTarget(contract, item);
        visit(item);
      }
    };
    visit(contract);
  });

  it("maps every public tool and resource to stable definitions", () => {
    const contract = bundle();
    const tools = contract["x-attune"].tools;
    expect(Object.keys(tools)).toEqual(
      expectedTools.map(([name]) => name).sort(),
    );
    for (const [name, model] of expectedTools) {
      const mapping = record(tools[name]);
      expect(record(mapping.input).$ref).toBe(`#/$defs/${model}Input`);
      expect(record(mapping.result).$ref).toBe(`#/$defs/${model}Result`);
      expect(record(mapping.failure).$ref).toBe("#/$defs/AttuneToolFailure");
    }

    expect(Object.keys(contract["x-attune"].resources)).toEqual(
      expectedResources.map((name) => name.toLowerCase()),
    );
    for (const name of expectedResources)
      expect(contract.$defs).toHaveProperty(`${name}ResourceParameters`);
  });

  it("retains the explicitly unconstrained Joern summary", () => {
    const contract = bundle();
    const mapping = record(contract["x-attune"].tools.joern_query);
    const result = record(localTarget(contract, record(mapping.result).$ref));
    if (!Array.isArray(result.anyOf)) {
      throw new TypeError("Joern result is not a union");
    }
    const properties = record(record(result.anyOf[0]).properties);
    expect(properties.summary).toEqual({});
  });

  it("places portable refinements where standard generators retain them", () => {
    const contract = bundle();
    const properties = record(
      record(contract.$defs.ArtifactPromoteInput).properties,
    );
    expect(record(properties.expectedSnapshot)).toMatchObject({
      maxLength: 64,
      minLength: 1,
      pattern: "^(?:[0-9a-f]{40}|[0-9a-f]{64})$",
      type: "string",
    });
    expect(record(properties.references)).toMatchObject({
      maxItems: 256,
      type: "array",
    });
    expect(JSON.stringify(contract)).not.toContain('"allOf"');
  });

  it("keeps frozen tool inputs compatible with live Effect MCP inputs", () => {
    const contract = bundle();
    for (const [name, tool] of Object.entries(AttuneToolkit.tools)) {
      const mapping = record(contract["x-attune"].tools[name]);
      const inputReference = record(mapping.input).$ref;
      const frozenInput = localTarget(contract, inputReference);
      const liveInput = Tool.getJsonSchema(tool);
      const liveDefinitions = record(liveInput.$defs);
      const liveRoot = localTarget(
        {
          ...contract,
          $defs: liveDefinitions,
        },
        liveInput.$ref,
      );
      expect(normalizeCompatibility(frozenInput)).toEqual(
        normalizeCompatibility(liveRoot),
      );
      for (const [definitionName, definition] of Object.entries(
        liveDefinitions,
      )) {
        expect(normalizeCompatibility(contract.$defs[definitionName])).toEqual(
          normalizeCompatibility(definition),
        );
      }
    }
  });
});
