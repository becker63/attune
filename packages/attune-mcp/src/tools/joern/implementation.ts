/**
 * This module narrows the generic investigation model into one native tool.
 * Read from the local runtime helpers, through `executeTypedQuery<A>` (which
 * preserves a Joern query's result type), to `joernQuery`, where the shared
 * closed registry and invocation engine enforce lifecycle boundaries.
 */
import { rm } from "node:fs/promises";
import { createServer } from "node:net";

import * as NodeHttpClient from "@effect/platform-node/NodeHttpClient";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { Effect, Layer } from "effect";
import * as HttpClient from "effect/unstable/http/HttpClient";
import {
  Joern,
  compileSerializedQuery,
  makeHttpTransport,
  scopedJoernServer,
  type JoernQueryDiagnosticResponse,
  type JoernServerOutputTails,
  type Query,
  type SerializedQuery,
} from "joern-effect";

import type {
  JoernQueryInput,
  JoernQueryResult,
} from "../../contract/schemas.js";
import { InvocationEngine } from "../../investigation/invocation.js";
import { WorkspaceStore } from "../../investigation/workspace.js";
import {
  canonicalJson,
  fail,
  sha256,
  type Json,
  type RuntimeConfig,
} from "../../platform/core.js";

const freePort = async (): Promise<number> =>
  await new Promise<number>((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port =
        typeof address === "object" && address !== null ? address.port : 0;
      server.close((cause) => {
        if (cause !== undefined) reject(cause);
        else resolve(port);
      });
    });
  });

const nodeLayer = Layer.merge(NodeServices.layer, NodeHttpClient.layerNodeHttp);

const joernLayer = (
  config: RuntimeConfig,
  repository: string,
  frontend: "auto" | "jssrc",
  port: number,
  timeoutMilliseconds: number,
) =>
  Joern.layer({
    repoPath: repository,
    command: config.joern,
    frontend,
    port,
    readinessTimeoutMs: Math.min(timeoutMilliseconds, 120_000),
  }).pipe(Layer.provide(nodeLayer));

const executeRawQuery = async (
  config: RuntimeConfig,
  repository: string,
  input: Pick<JoernQueryInput, "frontend" | "timeoutMilliseconds">,
  cpgql: string,
  port: number,
  signal?: AbortSignal,
): Promise<{
  readonly diagnostic: JoernQueryDiagnosticResponse;
  readonly serverOutput: JoernServerOutputTails;
}> => {
  const program = Effect.scoped(
    Effect.gen(function* () {
      const client = yield* HttpClient.HttpClient;
      const transport = makeHttpTransport(client);
      const server = yield* scopedJoernServer(
        {
          repoPath: repository,
          command: config.joern,
          frontend: input.frontend,
          port,
          readinessTimeoutMs: Math.min(input.timeoutMilliseconds, 120_000),
        },
        transport,
      );
      const diagnostic = yield* transport.executeDiagnostic(
        server.baseUrl,
        cpgql,
      );
      return {
        diagnostic,
        serverOutput: yield* server.outputTails,
      };
    }),
  ).pipe(
    Effect.provide(nodeLayer),
    Effect.timeout(`${input.timeoutMilliseconds} millis`),
  );
  return await Effect.runPromise(program, { signal });
};

export const executeTypedQuery = async <A>(
  config: RuntimeConfig,
  repository: string,
  query: Query<A>,
  options: {
    readonly frontend: "auto" | "jssrc";
    readonly timeoutMilliseconds: number;
    readonly signal?: AbortSignal;
  },
): Promise<A> => {
  const port = await freePort();
  const program = Effect.gen(function* () {
    const joern = yield* Joern;
    return yield* joern.query(query);
  }).pipe(
    Effect.provide(
      joernLayer(
        config,
        repository,
        options.frontend,
        port,
        options.timeoutMilliseconds,
      ),
    ),
    Effect.timeout(`${options.timeoutMilliseconds} millis`),
  );
  return await Effect.runPromise(program, { signal: options.signal });
};

export const joernQuery = (
  engine: InvocationEngine,
  config: RuntimeConfig,
  workspaces: WorkspaceStore,
  input: JoernQueryInput,
): Effect.Effect<JoernQueryResult, ReturnType<typeof fail>> =>
  engine.execute({
    name: "joern_query",
    input,
    run: async (context) => {
      const cpgql =
        input.cpgql ??
        compileSerializedQuery(input.dsl as unknown as SerializedQuery);
      await workspaces.assertExactClean(
        context.workspace.repositoryPath,
        input.expectedSnapshot,
        context.signal,
      );
      context.setSnapshot(input.expectedSnapshot);
      if (input.dsl !== undefined) {
        await context.writeArtifact(
          "query.dsl.json",
          `${canonicalJson(input.dsl)}\n`,
        );
      }
      await context.writeArtifact("query.cpgql", cpgql);
      const cpgId = sha256(
        canonicalJson({
          snapshotId: input.expectedSnapshot,
          frontend: input.frontend,
          importOptions: input.importOptions,
          toolchainDigest: config.toolchainDigest,
        }),
      );
      await context.writeArtifact(
        "environment.json",
        `${canonicalJson({
          cpgId,
          snapshotId: input.expectedSnapshot,
          frontend: input.frontend,
          importOptions: input.importOptions,
          joernExecutable: config.joern,
          toolchainDigest: config.toolchainDigest,
        })}\n`,
      );
      const checkout = await workspaces.isolatedCheckout(
        context.workspace.repositoryPath,
        input.expectedSnapshot,
        context.signal,
      );
      try {
        const port = await freePort();
        let executed: Awaited<ReturnType<typeof executeRawQuery>>;
        try {
          executed = await executeRawQuery(
            config,
            checkout.repository,
            input,
            cpgql,
            port,
            context.signal,
          );
        } catch (cause) {
          await context.writeArtifact(
            "joern-error.json",
            `${canonicalJson({
              name: cause instanceof Error ? cause.name : "Error",
              message: cause instanceof Error ? cause.message : String(cause),
              tag:
                typeof cause === "object" &&
                cause !== null &&
                "_tag" in cause &&
                typeof cause._tag === "string"
                  ? cause._tag
                  : null,
            })}\n`,
          );
          throw fail(
            typeof cause === "object" &&
              cause !== null &&
              "_tag" in cause &&
              cause._tag === "TimeoutError"
              ? "TimedOut"
              : "ProcessExitFailure",
            cause instanceof Error ? cause.message : String(cause),
          );
        }
        await context.writeArtifact(
          "joern-response.json",
          executed.diagnostic.responseBody,
        );
        await context.writeArtifact(
          "joern-diagnostic.json",
          `${canonicalJson(executed.diagnostic)}\n`,
        );
        await context.writeArtifact(
          "joern-server-output.json",
          `${canonicalJson(executed.serverOutput)}\n`,
          false,
        );
        if (!executed.diagnostic.success) {
          throw fail(
            "ProcessExitFailure",
            executed.diagnostic.stderr ??
              executed.diagnostic.stdout ??
              "Joern rejected the query",
          );
        }
        const output = executed.diagnostic.result;
        if (output === undefined) {
          throw fail("DecodeFailure", "Joern response had no query result");
        }
        const outputPath =
          input.outputFormat === "json"
            ? "joern-output.json"
            : "joern-output.txt";
        await context.writeArtifact(outputPath, output);
        let summary: Json;
        if (Buffer.byteLength(output) > config.inlineLimitBytes) {
          summary = {
            bytes: Buffer.byteLength(output),
            retained: outputPath,
            truncated: true,
          };
        } else if (input.outputFormat === "json") {
          try {
            summary = JSON.parse(output) as Json;
          } catch {
            throw fail("DecodeFailure", "Joern output was not valid JSON");
          }
        } else {
          summary = output;
        }
        return {
          snapshotId: input.expectedSnapshot,
          value: {
            snapshotId: input.expectedSnapshot,
            cpgId,
            summary,
          },
        };
      } finally {
        await rm(checkout.root, { recursive: true, force: true });
      }
    },
  });
