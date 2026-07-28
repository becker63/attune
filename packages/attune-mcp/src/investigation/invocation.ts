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
  type AttuneOperationError,
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
import {
  type InvestigationManifest,
  type MountedWorkspace,
  WorkspaceStore,
} from "./workspace.js";

const BootstrapAllocation = Schema.Struct({ investigationId: InvestigationId });

function assertBootstrapAllocation(
  input: { readonly investigationId?: InvestigationId | undefined },
  candidate: unknown,
  result: RepositoryMaterializeResult,
  path: string,
): asserts candidate is typeof BootstrapAllocation.Type {
  if (
    !Schema.is(BootstrapAllocation)(candidate) ||
    Object.keys(candidate).length !== 1
  ) {
    throw fail(
      "ContractMismatch",
      "persisted materialization allocation is invalid",
      {
        observed: boundedFailureText(candidate, 8_192),
        path,
      },
    );
  }
  const observed = [
    input.investigationId,
    result.receipt.investigationId,
    result.receipt.status === "succeeded"
      ? Reflect.get(result, "investigationId")
      : undefined,
  ].filter((investigationId) => investigationId !== undefined);
  if (
    observed.some(
      (investigationId) => investigationId !== candidate.investigationId,
    )
  ) {
    throw fail(
      "ContractMismatch",
      "persisted materialization allocation disagrees with request or terminal result",
      { expected: candidate.investigationId, observed: observed.join(",") },
    );
  }
}

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

type SuccessfulResult<Name extends ActiveAttuneOperationName> = Extract<
  AttuneOperationResult<Name>,
  { readonly receipt: { readonly status: "succeeded" } }
>;

/** One durable execution selected from the closed Toolkit. */
interface InvocationSpec<Name extends ActiveAttuneOperationName> {
  readonly name: Name;
  readonly input: AttuneOperationWireInput<Name> & InvestigationBoundInput;
  readonly run: (context: InvocationContext) => Promise<{
    readonly snapshotId: FullGitCommit;
    readonly value: Omit<SuccessfulResult<Name>, "receipt">;
  }>;
}

const boundedFailureText = (value: unknown, maximum: number): string => {
  const text = value instanceof Error ? value.message : String(value);
  const nonEmpty =
    text.length === 0 ? "operation failed without error details" : text;
  return nonEmpty.slice(0, maximum);
};

const normalizedFailureData = (
  cause: unknown,
  fallbackCode: FailureCode,
): AttuneFailure => {
  if (
    typeof cause === "object" &&
    cause !== null &&
    "_tag" in cause &&
    cause._tag === "AttuneToolFailure"
  ) {
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

const attempt = <A>(
  run: () => Promise<A>,
  signal: AbortSignal,
): Promise<readonly [A | undefined, AttuneFailure | undefined]> =>
  run().then(
    (value) => [value, undefined],
    (cause: unknown) => [
      undefined,
      normalizedFailureData(
        cause,
        signal.aborted ? "Cancelled" : "ProcessExitFailure",
      ),
    ],
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

type ReceiptBase = Parameters<typeof receiptFailure>[0];

const invocationDirectory = (
  workspace: MountedWorkspace,
  tool: ToolName,
  invocationId: InvocationId,
): string => Path.join(workspace.artifactsPath, tool, invocationId);

const acceptRequest = async (
  directory: string,
  requestBytes: string,
  references: readonly FreeFormReference[],
): Promise<void> => {
  await mkdir(Path.dirname(directory), { recursive: true, mode: 0o700 });
  await mkdir(directory, { recursive: false, mode: 0o700 });
  await writeNew(Path.join(directory, "request.json"), requestBytes);
  await writeNew(
    Path.join(directory, "references.json"),
    `${canonicalJson(references)}\n`,
  );
};

const resultReceipt = (result: unknown): unknown =>
  typeof result === "object" && result !== null
    ? Reflect.get(result, "receipt")
    : undefined;

const readAcceptedTerminal = async (
  directory: string,
  requestBytes: string,
  bootstrap = false,
): Promise<unknown> => {
  if (!(await fileExists(directory))) return undefined;
  const incomplete = bootstrap
    ? "materialization is incomplete"
    : "invocation is incomplete";
  const requestPath = Path.join(directory, "request.json");
  if (!(await fileExists(requestPath))) {
    throw fail("InvocationIncomplete", incomplete);
  }
  if ((await readFile(requestPath, "utf8")) !== requestBytes) {
    throw fail(
      "InvocationConflict",
      bootstrap
        ? "bootstrap invocation has another input"
        : "invocation identifier has another input",
    );
  }
  const receiptPath = Path.join(directory, "receipt.json");
  const resultPath = Path.join(directory, "result.json");
  const terminalExists = await Promise.all([
    fileExists(receiptPath),
    fileExists(resultPath),
  ]);
  if (terminalExists.includes(false)) {
    throw fail("InvocationIncomplete", incomplete);
  }
  const [receipt, result] = await Promise.all([
    readJson<unknown>(receiptPath),
    readJson<unknown>(resultPath),
  ]);
  const embedded = resultReceipt(result);
  if (
    embedded === undefined ||
    canonicalJson(embedded) !== canonicalJson(receipt)
  ) {
    throw fail(
      "ContractMismatch",
      "persisted result and detached receipt disagree",
    );
  }
  return result;
};

const writeTerminal = async (
  directory: string,
  result: { readonly receipt: AttuneReceipt },
): Promise<void> => {
  await writeNew(
    Path.join(directory, "result.json"),
    `${canonicalJson(result)}\n`,
  );
  await writeNew(
    Path.join(directory, "receipt.json"),
    `${canonicalJson(result.receipt)}\n`,
  );
};

const validateTerminal = async <Name extends AttuneOperationName>(
  name: Name,
  input: AttuneOperationWireInput<Name>,
  base: ReceiptBase,
  completedAt: string,
  signal: AbortSignal,
  success:
    | { readonly snapshotId: FullGitCommit; readonly value: object }
    | undefined,
  failure: AttuneFailure | undefined,
  fallback: AttuneFailure,
  invalidMessage: string,
  failureSnapshot?: FullGitCommit,
): Promise<AttuneOperationResult<Name>> => {
  const receipt =
    success === undefined
      ? receiptFailure(
          base,
          failure ?? fallback,
          failureSnapshot,
          completedAt,
          signal.aborted,
        )
      : {
          ...base,
          status: "succeeded" as const,
          snapshotId: success.snapshotId,
          completedAt,
        };
  const candidate =
    success === undefined ? { receipt } : { ...success.value, receipt };
  const decode = (value: unknown) =>
    Effect.runPromise(
      validateOperationResult(name, input, Effect.succeed(value)),
    );
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
 * Aborts cooperatively, then drains uncancellable Promise work before releasing
 * the enclosing Effect gate and OS lock.
 */
const lockedInvocation = <A>(
  config: RuntimeConfig,
  key: string,
  run: (signal: AbortSignal) => Promise<A>,
  abortErrorsAreCancellation = false,
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
          (abortErrorsAreCancellation &&
            cause instanceof Error &&
            cause.name === "AbortError");
        resume(
          Effect.fail(
            new AttuneToolFailure(
              normalizedFailureData(
                cause,
                cancelled ? "Cancelled" : "AgentFsFailure",
              ),
            ),
          ),
        );
      },
    );
    const drained = running.catch(() => undefined);
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

  execute<Name extends ActiveAttuneOperationName>(
    spec: InvocationSpec<Name>,
  ): Effect.Effect<AttuneOperationResult<Name>, AttuneOperationError<Name>> {
    const requestBytes = `${canonicalJson(spec.input)}\n`;
    const tool = ATTUNE_OPERATIONS[spec.name].receipt[0];
    const operation = resolveInvocationOperation(spec.name, spec.input);
    const writerMode = resolveWriterMode(spec.name, spec.input);
    const lockKey = `invocation-${spec.input.investigationId}-${tool}-${spec.input.invocationId}`;
    const lookup = (workspace: MountedWorkspace) =>
      readAcceptedTerminal(
        invocationDirectory(workspace, tool, spec.input.invocationId),
        requestBytes,
      );
    const execution = lockedInvocation(
      this.config,
      lockKey,
      async (signal) => {
        const existing = await this.workspaces.withMount(
          spec.input.investigationId,
          signal,
          lookup,
        );
        if (existing !== undefined) return existing;

        return await this.workspaces.withMount(
          spec.input.investigationId,
          signal,
          async (workspace) => {
            const retry = await lookup(workspace);
            if (retry !== undefined) return retry;
            if (workspace.manifest.finalizedAt !== undefined) {
              throw fail("Finalized", "investigation is finalized");
            }
            const perform = () =>
              this.acceptAndRun(
                spec,
                workspace,
                requestBytes,
                operation,
                signal,
              );
            return writerMode === "reader"
              ? await perform()
              : await withOsLock(
                  this.config,
                  `writer-${spec.input.investigationId}`,
                  signal,
                  perform,
                );
          },
        );
      },
      true,
    );
    const activity = (
      writerMode === "exclusive-writer"
        ? this.gate(spec.input.investigationId).exclusive
        : this.gate(spec.input.investigationId).shared
    )(execution);
    return validateOperationResult(spec.name, spec.input, activity);
  }

  private async acceptAndRun<Name extends ActiveAttuneOperationName>(
    spec: InvocationSpec<Name>,
    workspace: MountedWorkspace,
    requestBytes: string,
    operation: string,
    signal: AbortSignal,
  ): Promise<unknown> {
    const tool = ATTUNE_OPERATIONS[spec.name].receipt[0];
    const directory = invocationDirectory(
      workspace,
      tool,
      spec.input.invocationId,
    );
    await acceptRequest(directory, requestBytes, spec.input.references);
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
        if (!artifacts.some((entry) => entry.path === path))
          artifacts.push({ path, complete });
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
        artifactReference(
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
      inputDigest: sha256(requestBytes),
      toolchainDigest: this.config.toolchainDigest,
      artifacts: references,
      startedAt,
    };
    const result = await validateTerminal(
      spec.name,
      spec.input,
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
      `${spec.name} produced an invalid terminal result`,
      snapshot,
    );
    await writeTerminal(directory, result);
    return result;
  }

  /** Replays a matching terminal under its invocation lock; never accepts work. */
  lookupTerminal<Name extends ActiveAttuneOperationName>(
    name: Name,
    input: AttuneOperationWireInput<Name> & InvestigationBoundInput,
  ): Effect.Effect<
    AttuneOperationResult<Name> | undefined,
    AttuneOperationError<Name>
  > {
    const requestBytes = `${canonicalJson(input)}\n`;
    const tool = ATTUNE_OPERATIONS[name].receipt[0];
    const lockKey = `invocation-${input.investigationId}-${tool}-${input.invocationId}`;
    const lookup = Effect.tryPromise({
      try: (signal) =>
        withOsLock(this.config, lockKey, signal, () =>
          this.workspaces.withMount(
            input.investigationId,
            signal,
            (workspace) =>
              readAcceptedTerminal(
                invocationDirectory(workspace, tool, input.invocationId),
                requestBytes,
              ),
          ),
        ),
      catch: (cause) =>
        new AttuneToolFailure(normalizedFailureData(cause, "AgentFsFailure")),
    });
    return Effect.flatMap(lookup, (result) =>
      result === undefined
        ? Effect.succeed(undefined)
        : validateOperationResult(name, input, Effect.succeed(result)),
    ) as Effect.Effect<
      AttuneOperationResult<Name> | undefined,
      AttuneOperationError<Name>
    >;
  }

  materialize(
    input: AttuneOperationWireInput<"repository_materialize">,
  ): Effect.Effect<RepositoryMaterializeResult, ReturnType<typeof fail>> {
    const requestBytes = `${canonicalJson(input)}\n`;
    const inputDigest = sha256(requestBytes);
    const directory = Path.join(
      this.config.home,
      "bootstrap",
      "repository_materialize",
      input.invocationId,
    );
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
        const replay = await readAcceptedTerminal(
          directory,
          requestBytes,
          true,
        );
        if (replay !== undefined) {
          if (!(await fileExists(allocationPath))) {
            throw fail("InvocationIncomplete", "materialization is incomplete");
          }
          const allocation = await readJson<unknown>(allocationPath);
          const validated = await Effect.runPromise(
            validateOperationResult(
              "repository_materialize",
              input,
              Effect.succeed(replay),
            ),
          );
          assertBootstrapAllocation(
            input,
            allocation,
            validated,
            allocationPath,
          );
          return validated;
        }
        await acceptRequest(directory, requestBytes, input.references);
        const allocated = input.investigationId ?? allocateInvestigationId();
        const allocation = { investigationId: allocated } as const;
        await writeNew(allocationPath, `${canonicalJson(allocation)}\n`);
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
        if (
          result.receipt.status === "succeeded" &&
          materialized !== undefined
        ) {
          await this.workspaces.withMount(
            materialized.investigationId,
            undefined,
            async (workspace) => {
              const target = invocationDirectory(
                workspace,
                "repository",
                input.invocationId,
              );
              await acceptRequest(target, requestBytes, input.references);
              await writeTerminal(target, result);
            },
          );
        }
        await writeTerminal(directory, result);
        return result;
      },
    );
  }
}

export const finalizedManifest = (
  manifest: InvestigationManifest,
  snapshot: FullGitCommit,
  at: string,
): InvestigationManifest => ({
  ...manifest,
  finalSnapshot: snapshot,
  finalizedAt: at,
});
