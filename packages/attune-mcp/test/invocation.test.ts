import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as Path from "node:path";

import { Effect, Fiber, Schema } from "effect";

import {
  type InvestigationId,
  type InvocationId,
} from "../src/contract/schemas.js";
import { InvocationEngine } from "../src/investigation/invocation.js";
import type {
  InvestigationManifest,
  MountedWorkspace,
  WorkspaceStore,
} from "../src/investigation/workspace.js";
import {
  sha256,
  type ActivityGate,
  type RuntimeConfig,
} from "../src/platform/core.js";
import { withOsLock } from "../src/platform/lock.js";
import { AttuneToolkit } from "../src/tools/registry.js";
import {
  FIXTURE_INVESTIGATION_ID as id,
  FIXTURE_SNAPSHOT as snapshot,
  fixtureManifest,
  fixtureRuntimeConfig,
  readJson,
  writeCanonicalJson,
} from "./fixtures.js";

const makeConfig = fixtureRuntimeConfig;

const maudeInput = (invocationId: InvocationId, moduleSource: string) =>
  ({
    investigationId: id,
    invocationId,
    expectedSnapshot: snapshot,
    references: [],
    moduleSource,
    commands: "reduce true .",
    timeoutMilliseconds: 1_000,
  }) as const;

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
    home = await mkdtemp(Path.join(tmpdir(), "attune-invocation-"));
    const repositoryPath = Path.join(home, "repo");
    const artifactsPath = Path.join(home, "artifacts");
    await Promise.all([
      mkdir(repositoryPath, { recursive: true }),
      mkdir(artifactsPath, { recursive: true }),
    ]);
    manifest = fixtureManifest();
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
      name: "maude_run",
      input: maudeInput(invocationId, value),
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

  const bootstrap = () => {
    let materializations = 0;
    const store = {
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
    return {
      engine: new InvocationEngine(makeConfig(home), store),
      materializations: () => materializations,
    };
  };

  const artifactFile = (
    tool: string,
    invocationId: InvocationId,
    file: string,
  ) => Path.join(workspace.artifactsPath, tool, invocationId, file);

  const bootstrapFile = (invocationId: InvocationId, file: string) =>
    Path.join(home, "bootstrap", "repository_materialize", invocationId, file);

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
    expect(await readJson(Path.join(directory, "receipt.json"))).toMatchObject({
      status: "succeeded",
      snapshotId: snapshot,
    });
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
    const input = maudeInput(incompleteId, "lost");
    const directory = Path.join(workspace.artifactsPath, "maude", incompleteId);
    await mkdir(directory, { recursive: true });
    await writeCanonicalJson(Path.join(directory, "request.json"), input);
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
    const input = maudeInput(invocationId, "evidence");
    await Effect.runPromise(
      operation(invocationId, input.moduleSource, () => executions++),
    );

    const receiptPath = artifactFile("maude", invocationId, "receipt.json");
    const receipt = await readJson<object>(receiptPath);
    await writeCanonicalJson(receiptPath, {
      ...receipt,
      inputDigest: sha256("tampered"),
    });

    await expect(
      Effect.runPromise(engine.lookupTerminal("maude_run", input)),
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
      name: "investigation_finalize",
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

    const receipt = await readJson<{ readonly status: string }>(
      artifactFile("repository", invocationId, "receipt.json"),
    );
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
      name: "repository_checkpoint",
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
      name: "repository_checkpoint",
      input: {
        investigationId: id,
        invocationId: secondId,
        expectedSnapshot: snapshot,
        references: [],
        policy: "require-clean",
      },
      run: async (context) => {
        receiptAtSecondEntry = await readJson(
          artifactFile("repository", firstId, "receipt.json"),
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
    const input = maudeInput(invocationId, "malformed");
    let executions = 0;
    const first = await Effect.runPromise(
      engine.execute({
        name: "maude_run",
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
    expect(Schema.is(AttuneToolkit.tools.maude_run.successSchema)(first)).toBe(
      true,
    );

    const directory = Path.join(workspace.artifactsPath, "maude", invocationId);
    const persistedResult = await readJson(Path.join(directory, "result.json"));
    const persistedReceipt = await readJson(
      Path.join(directory, "receipt.json"),
    );
    expect(
      Schema.is(AttuneToolkit.tools.maude_run.successSchema)(persistedResult),
    ).toBe(true);
    expect(persistedResult).toMatchObject({ receipt: persistedReceipt });

    const replay = await Effect.runPromise(
      engine.execute({
        name: "maude_run",
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
        name: "maude_run",
        input: maudeInput(invocationId, "malformed"),
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
    expect(Schema.is(AttuneToolkit.tools.maude_run.successSchema)(result)).toBe(
      true,
    );
  });

  it("validates detached bootstrap receipts before replay", async () => {
    const fixture = bootstrap();
    const bootstrapEngine = fixture.engine;
    const invocationId = "bootstrap-receipt-tamper" as InvocationId;
    const input = {
      invocationId,
      remote: "/fixture",
      revision: "main",
      investigationId: id,
      references: [],
    } as const;
    await Effect.runPromise(bootstrapEngine.materialize(input));

    const receiptPath = bootstrapFile(invocationId, "receipt.json");
    const receipt = await readJson<object>(receiptPath);
    await writeCanonicalJson(receiptPath, {
      ...receipt,
      inputDigest: sha256("tampered"),
    });

    await expect(
      Effect.runPromise(bootstrapEngine.materialize(input)),
    ).rejects.toMatchObject({
      code: "ContractMismatch",
      message: "persisted result and detached receipt disagree",
    });

    const resultPath = bootstrapFile(invocationId, "result.json");
    const result = await readJson<{
      readonly receipt: object;
    }>(resultPath);
    const correlatedTamper = {
      ...result.receipt,
      operation: "checkpoint",
    };
    await Promise.all([
      writeCanonicalJson(receiptPath, correlatedTamper),
      writeCanonicalJson(resultPath, {
        ...result,
        receipt: correlatedTamper,
      }),
    ]);
    await expect(
      Effect.runPromise(bootstrapEngine.materialize(input)),
    ).rejects.toMatchObject({
      code: "ContractMismatch",
      message:
        "repository_materialize returned a receipt that does not correlate with its request and result",
    });
    expect(fixture.materializations()).toBe(1);
  });

  it("validates the persisted allocation before bootstrap replay", async () => {
    const fixture = bootstrap();
    const bootstrapEngine = fixture.engine;
    const invocationId = "bootstrap-allocation-tamper" as InvocationId;
    const input = {
      invocationId,
      remote: "/fixture",
      revision: "main",
      investigationId: id,
      references: [],
    } as const;
    await Effect.runPromise(bootstrapEngine.materialize(input));

    const allocationPath = bootstrapFile(invocationId, "allocation.json");
    await writeCanonicalJson(allocationPath, {
      investigationId: "01K22222222222222222222222",
    });
    await expect(
      Effect.runPromise(bootstrapEngine.materialize(input)),
    ).rejects.toMatchObject({
      code: "ContractMismatch",
      message:
        "persisted materialization allocation disagrees with request or terminal result",
    });

    await writeCanonicalJson(allocationPath, {
      investigationId: "invalid",
    });
    await expect(
      Effect.runPromise(bootstrapEngine.materialize(input)),
    ).rejects.toMatchObject({
      code: "ContractMismatch",
      message: "persisted materialization allocation is invalid",
    });
    expect(fixture.materializations()).toBe(1);
  });
});
