import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { access } from "node:fs/promises"
import { delimiter, isAbsolute, join } from "node:path"
import { Context, Effect, Layer, Schema } from "effect"
import {
  defineAlchemyRecipeDagEdge,
  defineAlchemyResource,
  defineManagedRecipe,
  defineManagedRecipeAlchemyBinding,
  defineRecipeHandler,
  defineRecipeLayer,
  defineToolchainRecipe,
} from "@attune/framework-protocol"
import {
  JoernExecutableNotFoundError,
  JoernServerShutdownError,
  JoernServerStartError,
} from "./errors.js"
import { EnvVars, JoernEnvironmentConfigResource, readEnv, readEnvOr } from "./env.js"
import { JoernPortAllocationResource } from "./ports.js"

const joernExecutableResolutionRecipeId = "joern-effect.executable-resolution"
const joernProcessLifecycleRecipeId = "joern-effect.process-lifecycle"
const joernServerLifecycleRecipeId = "joern-effect.server-lifecycle"
const joernProcessRuntimeSourcePath = "packages/attune/joern-effect/src/edge/runtime/process.ts"
const joernEnvironmentConfigRecipeId = "joern-effect.environment-config" as const
const joernPortAllocationRecipeId = "joern-effect.port-allocation" as const
const joernProcessLifecycleAlchemyBindingId = "joern-effect.process-lifecycle.alchemy" as const
const joernNodeProcessProviderId = "joern-effect.node-process-provider" as const
const joernProcessLifecycleSubstrateId = "joern-effect.process.lifecycle" as const

export const JoernExecutableResolutionInputSchema = Schema.Struct({
  configuredBinary: Schema.optional(Schema.String),
  path: Schema.optional(Schema.String),
})
export type JoernExecutableResolutionInput = typeof JoernExecutableResolutionInputSchema.Type

export const JoernExecutableResolutionOutputSchema = Schema.Struct({
  command: Schema.String,
  attempted: Schema.Array(Schema.String),
})
export type JoernExecutableResolutionOutput = typeof JoernExecutableResolutionOutputSchema.Type

export const JoernProcessLifecycleInputSchema = Schema.Struct({
  command: Schema.String,
  port: Schema.Number,
})
export type JoernProcessLifecycleInput = typeof JoernProcessLifecycleInputSchema.Type

export const JoernProcessLifecycleOutputSchema = Schema.Struct({
  command: Schema.String,
  args: Schema.Array(Schema.String),
  port: Schema.Number,
  pid: Schema.optional(Schema.Number),
})
export type JoernProcessLifecycleOutput = typeof JoernProcessLifecycleOutputSchema.Type

// @attune-packet-target generated-runtime-projection eligible
export const JoernExecutableResource = defineAlchemyResource({
  id: "joern-effect.executable-resolution.resource",
  kind: "external-service",
  alchemyType: "attune:resource:ExternalService",
  ownerRecipeId: joernExecutableResolutionRecipeId,
  producedBy: [joernExecutableResolutionRecipeId],
  consumedBy: [joernExecutableResolutionRecipeId, joernProcessLifecycleRecipeId],
  addressFields: ["configuredBinary", "path"],
  addressSchema: JoernExecutableResolutionInputSchema as never,
  stateSchema: JoernExecutableResolutionOutputSchema as never,
  modes: ["read", "check", "invoke"],
  programmaticResourceExport: "resolveJoernExecutableForRecipe",
  programmaticBridgeSourcePath: joernProcessRuntimeSourcePath,
})

// @attune-packet-target generated-runtime-projection eligible
export const JoernProcessLifecycleResource = defineAlchemyResource({
  id: "joern-effect.process-lifecycle.resource",
  kind: "external-service",
  alchemyType: "attune:resource:ExternalService",
  ownerRecipeId: joernProcessLifecycleRecipeId,
  producedBy: [joernProcessLifecycleRecipeId],
  consumedBy: [joernProcessLifecycleRecipeId, joernServerLifecycleRecipeId],
  addressFields: ["command", "port"],
  addressSchema: JoernProcessLifecycleInputSchema as never,
  stateSchema: JoernProcessLifecycleOutputSchema as never,
  modes: ["plan", "apply", "check", "destroy", "invoke"],
  programmaticResourceExport: "JoernProcessLifecycleLive",
  programmaticBridgeSourcePath: joernProcessRuntimeSourcePath,
})

export type StartedProcess = {
  readonly child: ChildProcessWithoutNullStreams
  readonly command: string
  readonly args: readonly string[]
  readonly stdout: () => string
  readonly stderr: () => string
}

const isExecutable = (path: string): Promise<boolean> =>
  access(path).then(
    () => true,
    () => false,
  )

export const resolveJoernExecutableForRecipe = (
  input: JoernExecutableResolutionInput = {},
): Effect.Effect<JoernExecutableResolutionOutput, JoernExecutableNotFoundError> =>
  Effect.tryPromise({
    catch: (cause) =>
      cause instanceof JoernExecutableNotFoundError
        ? cause
        : new JoernExecutableNotFoundError({
            message:
              "Could not resolve Joern executable. Set JOERN_BINARY or put joern on PATH.",
            attempted: ["JOERN_BINARY", "joern on PATH"],
          }),
    try: async () => {
      const configuredJoern = input.configuredBinary ?? readEnv(EnvVars.JoernBinary)
      if (configuredJoern !== undefined) {
        return { command: configuredJoern, attempted: ["JOERN_BINARY"] }
      }

      const names = process.platform === "win32" ? ["joern.bat", "joern.exe", "joern"] : ["joern"]
      const pathValue = input.path ?? readEnvOr(EnvVars.Path, "")
      const paths = pathValue.split(delimiter)
      const attempted = ["JOERN_BINARY", "joern on PATH"]
      for (const dir of paths) {
        for (const name of names) {
          const candidate = isAbsolute(name) ? name : join(dir, name)
          if (await isExecutable(candidate)) {
            return { command: candidate, attempted }
          }
        }
      }

      throw new JoernExecutableNotFoundError({
        message:
          "Could not find Joern. Install Joern and put `joern` on PATH, or set JOERN_BINARY to the executable path.",
        attempted,
      })
    },
  })

export const resolveJoernExecutable = resolveJoernExecutableForRecipe().pipe(
  Effect.map((resolved) => resolved.command),
)

export const startJoernProcess = (
  command: string,
  port: number,
): Effect.Effect<StartedProcess, JoernServerStartError> =>
  Effect.try({
    catch: (cause) =>
      new JoernServerStartError({
        message: "Failed to start Joern server process",
        command,
        args: ["--server", "--server-host", "127.0.0.1", "--server-port", String(port)],
        port,
        stdout: "",
        stderr: "",
        cause,
    }),
    try: () => {
      const args = ["--server", "--server-host", "127.0.0.1", "--server-port", String(port)]
      const child = spawn(command, args, { detached: true, stdio: "pipe" })
      let stdout = ""
      let stderr = ""
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString()
      })
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString()
      })
      child.once("error", (cause) => {
        stderr += cause instanceof Error ? cause.message : String(cause)
      })

      return {
        child,
        command,
        args,
        stdout: () => stdout,
        stderr: () => stderr,
      }
    },
  })

export const projectStartedProcessState = (
  processInfo: StartedProcess,
  port: number,
): JoernProcessLifecycleOutput => ({
  command: processInfo.command,
  args: [...processInfo.args],
  port,
  ...(processInfo.child.pid === undefined ? {} : { pid: processInfo.child.pid }),
})

export const stopProcess = (
  processInfo: StartedProcess,
): Effect.Effect<void, JoernServerShutdownError> =>
  Effect.async<void, JoernServerShutdownError>((resume) => {
    const {child} = processInfo
    if (child.exitCode !== null || child.killed) {
      resume(Effect.void)
      return
    }

    const kill = (signal: NodeJS.Signals): void => {
      if (child.pid === undefined) {
        child.kill(signal)
        return
      }
      try {
        globalThis.process.kill(-child.pid, signal)
      } catch {
        child.kill(signal)
      }
    }

    const timeout = setTimeout(() => {
      kill("SIGKILL")
    }, 2_000)

    child.once("exit", () => {
      clearTimeout(timeout)
      resume(Effect.void)
    })

    try {
      kill("SIGTERM")
    } catch (cause) {
      clearTimeout(timeout)
      resume(
        Effect.fail(
          new JoernServerShutdownError({
            message: "Failed to stop Joern server process",
            command: processInfo.command,
            ...(child.pid === undefined ? {} : { pid: child.pid }),
            cause,
          }),
        ),
      )
    }
  })

export interface JoernProcessLifecycleService {
  readonly check: (
    input: JoernProcessLifecycleInput,
  ) => Effect.Effect<
    JoernProcessLifecycleOutput,
    JoernServerStartError | JoernServerShutdownError
  >
}

export class JoernProcessLifecycle extends Context.Tag("joern-effect/ProcessLifecycle")<
  JoernProcessLifecycle,
  JoernProcessLifecycleService
>() {}

export const checkJoernProcessLifecycle = (
  input: JoernProcessLifecycleInput,
): Effect.Effect<
  JoernProcessLifecycleOutput,
  JoernServerStartError | JoernServerShutdownError
> =>
  Effect.gen(function* checkJoernProcessLifecycleBody() {
    const started = yield* startJoernProcess(input.command, input.port)
    const state = projectStartedProcessState(started, input.port)
    yield* stopProcess(started)
    return state
  })

export const JoernProcessLifecycleLive = Layer.succeed(JoernProcessLifecycle, {
  check: checkJoernProcessLifecycle,
})

export const JoernProcessLifecycleLayer = defineRecipeLayer({
  id: "joern-effect.process-lifecycle.layer",
  sourcePath: joernProcessRuntimeSourcePath,
  exportName: "JoernProcessLifecycleLive",
  layer: JoernProcessLifecycleLive as never,
  provides: [{
    id: "joern-effect.process-lifecycle.service",
    service: JoernProcessLifecycle as never,
  }],
})

export const runJoernProcessLifecycle = (
  input: JoernProcessLifecycleInput,
): Effect.Effect<
  JoernProcessLifecycleOutput,
  JoernServerStartError | JoernServerShutdownError,
  JoernProcessLifecycle
> =>
  Effect.gen(function* runJoernProcessLifecycleBody() {
    const lifecycle = yield* JoernProcessLifecycle
    return yield* lifecycle.check(input)
  })

export const JoernExecutableResolutionHandler = defineRecipeHandler<
  JoernExecutableResolutionInput,
  JoernExecutableResolutionOutput,
  JoernExecutableNotFoundError
>({
  id: "joern-effect.executable-resolution.handler",
  recipeId: joernExecutableResolutionRecipeId,
  sourcePath: joernProcessRuntimeSourcePath,
  exportName: "resolveJoernExecutableForRecipe",
  emitsReceipts: ["joern.executable.resolved"],
  handler: (input) => resolveJoernExecutableForRecipe(input) as never,
})

export const JoernProcessLifecycleHandler = defineRecipeHandler<
  JoernProcessLifecycleInput,
  JoernProcessLifecycleOutput,
  JoernServerStartError | JoernServerShutdownError,
  JoernProcessLifecycle
>({
  id: "joern-effect.process-lifecycle.handler",
  recipeId: joernProcessLifecycleRecipeId,
  sourcePath: joernProcessRuntimeSourcePath,
  exportName: "runJoernProcessLifecycle",
  layer: JoernProcessLifecycleLayer,
  emitsReceipts: ["joern.process.lifecycle.checked"],
  handler: (input) => runJoernProcessLifecycle(input) as never,
})

export const JoernExecutableResolutionRecipe = defineToolchainRecipe({
  id: joernExecutableResolutionRecipeId,
  projectId: "joern-effect",
  title: "Resolve the Joern executable through typed toolchain configuration",
  inputSchema: JoernExecutableResolutionInputSchema as never,
  outputSchema: JoernExecutableResolutionOutputSchema as never,
  allowedFiles: [joernProcessRuntimeSourcePath],
  validationEvidence: ["joern-effect:typecheck", "joern-effect:test"],
  io: {
    inputSchema: JoernExecutableResolutionInputSchema as never,
    outputSchema: JoernExecutableResolutionOutputSchema as never,
    inputResources: [JoernEnvironmentConfigResource],
    outputResources: [JoernExecutableResource],
  },
  handler: JoernExecutableResolutionHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernEnvironmentConfigRecipeId,
      toRecipeId: joernExecutableResolutionRecipeId,
      resource: JoernEnvironmentConfigResource,
      kind: "validates",
      modes: ["read", "check"],
    }),
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernExecutableResolutionRecipeId,
      toRecipeId: joernProcessLifecycleRecipeId,
      resource: JoernExecutableResource,
      kind: "invokes",
      modes: ["read", "invoke"],
    }),
  ],
})

export const JoernProcessLifecycleRecipe = defineManagedRecipe({
  id: joernProcessLifecycleRecipeId,
  projectId: "joern-effect",
  title: "Manage the spawned Joern server process through Effect lifecycle handlers",
  inputSchema: JoernProcessLifecycleInputSchema as never,
  outputSchema: JoernProcessLifecycleOutputSchema as never,
  allowedFiles: [joernProcessRuntimeSourcePath],
  validationEvidence: ["joern-effect:typecheck", "joern-effect:test"],
  io: {
    inputSchema: JoernProcessLifecycleInputSchema as never,
    outputSchema: JoernProcessLifecycleOutputSchema as never,
    inputResources: [JoernExecutableResource, JoernPortAllocationResource],
    outputResources: [JoernProcessLifecycleResource],
  },
  handler: JoernProcessLifecycleHandler as never,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernPortAllocationRecipeId,
      toRecipeId: joernProcessLifecycleRecipeId,
      resource: JoernPortAllocationResource,
      kind: "invokes",
      modes: ["read", "invoke"],
    }),
    defineAlchemyRecipeDagEdge({
      fromRecipeId: joernProcessLifecycleRecipeId,
      toRecipeId: joernServerLifecycleRecipeId,
      resource: JoernProcessLifecycleResource,
      kind: "manages",
      modes: ["plan", "apply", "check", "destroy"],
    }),
  ],
// @attune-packet-target generated-runtime-projection eligible
  alchemy: defineManagedRecipeAlchemyBinding({
    id: joernProcessLifecycleAlchemyBindingId,
    managedRecipeId: joernProcessLifecycleRecipeId,
    alchemyResourceType: "attune:alchemy:ManagedRecipe",
    providerId: joernNodeProcessProviderId,
    resource: JoernProcessLifecycleResource,
    lifecycle: {
      plan: "projectStartedProcessState",
      apply: "startJoernProcess",
      check: "checkJoernProcessLifecycle",
      stop: "stopProcess",
      destroy: "stopProcess",
      read: "projectStartedProcessState",
      diff: "projectStartedProcessState",
    },
  }),
  lifecycle: ["plan", "apply", "check", "stop", "destroy", "prune"],
  resourceKind: "joern-server-process",
  lifecycleSubstrates: [{
    id: joernProcessLifecycleSubstrateId,
    kind: "query-service",
    tool: "joern",
    lifecycleActions: ["plan", "apply", "check", "stop", "destroy"],
    evidence: ["nx run joern-effect:test"],
  }],
  observedState: { running: false },
  humanReviewRequired: true,
})

export const JoernProcessRuntimeRecipes = [
  JoernExecutableResolutionRecipe,
  JoernProcessLifecycleRecipe,
] as const
