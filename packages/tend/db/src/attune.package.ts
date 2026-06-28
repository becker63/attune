import { defineAttuneProjectFacts } from "@attune/framework-protocol"

export const ProjectRuntimeRoots = {
  reactivityKeys: [
    "tend-db.control-spine.changed",
    "tend-db.sql-validation.changed",
  ],
  atoms: [
    "tendControlSpineAtom",
    "tendSqlValidationAtom",
  ],
} as const

export const ProjectFacts = defineAttuneProjectFacts({
  id: "tend-db",
  kind: "agent-extension",
  symbols: [
    {
      id: "tend-control-spine-recipe",
      kind: "resource-provider",
      name: "Tend TimescaleDB/Postgres control spine",
    },
    {
      id: "tend-sql-validation-route",
      kind: "query",
      name: "Tend SQL validation route",
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
