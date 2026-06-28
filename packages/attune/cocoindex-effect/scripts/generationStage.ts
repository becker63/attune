import { spawnSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const stage = process.argv[2]
const projectRoot = dirname(fileURLToPath(import.meta.url)) + "/.."
const workspaceRoot = resolve(projectRoot, "../../..")

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

switch (stage) {
  case "emit-generated":
    run("pnpm", ["exec", "tsx", "scripts/generate-cocoindex-mcp-types.ts"])
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
    run("pnpm", ["exec", "tsx", "scripts/generate-cocoindex-mcp-types.ts"])
    break
  default:
    console.error(`Unknown cocoindex-effect generation stage: ${stage ?? "<missing>"}`)
    process.exitCode = 1
}
