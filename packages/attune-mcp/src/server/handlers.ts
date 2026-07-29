import { Effect } from "effect";

import { AttuneToolFailure } from "../contract/schemas.js";
import type { Investigation } from "../investigation/capability.js";
import type { InvestigationLifecycleError } from "../investigation/errors.js";
import type { InvestigationBoundInput } from "../investigation/operation.js";
import type { Attune } from "../investigation/service.js";
import { fail } from "../platform/core.js";
import type {
  AttuneOperationHandlers,
  AttuneOperationInput,
  AttuneOperationResult,
  AttuneOperationWireInput,
  PreservingAttuneOperationName,
} from "../tools/registry.js";

/** Failure union normalized at the MCP boundary. */ type BoundaryError =
  | AttuneToolFailure
  | InvestigationLifecycleError;

/**
 * Converts lifecycle rejection into the public tool-failure envelope. @param cause - Boundary failure to
 * normalize. @returns A tool failure suitable for MCP transport.
 */
const asToolFailure = (cause: BoundaryError): AttuneToolFailure =>
  cause instanceof AttuneToolFailure
    ? cause
    : fail("ContractMismatch", `investigation lifecycle rejected MCP request: ${cause.message}`, {
        ...(cause.expected === undefined ? {} : { expected: cause.expected }),
        ...(cause.observed === undefined ? {} : { observed: cause.observed }),
      });

/**
 * Acquires active authority or reuses durable terminal evidence. @typeParam A - Operation result. @param
 * service - Lifecycle service. @param identity - Investigation and expected snapshot. @param run - Work
 * requiring active authority. @param recover - Terminal receipt lookup. @returns The recovered or newly
 * executed result.
 *
 * @failure {@link AttuneToolFailure} - Correct lifecycle or tool-boundary evidence before retrying.
 */
const withRequestCapability = <A>(
  service: Attune,
  identity: InvestigationBoundInput,
  run: (investigation: Investigation<"active">) => Effect.Effect<A, BoundaryError>,
  recover: () => Effect.Effect<A | undefined, BoundaryError>,
): Effect.Effect<A, AttuneToolFailure> =>
  recover().pipe(
    Effect.mapError(asToolFailure),
    Effect.flatMap((terminal) =>
      terminal === undefined
        ? service.acquireActive(identity).pipe(Effect.flatMap(run), Effect.mapError(asToolFailure))
        : Effect.succeed(terminal),
    ),
  );

/**
 * Executes one preserving operation under request-scoped authority. @typeParam Name - Correlated operation
 * name. @param service - Lifecycle service. @param name - Operation to execute. @param wireInput - Wire
 * request carrying authority identity. @returns The correlated operation result.
 *
 * @failure {@link AttuneToolFailure} - Correct request authority or operation input before retrying.
 */
const executeActive = <Name extends PreservingAttuneOperationName>(
  service: Attune,
  name: Name,
  wireInput: AttuneOperationWireInput<Name>,
): Effect.Effect<AttuneOperationResult<Name>, AttuneToolFailure> => {
  const { investigationId, expectedSnapshot, ...input } = wireInput;
  const execute = service.execute.bind(service) as unknown as (
    investigation: Investigation<"active">,
    operation: Name,
    operationInput: AttuneOperationInput<Name>,
  ) => Effect.Effect<{ readonly result: AttuneOperationResult<Name> }, BoundaryError>;
  const recover = service.recoverTerminal.bind(service) as unknown as (
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

/**
 * Binds MCP operation handlers to one lifecycle service. @remarks Every stateful handler reacquires exact
 * authority and checks terminal recovery before execution. @param service - Attune lifecycle service.
 *
 * @returns The closed operation-handler registry.
 */
export const makeMcpHandlers = (service: Attune): AttuneOperationHandlers => ({
  repository_materialize: (input) => service.materialize(input).pipe(Effect.map((outcome) => outcome.result)),
  repository_checkpoint: (input) => executeActive(service, "repository_checkpoint", input),
  joern_query: (input) => executeActive(service, "joern_query", input),
  maude_run: (input) => executeActive(service, "maude_run", input),
  property_run: (input) => executeActive(service, "property_run", input),
  ast_grep_run: (input) => executeActive(service, "ast_grep_run", input),
  artifact_promote: (input) => executeActive(service, "artifact_promote", input),

  investigation_finalize: (wireInput) => {
    const { investigationId, expectedSnapshot, ...input } = wireInput;
    return withRequestCapability(
      service,
      { investigationId, expectedSnapshot },
      (investigation) => service.finalize(investigation, input).pipe(Effect.map((outcome) => outcome.result)),
      () => service.recoverTerminal("investigation_finalize", wireInput),
    );
  },
});
