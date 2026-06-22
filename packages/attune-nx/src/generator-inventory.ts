export type GeneratorMigrationCapability =
  | "effect-service"
  | "package-contract"
  | "atom-view"
  | "compile-only-assertion"
  | "type-guidance"
  | "operation-registry"
  | "property-evidence-plan"
  | "worker-property-module"
  | "no-checked-in-report-policy"
  | "source-bom-provenance"
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
    | "package-contract"
    | "atom-view"
    | "compile-only-assertion"
    | "type-guidance"
    | "operation-registry"
    | "property-evidence-plan"
    | "worker-property-module"
    | "no-checked-in-report-policy"
  >
  readonly currentHome: `@attune/nx:${string}` | null
  readonly targetHome: `@attune/nx:${string}`
  readonly owner: string
  readonly requiredOutput: readonly string[]
}

export const requiredPhase2GeneratorCapabilities = [
  "effect-service",
  "package-contract",
  "atom-view",
  "compile-only-assertion",
  "type-guidance",
  "operation-registry",
  "property-evidence-plan",
  "worker-property-module",
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
      "operation schema slots",
      "operation-kind metadata",
      "PackageLayer and PackageTestLayer registration",
      "Source BOM provenance for generated service files",
    ],
  },
  {
    capability: "package-contract",
    currentHome: "@attune/nx:package-contract",
    targetHome: "@attune/nx:package-contract",
    owner: "package-contract-generator-agent",
    requiredOutput: [
      "src/attune.package.ts",
      "Effect Schema-backed PackageContract",
      "package operation builders",
      "generated package contract provenance",
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
      "package view atom graph registration",
    ],
  },
  {
    capability: "compile-only-assertion",
    currentHome: "@attune/nx:package-contract",
    targetHome: "@attune/nx:package-contract",
    owner: "package-contract-generator-agent",
    requiredOutput: [
      "src/attune.package.typecheck.ts",
      "AssertPackageContract usage",
      "AssertExactHandlers usage",
      "AssertLayerSatisfiesRequiredServices usage",
    ],
  },
  {
    capability: "type-guidance",
    currentHome: "@attune/nx:package-contract",
    targetHome: "@attune/nx:package-contract",
    owner: "type-guidance-agent",
    requiredOutput: [
      "PackageTypeGuidance artifact",
      "Schema-backed type partition metadata",
      "AssertTypeGuidanceComplete usage",
      "property evidence partition names",
    ],
  },
  {
    capability: "operation-registry",
    currentHome: "@attune/nx:package-contract",
    targetHome: "@attune/nx:package-contract",
    owner: "attune-nx-framework-generator-integration-agent",
    requiredOutput: [
      "attune.package.generated.ts",
      "PackageOperationRegistry",
      "PackageFuzzHandlers",
      "PackageProperties",
    ],
  },
  {
    capability: "property-evidence-plan",
    currentHome: "@attune/nx:package-contract",
    targetHome: "@attune/nx:package-contract",
    owner: "attune-nx-framework-generator-integration-agent",
    requiredOutput: [
      "PackagePropertyEvidencePlan",
      "gitignored evidence root",
      "no checked-in protocol reports flag",
    ],
  },
  {
    capability: "worker-property-module",
    currentHome: "@attune/nx:package-contract",
    targetHome: "@attune/nx:package-contract",
    owner: "attune-nx-framework-generator-integration-agent",
    requiredOutput: [
      "attune.package.property.ts",
      "propertyFor(new URL(import.meta.url))",
      "worker isolation/random-source metadata",
    ],
  },
  {
    capability: "no-checked-in-report-policy",
    currentHome: "@attune/nx:package-contract",
    targetHome: "@attune/nx:package-contract",
    owner: "attune-nx-framework-generator-integration-agent",
    requiredOutput: [
      "PackageProtocolReportPolicy",
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
      "package-contract": "missing",
      "source-bom-provenance": "missing",
    },
    phase2Owner: ["atom-view-generator-agent", "package-contract-generator-agent"],
  },
  {
    id: "effect-service",
    publicName: "@attune/nx:effect-service",
    kind: "scaffold",
    implementation: "src/generators/effect-service/generator.ts",
    schema: "src/generators/effect-service/schema.json",
    currentOutput: [
      "canonical Effect.Service service boundary",
      "operation schema slots and operation metadata",
      "PackageLayer and PackageTestLayer exports",
      "barrel export",
      "Source BOM provenance",
    ],
    migrationCapabilities: {
      "effect-service": "present",
      "package-contract": "needs-extension",
      "compile-only-assertion": "missing",
      "type-guidance": "missing",
      "source-bom-provenance": "present",
    },
    phase2Owner: ["effect-service-generator-agent"],
  },
  {
    id: "package-contract",
    publicName: "@attune/nx:package-contract",
    kind: "scaffold",
    implementation: "src/generators/package-contract/generator.ts",
    schema: "src/generators/package-contract/schema.json",
    currentOutput: [
      "src/attune.package.ts",
      "src/attune.package.generated.ts",
      "src/attune.package.property.ts",
      "src/attune.package.typecheck.ts",
      "Effect Schema-backed PackageContract",
      "PackageOperationRegistry",
      "PackagePropertyEvidencePlan",
      "worker-compatible property module",
      "PackageTypeGuidance artifact",
      "no checked-in protocol report policy",
      "Source BOM provenance",
    ],
    migrationCapabilities: {
      "package-contract": "present",
      "compile-only-assertion": "present",
      "type-guidance": "present",
      "operation-registry": "present",
      "property-evidence-plan": "present",
      "worker-property-module": "present",
      "no-checked-in-report-policy": "present",
      "source-bom-provenance": "present",
      "atom-view": "needs-extension",
    },
    phase2Owner: [
      "package-contract-generator-agent",
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
      "package view atom shell",
      "package atom graph registration",
      "Source BOM provenance",
    ],
    migrationCapabilities: {
      "atom-view": "present",
      "source-bom-provenance": "present",
      "package-contract": "needs-extension",
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
      "package-contract": "missing",
      "type-guidance": "missing",
      "source-bom-provenance": "missing",
    },
    phase2Owner: ["package-contract-generator-agent"],
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
      "package-contract": "missing",
      "type-guidance": "missing",
      "source-bom-provenance": "missing",
    },
    phase2Owner: ["package-contract-generator-agent"],
  },
  {
    id: "k8s-resource",
    publicName: "@attune/nx:k8s-resource",
    kind: "scaffold",
    implementation: "src/generators/k8s-resource/generator.ts",
    schema: "src/generators/k8s-resource/schema.json",
    currentOutput: ["Effect Alchemy Kubernetes resource shell"],
    migrationCapabilities: {
      "package-contract": "missing",
      "atom-view": "missing",
      "source-bom-provenance": "missing",
    },
    phase2Owner: ["package-contract-generator-agent", "atom-view-generator-agent"],
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
