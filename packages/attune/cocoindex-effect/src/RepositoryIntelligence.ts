import { Context, Effect, Layer, Scope, Schema } from "effect"
import {
  defineAlchemyResource,
  defineManagedRecipe,
  defineManagedRecipeAlchemyBinding,
  defineRecipeHandler,
  type RecipeRepair,
} from "@attune/framework-protocol"
import type { CocoIndexClientService } from "./CocoIndexClient.js"
import { makeCocoIndexFixture, type CocoIndexFixtureInput } from "./CocoIndexClientFixture.js"
import {
  makeCocoIndexMcpClient,
  mcpCommandConfig,
  CocoIndexSearchSimilarAnchorsRecipeId,
  type CocoIndexMcpConfig,
} from "./CocoIndexClientLive.js"
import type { CocoIndexError } from "./errors.js"
import { CocoIndexSearchAnchorsRecipeId } from "./model.js"
import {
  CocoIndexMcpStdioRecipeId,
  CocoIndexMcpStdioResource,
  startMcpStdioClient,
} from "./mcp/stdio.js"

export const RepositoryIntelligenceSessionRecipeId =
  "cocoindex-effect.repository-session" as const
const RepositoryIntelligenceSessionResourceId =
  "cocoindex-effect.repository-session.resource" as const
const RepositoryIntelligenceProviderId =
  "cocoindex-effect.repository-intelligence.provider" as const
const RepositoryIntelligenceSessionHandlerId =
  "cocoindex-effect.repository-session.handler" as const
const RepositoryIntelligenceAlchemyBindingId =
  "cocoindex-effect.repository-session.alchemy" as const
const RepositoryIntelligenceSourcePath =
  "packages/attune/cocoindex-effect/src/RepositoryIntelligence.ts" as const

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

export const RepositoryIntelligenceSessionRecipeOutput = Schema.Struct({
  repoPath: Schema.String,
  repoSnapshotId: Schema.String,
  runId: Schema.String,
  status: Schema.Array(RepositoryToolStatus),
})
export type RepositoryIntelligenceSessionRecipeOutput =
  typeof RepositoryIntelligenceSessionRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const RepositoryIntelligenceSessionResource = defineAlchemyResource({
  id: RepositoryIntelligenceSessionResourceId,
  kind: "external-service",
  alchemyType: "attune:resource:RepositoryIntelligenceSession",
  providerId: RepositoryIntelligenceProviderId,
  ownerRecipeId: RepositoryIntelligenceSessionRecipeId,
  producedBy: [RepositoryIntelligenceSessionRecipeId],
  consumedBy: [
    CocoIndexSearchAnchorsRecipeId,
    CocoIndexSearchSimilarAnchorsRecipeId,
  ],
  addressFields: ["repoPath", "repoSnapshotId", "runId"],
  addressSchema: RepositorySessionRequest,
  stateSchema: RepositoryIntelligenceSessionRecipeOutput,
  modes: ["plan", "apply", "check", "destroy", "read", "external"],
  programmaticResourceExport: "RepositoryIntelligence",
  programmaticProviderExport: "RepositoryIntelligence.fromConfig",
  programmaticBridgeSourcePath: RepositoryIntelligenceSourcePath,
})

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

const CocoIndexRepositorySessionRepairRisk = "needs-review" as const

export const cocoIndexRepositorySessionRepair: RecipeRepair = {
  repairId: "recipe-repair:cocoindex-effect.repository-session:drift",
  recipeId: RepositoryIntelligenceSessionRecipeId,
  title: "Repair repository intelligence session lifecycle",
  kind: "managed-lifecycle",
  nxTarget: "cocoindex-effect:test",
  allowedFiles: ["packages/attune/cocoindex-effect/src/RepositoryIntelligence.ts"],
  risk: CocoIndexRepositorySessionRepairRisk,
  evidenceRequirements: ["cocoindex-effect:test"],
}

export const RepositoryIntelligenceSessionHandler = defineRecipeHandler<
  RepositorySessionRequest,
  RepositoryIntelligenceSessionRecipeOutput
>({
  id: RepositoryIntelligenceSessionHandlerId,
  recipeId: RepositoryIntelligenceSessionRecipeId,
  sourcePath: RepositoryIntelligenceSourcePath,
  exportName: "makeRepositoryIntelligenceService",
  handler: (input) =>
    Effect.gen(function* repositoryIntelligenceSession() {
      const intelligence = yield* RepositoryIntelligence
      return yield* intelligence.withRepository(input, (session) =>
        Effect.succeed({
          repoPath: session.repoPath,
          repoSnapshotId: session.repoSnapshotId,
          runId: session.runId,
          status: session.status,
        }),
      )
    }) as never,
  emitsReceipts: ["cocoindex-effect.repository-session.lifecycle"],
})

export const RepositoryIntelligenceAlchemyBinding =
  defineManagedRecipeAlchemyBinding<
    RepositorySessionRequest,
    RepositoryIntelligenceSessionRecipeOutput
  >({
    id: RepositoryIntelligenceAlchemyBindingId,
    managedRecipeId: RepositoryIntelligenceSessionRecipeId,
    alchemyResourceType: "attune:managed-resource:RepositoryIntelligenceSession",
    providerId: RepositoryIntelligenceProviderId,
    resource: RepositoryIntelligenceSessionResource,
    lifecycle: {
      plan: "RepositoryIntelligenceSessionHandler",
      apply: "makeRepositoryIntelligenceService",
      check: "RepositoryIntelligenceSessionHandler",
      destroy: "RepositoryToolLifecycle.release",
      read: "RepositoryIntelligenceSessionHandler",
    },
  })

export const RepositoryIntelligenceSessionRecipe = defineManagedRecipe({
  id: RepositoryIntelligenceSessionRecipeId,
  projectId: "cocoindex-effect",
  title: "Manage repository intelligence tool session",
  inputSchema: RepositorySessionRequest,
  outputSchema: RepositoryIntelligenceSessionRecipeOutput,
  nxTarget: "cocoindex-effect:test",
  allowedFiles: [RepositoryIntelligenceSourcePath],
  validationEvidence: ["cocoindex-effect:test", "cocoindex-effect:typecheck"],
  lifecycle: ["plan", "apply", "check", "destroy"],
  resourceKind: "repository-intelligence-session",
  io: {
    inputSchema: RepositorySessionRequest,
    outputSchema: RepositoryIntelligenceSessionRecipeOutput,
    inputResources: [CocoIndexMcpStdioResource],
    outputResources: [RepositoryIntelligenceSessionResource],
  },
  handler: RepositoryIntelligenceSessionHandler,
  alchemy: RepositoryIntelligenceAlchemyBinding,
  alchemyDag: [{
    fromRecipeId: CocoIndexMcpStdioRecipeId,
    toRecipeId: RepositoryIntelligenceSessionRecipeId,
    resource: RepositoryIntelligenceSessionResource,
    kind: "manages",
    modes: ["plan", "apply", "check", "destroy"],
  }],
  lifecycleSubstrates: [
    {
      id: CocoIndexMcpStdioRecipeId,
      kind: "container-runtime",
      tool: "cocoindex-mcp-stdio",
      lifecycleActions: ["plan", "apply", "check", "destroy"],
      evidence: ["cocoindex-effect:test", "alchemy-managed-resource-boundary"],
    },
  ],
  observedState: { status: "unknown" },
  driftRepair: cocoIndexRepositorySessionRepair,
  humanReviewRequired: true,
})

export const RepositoryIntelligenceRecipes = [
  RepositoryIntelligenceSessionRecipe,
] as const
