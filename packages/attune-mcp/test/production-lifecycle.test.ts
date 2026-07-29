import { mkdir } from "node:fs/promises";
import * as Path from "node:path";

import { Effect } from "effect";

import { type InvocationId, type RepositoryMaterializeInput } from "../src/contract/schemas.js";
import { makeInvestigationService } from "../src/investigation/service.js";
import { makeMcpHandlers } from "../src/server/handlers.js";
import type { AttuneOperationResult } from "../src/tools/registry.js";
import {
  FIXTURE_INVESTIGATION_ID as investigationId,
  FIXTURE_SNAPSHOT as snapshot,
  fixtureReceiptBase,
  fixtureRuntimeConfig,
  withTemporaryDirectory,
  writeCanonicalJson,
} from "./fixtures.js";

const invocationId = "materialize-restart" as InvocationId;

describe("production-composed lifecycle", () => {
  it("replays a successful materialization through fresh service and MCP instances", async () => {
    await withTemporaryDirectory("attune-production-lifecycle-", async (home) => {
      const runtime = fixtureRuntimeConfig(home);
      const input = {
        invocationId,
        investigationId,
        remote: "/fixture/repository",
        revision: "main",
        references: [],
      } satisfies RepositoryMaterializeInput;
      const receipt = {
        ...fixtureReceiptBase(input, "repository", "materialize", {
          investigationId,
          toolchainDigest: runtime.toolchainDigest,
        }),
        status: "succeeded",
        snapshotId: snapshot,
      } as const;
      const result = {
        investigationId,
        requestedRevision: input.revision,
        resolvedCommit: snapshot,
        branch: `attune/${investigationId}`,
        receipt,
      } satisfies AttuneOperationResult<"repository_materialize">;
      const directory = Path.join(home, "bootstrap", "repository_materialize", invocationId);

      await mkdir(directory, { recursive: true });
      await Promise.all([
        writeCanonicalJson(Path.join(directory, "request.json"), input),
        writeCanonicalJson(Path.join(directory, "references.json"), input.references),
        writeCanonicalJson(Path.join(directory, "allocation.json"), {
          investigationId,
        }),
        writeCanonicalJson(Path.join(directory, "result.json"), result),
        writeCanonicalJson(Path.join(directory, "receipt.json"), receipt),
      ]);

      const firstHandlers = makeMcpHandlers(makeInvestigationService(runtime));
      expect(await Effect.runPromise(firstHandlers.repository_materialize(input))).toEqual(result);

      // Reconstruct the whole production service graph to model another process.
      // The exact terminal result remains recoverable without invoking AgentFS.
      const restartedHandlers = makeMcpHandlers(makeInvestigationService(runtime));
      expect(await Effect.runPromise(restartedHandlers.repository_materialize(input))).toEqual(result);
    });
  });
});
