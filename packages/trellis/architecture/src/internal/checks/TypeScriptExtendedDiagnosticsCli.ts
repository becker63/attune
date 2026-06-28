import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

export function runTypeScriptExtendedDiagnostics(): void {
  const packageTsconfigs = execFileSync("git", ["ls-files", "packages/*/tsconfig.json"], {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean)
    .sort()

  let failed = false

  for (const tsconfig of packageTsconfigs) {
    const packageDir = tsconfig.slice(0, -"/tsconfig.json".length)
    console.log(`\n== ${packageDir} ==`)
    try {
      const output = execFileSync(
        "pnpm",
        ["exec", "tsc", "--noEmit", "--extendedDiagnostics", "--project", "tsconfig.json"],
        { cwd: packageDir, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      )
      console.log(output.trim())
    } catch (error) {
      failed = true
      const output = processOutput(error)
      console.log(output.trim())
    }
  }

  if (failed) {
    process.exitCode = 1
  }
}

function processOutput(error: unknown): string {
  const processError = error as { readonly stdout?: unknown; readonly stderr?: unknown }
  return `${toOutput(processError.stdout)}${toOutput(processError.stderr)}`
}

function toOutput(value: unknown): string {
  return value === undefined || value === null ? "" : String(value)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runTypeScriptExtendedDiagnostics()
}
