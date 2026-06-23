import { defineAttunePackageDeclaration } from "@attune/framework-protocol"

export { PackageContractSchema } from "@attune/framework-protocol"
export * from "./attune.contract.generated.js"

export const PackageViewRoots = {
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

export const PackageDeclaration = defineAttunePackageDeclaration({
  id: "attune-nx",
  kind: "generator-tooling",
  operations: [
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
  views: [
    ...PackageViewRoots.reactivityKeys.map((id) => ({
      id,
      kind: "reactivity-key" as const,
    })),
    ...PackageViewRoots.atoms.map((id) => ({
      id,
      kind: "atom" as const,
    })),
  ],
} as const)
