import { NodeStdio } from "@effect/platform-node";
import { Context, Effect, Layer, Logger } from "effect";
import { McpServer } from "effect/unstable/ai";
import { RpcSerialization, RpcServer } from "effect/unstable/rpc";

import { Attune } from "../investigation/service.js";
import { WorkspaceStore } from "../investigation/workspace.js";
import type { RuntimeConfig } from "../platform/core.js";
import { AttuneToolkit } from "../tools/registry.js";
import { makeMcpHandlers } from "./handlers.js";
import { makeResourceRegistration } from "./resources.js";

/** Layer that installs the closed Attune handler registry. */ const ToolHandlers = Layer.unwrap(
  Effect.map(Attune, (service) => AttuneToolkit.toLayer(makeMcpHandlers(service))),
);

/** Newline-delimited JSON-RPC protocol over process stdio. */ const StdioProtocol =
  RpcServer.layerProtocolStdio.pipe(
    Layer.provide(RpcSerialization.layerNdJsonRpc()),
    Layer.provide(NodeStdio.layer),
    Layer.provide(Layer.succeed(Logger.LogToStderr)(true)),
  );

/**
 * Builds the complete MCP server layer. @remarks Startup verifies the exact tool/resource inventory before
 * serving stdio requests. @param config - Runtime boundary configuration. @returns The live server layer.
 */
export const makeAttuneServerLive = (config: RuntimeConfig): Layer.Layer<never, never, never> => {
  const services = Layer.succeed(Attune, Attune.make(config));
  const resources = makeResourceRegistration(config, new WorkspaceStore(config));
  const registration = Layer.merge(
    McpServer.toolkit(AttuneToolkit).pipe(Layer.provide(ToolHandlers), Layer.provide(services)),
    resources,
  );

  return Layer.effectDiscard(
    Effect.gen(function* () {
      const registered = yield* Layer.build(registration.pipe(Layer.provideMerge(McpServer.McpServer.layer)));
      const server = Context.get(registered, McpServer.McpServer);
      if (
        server.tools.length !== 8 ||
        server.resourceTemplates.length !== 3 ||
        server.resources.length !== 1
      ) {
        return yield* Effect.die(
          new Error(
            `incomplete MCP registry: tools=${String(server.tools.length)}, templates=${String(
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
