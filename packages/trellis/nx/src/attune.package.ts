import { defineAttuneProjectFacts } from "@attune/framework-protocol"

export const ProjectRuntimeRoots = {
  reactivityKeys: [
    "framework-nx.recipe-targets.changed",
    "framework-nx.repair-plan.changed",
    "framework-nx.materialization-plan.changed",
  ],
  atoms: [
    "recipePublicTargetsAtom",
    "recipeRepairPlanAtom",
    "frameworkMaterializationPlanAtom",
  ],
} as const

export const ProjectFacts = defineAttuneProjectFacts({
  id: "framework-nx",
  kind: "generator-tooling",
  symbols: [
    {
      id: "recipe-public-target-projection",
      kind: "projection",
      name: "Recipe public Nx target projection",
    },
    {
      id: "recipe-repair-plan-projection",
      kind: "projection",
      name: "Recipe repair plan projection",
    },
    {
      id: "framework-materialization-plan",
      kind: "generator",
      name: "Framework-owned materialization plan",
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
