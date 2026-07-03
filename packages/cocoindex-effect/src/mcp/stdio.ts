import { spawn } from "node:child_process"
import { createInterface, type Interface } from "node:readline"
import { Effect } from "effect"
import { CocoIndexCommandError, CocoIndexMcpProtocolError } from "../errors.js"

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
