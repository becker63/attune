import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import {
  ArtifactUri,
  AttuneToolkit,
  FreeFormReferences,
  generateContractBundle,
  InvestigationId,
  InvocationId,
  RepositoryRelativePath,
  stringifyContractBundle,
} from "attune-mcp";
import { Schema } from "effect";
import { Tool } from "effect/unstable/ai";

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

const record = (value: unknown): JsonObject => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("expected JSON object");
  }
  return value as JsonObject;
};

const localTarget = (contract: ContractBundle, reference: unknown): unknown => {
  if (typeof reference !== "string" || !reference.startsWith("#/$defs/")) {
    throw new TypeError(
      `invalid local definition reference ${String(reference)}`,
    );
  }
  const name = reference.slice("#/$defs/".length);
  if (name === "" || name.includes("/")) {
    throw new TypeError(`invalid local definition reference ${reference}`);
  }
  const target = contract.$defs[name];
  if (target === undefined) {
    throw new TypeError(`unresolved local definition reference ${reference}`);
  }
  return target;
};

const normalizeCompatibility = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(normalizeCompatibility);
  if (typeof value !== "object" || value === null) return value;
  const normalized = Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "description")
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, item]) => [key, normalizeCompatibility(item)]),
  );
  if (Array.isArray(normalized.allOf)) {
    const fragments = normalized.allOf.filter(
      (item) =>
        typeof item !== "object" ||
        item === null ||
        Array.isArray(item) ||
        Object.keys(item).length > 0,
    );
    if (
      fragments.every(
        (item) =>
          typeof item === "object" &&
          item !== null &&
          !Array.isArray(item) &&
          !("$ref" in item) &&
          !("anyOf" in item) &&
          !("oneOf" in item),
      )
    ) {
      delete normalized.allOf;
      for (const fragment of fragments) {
        Object.assign(normalized, fragment);
      }
    } else {
      normalized.allOf = fragments;
    }
  }
  return normalized;
};

describe("frozen capability ABI", () => {
  it("publishes exactly eight mechanical tools", () => {
    expect(Object.keys(AttuneToolkit.tools)).toEqual([
      "repository_materialize",
      "repository_checkpoint",
      "joern_query",
      "maude_run",
      "property_run",
      "ast_grep_run",
      "artifact_promote",
      "investigation_finalize",
    ]);
    expect(JSON.stringify(generateContractBundle())).not.toContain(
      "joern_reindex",
    );
  });

  it("keeps identities and paths narrow", () => {
    expect(
      Schema.decodeUnknownSync(InvestigationId)("01K00000000000000000000000"),
    ).toBe("01K00000000000000000000000");
    expect(Schema.decodeUnknownSync(InvocationId)("activegraph:event-1")).toBe(
      "activegraph:event-1",
    );
    expect(
      Schema.decodeUnknownSync(RepositoryRelativePath)("rules/a.yml"),
    ).toBe("rules/a.yml");
    expect(() =>
      Schema.decodeUnknownSync(RepositoryRelativePath)("../outside"),
    ).toThrow(/repository-relative/u);
    expect(() =>
      Schema.decodeUnknownSync(ArtifactUri)(
        "attune://investigations/01K00000000000000000000000/artifacts/maude/call-1/../secret",
      ),
    ).toThrow(/artifact URI/u);
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
    const contractUrl = new URL(
      "../../../contracts/attune-tools.schema.json",
      import.meta.url,
    );
    const digestUrl = new URL(
      "../../../contracts/attune-tools.sha256",
      import.meta.url,
    );
    const [checkedIn, digest] = await Promise.all([
      readFile(fileURLToPath(contractUrl), "utf8"),
      readFile(fileURLToPath(digestUrl), "utf8"),
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
      if (typeof value !== "object" || value === null) return;
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
    const expectedTools = {
      artifact_promote: ["ArtifactPromoteInput", "ArtifactPromoteResult"],
      ast_grep_run: ["AstGrepRunInput", "AstGrepRunResult"],
      investigation_finalize: [
        "InvestigationFinalizeInput",
        "InvestigationFinalizeResult",
      ],
      joern_query: ["JoernQueryInput", "JoernQueryResult"],
      maude_run: ["MaudeRunInput", "MaudeRunResult"],
      property_run: ["PropertyRunInput", "PropertyRunResult"],
      repository_checkpoint: [
        "RepositoryCheckpointInput",
        "RepositoryCheckpointResult",
      ],
      repository_materialize: [
        "RepositoryMaterializeInput",
        "RepositoryMaterializeResult",
      ],
    } as const;
    expect(Object.keys(tools)).toEqual(Object.keys(expectedTools));
    for (const [name, [input, result]] of Object.entries(expectedTools)) {
      const mapping = record(tools[name]);
      expect(record(mapping.input).$ref).toBe(`#/$defs/${input}`);
      expect(record(mapping.result).$ref).toBe(`#/$defs/${result}`);
      expect(record(mapping.failure).$ref).toBe("#/$defs/AttuneToolFailure");
    }

    expect(Object.keys(contract["x-attune"].resources)).toEqual([
      "artifact",
      "contracts",
      "investigation",
      "receipt",
    ]);
    expect(contract.$defs).toHaveProperty("ArtifactResourceParameters");
    expect(contract.$defs).toHaveProperty("ContractsResourceParameters");
    expect(contract.$defs).toHaveProperty("InvestigationResourceParameters");
    expect(contract.$defs).toHaveProperty("ReceiptResourceParameters");
  });

  it("retains the explicitly unconstrained Joern summary", () => {
    const contract = bundle();
    const mapping = record(contract["x-attune"].tools.joern_query);
    const result = record(localTarget(contract, record(mapping.result).$ref));
    if (!Array.isArray(result.anyOf)) {
      throw new TypeError("Joern result is not a union");
    }
    const success = record(result.anyOf[0]);
    const properties = record(success.properties);
    expect(properties.summary).toEqual({});
  });

  it("places portable refinements where standard generators retain them", () => {
    const contract = bundle();
    const input = record(contract.$defs.ArtifactPromoteInput);
    const properties = record(input.properties);
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
