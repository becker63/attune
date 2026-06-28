import { fileURLToPath } from "node:url"
import { Effect } from "effect"

import { generate, generateFastCheckArbitraries } from "../../pure/codegen/generate.js"
import { renderJoernReadme } from "./JoernReadme.js"

export const joernGenerationStages = [
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
] as const

const knownStages = new Set<string>(joernGenerationStages)

const renderReadmeEffect = Effect.tryPromise({
  catch: (cause) => new Error(String(cause)),
  try: () => renderJoernReadme(),
})

const checkedInSchemaPath = "schema/joern-cpg-schema.1.7.70.json"

const generateSchemaModules = generate("src/pure/generated", checkedInSchemaPath)

const generateArbitraries = generateFastCheckArbitraries(
  "src/internal/generated",
  checkedInSchemaPath,
)

const aggregateGeneratedBindings = generateSchemaModules.pipe(
  Effect.zipRight(generateArbitraries),
  Effect.zipRight(renderReadmeEffect),
)

const registeredStage = (stage: string): Effect.Effect<void, Error> =>
  Effect.sync(() => {
    console.log(`joern-effect generation stage registered: ${stage}`)
    console.log("This stage is represented by typed recipe generation modules.")
  })

export const runJoernGenerationStage = (
  stage: string,
): Effect.Effect<void, Error> => {
  if (!knownStages.has(stage)) {
    return Effect.fail(new Error(`Unknown joern-effect generation stage: ${stage}`))
  }

  switch (stage) {
    case "emit-generated":
      return aggregateGeneratedBindings
    case "emit-fast-check-arbitraries":
      return generateArbitraries
    case "emit-schema-modules":
    case "emit-node-types":
    case "emit-property-metadata":
    case "emit-traversal-dsl":
      return generateSchemaModules
    case "render-readme":
      return renderReadmeEffect
    case "emit-template-registry":
    case "emit-template-bindings":
    case "emit-template-evidence":
    case "extract-cpg-schema":
    case "enrich-schema-docs":
    case "normalize-schema":
      return registeredStage(stage)
    default:
      return Effect.fail(new Error(`Unhandled joern-effect generation stage: ${stage}`))
  }
}

export const runJoernGenerationCli = async (
  argv: readonly string[] = process.argv.slice(2),
): Promise<void> => {
  const stage = argv[0]
  if (stage === undefined) {
    throw new Error(`Expected joern-effect generation stage: ${joernGenerationStages.join(", ")}`)
  }
  await Effect.runPromise(runJoernGenerationStage(stage))
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runJoernGenerationCli().catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
}
