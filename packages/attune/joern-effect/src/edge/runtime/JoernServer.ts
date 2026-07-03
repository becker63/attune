import { createHash } from "node:crypto"
import { basename, resolve } from "node:path"
import { Context, Effect, Layer, Schema } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineManagedRecipe,
  defineManagedRecipeAlchemyBinding,
  defineRecipeHandler,
  defineRecipeLayer,
} from "@attune/framework-protocol"
import {
  JoernExecutableNotFoundError,
  JoernHttpError,
  JoernImportError,
  JoernServerStartError,
  JoernServerTimeoutError,
} from "./errors.js"
import { chooseFreePort, JoernPortAllocationResource } from "./ports.js"
import {
  JoernExecutableResource,
  JoernProcessLifecycleResource,
  resolveJoernExecutable,
  startJoernProcess,
  stopProcess,
} from './process.js';
import type { StartedProcess } from './process.js';
import { EnvVars, readIntEnvOr } from "./env.js"
import {
  defaultTransport,
  JoernImportCodeResource,
  JoernReadinessProbeResource,
} from './transport.js';
import type { JoernImportFrontend, JoernTransport } from './transport.js';

const joernServerLifecycleRecipeId = "joern-effect.server-lifecycle"
const joernClientRuntimeRecipeId = "joern-effect.joern-client-runtime"
const joernServerLifecycleSourcePath = "packages/attune/joern-effect/src/edge/runtime/JoernServer.ts"
const joernServerLifecycleAlchemyBindingId = "joern-effect.server-lifecycle.alchemy" as const
const joernServerProviderId = "joern-effect.server-provider" as const
const joernServerLifecycleSubstrateId = "joern-effect.server.lifecycle" as const

export const JoernServerLifecycleInputSchema = Schema.Struct({
  repoPath: Schema.String,
  frontend: Schema.optional(Schema.String),
  skipInitialImport: Schema.optional(Schema.Boolean),
})
export type JoernServerLifecycleInput = typeof JoernServerLifecycleInputSchema.Type

export const JoernServerLifecycleOutputSchema = Schema.Struct({
  baseUrl: Schema.String,
  repoPath: Schema.String,
  projectName: Schema.String,
})
export type JoernServerLifecycleOutput = typeof JoernServerLifecycleOutputSchema.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernServerLifecycleResource = defineAlchemyResource({
  id: "joern-effect.server-lifecycle.resource",
  kind: "external-service",
  alchemyType: "attune:resource:ExternalService",
  ownerRecipeId: joernServerLifecycleRecipeId,
  producedBy: [joernServerLifecycleRecipeId],
  consumedBy: [joernServerLifecycleRecipeId, joernClientRuntimeRecipeId],
  addressFields: ["repoPath"],
  addressSchema: JoernServerLifecycleInputSchema as never,
  stateSchema: JoernServerLifecycleOutputSchema as never,
  modes: ["plan", "apply", "check", "destroy", "invoke"],
  programmaticResourceExport: "JoernServerLifecycleLive",
  programmaticBridgeSourcePath: joernServerLifecycleSourcePath,
})

export type JoernLayerConfig = {
  readonly repoPath: string
  readonly frontend?: JoernImportFrontend
  readonly skipInitialImport?: boolean
}

export type JoernServer = {
  readonly baseUrl: string
  readonly repoPath: string
  readonly projectName: string
}

export type JoernServerDeps = {
  readonly choosePort: Effect.Effect<number, Error>
  readonly resolveExecutable: Effect.Effect<string, JoernExecutableNotFoundError>
  readonly startProcess: (
    command: string,
    port: number,
  ) => Effect.Effect<StartedProcess, JoernServerStartError>
  readonly stopProcess: (process: StartedProcess) => Effect.Effect<void, unknown>
  readonly transport: JoernTransport
  readonly readinessTimeoutMs: number
  readonly readinessIntervalMs: number
}

export const defaultJoernServerDeps: JoernServerDeps = {
  choosePort: chooseFreePort,
  readinessIntervalMs: 250,
  readinessTimeoutMs: readIntEnvOr(EnvVars.JoernReadyTimeoutMs, 120_000),
  resolveExecutable: resolveJoernExecutable,
  startProcess: startJoernProcess,
  stopProcess,
  transport: defaultTransport,
}

export const projectNameForRepo = (repoPath: string): string => {
  const absolute = resolve(repoPath)
  const base = basename(absolute).replace(/[^A-Za-z0-9_-]/gu, "-") || "repo"
  const hash = createHash("sha256").update(absolute).digest("hex").slice(0, 10)
  return `${base}-${hash}`
}

export const waitUntilReady = (
  baseUrl: string,
  started: StartedProcess,
  port: number,
  deps: JoernServerDeps,
): Effect.Effect<void, JoernServerTimeoutError> => {
  const startedAt = Date.now()

  const poll: Effect.Effect<void, JoernServerTimeoutError> = deps.transport
    .ready(baseUrl)
    .pipe(
      Effect.flatMap((ready) => {
        if (ready) {return Effect.void}
        if (Date.now() - startedAt >= deps.readinessTimeoutMs) {
          return Effect.fail(
            new JoernServerTimeoutError({
              args: started.args,
              command: started.command,
              message: "Timed out waiting for Joern server readiness",
              port,
              stderr: started.stderr(),
              stdout: started.stdout(),
              timeoutMs: deps.readinessTimeoutMs,
            }),
          )
        }
        return Effect.sleep(`${deps.readinessIntervalMs} millis`).pipe(
          Effect.flatMap(() => poll),
        )
      }),
    )

  return poll
}

export const acquireJoernServer = (
  config: JoernLayerConfig,
  deps: JoernServerDeps = defaultJoernServerDeps,
): Effect.Effect<
  readonly [JoernServer, StartedProcess],
  | JoernExecutableNotFoundError
  | JoernServerStartError
  | JoernServerTimeoutError
  | JoernImportError
  | JoernHttpError
> =>
  Effect.gen(function*  acquireJoernServerBody() {
    const repoPath = resolve(config.repoPath)
    const port = yield* deps.choosePort.pipe(
      Effect.mapError(
        (cause) =>
          new JoernServerStartError({
            args: [],
            cause,
            command: "joern",
            message: "Failed to choose a free localhost port",
            port: 0,
            stderr: "",
            stdout: "",
          }),
      ),
    )
    const command = yield* deps.resolveExecutable
    const started = yield* deps.startProcess(command, port)
    const baseUrl = `http://127.0.0.1:${port}`
    const projectName = projectNameForRepo(repoPath)
    const stopStartedOnFailure = <A, E>(
      effect: Effect.Effect<A, E>,
    ): Effect.Effect<A, E> =>
      effect.pipe(
        Effect.tapError(() => deps.stopProcess(started).pipe(Effect.ignore)),
      )

    yield* stopStartedOnFailure(waitUntilReady(baseUrl, started, port, deps))

    if (config.skipInitialImport !== true) {
      yield* stopStartedOnFailure(
        deps.transport
          .importCode(baseUrl, repoPath, projectName, config.frontend)
          .pipe(
          Effect.mapError(
            (cause) =>
              new JoernImportError({
                baseUrl,
                cause,
                message: "Joern repository import failed",
                repoPath,
              }),
          ),
          ),
      )
    }

    const server: JoernServer = { baseUrl, projectName, repoPath }
    const acquired: readonly [JoernServer, StartedProcess] = [server, started]
    return acquired
  })

export const scopedJoernServer = (
  config: JoernLayerConfig,
  deps: JoernServerDeps = defaultJoernServerDeps,
): Effect.Effect<
  JoernServer,
  | JoernExecutableNotFoundError
  | JoernServerStartError
  | JoernServerTimeoutError
  | JoernImportError
  | JoernHttpError,
  import("effect").Scope.Scope
> =>
  Effect.acquireRelease(
    acquireJoernServer(config, deps),
    ([, started]) => deps.stopProcess(started).pipe(Effect.ignore),
  ).pipe(Effect.map(([server]) => server))

const normalizeServerLifecycleInput = (
  input: JoernServerLifecycleInput,
): JoernLayerConfig => ({
  repoPath: input.repoPath,
  ...(input.frontend === "auto" || input.frontend === "jssrc" ? { frontend: input.frontend } : {}),
  ...(input.skipInitialImport === undefined ? {} : { skipInitialImport: input.skipInitialImport }),
})

export interface JoernServerLifecycleService {
  readonly run: (
    input: JoernServerLifecycleInput,
  ) => Effect.Effect<
    JoernServerLifecycleOutput,
    | JoernExecutableNotFoundError
    | JoernServerStartError
    | JoernServerTimeoutError
    | JoernImportError
    | JoernHttpError
  >
}

export class JoernServerLifecycle extends Context.Tag("joern-effect/ServerLifecycle")<
  JoernServerLifecycle,
  JoernServerLifecycleService
>() {}

export const runJoernServerLifecycle = (
  input: JoernServerLifecycleInput,
): Effect.Effect<
  JoernServerLifecycleOutput,
  | JoernExecutableNotFoundError
  | JoernServerStartError
  | JoernServerTimeoutError
  | JoernImportError
  | JoernHttpError
> =>
  Effect.scoped(
    scopedJoernServer(normalizeServerLifecycleInput(input)).pipe(
      Effect.map((server) => ({
        baseUrl: server.baseUrl,
        repoPath: server.repoPath,
        projectName: server.projectName,
      })),
    ),
  )

export const JoernServerLifecycleLive = Layer.succeed(JoernServerLifecycle, {
  run: runJoernServerLifecycle,
})

export const JoernServerLifecycleLayer = defineRecipeLayer({
  id: "joern-effect.server-lifecycle.layer",
  sourcePath: joernServerLifecycleSourcePath,
  exportName: "JoernServerLifecycleLive",
  layer: JoernServerLifecycleLive as never,
  provides: [{
    id: "joern-effect.server-lifecycle.service",
    service: JoernServerLifecycle as never,
  }],
})

export const runJoernServerLifecycleViaLayer = (
  input: JoernServerLifecycleInput,
): Effect.Effect<
  JoernServerLifecycleOutput,
  | JoernExecutableNotFoundError
  | JoernServerStartError
  | JoernServerTimeoutError
  | JoernImportError
  | JoernHttpError,
  JoernServerLifecycle
> =>
  Effect.gen(function* runJoernServerLifecycleViaLayerBody() {
    const lifecycle = yield* JoernServerLifecycle
    return yield* lifecycle.run(input)
  })

export const JoernServerLifecycleHandler = defineRecipeHandler<
  JoernServerLifecycleInput,
  JoernServerLifecycleOutput,
  | JoernExecutableNotFoundError
  | JoernServerStartError
  | JoernServerTimeoutError
  | JoernImportError
  | JoernHttpError,
  JoernServerLifecycle
>({
  id: "joern-effect.server-lifecycle.handler",
  recipeId: joernServerLifecycleRecipeId,
  sourcePath: joernServerLifecycleSourcePath,
  exportName: "runJoernServerLifecycleViaLayer",
  layer: JoernServerLifecycleLayer,
  emitsReceipts: ["joern.server.lifecycle.checked"],
  handler: (input) => runJoernServerLifecycleViaLayer(input) as never,
})

export const JoernServerLifecycleRecipe = defineManagedRecipe({
  id: joernServerLifecycleRecipeId,
  projectId: "joern-effect",
  title: "Manage scoped Joern server acquisition, readiness, import, and release",
  inputSchema: JoernServerLifecycleInputSchema as never,
  outputSchema: JoernServerLifecycleOutputSchema as never,
  allowedFiles: [joernServerLifecycleSourcePath],
  validationEvidence: ["joern-effect:typecheck", "joern-effect:test"],
  io: {
    inputSchema: JoernServerLifecycleInputSchema as never,
    outputSchema: JoernServerLifecycleOutputSchema as never,
    inputResources: [
      JoernPortAllocationResource,
      JoernExecutableResource,
      JoernProcessLifecycleResource,
      JoernReadinessProbeResource,
      JoernImportCodeResource,
    ],
    outputResources: [JoernServerLifecycleResource],
  },
  handler: JoernServerLifecycleHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernServerLifecycleRecipeId,
      toRecipeId: joernClientRuntimeRecipeId,
      resource: JoernServerLifecycleResource,
      kind: "manages",
      modes: ["plan", "apply", "check", "destroy", "invoke"],
    }),
  ],
// @attune-packet-target generated-runtime-projection eligible
  alchemy: defineManagedRecipeAlchemyBinding({
    id: joernServerLifecycleAlchemyBindingId,
    managedRecipeId: joernServerLifecycleRecipeId,
    alchemyResourceType: "attune:alchemy:ManagedRecipe",
    providerId: joernServerProviderId,
    resource: JoernServerLifecycleResource,
    lifecycle: {
      plan: "projectNameForRepo",
      apply: "acquireJoernServer",
      check: "waitUntilReady",
      stop: "stopProcess",
      destroy: "stopProcess",
      read: "scopedJoernServer",
      diff: "projectNameForRepo",
    },
  }),
  lifecycle: ["plan", "apply", "check", "stop", "destroy", "prune"],
  resourceKind: "joern-server",
  lifecycleSubstrates: [{
    id: joernServerLifecycleSubstrateId,
    kind: "query-service",
    tool: "joern",
    lifecycleActions: ["plan", "apply", "check", "stop", "destroy"],
    evidence: ["nx run joern-effect:test"],
  }],
  observedState: { running: false, imported: false },
  humanReviewRequired: true,
})

export const JoernServerLifecycleRecipes = [JoernServerLifecycleRecipe] as const
