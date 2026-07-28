import { Context, Effect } from "effect";

import {
  AttuneToolFailure,
  type FullGitCommit,
  type FailureCode,
} from "../contract/schemas.js";
import { loadRuntimeConfig, type RuntimeConfig } from "../platform/core.js";
import { makeAttuneRuntime } from "../server/runtime.js";
import {
  ATTUNE_OPERATIONS,
  type ActiveAttuneOperationName,
  type AttuneOperationError,
  type AttuneOperationHandler,
  type AttuneOperationHandlers,
  type AttuneOperationInput,
  type AttuneOperationName,
  type AttuneOperationResult,
  type AttuneOperationWireInput,
  type AttuneTerminalLookups,
  type PreservingAttuneOperationName,
} from "../tools/registry.js";
import {
  makeInvestigationCapabilityIssuer,
  type ActiveInvestigation,
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

type InvestigationValidationRequest = InvestigationBoundInput & {
  readonly requireClean: boolean;
};

export type InvestigationValidator = (
  request: InvestigationValidationRequest,
) => Effect.Effect<
  InvestigationManifest,
  AttuneToolFailure | InvestigationLifecycleError
>;

const messageOf = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

const toolFailure = (
  code: FailureCode,
  message: string,
  details: { readonly expected?: string; readonly observed?: string } = {},
) => new AttuneToolFailure({ code, message, ...details });

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
            ? toolFailure(
                "IdentityConflict",
                "persisted manifest belongs to another investigation",
                {
                  expected: request.investigationId,
                  observed: manifest.investigationId,
                },
              )
            : manifest.finalizedAt !== undefined
              ? toolFailure("Finalized", "investigation is finalized")
              : head !== request.expectedSnapshot
                ? toolFailure(
                    "StaleSnapshot",
                    "repository HEAD does not match expected snapshot",
                    { expected: request.expectedSnapshot, observed: head },
                  )
                : request.requireClean && dirty
                  ? toolFailure(
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
) => {
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
    investigation: ActiveInvestigation,
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
    investigation: ActiveInvestigation,
    use: (snapshotId: FullGitCommit) => Effect.Effect<Success, Error>,
  ): Effect.Effect<Success, Error | InvestigationLifecycleError> =>
    verifyCapability(investigation, "active").pipe(
      Effect.flatMap(({ snapshotId }) => use(snapshotId)),
      Effect.onInterrupt(() => Effect.sync(() => issuer.revoke(investigation))),
    );

  const confirmPersistedActive = (
    investigation: ActiveInvestigation,
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
    (investigation: ActiveInvestigation, snapshotId: FullGitCommit) =>
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
    investigation: ActiveInvestigation,
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
    investigation: ActiveInvestigation,
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

/** The one typed application boundary for legal investigation transitions. */
export type InvestigationServiceApi = ReturnType<
  typeof makeInvestigationServiceFromHandlers
>;

/** Effect service tag for the investigation application boundary. */
export class InvestigationService extends Context.Service<
  InvestigationService,
  InvestigationServiceApi
>()("attune-mcp/InvestigationService") {}

export const makeInvestigationService = (
  config: RuntimeConfig = loadRuntimeConfig(),
): InvestigationServiceApi => {
  const runtime = makeAttuneRuntime(config);
  return makeInvestigationServiceFromHandlers(
    runtime.handlers,
    makeWorkspaceInvestigationValidator(runtime.workspaces),
    runtime.terminalLookups,
  );
};
