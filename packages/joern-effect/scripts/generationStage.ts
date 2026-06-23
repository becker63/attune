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

console.log(`joern-effect generation stage registered: ${stage}`)
console.log("This stage is currently implemented by the aggregate TypeScript generator during migration.")
