import { defineAttuneProjectFacts } from "@attune/framework-protocol"

export const ProjectRuntimeRoots = {
  reactivityKeys: [
    "tend-reporting.token-report.changed",
    "tend-reporting.markdown.changed",
  ],
  atoms: [
    "tendTokenReportAtom",
    "tendReportMarkdownAtom",
  ],
} as const

export const ProjectFacts = defineAttuneProjectFacts({
  id: "tend-reporting",
  kind: "agent-extension",
  symbols: [
    {
      id: "tend-token-report-renderer",
      kind: "projection",
      name: "Tend token report renderer",
    },
    {
      id: "tend-report-markdown",
      kind: "query",
      name: "Tend report markdown view",
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
