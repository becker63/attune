import { spawn } from "node:child_process"
import { createInterface, type Interface } from "node:readline"
import {
  defineAlchemyResource,
  defineManagedRecipe,
  defineManagedRecipeAlchemyBinding,
  defineRecipeHandler,
  defineRecipeLayer,
} from "@attune/framework-protocol"
import { Context, Effect, Layer, Schema } from "effect"
import { CocoIndexCommandError, CocoIndexMcpProtocolError } from "../errors.js"

export const CocoIndexMcpStdioRecipeId = "cocoindex-effect.mcp-stdio" as const
const CocoIndexMcpStdioResourceId = "cocoindex-effect.mcp-stdio.resource" as const
const CocoIndexMcpStdioHandlerId = "cocoindex-effect.mcp-stdio.handler" as const
const CocoIndexMcpStdioAlchemyBindingId = "cocoindex-effect.mcp-stdio.alchemy" as const
const CocoIndexMcpStdioProviderId = "cocoindex-effect.mcp-stdio.provider" as const
const CocoIndexMcpStdioLayerId = "cocoindex-effect.mcp-stdio.layer" as const
const CocoIndexMcpStdioRuntimeId = "cocoindex-effect.mcp-stdio.runtime" as const
const CocoIndexMcpStdioSourcePath =
  "packages/attune/cocoindex-effect/src/mcp/stdio.ts" as const

export type McpStdioCommand = Readonly<{
  readonly command: string
  readonly args?: ReadonlyArray<string>
  readonly cwd: string
  readonly env?: Readonly<Record<string, string>>
  readonly startupTimeoutMs?: number
}>

export type McpStdioClient = Readonly<{
  readonly request: (method: string, params?: unknown) => Promise<unknown>
  readonly notify: (method: string, params?: unknown) => void
  readonly close: () => Promise<void>
}>

export const McpStdioCommandSchema = Schema.Struct({
  command: Schema.String,
  args: Schema.optional(Schema.Array(Schema.String)),
  cwd: Schema.String,
  env: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  startupTimeoutMs: Schema.optional(Schema.Number),
})
export type McpStdioCommandInput = typeof McpStdioCommandSchema.Type

export const McpStdioSessionState = Schema.Struct({
  command: Schema.String,
  cwd: Schema.String,
  protocolVersion: Schema.Literal("2025-06-18"),
  phase: Schema.Literals(["Planned", "Ready", "Stopped"] as const),
  startupTimeoutMs: Schema.Number,
})
export type McpStdioSessionState = typeof McpStdioSessionState.Type

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexMcpStdioResource = defineAlchemyResource({
  id: CocoIndexMcpStdioResourceId,
  kind: "external-service",
  alchemyType: "attune:resource:McpStdioProcess",
  providerId: CocoIndexMcpStdioProviderId,
  ownerRecipeId: CocoIndexMcpStdioRecipeId,
  producedBy: [CocoIndexMcpStdioRecipeId],
  consumedBy: [
    "cocoindex-effect.emit-mcp-schema",
    "cocoindex-effect.repository-session",
  ],
  addressFields: ["command", "cwd"],
  addressSchema: McpStdioCommandSchema,
  stateSchema: McpStdioSessionState,
  modes: ["plan", "apply", "check", "destroy", "read", "external"],
  programmaticResourceExport: "startMcpStdioClient",
  programmaticProviderExport: "CocoIndexMcpStdioRecipe",
  programmaticBridgeSourcePath: CocoIndexMcpStdioSourcePath,
})

export interface CocoIndexMcpStdioRuntimeService {
  readonly plan: (input: McpStdioCommandInput) => Effect.Effect<McpStdioSessionState>
}

export class CocoIndexMcpStdioRuntime extends Context.Service<
  CocoIndexMcpStdioRuntime,
  CocoIndexMcpStdioRuntimeService
>()("cocoindex-effect/CocoIndexMcpStdioRuntime") {}

export const CocoIndexMcpStdioRuntimeLive = Layer.succeed(CocoIndexMcpStdioRuntime, {
  plan: (input) =>
    Effect.succeed({
      command: input.command,
      cwd: input.cwd,
      protocolVersion: "2025-06-18" as const,
      phase: "Planned" as const,
      startupTimeoutMs: input.startupTimeoutMs ?? 30_000,
    }),
})

export const CocoIndexMcpStdioLayer = defineRecipeLayer({
  id: CocoIndexMcpStdioLayerId,
  sourcePath: CocoIndexMcpStdioSourcePath,
  exportName: "CocoIndexMcpStdioRuntimeLive",
  layer: CocoIndexMcpStdioRuntimeLive,
  provides: [{
    id: CocoIndexMcpStdioRuntimeId,
    service: CocoIndexMcpStdioRuntime,
  }],
})

export const CocoIndexMcpStdioLifecycleHandler = defineRecipeHandler<
  McpStdioCommandInput,
  McpStdioSessionState,
  CocoIndexCommandError | CocoIndexMcpProtocolError,
  CocoIndexMcpStdioRuntime
>({
  id: CocoIndexMcpStdioHandlerId,
  recipeId: CocoIndexMcpStdioRecipeId,
  sourcePath: CocoIndexMcpStdioSourcePath,
  exportName: "startMcpStdioClient",
  handler: (input) =>
    Effect.gen(function* planMcpStdioLifecycle() {
      const runtime = yield* CocoIndexMcpStdioRuntime
      return yield* runtime.plan(input)
    }),
  layer: CocoIndexMcpStdioLayer,
  emitsReceipts: ["cocoindex-effect.mcp-stdio.lifecycle"],
})

export const CocoIndexMcpStdioAlchemyBinding = defineManagedRecipeAlchemyBinding<
  McpStdioCommandInput,
  McpStdioSessionState
>({
  id: CocoIndexMcpStdioAlchemyBindingId,
  managedRecipeId: CocoIndexMcpStdioRecipeId,
  alchemyResourceType: "attune:managed-resource:McpStdioProcess",
  providerId: CocoIndexMcpStdioProviderId,
  resource: CocoIndexMcpStdioResource,
  lifecycle: {
    plan: "CocoIndexMcpStdioLifecycleHandler",
    apply: "startMcpStdioClient",
    check: "initializeMcp",
    destroy: "McpStdioClient.close",
    read: "CocoIndexMcpStdioLifecycleHandler",
  },
})

export const CocoIndexMcpStdioRecipe = defineManagedRecipe({
  id: CocoIndexMcpStdioRecipeId,
  projectId: "cocoindex-effect",
  title: "Manage CocoIndex MCP stdio process lifecycle",
  inputSchema: McpStdioCommandSchema,
  outputSchema: McpStdioSessionState,
  allowedFiles: [CocoIndexMcpStdioSourcePath],
  validationEvidence: ["cocoindex-effect:test", "cocoindex-effect:typecheck"],
  lifecycle: ["plan", "apply", "check", "destroy"],
  resourceKind: "mcp-stdio-client",
  io: {
    inputSchema: McpStdioCommandSchema,
    outputSchema: McpStdioSessionState,
    inputResources: [CocoIndexMcpStdioResource],
    outputResources: [CocoIndexMcpStdioResource],
  },
  handler: CocoIndexMcpStdioLifecycleHandler as never,
  alchemy: CocoIndexMcpStdioAlchemyBinding,
  humanReviewRequired: true,
})

export const CocoIndexMcpStdioRecipes = [CocoIndexMcpStdioRecipe] as const

type PendingRequest = {
  readonly resolve: (value: unknown) => void
  readonly reject: (error: unknown) => void
}

export const startMcpStdioClient = (
  config: McpStdioCommand,
): Effect.Effect<McpStdioClient, CocoIndexCommandError | CocoIndexMcpProtocolError> =>
  Effect.tryPromise({
    try: () => startClient(config),
    catch: (cause) =>
      cause instanceof CocoIndexCommandError ||
      cause instanceof CocoIndexMcpProtocolError
        ? cause
        : new CocoIndexCommandError({
            message: "Failed to start CocoIndex MCP server",
            operation: "mcp.start",
            cause,
          }),
  })

const startClient = async (config: McpStdioCommand): Promise<McpStdioClient> => {
  const child = spawn(config.command, config.args ?? [], {
    cwd: config.cwd,
    env: config.env ? { ...process.env, ...config.env } : process.env,
    stdio: ["pipe", "pipe", "pipe"],
  })
  const pending = new Map<number, PendingRequest>()
  const stderr: Array<string> = []
  let stdoutBuffer = ""
  let nextId = 1
  let closed = false

  const stderrLines = createInterface({ input: child.stderr })
  stderrLines.on("line", (line) => stderr.push(line))

  child.stdout.on("data", (chunk: Buffer) => {
    stdoutBuffer += chunk.toString("utf8")
    for (;;) {
      const message = readJsonRpcMessage()
      if (message === undefined) break
      if (message.id === undefined) continue
      const request = pending.get(message.id)
      if (!request) continue
      pending.delete(message.id)

      if (message.error !== undefined) {
        request.reject(
          new CocoIndexMcpProtocolError({
            message: "CocoIndex MCP server returned an error",
            method: "unknown",
            payload: message.error,
          }),
        )
        continue
      }

      request.resolve(message.result)
    }
  })

  const readJsonRpcMessage = ():
    | {
        readonly id?: number
        readonly result?: unknown
        readonly error?: unknown
      }
    | undefined => {
    const firstFrame = stdoutBuffer.search(/Content-Length:|\{/u)
    if (firstFrame > 0) stdoutBuffer = stdoutBuffer.slice(firstFrame)

    if (stdoutBuffer.startsWith("Content-Length:")) {
      const headerEnd = stdoutBuffer.indexOf("\r\n\r\n")
      if (headerEnd < 0) return undefined
      const header = stdoutBuffer.slice(0, headerEnd)
      const match = /Content-Length:\s*(\d+)/iu.exec(header)
      if (!match) {
        throwProtocol("CocoIndex MCP frame is missing Content-Length", header)
        return undefined
      }
      const length = Number(match[1])
      const bodyStart = headerEnd + 4
      const bodyEnd = bodyStart + length
      if (stdoutBuffer.length < bodyEnd) return undefined
      const body = stdoutBuffer.slice(bodyStart, bodyEnd)
      stdoutBuffer = stdoutBuffer.slice(bodyEnd)
      return parseJsonRpc(body)
    }

    const newline = stdoutBuffer.indexOf("\n")
    if (newline < 0) return undefined
    const line = stdoutBuffer.slice(0, newline).trim()
    stdoutBuffer = stdoutBuffer.slice(newline + 1)
    if (!line.startsWith("{")) return undefined
    return parseJsonRpc(line)
  }

  const parseJsonRpc = (
    body: string,
  ):
    | {
        readonly id?: number
        readonly result?: unknown
        readonly error?: unknown
      }
    | undefined => {
    try {
      return JSON.parse(body) as {
        readonly id?: number
        readonly result?: unknown
        readonly error?: unknown
      }
    } catch (cause) {
      rejectPending(
        pending,
        new CocoIndexMcpProtocolError({
          message: "CocoIndex MCP server emitted invalid JSON-RPC",
          method: "stdio.read",
          payload: body,
          cause,
        }),
      )
      return undefined
    }
  }

  const throwProtocol = (message: string, payload: unknown): void => {
    rejectPending(
      pending,
      new CocoIndexMcpProtocolError({
        message,
        method: "stdio.read",
        payload,
      }),
    )
  }

  child.on("error", (cause) => {
    rejectPending(
      pending,
      new CocoIndexCommandError({
        message: "CocoIndex MCP process failed",
        operation: "mcp.process",
        cause,
      }),
    )
  })

  child.on("close", (exitCode) => {
    closed = true
    rejectPending(
      pending,
      new CocoIndexCommandError({
        message: "CocoIndex MCP process closed",
        operation: "mcp.process",
        stderr: stderr.join("\n"),
        ...(exitCode === null ? {} : { exitCode }),
      }),
    )
  })

  const request = (method: string, params?: unknown): Promise<unknown> => {
    if (closed) {
      return Promise.reject(
        new CocoIndexCommandError({
          message: "CocoIndex MCP process is closed",
          operation: method,
          stderr: stderr.join("\n"),
        }),
      )
    }

    const id = nextId++
    const body =
      params === undefined
        ? { jsonrpc: "2.0", id, method }
        : { jsonrpc: "2.0", id, method, params }
    child.stdin.write(`${JSON.stringify(body)}\n`)
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
    })
  }

  const notify = (method: string, params?: unknown): void => {
    const body =
      params === undefined
        ? { jsonrpc: "2.0", method }
        : { jsonrpc: "2.0", method, params }
    child.stdin.write(`${JSON.stringify(body)}\n`)
  }

  const close = async (): Promise<void> => {
    closeReadline(stderrLines)
    child.stdin.end()
    if (!closed) child.kill("SIGTERM")
  }

  await initializeMcp(request, notify, config)
  return { request, notify, close }
}

const initializeMcp = async (
  request: McpStdioClient["request"],
  notify: McpStdioClient["notify"],
  config: McpStdioCommand,
): Promise<void> => {
  const timeoutMs = config.startupTimeoutMs ?? 30_000
  await withTimeout(
    request("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {
        roots: {},
      },
      clientInfo: {
        name: "attune-cocoindex-effect",
        version: "0.0.0",
      },
    }),
    timeoutMs,
    "initialize",
  )
  notify("notifications/initialized")
}

const withTimeout = async <A>(
  promise: Promise<A>,
  timeoutMs: number,
  method: string,
): Promise<A> => {
  let timeout: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => {
          reject(
            new CocoIndexMcpProtocolError({
              message: "Timed out waiting for CocoIndex MCP response",
              method,
            }),
          )
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

const rejectPending = (
  pending: Map<number, PendingRequest>,
  error: unknown,
): void => {
  for (const request of pending.values()) {
    request.reject(error)
  }
  pending.clear()
}

const closeReadline = (readline: Interface): void => {
  try {
    readline.close()
  } catch {
    // Best effort shutdown; the child process owns the actual file handles.
  }
}
