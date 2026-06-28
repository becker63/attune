import { defineAttuneProjectFacts } from "@attune/framework-protocol"

export const ProjectRuntimeRoots = {
  reactivityKeys: [
    "framework-language-service.diagnostics.changed",
    "framework-language-service.recipe-health.changed",
    "framework-language-service.typescript-projection.changed",
  ],
  atoms: [
    "languageServiceDiagnosticsAtom",
    "recipeHealthCodeLensAtom",
    "typescriptProjectionAtom",
  ],
} as const

export const ProjectFacts = defineAttuneProjectFacts({
  id: "framework-language-service",
  kind: "architecture-policy",
  symbols: [
    {
      id: "program-diagnostic-view",
      kind: "projection",
      name: "Program diagnostic editor view",
    },
    {
      id: "recipe-health-code-lens",
      kind: "projection",
      name: "Recipe health code lens projection",
    },
    {
      id: "typescript-language-service-shape",
      kind: "query",
      name: "TypeScript language-service shape",
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
