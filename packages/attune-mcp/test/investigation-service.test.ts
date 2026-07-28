import {
  ATTUNE_OPERATIONS,
  AttuneToolFailure,
  canonicalJson,
  makeInvestigationServiceFromHandlers,
  makePersistedInvestigationValidator,
  sha256,
  type ActiveInvestigation,
  type AttuneHandlers,
  type CancelledReceipt,
  type FailedReceipt,
  type FullGitCommit,
  type InvestigationId,
  type InvestigationManifest,
  type InvocationId,
  type SucceededReceipt,
  type ToolName,
} from "attune-mcp";
import { Effect } from "effect";

const investigationId = "01K00000000000000000000000" as InvestigationId;
const snapshot = "a".repeat(40) as FullGitCommit;
const nextSnapshot = "b".repeat(40) as FullGitCommit;
const invocationId = "lifecycle-1" as InvocationId;
const timestamp = new Date(0).toISOString();

const receiptBase = (
  tool: ToolName,
  operation: string,
  input: { readonly invocationId: InvocationId },
) => ({
  schemaVersion: 1 as const,
  invocationId: input.invocationId,
  investigationId,
  tool,
  operation,
  inputDigest: sha256(`${canonicalJson(input)}\n`),
  toolchainDigest: sha256("typed-lifecycle-test"),
  artifacts: [],
  startedAt: timestamp,
});

const receipt = (
  tool: ToolName,
  operation: string,
  input: { readonly invocationId: InvocationId },
  at: FullGitCommit = snapshot,
): SucceededReceipt => ({
  ...receiptBase(tool, operation, input),
  completedAt: timestamp,
  status: "succeeded",
  snapshotId: at,
});

const failedReceipt = (
  tool: ToolName,
  operation: string,
  input: { readonly invocationId: InvocationId },
): FailedReceipt => ({
  ...receiptBase(tool, operation, input),
  completedAt: timestamp,
  status: "failed",
  snapshotId: snapshot,
  failure: {
    code: "ProcessExitFailure",
    message: "fixture terminal failure",
  },
});

const cancelledReceipt = (
  tool: ToolName,
  operation: string,
  input: { readonly invocationId: InvocationId },
): CancelledReceipt => ({
  ...receiptBase(tool, operation, input),
  completedAt: timestamp,
  status: "cancelled",
  snapshotId: snapshot,
  failure: {
    code: "Cancelled",
    message: "fixture terminal cancellation",
  },
});

const manifest: InvestigationManifest = {
  schemaVersion: 1,
  investigationId,
  normalizedRemote: "/fixture",
  requestedRevision: "main",
  resolvedCommit: snapshot,
  baseKey: sha256("base"),
  branch: `attune/${investigationId}`,
  toolchainDigest: sha256("typed-lifecycle-test"),
  createdAt: timestamp,
};

const unused = () => Effect.die("unused handler");

interface HandlerOptions {
  readonly checkpointSnapshot?: FullGitCommit;
  readonly onCheckpointPersisted?: (snapshot: FullGitCommit) => void;
  readonly finalizationAfterPersistence?:
    | "cancelled"
    | "effect-failure"
    | "interrupted";
  readonly onFinalizationPersisted?: () => void;
  readonly maudeEffectFailure?: AttuneToolFailure;
  readonly maudeTerminalFailure?: boolean;
}

const handlers = (options: HandlerOptions = {}): AttuneHandlers => ({
  repositoryMaterialize: (input) =>
    Effect.succeed({
      investigationId,
      requestedRevision: input.revision,
      resolvedCommit: snapshot,
      branch: `attune/${investigationId}`,
      receipt: receipt("repository", "materialize", input),
    }),
  repositoryCheckpoint: (input) => {
    const at = options.checkpointSnapshot ?? input.expectedSnapshot;
    options.onCheckpointPersisted?.(at);
    return Effect.succeed({
      snapshotId: at,
      createdCommit: at !== input.expectedSnapshot,
      receipt: receipt("repository", "checkpoint", input, at),
    });
  },
  joernQuery: unused,
  maudeRun: (input) => {
    if (options.maudeEffectFailure !== undefined) {
      return Effect.fail(options.maudeEffectFailure);
    }
    if (options.maudeTerminalFailure === true) {
      return Effect.succeed({
        receipt: failedReceipt("maude", "run", input),
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
  propertyRun: unused,
  astGrepRun: unused,
  artifactPromote: unused,
  investigationFinalize: (input) => {
    if (options.finalizationAfterPersistence !== undefined) {
      options.onFinalizationPersisted?.();
    }
    if (options.finalizationAfterPersistence === "effect-failure") {
      return Effect.fail(
        new AttuneToolFailure({
          code: "FinalizationFailure",
          message: "fixture failed after persisting finalization",
        }),
      );
    }
    if (options.finalizationAfterPersistence === "interrupted") {
      return Effect.interrupt;
    }
    if (options.finalizationAfterPersistence === "cancelled") {
      return Effect.succeed({
        receipt: cancelledReceipt("repository", "finalize", input),
      });
    }
    return Effect.succeed({
      finalSnapshot: input.expectedSnapshot,
      finalizedAt: timestamp,
      receipt: receipt("repository", "finalize", input),
    });
  },
});

const materializeInput = {
  invocationId,
  references: [],
  remote: "/fixture",
  revision: "main",
} as const;

const maudeInput = {
  invocationId,
  references: [],
  moduleSource: "fmod TEST is endfm",
  commands: "reduce true .",
  timeoutMilliseconds: 1_000,
} as const;

const activate = async (
  service: ReturnType<typeof makeInvestigationServiceFromHandlers>,
) => {
  const materialized = await Effect.runPromise(
    service.materialize(materializeInput),
  );
  if (materialized.status !== "materialized") {
    throw new Error("fixture materialization was rejected");
  }
  return await Effect.runPromise(service.activate(materialized.investigation));
};

describe("typed investigation lifecycle service", () => {
  it("validates materialization, rotates active permission, and finalizes", async () => {
    const service = makeInvestigationServiceFromHandlers(handlers(), () =>
      Effect.succeed(manifest),
    );
    const active = await activate(service);
    const executed = await Effect.runPromise(
      service.execute(active, "maude_run", maudeInput),
    );
    expect(executed.receipt).toMatchObject({
      status: "succeeded",
      tool: "maude",
      operation: "run",
    });
    expect(executed.result).toMatchObject({
      stdoutTail: "result",
      receipt: { status: "succeeded" },
    });

    await expect(
      Effect.runPromise(service.execute(active, "maude_run", maudeInput)),
    ).rejects.toMatchObject({
      _tag: "InvestigationLifecycleError",
      reason: "StateMismatch",
    });

    const finalized = await Effect.runPromise(
      service.finalize(executed.investigation, {
        invocationId: "finalize-1" as InvocationId,
        references: [],
      }),
    );
    expect(finalized.status).toBe("finalized");

    // Reuse the original active capability, not a cast of finalized evidence.
    await expect(
      Effect.runPromise(
        service.execute(executed.investigation, "maude_run", maudeInput),
      ),
    ).rejects.toMatchObject({
      _tag: "InvestigationLifecycleError",
      reason: "StateMismatch",
    });
  });

  it("rejects forged capabilities at runtime", async () => {
    const service = makeInvestigationServiceFromHandlers(handlers(), () =>
      Effect.succeed(manifest),
    );
    const forged = {
      investigationId,
      state: "active",
      snapshot: { id: snapshot, state: "active" },
    } as ActiveInvestigation;

    await expect(
      Effect.runPromise(service.execute(forged, "maude_run", maudeInput)),
    ).rejects.toMatchObject({ reason: "UnrecognizedCapability" });
  });

  it("rejects asserted unknown and wrong-lifecycle operation selectors", async () => {
    const service = makeInvestigationServiceFromHandlers(handlers(), () =>
      Effect.succeed(manifest),
    );
    const active = await activate(service);
    const unsafeExecute = service.execute as unknown as (
      investigation: ActiveInvestigation,
      name: string,
      input: unknown,
    ) => Effect.Effect<unknown, unknown>;
    const unsafeRecover = service.recoverTerminal as unknown as (
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
      await expect(
        Effect.runPromise(unsafeExecute(active, name, maudeInput)),
      ).rejects.toMatchObject({
        _tag: "InvestigationLifecycleError",
        reason: "UnrecognizedOperation",
        observed: name,
      });
    }

    for (const name of ["repository_materialize", "not_an_operation"]) {
      await expect(
        Effect.runPromise(unsafeRecover(name, wireInput)),
      ).rejects.toMatchObject({
        _tag: "InvestigationLifecycleError",
        reason: "UnrecognizedOperation",
        observed: name,
      });
    }
  });

  it("rejects a genuine capability issued by another service instance", async () => {
    const serviceA = makeInvestigationServiceFromHandlers(handlers(), () =>
      Effect.succeed(manifest),
    );
    const serviceB = makeInvestigationServiceFromHandlers(handlers(), () =>
      Effect.succeed(manifest),
    );
    const capabilityFromA = await activate(serviceA);

    await expect(
      Effect.runPromise(
        serviceB.execute(capabilityFromA, "maude_run", maudeInput),
      ),
    ).rejects.toMatchObject({
      _tag: "InvestigationLifecycleError",
      reason: "UnrecognizedCapability",
    });
  });

  it.each(["effect-failure", "interrupted", "cancelled"] as const)(
    "revokes active permission when finalization persisted before %s",
    async (finalizationAfterPersistence) => {
      let persistedFinalization = false;
      const service = makeInvestigationServiceFromHandlers(
        handlers({
          finalizationAfterPersistence,
          onFinalizationPersisted: () => {
            persistedFinalization = true;
          },
        }),
        () =>
          Effect.succeed(
            persistedFinalization
              ? {
                  ...manifest,
                  finalizedAt: timestamp,
                  finalSnapshot: snapshot,
                }
              : manifest,
          ),
      );
      const active = await activate(service);

      const finalizationExit = await Effect.runPromiseExit(
        service.finalize(active, {
          invocationId:
            `finalize-${finalizationAfterPersistence}` as InvocationId,
          references: [],
        }),
      );
      expect(finalizationExit._tag).toBe("Failure");

      await expect(
        Effect.runPromise(service.execute(active, "maude_run", maudeInput)),
      ).rejects.toMatchObject({
        _tag: "InvestigationLifecycleError",
        reason: "StateMismatch",
      });
    },
  );

  it("turns undeclared implementation failures into ContractMismatch", async () => {
    const service = makeInvestigationServiceFromHandlers(
      handlers({
        maudeEffectFailure: new AttuneToolFailure({
          code: "PromotionRejected",
          message: "not a declared Maude failure",
        }),
      }),
      () => Effect.succeed(manifest),
    );
    const active = await activate(service);

    await expect(
      Effect.runPromise(service.execute(active, "maude_run", maudeInput)),
    ).rejects.toMatchObject({
      _tag: "AttuneToolFailure",
      code: "ContractMismatch",
      observed: "PromotionRejected",
    });
  });

  it("rejects stale and dirty initial activation from persisted evidence", async () => {
    const stale = makePersistedInvestigationValidator({
      inspect: async () => ({
        manifest,
        head: nextSnapshot,
        dirty: false,
      }),
    });
    await expect(
      Effect.runPromise(
        stale({
          investigationId,
          expectedSnapshot: snapshot,
          requireClean: true,
        }),
      ),
    ).rejects.toMatchObject({ code: "StaleSnapshot" });

    const dirty = makePersistedInvestigationValidator({
      inspect: async () => ({
        manifest,
        head: snapshot,
        dirty: true,
      }),
    });
    const service = makeInvestigationServiceFromHandlers(handlers(), dirty);
    const materialized = await Effect.runPromise(
      service.materialize(materializeInput),
    );
    if (materialized.status !== "materialized") {
      throw new Error("fixture materialization was rejected");
    }
    await expect(
      Effect.runPromise(service.activate(materialized.investigation)),
    ).rejects.toMatchObject({ code: "DirtyRepository" });
  });

  it("acquires a dirty current workspace for checkpoint and revokes old permission", async () => {
    let persistedHead = snapshot;
    const validator = makePersistedInvestigationValidator({
      inspect: async () => ({
        manifest,
        head: persistedHead,
        dirty: true,
      }),
    });
    const service = makeInvestigationServiceFromHandlers(
      handlers({
        checkpointSnapshot: nextSnapshot,
        onCheckpointPersisted: (head) => {
          persistedHead = head;
        },
      }),
      validator,
    );
    const active = await Effect.runPromise(
      service.acquireActive({
        investigationId,
        expectedSnapshot: snapshot,
      }),
    );
    const checkpointed = await Effect.runPromise(
      service.execute(active, "repository_checkpoint", {
        invocationId: "checkpoint-1" as InvocationId,
        references: [],
        policy: "commit",
        message: "checkpoint dirty writer output",
      }),
    );
    expect(checkpointed.investigation.snapshot.id).toBe(nextSnapshot);

    await expect(
      Effect.runPromise(
        service.execute(active, "repository_checkpoint", {
          invocationId: "checkpoint-2" as InvocationId,
          references: [],
          policy: "commit",
        }),
      ),
    ).rejects.toMatchObject({ reason: "StateMismatch" });
  });

  it("preserves active permission after a failed terminal receipt", async () => {
    const service = makeInvestigationServiceFromHandlers(
      handlers({ maudeTerminalFailure: true }),
      () => Effect.succeed(manifest),
    );
    const active = await activate(service);
    const failed = await Effect.runPromise(
      service.execute(active, "maude_run", maudeInput),
    );
    expect(failed.receipt.status).toBe("failed");
    expect(failed.investigation).toBe(active);

    const finalized = await Effect.runPromise(
      service.finalize(active, {
        invocationId: "finalize-after-failure" as InvocationId,
        references: [],
      }),
    );
    expect(finalized.status).toBe("finalized");
  });

  it("keeps the registry noun-oriented and lifecycle metadata explicit", () => {
    expect(Object.keys(ATTUNE_OPERATIONS)).toEqual([
      "repository_materialize",
      "repository_checkpoint",
      "joern_query",
      "maude_run",
      "property_run",
      "ast_grep_run",
      "artifact_promote",
      "investigation_finalize",
    ]);
    expect(ATTUNE_OPERATIONS.repository_materialize.lifecycle).toEqual({
      requires: "none",
      produces: "materialized",
      transition: "materialize",
    });
    expect(ATTUNE_OPERATIONS.maude_run.writerPolicy).toEqual({
      kind: "static",
      mode: "reader",
    });
    expect(ATTUNE_OPERATIONS.ast_grep_run.writerPolicy).toEqual({
      kind: "input-discriminant",
      field: "mode",
      cases: { apply: "writer" },
      defaultMode: "reader",
    });
    expect(ATTUNE_OPERATIONS.investigation_finalize.writerPolicy).toEqual({
      kind: "static",
      mode: "exclusive-writer",
    });
  });
});
