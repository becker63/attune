import { mkdir, readFile } from "node:fs/promises";
import * as Path from "node:path";

import { Effect, Schema } from "effect";

import {
  AttuneFailure,
  AttuneToolFailure,
  InvestigationId,
  type AttuneReceipt,
  type CancelledReceipt,
  type FailedReceipt,
  type FailureCode,
  type FreeFormReference,
  type FullGitCommit,
  type InvocationId,
  type RepositoryMaterializeResult,
  type ToolName,
} from "../contract/schemas.js";
import {
  allocateInvestigationId,
  artifactReference,
  canonicalJson,
  fail,
  fileExists,
  makeActivityGates,
  readJson,
  sha256,
  type RuntimeConfig,
  writeNew,
} from "../platform/core.js";
import { withOsLock } from "../platform/lock.js";
import {
  ATTUNE_OPERATIONS,
  type ActiveAttuneOperationName,
  type AttuneOperationName,
  type AttuneOperationResult,
  type AttuneOperationWireInput,
} from "../tools/registry.js";
import {
  resolveInvocationOperation,
  resolveWriterMode,
  validateOperationResult,
  type InvestigationBoundInput,
} from "./operation.js";
import { type InvestigationManifest, type MountedWorkspace, WorkspaceStore } from "./workspace.js";

/** Schema for durable materialization identity allocation. */ const BootstrapAllocation = Schema.Struct({
  investigationId: InvestigationId,
});
/**
 * Constructs an internal contract-mismatch failure. @param message - Mismatch explanation. @param details -
 * Optional comparison evidence. @returns The normalized tool failure.
 */
const contractMismatch = (message: string, details?: Parameters<typeof fail>[2]): AttuneToolFailure =>
  fail("ContractMismatch", message, details);

/**
 * Verifies replayed materialization identity against request and result evidence. @param input - Original
 * materialization identity request. @param candidate - Persisted allocation value. @param result - Validated
 * terminal result. @param path - Allocation source path.
 */
function assertBootstrapAllocation(
  input: { readonly investigationId?: InvestigationId | undefined },
  candidate: unknown,
  result: RepositoryMaterializeResult,
  path: string,
): asserts candidate is typeof BootstrapAllocation.Type {
  if (!Schema.is(BootstrapAllocation)(candidate) || Object.keys(candidate).length !== 1) {
    throw contractMismatch("persisted materialization allocation is invalid", {
      observed: boundedFailureText(candidate, 8_192),
      path,
    });
  }
  const observed = [
    input.investigationId,
    result.receipt.investigationId,
    result.receipt.status === "succeeded" ? Reflect.get(result, "investigationId") : undefined,
  ].filter((investigationId) => investigationId !== undefined);
  if (observed.some((id) => id !== candidate.investigationId)) {
    throw contractMismatch("persisted materialization allocation disagrees with request or terminal result", {
      expected: candidate.investigationId,
      observed: observed.join(","),
    });
  }
}

/**
 * Gives one accepted invocation bounded access to its workspace and evidence.
 *
 * @remarks
 *   Implementations can write retained artifacts and advance only the terminal snapshot recorded by the
 *   engine.
 */
export interface InvocationContext {
  /** Private invocation evidence directory. */ readonly directory: string;
  /** Mounted investigation workspace. */ readonly workspace: MountedWorkspace;
  /** Cooperative cancellation signal. */ readonly signal: AbortSignal;
  /**
   * Writes one new retained artifact. @remarks Exclusive creation preserves immutable invocation evidence.
   *
   * @param relative - Relative artifact path.
   * @param bytes - Exact bytes to retain. @param complete - Whether all bytes were captured. @returns The
   *   absolute retained path.
   */
  readonly writeArtifact: (
    relative: string,
    bytes: string | Uint8Array,
    complete?: boolean,
  ) => Promise<string>;
  /**
   * Marks an existing artifact for receipt inclusion. @remarks Completeness records whether evidence was
   * bounded. @param relative - Relative artifact path. @param complete - Whether all bytes were captured.
   */
  readonly retainArtifact: (relative: string, complete?: boolean) => void;
  /**
   * Records the operation's resulting snapshot. @remarks Terminal correlation rejects a result that does not
   * match this evidence. @param snapshot - Exact resulting commit.
   */
  readonly setSnapshot: (snapshot: FullGitCommit) => void;
}

/** Selects the successful result member for one active operation. */ type SuccessfulResult<
  Name extends ActiveAttuneOperationName,
> = Extract<AttuneOperationResult<Name>, { readonly receipt: { readonly status: "succeeded" } }>;

/** One durable execution selected from the closed Toolkit. */ interface InvocationSpec<
  Name extends ActiveAttuneOperationName,
> {
  /** Closed operation key. */ readonly name: Name;
  /** Correlated wire input and authority identity. */ readonly input: AttuneOperationWireInput<Name> &
    InvestigationBoundInput;
  /**
   * Runs accepted work. @param context - Owned workspace and evidence boundary.
   *
   * @returns Snapshot-correlated success data without a receipt.
   */
  readonly run: (context: InvocationContext) => Promise<{
    readonly snapshotId: FullGitCommit;
    readonly value: Omit<SuccessfulResult<Name>, "receipt">;
  }>;
}

/**
 * Bounds untrusted failure text for durable storage. @param value - Unknown failure. @param maximum - Maximum
 * characters. @returns Nonempty bounded text.
 */
const boundedFailureText = (value: unknown, maximum: number): string => {
  const text = value instanceof Error ? value.message : String(value);
  return (text || "operation failed without error details").slice(0, maximum);
};

/**
 * Encodes one canonical newline-delimited JSON value. @param value - Value to encode. @returns Canonical JSON
 * plus newline.
 */
const jsonLine = (value: unknown): string => `${canonicalJson(value)}\n`;

/**
 * Converts an unknown native failure into receipt-safe data. @param cause - Unknown failure. @param
 * fallbackCode - Code used outside the public failure shape. @returns Validated bounded failure data.
 */
const normalizedFailureData = (cause: unknown, fallbackCode: FailureCode): AttuneFailure => {
  if (typeof cause === "object" && cause !== null && "_tag" in cause && cause._tag === "AttuneToolFailure") {
    if (Schema.is(AttuneFailure)(cause)) return cause;
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

/**
 * Wraps unknown failure data in the public error class. @param cause - Unknown failure. @param fallback -
 * Default code. @returns The normalized tool failure.
 */
const toolFailure = (cause: unknown, fallback: FailureCode): AttuneToolFailure =>
  new AttuneToolFailure(normalizedFailureData(cause, fallback));

/**
 * Captures promise success or failure without dropping cancellation evidence.
 *
 * @typeParam A - Success value. @param run - Promise work to attempt. @param signal - Cancellation state used
 *   for failure classification. @returns A tuple containing exactly one outcome.
 */
const attempt = <A>(
  run: () => Promise<A>,
  signal: AbortSignal,
): Promise<readonly [A | undefined, AttuneFailure | undefined]> =>
  run().then(
    (value) => [value, undefined],
    (cause: unknown) => [
      undefined,
      normalizedFailureData(cause, signal.aborted ? "Cancelled" : "ProcessExitFailure"),
    ],
  );

/** Receipt fields fixed at request acceptance. */ type ReceiptBase = Omit<
  FailedReceipt,
  "status" | "failure" | "snapshotId" | "completedAt"
>;

/**
 * Builds a failed or cancelled terminal receipt. @param base - Acceptance evidence. @param failure -
 * Normalized failure. @param snapshot - Last exact snapshot when known. @param completedAt - Terminal
 * timestamp. @param cancelled - Whether cancellation caused termination. @returns The terminal failure
 * receipt.
 */
const receiptFailure = (
  base: ReceiptBase,
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
  return cancelled ? { ...terminal, status: "cancelled" } : { ...terminal, status: "failed" };
};

/**
 * Resolves the durable directory for one invocation. @param workspace - Mounted investigation. @param tool -
 * Producing tool. @param invocationId - Invocation identity. @returns The evidence directory.
 */
const invocationDirectory = (
  workspace: MountedWorkspace,
  tool: ToolName,
  invocationId: InvocationId,
): string => Path.join(workspace.artifactsPath, tool, invocationId);

/**
 * Persists request bytes and references before work begins. @param directory - New invocation directory.
 *
 * @param requestBytes - Canonical request bytes.
 * @param references - Caller references. @returns A promise completed after acceptance evidence is synced.
 */
const acceptRequest = async (
  directory: string,
  requestBytes: string,
  references: readonly FreeFormReference[],
): Promise<void> => {
  await mkdir(Path.dirname(directory), { recursive: true, mode: 0o700 });
  await mkdir(directory, { recursive: false, mode: 0o700 });
  await writeNew(Path.join(directory, "request.json"), requestBytes);
  await writeNew(Path.join(directory, "references.json"), jsonLine(references));
};

/**
 * Reads a possible receipt from an unknown result. @param result - Candidate terminal result. @returns Its
 * receipt field when object-like.
 */
const resultReceipt = (result: unknown): unknown =>
  typeof result === "object" && result !== null ? Reflect.get(result, "receipt") : undefined;

/**
 * Replays a complete accepted terminal result. @param directory - Invocation evidence directory. @param
 * requestBytes - Canonical request bytes. @param bootstrap - Whether this is materialization bootstrap.
 *
 * @returns The terminal result or undefined before acceptance.
 */
const readAcceptedTerminal = async (
  directory: string,
  requestBytes: string,
  bootstrap: boolean = false,
): Promise<unknown> => {
  if (!(await fileExists(directory))) return undefined;
  const incomplete = `${bootstrap ? "materialization" : "invocation"} is incomplete`;
  const requestPath = Path.join(directory, "request.json");
  if (!(await fileExists(requestPath))) throw fail("InvocationIncomplete", incomplete);
  if ((await readFile(requestPath, "utf8")) !== requestBytes) {
    throw fail(
      "InvocationConflict",
      `${bootstrap ? "bootstrap invocation" : "invocation identifier"} has another input`,
    );
  }
  const paths = ["receipt", "result"].map((name) => Path.join(directory, `${name}.json`));
  if ((await Promise.all(paths.map(fileExists))).includes(false))
    throw fail("InvocationIncomplete", incomplete);
  const [receipt, result] = await Promise.all(paths.map(readJson<unknown>));
  const embedded = resultReceipt(result);
  if (embedded === undefined || canonicalJson(embedded) !== canonicalJson(receipt)) {
    throw contractMismatch("persisted result and detached receipt disagree");
  }
  return result;
};

/**
 * Persists result before detached receipt as the terminal commit point. @param directory - Invocation
 * evidence directory. @param result - Validated terminal result. @returns A promise completed after both
 * files are synced.
 */
const writeTerminal = async (
  directory: string,
  result: { readonly receipt: AttuneReceipt },
): Promise<void> => {
  await writeNew(Path.join(directory, "result.json"), jsonLine(result));
  await writeNew(Path.join(directory, "receipt.json"), jsonLine(result.receipt));
};

/**
 * Validates either success or failure against the operation contract.
 *
 * @typeParam Name - Operation key. @param name - Selected operation. @param input - Original wire input.
 * @param base - Acceptance evidence. @param completedAt - Terminal timestamp. @param signal - Cancellation
 *   state. @param success - Successful snapshot and value when present. @param failure - Captured execution
 *   failure. @param fallback - Failure used when work returns no value. @param invalidMessage - Contract
 *   mismatch explanation. @param failureSnapshot - Last known snapshot. @returns A schema-valid correlated
 *   terminal result.
 */
const validateTerminal = async <Name extends AttuneOperationName>(
  name: Name,
  input: AttuneOperationWireInput<Name>,
  base: ReceiptBase,
  completedAt: string,
  signal: AbortSignal,
  success: { readonly snapshotId: FullGitCommit; readonly value: object } | undefined,
  failure: AttuneFailure | undefined,
  fallback: AttuneFailure,
  invalidMessage: string,
  failureSnapshot?: FullGitCommit,
): Promise<AttuneOperationResult<Name>> => {
  const receipt =
    success === undefined
      ? receiptFailure(base, failure ?? fallback, failureSnapshot, completedAt, signal.aborted)
      : {
          ...base,
          status: "succeeded" as const,
          snapshotId: success.snapshotId,
          completedAt,
        };
  const candidate = success === undefined ? { receipt } : { ...success.value, receipt };
  const decode = (value: unknown) =>
    Effect.runPromise(validateOperationResult(name, input, Effect.succeed(value)));
  try {
    return await decode(candidate);
  } catch (cause) {
    const invalidReceipt = receiptFailure(
      base,
      {
        code: "ContractMismatch",
        message: invalidMessage,
        observed: boundedFailureText(cause, 8_192),
      },
      undefined,
      completedAt,
      false,
    );
    return await decode({ receipt: invalidReceipt });
  }
};

/**
 * Runs promise work under one cancellable OS lock. @typeParam A - Success value. @param config - Runtime lock
 * configuration. @param key - Lock identity. @param run - Signal-aware promise work. @param
 * abortErrorsAreCancellation - Whether native abort errors are cancellation.
 *
 * @returns The bridged Effect.
 * @failure {@link AttuneToolFailure} - Correct the filesystem or cancellation boundary before retrying.
 */
const lockedInvocation = <A>(
  config: RuntimeConfig,
  key: string,
  run: (signal: AbortSignal) => Promise<A>,
  abortErrorsAreCancellation: boolean = false,
): Effect.Effect<A, AttuneToolFailure> =>
  Effect.callback<A, AttuneToolFailure>((resume) => {
    const controller = new AbortController();
    const running = Promise.resolve().then(() =>
      withOsLock(config, key, controller.signal, () => run(controller.signal)),
    );
    running.then(
      (value) => resume(Effect.succeed(value)),
      (cause: unknown) => {
        const cancelled =
          controller.signal.aborted ||
          (abortErrorsAreCancellation && cause instanceof Error && cause.name === "AbortError");
        resume(Effect.fail(toolFailure(cause, cancelled ? "Cancelled" : "AgentFsFailure")));
      },
    );
    const drained = running.catch(() => undefined);
    return Effect.sync(() => controller.abort()).pipe(Effect.andThen(Effect.promise(() => drained)));
  });

/**
 * Owns acceptance, execution, terminal persistence, and replay. @remarks One engine correlates every
 * operation with exact authority, serialized acceptance, and immutable receipt evidence.
 */
export class InvocationEngine {
  /** Investigation-scoped shared/exclusive activity lookup. */ private readonly gate = makeActivityGates();

  /**
   * Creates an invocation engine. @remarks Configuration and workspace identity are retained for every
   * operation. @param config - Runtime boundary configuration. @param workspaces - Investigation workspace
   * store.
   */
  constructor(
    readonly config: RuntimeConfig,
    readonly workspaces: WorkspaceStore,
  ) {}

  /**
   * Executes one active operation through durable acceptance. @remarks Matching retries replay terminal
   * evidence, while new work runs under snapshot and writer gates. @typeParam Name - Active operation key.
   *
   * @param spec - Correlated operation implementation. @returns The validated terminal result effect.
   * @failure {@link AttuneToolFailure} - Correct the accepted operation boundary before retrying.
   */
  execute<Name extends ActiveAttuneOperationName>(
    spec: InvocationSpec<Name>,
  ): Effect.Effect<AttuneOperationResult<Name>, AttuneToolFailure> {
    const { input, name } = spec;
    const requestBytes = jsonLine(input);
    const tool = ATTUNE_OPERATIONS[name].receipt[0];
    const operation = resolveInvocationOperation(name, input);
    const writerMode = resolveWriterMode(name, input);
    const lockKey = `invocation-${input.investigationId}-${tool}-${input.invocationId}`;
    const lookup = (workspace: MountedWorkspace) =>
      readAcceptedTerminal(invocationDirectory(workspace, tool, input.invocationId), requestBytes);
    const execution = lockedInvocation(
      this.config,
      lockKey,
      async (signal) => {
        const existing = await this.workspaces.withMount(input.investigationId, signal, lookup);
        if (existing !== undefined) return existing;

        return await this.workspaces.withMount(input.investigationId, signal, async (workspace) => {
          const retry = await lookup(workspace);
          if (retry !== undefined) return retry;
          if (workspace.manifest.finalizedAt !== undefined)
            throw fail("Finalized", "investigation is finalized");
          const perform = () => this.acceptAndRun(spec, workspace, requestBytes, operation, signal);
          return writerMode === "reader"
            ? await perform()
            : await withOsLock(this.config, `writer-${input.investigationId}`, signal, perform);
        });
      },
      true,
    );
    const gate = this.gate(input.investigationId);
    const activity = (writerMode === "exclusive-writer" ? gate.exclusive : gate.shared)(execution);
    return validateOperationResult(name, input, activity);
  }

  /**
   * Accepts, executes, and persists one previously unseen request. @typeParam Name - Active operation key.
   *
   * @param spec - Correlated operation implementation. @param workspace - Mounted investigation. @param
   *   requestBytes - Canonical request bytes. @param operation - Receipt operation label. @param signal -
   *   Cancellation signal. @returns The untyped persisted result for final validation.
   */
  private async acceptAndRun<Name extends ActiveAttuneOperationName>(
    spec: InvocationSpec<Name>,
    workspace: MountedWorkspace,
    requestBytes: string,
    operation: string,
    signal: AbortSignal,
  ): Promise<unknown> {
    const { input, name } = spec;
    const tool = ATTUNE_OPERATIONS[name].receipt[0];
    const directory = invocationDirectory(workspace, tool, input.invocationId);
    await acceptRequest(directory, requestBytes, input.references);
    const artifacts: Array<{
      readonly path: string;
      readonly complete: boolean;
    }> = [
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
        if (!artifacts.some((entry) => entry.path === path)) artifacts.push({ path, complete });
      },
      writeArtifact: async (path, bytes, complete = true) => {
        await writeNew(Path.join(directory, path), bytes);
        artifacts.push({ path, complete });
        return Path.join(directory, path);
      },
    };

    const [outcome, failure] = await attempt(() => spec.run(context), signal);
    if (outcome !== undefined) snapshot = outcome.snapshotId;
    const references = await Promise.all(
      artifacts.map(({ path, complete }) =>
        artifactReference(input.investigationId, tool, input.invocationId, directory, path, complete),
      ),
    );
    const completedAt = new Date().toISOString();
    const base = {
      schemaVersion: 1 as const,
      invocationId: input.invocationId,
      investigationId: input.investigationId,
      tool,
      operation,
      inputDigest: sha256(requestBytes),
      toolchainDigest: this.config.toolchainDigest,
      artifacts: references,
      startedAt,
    };
    const result = await validateTerminal(
      name,
      input,
      base,
      completedAt,
      signal,
      failure === undefined && outcome !== undefined && snapshot !== undefined
        ? { snapshotId: snapshot, value: outcome.value }
        : undefined,
      failure,
      {
        code: "ProcessExitFailure",
        message: "operation returned no terminal value",
      },
      `${name} produced an invalid terminal result`,
      snapshot,
    );
    await writeTerminal(directory, result);
    return result;
  }

  /**
   * Replays a matching terminal under its invocation lock. @remarks Lookup never accepts new work, so absence
   * remains distinguishable from an incomplete accepted invocation. @typeParam Name - Active operation key.
   *
   * @param name - Operation key. @param input - Correlated request and authority identity. @returns The
   *   terminal result when already accepted.
   * @failure {@link AttuneToolFailure} - Restore the durable invocation lookup before checking again.
   */
  lookupTerminal<Name extends ActiveAttuneOperationName>(
    name: Name,
    input: AttuneOperationWireInput<Name> & InvestigationBoundInput,
  ): Effect.Effect<AttuneOperationResult<Name> | undefined, AttuneToolFailure> {
    const requestBytes = jsonLine(input);
    const tool = ATTUNE_OPERATIONS[name].receipt[0];
    const lockKey = `invocation-${input.investigationId}-${tool}-${input.invocationId}`;
    const lookup = Effect.tryPromise({
      try: (signal) =>
        withOsLock(this.config, lockKey, signal, () =>
          this.workspaces.withMount(input.investigationId, signal, (workspace) =>
            readAcceptedTerminal(invocationDirectory(workspace, tool, input.invocationId), requestBytes),
          ),
        ),
      catch: (cause) => toolFailure(cause, "AgentFsFailure"),
    });
    return Effect.flatMap(lookup, (result) =>
      result === undefined
        ? Effect.succeed(undefined)
        : validateOperationResult(name, input, Effect.succeed(result)),
    ) as Effect.Effect<AttuneOperationResult<Name> | undefined, AttuneToolFailure>;
  }

  /**
   * Materializes or replays one repository bootstrap invocation. @remarks Allocation is persisted before
   * workspace creation so retry identity cannot drift after interruption. @param input - Repository
   * materialization request. @returns The correlated materialization terminal result.
   *
   * @failure {@link AttuneToolFailure} - Repair bootstrap persistence or identity before retrying.
   */
  materialize(
    input: AttuneOperationWireInput<"repository_materialize">,
  ): Effect.Effect<RepositoryMaterializeResult, AttuneToolFailure> {
    const requestBytes = jsonLine(input);
    const inputDigest = sha256(requestBytes);
    const directory = Path.join(this.config.home, "bootstrap", "repository_materialize", input.invocationId);
    const allocationPath = Path.join(directory, "allocation.json");
    return lockedInvocation(
      this.config,
      `bootstrap-repository_materialize-${input.invocationId}`,
      async (signal) => {
        await this.workspaces.initialize();
        await mkdir(Path.dirname(directory), {
          recursive: true,
          mode: 0o700,
        });
        const replay = await readAcceptedTerminal(directory, requestBytes, true);
        if (replay !== undefined) {
          if (!(await fileExists(allocationPath)))
            throw fail("InvocationIncomplete", "materialization is incomplete");
          const allocation = await readJson<unknown>(allocationPath);
          const validated = await Effect.runPromise(
            validateOperationResult("repository_materialize", input, Effect.succeed(replay)),
          );
          assertBootstrapAllocation(input, allocation, validated, allocationPath);
          return validated;
        }
        await acceptRequest(directory, requestBytes, input.references);
        const allocated = input.investigationId ?? allocateInvestigationId();
        const allocation = { investigationId: allocated } as const;
        await writeNew(allocationPath, jsonLine(allocation));
        const startedAt = new Date().toISOString();
        const [materialized, failure] = await attempt(
          () =>
            this.workspaces.materialize(
              {
                remote: input.remote,
                revision: input.revision,
                investigationId: allocated,
              },
              signal,
            ),
          signal,
        );
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
        const result = await validateTerminal(
          "repository_materialize",
          input,
          base,
          completedAt,
          signal,
          materialized === undefined
            ? undefined
            : {
                snapshotId: materialized.resolvedCommit,
                value: {
                  investigationId: materialized.investigationId,
                  requestedRevision: materialized.requestedRevision,
                  resolvedCommit: materialized.resolvedCommit,
                  branch: materialized.branch,
                },
              },
          failure,
          {
            code: "AgentFsFailure",
            message: "materialization returned no investigation",
          },
          "repository_materialize produced an invalid terminal result",
        );
        assertBootstrapAllocation(input, allocation, result, allocationPath);
        if (result.receipt.status === "succeeded" && materialized !== undefined) {
          await this.workspaces.withMount(materialized.investigationId, undefined, async (workspace) => {
            const target = invocationDirectory(workspace, "repository", input.invocationId);
            await acceptRequest(target, requestBytes, input.references);
            await writeTerminal(target, result);
          });
        }
        await writeTerminal(directory, result);
        return result;
      },
    );
  }
}

/**
 * Derives a finalized manifest from current evidence. @remarks The final snapshot and timestamp close future
 * operational authority without erasing history. @param manifest - Current investigation manifest. @param
 * snapshot - Exact final snapshot. @param at - Finalization timestamp. @returns The finalized manifest
 * value.
 */
export const finalizedManifest = (
  manifest: InvestigationManifest,
  snapshot: FullGitCommit,
  at: string,
): InvestigationManifest => ({
  ...manifest,
  finalSnapshot: snapshot,
  finalizedAt: at,
});
