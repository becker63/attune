/**
 * Frozen MCP wire handlers adapted to the typed investigation service.
 *
 * @remarks
 * Every active request reconstructs permission from persisted identity. Wire
 * inputs never carry brands, capabilities, or process-local cache tokens.
 */

import { Effect } from "effect";

import type { ActiveInvestigation } from "../investigation/capability.js";
import type { InvestigationLifecycleError } from "../investigation/errors.js";
import type { InvestigationServiceApi } from "../investigation/service.js";
import {
  AttuneToolFailure,
  type InvestigationId,
  type FullGitCommit,
} from "../v0/contracts.js";
import type { AttuneHandlers } from "../v0/service.js";

const asToolFailure = (
  cause: AttuneToolFailure | InvestigationLifecycleError,
): AttuneToolFailure =>
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
  identity: {
    readonly investigationId: InvestigationId;
    readonly expectedSnapshot: FullGitCommit;
  },
  run: (
    investigation: ActiveInvestigation,
  ) => Effect.Effect<A, AttuneToolFailure | InvestigationLifecycleError>,
  recover: () => Effect.Effect<
    A | undefined,
    AttuneToolFailure | InvestigationLifecycleError
  >,
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

/** Adapts the application service to the unchanged eight-tool MCP contract. */
export const makeMcpHandlers = (
  service: InvestigationServiceApi,
): AttuneHandlers => ({
  repositoryMaterialize: (input) =>
    service.materialize(input).pipe(Effect.map((outcome) => outcome.result)),

  repositoryCheckpoint: (wireInput) => {
    const { investigationId, expectedSnapshot, ...input } = wireInput;
    return withRequestCapability(
      service,
      { investigationId, expectedSnapshot },
      (investigation) =>
        service
          .execute(investigation, "repository_checkpoint", input)
          .pipe(Effect.map((execution) => execution.result)),
      () => service.recoverTerminal("repository_checkpoint", wireInput),
    );
  },

  joernQuery: (wireInput) => {
    const { investigationId, expectedSnapshot, ...input } = wireInput;
    return withRequestCapability(
      service,
      { investigationId, expectedSnapshot },
      (investigation) =>
        service
          .execute(investigation, "joern_query", input)
          .pipe(Effect.map((execution) => execution.result)),
      () => service.recoverTerminal("joern_query", wireInput),
    );
  },

  maudeRun: (wireInput) => {
    const { investigationId, expectedSnapshot, ...input } = wireInput;
    return withRequestCapability(
      service,
      { investigationId, expectedSnapshot },
      (investigation) =>
        service
          .execute(investigation, "maude_run", input)
          .pipe(Effect.map((execution) => execution.result)),
      () => service.recoverTerminal("maude_run", wireInput),
    );
  },

  propertyRun: (wireInput) => {
    const { investigationId, expectedSnapshot, ...input } = wireInput;
    return withRequestCapability(
      service,
      { investigationId, expectedSnapshot },
      (investigation) =>
        service
          .execute(investigation, "property_run", input)
          .pipe(Effect.map((execution) => execution.result)),
      () => service.recoverTerminal("property_run", wireInput),
    );
  },

  astGrepRun: (wireInput) => {
    const { investigationId, expectedSnapshot, ...input } = wireInput;
    return withRequestCapability(
      service,
      { investigationId, expectedSnapshot },
      (investigation) =>
        service
          .execute(investigation, "ast_grep_run", input)
          .pipe(Effect.map((execution) => execution.result)),
      () => service.recoverTerminal("ast_grep_run", wireInput),
    );
  },

  artifactPromote: (wireInput) => {
    const { investigationId, expectedSnapshot, ...input } = wireInput;
    return withRequestCapability(
      service,
      { investigationId, expectedSnapshot },
      (investigation) =>
        service
          .execute(investigation, "artifact_promote", input)
          .pipe(Effect.map((execution) => execution.result)),
      () => service.recoverTerminal("artifact_promote", wireInput),
    );
  },

  investigationFinalize: (wireInput) => {
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
