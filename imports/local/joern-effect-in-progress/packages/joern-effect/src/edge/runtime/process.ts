import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams } from 'node:child_process';
import { access } from "node:fs/promises"
import { delimiter, isAbsolute, join } from "node:path"
import { Effect } from "effect"
import {
  JoernExecutableNotFoundError,
  JoernServerShutdownError,
  JoernServerStartError,
} from "./errors.js"
import { EnvVars, readEnv, readEnvOr } from "./env.js"

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

export const resolveJoernExecutable = Effect.tryPromise({
  catch: (cause) =>
    cause instanceof JoernExecutableNotFoundError
      ? cause
      : new JoernExecutableNotFoundError({
          message:
            "Could not resolve Joern executable. Set JOERN_BINARY or put joern on PATH.",
          attempted: ["JOERN_BINARY", "joern on PATH"],
        }),
  try: async () => {
    const configuredJoern = readEnv(EnvVars.JoernBinary)
    if (configuredJoern !== undefined) return configuredJoern

    const names = process.platform === "win32" ? ["joern.bat", "joern.exe", "joern"] : ["joern"]
    const paths = readEnvOr(EnvVars.Path, "").split(delimiter)
    for (const dir of paths) {
      for (const name of names) {
        const candidate = isAbsolute(name) ? name : join(dir, name)
        if (await isExecutable(candidate)) return candidate
      }
    }

    throw new JoernExecutableNotFoundError({
      message:
        "Could not find Joern. Install Joern and put `joern` on PATH, or set JOERN_BINARY to the executable path.",
      attempted: ["JOERN_BINARY", "joern on PATH"],
    })
  },
})

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
      const child = spawn(command, args, { stdio: "pipe" })
      let stdout = ""
      let stderr = ""
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString()
      })
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString()
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

export const stopProcess = (
  processInfo: StartedProcess,
): Effect.Effect<void, JoernServerShutdownError> =>
  Effect.async<void, JoernServerShutdownError>((resume) => {
    const {child} = processInfo
    if (child.exitCode !== null || child.killed) {
      resume(Effect.void)
      return
    }

    const timeout = setTimeout(() => {
      child.kill("SIGKILL")
    }, 2_000)

    child.once("exit", () => {
      clearTimeout(timeout)
      resume(Effect.void)
    })

    try {
      child.kill("SIGTERM")
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
