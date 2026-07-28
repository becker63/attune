import { Context, Effect } from "effect";

import { AttuneToolFailure, type FullGitCommit } from "../contract/schemas.js";
import {
  fail,
  loadRuntimeConfig,
  type RuntimeConfig,
} from "../platform/core.js";
import { makeAttuneRuntime } from "../server/runtime.js";
import {
  ATTUNE_OPERATIONS,
  type ActiveAttuneOperationName,
  type AttuneOperationError,
  type AttuneOperationHandler,
  type AttuneOperationHandlers,
  type AttuneOperationInput,
  type AttuneOperationName,
  type AttuneOperationReceipt,
  type AttuneOperationResult,
  type AttuneOperationWireInput,
  type AttuneTerminalLookups,
  type PreservingAttuneOperationName,
} from "../tools/registry.js";
import {
  makeInvestigationCapabilityIssuer,
  type Investigation,
  type InvestigationState,
} from "./capability.js";
import { InvestigationLifecycleError } from "./errors.js";
import {
  operationReceipt,
  validateOperationResult,
  type InvestigationBoundInput,
} from "./operation.js";
import { WorkspaceStore, type InvestigationManifest } from "./workspace.js";

type SuccessfulResult<Name extends AttuneOperationName> = Extract<
  AttuneOperationResult<Name>,
  { readonly receipt: { readonly status: "succeeded" } }
>;
type UnsuccessfulResult<Name extends AttuneOperationName> = Exclude<
  AttuneOperationResult<Name>,
  SuccessfulResult<Name>
>;
type Materialization =
  | {
      readonly status: "materialized";
      readonly investigation: Investigation<"materialized">;
      readonly result: SuccessfulResult<"repository_materialize">;
    }
  | {
      readonly status: "rejected";
      readonly result: UnsuccessfulResult<"repository_materialize">;
    };
type Execution<Name extends PreservingAttuneOperationName> = {
  readonly investigation: Investigation<"active">;
  readonly result: AttuneOperationResult<Name>;
  readonly receipt: AttuneOperationReceipt<Name>;
};
type Finalization =
  | {
      readonly status: "finalized";
      readonly investigation: Investigation<"finalized">;
      readonly result: SuccessfulResult<"investigation_finalize">;
    }
  | {
      readonly status: "active";
      readonly investigation: Investigation<"active">;
      readonly result: UnsuccessfulResult<"investigation_finalize">;
    };

type InvestigationValidationRequest = InvestigationBoundInput & {
  readonly requireClean: boolean;
};

/**
 * Performs the complete investigation lifecycle without exposing transport
 * identities or runtime implementation objects.
 *
 * @remarks
 * Methods appear in lifecycle order. Carry the returned {@link Investigation}
 * into the next call and replace an active proof with the one returned by
 * `execute`. Native failures remain in results and {@link AttuneReceipt};
 * rejected boundaries fail with {@link AttuneToolFailure}, while invalid proof
 * use fails with {@link InvestigationLifecycleError}.
 *
 * @example Infer a request in a second file
 * ```ts
 * // @filename: inputs.ts
 * import type { Attune } from "attune-mcp";
 * export declare const materialize: Parameters<Attune["materialize"]>[0];
 * // @filename: lifecycle.ts
 * import { Attune } from "attune-mcp";
 * import * as input from "./inputs.js";
 * // ---cut---
 * const program = Attune.use((attune) =>
 *   attune.materialize(input.materialize));
 * ```
 *
 * @example Move a materialized proof to active
 * ```ts
 * import { Attune, type Investigation } from "attune-mcp";
 * declare const materialized: Investigation<"materialized">;
 * // ---cut-before---
 * const activation = Attune.use((attune) => attune.activate(materialized));
 * ```
 */
export interface Attune {
  /**
   * Materializes an exact repository revision and issues its initial proof.
   *
   * @remarks
   * This is the only transition that creates an investigation identity.
   *
   * @param input - The unchanged `repository_materialize` wire request.
   * @returns A materialized proof on success, or the terminal rejected result.
   * @throws `AttuneToolFailure` when the invocation cannot be accepted.
   * @produces materialized
   *
   * @example Infer the wire request from the method
   * ```ts
   * import type { Attune } from "attune-mcp";
   * declare const attune: Attune;
   * declare const input: Parameters<Attune["materialize"]>[0];
   * // ---cut-before---
   * const attempt = attune.materialize(input);
   * ```
   *
   * @example Start through the Effect service key
   * ```ts
   * import { Attune } from "attune-mcp";
   * declare const input: Parameters<Attune["materialize"]>[0];
   * // ---cut-before---
   * const attempt = Attune.use((attune) => attune.materialize(input));
   * ```
   */
  materialize(
    input: AttuneOperationWireInput<"repository_materialize">,
  ): Effect.Effect<
    Materialization,
    AttuneOperationError<"repository_materialize">
  >;
  /**
   * Revalidates a materialized snapshot and grants active permission.
   *
   * @remarks
   * Activation consumes the materialized proof; carry only the returned proof.
   *
   * @param investigation - The proof returned by successful materialization.
   * @returns A fresh active proof for preserving operations.
   * @throws `AttuneToolFailure` when durable workspace validation fails.
   * @throws `InvestigationLifecycleError` when the proof is invalid or stale.
   * @requires materialized
   * @produces active
   *
   * @example Activate the materialized snapshot
   * ```ts
   * import { Attune, type Investigation } from "attune-mcp";
   * declare const materialized: Investigation<"materialized">;
   * // ---cut-before---
   * const active = Attune.use((attune) => attune.activate(materialized));
   * ```
   *
   * @example Reject a finalized proof at compile time
   * ```ts
   * import { Attune, type Investigation } from "attune-mcp";
   * declare const finalized: Investigation<"finalized">;
   * // @errors: 2345
   * // ---cut-before---
   * Attune.use((attune) => attune.activate(finalized));
   * ```
   */
  activate(
    investigation: Investigation<"materialized">,
  ): Effect.Effect<
    Investigation<"active">,
    AttuneToolFailure | InvestigationLifecycleError
  >;
  /**
   * Reacquires active permission after a process restart.
   *
   * @remarks
   * Supply the persisted identity and exact expected commit; both are rechecked.
   *
   * @param input - Persisted investigation identity and expected snapshot.
   * @returns An active proof after validating durable state.
   * @throws `AttuneToolFailure` when durable workspace inspection fails.
   * @throws `InvestigationLifecycleError` when persisted evidence disagrees.
   * @produces active
   *
   * @example Rebuild the request from the last proof
   * ```ts
   * import { Attune, type Investigation } from "attune-mcp";
   * declare const previous: Investigation<"active">;
   * const input = { investigationId: previous.investigationId,
   *   expectedSnapshot: previous.snapshot.id };
   * // ---cut-before---
   * const active = Attune.use((attune) => attune.acquireActive(input));
   * ```
   *
   * @example Load persisted input from another module
   * ```ts
   * // @filename: persisted.ts
   * import type { Attune } from "attune-mcp";
   * export declare const input: Parameters<Attune["acquireActive"]>[0];
   * // @filename: restart.ts
   * import { Attune } from "attune-mcp";
   * import { input } from "./persisted.js";
   * // ---cut-before---
   * const active = Attune.use((attune) => attune.acquireActive(input));
   * ```
   */
  acquireActive(
    input: InvestigationBoundInput,
  ): Effect.Effect<
    Investigation<"active">,
    AttuneToolFailure | InvestigationLifecycleError
  >;
  /**
   * Runs one preserving operation against an active snapshot.
   *
   * @remarks
   * The operation name selects its request and result while the proof supplies
   * investigation identity. Replace the input proof with the returned one.
   *
   * @typeParam Name - The closed preserving operation selected for this call.
   * @param investigation - Current active proof; it is consumed on transition.
   * @param name - One registered operation whose transition is `preserve`.
   * @param input - Caller fields; identity and snapshot come from the proof.
   * @returns The result, receipt, and active proof to carry forward.
   * @throws `InvestigationLifecycleError` when active authority is invalid.
   * @throws `AttuneToolFailure` when the selected boundary rejects the call.
   * @requires active
   * @produces active
   *
   * @example Derive one operation input from the closed toolkit
   * ```ts
   * // @filename: input.ts
   * import { AttuneToolkit } from "attune-mcp";
   * type Wire = typeof AttuneToolkit.tools.maude_run.parametersSchema.Type;
   * export declare const input: Omit<Wire, "investigationId" | "expectedSnapshot">;
   * // @filename: run.ts
   * import { Attune, type Investigation } from "attune-mcp";
   * import { input } from "./input.js";
   * declare const active: Investigation<"active">;
   * // ---cut-before---
   * const run = Attune.use((attune) => attune.execute(active, "maude_run", input));
   * ```
   *
   * @example Reject finalized authority
   * ```ts
   * import { Attune, AttuneToolkit, type Investigation } from "attune-mcp";
   * type Wire = typeof AttuneToolkit.tools.maude_run.parametersSchema.Type;
   * declare const input: Omit<Wire, "investigationId" | "expectedSnapshot">;
   * declare const finalized: Investigation<"finalized">;
   * // @errors: 2345
   * // ---cut-before---
   * Attune.use((attune) => attune.execute(finalized, "maude_run", input));
   * ```
   */
  execute<Name extends PreservingAttuneOperationName>(
    investigation: Investigation<"active">,
    name: Name,
    input: AttuneOperationInput<Name>,
  ): Effect.Effect<
    Execution<Name>,
    AttuneOperationError<Name> | InvestigationLifecycleError
  >;
  /**
   * Finalizes an active investigation at its exact clean snapshot.
   *
   * @remarks
   * A rejected terminal result returns an active proof so the caller may repair
   * the repository and try again.
   *
   * @param investigation - Current active proof.
   * @param input - Finalization policy fields; identity comes from the proof.
   * @returns Finalized evidence, or the still-active proof after rejection.
   * @throws `AttuneToolFailure` when finalization cannot cross the boundary.
   * @throws `InvestigationLifecycleError` when active authority is invalid.
   * @requires active
   * @produces finalized
   *
   * @example Finalize active authority
   * ```ts
   * import { Attune, type Investigation } from "attune-mcp";
   * declare const active: Investigation<"active">;
   * declare const input: Parameters<Attune["finalize"]>[1];
   * // ---cut-before---
   * const terminal = Attune.use((attune) => attune.finalize(active, input));
   * ```
   *
   * @example Reject a materialized proof at compile time
   * ```ts
   * import { Attune, type Investigation } from "attune-mcp";
   * declare const materialized: Investigation<"materialized">;
   * declare const input: Parameters<Attune["finalize"]>[1];
   * // @errors: 2345
   * // ---cut-before---
   * Attune.use((attune) => attune.finalize(materialized, input));
   * ```
   */
  finalize(
    investigation: Investigation<"active">,
    input: AttuneOperationInput<"investigation_finalize">,
  ): Effect.Effect<
    Finalization,
    AttuneToolFailure | InvestigationLifecycleError
  >;
  /**
   * Reads a durable terminal result after an interrupted caller exchange.
   *
   * @remarks
   * Recovery is a correlated read: reuse the exact wire input from the lost
   * exchange and handle `undefined` as “no durable terminal result”.
   *
   * @typeParam Name - The closed terminal operation being correlated.
   * @param name - Registered non-materializing operation.
   * @param input - Original wire input used to correlate the receipt.
   * @returns The verified result, or `undefined` when none is durable.
   * @throws `InvestigationLifecycleError` when correlation evidence disagrees.
   * @throws `AttuneToolFailure` when the selected lookup boundary fails.
   *
   * @example Recover a preserving operation
   * ```ts
   * import { Attune, AttuneToolkit } from "attune-mcp";
   * type Input = typeof AttuneToolkit.tools.maude_run.parametersSchema.Type;
   * declare const input: Input;
   * // ---cut-before---
   * const recovered = Attune.use((attune) =>
   *   attune.recoverTerminal("maude_run", input));
   * ```
   *
   * @example Exclude materialization from terminal lookup
   * ```ts
   * import { Attune, AttuneToolkit } from "attune-mcp";
   * type Input =
   *   typeof AttuneToolkit.tools.repository_materialize.parametersSchema.Type;
   * declare const input: Input;
   * // @errors: 2345
   * // ---cut-before---
   * Attune.use((attune) =>
   *   attune.recoverTerminal("repository_materialize", input));
   * ```
   */
  recoverTerminal<Name extends ActiveAttuneOperationName>(
    name: Name,
    input: AttuneOperationWireInput<Name>,
  ): Effect.Effect<
    AttuneOperationResult<Name> | undefined,
    AttuneOperationError<Name> | InvestigationLifecycleError
  >;
}

export type InvestigationValidator = (
  request: InvestigationValidationRequest,
) => Effect.Effect<
  InvestigationManifest,
  AttuneToolFailure | InvestigationLifecycleError
>;

const messageOf = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

export const makePersistedInvestigationValidator =
  (inspector: {
    readonly inspect: (
      request: InvestigationBoundInput,
      signal: AbortSignal,
    ) => Promise<{
      readonly manifest: InvestigationManifest;
      readonly head: FullGitCommit;
      readonly dirty: boolean;
    }>;
  }): InvestigationValidator =>
  (request) =>
    Effect.tryPromise({
      try: async (signal) => {
        const { manifest, head, dirty } = await inspector.inspect(
          request,
          signal,
        );
        const failure =
          manifest.investigationId !== request.investigationId
            ? fail(
                "IdentityConflict",
                "persisted manifest belongs to another investigation",
                {
                  expected: request.investigationId,
                  observed: manifest.investigationId,
                },
              )
            : manifest.finalizedAt !== undefined
              ? fail("Finalized", "investigation is finalized")
              : head !== request.expectedSnapshot
                ? fail(
                    "StaleSnapshot",
                    "repository HEAD does not match expected snapshot",
                    { expected: request.expectedSnapshot, observed: head },
                  )
                : request.requireClean && dirty
                  ? fail(
                      "DirtyRepository",
                      "initial activation requires a clean repository",
                    )
                  : undefined;
        if (failure !== undefined) throw failure;
        return manifest;
      },
      catch: (cause) =>
        cause instanceof AttuneToolFailure
          ? cause
          : lifecycleError("ValidationFailed", messageOf(cause)),
    });

export const makeWorkspaceInvestigationValidator = (
  workspaces: Pick<WorkspaceStore, "withMount" | "head" | "dirty">,
): InvestigationValidator =>
  makePersistedInvestigationValidator({
    inspect: (request, signal) =>
      workspaces.withMount(
        request.investigationId,
        signal,
        async (workspace) => ({
          manifest: workspace.manifest,
          head: await workspaces.head(workspace.repositoryPath, signal),
          dirty: await workspaces.dirty(workspace.repositoryPath, signal),
        }),
      ),
  });

const lifecycleError = (
  reason: InvestigationLifecycleError["reason"],
  message: string,
  details: { readonly expected?: string; readonly observed?: string } = {},
): InvestigationLifecycleError =>
  new InvestigationLifecycleError({ reason, message, ...details });

const hasRegisteredOperation = (name: unknown): name is AttuneOperationName =>
  typeof name === "string" &&
  Object.prototype.hasOwnProperty.call(ATTUNE_OPERATIONS, name);

const isActiveOperationName = (
  name: unknown,
): name is ActiveAttuneOperationName =>
  hasRegisteredOperation(name) &&
  ATTUNE_OPERATIONS[name].transition !== "materialize";

const isPreservingOperationName = (
  name: unknown,
): name is PreservingAttuneOperationName =>
  isActiveOperationName(name) &&
  ATTUNE_OPERATIONS[name].transition === "preserve";

const isSuccessfulResult = <Name extends AttuneOperationName>(
  result: AttuneOperationResult<Name>,
): result is SuccessfulResult<Name> => result.receipt.status === "succeeded";

const operationError = (name: unknown, preserving: boolean) => {
  const expected = preserving
    ? "active-preserving operation"
    : "active operation";
  return lifecycleError(
    "UnrecognizedOperation",
    preserving
      ? "execution requires a registered active-preserving operation"
      : "terminal recovery requires a registered active operation",
    {
      expected,
      observed: String(name),
    },
  );
};

export const makeInvestigationServiceFromHandlers = (
  wireHandlers: AttuneOperationHandlers,
  validate: InvestigationValidator,
  terminalLookups: Partial<AttuneTerminalLookups> = {},
): Attune => {
  const issuer = makeInvestigationCapabilityIssuer();

  const validatedManifest = (request: InvestigationValidationRequest) =>
    validate(request).pipe(
      Effect.flatMap((manifest) => {
        const failure =
          manifest.investigationId !== request.investigationId
            ? lifecycleError(
                "IdentityMismatch",
                "persisted manifest belongs to another investigation",
                {
                  expected: request.investigationId,
                  observed: manifest.investigationId,
                },
              )
            : manifest.finalizedAt !== undefined
              ? lifecycleError(
                  "ValidationFailed",
                  "persisted investigation is already finalized",
                )
              : undefined;
        return failure === undefined
          ? Effect.succeed(manifest)
          : Effect.fail(failure);
      }),
    );

  const verifyCapability = <State extends InvestigationState>(
    investigation: Investigation<State>,
    state: State,
  ) =>
    Effect.try({
      try: () => issuer.require(investigation, state),
      catch: (cause) =>
        cause instanceof InvestigationLifecycleError
          ? cause
          : lifecycleError("UnrecognizedCapability", messageOf(cause)),
    });

  const handleActive = <Name extends ActiveAttuneOperationName>(
    investigation: Investigation<"active">,
    name: Name,
    input: AttuneOperationInput<Name>,
  ): ReturnType<AttuneOperationHandler<Name>> => {
    const handler = wireHandlers[name] as AttuneOperationHandler<Name>;
    return handler({
      ...input,
      investigationId: investigation.investigationId,
      expectedSnapshot: investigation.snapshot.id,
    } as AttuneOperationWireInput<Name>);
  };

  const transition = <To extends InvestigationState>(
    investigation: Investigation<InvestigationState>,
    snapshotId: FullGitCommit,
    state: To,
  ): Investigation<To> => {
    issuer.revoke(investigation);
    return issuer.issue(investigation.investigationId, snapshotId, state);
  };

  const withActive = <Success, Error>(
    investigation: Investigation<"active">,
    use: (snapshotId: FullGitCommit) => Effect.Effect<Success, Error>,
  ): Effect.Effect<Success, Error | InvestigationLifecycleError> =>
    verifyCapability(investigation, "active").pipe(
      Effect.flatMap(({ snapshotId }) => use(snapshotId)),
      Effect.onInterrupt(() => Effect.sync(() => issuer.revoke(investigation))),
    );

  const confirmPersistedActive = (
    investigation: Investigation<"active">,
    expectedSnapshot: FullGitCommit,
  ): Effect.Effect<void, InvestigationLifecycleError> => {
    const request = {
      investigationId: investigation.investigationId,
      expectedSnapshot,
      requireClean: false,
    } as const;
    return validatedManifest(request).pipe(
      Effect.map(() => undefined),
      Effect.mapError((cause) =>
        lifecycleError(
          "StateMismatch",
          `persisted investigation no longer proves active permission: ${cause.message}`,
          {
            expected: expectedSnapshot,
            observed:
              cause instanceof AttuneToolFailure
                ? (cause.observed ?? cause.code)
                : (cause.observed ?? cause.reason),
          },
        ),
      ),
      Effect.tapError(() => Effect.sync(() => issuer.revoke(investigation))),
    );
  };

  const preserveFailure =
    (investigation: Investigation<"active">, snapshotId: FullGitCommit) =>
    <Error>(failure: Error) =>
      confirmPersistedActive(investigation, snapshotId).pipe(
        Effect.andThen(Effect.fail(failure)),
      );

  const materialize = (
    input: AttuneOperationWireInput<"repository_materialize">,
  ) =>
    Effect.map(wireHandlers.repository_materialize(input), (result) =>
      isSuccessfulResult<"repository_materialize">(result)
        ? ({
            status: "materialized",
            investigation: issuer.issue(
              result.investigationId,
              result.resolvedCommit,
              "materialized",
            ),
            result,
          } as const)
        : ({ status: "rejected", result } as const),
    );

  const activate = (investigation: Investigation<"materialized">) =>
    Effect.gen(function* () {
      const capability = yield* verifyCapability(investigation, "materialized");
      const request = {
        investigationId: capability.investigationId,
        expectedSnapshot: capability.snapshotId,
        requireClean: true,
      } as const;
      const manifest = yield* validatedManifest(request);
      if (manifest.resolvedCommit !== capability.snapshotId) {
        return yield* Effect.fail(
          lifecycleError(
            "ValidationFailed",
            "materialized manifest does not prove the capability snapshot",
            {
              expected: capability.snapshotId,
              observed: manifest.resolvedCommit,
            },
          ),
        );
      }
      return transition(investigation, capability.snapshotId, "active");
    });

  const acquireActive = (input: InvestigationBoundInput) =>
    validatedManifest({ ...input, requireClean: false }).pipe(
      Effect.map(() =>
        issuer.issue(input.investigationId, input.expectedSnapshot, "active"),
      ),
    );

  const execute = <Name extends PreservingAttuneOperationName>(
    investigation: Investigation<"active">,
    name: Name,
    input: AttuneOperationInput<Name>,
  ) => {
    if (!isPreservingOperationName(name)) {
      return Effect.fail(operationError(name, true));
    }
    return withActive(investigation, (snapshotId) =>
      Effect.gen(function* () {
        const result: AttuneOperationResult<Name> = yield* handleActive(
          investigation,
          name,
          input,
        ).pipe(Effect.catch(preserveFailure(investigation, snapshotId)));
        const receipt = operationReceipt<Name>(result);
        yield* confirmPersistedActive(
          investigation,
          receipt.status === "succeeded" ? receipt.snapshotId : snapshotId,
        );
        return {
          investigation:
            receipt.status === "succeeded"
              ? transition(investigation, receipt.snapshotId, "active")
              : investigation,
          result,
          receipt,
        } as const;
      }),
    );
  };

  const finalize = (
    investigation: Investigation<"active">,
    input: AttuneOperationInput<"investigation_finalize">,
  ) =>
    withActive(investigation, (snapshotId) =>
      Effect.gen(function* () {
        const result = yield* handleActive(
          investigation,
          "investigation_finalize",
          input,
        ).pipe(Effect.catch(preserveFailure(investigation, snapshotId)));
        if (isSuccessfulResult<"investigation_finalize">(result)) {
          return {
            status: "finalized",
            investigation: transition(
              investigation,
              result.receipt.snapshotId,
              "finalized",
            ),
            result,
          } as const;
        }
        yield* confirmPersistedActive(investigation, snapshotId);
        return { status: "active", investigation, result } as const;
      }),
    );

  const recoverTerminal = <Name extends ActiveAttuneOperationName>(
    name: Name,
    input: AttuneOperationWireInput<Name>,
  ): Effect.Effect<
    AttuneOperationResult<Name> | undefined,
    AttuneOperationError<Name> | InvestigationLifecycleError
  > => {
    if (!isActiveOperationName(name)) {
      return Effect.fail(operationError(name, false));
    }
    const lookup = terminalLookups[name];
    if (lookup === undefined) return Effect.succeed(undefined);
    return Effect.flatMap(lookup(input), (result) =>
      result === undefined
        ? Effect.succeed(undefined)
        : validateOperationResult(name, input, Effect.succeed(result)),
    );
  };

  return {
    materialize,
    activate,
    acquireActive,
    execute,
    finalize,
    recoverTerminal,
  };
};

export const makeInvestigationService = (
  config: RuntimeConfig = loadRuntimeConfig(),
): Attune => {
  const runtime = makeAttuneRuntime(config);
  return makeInvestigationServiceFromHandlers(
    runtime.handlers,
    makeWorkspaceInvestigationValidator(runtime.workspaces),
    runtime.terminalLookups,
  );
};

/** Effect service key with the normal production constructor at `Attune.make`. */
export const Attune = Object.assign(
  Context.Service<Attune>("attune-mcp/Attune"),
  { make: makeInvestigationService },
);
