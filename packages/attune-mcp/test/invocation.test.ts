import { spawn } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as Path from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalJson,
  InvestigationFinalizeOperation,
  InvocationEngine,
  MaudeRunOperation,
  RepositoryCheckpointOperation,
  sha256,
  type ActivityGate,
  type FullGitCommit,
  type InvestigationId,
  type InvestigationManifest,
  type InvocationId,
  type MountedWorkspace,
  type RuntimeConfig,
  type WorkspaceStore,
} from "attune-mcp";
import { Effect, Fiber, Schema } from "effect";

import { withOsLock } from "../src/v0/lock.js";

const id = "01K00000000000000000000000" as InvestigationId;
const snapshot = "a".repeat(40) as FullGitCommit;

const makeConfig = (home: string): RuntimeConfig => ({
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
  toolchainDigest: sha256("test-toolchain"),
  outputLimitBytes: 1024,
  inlineLimitBytes: 256,
});

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};

const canAcquireLock = async (
  config: RuntimeConfig,
  lockPath: string,
): Promise<boolean> =>
  await new Promise<boolean>((resolve, reject) => {
    const child = spawn(
      config.flock,
      [
        "--exclusive",
        "--nonblock",
        lockPath,
        config.node,
        "-e",
        "process.exit(0)",
      ],
      { shell: false, stdio: "ignore" },
    );
    child.once("error", reject);
    child.once("exit", (code) => resolve(code === 0));
  });

describe("idempotent receipt boundary", () => {
  let home: string;
  let workspace: MountedWorkspace;
  let manifest: InvestigationManifest;
  let engine: InvocationEngine;

  beforeEach(async () => {
    home = await import("node:fs/promises").then(({ mkdtemp }) =>
      mkdtemp(Path.join(tmpdir(), "attune-invocation-")),
    );
    const repositoryPath = Path.join(home, "repo");
    const artifactsPath = Path.join(home, "artifacts");
    await Promise.all([
      mkdir(repositoryPath, { recursive: true }),
      mkdir(artifactsPath, { recursive: true }),
    ]);
    manifest = {
      schemaVersion: 1,
      investigationId: id,
      normalizedRemote: "/fixture",
      requestedRevision: "main",
      resolvedCommit: snapshot,
      baseKey: sha256("base"),
      branch: `attune/${id}`,
      toolchainDigest: sha256("test-toolchain"),
      createdAt: new Date(0).toISOString(),
    };
    workspace = {
      mountPath: home,
      repositoryPath,
      artifactsPath,
      manifest,
    };
    const store = {
      withMount: async <A>(
        _id: InvestigationId,
        _signal: AbortSignal | undefined,
        use: (mounted: MountedWorkspace) => Promise<A>,
      ): Promise<A> => await use({ ...workspace, manifest }),
    } as unknown as WorkspaceStore;
    engine = new InvocationEngine(makeConfig(home), store);
  });

  afterEach(async () => {
    await rm(home, { recursive: true, force: true });
  });

  const operation = (
    invocationId: InvocationId,
    value: string,
    increment: () => void,
  ) =>
    engine.execute({
      descriptor: MaudeRunOperation,
      input: {
        investigationId: id,
        invocationId,
        expectedSnapshot: snapshot,
        references: [],
        moduleSource: value,
        commands: "reduce true .",
        timeoutMilliseconds: 1_000,
      },
      run: async (context) => {
        increment();
        context.setSnapshot(snapshot);
        await context.writeArtifact("native.txt", value);
        await new Promise((resolve) => setTimeout(resolve, 20));
        return {
          snapshotId: snapshot,
          value: {
            snapshotId: snapshot,
            exitCode: 0,
            stdoutTail: value,
            stderrTail: "",
          },
        };
      },
    });

  it("serializes concurrent duplicates and returns the original receipt", async () => {
    let executions = 0;
    const invocationId = "duplicate-1" as InvocationId;
    const [left, right] = await Promise.all([
      Effect.runPromise(operation(invocationId, "exact", () => executions++)),
      Effect.runPromise(operation(invocationId, "exact", () => executions++)),
    ]);
    expect(executions).toBe(1);
    expect(left).toEqual(right);
    const directory = Path.join(workspace.artifactsPath, "maude", invocationId);
    expect(
      JSON.parse(await readFile(Path.join(directory, "receipt.json"), "utf8")),
    ).toMatchObject({ status: "succeeded", snapshotId: snapshot });
    expect(await readFile(Path.join(directory, "native.txt"), "utf8")).toBe(
      "exact",
    );
  });

  it("rejects changed input and observed incompleteness without replay", async () => {
    let executions = 0;
    const invocationId = "conflict-1" as InvocationId;
    await Effect.runPromise(
      operation(invocationId, "first", () => executions++),
    );
    await expect(
      Effect.runPromise(operation(invocationId, "changed", () => executions++)),
    ).rejects.toMatchObject({ code: "InvocationConflict" });
    expect(executions).toBe(1);

    const incompleteId = "incomplete-1" as InvocationId;
    const input = {
      investigationId: id,
      invocationId: incompleteId,
      expectedSnapshot: snapshot,
      references: [],
      moduleSource: "lost",
      commands: "reduce true .",
      timeoutMilliseconds: 1_000,
    };
    const directory = Path.join(workspace.artifactsPath, "maude", incompleteId);
    await mkdir(directory, { recursive: true });
    await writeFile(
      Path.join(directory, "request.json"),
      `${canonicalJson(input)}\n`,
    );
    await expect(
      Effect.runPromise(operation(incompleteId, "lost", () => executions++)),
    ).rejects.toMatchObject({ code: "InvocationIncomplete" });
    expect(executions).toBe(1);
  });

  it("returns completed retries after finalization but accepts no new work", async () => {
    let executions = 0;
    const completed = "before-finalization" as InvocationId;
    const first = await Effect.runPromise(
      operation(completed, "evidence", () => executions++),
    );
    manifest = {
      ...manifest,
      finalizedAt: new Date().toISOString(),
      finalSnapshot: snapshot,
    };
    expect(
      await Effect.runPromise(
        operation(completed, "evidence", () => executions++),
      ),
    ).toEqual(first);
    await expect(
      Effect.runPromise(
        operation(
          "after-finalization" as InvocationId,
          "new",
          () => executions++,
        ),
      ),
    ).rejects.toMatchObject({ code: "Finalized" });
    expect(executions).toBe(1);
  });

  it("rejects divergence between the embedded and detached receipt", async () => {
    let executions = 0;
    const invocationId = "detached-receipt-tamper" as InvocationId;
    const input = {
      investigationId: id,
      invocationId,
      expectedSnapshot: snapshot,
      references: [],
      moduleSource: "evidence",
      commands: "reduce true .",
      timeoutMilliseconds: 1_000,
    } as const;
    await Effect.runPromise(
      operation(invocationId, input.moduleSource, () => executions++),
    );

    const receiptPath = Path.join(
      workspace.artifactsPath,
      "maude",
      invocationId,
      "receipt.json",
    );
    const receipt = JSON.parse(await readFile(receiptPath, "utf8")) as object;
    await writeFile(
      receiptPath,
      `${canonicalJson({ ...receipt, inputDigest: sha256("tampered") })}\n`,
    );

    await expect(
      Effect.runPromise(engine.lookupTerminal(MaudeRunOperation, input)),
    ).rejects.toMatchObject({
      code: "ContractMismatch",
      message: "persisted result and detached receipt disagree",
    });
    expect(executions).toBe(1);
  });

  it("keeps the activity gate closed while cancelled exclusive work drains", async () => {
    const invocationId = "cancelled-exclusive" as InvocationId;
    const entered = deferred();
    const cancelled = deferred();
    const release = deferred();
    let sharedEntered = false;
    let interruptCompleted = false;
    const exclusive = engine.execute({
      descriptor: InvestigationFinalizeOperation,
      input: {
        investigationId: id,
        invocationId,
        expectedSnapshot: snapshot,
        references: [],
      },
      run: async (context) => {
        context.setSnapshot(snapshot);
        context.signal.addEventListener("abort", cancelled.resolve, {
          once: true,
        });
        entered.resolve();
        await release.promise;
        throw new Error("native finalizer drained");
      },
    });

    const exclusiveFiber = Effect.runFork(exclusive);
    await entered.promise;
    const interruption = Effect.runPromise(
      Fiber.interrupt(exclusiveFiber),
    ).then(() => {
      interruptCompleted = true;
    });
    await cancelled.promise;

    const gateFor = Reflect.get(engine, "gate") as (
      investigationId: InvestigationId,
    ) => ActivityGate;
    const sharedFiber = Effect.runFork(
      gateFor(id).shared(
        Effect.sync(() => {
          sharedEntered = true;
        }),
      ),
    );

    expect(interruptCompleted).toBe(false);
    expect(sharedEntered).toBe(false);
    release.resolve();
    await interruption;
    await Effect.runPromise(Fiber.join(sharedFiber));
    expect(sharedEntered).toBe(true);

    const receipt = JSON.parse(
      await readFile(
        Path.join(
          workspace.artifactsPath,
          "repository",
          invocationId,
          "receipt.json",
        ),
        "utf8",
      ),
    ) as { readonly status: string };
    expect(receipt.status).toBe("cancelled");
  });

  it("retains the writer lock until cancellation publishes a terminal receipt", async () => {
    const config = makeConfig(home);
    const firstId = "cancelled-writer" as InvocationId;
    const secondId = "writer-after-cancel" as InvocationId;
    const entered = deferred();
    const cancelled = deferred();
    const release = deferred();
    let receiptAtSecondEntry: unknown;
    const first = engine.execute({
      descriptor: RepositoryCheckpointOperation,
      input: {
        investigationId: id,
        invocationId: firstId,
        expectedSnapshot: snapshot,
        references: [],
        policy: "require-clean",
      },
      run: async (context) => {
        context.setSnapshot(snapshot);
        context.signal.addEventListener("abort", cancelled.resolve, {
          once: true,
        });
        entered.resolve();
        await release.promise;
        throw new Error("native writer drained");
      },
    });
    const second = engine.execute({
      descriptor: RepositoryCheckpointOperation,
      input: {
        investigationId: id,
        invocationId: secondId,
        expectedSnapshot: snapshot,
        references: [],
        policy: "require-clean",
      },
      run: async (context) => {
        receiptAtSecondEntry = JSON.parse(
          await readFile(
            Path.join(
              workspace.artifactsPath,
              "repository",
              firstId,
              "receipt.json",
            ),
            "utf8",
          ),
        );
        context.setSnapshot(snapshot);
        return {
          snapshotId: snapshot,
          value: { snapshotId: snapshot, createdCommit: false },
        };
      },
    });

    const firstFiber = Effect.runFork(first);
    await entered.promise;
    const interruption = Effect.runPromise(Fiber.interrupt(firstFiber));
    await cancelled.promise;

    const writerLock = Path.join(home, "locks", `writer-${id}.lock`);
    expect(await canAcquireLock(config, writerLock)).toBe(false);
    const secondFiber = Effect.runFork(second);
    expect(receiptAtSecondEntry).toBeUndefined();

    release.resolve();
    await interruption;
    const secondResult = await Effect.runPromise(Fiber.join(secondFiber));
    expect(secondResult.receipt.status).toBe("succeeded");
    expect(receiptAtSecondEntry).toMatchObject({ status: "cancelled" });
    expect(await canAcquireLock(config, writerLock)).toBe(true);
  });

  it("rejects a pre-aborted OS-lock waiter before the held lock is released", async () => {
    const config = makeConfig(home);
    const entered = deferred();
    const release = deferred();
    const holder = withOsLock(
      config,
      "pre-aborted-waiter",
      undefined,
      async () => {
        entered.resolve();
        await release.promise;
      },
    );
    await entered.promise;

    const controller = new AbortController();
    controller.abort();
    let waiterBodyEntered = false;
    const waiter = withOsLock(
      config,
      "pre-aborted-waiter",
      controller.signal,
      async () => {
        waiterBodyEntered = true;
      },
    );
    const observed = waiter.then(
      () => ({ status: "resolved" as const }),
      (cause: unknown) => ({ status: "rejected" as const, cause }),
    );
    const firstTurn = await Promise.race([
      observed,
      new Promise<{ readonly status: "pending" }>((resolve) =>
        setImmediate(() => resolve({ status: "pending" })),
      ),
    ]);

    expect(firstTurn).toMatchObject({
      status: "rejected",
      cause: { code: "Cancelled" },
    });
    expect(waiterBodyEntered).toBe(false);
    expect(
      await canAcquireLock(
        config,
        Path.join(home, "locks", "pre-aborted-waiter.lock"),
      ),
    ).toBe(false);

    release.resolve();
    await holder;
    await observed;
  });

  it("publishes and replays a valid ContractMismatch for malformed payloads", async () => {
    const invocationId = "malformed-payload" as InvocationId;
    const input = {
      investigationId: id,
      invocationId,
      expectedSnapshot: snapshot,
      references: [],
      moduleSource: "malformed",
      commands: "reduce true .",
      timeoutMilliseconds: 1_000,
    } as const;
    let executions = 0;
    const first = await Effect.runPromise(
      engine.execute({
        descriptor: MaudeRunOperation,
        input,
        run: (async () => {
          executions += 1;
          return {
            snapshotId: snapshot,
            value: {
              snapshotId: snapshot,
              createdCommit: false,
            },
          };
        }) as never,
      }),
    );
    expect(first.receipt).toMatchObject({
      status: "failed",
      failure: { code: "ContractMismatch" },
    });
    expect(Schema.is(MaudeRunOperation.result)(first)).toBe(true);

    const directory = Path.join(workspace.artifactsPath, "maude", invocationId);
    const persistedResult = JSON.parse(
      await readFile(Path.join(directory, "result.json"), "utf8"),
    ) as unknown;
    const persistedReceipt = JSON.parse(
      await readFile(Path.join(directory, "receipt.json"), "utf8"),
    ) as unknown;
    expect(Schema.is(MaudeRunOperation.result)(persistedResult)).toBe(true);
    expect(persistedResult).toMatchObject({ receipt: persistedReceipt });

    const replay = await Effect.runPromise(
      engine.execute({
        descriptor: MaudeRunOperation,
        input,
        run: async () => {
          executions += 1;
          return {
            snapshotId: snapshot,
            value: {
              snapshotId: snapshot,
              stdoutTail: "must not run",
              stderrTail: "",
            },
          };
        },
      }),
    );
    expect(replay).toEqual(first);
    expect(executions).toBe(1);
  });

  it("normalizes a forged AttuneToolFailure tag before publication", async () => {
    const invocationId = "malformed-tagged-failure" as InvocationId;
    const result = await Effect.runPromise(
      engine.execute({
        descriptor: MaudeRunOperation,
        input: {
          investigationId: id,
          invocationId,
          expectedSnapshot: snapshot,
          references: [],
          moduleSource: "malformed",
          commands: "reduce true .",
          timeoutMilliseconds: 1_000,
        },
        run: async () => {
          throw {
            _tag: "AttuneToolFailure",
            code: "NotARealFailureCode",
            message: "forged",
          };
        },
      }),
    );
    expect(result.receipt).toMatchObject({
      status: "failed",
      failure: {
        code: "ContractMismatch",
        message: "operation threw a malformed AttuneToolFailure",
      },
    });
    expect(Schema.is(MaudeRunOperation.result)(result)).toBe(true);
  });

  it("validates detached bootstrap receipts before replay", async () => {
    let materializations = 0;
    const bootstrapStore = {
      initialize: async () => undefined,
      materialize: async () => {
        materializations += 1;
        return {
          investigationId: id,
          requestedRevision: "main",
          resolvedCommit: snapshot,
          branch: `attune/${id}`,
          manifest,
        };
      },
      withMount: async <A>(
        _id: InvestigationId,
        _signal: AbortSignal | undefined,
        use: (mounted: MountedWorkspace) => Promise<A>,
      ): Promise<A> => await use({ ...workspace, manifest }),
    } as unknown as WorkspaceStore;
    const bootstrapEngine = new InvocationEngine(
      makeConfig(home),
      bootstrapStore,
    );
    const invocationId = "bootstrap-receipt-tamper" as InvocationId;
    const input = {
      invocationId,
      remote: "/fixture",
      revision: "main",
      investigationId: id,
      references: [],
    } as const;
    await Effect.runPromise(bootstrapEngine.materialize(input));

    const receiptPath = Path.join(
      home,
      "bootstrap",
      "repository_materialize",
      invocationId,
      "receipt.json",
    );
    const receipt = JSON.parse(await readFile(receiptPath, "utf8")) as object;
    await writeFile(
      receiptPath,
      `${canonicalJson({ ...receipt, inputDigest: sha256("tampered") })}\n`,
    );

    await expect(
      Effect.runPromise(bootstrapEngine.materialize(input)),
    ).rejects.toMatchObject({
      code: "ContractMismatch",
      message: "persisted result and detached receipt disagree",
    });

    const resultPath = Path.join(
      home,
      "bootstrap",
      "repository_materialize",
      invocationId,
      "result.json",
    );
    const result = JSON.parse(await readFile(resultPath, "utf8")) as {
      readonly receipt: object;
    };
    const correlatedTamper = {
      ...result.receipt,
      operation: "checkpoint",
    };
    await Promise.all([
      writeFile(receiptPath, `${canonicalJson(correlatedTamper)}\n`),
      writeFile(
        resultPath,
        `${canonicalJson({ ...result, receipt: correlatedTamper })}\n`,
      ),
    ]);
    await expect(
      Effect.runPromise(bootstrapEngine.materialize(input)),
    ).rejects.toMatchObject({
      code: "ContractMismatch",
      message:
        "repository_materialize returned a receipt that does not correlate with its request and result",
    });
    expect(materializations).toBe(1);
  });

  it("validates the persisted allocation before bootstrap replay", async () => {
    let materializations = 0;
    const bootstrapStore = {
      initialize: async () => undefined,
      materialize: async () => {
        materializations += 1;
        return {
          investigationId: id,
          requestedRevision: "main",
          resolvedCommit: snapshot,
          branch: `attune/${id}`,
          manifest,
        };
      },
      withMount: async <A>(
        _id: InvestigationId,
        _signal: AbortSignal | undefined,
        use: (mounted: MountedWorkspace) => Promise<A>,
      ): Promise<A> => await use({ ...workspace, manifest }),
    } as unknown as WorkspaceStore;
    const bootstrapEngine = new InvocationEngine(
      makeConfig(home),
      bootstrapStore,
    );
    const invocationId = "bootstrap-allocation-tamper" as InvocationId;
    const input = {
      invocationId,
      remote: "/fixture",
      revision: "main",
      investigationId: id,
      references: [],
    } as const;
    await Effect.runPromise(bootstrapEngine.materialize(input));

    const allocationPath = Path.join(
      home,
      "bootstrap",
      "repository_materialize",
      invocationId,
      "allocation.json",
    );
    await writeFile(
      allocationPath,
      `${canonicalJson({
        investigationId: "01K22222222222222222222222",
      })}\n`,
    );
    await expect(
      Effect.runPromise(bootstrapEngine.materialize(input)),
    ).rejects.toMatchObject({
      code: "ContractMismatch",
      message:
        "persisted materialization allocation disagrees with request or terminal result",
    });

    await writeFile(
      allocationPath,
      `${canonicalJson({ investigationId: "invalid" })}\n`,
    );
    await expect(
      Effect.runPromise(bootstrapEngine.materialize(input)),
    ).rejects.toMatchObject({
      code: "ContractMismatch",
      message: "persisted materialization allocation is invalid",
    });
    expect(materializations).toBe(1);
  });
});
