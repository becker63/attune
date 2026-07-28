import { NodeStdio } from "@effect/platform-node";
import { Context, Effect, Layer, Logger } from "effect";
import { McpServer } from "effect/unstable/ai";
import { RpcSerialization, RpcServer } from "effect/unstable/rpc";

import {
  InvestigationService,
  makeInvestigationService,
} from "../investigation/service.js";
import { makeMcpHandlers } from "../server/handlers.js";
import { AttuneToolkit } from "./contracts.js";
import type { RuntimeConfig } from "./core.js";
import { makeResourceRegistration } from "./resources.js";
import type { AttuneHandlers } from "./service.js";
import { WorkspaceStore } from "./workspace.js";

export class AttuneHandlerService extends Context.Service<
  AttuneHandlerService,
  AttuneHandlers
>()("attune-mcp/AttuneHandlers") {}

const ToolHandlers = Layer.unwrap(
  Effect.map(InvestigationService, (service) => {
    const handlers = makeMcpHandlers(service);
    return AttuneToolkit.toLayer({
      artifact_promote: handlers.artifactPromote,
      ast_grep_run: handlers.astGrepRun,
      investigation_finalize: handlers.investigationFinalize,
      joern_query: handlers.joernQuery,
      maude_run: handlers.maudeRun,
      property_run: handlers.propertyRun,
      repository_checkpoint: handlers.repositoryCheckpoint,
      repository_materialize: handlers.repositoryMaterialize,
    });
  }),
);

const StdioProtocol = RpcServer.layerProtocolStdio.pipe(
  Layer.provide(RpcSerialization.layerNdJsonRpc()),
  Layer.provide(NodeStdio.layer),
  Layer.provide(Layer.succeed(Logger.LogToStderr)(true)),
);

export const makeAttuneServerLive = (config: RuntimeConfig) => {
  const services = Layer.succeed(
    InvestigationService,
    makeInvestigationService(config),
  );
  const resources = makeResourceRegistration(
    config,
    new WorkspaceStore(config),
  );
  const registration = Layer.merge(
    McpServer.toolkit(AttuneToolkit).pipe(
      Layer.provide(ToolHandlers),
      Layer.provide(services),
    ),
    resources,
  );

  return Layer.effectDiscard(
    Effect.gen(function* () {
      const registered = yield* Layer.build(
        registration.pipe(Layer.provideMerge(McpServer.McpServer.layer)),
      );
      const server = Context.get(registered, McpServer.McpServer);
      if (
        server.tools.length !== 8 ||
        server.resourceTemplates.length !== 3 ||
        server.resources.length !== 1
      ) {
        return yield* Effect.die(
          new Error(
            `incomplete MCP registry: tools=${String(
              server.tools.length,
            )}, templates=${String(
              server.resourceTemplates.length,
            )}, resources=${String(server.resources.length)}`,
          ),
        );
      }
      const protocolContext = yield* Layer.build(StdioProtocol);
      const protocol = Context.get(protocolContext, RpcServer.Protocol);
      return yield* McpServer.run({
        name: "attune-mcp",
        version: "0.0.0",
      }).pipe(
        Effect.provideService(McpServer.McpServer, server),
        Effect.provideService(RpcServer.Protocol, protocol),
      );
    }),
  );
};
