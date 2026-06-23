import { defineAttunePackageDeclaration } from "@attune/framework-protocol"

export { PackageContractSchema } from "@attune/framework-protocol"
export * from "./attune.contract.generated.js"

export const PackageViewRoots = {
  reactivityKeys: [
    "joern-effect-properties.property-run.changed",
    "joern-effect-properties.fuzz-run.changed",
    "joern-effect-properties.corpus.changed",
    "joern-effect-properties.counterexample.changed",
    "joern-effect-properties.worker-shard.changed",
    "joern-effect-properties.workspace-pool.changed",
    "joern-effect-properties.coverage-feedback.changed",
    "joern-effect-properties.weak-oracle.changed",
    "joern-effect-properties.telemetry.changed",
  ],
  atoms: [
    "propertyRunAtom",
    "fuzzRunAtom",
    "corpusAtom",
    "counterexampleAtom",
    "workerShardAtom",
    "workspacePoolAtom",
    "coverageFeedbackAtom",
    "weakOracleFindingAtom",
    "telemetryEventAtom",
  ],
} as const

export const PackageDeclaration = defineAttunePackageDeclaration({
  id: "joern-effect-properties",
  kind: "property-proof-runtime",
  operations: [
    {
      id: "property-harness-runtime",
      kind: "command",
      name: "Property harness runtime configuration",
    },
    {
      id: "semantic-corpus-store",
      kind: "query",
      name: "Semantic corpus store boundary",
    },
    {
      id: "counterexample-store",
      kind: "command",
      name: "Counterexample store and promotion boundary",
    },
    {
      id: "semantic-mutator",
      kind: "generator",
      name: "Semantic project mutator",
    },
    {
      id: "semantic-fuzz-scheduler",
      kind: "command",
      name: "Semantic fuzz scheduler and shard runner",
    },
    {
      id: "joern-workspace-pool",
      kind: "resource-provider",
      name: "Joern workspace pool worker boundary",
    },
    {
      id: "fuzz-oracle",
      kind: "joern-template",
      name: "Fuzz oracle and Joern query recipe boundary",
    },
    {
      id: "fuzz-telemetry",
      kind: "event-facade",
      name: "Fuzz telemetry event facade",
    },
    {
      id: "coverage-search-feedback",
      kind: "projection",
      name: "Coverage search and weak-oracle feedback",
    },
    {
      id: "worker-property-wrapper",
      kind: "command",
      name: "Worker property wrapper boundary",
    },
    {
      id: "property-proof-view-atoms",
      kind: "atom-family",
      name: "Property proof runtime package view atoms",
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
