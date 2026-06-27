import { defineAttuneProjectFacts } from "@attune/framework-protocol"

export const ProjectRuntimeRoots = {
  reactivityKeys: [
    "joern-effect.runtime.query.changed",
    "joern-effect.program-builder.changed",
    "joern-effect.traversal-dsl.generated",
    "joern-effect.template-registry.changed",
    "joern-effect.query-evidence.changed",
    "joern-effect.generated-schema-coverage.changed",
  ],
  atoms: [
    "joernRuntimeAtom",
    "cpgProgramBuilderAtom",
    "traversalDslAtom",
    "templateRegistryAtom",
    "queryEvidenceAtom",
    "generatedSchemaCoverageAtom",
  ],
} as const

export const ProjectFacts = defineAttuneProjectFacts({
  id: "joern-effect",
  kind: "joern-runtime-and-dsl",
  symbols: [
    {
      id: "joern-runtime-query",
      kind: "command",
      name: "Joern runtime query boundary",
    },
    {
      id: "cpg-program-builder",
      kind: "query",
      name: "CPG program builder compile boundary",
    },
    {
      id: "generated-traversal-dsl",
      kind: "generator",
      name: "Generated traversal DSL and schema modules",
    },
    {
      id: "joern-template-boundary",
      kind: "joern-template",
      name: "Joern template registry boundary",
    },
    {
      id: "query-evidence-view",
      kind: "atom-family",
      name: "Query evidence package view atoms",
    },
    {
      id: "generated-schema-coverage",
      kind: "atom-family",
      name: "Generated schema coverage package view atom",
    },
  ],
  edges: [
    ...ProjectRuntimeRoots.reactivityKeys.map((id) => ({
      id,
      kind: "reactivity-key" as const,
    })),
    ...ProjectRuntimeRoots.atoms.map((id) => ({
      id,
      kind: "atom" as const,
    })),
  ],
} as const)
