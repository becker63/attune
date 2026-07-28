import { InvocationEngine } from "../investigation/invocation.js";
import { WorkspaceStore } from "../investigation/workspace.js";
import { loadRuntimeConfig, type RuntimeConfig } from "../platform/core.js";
import { artifactPromote } from "../tools/artifact/implementation.js";
import { astGrepRun } from "../tools/ast-grep/implementation.js";
import { investigationFinalize } from "../tools/investigation/implementation.js";
import { joernQuery } from "../tools/joern/implementation.js";
import { maudeRun } from "../tools/maude/implementation.js";
import { propertyRun } from "../tools/property/implementation.js";
import type {
  AttuneOperationHandlers,
  AttuneTerminalLookups,
} from "../tools/registry.js";
import {
  repositoryCheckpoint,
  repositoryMaterialize,
} from "../tools/repository/implementation.js";

export const makeAttuneRuntime = (
  config: RuntimeConfig = loadRuntimeConfig(),
) => {
  const workspaces = new WorkspaceStore(config);
  const engine = new InvocationEngine(config, workspaces);
  const handlers: AttuneOperationHandlers = {
    repository_materialize: (input) => repositoryMaterialize(engine, input),
    repository_checkpoint: (input) =>
      repositoryCheckpoint(engine, workspaces, input),
    joern_query: (input) => joernQuery(engine, config, workspaces, input),
    maude_run: (input) => maudeRun(engine, config, workspaces, input),
    property_run: (input) => propertyRun(engine, config, workspaces, input),
    ast_grep_run: (input) => astGrepRun(engine, config, workspaces, input),
    artifact_promote: (input) => artifactPromote(engine, workspaces, input),
    investigation_finalize: (input) =>
      investigationFinalize(engine, workspaces, input),
  };
  const terminalLookups: AttuneTerminalLookups = {
    repository_checkpoint: (input) =>
      engine.lookupTerminal("repository_checkpoint", input),
    joern_query: (input) => engine.lookupTerminal("joern_query", input),
    maude_run: (input) => engine.lookupTerminal("maude_run", input),
    property_run: (input) => engine.lookupTerminal("property_run", input),
    ast_grep_run: (input) => engine.lookupTerminal("ast_grep_run", input),
    artifact_promote: (input) =>
      engine.lookupTerminal("artifact_promote", input),
    investigation_finalize: (input) =>
      engine.lookupTerminal("investigation_finalize", input),
  };
  return { handlers, terminalLookups, workspaces };
};
