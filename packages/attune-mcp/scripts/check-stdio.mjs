import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const home = await mkdtemp(resolve(tmpdir(), "attune-stdio-"));
const installedExecutable = process.argv[2];
const childEnv = { ...process.env };
delete childEnv.FORCE_COLOR;
delete childEnv.NO_COLOR;
const child = spawn(
  installedExecutable ?? process.execPath,
  installedExecutable === undefined ? [resolve(root, "dist/main.mjs")] : [],
  {
    cwd: resolve(root, "../.."),
    env: {
      ...childEnv,
      ATTUNE_HOME: home,
      ATTUNE_CONTRACT_BUNDLE: resolve(
        root,
        "../../contracts/attune-tools.schema.json",
      ),
      ATTUNE_CONTRACT_DIGEST: resolve(
        root,
        "../../contracts/attune-tools.sha256",
      ),
    },
    shell: false,
    stdio: ["pipe", "pipe", "pipe"],
  },
);

const requests = [
  {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "attune-stdio-check", version: "0.0.0" },
    },
  },
  {
    jsonrpc: "2.0",
    method: "notifications/initialized",
    params: {},
  },
  { jsonrpc: "2.0", id: 2, method: "tools/list", params: {} },
  {
    jsonrpc: "2.0",
    id: 3,
    method: "resources/templates/list",
    params: {},
  },
  { jsonrpc: "2.0", id: 4, method: "resources/list", params: {} },
  {
    jsonrpc: "2.0",
    id: 6,
    method: "resources/read",
    params: { uri: "attune://contracts" },
  },
  {
    jsonrpc: "2.0",
    id: 5,
    method: "tools/call",
    params: {
      name: "repository_checkpoint",
      arguments: {
        investigationId: "01K00000000000000000000000",
        invocationId: "stdio-call-smoke",
        expectedSnapshot: "0000000000000000000000000000000000000000",
        references: [],
        policy: "require-clean",
      },
    },
  },
];

let output = "";
let diagnostics = "";
child.stdout.setEncoding("utf8");
child.stderr.setEncoding("utf8");
child.stdout.on("data", (chunk) => {
  output += chunk;
  if (Buffer.byteLength(output) > 8 * 1024 * 1024) child.kill("SIGKILL");
});
child.stderr.on("data", (chunk) => {
  diagnostics += chunk;
  if (Buffer.byteLength(diagnostics) > 8 * 1024 * 1024) child.kill("SIGKILL");
});
const closed = new Promise((resolvePromise, rejectPromise) => {
  child.once("error", rejectPromise);
  child.once("close", (code, signal) => resolvePromise({ code, signal }));
});
const waitForLines = async (count) => {
  const deadline = Date.now() + 10_000;
  while (output.split(/\r?\n/u).filter(Boolean).length < count) {
    if (Date.now() > deadline) throw new Error("stdio response timed out");
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 10));
  }
};

try {
  child.stdin.write(`${JSON.stringify(requests[0])}\n`);
  await waitForLines(1);
  child.stdin.write(
    `${requests
      .slice(1)
      .map((request) => JSON.stringify(request))
      .join("\n")}\n`,
  );
  await waitForLines(6);
  child.stdin.end();
  const exit = await closed;
  if (exit.code !== 0 || exit.signal !== null) {
    throw new Error(
      `server exited code=${String(exit.code)} signal=${String(exit.signal)}`,
    );
  }
  if (diagnostics !== "") {
    throw new Error(`stderr was not empty: ${diagnostics.slice(0, 512)}`);
  }
  const responses = output
    .split(/\r?\n/u)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const byId = new Map(responses.map((response) => [response.id, response]));
  const expectedTools = [
    "repository_materialize",
    "repository_checkpoint",
    "joern_query",
    "maude_run",
    "property_run",
    "ast_grep_run",
    "artifact_promote",
    "investigation_finalize",
  ];
  const tools = byId.get(2)?.result?.tools;
  if (
    !Array.isArray(tools) ||
    JSON.stringify(tools.map(({ name }) => name)) !==
      JSON.stringify(expectedTools)
  ) {
    throw new Error(`unexpected tools: ${JSON.stringify(tools)}`);
  }
  const expectedTemplates = [
    "attune://investigations/{investigationId}",
    "attune://investigations/{investigationId}/receipts/{tool}/{invocationId}",
    "attune://investigations/{investigationId}/artifacts/{tool}/{invocationId}/{+path}",
  ];
  const templates = byId.get(3)?.result?.resourceTemplates;
  if (
    !Array.isArray(templates) ||
    JSON.stringify(templates.map(({ uriTemplate }) => uriTemplate)) !==
      JSON.stringify(expectedTemplates)
  ) {
    throw new Error(`unexpected templates: ${JSON.stringify(templates)}`);
  }
  const resources = byId.get(4)?.result?.resources;
  if (
    !Array.isArray(resources) ||
    resources.length !== 1 ||
    resources[0]?.uri !== "attune://contracts"
  ) {
    throw new Error(`unexpected fixed resources: ${JSON.stringify(resources)}`);
  }
  const contractPath = resolve(
    root,
    "../../contracts/attune-tools.schema.json",
  );
  const contractBytes = await readFile(contractPath, "utf8");
  const expectedDigest = createHash("sha256")
    .update(contractBytes)
    .digest("hex");
  const contractText = byId.get(6)?.result?.contents?.[0]?.text;
  if (typeof contractText !== "string") {
    throw new Error(
      `unexpected contract resource: ${JSON.stringify(byId.get(6))}`,
    );
  }
  const served = JSON.parse(contractText);
  const frozen = JSON.parse(contractBytes);
  if (
    served.sha256 !== expectedDigest ||
    JSON.stringify(served.contract) !== JSON.stringify(frozen)
  ) {
    throw new Error("served contract or digest differs from checked-in bytes");
  }
  const canonical = (value) => {
    if (Array.isArray(value)) return value.map(canonical);
    if (value === null || typeof value !== "object") return value;
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, item]) => [key, canonical(item)]),
    );
  };
  const flattenPortableAllOf = (value) => {
    if (Array.isArray(value)) return value.map(flattenPortableAllOf);
    if (value === null || typeof value !== "object") return value;

    const normalized = Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        flattenPortableAllOf(item),
      ]),
    );
    const allOf = normalized.allOf;
    if (
      !Array.isArray(allOf) ||
      !allOf.every(
        (entry) =>
          entry !== null &&
          typeof entry === "object" &&
          !Array.isArray(entry) &&
          !("$ref" in entry) &&
          !("anyOf" in entry) &&
          !("oneOf" in entry),
      )
    ) {
      return normalized;
    }

    const merged = { ...normalized };
    delete merged.allOf;
    for (const fragment of allOf) {
      for (const [key, item] of Object.entries(fragment)) {
        if (merged[key] === undefined) {
          merged[key] = item;
        } else if (
          JSON.stringify(canonical(merged[key])) !==
          JSON.stringify(canonical(item))
        ) {
          return normalized;
        }
      }
    }
    return merged;
  };
  for (const liveTool of tools) {
    const mapping = frozen["x-attune"]?.tools?.[liveTool.name];
    const inputReference = mapping?.input?.$ref;
    if (
      typeof inputReference !== "string" ||
      liveTool.inputSchema?.$ref !== inputReference
    ) {
      throw new Error(`input root differs for ${liveTool.name}`);
    }
    for (const [name, definition] of Object.entries(
      liveTool.inputSchema?.$defs ?? {},
    )) {
      if (
        JSON.stringify(canonical(flattenPortableAllOf(definition))) !==
        JSON.stringify(canonical(frozen.$defs?.[name]))
      ) {
        throw new Error(
          `input definition differs for ${liveTool.name}:${name}`,
        );
      }
    }
  }
  const call = byId.get(5);
  if (
    call?.error !== undefined ||
    call?.result?.structuredContent?.code !== "UnknownInvestigation"
  ) {
    throw new Error(`unexpected tool call response: ${JSON.stringify(call)}`);
  }
  process.stderr.write("attune-mcp stdio contract passed\n");
} finally {
  child.kill("SIGKILL");
  await rm(home, { recursive: true, force: true });
}
