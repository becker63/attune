import { spawn } from "node:child_process"
import process from "node:process"
import { join, resolve } from "node:path"

const optionValue = (args: readonly string[], name: string): string | undefined => {
  const inline = args.find((arg) => arg.startsWith(`--${name}=`))
  if (inline !== undefined) {
    return inline.slice(name.length + 3)
  }
  const index = args.indexOf(`--${name}`)
  return index === -1 ? undefined : args[index + 1]
}

const userArgs = process.argv.slice(2)
const configuredWorkers = optionValue(userArgs, "workers")
const passthroughArgs = (args: readonly string[]): readonly string[] => {
  const kept: string[] = []
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (arg === "--workers") {
      index += 1
      continue
    }
    if (arg?.startsWith("--workers=")) {
      continue
    }
    if (arg !== undefined) {
      kept.push(arg)
    }
  }
  return kept
}
const workerArgs = configuredWorkers === undefined
  ? []
  : [
      "--pool=forks",
      `--maxWorkers=${Math.max(1, Number.parseInt(configuredWorkers, 10))}`,
      "--minWorkers=1",
    ]

const args = [
  "run",
  ...workerArgs,
  ...passthroughArgs(userArgs),
]

const workspaceRoot = resolve(new URL("../../..", import.meta.url).pathname)
const packageRoot = resolve(new URL("..", import.meta.url).pathname)
const vitestBinary = join(workspaceRoot, "node_modules", ".bin", "vitest")

const child = spawn(vitestBinary, args, {
  cwd: packageRoot,
  stdio: "inherit",
})

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})
