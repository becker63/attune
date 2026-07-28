/**
 * The operation registry is the typed join between noun descriptors and the
 * existing V0 implementations. Descriptors remain pure data; this adapter is
 * the only place that pairs them with legacy handler names.
 *
 */

import type { Effect } from "effect";

import {
  defineOperationRegistry,
  type CapabilityOperationHandler,
  type OperationError,
  type OperationHandlers,
  type OperationResultOf,
  type OperationWireInput,
} from "../investigation/operation.js";
import {
  ArtifactPromoteOperation,
  makeArtifactPromoteHandler,
} from "./artifact/operation.js";
import {
  AstGrepRunOperation,
  makeAstGrepRunHandler,
} from "./ast-grep/operation.js";
import {
  InvestigationFinalizeOperation,
  makeInvestigationFinalizeHandler,
} from "./investigation/operation.js";
import {
  JoernQueryOperation,
  makeJoernQueryHandler,
} from "./joern/operation.js";
import { MaudeRunOperation, makeMaudeRunHandler } from "./maude/operation.js";
import {
  makePropertyRunHandler,
  PropertyRunOperation,
} from "./property/operation.js";
import {
  makeRepositoryCheckpointHandler,
  RepositoryCheckpointOperation,
  RepositoryMaterializeOperation,
} from "./repository/operation.js";

/**
 * The complete operation registry exposed by the supported MCP entry point.
 *
 * @remarks
 * Keys deliberately match descriptor names and the frozen MCP contract. Adding
 * an operation therefore requires one descriptor and one derived handler
 * mapping; input and output signatures are never handwritten again.
 */
export const ATTUNE_OPERATIONS = defineOperationRegistry({
  repository_materialize: RepositoryMaterializeOperation,
  repository_checkpoint: RepositoryCheckpointOperation,
  joern_query: JoernQueryOperation,
  maude_run: MaudeRunOperation,
  property_run: PropertyRunOperation,
  ast_grep_run: AstGrepRunOperation,
  artifact_promote: ArtifactPromoteOperation,
  investigation_finalize: InvestigationFinalizeOperation,
} as const);

/** Union of all registered Attune operation descriptors. */
export type AttuneOperation =
  (typeof ATTUNE_OPERATIONS)[keyof typeof ATTUNE_OPERATIONS];

/** Handler map whose signatures are derived from {@link ATTUNE_OPERATIONS}. */
export type AttuneOperationHandlers = OperationHandlers<
  typeof ATTUNE_OPERATIONS
>;

/** Registry names whose operations consume an active capability. */
export type ActiveAttuneOperationName = {
  readonly [Name in keyof typeof ATTUNE_OPERATIONS]: (typeof ATTUNE_OPERATIONS)[Name]["lifecycle"]["requires"] extends "active"
    ? Name
    : never;
}[keyof typeof ATTUNE_OPERATIONS];

/** Registry names whose successful operation returns another active state. */
export type PreservingAttuneOperationName = {
  readonly [Name in ActiveAttuneOperationName]: (typeof ATTUNE_OPERATIONS)[Name]["lifecycle"]["produces"] extends "active"
    ? Name
    : never;
}[ActiveAttuneOperationName];

/** Capability-domain handlers derived from active registry entries. */
export type AttuneCapabilityHandlers = {
  readonly [Name in ActiveAttuneOperationName]: CapabilityOperationHandler<
    (typeof ATTUNE_OPERATIONS)[Name]
  >;
};

/**
 * Lookup-only durable recovery functions for active operation invocations.
 *
 * @remarks
 * A lookup has no implementation callback and therefore cannot accept or
 * start new work. Its signatures remain coupled to the registry descriptor
 * selected by each key.
 */
export type AttuneTerminalLookups = {
  readonly [Name in ActiveAttuneOperationName]: (
    input: OperationWireInput<(typeof ATTUNE_OPERATIONS)[Name]>,
  ) => Effect.Effect<
    OperationResultOf<(typeof ATTUNE_OPERATIONS)[Name]> | undefined,
    OperationError<(typeof ATTUNE_OPERATIONS)[Name]>
  >;
};

/**
 * Builds the capability-domain registry from noun-owned adapters.
 *
 * @remarks
 * This is deliberately keyed by descriptor name. Generic dispatch therefore
 * retains the relationship between a name, its domain input, and its result
 * without comparing cloned descriptor objects or asserting handler identity.
 */
export const makeAttuneCapabilityHandlers = (
  handlers: AttuneOperationHandlers,
): AttuneCapabilityHandlers => ({
  repository_checkpoint: makeRepositoryCheckpointHandler(
    handlers.repository_checkpoint,
  ),
  joern_query: makeJoernQueryHandler(handlers.joern_query),
  maude_run: makeMaudeRunHandler(handlers.maude_run),
  property_run: makePropertyRunHandler(handlers.property_run),
  ast_grep_run: makeAstGrepRunHandler(handlers.ast_grep_run),
  artifact_promote: makeArtifactPromoteHandler(handlers.artifact_promote),
  investigation_finalize: makeInvestigationFinalizeHandler(
    handlers.investigation_finalize,
  ),
});
