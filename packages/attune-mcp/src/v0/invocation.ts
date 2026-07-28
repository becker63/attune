import { mkdir, readFile } from "node:fs/promises";
import * as Path from "node:path";

import { Effect, Schema } from "effect";

import {
  isAttuneReceipt,
  resolveInvocationOperation,
  resolveWriterMode,
  narrowOperationErrors,
  validateOperationResult,
  type AnyToolOperation,
  type InvestigationBoundInput,
  type OperationError,
  type OperationResultOf,
  type OperationSuccessPayload,
  type OperationWireInput,
  type WriterMode,
} from "../investigation/operation.js";
import { RepositoryMaterializeOperation } from "../tools/repository/operation.js";
import {
  AttuneFailure,
  AttuneToolFailure,
  type AttuneReceipt,
  type CancelledReceipt,
  type FailedReceipt,
  type FailureCode,
  type FreeFormReference,
  type FullGitCommit,
  InvestigationId,
  type InvocationId,
  type RepositoryMaterializeResult,
  type ToolName,
} from "./contracts.js";
import {
  allocateInvestigationId,
  artifactReference,
  canonicalJson,
  fail,
  fileExists,
  isNodeError,
  makeActivityGates,
  readJson,
  sha256,
  type RuntimeConfig,
  writeNew,
} from "./core.js";
import { withOsLock } from "./lock.js";
import {
  type InvestigationManifest,
  type MountedWorkspace,
  WorkspaceStore,
} from "./workspace.js";

interface RetainedArtifact {
  readonly path: string;
  readonly complete: boolean;
}

const BootstrapAllocation = Schema.Struct({
  investigationId: InvestigationId,
});
type BootstrapAllocation = typeof BootstrapAllocation.Type;

const readBootstrapAllocation = async (
  path: string,
): Promise<BootstrapAllocation> => {
  const candidate = await readJson<unknown>(path);
  if (
    !Schema.is(BootstrapAllocation)(candidate) ||
    typeof candidate !== "object" ||
    candidate === null ||
    Object.keys(candidate).length !== 1
  ) {
    throw fail(
      "ContractMismatch",
      "persisted materialization allocation is invalid",
      { observed: boundedFailureText(candidate, 8_192), path },
    );
  }
  return candidate;
};

const assertBootstrapAllocation = (
  input: {
    readonly investigationId?: InvestigationId;
  },
  allocation: BootstrapAllocation,
  result: RepositoryMaterializeResult,
): void => {
  const resultInvestigationId =
    result.receipt.status === "succeeded"
      ? Reflect.get(result, "investigationId")
      : undefined;
  if (
    result.receipt.investigationId !== allocation.investigationId ||
    (input.investigationId !== undefined &&
      input.investigationId !== allocation.investigationId) ||
    (result.receipt.status === "succeeded" &&
      resultInvestigationId !== allocation.investigationId)
  ) {
    throw fail(
      "ContractMismatch",
      "persisted materialization allocation disagrees with request or terminal result",
      {
        expected: allocation.investigationId,
        observed: [
          input.investigationId,
          resultInvestigationId,
          result.receipt.investigationId,
        ].join(","),
      },
    );
  }
};

export interface InvocationContext {
  readonly directory: string;
  readonly workspace: MountedWorkspace;
  readonly signal: AbortSignal;
  readonly writeArtifact: (
    relative: string,
    bytes: string | Uint8Array,
    complete?: boolean,
  ) => Promise<string>;
  readonly retainArtifact: (relative: string, complete?: boolean) => void;
  readonly setSnapshot: (snapshot: FullGitCommit) => void;
}

/** Stable request identity persisted before native work begins. */
export interface InvocationWireIdentity {
  readonly investigationId: InvestigationId;
  readonly invocationId: InvocationId;
  readonly references: readonly FreeFormReference[];
}

/** Active workspace identity required by the durable invocation engine. */
export type DurableInvocationInput = InvestigationBoundInput &
  InvocationWireIdentity;

interface InvocationCompletionFor<Operation extends AnyToolOperation> {
  readonly snapshotId: FullGitCommit;
  readonly value: OperationSuccessPayload<Operation>;
}

/**
 * Successful native value before the engine attaches its terminal receipt.
 *
 * @typeParam Operation - Descriptor that determines the exact value payload.
 */
export type InvocationCompletion<Operation extends AnyToolOperation> =
  Operation extends AnyToolOperation
    ? InvocationCompletionFor<Operation>
    : never;

interface InvocationSpecFor<Operation extends AnyToolOperation> {
  readonly descriptor: Operation;
  readonly input: OperationWireInput<NoInfer<Operation>> &
    DurableInvocationInput;
  readonly run: (
    context: InvocationContext,
  ) => Promise<InvocationCompletionFor<NoInfer<Operation>>>;
}

/**
 * One descriptor-bound durable invocation.
 *
 * @remarks
 * `NoInfer` keeps the descriptor authoritative: a callback returning another
 * operation's payload cannot widen the generic to make the mismatch compile.
 */
export type InvocationSpec<Operation extends AnyToolOperation> =
  Operation extends AnyToolOperation ? InvocationSpecFor<Operation> : never;

type DurableInvocationSpec<Operation extends AnyToolOperation> =
  Operation extends AnyToolOperation
    ? OperationWireInput<Operation> extends DurableInvocationInput
      ? InvocationSpec<Operation>
      : never
    : never;

type DurableTerminalLookupArguments<Operation extends AnyToolOperation> =
  Operation extends AnyToolOperation
    ? OperationWireInput<Operation> extends DurableInvocationInput
      ? [descriptor: Operation, input: OperationWireInput<NoInfer<Operation>>]
      : never
    : never;

const resolveInvocationOperationFor = resolveInvocationOperation as <
  Operation extends AnyToolOperation,
>(
  operation: Operation,
  input: OperationWireInput<Operation>,
) => string;

const resolveWriterModeFor = resolveWriterMode as <
  Operation extends AnyToolOperation,
>(
  operation: Operation,
  input: OperationWireInput<Operation>,
) => WriterMode;

const validateInvocationResult = validateOperationResult as <
  Operation extends AnyToolOperation,
  Requirements,
>(
  operation: Operation,
  input: OperationWireInput<Operation>,
  effect: Effect.Effect<unknown, AttuneToolFailure, Requirements>,
) => Effect.Effect<
  OperationResultOf<Operation>,
  OperationError<Operation>,
  Requirements
>;

const boundedFailureText = (value: unknown, maximum: number): string => {
  const text = value instanceof Error ? value.message : String(value);
  const nonEmpty =
    text.length === 0 ? "operation failed without error details" : text;
  return nonEmpty.slice(0, maximum);
};

const hasAttuneToolFailureTag = (
  cause: unknown,
): cause is { readonly _tag: "AttuneToolFailure" } =>
  typeof cause === "object" &&
  cause !== null &&
  "_tag" in cause &&
  cause._tag === "AttuneToolFailure";

const taggedFailureData = (cause: unknown): AttuneFailure | undefined => {
  if (!hasAttuneToolFailureTag(cause)) return undefined;
  const candidate = {
    code: Reflect.get(cause, "code"),
    message: Reflect.get(cause, "message"),
    ...(Reflect.get(cause, "expected") === undefined
      ? {}
      : { expected: Reflect.get(cause, "expected") }),
    ...(Reflect.get(cause, "observed") === undefined
      ? {}
      : { observed: Reflect.get(cause, "observed") }),
    ...(Reflect.get(cause, "path") === undefined
      ? {}
      : { path: Reflect.get(cause, "path") }),
  };
  return Schema.is(AttuneFailure)(candidate) ? candidate : undefined;
};

const normalizedFailureData = (
  cause: unknown,
  fallbackCode: FailureCode,
): AttuneFailure => {
  const tagged = taggedFailureData(cause);
  if (tagged !== undefined) return tagged;
  if (hasAttuneToolFailureTag(cause)) {
    return {
      code: "ContractMismatch",
      message: "operation threw a malformed AttuneToolFailure",
      observed: boundedFailureText(Reflect.get(cause, "code"), 8_192),
    };
  }
  return {
    code: fallbackCode,
    message: boundedFailureText(cause, 16_384),
  };
};

const normalizedToolFailure = (
  cause: unknown,
  fallbackCode: FailureCode,
): AttuneToolFailure =>
  new AttuneToolFailure(normalizedFailureData(cause, fallbackCode));

const contractMismatchFailure = (
  message: string,
  cause: unknown,
): AttuneFailure => ({
  code: "ContractMismatch",
  message,
  observed: boundedFailureText(cause, 8_192),
});

const failureData = (cause: unknown, signal: AbortSignal): AttuneFailure =>
  normalizedFailureData(
    cause,
    signal.aborted ? "Cancelled" : "ProcessExitFailure",
  );

const receiptFailure = (
  base: Omit<
    FailedReceipt,
    "status" | "failure" | "snapshotId" | "completedAt"
  >,
  failure: AttuneFailure,
  snapshot: FullGitCommit | undefined,
  completedAt: string,
  cancelled: boolean,
): FailedReceipt | CancelledReceipt => {
  const terminal = {
    ...base,
    ...(snapshot === undefined ? {} : { snapshotId: snapshot }),
    failure,
    completedAt,
  };
  return cancelled
    ? { ...terminal, status: "cancelled" }
    : { ...terminal, status: "failed" };
};

/**
 * Bridges abortable Promise work into Effect without abandoning its finalizer
 * scope when a fiber is interrupted.
 *
 * @remarks
 * `Effect.tryPromise` reports interruption as soon as it aborts its signal even
 * though JavaScript cannot cancel the underlying Promise. This callback returns
 * an interruption finalizer that aborts cooperatively and then drains that same
 * Promise. Any enclosing semaphore permit and OS-lock scope therefore remain
 * held until the native body has stopped and persisted its terminal state.
 */
const drainingTryPromise = <A, E>(
  run: (signal: AbortSignal) => Promise<A>,
  mapFailure: (cause: unknown, signal: AbortSignal) => E,
): Effect.Effect<A, E> =>
  Effect.callback<A, E>((resume) => {
    const controller = new AbortController();
    const running = Promise.resolve().then(
      async () => await run(controller.signal),
    );
    running.then(
      (value) => resume(Effect.succeed(value)),
      (cause: unknown) =>
        resume(Effect.fail(mapFailure(cause, controller.signal))),
    );
    const drained = running.then(
      () => undefined,
      () => undefined,
    );
    return Effect.sync(() => controller.abort()).pipe(
      Effect.andThen(Effect.promise(() => drained)),
    );
  });

export class InvocationEngine {
  private readonly gate = makeActivityGates();

  constructor(
    readonly config: RuntimeConfig,
    readonly workspaces: WorkspaceStore,
  ) {}

  private directory(
    workspace: MountedWorkspace,
    tool: ToolName,
    invocationId: InvocationId,
  ): string {
    return Path.join(workspace.artifactsPath, tool, invocationId);
  }

  private async lookup(
    workspace: MountedWorkspace,
    tool: ToolName,
    invocationId: InvocationId,
    requestBytes: string,
  ): Promise<unknown> {
    const directory = this.directory(workspace, tool, invocationId);
    if (!(await fileExists(directory))) return undefined;
    const requestPath = Path.join(directory, "request.json");
    if (!(await fileExists(requestPath))) {
      throw fail("InvocationIncomplete", "invocation directory has no request");
    }
    if ((await readFile(requestPath, "utf8")) !== requestBytes) {
      throw fail(
        "InvocationConflict",
        "invocation identifier has another input",
      );
    }
    const receiptPath = Path.join(directory, "receipt.json");
    if (!(await fileExists(receiptPath))) {
      throw fail("InvocationIncomplete", "accepted invocation has no receipt");
    }
    const resultPath = Path.join(directory, "result.json");
    if (!(await fileExists(resultPath))) {
      throw fail("InvocationIncomplete", "terminal invocation has no result");
    }
    const [receipt, result] = await Promise.all([
      readJson<unknown>(receiptPath),
      readJson<unknown>(resultPath),
    ]);
    const embeddedReceipt =
      typeof result === "object" && result !== null
        ? Reflect.get(result, "receipt")
        : undefined;
    if (
      embeddedReceipt === undefined ||
      canonicalJson(embeddedReceipt) !== canonicalJson(receipt)
    ) {
      throw fail(
        "ContractMismatch",
        "persisted result and detached receipt disagree",
      );
    }
    return result;
  }

  execute<const Operation extends AnyToolOperation>(
    spec: DurableInvocationSpec<Operation>,
  ): Effect.Effect<OperationResultOf<Operation>, OperationError<Operation>>;
  execute<const Operation extends AnyToolOperation>(
    spec: InvocationSpecFor<Operation> &
      (OperationWireInput<Operation> extends DurableInvocationInput
        ? unknown
        : never),
  ): Effect.Effect<OperationResultOf<Operation>, OperationError<Operation>> {
    const requestBytes = `${canonicalJson(spec.input)}\n`;
    const inputDigest = sha256(requestBytes);
    const tool = spec.descriptor.invocation.tool;
    const operation = resolveInvocationOperationFor(
      spec.descriptor,
      spec.input,
    );
    const writerMode = resolveWriterModeFor(spec.descriptor, spec.input);
    const lockKey = `invocation-${spec.input.investigationId}-${tool}-${spec.input.invocationId}`;
    const execution = drainingTryPromise(
      async (signal) =>
        await withOsLock(this.config, lockKey, signal, async () => {
          const existing = await this.workspaces.withMount(
            spec.input.investigationId,
            signal,
            async (workspace) =>
              await this.lookup(
                workspace,
                tool,
                spec.input.invocationId,
                requestBytes,
              ),
          );
          if (existing !== undefined) return existing;

          return await this.workspaces.withMount(
            spec.input.investigationId,
            signal,
            async (workspace) => {
              const retry = await this.lookup(
                workspace,
                tool,
                spec.input.invocationId,
                requestBytes,
              );
              if (retry !== undefined) return retry;
              if (workspace.manifest.finalizedAt !== undefined) {
                throw fail("Finalized", "investigation is finalized");
              }
              const perform = async () =>
                await this.acceptAndRun(
                  spec,
                  workspace,
                  requestBytes,
                  inputDigest,
                  operation,
                  signal,
                );
              return writerMode !== "reader"
                ? await withOsLock(
                    this.config,
                    `writer-${spec.input.investigationId}`,
                    signal,
                    perform,
                  )
                : await perform();
            },
          );
        }),
      (cause, signal) =>
        normalizedToolFailure(
          cause,
          signal.aborted || activitySignalAborted(cause)
            ? "Cancelled"
            : "AgentFsFailure",
        ),
    );
    const activity = (
      writerMode === "exclusive-writer"
        ? this.gate(spec.input.investigationId).exclusive
        : this.gate(spec.input.investigationId).shared
    )(execution);
    return validateInvocationResult(spec.descriptor, spec.input, activity);
  }

  private async acceptAndRun<Operation extends AnyToolOperation>(
    spec: InvocationSpecFor<Operation>,
    workspace: MountedWorkspace,
    requestBytes: string,
    inputDigest: ReturnType<typeof sha256>,
    operation: string,
    signal: AbortSignal,
  ): Promise<unknown> {
    const tool = spec.descriptor.invocation.tool;
    const directory = this.directory(workspace, tool, spec.input.invocationId);
    await mkdir(Path.dirname(directory), { recursive: true, mode: 0o700 });
    await mkdir(directory, { recursive: false, mode: 0o700 });
    await writeNew(Path.join(directory, "request.json"), requestBytes);
    await writeNew(
      Path.join(directory, "references.json"),
      `${canonicalJson(spec.input.references)}\n`,
    );
    const artifacts: RetainedArtifact[] = [
      { path: "request.json", complete: true },
      { path: "references.json", complete: true },
    ];
    let snapshot: FullGitCommit | undefined;
    const startedAt = new Date().toISOString();
    const context: InvocationContext = {
      directory,
      workspace,
      signal,
      setSnapshot: (value) => {
        snapshot = value;
      },
      retainArtifact: (path, complete = true) => {
        if (!artifacts.some((entry) => entry.path === path)) {
          artifacts.push({ path, complete });
        }
      },
      writeArtifact: async (path, bytes, complete = true) => {
        await writeNew(Path.join(directory, path), bytes);
        artifacts.push({ path, complete });
        return Path.join(directory, path);
      },
    };

    let value: OperationSuccessPayload<Operation> | undefined;
    let failure: AttuneFailure | undefined;
    try {
      const outcome = await spec.run(context);
      snapshot = outcome.snapshotId;
      value = outcome.value;
    } catch (cause) {
      failure = failureData(cause, signal);
    }
    const references = await Promise.all(
      artifacts.map(
        async ({ path, complete }) =>
          await artifactReference(
            spec.input.investigationId,
            tool,
            spec.input.invocationId,
            directory,
            path,
            complete,
          ),
      ),
    );
    const completedAt = new Date().toISOString();
    const base = {
      schemaVersion: 1 as const,
      invocationId: spec.input.invocationId,
      investigationId: spec.input.investigationId,
      tool,
      operation,
      inputDigest,
      toolchainDigest: this.config.toolchainDigest,
      artifacts: references,
      startedAt,
    };
    let receipt: AttuneReceipt =
      failure === undefined && value !== undefined && snapshot !== undefined
        ? {
            ...base,
            status: "succeeded",
            snapshotId: snapshot,
            completedAt,
          }
        : receiptFailure(
            base,
            failure ?? {
              code: "ProcessExitFailure",
              message: "operation returned no terminal value",
            },
            snapshot,
            completedAt,
            signal.aborted,
          );
    const candidate =
      receipt.status === "succeeded" && value !== undefined
        ? { ...value, receipt }
        : { receipt };
    let result: OperationResultOf<Operation>;
    try {
      result = await Effect.runPromise(
        validateInvocationResult(
          spec.descriptor,
          spec.input,
          Effect.succeed(candidate),
        ),
      );
    } catch (cause) {
      receipt = receiptFailure(
        base,
        contractMismatchFailure(
          `${spec.descriptor.name} produced an invalid terminal result`,
          cause,
        ),
        undefined,
        completedAt,
        false,
      );
      result = await Effect.runPromise(
        validateInvocationResult(
          spec.descriptor,
          spec.input,
          Effect.succeed({ receipt }),
        ),
      );
    }
    const embeddedReceipt =
      typeof result === "object" && result !== null
        ? Reflect.get(result, "receipt")
        : undefined;
    if (!isAttuneReceipt(embeddedReceipt)) {
      throw fail(
        "ContractMismatch",
        "validated terminal result has no schema-valid receipt",
      );
    }
    receipt = embeddedReceipt;
    const resultBytes = `${canonicalJson(result)}\n`;
    const receiptBytes = `${canonicalJson(receipt)}\n`;
    await writeNew(Path.join(directory, "result.json"), resultBytes);
    await writeNew(Path.join(directory, "receipt.json"), receiptBytes);
    return result;
  }

  /**
   * Returns an already-persisted matching terminal result without starting work.
   *
   * @remarks
   * The invocation lock makes a duplicate wait for an accepted request to
   * become terminal. Absence returns `undefined`; no implementation callback is
   * available on this path, so recovery can never accept new work.
   */
  lookupTerminal<const Operation extends AnyToolOperation>(
    ...lookup: DurableTerminalLookupArguments<Operation>
  ): Effect.Effect<
    OperationResultOf<Operation> | undefined,
    OperationError<Operation>
  >;
  lookupTerminal<Operation extends AnyToolOperation>(
    descriptor: Operation,
    input: OperationWireInput<Operation> & DurableInvocationInput,
  ): Effect.Effect<
    OperationResultOf<Operation> | undefined,
    OperationError<Operation>
  > {
    const requestBytes = `${canonicalJson(input)}\n`;
    const tool = descriptor.invocation.tool;
    const lockKey = `invocation-${input.investigationId}-${tool}-${input.invocationId}`;
    const lookup = Effect.tryPromise({
      try: async (signal) =>
        await withOsLock(
          this.config,
          lockKey,
          signal,
          async () =>
            await this.workspaces.withMount(
              input.investigationId,
              signal,
              async (workspace) =>
                await this.lookup(
                  workspace,
                  tool,
                  input.invocationId,
                  requestBytes,
                ),
            ),
        ),
      catch: (cause) => normalizedToolFailure(cause, "AgentFsFailure"),
    });
    return Effect.flatMap(lookup, (result) =>
      result === undefined
        ? Effect.succeed(undefined)
        : validateInvocationResult(descriptor, input, Effect.succeed(result)),
    ).pipe(narrowOperationErrors(descriptor));
  }

  materialize(input: {
    readonly invocationId: InvocationId;
    readonly remote: string;
    readonly revision: string;
    readonly investigationId?: InvestigationId;
    readonly references: readonly FreeFormReference[];
  }): Effect.Effect<RepositoryMaterializeResult, ReturnType<typeof fail>> {
    const requestBytes = `${canonicalJson(input)}\n`;
    const inputDigest = sha256(requestBytes);
    const directory = Path.join(
      this.config.home,
      "bootstrap",
      "repository_materialize",
      input.invocationId,
    );
    return drainingTryPromise(
      async (signal) =>
        await withOsLock(
          this.config,
          `bootstrap-repository_materialize-${input.invocationId}`,
          signal,
          async () => {
            await this.workspaces.initialize();
            await mkdir(Path.dirname(directory), {
              recursive: true,
              mode: 0o700,
            });
            if (await fileExists(directory)) {
              const accepted = await readFile(
                Path.join(directory, "request.json"),
                "utf8",
              );
              if (accepted !== requestBytes) {
                throw fail(
                  "InvocationConflict",
                  "bootstrap invocation has another input",
                );
              }
              const receiptPath = Path.join(directory, "receipt.json");
              const resultPath = Path.join(directory, "result.json");
              const allocationPath = Path.join(directory, "allocation.json");
              if (
                !(await fileExists(receiptPath)) ||
                !(await fileExists(resultPath)) ||
                !(await fileExists(allocationPath))
              ) {
                throw fail(
                  "InvocationIncomplete",
                  "materialization is incomplete",
                );
              }
              const [receipt, result, allocation] = await Promise.all([
                readJson<unknown>(receiptPath),
                readJson<unknown>(resultPath),
                readBootstrapAllocation(allocationPath),
              ]);
              const embeddedReceipt =
                typeof result === "object" && result !== null
                  ? Reflect.get(result, "receipt")
                  : undefined;
              if (
                embeddedReceipt === undefined ||
                canonicalJson(embeddedReceipt) !== canonicalJson(receipt)
              ) {
                throw fail(
                  "ContractMismatch",
                  "persisted result and detached receipt disagree",
                );
              }
              const validated = await Effect.runPromise(
                validateInvocationResult(
                  RepositoryMaterializeOperation,
                  input,
                  Effect.succeed(result),
                ),
              );
              assertBootstrapAllocation(input, allocation, validated);
              return validated;
            }
            await mkdir(directory, { recursive: false, mode: 0o700 });
            await writeNew(Path.join(directory, "request.json"), requestBytes);
            await writeNew(
              Path.join(directory, "references.json"),
              `${canonicalJson(input.references)}\n`,
            );
            const allocated =
              input.investigationId ?? allocateInvestigationId();
            const allocation = { investigationId: allocated } as const;
            await writeNew(
              Path.join(directory, "allocation.json"),
              `${canonicalJson(allocation)}\n`,
            );
            const startedAt = new Date().toISOString();
            let materialized:
              | Awaited<ReturnType<WorkspaceStore["materialize"]>>
              | undefined;
            let failure: AttuneFailure | undefined;
            try {
              materialized = await this.workspaces.materialize(
                {
                  remote: input.remote,
                  revision: input.revision,
                  investigationId: allocated,
                },
                signal,
              );
            } catch (cause) {
              failure = failureData(cause, signal);
            }
            const completedAt = new Date().toISOString();
            const base = {
              schemaVersion: 1 as const,
              invocationId: input.invocationId,
              investigationId: allocated,
              tool: "repository" as const,
              operation: "materialize",
              inputDigest,
              toolchainDigest: this.config.toolchainDigest,
              artifacts: [],
              startedAt,
            };
            let receipt: AttuneReceipt;
            let result: RepositoryMaterializeResult;
            if (materialized === undefined) {
              const failed = receiptFailure(
                base,
                failure ?? {
                  code: "AgentFsFailure",
                  message: "materialization returned no investigation",
                },
                undefined,
                completedAt,
                signal.aborted,
              );
              receipt = failed;
              result = { receipt: failed };
            } else {
              const succeeded = {
                ...base,
                status: "succeeded" as const,
                snapshotId: materialized.resolvedCommit,
                completedAt,
              };
              receipt = succeeded;
              result = {
                investigationId: materialized.investigationId,
                requestedRevision: materialized.requestedRevision,
                resolvedCommit: materialized.resolvedCommit,
                branch: materialized.branch,
                receipt: succeeded,
              };
            }
            try {
              result = await Effect.runPromise(
                validateInvocationResult(
                  RepositoryMaterializeOperation,
                  input,
                  Effect.succeed(result),
                ),
              );
            } catch (cause) {
              const failed = receiptFailure(
                base,
                contractMismatchFailure(
                  "repository_materialize produced an invalid terminal result",
                  cause,
                ),
                undefined,
                completedAt,
                false,
              );
              result = await Effect.runPromise(
                validateInvocationResult(
                  RepositoryMaterializeOperation,
                  input,
                  Effect.succeed({ receipt: failed }),
                ),
              );
            }
            assertBootstrapAllocation(input, allocation, result);
            receipt = result.receipt;
            const resultBytes = `${canonicalJson(result)}\n`;
            const receiptBytes = `${canonicalJson(receipt)}\n`;

            if (receipt.status === "succeeded" && materialized !== undefined) {
              await this.workspaces.withMount(
                materialized.investigationId,
                undefined,
                async (workspace) => {
                  const target = Path.join(
                    workspace.artifactsPath,
                    "repository",
                    input.invocationId,
                  );
                  await mkdir(Path.dirname(target), {
                    recursive: true,
                    mode: 0o700,
                  });
                  await mkdir(target, { recursive: false, mode: 0o700 });
                  await writeNew(
                    Path.join(target, "request.json"),
                    requestBytes,
                  );
                  await writeNew(
                    Path.join(target, "references.json"),
                    `${canonicalJson(input.references)}\n`,
                  );
                  await writeNew(Path.join(target, "result.json"), resultBytes);
                  await writeNew(
                    Path.join(target, "receipt.json"),
                    receiptBytes,
                  );
                },
              );
            }
            await writeNew(Path.join(directory, "result.json"), resultBytes);
            await writeNew(Path.join(directory, "receipt.json"), receiptBytes);
            return result;
          },
        ),
      (cause, signal) =>
        normalizedToolFailure(
          cause,
          signal.aborted ? "Cancelled" : "AgentFsFailure",
        ),
    );
  }

  exclusive<A, E, R>(
    investigationId: InvestigationId,
    effect: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E, R> {
    return this.gate(investigationId).exclusive(effect);
  }
}

const activitySignalAborted = (cause: unknown): boolean =>
  cause instanceof Error && cause.name === "AbortError";

export const finalizedManifest = (
  manifest: InvestigationManifest,
  snapshot: FullGitCommit,
  at: string,
): InvestigationManifest => ({
  ...manifest,
  finalSnapshot: snapshot,
  finalizedAt: at,
});

export const missingFileIsUndefined = <A>(
  effect: Promise<A>,
): Promise<A | undefined> =>
  effect.catch((cause) => {
    if (isNodeError(cause, "ENOENT")) return undefined;
    throw cause;
  });
