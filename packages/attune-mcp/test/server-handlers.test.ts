import { Effect } from "effect";

import {
  AttuneToolFailure,
  type InvocationId,
  type RepositoryCheckpointInput,
} from "../src/contract/schemas.js";
import {
  makeInvestigationServiceFromHandlers,
  type InvestigationValidator,
} from "../src/investigation/service.js";
import { canonicalJson } from "../src/platform/core.js";
import { makeMcpHandlers } from "../src/server/handlers.js";
import type {
  AttuneOperationHandlers,
  AttuneOperationResult,
  AttuneTerminalLookups,
} from "../src/tools/registry.js";
import {
  FIXTURE_INVESTIGATION_ID as investigationId,
  FIXTURE_NEXT_SNAPSHOT as advancedSnapshot,
  FIXTURE_SNAPSHOT as initialSnapshot,
  fixtureManifest,
  fixtureReceiptBase,
} from "./fixtures.js";

const manifest = fixtureManifest();

const terminalResult = (
  input: RepositoryCheckpointInput,
): AttuneOperationResult<"repository_checkpoint"> => ({
  snapshotId: advancedSnapshot,
  createdCommit: true,
  receipt: {
    ...fixtureReceiptBase(input, "repository", "checkpoint", {
      investigationId: input.investigationId,
      toolchainDigest: manifest.toolchainDigest,
    }),
    status: "succeeded",
    snapshotId: advancedSnapshot,
  },
});

describe("MCP durable terminal recovery", () => {
  it("recovers an old-snapshot retry after restart before acquiring permission", async () => {
    let head = initialSnapshot;
    let finalized = false;
    let executions = 0;
    const terminals = new Map<string, AttuneOperationResult<"repository_checkpoint">>();
    const unused = () => Effect.die("unexpected handler");
    const handlers: AttuneOperationHandlers = {
      repository_materialize: unused,
      repository_checkpoint: (input) => {
        executions += 1;
        const result = terminalResult(input);
        terminals.set(canonicalJson(input), result);
        head = advancedSnapshot;
        return Effect.succeed(result);
      },
      joern_query: unused,
      maude_run: unused,
      property_run: unused,
      ast_grep_run: unused,
      artifact_promote: unused,
      investigation_finalize: unused,
    };
    const validate: InvestigationValidator = (request) => {
      if (finalized) {
        return Effect.fail(
          new AttuneToolFailure({
            code: "Finalized",
            message: "investigation is finalized",
          }),
        );
      }
      if (request.expectedSnapshot !== head) {
        return Effect.fail(
          new AttuneToolFailure({
            code: "StaleSnapshot",
            message: "repository HEAD does not match expected snapshot",
            expected: request.expectedSnapshot,
            observed: head,
          }),
        );
      }
      return Effect.succeed(manifest);
    };
    const terminalLookups = {
      repository_checkpoint: (input) => Effect.succeed(terminals.get(canonicalJson(input))),
    } satisfies Partial<AttuneTerminalLookups>;
    const makeHandlers = () =>
      makeMcpHandlers(makeInvestigationServiceFromHandlers(handlers, validate, terminalLookups));
    const input = {
      investigationId,
      expectedSnapshot: initialSnapshot,
      invocationId: "checkpoint-recovery" as InvocationId,
      references: [],
      policy: "commit",
      message: "advance once",
    } as const;

    const first = await Effect.runPromise(makeHandlers().repository_checkpoint(input));
    expect(first.receipt.status).toBe("succeeded");
    expect(head).toBe(advancedSnapshot);
    expect(executions).toBe(1);

    // A new service instance has no process-local capability from the first
    // call. Durable lookup still returns the exact terminal result before the
    // stale old snapshot can be rejected by active-capability acquisition.
    expect(await Effect.runPromise(makeHandlers().repository_checkpoint(input))).toEqual(first);
    expect(executions).toBe(1);

    await expect(
      Effect.runPromise(
        makeHandlers().repository_checkpoint({
          ...input,
          invocationId: "checkpoint-not-accepted" as InvocationId,
        }),
      ),
    ).rejects.toMatchObject({ code: "StaleSnapshot" });
    expect(executions).toBe(1);

    finalized = true;
    expect(await Effect.runPromise(makeHandlers().repository_checkpoint(input))).toEqual(first);
    await expect(
      Effect.runPromise(
        makeHandlers().repository_checkpoint({
          ...input,
          expectedSnapshot: advancedSnapshot,
          invocationId: "checkpoint-after-finalization" as InvocationId,
        }),
      ),
    ).rejects.toMatchObject({ code: "Finalized" });
    expect(executions).toBe(1);
  });
});
