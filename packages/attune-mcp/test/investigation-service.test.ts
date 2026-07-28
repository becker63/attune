import { Effect } from "effect";

import {
  AttuneToolFailure,
  type CancelledReceipt,
  type FailedReceipt,
  type FullGitCommit,
  type InvocationId,
  type SucceededReceipt,
  type ToolName,
} from "../src/contract/schemas.js";
import type { Investigation } from "../src/investigation/capability.js";
import {
  makeInvestigationServiceFromHandlers,
  makePersistedInvestigationValidator,
  type InvestigationValidator,
} from "../src/investigation/service.js";
import { sha256 } from "../src/platform/core.js";
import type { AttuneOperationHandlers } from "../src/tools/registry.js";
import {
  FIXTURE_INVESTIGATION_ID as investigationId,
  FIXTURE_NEXT_SNAPSHOT as nextSnapshot,
  FIXTURE_SNAPSHOT as snapshot,
  FIXTURE_TIMESTAMP as timestamp,
  fixtureManifest,
  fixtureReceiptBase,
} from "./fixtures.js";

const invocationId = "lifecycle-1" as InvocationId;
const toolchainDigest = sha256("typed-lifecycle-test");
const run = Effect.runPromise;

const input = (id: string) => ({
  invocationId: id as InvocationId,
  references: [],
});

const expectRejection = (
  effect: Effect.Effect<unknown, unknown>,
  expected: object,
) => expect(run(effect)).rejects.toMatchObject(expected);

const expectLifecycleRejection = (
  effect: Effect.Effect<unknown, unknown>,
  reason: "StateMismatch" | "UnrecognizedCapability" | "UnrecognizedOperation",
  observed?: string,
) =>
  expectRejection(effect, {
    _tag: "InvestigationLifecycleError",
    reason,
    ...(observed === undefined ? {} : { observed }),
  });

const receipt = (
  tool: ToolName,
  operation: string,
  input: { readonly invocationId: InvocationId },
  at: FullGitCommit = snapshot,
): SucceededReceipt => ({
  ...fixtureReceiptBase(input, tool, operation, {
    investigationId,
    toolchainDigest,
  }),
  status: "succeeded",
  snapshotId: at,
});

type FailureReceipt<Status extends "failed" | "cancelled"> =
  Status extends "failed" ? FailedReceipt : CancelledReceipt;

const failureReceipt = <const Status extends "failed" | "cancelled">(
  status: Status,
  tool: ToolName,
  operation: string,
  input: { readonly invocationId: InvocationId },
): FailureReceipt<Status> =>
  ({
    ...receipt(tool, operation, input),
    status,
    failure: {
      code: status === "failed" ? "ProcessExitFailure" : "Cancelled",
      message: `fixture terminal ${status === "failed" ? "failure" : "cancellation"}`,
    },
  }) as FailureReceipt<Status>;

const manifest = fixtureManifest({ toolchainDigest });
const unused = () => Effect.die("unused handler");
type FinalizationFailure = "cancelled" | "effect-failure" | "interrupted";
const finalizationFailure = new AttuneToolFailure({
  code: "FinalizationFailure",
  message: "fixture failed after persisting finalization",
});

interface HandlerOptions {
  readonly checkpointSnapshot?: FullGitCommit;
  readonly onCheckpointPersisted?: (snapshot: FullGitCommit) => void;
  readonly finalizationAfterPersistence?: FinalizationFailure;
  readonly onFinalizationPersisted?: () => void;
  readonly maudeEffectFailure?: AttuneToolFailure;
  readonly maudeTerminalFailure?: boolean;
}

const handlers = (options: HandlerOptions = {}): AttuneOperationHandlers => ({
  repository_materialize: (input) =>
    Effect.succeed({
      investigationId,
      requestedRevision: input.revision,
      resolvedCommit: snapshot,
      branch: `attune/${investigationId}`,
      receipt: receipt("repository", "materialize", input),
    }),
  repository_checkpoint: (input) => {
    const at = options.checkpointSnapshot ?? input.expectedSnapshot;
    options.onCheckpointPersisted?.(at);
    return Effect.succeed({
      snapshotId: at,
      createdCommit: at !== input.expectedSnapshot,
      receipt: receipt("repository", "checkpoint", input, at),
    });
  },
  joern_query: unused,
  maude_run: (input) => {
    if (options.maudeEffectFailure !== undefined) {
      return Effect.fail(options.maudeEffectFailure);
    }
    if (options.maudeTerminalFailure === true) {
      return Effect.succeed({
        receipt: failureReceipt("failed", "maude", "run", input),
      });
    }
    return Effect.succeed({
      snapshotId: input.expectedSnapshot,
      exitCode: 0,
      stdoutTail: "result",
      stderrTail: "",
      receipt: receipt("maude", "run", input),
    });
  },
  property_run: unused,
  ast_grep_run: unused,
  artifact_promote: unused,
  investigation_finalize: (input) => {
    options.onFinalizationPersisted?.();
    if (options.finalizationAfterPersistence === "effect-failure") {
      return Effect.fail(finalizationFailure);
    }
    if (options.finalizationAfterPersistence === "interrupted") {
      return Effect.interrupt;
    }
    if (options.finalizationAfterPersistence === "cancelled") {
      return Effect.succeed({
        receipt: failureReceipt("cancelled", "repository", "finalize", input),
      });
    }
    return Effect.succeed({
      finalSnapshot: input.expectedSnapshot,
      finalizedAt: timestamp,
      receipt: receipt("repository", "finalize", input),
    });
  },
});

const makeService = (
  options: HandlerOptions = {},
  validate: InvestigationValidator = () => Effect.succeed(manifest),
) => makeInvestigationServiceFromHandlers(handlers(options), validate);

const persistedValidator = (
  head: FullGitCommit | (() => FullGitCommit),
  dirty: boolean,
) =>
  makePersistedInvestigationValidator({
    inspect: async () => ({
      manifest,
      head: typeof head === "function" ? head() : head,
      dirty,
    }),
  });

const materializeInput = {
  ...input(invocationId),
  remote: "/fixture",
  revision: "main",
} as const;

const maudeInput = {
  ...input(invocationId),
  moduleSource: "fmod TEST is endfm",
  commands: "reduce true .",
  timeoutMilliseconds: 1_000,
} as const;

const activate = async (
  service: ReturnType<typeof makeInvestigationServiceFromHandlers>,
) => {
  const materialized = await run(service.materialize(materializeInput));
  if (materialized.status !== "materialized") {
    throw new Error("fixture materialization was rejected");
  }
  return run(service.activate(materialized.investigation));
};

describe("typed investigation lifecycle service", () => {
  it("validates materialization, rotates active permission, and finalizes", async () => {
    const service = makeService();
    const active = await activate(service);
    const executed = await run(
      service.execute(active, "maude_run", maudeInput),
    );
    expect(executed).toMatchObject({
      receipt: {
        status: "succeeded",
        tool: "maude",
        operation: "run",
      },
      result: {
        stdoutTail: "result",
        receipt: { status: "succeeded" },
      },
    });
    await expectLifecycleRejection(
      service.execute(active, "maude_run", maudeInput),
      "StateMismatch",
    );
    const finalized = await run(
      service.finalize(executed.investigation, input("finalize-1")),
    );
    expect(finalized.status).toBe("finalized");

    // Reuse the original active capability, not a cast of finalized evidence.
    await expectLifecycleRejection(
      service.execute(executed.investigation, "maude_run", maudeInput),
      "StateMismatch",
    );
  });

  it.each([
    [
      "a forged",
      async () =>
        ({
          investigationId,
          state: "active",
          snapshot: { id: snapshot, state: "active" },
        }) as Investigation<"active">,
    ],
    ["another service's genuine", () => activate(makeService())],
  ])("rejects %s capability", async (_kind, capability) => {
    expect.hasAssertions();
    const service = makeService();
    await expectLifecycleRejection(
      service.execute(await capability(), "maude_run", maudeInput),
      "UnrecognizedCapability",
    );
  });

  it("rejects asserted unknown and wrong-lifecycle operation selectors", async () => {
    expect.hasAssertions();
    const service = makeService();
    const active = await activate(service);
    const unsafeExecute = service.execute.bind(service) as unknown as (
      investigation: Investigation<"active">,
      name: string,
      input: unknown,
    ) => Effect.Effect<unknown, unknown>;
    const unsafeRecover = service.recoverTerminal.bind(service) as unknown as (
      name: string,
      input: unknown,
    ) => Effect.Effect<unknown, unknown>;
    const wireInput = {
      ...maudeInput,
      investigationId,
      expectedSnapshot: snapshot,
    };

    for (const name of [
      "repository_materialize",
      "investigation_finalize",
      "not_an_operation",
    ]) {
      await expectLifecycleRejection(
        unsafeExecute(active, name, maudeInput),
        "UnrecognizedOperation",
        name,
      );
    }

    for (const name of ["repository_materialize", "not_an_operation"]) {
      await expectLifecycleRejection(
        unsafeRecover(name, wireInput),
        "UnrecognizedOperation",
        name,
      );
    }
  });

  it.each(["effect-failure", "interrupted", "cancelled"] as const)(
    "revokes active permission when finalization persisted before %s",
    async (finalizationAfterPersistence) => {
      let persistedFinalization = false;
      const finalizedManifest = {
        ...manifest,
        finalizedAt: timestamp,
        finalSnapshot: snapshot,
      };
      const service = makeInvestigationServiceFromHandlers(
        handlers({
          finalizationAfterPersistence,
          onFinalizationPersisted: () => {
            persistedFinalization = true;
          },
        }),
        () =>
          Effect.succeed(persistedFinalization ? finalizedManifest : manifest),
      );
      const active = await activate(service);

      const finalizationExit = await Effect.runPromiseExit(
        service.finalize(
          active,
          input(`finalize-${finalizationAfterPersistence}`),
        ),
      );
      expect(finalizationExit._tag).toBe("Failure");

      await expectLifecycleRejection(
        service.execute(active, "maude_run", maudeInput),
        "StateMismatch",
      );
    },
  );

  it("preserves failures admitted by the Toolkit failure schema", async () => {
    expect.hasAssertions();
    const service = makeService({
      maudeEffectFailure: new AttuneToolFailure({
        code: "PromotionRejected",
        message: "shared typed failure",
      }),
    });
    const active = await activate(service);

    await expectRejection(service.execute(active, "maude_run", maudeInput), {
      _tag: "AttuneToolFailure",
      code: "PromotionRejected",
      message: "shared typed failure",
    });
  });

  it("rejects stale and dirty initial activation from persisted evidence", async () => {
    expect.hasAssertions();
    const stale = persistedValidator(nextSnapshot, false);
    await expectRejection(
      stale({
        investigationId,
        expectedSnapshot: snapshot,
        requireClean: true,
      }),
      { code: "StaleSnapshot" },
    );

    const dirty = persistedValidator(snapshot, true);
    const service = makeService({}, dirty);
    const materialized = await run(service.materialize(materializeInput));
    if (materialized.status !== "materialized") {
      throw new Error("fixture materialization was rejected");
    }
    await expectRejection(service.activate(materialized.investigation), {
      code: "DirtyRepository",
    });
  });

  it("acquires a dirty current workspace for checkpoint and revokes old permission", async () => {
    let persistedHead = snapshot;
    const service = makeService(
      {
        checkpointSnapshot: nextSnapshot,
        onCheckpointPersisted: (head) => {
          persistedHead = head;
        },
      },
      persistedValidator(() => persistedHead, true),
    );
    const active = await run(
      service.acquireActive({
        investigationId,
        expectedSnapshot: snapshot,
      }),
    );
    const checkpointed = await run(
      service.execute(active, "repository_checkpoint", {
        ...input("checkpoint-1"),
        policy: "commit",
        message: "checkpoint dirty writer output",
      }),
    );
    expect(checkpointed.investigation.snapshot.id).toBe(nextSnapshot);

    await expectLifecycleRejection(
      service.execute(active, "repository_checkpoint", {
        ...input("checkpoint-2"),
        policy: "commit",
      }),
      "StateMismatch",
    );
  });

  it("preserves active permission after a failed terminal receipt", async () => {
    const service = makeService({ maudeTerminalFailure: true });
    const active = await activate(service);
    const failed = await run(service.execute(active, "maude_run", maudeInput));
    expect(failed.receipt.status).toBe("failed");
    expect(failed.investigation).toBe(active);

    const finalized = await run(
      service.finalize(active, input("finalize-after-failure")),
    );
    expect(finalized.status).toBe("finalized");
  });
});
