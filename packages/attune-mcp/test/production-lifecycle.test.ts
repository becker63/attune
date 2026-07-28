import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as Path from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalJson,
  makeInvestigationService,
  makeMcpHandlers,
  sha256,
  type FullGitCommit,
  type InvestigationId,
  type InvocationId,
  type OperationResultOf,
  type RepositoryMaterializeInput,
  RepositoryMaterializeOperation,
  type RuntimeConfig,
} from "attune-mcp";
import { Effect } from "effect";

const investigationId = "01K00000000000000000000000" as InvestigationId;
const snapshot = "a".repeat(40) as FullGitCommit;
const invocationId = "materialize-restart" as InvocationId;
const timestamp = new Date(0).toISOString();

const config = (home: string): RuntimeConfig => ({
  home,
  agentFs: "agentfs",
  fusermount: "fusermount3",
  git: "git",
  node: process.execPath,
  joern: "joern",
  maude: "maude",
  astGrep: "ast-grep",
  flock: "flock",
  lockHolder: fileURLToPath(
    new URL("../dist/lock-holder.mjs", import.meta.url),
  ),
  propertyRunner: fileURLToPath(
    new URL("../dist/property-runner.mjs", import.meta.url),
  ),
  contractBundle: fileURLToPath(
    new URL("../../../contracts/attune-tools.schema.json", import.meta.url),
  ),
  contractDigest: fileURLToPath(
    new URL("../../../contracts/attune-tools.sha256", import.meta.url),
  ),
  toolchainDigest: sha256("production-lifecycle-test"),
  outputLimitBytes: 1024,
  inlineLimitBytes: 256,
});

describe("production-composed lifecycle", () => {
  let home: string;

  beforeEach(async () => {
    home = await mkdtemp(Path.join(tmpdir(), "attune-production-lifecycle-"));
  });

  afterEach(async () => {
    await rm(home, { recursive: true, force: true });
  });

  it("replays a successful materialization through fresh service and MCP instances", async () => {
    const runtime = config(home);
    const input = {
      invocationId,
      investigationId,
      remote: "/fixture/repository",
      revision: "main",
      references: [],
    } satisfies RepositoryMaterializeInput;
    const receipt = {
      schemaVersion: 1,
      invocationId,
      investigationId,
      tool: "repository",
      operation: "materialize",
      inputDigest: sha256(`${canonicalJson(input)}\n`),
      toolchainDigest: runtime.toolchainDigest,
      artifacts: [],
      startedAt: timestamp,
      completedAt: timestamp,
      status: "succeeded",
      snapshotId: snapshot,
    } as const;
    const result = {
      investigationId,
      requestedRevision: input.revision,
      resolvedCommit: snapshot,
      branch: `attune/${investigationId}`,
      receipt,
    } satisfies OperationResultOf<typeof RepositoryMaterializeOperation>;
    const directory = Path.join(
      home,
      "bootstrap",
      "repository_materialize",
      invocationId,
    );

    await mkdir(directory, { recursive: true });
    await Promise.all([
      writeFile(
        Path.join(directory, "request.json"),
        `${canonicalJson(input)}\n`,
      ),
      writeFile(
        Path.join(directory, "references.json"),
        `${canonicalJson(input.references)}\n`,
      ),
      writeFile(
        Path.join(directory, "allocation.json"),
        `${canonicalJson({ investigationId })}\n`,
      ),
      writeFile(
        Path.join(directory, "result.json"),
        `${canonicalJson(result)}\n`,
      ),
      writeFile(
        Path.join(directory, "receipt.json"),
        `${canonicalJson(receipt)}\n`,
      ),
    ]);

    const firstHandlers = makeMcpHandlers(makeInvestigationService(runtime));
    expect(
      await Effect.runPromise(firstHandlers.repositoryMaterialize(input)),
    ).toEqual(result);

    // Reconstruct the whole production service graph to model another process.
    // The exact terminal result remains recoverable without invoking AgentFS.
    const restartedHandlers = makeMcpHandlers(
      makeInvestigationService(runtime),
    );
    expect(
      await Effect.runPromise(restartedHandlers.repositoryMaterialize(input)),
    ).toEqual(result);
  });
});
