import { Context, Effect } from "effect";

import { AttuneToolFailure, type FullGitCommit } from "../contract/schemas.js";
import { fail, loadRuntimeConfig, type RuntimeConfig } from "../platform/core.js";
import { makeAttuneRuntime } from "../server/runtime.js";
import {
  ATTUNE_OPERATIONS,
  type ActiveAttuneOperationName,
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
import { operationReceipt, validateOperationResult, type InvestigationBoundInput } from "./operation.js";
import { WorkspaceStore, type InvestigationManifest } from "./workspace.js";

/** Selects a succeeded operation result. */ type SuccessfulResult<Name extends AttuneOperationName> =
  Extract<AttuneOperationResult<Name>, { readonly receipt: { readonly status: "succeeded" } }>;
/** Selects failed or cancelled operation results. */ type UnsuccessfulResult<
  Name extends AttuneOperationName,
> = Exclude<AttuneOperationResult<Name>, SuccessfulResult<Name>>;
/** Separates granted materialized authority from terminal rejection evidence. */ type Materialization =
  | {
      readonly status: "materialized";
      readonly investigation: Investigation<"materialized">;
      readonly result: SuccessfulResult<"repository_materialize">;
    }
  | {
      readonly status: "rejected";
      readonly result: UnsuccessfulResult<"repository_materialize">;
    };
/** Carries replacement active authority with one preserving result. */ type Execution<
  Name extends PreservingAttuneOperationName,
> = {
  /** Replacement authority after execution. */ readonly investigation: Investigation<"active">;
  /** Correlated terminal operation result. */ readonly result: AttuneOperationResult<Name>;
  /** Durable receipt extracted from the result. */ readonly receipt: AttuneOperationReceipt<Name>;
};
/** Separates closed evidence from authority retained after rejection. */ type Finalization =
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

/** Adds clean-tree policy to persisted authority validation. */ type InvestigationValidationRequest =
  InvestigationBoundInput & {
    readonly requireClean: boolean;
  };

/**
 * Performs the complete typed lifecycle from repository revision to durable evidence.
 *
 * @remarks
 *   Read the members in lifecycle order: {@link Attune.materialize} binds an exact revision,
 *   {@link Attune.activate} validates its first proof, preserving calls go through {@link Attune.execute},
 *   and {@link Attune.finalize} closes the investigation. {@link Attune.acquireActive} is the restart path,
 *   not an alternate way to create authority. Every state-changing member accepts or returns an
 *   {@link Investigation} whose state parameter names the next legal operation. Treat the value as consumed
 *   even though JavaScript cannot enforce linear ownership: after {@link Attune.execute} or a transition,
 *   discard the older proof and carry only the newly returned one. Accepted native outcomes remain data in
 *   {@link AttuneReceipt}; they do not escape as arbitrary exceptions. {@link AttuneToolFailure} represents a
 *   call rejected at the typed tool boundary, {@link InvestigationLifecycleError} represents invalid
 *   capability use, and {@link Attune.recoverTerminal} reads a correlated result when the caller lost the
 *   original exchange. Follow the [complete investigation](#complete-investigation) for the one
 *   materialize-to-finalize program used throughout this reference.
 */
export interface Attune {
  /**
   * Materializes one exact repository revision and issues the initial lifecycle proof.
   *
   * @remarks
   *   Materialization is the sole identity-creating transition. Its input is exactly the repository
   *   materialization contract exposed by {@link AttuneToolkit}; the caller supplies a remote, a revision, a
   *   stable invocation identity, and optional references without manufacturing lifecycle fields. A
   *   successful result carries an {@link Investigation} in the `"materialized"` state, tied to the resolved
   *   full commit rather than a moving branch name. A terminal native rejection instead carries an
   *   {@link AttuneReceipt} and no proof, so rejected work cannot be activated accidentally. Continue only
   *   through {@link Attune.activate}. {@link AttuneToolFailure} means the invocation could not be accepted or
   *   correlated at the boundary; it is distinct from a failed terminal receipt, which is reproducible
   *   evidence returned as ordinary result data.
   * @param input - The exact materialization request inferred from {@link Attune.materialize}; unlike later
   *   operations, it contains no pre-existing {@link Investigation}.
   * @returns A discriminated result containing either a new materialized {@link Investigation} and success
   *   evidence, or a rejected {@link AttuneReceipt} with no granted authority.
   * @failure {@link AttuneToolFailure} - Correct the invocation identity or repository boundary before retrying.
   */
  materialize(
    input: AttuneOperationWireInput<"repository_materialize">,
  ): Effect.Effect<Materialization, AttuneToolFailure>;
  /**
   * Revalidates a materialized snapshot and grants active-operation permission.
   *
   * @remarks
   *   Activation accepts only the {@link Investigation} returned by successful {@link Attune.materialize}. The
   *   `"materialized"` state records that the repository exists at an exact commit but has not yet been
   *   revalidated as the clean active workspace used by analysis operations. Runtime validation checks issuer
   *   provenance, revocation, persisted investigation identity, the current full Git commit, and initial
   *   cleanliness. On success the input proof is revoked and a fresh {@link Investigation} in the `"active"`
   *   state becomes the only value that should reach {@link Attune.execute} or {@link Attune.finalize}. A stale
   *   or forged proof fails with {@link InvestigationLifecycleError}; a durable workspace inspection failure
   *   uses {@link AttuneToolFailure}. Neither outcome grants active authority, and retrying should begin by
   *   correcting the evidence rather than asserting a different TypeScript state.
   * @param investigation - The genuine materialized {@link Investigation} issued by
   *   {@link Attune.materialize}; the transition consumes it.
   * @returns A fresh active {@link Investigation} that may be passed to {@link Attune.execute} or
   *   {@link Attune.finalize}.
   * @failure {@link AttuneToolFailure} - Repair the persisted workspace boundary before retrying.
   * @failure {@link InvestigationLifecycleError} - Stop using the stale proof and materialize or reacquire current authority.
   */
  activate(
    investigation: Investigation<"materialized">,
  ): Effect.Effect<Investigation<"active">, AttuneToolFailure | InvestigationLifecycleError>;
  /**
   * Reacquires active permission from persisted identity and snapshot evidence.
   *
   * @remarks
   *   Reacquisition is the restart counterpart to {@link Attune.activate}. It accepts the persisted
   *   {@link Investigation.investigationId} and exact {@link Investigation.snapshot} commit because the
   *   in-memory branded proof cannot and should not be serialized across processes. Reacquisition inspects
   *   durable state, confirms that the investigation has not been finalized, and compares the requested
   *   snapshot with the repository head before issuing a new active {@link Investigation}. Supplying an
   *   identity alone is never enough to recover authority. Use the returned proof with {@link Attune.execute}
   *   or {@link Attune.finalize}, and replace it after each subsequent transition. {@link AttuneToolFailure}
   *   reports an inspection boundary failure, while {@link InvestigationLifecycleError} reports durable
   *   evidence that disagrees with the requested identity or snapshot.
   * @param input - The persisted {@link Investigation.investigationId} and exact
   *   {@link Investigation.snapshot} commit expected after restart.
   * @returns A newly issued active {@link Investigation} after the durable workspace and lifecycle record
   *   agree.
   * @failure {@link AttuneToolFailure} - Restore the durable workspace boundary before reacquiring authority.
   * @failure {@link InvestigationLifecycleError} - Reload the persisted identity and exact snapshot instead of guessing authority.
   */
  acquireActive(
    input: InvestigationBoundInput,
  ): Effect.Effect<Investigation<"active">, AttuneToolFailure | InvestigationLifecycleError>;
  /**
   * Runs one closed preserving operation against an active investigation snapshot.
   *
   * @remarks
   *   The `Name` argument selects one preserving entry in {@link AttuneToolkit}, and that selection determines
   *   both the `input` type and the native result type. The active {@link Investigation} supplies identity and
   *   expected snapshot fields, so application callers describe only operation-specific intent. Every
   *   accepted call returns its result, correlated {@link AttuneReceipt}, and an active {@link Investigation}.
   *   A succeeded receipt replaces the proof at the new snapshot; a failed or cancelled receipt returns the
   *   still-valid original proof because no repository transition was accepted.
   *   {@link InvestigationLifecycleError} prevents stale, forged, revoked, or non-active authority from
   *   crossing the boundary. {@link AttuneToolFailure} rejects an invalid selected call; after an interrupted
   *   accepted exchange, use {@link Attune.recoverTerminal} with the original wire identity instead of running
   *   the operation again.
   * @typeParam Name - The preserving {@link AttuneToolkit} operation whose request, result, receipt, and
   *   failure types are selected for this call.
   * @param investigation - The current active {@link Investigation}; a succeeded operation consumes and
   *   replaces it, while failed or cancelled terminal evidence leaves it valid.
   * @param name - One closed {@link AttuneToolkit} operation whose lifecycle transition is `preserve`.
   * @param input - Operation-specific caller fields; {@link Attune.execute} derives investigation identity
   *   and expected snapshot from the proof.
   * @returns The selected result, correlated {@link AttuneReceipt}, and active {@link Investigation}:
   *   replaced after success or retained after failed or cancelled evidence.
   * @failure {@link AttuneToolFailure} - Correct the selected tool boundary before retrying.
   * @failure {@link InvestigationLifecycleError} - Reacquire current active authority or stop the operation.
   */
  execute<Name extends PreservingAttuneOperationName>(
    investigation: Investigation<"active">,
    name: Name,
    input: AttuneOperationInput<Name>,
  ): Effect.Effect<Execution<Name>, AttuneToolFailure | InvestigationLifecycleError>;
  /**
   * Finalizes an active investigation only at its exact clean snapshot.
   *
   * @remarks
   *   Finalization consumes an active {@link Investigation} and checks the same exact identity and full commit
   *   carried by its proof. It is exclusive: terminal lifecycle evidence is recorded only when the repository
   *   satisfies the selected clean-snapshot policy. The returned discriminant tells the caller what authority
   *   remains. `"finalized"` carries an {@link Investigation} that cannot enter preserving methods; `"active"`
   *   accompanies a rejected terminal {@link AttuneReceipt} and retains the original active proof so the
   *   caller can repair the repository deliberately. Continue with no operation after successful
   *   finalization. After a rejected result, carry only the returned active proof into {@link Attune.execute}
   *   or a later {@link Attune.finalize}; boundary rejection uses {@link AttuneToolFailure}, while invalid
   *   proof use remains an {@link InvestigationLifecycleError}.
   * @param investigation - The current active {@link Investigation}, consumed only when finalization succeeds
   *   and otherwise returned for deliberate repair.
   * @param input - Finalization policy fields only; {@link Attune.finalize} supplies identity and exact
   *   snapshot from the proof.
   * @returns Finalized {@link Investigation} evidence on success, or a rejected {@link AttuneReceipt} plus
   *   the retained active proof when repair remains legal.
   * @failure {@link AttuneToolFailure} - Repair the finalization boundary before retrying with current authority.
   * @failure {@link InvestigationLifecycleError} - Stop using the stale proof and reacquire active authority.
   */
  finalize(
    investigation: Investigation<"active">,
    input: AttuneOperationInput<"investigation_finalize">,
  ): Effect.Effect<Finalization, AttuneToolFailure | InvestigationLifecycleError>;
  /**
   * Reads a correlated durable terminal result after an interrupted exchange.
   *
   * @remarks
   *   Terminal recovery is a read, not a retry. Supply the same active operation name and exact wire input
   *   used by the interrupted call so persisted invocation identity, investigation identity, expected
   *   snapshot, input digest, and {@link AttuneReceipt} can be correlated. A verified result is the same
   *   terminal contract selected by {@link AttuneToolkit}; `undefined` means no durable terminal result exists
   *   for that correlation key. Recovery issues no {@link Investigation}, changes no lifecycle state, and
   *   never converts absence into synthetic success. Materialization is deliberately excluded because it
   *   creates investigation identity rather than consuming an established one.
   *   {@link InvestigationLifecycleError} reports contradictory correlation evidence, {@link AttuneToolFailure}
   *   reports lookup-boundary failure, and callers should resume with a separately reacquired proof through
   *   {@link Attune.acquireActive}.
   * @typeParam Name - The non-materializing {@link AttuneToolkit} operation whose durable terminal contract
   *   is being correlated.
   * @param name - The same registered operation name passed to the interrupted {@link Attune.execute} or
   *   {@link Attune.finalize} exchange.
   * @param input - The original complete wire input whose identities and digest correlate the persisted
   *   {@link AttuneReceipt}.
   * @returns The verified operation result containing its {@link AttuneReceipt}, or `undefined` when no
   *   durable terminal result exists.
   * @failure {@link AttuneToolFailure} - Restore the durable lookup boundary before checking again.
   * @failure {@link InvestigationLifecycleError} - Correct the persisted correlation evidence instead of repeating the operation.
   */
  recoverTerminal<Name extends ActiveAttuneOperationName>(
    name: Name,
    input: AttuneOperationWireInput<Name>,
  ): Effect.Effect<AttuneOperationResult<Name> | undefined, AttuneToolFailure | InvestigationLifecycleError>;
}

/**
 * Validates persisted evidence before issuing active authority. @remarks Validation distinguishes
 * tool-boundary failure from lifecycle rejection while returning the exact manifest. @param request -
 * Identity, snapshot, and cleanliness policy. @returns The validated manifest effect.
 *
 * @failure {@link AttuneToolFailure} - Restore the persisted workspace boundary before validating again.
 * @failure {@link InvestigationLifecycleError} - Correct stale or invalid lifecycle evidence before retrying.
 */
export type InvestigationValidator = (
  request: InvestigationValidationRequest,
) => Effect.Effect<InvestigationManifest, AttuneToolFailure | InvestigationLifecycleError>;

/**
 * Extracts readable text from an unknown failure. @param cause - Unknown failure. @returns Its message or
 * string representation.
 */
const messageOf = (cause: unknown): string => (cause instanceof Error ? cause.message : String(cause));

/**
 * Creates a validator over persisted investigation inspection. @remarks Identity, finalization, snapshot, and
 * cleanliness are checked before manifest evidence is returned. @param inspector - Persisted evidence
 * reader.
 *
 * @returns The investigation validator.
 */
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
        const { manifest, head, dirty } = await inspector.inspect(request, signal);
        const failure =
          manifest.investigationId !== request.investigationId
            ? fail("IdentityConflict", "persisted manifest belongs to another investigation", {
                expected: request.investigationId,
                observed: manifest.investigationId,
              })
            : manifest.finalizedAt !== undefined
              ? fail("Finalized", "investigation is finalized")
              : head !== request.expectedSnapshot
                ? fail("StaleSnapshot", "repository HEAD does not match expected snapshot", {
                    expected: request.expectedSnapshot,
                    observed: head,
                  })
                : request.requireClean && dirty
                  ? fail("DirtyRepository", "initial activation requires a clean repository")
                  : undefined;
        if (failure !== undefined) throw failure;
        return manifest;
      },
      catch: (cause) =>
        cause instanceof AttuneToolFailure ? cause : lifecycleError("ValidationFailed", messageOf(cause)),
    });

/**
 * Binds persisted validation to a workspace store. @remarks Inspection occurs within one validated mount and
 * reads current HEAD and dirtiness together.
 *
 * @param workspaces - Required workspace operations. @returns The investigation validator.
 */
export const makeWorkspaceInvestigationValidator = (
  workspaces: Pick<WorkspaceStore, "withMount" | "head" | "dirty">,
): InvestigationValidator =>
  makePersistedInvestigationValidator({
    inspect: (request, signal) =>
      workspaces.withMount(request.investigationId, signal, async (workspace) => ({
        manifest: workspace.manifest,
        head: await workspaces.head(workspace.repositoryPath, signal),
        dirty: await workspaces.dirty(workspace.repositoryPath, signal),
      })),
  });

/**
 * Constructs a lifecycle rejection with optional comparison evidence. @param reason - Stable lifecycle
 * reason. @param message - Caller explanation. @param details - Optional expected and observed evidence.
 *
 * @returns The lifecycle error.
 */
const lifecycleError = (
  reason: InvestigationLifecycleError["reason"],
  message: string,
  details: { readonly expected?: string; readonly observed?: string } = {},
): InvestigationLifecycleError => new InvestigationLifecycleError({ reason, message, ...details });

/**
 * Tests membership in the closed operation registry. @param name - Candidate key. @returns Whether it is
 * registered.
 */
const hasRegisteredOperation = (name: unknown): name is AttuneOperationName =>
  typeof name === "string" && Object.prototype.hasOwnProperty.call(ATTUNE_OPERATIONS, name);

/**
 * Narrows a registered operation to one requiring active authority. @param name - Candidate key. @returns
 * Whether it is active.
 */
const isActiveOperationName = (name: unknown): name is ActiveAttuneOperationName =>
  hasRegisteredOperation(name) && ATTUNE_OPERATIONS[name].transition !== "materialize";

/**
 * Narrows an active operation to one preserving authority. @param name - Candidate key. @returns Whether it
 * preserves active state.
 */
const isPreservingOperationName = (name: unknown): name is PreservingAttuneOperationName =>
  isActiveOperationName(name) && ATTUNE_OPERATIONS[name].transition === "preserve";

/**
 * Narrows a correlated result to successful evidence. @typeParam Name - Operation key. @param result -
 * Terminal result. @returns Whether its receipt succeeded.
 */
const isSuccessfulResult = <Name extends AttuneOperationName>(
  result: AttuneOperationResult<Name>,
): result is SuccessfulResult<Name> => result.receipt.status === "succeeded";

/**
 * Explains why a requested operation cannot use the selected lifecycle path.
 *
 * @param name - Candidate operation. @param preserving - Whether preservation is required. @returns The
 *   lifecycle error.
 */
const operationError = (name: unknown, preserving: boolean): InvestigationLifecycleError => {
  const expected = preserving ? "active-preserving operation" : "active operation";
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

/**
 * Constructs Attune from a closed handler registry. @remarks Capability provenance, persisted validation,
 * result correlation, and terminal recovery stay centralized across all lifecycle members. @param
 * wireHandlers - Correlated operation handlers. @param validate - Persisted authority validator. @param
 * terminalLookups - Optional recovery lookups. @returns The Attune lifecycle service.
 */
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
            ? lifecycleError("IdentityMismatch", "persisted manifest belongs to another investigation", {
                expected: request.investigationId,
                observed: manifest.investigationId,
              })
            : manifest.finalizedAt !== undefined
              ? lifecycleError("ValidationFailed", "persisted investigation is already finalized")
              : undefined;
        return failure === undefined ? Effect.succeed(manifest) : Effect.fail(failure);
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
      confirmPersistedActive(investigation, snapshotId).pipe(Effect.andThen(Effect.fail(failure)));

  const materialize = (input: AttuneOperationWireInput<"repository_materialize">) =>
    Effect.map(wireHandlers.repository_materialize(input), (result) =>
      isSuccessfulResult<"repository_materialize">(result)
        ? ({
            status: "materialized",
            investigation: issuer.issue(result.investigationId, result.resolvedCommit, "materialized"),
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
          lifecycleError("ValidationFailed", "materialized manifest does not prove the capability snapshot", {
            expected: capability.snapshotId,
            observed: manifest.resolvedCommit,
          }),
        );
      }
      return transition(investigation, capability.snapshotId, "active");
    });

  const acquireActive = (input: InvestigationBoundInput) =>
    validatedManifest({ ...input, requireClean: false }).pipe(
      Effect.map(() => issuer.issue(input.investigationId, input.expectedSnapshot, "active")),
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
        const result: AttuneOperationResult<Name> = yield* handleActive(investigation, name, input).pipe(
          Effect.catch(preserveFailure(investigation, snapshotId)),
        );
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
        const result = yield* handleActive(investigation, "investigation_finalize", input).pipe(
          Effect.catch(preserveFailure(investigation, snapshotId)),
        );
        if (isSuccessfulResult<"investigation_finalize">(result)) {
          return {
            status: "finalized",
            investigation: transition(investigation, result.receipt.snapshotId, "finalized"),
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
    AttuneToolFailure | InvestigationLifecycleError
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

/**
 * Constructs the production Attune service. @remarks One runtime supplies shared handlers, workspace
 * validation, and terminal lookups. @param config - Runtime configuration. @returns The Attune lifecycle
 * service.
 */
export const makeInvestigationService = (config: RuntimeConfig = loadRuntimeConfig()): Attune => {
  const runtime = makeAttuneRuntime(config);
  return makeInvestigationServiceFromHandlers(
    runtime.handlers,
    makeWorkspaceInvestigationValidator(runtime.workspaces),
    runtime.terminalLookups,
  );
};

export const Attune = Object.assign(Context.Service<Attune>("attune-mcp/Attune"), {
  /** Production lifecycle service constructor. */ make: makeInvestigationService,
});
