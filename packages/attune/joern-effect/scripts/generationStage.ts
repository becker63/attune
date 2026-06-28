import { spawnSync } from "node:child_process"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { Effect } from "effect"
import { generate, generateFastCheckArbitraries } from "../src/pure/codegen/generate.js"

const projectRoot = dirname(fileURLToPath(import.meta.url)) + "/.."
const workspaceRoot = resolve(projectRoot, "../../..")

const knownStages = new Set([
  "extract-cpg-schema",
  "enrich-schema-docs",
  "normalize-schema",
  "emit-schema-modules",
  "emit-node-types",
  "emit-property-metadata",
  "emit-traversal-dsl",
  "emit-template-registry",
  "emit-template-bindings",
  "emit-template-evidence",
  "emit-fast-check-arbitraries",
  "emit-generated",
  "render-readme",
])

const stage = process.argv[2]

if (stage === undefined || !knownStages.has(stage)) {
  console.error(`Unknown joern-effect generation stage: ${stage ?? "<missing>"}`)
  process.exit(1)
}

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
    throw new Error(`${command} ${args.join(" ")} failed with ${result.status ?? 1}`)
  }
}

const syncTemplateRegistry = Effect.sync(() =>
  run(
    "pnpm",
    [
      "exec",
      "nx",
      "generate",
      "@attune/nx:sync-joern-templates",
      "--directory",
      "packages/attune/joern-effect/src/joern/templates",
      "--registry",
      "packages/attune/joern-effect/src/joern/templates/TemplateRegistry.generated.ts",
    ],
    workspaceRoot,
  ),
)

const renderReadme = Effect.sync(() =>
  run("pnpm", ["exec", "tsx", "scripts/renderReadme.ts"]),
)

const aggregateGeneratedBindings = generate().pipe(
  Effect.zipRight(syncTemplateRegistry),
  Effect.zipRight(
    generateFastCheckArbitraries(
      "src/internal/generated",
      "schema/joern-cpg-schema.1.7.70.json",
    ),
  ),
  Effect.zipRight(renderReadme),
)

if (stage === "emit-generated") {
  Effect.runPromise(aggregateGeneratedBindings).catch((error) => {
    console.error(error)
    process.exit(1)
  })
} else if (stage === "emit-fast-check-arbitraries") {
  Effect.runPromise(
    generateFastCheckArbitraries(
      "src/internal/generated",
      "schema/joern-cpg-schema.1.7.70.json",
    ),
  ).catch((error) => {
    console.error(error)
    process.exit(1)
  })
} else if (stage === "emit-template-registry") {
  Effect.runPromise(syncTemplateRegistry).catch((error) => {
    console.error(error)
    process.exit(1)
  })
} else if (stage === "render-readme") {
  Effect.runPromise(renderReadme).catch((error) => {
    console.error(error)
    process.exit(1)
  })
} else {
  console.log(`joern-effect generation stage registered: ${stage}`)
  console.log("This stage is currently implemented by the aggregate TypeScript generator during migration.")
}
