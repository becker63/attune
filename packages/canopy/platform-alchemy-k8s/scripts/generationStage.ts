import { spawnSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const projectRoot = dirname(fileURLToPath(import.meta.url)) + "/.."
const workspaceRoot = resolve(projectRoot, "../../..")
const stage = process.argv[2]

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
    run("pnpm", ["exec", "tsx", "scripts/generate-crd-types.ts", stage])
    run(
      "pnpm",
      [
        "exec",
        "nx",
        "generate",
        "@attune/nx:sync-k8s-resources",
        "--directory",
        "packages/canopy/platform-alchemy-k8s/src/resources",
        "--registry",
        "packages/canopy/platform-alchemy-k8s/src/resources/ResourceRegistry.generated.ts",
      ],
      workspaceRoot,
    )
    break
  case "emit-crd-manifests":
  case "emit-crd-types":
    run("pnpm", ["exec", "tsx", "scripts/generate-crd-types.ts", stage])
    break
  case "sync-k8s-resources":
    run(
      "pnpm",
      [
        "exec",
        "nx",
        "generate",
        "@attune/nx:sync-k8s-resources",
        "--directory",
        "packages/canopy/platform-alchemy-k8s/src/resources",
        "--registry",
        "packages/canopy/platform-alchemy-k8s/src/resources/ResourceRegistry.generated.ts",
      ],
      workspaceRoot,
    )
    break
  default:
    console.error(`Unknown platform-alchemy-k8s generation stage: ${stage ?? "<missing>"}`)
    process.exitCode = 1
}
