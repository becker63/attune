/**
 * Compatibility composition for the noun-owned operation implementations.
 *
 * @remarks
 * New readers should start under `tools/<noun>`. This module preserves the V0
 * handler object expected by the frozen MCP contract and generic registry.
 */

import { Effect, Schema } from "effect";

import {
  type AnyToolOperation,
  type OperationWireInput,
  validateOperationResult,
} from "../investigation/operation.js";
import { artifactPromote } from "../tools/artifact/implementation.js";
import { astGrepRun } from "../tools/ast-grep/implementation.js";
import { investigationFinalize } from "../tools/investigation/implementation.js";
import { joernQuery } from "../tools/joern/implementation.js";
import { maudeRun } from "../tools/maude/implementation.js";
import { propertyRun } from "../tools/property/implementation.js";
import {
  ATTUNE_OPERATIONS,
  type AttuneOperationHandlers,
  type AttuneTerminalLookups,
} from "../tools/registry.js";
import {
  repositoryCheckpoint,
  repositoryMaterialize,
} from "../tools/repository/implementation.js";
import type { AttuneToolFailure } from "./contracts.js";
import { loadRuntimeConfig, type RuntimeConfig } from "./core.js";
import { InvocationEngine } from "./invocation.js";
import { WorkspaceStore } from "./workspace.js";

/**
 * Registry-to-compatibility naming is data, not a second set of signatures.
 *
 * @remarks
 * The MCP contract keeps its historical camel-case handler properties. Input
 * and result types below are projected mechanically from the noun registry.
 */
export const ATTUNE_HANDLER_NAMES = {
  repository_materialize: "repositoryMaterialize",
  repository_checkpoint: "repositoryCheckpoint",
  joern_query: "joernQuery",
  maude_run: "maudeRun",
  property_run: "propertyRun",
  ast_grep_run: "astGrepRun",
  artifact_promote: "artifactPromote",
  investigation_finalize: "investigationFinalize",
} as const satisfies Record<keyof typeof ATTUNE_OPERATIONS, string>;

type CompatibilityOperationHandler<Operation extends AnyToolOperation> = (
  input: OperationWireInput<Operation>,
) => Effect.Effect<Schema.Schema.Type<Operation["result"]>, AttuneToolFailure>;

/** Frozen-contract handler map projected from {@link ATTUNE_OPERATIONS}. */
export type AttuneHandlers = {
  readonly [Name in keyof typeof ATTUNE_OPERATIONS as (typeof ATTUNE_HANDLER_NAMES)[Name]]: CompatibilityOperationHandler<
    (typeof ATTUNE_OPERATIONS)[Name]
  >;
};

/** Complete runtime projections sharing one invocation engine and workspace. */
export interface AttuneRuntime {
  readonly handlers: AttuneHandlers;
  readonly operationHandlers: AttuneOperationHandlers;
  readonly terminalLookups: AttuneTerminalLookups;
  readonly workspaces: WorkspaceStore;
}

/**
 * Validates the frozen compatibility object against descriptor-owned schemas,
 * failures, identity, and receipt correlation.
 */
export const makeAttuneOperationHandlers = (
  handlers: AttuneHandlers,
): AttuneOperationHandlers => ({
  repository_materialize: (input) =>
    validateOperationResult(
      ATTUNE_OPERATIONS.repository_materialize,
      input,
      handlers.repositoryMaterialize(input),
    ),
  repository_checkpoint: (input) =>
    validateOperationResult(
      ATTUNE_OPERATIONS.repository_checkpoint,
      input,
      handlers.repositoryCheckpoint(input),
    ),
  joern_query: (input) =>
    validateOperationResult(
      ATTUNE_OPERATIONS.joern_query,
      input,
      handlers.joernQuery(input),
    ),
  maude_run: (input) =>
    validateOperationResult(
      ATTUNE_OPERATIONS.maude_run,
      input,
      handlers.maudeRun(input),
    ),
  property_run: (input) =>
    validateOperationResult(
      ATTUNE_OPERATIONS.property_run,
      input,
      handlers.propertyRun(input),
    ),
  ast_grep_run: (input) =>
    validateOperationResult(
      ATTUNE_OPERATIONS.ast_grep_run,
      input,
      handlers.astGrepRun(input),
    ),
  artifact_promote: (input) =>
    validateOperationResult(
      ATTUNE_OPERATIONS.artifact_promote,
      input,
      handlers.artifactPromote(input),
    ),
  investigation_finalize: (input) =>
    validateOperationResult(
      ATTUNE_OPERATIONS.investigation_finalize,
      input,
      handlers.investigationFinalize(input),
    ),
});

/** Composes every runtime projection around one durable invocation engine. */
export const makeAttuneRuntime = (
  config: RuntimeConfig = loadRuntimeConfig(),
): AttuneRuntime => {
  const workspaces = new WorkspaceStore(config);
  const engine = new InvocationEngine(config, workspaces);
  const handlers: AttuneHandlers = {
    repositoryMaterialize: (input) => repositoryMaterialize(engine, input),
    repositoryCheckpoint: (input) =>
      repositoryCheckpoint(engine, workspaces, input),
    joernQuery: (input) => joernQuery(engine, config, workspaces, input),
    maudeRun: (input) => maudeRun(engine, config, workspaces, input),
    propertyRun: (input) => propertyRun(engine, config, workspaces, input),
    astGrepRun: (input) => astGrepRun(engine, config, workspaces, input),
    artifactPromote: (input) => artifactPromote(engine, workspaces, input),
    investigationFinalize: (input) =>
      investigationFinalize(engine, workspaces, input),
  };
  const operationHandlers = makeAttuneOperationHandlers(handlers);
  const terminalLookups: AttuneTerminalLookups = {
    repository_checkpoint: (input) =>
      engine.lookupTerminal(ATTUNE_OPERATIONS.repository_checkpoint, input),
    joern_query: (input) =>
      engine.lookupTerminal(ATTUNE_OPERATIONS.joern_query, input),
    maude_run: (input) =>
      engine.lookupTerminal(ATTUNE_OPERATIONS.maude_run, input),
    property_run: (input) =>
      engine.lookupTerminal(ATTUNE_OPERATIONS.property_run, input),
    ast_grep_run: (input) =>
      engine.lookupTerminal(ATTUNE_OPERATIONS.ast_grep_run, input),
    artifact_promote: (input) =>
      engine.lookupTerminal(ATTUNE_OPERATIONS.artifact_promote, input),
    investigation_finalize: (input) =>
      engine.lookupTerminal(ATTUNE_OPERATIONS.investigation_finalize, input),
  };
  return { handlers, operationHandlers, terminalLookups, workspaces };
};

/** Composes noun-owned implementations into the V0 compatibility shape. */
export const makeAttuneHandlers = (
  config: RuntimeConfig = loadRuntimeConfig(),
): AttuneHandlers => makeAttuneRuntime(config).handlers;
