import { defineAttuneProjectFacts } from "@attune/framework-protocol"

export const ProjectRuntimeRoots = {
  reactivityKeys: [
    "attune-nx.generator-plan.changed",
    "attune-nx.generated-diff.changed",
    "attune-nx.provenance.changed",
    "attune-nx.contract-graph.changed",
    "attune-nx.executor-intent.changed",
  ],
  atoms: [
    "generatorPlanAtom",
    "generatedDiffAtom",
    "provenanceAtom",
    "contractGraphAtom",
    "generatorInventoryAtom",
    "executorIntentAtom",
  ],
} as const

export const ProjectFacts = defineAttuneProjectFacts({
  id: "attune-nx",
  kind: "generator-tooling",
  symbols: [
    {
      id: "generate-effect-service",
      kind: "generator",
      name: "Generate Effect Service",
    },
    {
      id: "generate-package-contract",
      kind: "generator",
      name: "Generate Package Contract",
    },
    {
      id: "generate-atom-view",
      kind: "generator",
      name: "Generate Atom View",
    },
    {
      id: "query-generator-inventory",
      kind: "query",
      name: "Query Generator Inventory",
    },
    {
      id: "infer-package-contract-graph",
      kind: "query",
      name: "Infer Package Contract Graph",
    },
    {
      id: "upsert-source-bom-provenance",
      kind: "command",
      name: "Upsert Source BOM Provenance",
    },
    {
      id: "normalize-executor-intent",
      kind: "policy-rule",
      name: "Normalize Executor Intent",
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
