import { Context, Effect, Layer, Scope, Schema } from "effect"
import type { CocoIndexClientService } from "./CocoIndexClient.js"
import { makeCocoIndexFixture, type CocoIndexFixtureInput } from "./CocoIndexClientFixture.js"
import {
  makeCocoIndexMcpClient,
  mcpCommandConfig,
  type CocoIndexMcpConfig,
} from "./CocoIndexClientLive.js"
import type { CocoIndexError } from "./errors.js"
import { startMcpStdioClient } from "./mcp/stdio.js"

export const RepositoryToolKind = Schema.Literals(["cocoindex", "joern"])
export type RepositoryToolKind = typeof RepositoryToolKind.Type

export const RepositoryToolStatus = Schema.Struct({
  tool: RepositoryToolKind,
  phase: Schema.Literals(["Pending", "Starting", "Ready", "Failed", "Stopped"]),
  message: Schema.optional(Schema.String),
})
export type RepositoryToolStatus = typeof RepositoryToolStatus.Type

export const RepositorySessionRequest = Schema.Struct({
  repoPath: Schema.String,
  repoSnapshotId: Schema.String,
  runId: Schema.String,
})
export type RepositorySessionRequest = typeof RepositorySessionRequest.Type

export type JoernDslQuery<A> = Readonly<{
  readonly cpgql: string
  readonly schema: Schema.Schema<A>
}>

export interface JoernDslClient {
  readonly query: <A>(query: JoernDslQuery<A>) => Effect.Effect<A, unknown>
  readonly queryRaw: (cpgql: string) => Effect.Effect<string, unknown>
}

export type RepositoryIntelligenceSession = Readonly<{
  readonly repoPath: string
  readonly repoSnapshotId: string
  readonly runId: string
  readonly cocoindex: CocoIndexClientService
  readonly joern: JoernDslClient
  readonly status: ReadonlyArray<RepositoryToolStatus>
}>

export interface RepositoryToolLifecycle<Client, E = never, R = never> {
  readonly acquire: (
    request: RepositorySessionRequest,
  ) => Effect.Effect<Client, E, R | Scope.Scope>
}

export interface RepositoryIntelligenceService {
  readonly withRepository: <A, E, R>(
    request: RepositorySessionRequest,
    use: (
      session: RepositoryIntelligenceSession,
    ) => Effect.Effect<A, E, R>,
  ) => Effect.Effect<A, E | CocoIndexError | unknown, R>
}

export type RepositoryIntelligenceConfig = Readonly<{
  readonly cocoindex: RepositoryToolLifecycle<CocoIndexClientService, CocoIndexError>
  readonly joern: RepositoryToolLifecycle<JoernDslClient, unknown>
}>

export class RepositoryIntelligence extends Context.Service<
  RepositoryIntelligence,
  RepositoryIntelligenceService
>()("@attune/RepositoryIntelligence") {
  static fromConfig(
    config: RepositoryIntelligenceConfig,
  ): Layer.Layer<RepositoryIntelligence> {
    return Layer.succeed(
      RepositoryIntelligence,
      makeRepositoryIntelligenceService(config),
    )
  }
}

export const makeRepositoryIntelligenceService = (
  config: RepositoryIntelligenceConfig,
): RepositoryIntelligenceService => ({
  withRepository: (request, use) =>
    Effect.scoped(
      Effect.gen(function* acquireRepositoryTools() {
        const decoded = Schema.decodeUnknownSync(RepositorySessionRequest)(request)
        const cocoindex = yield* config.cocoindex.acquire(decoded)
        const joern = yield* config.joern.acquire(decoded)
        return yield* use({
          repoPath: decoded.repoPath,
          repoSnapshotId: decoded.repoSnapshotId,
          runId: decoded.runId,
          cocoindex,
          joern,
          status: [
            { tool: "cocoindex", phase: "Ready" },
            { tool: "joern", phase: "Ready" },
          ],
        })
      }),
    ),
})

export const CocoIndexMcpLifecycle = (
  config: Omit<CocoIndexMcpConfig, "repoPath">,
): RepositoryToolLifecycle<CocoIndexClientService, CocoIndexError> => ({
  acquire: (request) =>
    Effect.acquireRelease(
      startMcpStdioClient(mcpCommandConfig(config, request.repoPath)),
      (session) => Effect.promise(() => session.close()),
    ).pipe(
      Effect.map(makeCocoIndexMcpClient),
    ),
})

export const CocoIndexFixtureLifecycle = (
  input: CocoIndexFixtureInput,
): RepositoryToolLifecycle<CocoIndexClientService> => ({
  acquire: () => Effect.succeed(makeCocoIndexFixture(input)),
})

export const JoernDslLifecycle = (
  acquire: (
    request: RepositorySessionRequest,
  ) => Effect.Effect<JoernDslClient, unknown, Scope.Scope>,
): RepositoryToolLifecycle<JoernDslClient, unknown> => ({
  acquire,
})

export const JoernDslFixtureLifecycle = (
  client: JoernDslClient,
): RepositoryToolLifecycle<JoernDslClient> => ({
  acquire: () => Effect.succeed(client),
})

export const makeNoopJoernDslClient = (): JoernDslClient => ({
  query: (query) =>
    Effect.sync(() => Schema.decodeUnknownSync(query.schema as never)({}) as never),
  queryRaw: (cpgql) => Effect.succeed(cpgql),
})
