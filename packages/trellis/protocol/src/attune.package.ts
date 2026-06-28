import { defineAttuneProjectFacts } from "@attune/framework-protocol"

export const ProjectRuntimeRoots = {
  reactivityKeys: [
    "framework-protocol.recipe-contract.changed",
    "framework-protocol.project-facts.changed",
    "framework-protocol.diagnostics.changed",
  ],
  atoms: [
    "recipeContractAtom",
    "projectFactsContractAtom",
    "diagnosticRuleAtom",
  ],
} as const

export const ProjectFacts = defineAttuneProjectFacts({
  id: "framework-protocol",
  kind: "architecture-policy",
  symbols: [
    {
      id: "recipe-kernel-contract",
      kind: "codec",
      name: "Recipe and ManagedRecipe kernel contract",
    },
    {
      id: "project-facts-contract",
      kind: "codec",
      name: "Project facts contract",
    },
    {
      id: "diagnostic-rule-contract",
      kind: "policy-rule",
      name: "Diagnostic rule contract",
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
