import { Effect } from "effect";

import { AttuneToolFailure } from "../contract/schemas.js";
import type { ActiveInvestigation } from "../investigation/capability.js";
import type { InvestigationLifecycleError } from "../investigation/errors.js";
import type { InvestigationBoundInput } from "../investigation/operation.js";
import type { InvestigationServiceApi } from "../investigation/service.js";
import type {
  AttuneOperationHandlers,
  AttuneOperationInput,
  AttuneOperationResult,
  AttuneOperationWireInput,
  PreservingAttuneOperationName,
} from "../tools/registry.js";

type BoundaryError = AttuneToolFailure | InvestigationLifecycleError;

const asToolFailure = (cause: BoundaryError): AttuneToolFailure =>
  cause instanceof AttuneToolFailure
    ? cause
    : new AttuneToolFailure({
        code: "ContractMismatch",
        message: `investigation lifecycle rejected MCP request: ${cause.message}`,
        ...(cause.expected === undefined ? {} : { expected: cause.expected }),
        ...(cause.observed === undefined ? {} : { observed: cause.observed }),
      });

const withRequestCapability = <A>(
  service: InvestigationServiceApi,
  identity: InvestigationBoundInput,
  run: (investigation: ActiveInvestigation) => Effect.Effect<A, BoundaryError>,
  recover: () => Effect.Effect<A | undefined, BoundaryError>,
): Effect.Effect<A, AttuneToolFailure> =>
  recover().pipe(
    Effect.mapError(asToolFailure),
    Effect.flatMap((terminal) =>
      terminal === undefined
        ? service
            .acquireActive(identity)
            .pipe(Effect.flatMap(run), Effect.mapError(asToolFailure))
        : Effect.succeed(terminal),
    ),
  );

const executeActive = <Name extends PreservingAttuneOperationName>(
  service: InvestigationServiceApi,
  name: Name,
  wireInput: AttuneOperationWireInput<Name>,
): Effect.Effect<AttuneOperationResult<Name>, AttuneToolFailure> => {
  const { investigationId, expectedSnapshot, ...input } = wireInput;
  const execute = service.execute as unknown as (
    investigation: ActiveInvestigation,
    operation: Name,
    operationInput: AttuneOperationInput<Name>,
  ) => Effect.Effect<
    { readonly result: AttuneOperationResult<Name> },
    BoundaryError
  >;
  const recover = service.recoverTerminal as unknown as (
    operation: Name,
    operationInput: AttuneOperationWireInput<Name>,
  ) => Effect.Effect<AttuneOperationResult<Name> | undefined, BoundaryError>;
  return withRequestCapability(
    service,
    { investigationId, expectedSnapshot },
    (investigation) =>
      execute(investigation, name, input as AttuneOperationInput<Name>).pipe(
        Effect.map((execution) => execution.result),
      ),
    () => recover(name, wireInput),
  );
};

/** Adapts the application service to the unchanged eight-tool MCP contract. */
export const makeMcpHandlers = (
  service: InvestigationServiceApi,
): AttuneOperationHandlers => ({
  repository_materialize: (input) =>
    service.materialize(input).pipe(Effect.map((outcome) => outcome.result)),
  repository_checkpoint: (input) =>
    executeActive(service, "repository_checkpoint", input),
  joern_query: (input) => executeActive(service, "joern_query", input),
  maude_run: (input) => executeActive(service, "maude_run", input),
  property_run: (input) => executeActive(service, "property_run", input),
  ast_grep_run: (input) => executeActive(service, "ast_grep_run", input),
  artifact_promote: (input) =>
    executeActive(service, "artifact_promote", input),

  investigation_finalize: (wireInput) => {
    const { investigationId, expectedSnapshot, ...input } = wireInput;
    return withRequestCapability(
      service,
      { investigationId, expectedSnapshot },
      (investigation) =>
        service
          .finalize(investigation, input)
          .pipe(Effect.map((outcome) => outcome.result)),
      () => service.recoverTerminal("investigation_finalize", wireInput),
    );
  },
});
