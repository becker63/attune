export type GeneratorMigrationCapability =
  | "effect-service"
  | "project-facts"
  | "atom-view"
  | "symbol-registry"
  | "observation-plan"
  | "worker-observation-module"
  | "no-checked-in-report-policy"
  | "artifact-provenance"
  | "sync-registry"

export type GeneratorMigrationStatus =
  | "present"
  | "needs-extension"
  | "missing"

export interface GeneratorInventoryEntry {
  readonly id: string
  readonly publicName: `@attune/nx:${string}`
  readonly kind: "scaffold" | "sync"
  readonly implementation: `src/generators/${string}/generator.ts`
  readonly schema: `src/generators/${string}/schema.json`
  readonly currentOutput: readonly string[]
  readonly migrationCapabilities: Partial<
    Record<GeneratorMigrationCapability, GeneratorMigrationStatus>
  >
  readonly phase2Owner: readonly string[]
}

export interface Phase2GeneratorGap {
  readonly capability: Extract<
    GeneratorMigrationCapability,
    | "effect-service"
    | "project-facts"
    | "atom-view"
    | "symbol-registry"
    | "observation-plan"
    | "worker-observation-module"
    | "no-checked-in-report-policy"
  >
  readonly currentHome: `@attune/nx:${string}` | null
  readonly targetHome: `@attune/nx:${string}`
  readonly owner: string
  readonly requiredOutput: readonly string[]
}

export const requiredPhase2GeneratorCapabilities = [
  "effect-service",
  "project-facts",
  "atom-view",
  "symbol-registry",
  "observation-plan",
  "worker-observation-module",
  "no-checked-in-report-policy",
] as const satisfies readonly Phase2GeneratorGap["capability"][]

export const phase2GeneratorGapMap = [
  {
    capability: "effect-service",
    currentHome: "@attune/nx:effect-service",
    targetHome: "@attune/nx:effect-service",
    owner: "effect-service-generator-agent",
    requiredOutput: [
      "canonical Effect.Service class with accessors",
      "symbol schema slots",
      "symbol-kind metadata",
      "service layer registration",
      "artifact provenance for generated service files",
    ],
  },
  {
    capability: "project-facts",
    currentHome: "@attune/nx:project-facts",
    targetHome: "@attune/nx:project-facts",
    owner: "project-facts-generator-agent",
    requiredOutput: [
      "src/attune.package.ts",
      "Effect Schema-backed ProjectFacts",
      "program symbol scaffold",
      "generated artifact provenance",
    ],
  },
  {
    capability: "atom-view",
    currentHome: "@attune/nx:atom-view",
    targetHome: "@attune/nx:atom-view",
    owner: "atom-view-generator-agent",
    requiredOutput: [
      "Reactivity key declarations",
      "base atom shells",
      "derived atom shells",
      "runtime edge registration",
    ],
  },
  {
    capability: "symbol-registry",
    currentHome: "@attune/nx:project-facts",
    targetHome: "@attune/nx:project-facts",
    owner: "project-facts-generator-agent",
    requiredOutput: [
      "attune.project-facts.generated.ts",
      "ProgramSymbolRegistry",
      "schema descriptor references",
    ],
  },
  {
    capability: "observation-plan",
    currentHome: "@attune/nx:project-facts",
    targetHome: "@attune/nx:project-facts",
    owner: "program-observation-agent",
    requiredOutput: [
      "ProgramObservationPlan",
      "diagnostic rule ids",
      "gitignored observation root",
    ],
  },
  {
    capability: "worker-observation-module",
    currentHome: "@attune/nx:project-facts",
    targetHome: "@attune/nx:project-facts",
    owner: "attune-nx-framework-generator-integration-agent",
    requiredOutput: [
      "attune.project-observations.ts",
      "propertyFor(new URL(import.meta.url))",
      "worker isolation/random-source metadata",
    ],
  },
  {
    capability: "no-checked-in-report-policy",
    currentHome: "@attune/nx:project-facts",
    targetHome: "@attune/nx:project-facts",
    owner: "attune-nx-framework-generator-integration-agent",
    requiredOutput: [
      "ProgramReportPolicy",
      "allowed ephemeral cache roots",
      "forbidden checked-in reports",
    ],
  },
] as const satisfies readonly Phase2GeneratorGap[]

export const attuneNxGeneratorInventory = [
  {
    id: "discovery-event",
    publicName: "@attune/nx:discovery-event",
    kind: "scaffold",
    implementation: "src/generators/discovery-event/generator.ts",
    schema: "src/generators/discovery-event/schema.json",
    currentOutput: [
      "Effect Schema event",
      "DiscoveryEvents append facade helper",
      "projection handler skeleton",
      "durable Reactivity ViewKey",
      "event barrel export",
    ],
    migrationCapabilities: {
      "atom-view": "needs-extension",
      "project-facts": "missing",
      "artifact-provenance": "missing",
    },
    phase2Owner: ["atom-view-generator-agent", "project-facts-generator-agent"],
  },
  {
    id: "effect-service",
    publicName: "@attune/nx:effect-service",
    kind: "scaffold",
    implementation: "src/generators/effect-service/generator.ts",
    schema: "src/generators/effect-service/schema.json",
    currentOutput: [
      "canonical Effect.Service service boundary",
      "symbol schema slots and symbol metadata",
      "ProjectLayer and ProjectTestLayer exports",
      "barrel export",
      "artifact provenance",
    ],
    migrationCapabilities: {
      "effect-service": "present",
      "project-facts": "needs-extension",
      "symbol-registry": "missing",
      "observation-plan": "missing",
      "artifact-provenance": "present",
    },
    phase2Owner: ["effect-service-generator-agent"],
  },
  {
    id: "project-facts",
    publicName: "@attune/nx:project-facts",
    kind: "scaffold",
    implementation: "src/generators/project-facts/generator.ts",
    schema: "src/generators/project-facts/schema.json",
    currentOutput: [
      "src/attune.package.ts",
      "src/attune.project-facts.generated.ts",
      "src/attune.project-observations.ts",
      "Effect Schema-backed ProjectFacts",
      "ProgramSymbolRegistry",
      "ProgramObservationPlan",
      "worker-compatible observation module",
      "no checked-in report policy",
      "artifact provenance",
    ],
    migrationCapabilities: {
      "project-facts": "present",
      "symbol-registry": "present",
      "observation-plan": "present",
      "worker-observation-module": "present",
      "no-checked-in-report-policy": "present",
      "artifact-provenance": "present",
      "atom-view": "needs-extension",
    },
    phase2Owner: [
      "project-facts-generator-agent",
      "attune-nx-framework-generator-integration-agent",
    ],
  },
  {
    id: "atom-view",
    publicName: "@attune/nx:atom-view",
    kind: "scaffold",
    implementation: "src/generators/atom-view/generator.ts",
    schema: "src/generators/atom-view/schema.json",
    currentOutput: [
      "Reactivity key declarations",
      "base atom shell",
      "derived atom shell",
      "project atom shell",
      "runtime edge registration",
      "artifact provenance",
    ],
    migrationCapabilities: {
      "atom-view": "present",
      "artifact-provenance": "present",
      "project-facts": "needs-extension",
    },
    phase2Owner: ["atom-view-generator-agent"],
  },
  {
    id: "joern-template",
    publicName: "@attune/nx:joern-template",
    kind: "scaffold",
    implementation: "src/generators/joern-template/generator.ts",
    schema: "src/generators/joern-template/schema.json",
    currentOutput: [
      "typed Joern binding schema",
      "typed evidence schema",
      "known proof-template renderer",
    ],
    migrationCapabilities: {
      "project-facts": "missing",
      "observation-plan": "missing",
      "artifact-provenance": "missing",
    },
    phase2Owner: ["project-facts-generator-agent"],
  },
  {
    id: "cocoindex-mcp-tool",
    publicName: "@attune/nx:cocoindex-mcp-tool",
    kind: "scaffold",
    implementation: "src/generators/cocoindex-mcp-tool/generator.ts",
    schema: "src/generators/cocoindex-mcp-tool/schema.json",
    currentOutput: [
      "Effect Schema input",
      "Effect Schema result",
      "CocoIndex MCP tool shell",
    ],
    migrationCapabilities: {
      "project-facts": "missing",
      "observation-plan": "missing",
      "artifact-provenance": "missing",
    },
    phase2Owner: ["project-facts-generator-agent"],
  },
  {
    id: "k8s-resource",
    publicName: "@attune/nx:k8s-resource",
    kind: "scaffold",
    implementation: "src/generators/k8s-resource/generator.ts",
    schema: "src/generators/k8s-resource/schema.json",
    currentOutput: ["Effect Alchemy Kubernetes resource shell"],
    migrationCapabilities: {
      "project-facts": "missing",
      "atom-view": "missing",
      "artifact-provenance": "missing",
    },
    phase2Owner: ["project-facts-generator-agent", "atom-view-generator-agent"],
  },
  {
    id: "sync-effect-layers",
    publicName: "@attune/nx:sync-effect-layers",
    kind: "sync",
    implementation: "src/generators/sync-effect-layers/generator.ts",
    schema: "src/generators/sync-effect-layers/schema.json",
    currentOutput: ["generated live layer composition"],
    migrationCapabilities: {
      "effect-service": "needs-extension",
      "sync-registry": "present",
    },
    phase2Owner: ["effect-service-generator-agent"],
  },
  {
    id: "sync-joern-templates",
    publicName: "@attune/nx:sync-joern-templates",
    kind: "sync",
    implementation: "src/generators/sync-joern-templates/generator.ts",
    schema: "src/generators/sync-joern-templates/schema.json",
    currentOutput: ["generated Joern template registry and barrel export"],
    migrationCapabilities: {
      "sync-registry": "present",
    },
    phase2Owner: ["generator-snapshot-agent"],
  },
  {
    id: "sync-cocoindex-mcp-tools",
    publicName: "@attune/nx:sync-cocoindex-mcp-tools",
    kind: "sync",
    implementation: "src/generators/sync-cocoindex-mcp-tools/generator.ts",
    schema: "src/generators/sync-cocoindex-mcp-tools/schema.json",
    currentOutput: ["generated CocoIndex MCP tool registry and barrel export"],
    migrationCapabilities: {
      "sync-registry": "present",
    },
    phase2Owner: ["generator-snapshot-agent"],
  },
  {
    id: "sync-k8s-resources",
    publicName: "@attune/nx:sync-k8s-resources",
    kind: "sync",
    implementation: "src/generators/sync-k8s-resources/generator.ts",
    schema: "src/generators/sync-k8s-resources/schema.json",
    currentOutput: ["generated Kubernetes resource registry and barrel export"],
    migrationCapabilities: {
      "sync-registry": "present",
      "atom-view": "needs-extension",
    },
    phase2Owner: ["atom-view-generator-agent", "generator-snapshot-agent"],
  },
] as const satisfies readonly GeneratorInventoryEntry[]
