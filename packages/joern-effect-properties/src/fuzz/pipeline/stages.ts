import type { FuzzStageDefinition } from "./stage.js"

export const fuzzPipelineStages: readonly FuzzStageDefinition[] = [
  {
    description: "Load curated and promoted project templates.",
    id: "load-corpus",
    title: "Load corpus",
  },
  {
    description: "Use FastCheck to plan project-level mutation cases.",
    id: "plan-cases",
    title: "Plan cases",
  },
  {
    description: "Apply ts-morph mutation templates to project templates.",
    id: "apply-mutations",
    title: "Apply mutations",
  },
  {
    description: "Parse and admit generated projects before Joern sees them.",
    id: "admit-projects",
    title: "Admit projects",
  },
  {
    description: "Allocate an isolated memory-backed workspace.",
    id: "allocate-workspace",
    title: "Allocate workspace",
  },
  {
    description: "Import admitted projects into Joern CPGs.",
    id: "import-cpg",
    title: "Import CPG",
  },
  {
    description: "Select DSL query templates with optional Axiom feedback.",
    id: "plan-queries",
    title: "Plan queries",
  },
  {
    description: "Compile and execute generated Joern DSL programs.",
    id: "execute-queries",
    title: "Execute queries",
  },
  {
    description: "Collect row, graphology, findings, and protocol evidence.",
    id: "collect-evidence",
    title: "Collect evidence",
  },
  {
    description: "Emit structured property events and OTLP/Axiom telemetry.",
    id: "emit-telemetry",
    title: "Emit telemetry",
  },
]
