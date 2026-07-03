import { Effect } from "effect"
import { generateFastCheckArbitraries } from "../src/pure/codegen/generate.js"

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

if (stage === "emit-fast-check-arbitraries") {
  Effect.runPromise(
    generateFastCheckArbitraries(
      "src/internal/generated",
      "schema/joern-cpg-schema.1.7.70.json",
    ),
  ).catch((error) => {
    console.error(error)
    process.exit(1)
  })
} else {
  console.log(`joern-effect generation stage registered: ${stage}`)
  console.log("This stage is currently implemented by the aggregate TypeScript generator during migration.")
}
