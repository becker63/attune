/**
 * `InvestigationService` is the application boundary over materialization,
 * persisted activation, operation execution, receipts, and finalization.
 *
 * @remarks
 * Read this module after `capability.ts` and `operation.ts`. The MCP server is
 * only a wire adapter over this service; it does not mint or cache lifecycle
 * capabilities.
 */

import { Context, Effect } from "effect";

import { InvestigationFinalizeOperation } from "../tools/investigation/operation.js";
import {
  ATTUNE_OPERATIONS,
  makeAttuneCapabilityHandlers,
  type ActiveAttuneOperationName,
  type AttuneOperationHandlers,
  type AttuneTerminalLookups,
  type PreservingAttuneOperationName,
} from "../tools/registry.js";
import { RepositoryMaterializeOperation } from "../tools/repository/operation.js";
import {
  AttuneToolFailure,
  type FullGitCommit,
  type InvestigationId,
  type RepositoryMaterializeInput,
} from "../v0/contracts.js";
import { loadRuntimeConfig, type RuntimeConfig } from "../v0/core.js";
import {
  makeAttuneOperationHandlers,
  makeAttuneRuntime,
  type AttuneHandlers,
} from "../v0/service.js";
import {
  WorkspaceStore,
  type InvestigationManifest,
  type MountedWorkspace,
} from "../v0/workspace.js";
import {
  makeInvestigationCapabilityIssuer,
  type ActiveInvestigation,
  type FinalizedInvestigation,
  type Investigation,
  type InvestigationCapabilityIssuer,
  type InvestigationState,
  type MaterializedInvestigationCapability,
} from "./capability.js";
import { InvestigationLifecycleError } from "./errors.js";
import {
  operationReceipt,
  validateOperationResult,
  type AnyToolOperation,
  type InvestigationBoundInput,
  type OperationError,
  type OperationInput,
  type OperationReceipt,
  type OperationResultOf,
  type OperationWireInput,
  type SuccessfulOperationResult,
  type UnsuccessfulOperationResult,
} from "./operation.js";

/** Descriptor selected by one registry key. */
export type RegisteredAttuneOperation<
  Name extends keyof typeof ATTUNE_OPERATIONS,
> = (typeof ATTUNE_OPERATIONS)[Name];

/** Operations that preserve active investigation permission. */
export type ActiveInvestigationOperation =
  RegisteredAttuneOperation<PreservingAttuneOperationName>;

type InvestigationExecutionArguments<
  Name extends PreservingAttuneOperationName,
> = Name extends PreservingAttuneOperationName
  ? [name: Name, input: OperationInput<RegisteredAttuneOperation<Name>>]
  : never;

type InvestigationRecoveryArguments<Name extends ActiveAttuneOperationName> =
  Name extends ActiveAttuneOperationName
    ? [name: Name, input: OperationWireInput<RegisteredAttuneOperation<Name>>]
    : never;

/**
 * The result of materialization before workspace activation.
 *
 * @remarks
 * Only the successful branch carries a capability. Failed and cancelled
 * terminal receipts remain ordinary values, preserving the MCP contract.
 */
export type MaterializationOutcome =
  | {
      readonly status: "materialized";
      readonly investigation: MaterializedInvestigationCapability;
      readonly result: SuccessfulOperationResult<
        typeof RepositoryMaterializeOperation
      >;
    }
  | {
      readonly status: "rejected";
      readonly result: UnsuccessfulOperationResult<
        typeof RepositoryMaterializeOperation
      >;
    };

/**
 * A terminal operation result paired with the active permission that remains.
 *
 * @typeParam Name - Registry key retaining its input, result, and receipt
 * relationship.
 */
export type InvestigationExecution<Name extends PreservingAttuneOperationName> =
  Name extends PreservingAttuneOperationName
    ? {
        readonly investigation: ActiveInvestigation;
        readonly result: OperationResultOf<RegisteredAttuneOperation<Name>>;
        readonly receipt: OperationReceipt<RegisteredAttuneOperation<Name>>;
      }
    : never;

/**
 * Finalization either produces finalized evidence or preserves active
 * permission alongside a failed/cancelled terminal receipt.
 */
export type FinalizationOutcome =
  | {
      readonly status: "finalized";
      readonly investigation: FinalizedInvestigation;
      readonly result: SuccessfulOperationResult<
        typeof InvestigationFinalizeOperation
      >;
    }
  | {
      readonly status: "active";
      readonly investigation: ActiveInvestigation;
      readonly result: UnsuccessfulOperationResult<
        typeof InvestigationFinalizeOperation
      >;
    };

/** Persisted facts required to acquire active execution permission. */
export interface InvestigationValidationRequest extends InvestigationBoundInput {
  /**
   * Initial activation requires a clean materialization. Request-bound
   * acquisition permits a dirty tree so `checkpoint(policy: "commit")` can
   * commit changes intentionally created by prior writer operations.
   */
  readonly requireClean: boolean;
}

/**
 * Validates current persisted workspace evidence before permission is minted.
 */
export type InvestigationValidator = (
  request: InvestigationValidationRequest,
) => Effect.Effect<
  InvestigationManifest,
  AttuneToolFailure | InvestigationLifecycleError
>;

/**
 * Minimal persistence surface used by the production lifecycle validator.
 *
 * @remarks
 * Keeping this structural makes stale, dirty, and finalized validation
 * behavior testable without mounting an AgentFS capsule.
 */
export interface PersistedInvestigationInspector {
  readonly inspect: (
    request: InvestigationBoundInput,
    signal: AbortSignal,
  ) => Promise<{
    readonly manifest: InvestigationManifest;
    readonly head: FullGitCommit;
    readonly dirty: boolean;
  }>;
}

/**
 * Builds a validator from persisted workspace inspection.
 *
 * @remarks
 * Manifest identity, finalization, and current HEAD are always checked.
 * Cleanliness is checked only for initial materialized-to-active activation.
 */
export const makePersistedInvestigationValidator =
  (inspector: PersistedInvestigationInspector): InvestigationValidator =>
  (request) =>
    Effect.tryPromise({
      try: async (signal) => {
        const observed = await inspector.inspect(request, signal);
        if (observed.manifest.investigationId !== request.investigationId) {
          throw new AttuneToolFailure({
            code: "IdentityConflict",
            message: "persisted manifest belongs to another investigation",
            expected: request.investigationId,
            observed: observed.manifest.investigationId,
          });
        }
        if (observed.manifest.finalizedAt !== undefined) {
          throw new AttuneToolFailure({
            code: "Finalized",
            message: "investigation is finalized",
          });
        }
        if (observed.head !== request.expectedSnapshot) {
          throw new AttuneToolFailure({
            code: "StaleSnapshot",
            message: "repository HEAD does not match expected snapshot",
            expected: request.expectedSnapshot,
            observed: observed.head,
          });
        }
        if (request.requireClean && observed.dirty) {
          throw new AttuneToolFailure({
            code: "DirtyRepository",
            message: "initial activation requires a clean repository",
          });
        }
        return observed.manifest;
      },
      catch: (cause) =>
        cause instanceof AttuneToolFailure
          ? cause
          : new InvestigationLifecycleError({
              reason: "ValidationFailed",
              message: cause instanceof Error ? cause.message : String(cause),
            }),
    });

/**
 * Adapts the current workspace store to persisted lifecycle inspection.
 */
export const makeWorkspaceInvestigationValidator = (
  workspaces: Pick<WorkspaceStore, "withMount" | "head" | "dirty">,
): InvestigationValidator =>
  makePersistedInvestigationValidator({
    inspect: async (request, signal) =>
      await workspaces.withMount(
        request.investigationId,
        signal,
        async (workspace: MountedWorkspace) => ({
          manifest: workspace.manifest,
          head: await workspaces.head(workspace.repositoryPath, signal),
          dirty: await workspaces.dirty(workspace.repositoryPath, signal),
        }),
      ),
  });

/**
 * Public application service for legal investigation transitions.
 *
 * @remarks
 * Generic execution is keyed by the operation registry. The key selects its
 * exact domain input, terminal result, receipt, and failure union.
 */
export interface InvestigationServiceApi {
  /** Materializes an exact repository revision. */
  readonly materialize: (
    input: RepositoryMaterializeInput,
  ) => Effect.Effect<
    MaterializationOutcome,
    OperationError<typeof RepositoryMaterializeOperation>
  >;

  /**
   * Revalidates a materialized, exact-clean workspace and grants permission.
   */
  readonly activate: (
    investigation: MaterializedInvestigationCapability,
  ) => Effect.Effect<
    ActiveInvestigation,
    AttuneToolFailure | InvestigationLifecycleError
  >;

  /**
   * Reconstructs request-local active permission from persisted identity.
   *
   * @remarks
   * MCP requests carry only ordinary identity fields. This boundary validates
   * the manifest, finalization state, and current HEAD before minting a
   * runtime-only capability; no brand or capability is stored on the wire.
   */
  readonly acquireActive: (
    input: InvestigationBoundInput,
  ) => Effect.Effect<
    ActiveInvestigation,
    AttuneToolFailure | InvestigationLifecycleError
  >;

  /** Executes an active-preserving operation selected by registry name. */
  readonly execute: <const Name extends PreservingAttuneOperationName>(
    investigation: ActiveInvestigation,
    ...operation: InvestigationExecutionArguments<Name>
  ) => Effect.Effect<
    InvestigationExecution<Name>,
    | OperationError<RegisteredAttuneOperation<Name>>
    | InvestigationLifecycleError
  >;

  /** Exclusively finalizes one exact active snapshot. */
  readonly finalize: (
    investigation: ActiveInvestigation,
    input: OperationInput<typeof InvestigationFinalizeOperation>,
  ) => Effect.Effect<
    FinalizationOutcome,
    | OperationError<typeof InvestigationFinalizeOperation>
    | InvestigationLifecycleError
  >;

  /**
   * Looks up a previously accepted terminal invocation without starting work.
   *
   * @remarks
   * Recovery intentionally runs before active-capability acquisition. This
   * permits an exact retry to recover after its successful writer advanced the
   * snapshot or finalized the investigation. Absence is represented by
   * `undefined`; this path owns no implementation callback.
   *
   * @internal
   */
  readonly recoverTerminal: <const Name extends ActiveAttuneOperationName>(
    ...operation: InvestigationRecoveryArguments<Name>
  ) => Effect.Effect<
    OperationResultOf<RegisteredAttuneOperation<Name>> | undefined,
    | OperationError<RegisteredAttuneOperation<Name>>
    | InvestigationLifecycleError
  >;
}

/** Effect service tag for the typed investigation application boundary. */
export class InvestigationService extends Context.Service<
  InvestigationService,
  InvestigationServiceApi
>()("attune-mcp/InvestigationService") {}

const lifecycleError = (
  reason: InvestigationLifecycleError["reason"],
  message: string,
  details: {
    readonly expected?: string;
    readonly observed?: string;
  } = {},
): InvestigationLifecycleError =>
  new InvestigationLifecycleError({ reason, message, ...details });

const hasRegisteredOperation = (
  name: unknown,
): name is keyof typeof ATTUNE_OPERATIONS =>
  typeof name === "string" &&
  Object.prototype.hasOwnProperty.call(ATTUNE_OPERATIONS, name);

const isActiveOperationName = (
  name: unknown,
): name is ActiveAttuneOperationName =>
  hasRegisteredOperation(name) &&
  ATTUNE_OPERATIONS[name].lifecycle.requires === "active";

const isPreservingOperationName = (
  name: unknown,
): name is PreservingAttuneOperationName =>
  isActiveOperationName(name) &&
  ATTUNE_OPERATIONS[name].lifecycle.produces === "active";

type CapabilityHandlerForName<Name extends PreservingAttuneOperationName> = (
  investigation: ActiveInvestigation,
  input: OperationInput<RegisteredAttuneOperation<Name>>,
) => Effect.Effect<
  OperationResultOf<RegisteredAttuneOperation<Name>>,
  OperationError<RegisteredAttuneOperation<Name>>
>;

const validateRegisteredOperationResult = validateOperationResult as <
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

const verifyCapability = <State extends InvestigationState>(
  issuer: InvestigationCapabilityIssuer,
  investigation: Investigation<State>,
  state: State,
) =>
  Effect.try({
    try: () => issuer.require(investigation, state),
    catch: (cause) =>
      cause instanceof InvestigationLifecycleError
        ? cause
        : lifecycleError(
            "UnrecognizedCapability",
            cause instanceof Error ? cause.message : String(cause),
          ),
  });

const requireManifestEvidence = (
  request: InvestigationBoundInput,
  manifest: InvestigationManifest,
) => {
  if (manifest.investigationId !== request.investigationId) {
    return Effect.fail(
      lifecycleError(
        "IdentityMismatch",
        "persisted manifest belongs to another investigation",
        {
          expected: request.investigationId,
          observed: manifest.investigationId,
        },
      ),
    );
  }
  if (manifest.finalizedAt !== undefined) {
    return Effect.fail(
      lifecycleError(
        "ValidationFailed",
        "persisted investigation is already finalized",
      ),
    );
  }
  return Effect.void;
};

const isSuccessfulResult = <Name extends keyof typeof ATTUNE_OPERATIONS>(
  result: OperationResultOf<RegisteredAttuneOperation<Name>>,
): result is SuccessfulOperationResult<RegisteredAttuneOperation<Name>> =>
  result.receipt.status === "succeeded";

/**
 * Builds the typed service from descriptor-derived operation projections.
 *
 * @remarks
 * The validator is mandatory: neither activation nor an MCP request can mint
 * execution permission from caller-provided strings alone. Terminal lookups
 * are independently injected because recovery must never own a callback that
 * could accept new work.
 */
export const makeInvestigationServiceFromOperations = (
  wireHandlers: AttuneOperationHandlers,
  validate: InvestigationValidator,
  terminalLookups: Partial<AttuneTerminalLookups> = {},
): InvestigationServiceApi => {
  const issuer = makeInvestigationCapabilityIssuer();
  const handlers = makeAttuneCapabilityHandlers(wireHandlers);

  const revokeThenFail = <Error>(
    investigation: ActiveInvestigation,
    failure: Error,
  ): Effect.Effect<never, Error> =>
    Effect.sync(() => issuer.revoke(investigation)).pipe(
      Effect.flatMap(() => Effect.fail(failure)),
    );

  const confirmPersistedActive = (
    investigationId: InvestigationId,
    expectedSnapshot: FullGitCommit,
  ): Effect.Effect<void, InvestigationLifecycleError> => {
    const request = {
      investigationId,
      expectedSnapshot,
      requireClean: false,
    } as const;
    return validate(request).pipe(
      Effect.flatMap((observed) => requireManifestEvidence(request, observed)),
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
    );
  };

  const preserveOriginalFailure = <Error>(
    investigation: ActiveInvestigation,
    investigationId: InvestigationId,
    snapshotId: FullGitCommit,
    failure: Error,
  ): Effect.Effect<never, Error | InvestigationLifecycleError> =>
    confirmPersistedActive(investigationId, snapshotId).pipe(
      Effect.catch((stateFailure) =>
        revokeThenFail(investigation, stateFailure),
      ),
      Effect.flatMap(() => Effect.fail(failure)),
    );

  const confirmOrRevoke = (
    investigation: ActiveInvestigation,
    investigationId: InvestigationId,
    snapshotId: FullGitCommit,
  ): Effect.Effect<void, InvestigationLifecycleError> =>
    confirmPersistedActive(investigationId, snapshotId).pipe(
      Effect.catch((failure) => revokeThenFail(investigation, failure)),
    );

  const materialize: InvestigationServiceApi["materialize"] = (input) =>
    Effect.map(wireHandlers.repository_materialize(input), (result) =>
      isSuccessfulResult<"repository_materialize">(result)
        ? {
            status: "materialized",
            investigation: issuer.issue(
              result.investigationId,
              result.resolvedCommit,
              "materialized",
            ),
            result,
          }
        : { status: "rejected", result },
    );

  const activate: InvestigationServiceApi["activate"] = (investigation) =>
    Effect.gen(function* () {
      const capability = yield* verifyCapability(
        issuer,
        investigation,
        "materialized",
      );
      const request = {
        investigationId: capability.investigationId,
        expectedSnapshot: capability.snapshotId,
        requireClean: true,
      } as const;
      const manifest = yield* validate(request);
      yield* requireManifestEvidence(request, manifest);
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
      issuer.revoke(investigation);
      return issuer.issue(
        capability.investigationId,
        capability.snapshotId,
        "active",
      );
    });

  const acquireActive: InvestigationServiceApi["acquireActive"] = (input) =>
    Effect.gen(function* () {
      const manifest = yield* validate({ ...input, requireClean: false });
      yield* requireManifestEvidence(input, manifest);
      return issuer.issue(
        input.investigationId,
        input.expectedSnapshot,
        "active",
      );
    });

  const execute = <Name extends PreservingAttuneOperationName>(
    investigation: ActiveInvestigation,
    name: Name,
    input: OperationInput<RegisteredAttuneOperation<Name>>,
  ): Effect.Effect<
    InvestigationExecution<Name>,
    | OperationError<RegisteredAttuneOperation<Name>>
    | InvestigationLifecycleError
  > => {
    if (!isPreservingOperationName(name)) {
      return Effect.fail(
        lifecycleError(
          "UnrecognizedOperation",
          "execution requires a registered active-preserving operation",
          {
            expected: "active-preserving operation",
            observed: String(name),
          },
        ),
      );
    }
    const handler = handlers[name] as unknown as CapabilityHandlerForName<Name>;
    return Effect.gen(function* () {
      const capability = yield* verifyCapability(
        issuer,
        investigation,
        "active",
      );
      const result: OperationResultOf<RegisteredAttuneOperation<Name>> =
        yield* handler(investigation, input).pipe(
          Effect.catch((failure) =>
            preserveOriginalFailure(
              investigation,
              capability.investigationId,
              capability.snapshotId,
              failure,
            ),
          ),
        );
      const receipt = operationReceipt<RegisteredAttuneOperation<Name>>(result);
      const persistedSnapshot =
        receipt.status === "succeeded"
          ? receipt.snapshotId
          : capability.snapshotId;
      yield* confirmOrRevoke(
        investigation,
        capability.investigationId,
        persistedSnapshot,
      );
      if (receipt.status !== "succeeded") {
        return {
          investigation,
          result,
          receipt,
        } as InvestigationExecution<Name>;
      }
      issuer.revoke(investigation);
      return {
        investigation: issuer.issue(
          capability.investigationId,
          receipt.snapshotId,
          "active",
        ),
        result,
        receipt,
      } as InvestigationExecution<Name>;
    }).pipe(
      Effect.onInterrupt(() => Effect.sync(() => issuer.revoke(investigation))),
    );
  };

  const finalize: InvestigationServiceApi["finalize"] = (
    investigation,
    input,
  ) =>
    Effect.gen(function* () {
      const capability = yield* verifyCapability(
        issuer,
        investigation,
        "active",
      );
      const result = yield* handlers
        .investigation_finalize(investigation, input)
        .pipe(
          Effect.catch((failure) =>
            preserveOriginalFailure(
              investigation,
              capability.investigationId,
              capability.snapshotId,
              failure,
            ),
          ),
        );
      if (isSuccessfulResult<"investigation_finalize">(result)) {
        issuer.revoke(investigation);
        return {
          status: "finalized",
          investigation: issuer.issue(
            capability.investigationId,
            result.receipt.snapshotId,
            "finalized",
          ),
          result,
        } as const;
      }
      yield* confirmOrRevoke(
        investigation,
        capability.investigationId,
        capability.snapshotId,
      );
      return { status: "active", investigation, result } as const;
    }).pipe(
      Effect.onInterrupt(() => Effect.sync(() => issuer.revoke(investigation))),
    );

  const recoverTerminal = <Name extends ActiveAttuneOperationName>(
    name: Name,
    input: OperationWireInput<RegisteredAttuneOperation<Name>>,
  ): Effect.Effect<
    OperationResultOf<RegisteredAttuneOperation<Name>> | undefined,
    | OperationError<RegisteredAttuneOperation<Name>>
    | InvestigationLifecycleError
  > => {
    if (!isActiveOperationName(name)) {
      return Effect.fail(
        lifecycleError(
          "UnrecognizedOperation",
          "terminal recovery requires a registered active operation",
          {
            expected: "active operation",
            observed: String(name),
          },
        ),
      );
    }
    const lookup = terminalLookups[name];
    if (lookup === undefined) return Effect.succeed(undefined);
    const operation = ATTUNE_OPERATIONS[name];
    return Effect.flatMap(lookup(input), (result) =>
      result === undefined
        ? Effect.succeed(undefined)
        : validateRegisteredOperationResult(
            operation,
            input,
            Effect.succeed(result),
          ),
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
 * Adapts the frozen camel-case compatibility handlers into the registry.
 *
 * @remarks
 * This overload remains useful to embedders and tests. Its handler signatures
 * are themselves projected from the registry in `v0/service.ts`.
 */
export const makeInvestigationServiceFromHandlers = (
  legacyHandlers: AttuneHandlers,
  validate: InvestigationValidator,
  terminalLookups: Partial<AttuneTerminalLookups> = {},
): InvestigationServiceApi =>
  makeInvestigationServiceFromOperations(
    makeAttuneOperationHandlers(legacyHandlers),
    validate,
    terminalLookups,
  );

/**
 * Builds the production service with workspace and native-tool adapters.
 */
export const makeInvestigationService = (
  config: RuntimeConfig = loadRuntimeConfig(),
): InvestigationServiceApi => {
  const runtime = makeAttuneRuntime(config);
  return makeInvestigationServiceFromOperations(
    runtime.operationHandlers,
    makeWorkspaceInvestigationValidator(runtime.workspaces),
    runtime.terminalLookups,
  );
};

/** All registry operations that require active permission. */
export type ActiveInvestigationOperationName = ActiveAttuneOperationName;

/** Identity accepted by request-local capability acquisition. */
export type ActiveInvestigationIdentity = {
  readonly investigationId: InvestigationId;
  readonly expectedSnapshot: FullGitCommit;
};
