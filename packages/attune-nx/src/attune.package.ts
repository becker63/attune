import { defineAttuneProjectFacts } from "@attune/framework-protocol"

export const ProjectRuntimeRoots = {
  reactivityKeys: [
    "attune-nx.generator-plan.changed",
    "attune-nx.generated-diff.changed",
    "attune-nx.provenance.changed",
    "attune-nx.project-facts.changed",
    "attune-nx.executor-intent.changed",
  ],
  atoms: [
    "generatorPlanAtom",
    "generatedDiffAtom",
    "provenanceAtom",
    "projectFactsAtom",
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
      id: "generate-project-facts",
      kind: "generator",
      name: "Generate Project Facts",
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
      id: "query-project-facts-graph",
      kind: "query",
      name: "Query Project Facts Graph",
    },
    {
      id: "upsert-artifact-provenance",
      kind: "command",
      name: "Upsert Artifact Provenance",
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
