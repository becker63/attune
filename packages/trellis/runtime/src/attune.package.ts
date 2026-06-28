import { defineAttuneProjectFacts } from "@attune/framework-protocol"

export const ProjectRuntimeRoots = {
  reactivityKeys: [
    "framework-runtime.recipe-kernel.changed",
    "framework-runtime.receipts.changed",
    "framework-runtime.local-timescaledb.changed",
    "framework-runtime.sql-route.changed",
  ],
  atoms: [
    "recipeKernelAtom",
    "recipeReceiptStoreAtom",
    "localTimescaleManagedRecipeAtom",
    "sqlRouteAtom",
  ],
} as const

export const ProjectFacts = defineAttuneProjectFacts({
  id: "framework-runtime",
  kind: "core-discovery-runtime",
  symbols: [
    {
      id: "recipe-kernel-runtime",
      kind: "resource-provider",
      name: "Recipe planner, runner, health, repair, and receipt kernel",
    },
    {
      id: "recipe-receipt-store",
      kind: "projection",
      name: "Recipe receipt store",
    },
    {
      id: "local-timescale-managed-recipe",
      kind: "resource-provider",
      name: "Local TimescaleDB/Postgres ManagedRecipe",
    },
    {
      id: "sql-route-generation",
      kind: "generator",
      name: "SQL/Kanel/Kysely/SafeQL route generation",
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
