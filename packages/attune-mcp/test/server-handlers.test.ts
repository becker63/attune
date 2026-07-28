import {
  AttuneToolFailure,
  canonicalJson,
  makeInvestigationServiceFromHandlers,
  makeMcpHandlers,
  sha256,
  type AttuneHandlers,
  type AttuneTerminalLookups,
  type FullGitCommit,
  type InvestigationId,
  type InvestigationManifest,
  type InvestigationValidator,
  type InvocationId,
  type OperationResultOf,
  type RepositoryCheckpointInput,
  RepositoryCheckpointOperation,
} from "attune-mcp";
import { Effect } from "effect";

const investigationId = "01K00000000000000000000000" as InvestigationId;
const initialSnapshot = "a".repeat(40) as FullGitCommit;
const advancedSnapshot = "b".repeat(40) as FullGitCommit;
const timestamp = new Date(0).toISOString();

const manifest: InvestigationManifest = {
  schemaVersion: 1,
  investigationId,
  normalizedRemote: "/fixture",
  requestedRevision: "main",
  resolvedCommit: initialSnapshot,
  baseKey: sha256("server-handler-base"),
  branch: `attune/${investigationId}`,
  toolchainDigest: sha256("server-handler-toolchain"),
  createdAt: timestamp,
};

const terminalResult = (
  input: RepositoryCheckpointInput,
): OperationResultOf<typeof RepositoryCheckpointOperation> => ({
  snapshotId: advancedSnapshot,
  createdCommit: true,
  receipt: {
    schemaVersion: 1,
    invocationId: input.invocationId,
    investigationId: input.investigationId,
    tool: "repository",
    operation: "checkpoint",
    inputDigest: sha256(`${canonicalJson(input)}\n`),
    toolchainDigest: manifest.toolchainDigest,
    artifacts: [],
    startedAt: timestamp,
    completedAt: timestamp,
    status: "succeeded",
    snapshotId: advancedSnapshot,
  },
});

describe("MCP durable terminal recovery", () => {
  it("recovers an old-snapshot retry after restart before acquiring permission", async () => {
    let head = initialSnapshot;
    let finalized = false;
    let executions = 0;
    const terminals = new Map<
      string,
      OperationResultOf<typeof RepositoryCheckpointOperation>
    >();
    const unused = () => Effect.die("unexpected handler");
    const handlers: AttuneHandlers = {
      repositoryMaterialize: unused,
      repositoryCheckpoint: (input) => {
        executions += 1;
        const result = terminalResult(input);
        terminals.set(canonicalJson(input), result);
        head = advancedSnapshot;
        return Effect.succeed(result);
      },
      joernQuery: unused,
      maudeRun: unused,
      propertyRun: unused,
      astGrepRun: unused,
      artifactPromote: unused,
      investigationFinalize: unused,
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
      repository_checkpoint: (input) =>
        Effect.succeed(terminals.get(canonicalJson(input))),
    } satisfies Partial<AttuneTerminalLookups>;
    const makeHandlers = () =>
      makeMcpHandlers(
        makeInvestigationServiceFromHandlers(
          handlers,
          validate,
          terminalLookups,
        ),
      );
    const input = {
      investigationId,
      expectedSnapshot: initialSnapshot,
      invocationId: "checkpoint-recovery" as InvocationId,
      references: [],
      policy: "commit",
      message: "advance once",
    } as const;

    const first = await Effect.runPromise(
      makeHandlers().repositoryCheckpoint(input),
    );
    expect(first.receipt.status).toBe("succeeded");
    expect(head).toBe(advancedSnapshot);
    expect(executions).toBe(1);

    // A new service instance has no process-local capability from the first
    // call. Durable lookup still returns the exact terminal result before the
    // stale old snapshot can be rejected by active-capability acquisition.
    expect(
      await Effect.runPromise(makeHandlers().repositoryCheckpoint(input)),
    ).toEqual(first);
    expect(executions).toBe(1);

    await expect(
      Effect.runPromise(
        makeHandlers().repositoryCheckpoint({
          ...input,
          invocationId: "checkpoint-not-accepted" as InvocationId,
        }),
      ),
    ).rejects.toMatchObject({ code: "StaleSnapshot" });
    expect(executions).toBe(1);

    finalized = true;
    expect(
      await Effect.runPromise(makeHandlers().repositoryCheckpoint(input)),
    ).toEqual(first);
    await expect(
      Effect.runPromise(
        makeHandlers().repositoryCheckpoint({
          ...input,
          expectedSnapshot: advancedSnapshot,
          invocationId: "checkpoint-after-finalization" as InvocationId,
        }),
      ),
    ).rejects.toMatchObject({ code: "Finalized" });
    expect(executions).toBe(1);
  });
});
