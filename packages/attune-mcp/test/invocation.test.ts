import { spawn } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as Path from "node:path";

import { Effect, Fiber, Schema } from "effect";

import { type InvestigationId, type InvocationId } from "../src/contract/schemas.js";
import { type InvocationContext, InvocationEngine } from "../src/investigation/invocation.js";
import type {
  InvestigationManifest,
  MountedWorkspace,
  WorkspaceStore,
} from "../src/investigation/workspace.js";
import { sha256, type ActivityGate, type RuntimeConfig } from "../src/platform/core.js";
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
const run = Effect.runPromise;

const rejects = <A, E>(effect: Effect.Effect<A, E>, expected: object): Promise<void> =>
  expect(run(effect)).rejects.toMatchObject(expected);

const invocationInput = (invocationId: InvocationId) =>
  ({
    investigationId: id,
    invocationId,
    expectedSnapshot: snapshot,
    references: [],
  }) as const;

const maudeInput = (invocationId: InvocationId, moduleSource: string) =>
  ({
    ...invocationInput(invocationId),
    moduleSource,
    commands: "reduce true .",
    timeoutMilliseconds: 1_000,
  }) as const;

const checkpointInput = (invocationId: InvocationId) =>
  ({ ...invocationInput(invocationId), policy: "require-clean" }) as const;

const materializeInput = (invocationId: InvocationId) =>
  ({
    invocationId,
    remote: "/fixture",
    revision: "main",
    investigationId: id,
    references: [],
  }) as const;

type InvocationRun = Parameters<InvocationEngine["execute"]>[0]["run"];

const isMaudeResult = Schema.is(AttuneToolkit.tools.maude_run.successSchema);
const expectValidMaude = (value: unknown): void => expect(isMaudeResult(value)).toBe(true);

const tamperDigest = async (path: string): Promise<void> => {
  const value = await readJson<object>(path);
  await writeCanonicalJson(path, {
    ...value,
    inputDigest: sha256("tampered"),
  });
};

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};

const drainingRun = () => {
  const entered = deferred();
  const cancelled = deferred();
  const release = deferred();
  return {
    entered,
    cancelled,
    release,
    run: async (context: InvocationContext): Promise<never> => {
      context.setSnapshot(snapshot);
      context.signal.addEventListener("abort", cancelled.resolve, {
        once: true,
      });
      entered.resolve();
      await release.promise;
      throw new Error("native operation drained");
    },
  };
};

const canAcquireLock = async (config: RuntimeConfig, lockPath: string): Promise<boolean> =>
  await new Promise<boolean>((resolve, reject) => {
    const args = ["-x", "-n", lockPath, config.node, "-e", "process.exit(0)"];
    const child = spawn(config.flock, args, { shell: false, stdio: "ignore" });
    child.once("error", reject);
    child.once("exit", (code) => resolve(code === 0));
  });

describe("idempotent receipt boundary", () => {
  let home: string;
  let workspace: MountedWorkspace;
  let manifest: InvestigationManifest;
  let engine: InvocationEngine;
  let executions: number;

  const withMount = async <A>(
    _id: InvestigationId,
    _signal: AbortSignal | undefined,
    use: (mounted: MountedWorkspace) => Promise<A>,
  ): Promise<A> => await use({ ...workspace, manifest });

  beforeEach(async () => {
    home = await mkdtemp(Path.join(tmpdir(), "attune-invocation-"));
    const repositoryPath = Path.join(home, "repo");
    const artifactsPath = Path.join(home, "artifacts");
    manifest = fixtureManifest();
    executions = 0;
    workspace = {
      mountPath: home,
      repositoryPath,
      artifactsPath,
      manifest,
    };
    const store = { withMount } as unknown as WorkspaceStore;
    engine = new InvocationEngine(makeConfig(home), store);
  });

  afterEach(() => rm(home, { recursive: true, force: true }));

  const maudeOperation = (input: ReturnType<typeof maudeInput>, execute: InvocationRun) =>
    engine.execute({ name: "maude_run", input, run: execute } as never);

  const operation = (invocationId: InvocationId, value: string) =>
    maudeOperation(maudeInput(invocationId, value), async (context: InvocationContext) => {
      executions += 1;
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
      withMount,
    } as unknown as WorkspaceStore;
    return {
      engine: new InvocationEngine(makeConfig(home), store),
      materializations: () => materializations,
    };
  };

  const artifactFile = (tool: string, invocationId: InvocationId, file: string) =>
    Path.join(workspace.artifactsPath, tool, invocationId, file);

  const bootstrapFile = (invocationId: InvocationId, file: string) =>
    Path.join(home, "bootstrap", "repository_materialize", invocationId, file);

  const bootstrapFailures = {
    detached: "persisted result and detached receipt disagree",
    correlated:
      "repository_materialize returned a receipt that does not correlate with its request and result",
    allocation: "persisted materialization allocation disagrees with request or terminal result",
    malformed: "persisted materialization allocation is invalid",
  } as const;

  const bootstrapReplay = async (kind: keyof typeof bootstrapFailures): Promise<number> => {
    const invocationId = `bootstrap-${kind}` as InvocationId;
    const fixture = bootstrap();
    const input = materializeInput(invocationId);
    await run(fixture.engine.materialize(input));
    const file = (name: string) => bootstrapFile(invocationId, name);
    if (kind === "detached") await tamperDigest(file("receipt.json"));
    else if (kind === "correlated") {
      const resultPath = file("result.json");
      const result = await readJson<{ readonly receipt: object }>(resultPath);
      const receipt = { ...result.receipt, operation: "checkpoint" };
      await Promise.all([
        writeCanonicalJson(file("receipt.json"), receipt),
        writeCanonicalJson(resultPath, { ...result, receipt }),
      ]);
    } else {
      await writeCanonicalJson(file("allocation.json"), {
        investigationId: kind === "allocation" ? "01K22222222222222222222222" : "invalid",
      });
    }
    await rejects(fixture.engine.materialize(input), {
      code: "ContractMismatch",
      message: bootstrapFailures[kind],
    });
    return fixture.materializations();
  };

  it("serializes concurrent duplicates and returns the original receipt", async () => {
    const invocationId = "duplicate-1" as InvocationId;
    const [left, right] = await Promise.all([
      run(operation(invocationId, "exact")),
      run(operation(invocationId, "exact")),
    ]);
    expect(executions).toBe(1);
    expect(left).toEqual(right);
    const directory = Path.join(workspace.artifactsPath, "maude", invocationId);
    expect(await readJson(Path.join(directory, "receipt.json"))).toMatchObject({
      status: "succeeded",
      snapshotId: snapshot,
    });
    expect(await readFile(Path.join(directory, "native.txt"), "utf8")).toBe("exact");
  });

  it("rejects changed input and observed incompleteness without replay", async () => {
    const invocationId = "conflict-1" as InvocationId;
    await run(operation(invocationId, "first"));
    await rejects(operation(invocationId, "changed"), {
      code: "InvocationConflict",
    });
    expect(executions).toBe(1);

    const incompleteId = "incomplete-1" as InvocationId;
    const input = maudeInput(incompleteId, "lost");
    const directory = Path.join(workspace.artifactsPath, "maude", incompleteId);
    await mkdir(directory, { recursive: true });
    await writeCanonicalJson(Path.join(directory, "request.json"), input);
    await rejects(operation(incompleteId, "lost"), {
      code: "InvocationIncomplete",
    });
    expect(executions).toBe(1);
  });

  it("returns completed retries after finalization but accepts no new work", async () => {
    const completed = "before-finalization" as InvocationId;
    const first = await run(operation(completed, "evidence"));
    manifest = {
      ...manifest,
      finalizedAt: new Date().toISOString(),
      finalSnapshot: snapshot,
    };
    expect(await run(operation(completed, "evidence"))).toEqual(first);
    await rejects(operation("after-finalization" as InvocationId, "new"), {
      code: "Finalized",
    });
    expect(executions).toBe(1);
  });

  it("rejects divergence between the embedded and detached receipt", async () => {
    const invocationId = "detached-receipt-tamper" as InvocationId;
    const input = maudeInput(invocationId, "evidence");
    await run(operation(invocationId, input.moduleSource));

    const receiptPath = artifactFile("maude", invocationId, "receipt.json");
    await tamperDigest(receiptPath);

    await rejects(engine.lookupTerminal("maude_run", input), {
      code: "ContractMismatch",
      message: "persisted result and detached receipt disagree",
    });
    expect(executions).toBe(1);
  });

  it("keeps the activity gate closed while cancelled exclusive work drains", async () => {
    const invocationId = "cancelled-exclusive" as InvocationId;
    const draining = drainingRun();
    let sharedEntered = false;
    let interruptCompleted = false;
    const exclusive = engine.execute({
      name: "investigation_finalize",
      input: invocationInput(invocationId),
      run: draining.run,
    });

    const exclusiveFiber = Effect.runFork(exclusive);
    await draining.entered.promise;
    const interruption = run(Fiber.interrupt(exclusiveFiber)).then(() => {
      interruptCompleted = true;
    });
    await draining.cancelled.promise;

    const gateFor = Reflect.get(engine, "gate") as (investigationId: InvestigationId) => ActivityGate;
    const sharedFiber = Effect.runFork(
      gateFor(id).shared(
        Effect.sync(() => {
          sharedEntered = true;
        }),
      ),
    );

    expect(interruptCompleted).toBe(false);
    expect(sharedEntered).toBe(false);
    draining.release.resolve();
    await interruption;
    await run(Fiber.join(sharedFiber));
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
    const draining = drainingRun();
    let receiptAtSecondEntry: unknown;
    const first = engine.execute({
      name: "repository_checkpoint",
      input: checkpointInput(firstId),
      run: draining.run,
    });
    const second = engine.execute({
      name: "repository_checkpoint",
      input: checkpointInput(secondId),
      run: async (context) => {
        receiptAtSecondEntry = await readJson(artifactFile("repository", firstId, "receipt.json"));
        context.setSnapshot(snapshot);
        return {
          snapshotId: snapshot,
          value: { snapshotId: snapshot, createdCommit: false },
        };
      },
    });

    const firstFiber = Effect.runFork(first);
    await draining.entered.promise;
    const interruption = run(Fiber.interrupt(firstFiber));
    await draining.cancelled.promise;

    const writerLock = Path.join(home, "locks", `writer-${id}.lock`);
    expect(await canAcquireLock(config, writerLock)).toBe(false);
    let waiterBodyEntered = false;
    await expect(
      withOsLock(config, `writer-${id}`, AbortSignal.abort(), async () => {
        waiterBodyEntered = true;
      }),
    ).rejects.toMatchObject({ code: "Cancelled" });
    expect(waiterBodyEntered).toBe(false);
    const secondFiber = Effect.runFork(second);
    expect(receiptAtSecondEntry).toBeUndefined();

    draining.release.resolve();
    await interruption;
    const secondResult = await run(Fiber.join(secondFiber));
    expect(secondResult.receipt.status).toBe("succeeded");
    expect(receiptAtSecondEntry).toMatchObject({ status: "cancelled" });
    expect(await canAcquireLock(config, writerLock)).toBe(true);
  });

  it("publishes and replays a valid ContractMismatch for malformed payloads", async () => {
    const invocationId = "malformed-payload" as InvocationId;
    const input = maudeInput(invocationId, "malformed");
    const first = await run(
      maudeOperation(input, (async () => {
        executions += 1;
        return {
          snapshotId: snapshot,
          value: {
            snapshotId: snapshot,
            createdCommit: false,
          },
        };
      }) as never),
    );
    expect(first.receipt).toMatchObject({
      status: "failed",
      failure: { code: "ContractMismatch" },
    });
    expectValidMaude(first);

    const directory = Path.join(workspace.artifactsPath, "maude", invocationId);
    const persistedResult = await readJson(Path.join(directory, "result.json"));
    const persistedReceipt = await readJson(Path.join(directory, "receipt.json"));
    expectValidMaude(persistedResult);
    expect(persistedResult).toMatchObject({ receipt: persistedReceipt });

    const replay = await run(operation(invocationId, input.moduleSource));
    expect(replay).toEqual(first);
    expect(executions).toBe(1);
  });

  it("normalizes a forged AttuneToolFailure tag before publication", async () => {
    const invocationId = "malformed-tagged-failure" as InvocationId;
    const result = await run(
      maudeOperation(maudeInput(invocationId, "malformed"), async () => {
        throw {
          _tag: "AttuneToolFailure",
          code: "NotARealFailureCode",
          message: "forged",
        };
      }),
    );
    expect(result.receipt).toMatchObject({
      status: "failed",
      failure: {
        code: "ContractMismatch",
        message: "operation threw a malformed AttuneToolFailure",
      },
    });
    expectValidMaude(result);
  });

  it("validates detached bootstrap receipts before replay", async () => {
    expect([await bootstrapReplay("detached"), await bootstrapReplay("correlated")]).toEqual([1, 1]);
  });

  it("validates the persisted allocation before bootstrap replay", async () => {
    expect([await bootstrapReplay("allocation"), await bootstrapReplay("malformed")]).toEqual([1, 1]);
  });
});
