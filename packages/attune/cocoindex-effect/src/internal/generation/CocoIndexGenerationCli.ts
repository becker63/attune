import { spawnSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")
const workspaceRoot = resolve(projectRoot, "../../..")
const mcpTypesGenerator = "src/internal/generation/CocoIndexMcpTypes.ts"

const run = (command: string, args: ReadonlyArray<string>, cwd = projectRoot): void => {
  const result = spawnSync(command, args, {
    cwd,
    env: {
      ...process.env,
      TMPDIR: process.env.TMPDIR ?? "/tmp",
      TEMP: process.env.TEMP ?? "/tmp",
      TMP: process.env.TMP ?? "/tmp",
    },
    stdio: "inherit",
  })

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1
  }
}

export function runCocoIndexGenerationCli(argv: readonly string[] = process.argv.slice(2)): void {
  const stage = argv[0]

  switch (stage) {
    case "emit-generated":
      run("pnpm", ["exec", "tsx", mcpTypesGenerator])
      run(
        "pnpm",
        [
          "exec",
          "nx",
          "generate",
          "@attune/nx:sync-cocoindex-mcp-tools",
          "--directory",
          "packages/attune/cocoindex-effect/src/cocoindex/tools",
          "--registry",
          "packages/attune/cocoindex-effect/src/cocoindex/tools/ToolRegistry.generated.ts",
        ],
        workspaceRoot,
      )
      break
    case "inspect-cocoindex-mcp":
    case "emit-mcp-schema":
      run("pnpm", ["exec", "tsx", mcpTypesGenerator])
      break
    default:
      console.error(`Unknown cocoindex-effect generation stage: ${stage ?? "<missing>"}`)
      process.exitCode = 1
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCocoIndexGenerationCli(process.argv.slice(2))
}
