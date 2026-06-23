import { Layer, Schema } from "effect"
import {
  defineOperation,
  definePackageContract,
  definePackageViews,
  defineTypeGuidance,
  touches,
} from "@attune/framework-protocol"

import {
  CocoIndexClientFixture,
  type CocoIndexFixtureInput,
} from "./CocoIndexClientFixture.js"
import {
  CocoIndexFixtureLifecycle,
  JoernDslFixtureLifecycle,
  RepositoryIntelligence,
  RepositorySessionRequest,
  RepositoryToolStatus,
  makeNoopJoernDslClient,
} from "./RepositoryIntelligence.js"
import {
  AnchorCard,
  CocoIndexCommandEnvelope,
  CocoIndexCommandOperation,
  EnsureIndexedRequest,
  EnsureIndexedResult,
  GetAnchorRequest,
  RawCocoIndexHit,
  SearchAnchorsRequest,
  SearchSimilarAnchorsRequest,
} from "./model.js"
import {
  CocoIndexMcpSearchResult,
} from "./generated/cocoindex-code-mcp.js"
import { createAttuneGenerated } from "./attune.generated.js"

export { PackageContractSchema } from "@attune/framework-protocol"

export const PackageViews = definePackageViews({
  reactivityKeys: [
    "cocoindex.index-freshness.changed",
    "cocoindex.search-request.changed",
    "cocoindex.search-result.changed",
    "cocoindex.normalized-anchors.changed",
    "cocoindex.anchor-lookup.changed",
    "cocoindex.repository-tool-status.changed",
    "cocoindex.mcp-tool-registry.changed",
    "cocoindex.command-lifecycle.changed",
  ],
  atoms: [
    "indexStatusAtom",
    "searchRequestAtom",
    "searchResultAtom",
    "normalizedAnchorsAtom",
    "anchorLookupAtom",
    "repositoryToolStatusAtom",
    "mcpToolRegistryAtom",
    "commandLifecycleAtom",
  ],
} as const)

const ServiceIds = [
  "@attune/CocoIndexClient",
  "@attune/RepositoryIntelligence",
] as const

export const CocoIndexOperationError = Schema.Struct({
  tag: Schema.Literals([
    "CocoIndexCommandError",
    "CocoIndexDecodeError",
    "CocoIndexAnchorNotFound",
    "CocoIndexMcpProtocolError",
  ] as const),
  message: Schema.String,
  operation: Schema.optional(Schema.String),
  repoSnapshotId: Schema.optional(Schema.String),
  anchorId: Schema.optional(Schema.String),
})
export type CocoIndexOperationError = typeof CocoIndexOperationError.Type

export const AnchorCards = Schema.Array(AnchorCard)
export type AnchorCards = typeof AnchorCards.Type

export const NormalizeRawHitsInput = Schema.Struct({
  hits: Schema.Array(RawCocoIndexHit),
  request: SearchAnchorsRequest,
})
export type NormalizeRawHitsInput = typeof NormalizeRawHitsInput.Type

export const FixtureClientQueryInput = Schema.Struct({
  fixture: Schema.Struct({
    anchors: Schema.Array(AnchorCard),
    indexedAt: Schema.optional(Schema.String),
  }),
  request: SearchAnchorsRequest,
})
export type FixtureClientQueryInput = typeof FixtureClientQueryInput.Type

export const RepositoryIntelligenceQueryInput = Schema.Struct({
  session: RepositorySessionRequest,
  query: Schema.String,
  topK: Schema.optional(Schema.Number),
})
export type RepositoryIntelligenceQueryInput =
  typeof RepositoryIntelligenceQueryInput.Type

export const RepositoryIntelligenceQueryOutput = Schema.Struct({
  anchors: Schema.Array(AnchorCard),
  status: Schema.Array(RepositoryToolStatus),
})
export type RepositoryIntelligenceQueryOutput =
  typeof RepositoryIntelligenceQueryOutput.Type

export const RepositorySessionOutput = Schema.Struct({
  repoPath: Schema.String,
  repoSnapshotId: Schema.String,
  runId: Schema.String,
  status: Schema.Array(RepositoryToolStatus),
})
export type RepositorySessionOutput = typeof RepositorySessionOutput.Type

export const RepositoryToolStatusViewInput = Schema.Struct({
  session: RepositorySessionRequest,
  includeStopped: Schema.optional(Schema.Boolean),
})
export type RepositoryToolStatusViewInput =
  typeof RepositoryToolStatusViewInput.Type

export const RepositoryToolStatusViewOutput = Schema.Struct({
  status: Schema.Array(RepositoryToolStatus),
})
export type RepositoryToolStatusViewOutput =
  typeof RepositoryToolStatusViewOutput.Type

export const CocoIndexCommandLifecycleInput = Schema.Struct({
  config: Schema.Struct({
    executable: Schema.String,
    args: Schema.optional(Schema.Array(Schema.String)),
    cwd: Schema.optional(Schema.String),
    timeoutMs: Schema.optional(Schema.Number),
    envKeys: Schema.optional(Schema.Array(Schema.String)),
  }),
  envelope: CocoIndexCommandEnvelope,
})
export type CocoIndexCommandLifecycleInput =
  typeof CocoIndexCommandLifecycleInput.Type

export const CocoIndexCommandLifecycleOutput = Schema.Struct({
  operation: CocoIndexCommandOperation,
  decoded: Schema.Boolean,
  transport: Schema.Literal("subprocess-json"),
})
export type CocoIndexCommandLifecycleOutput =
  typeof CocoIndexCommandLifecycleOutput.Type

export const CocoIndexMcpLifecycleInput = Schema.Struct({
  repoPath: Schema.String,
  command: Schema.optional(Schema.String),
  args: Schema.optional(Schema.Array(Schema.String)),
  startupTimeoutMs: Schema.optional(Schema.Number),
})
export type CocoIndexMcpLifecycleInput = typeof CocoIndexMcpLifecycleInput.Type

export const CocoIndexMcpLifecycleOutput = Schema.Struct({
  status: RepositoryToolStatus,
  transport: Schema.Literal("mcp-stdio"),
})
export type CocoIndexMcpLifecycleOutput = typeof CocoIndexMcpLifecycleOutput.Type

export const McpToolRegistryGenerationInput = Schema.Struct({
  directory: Schema.String,
  registry: Schema.String,
  toolName: Schema.optional(Schema.Literal("search")),
})
export type McpToolRegistryGenerationInput =
  typeof McpToolRegistryGenerationInput.Type

export const McpSchemaGenerationInput = Schema.Struct({
  stage: Schema.Literals([
    "inspect-cocoindex-mcp",
    "emit-mcp-schema",
  ] as const),
  allowSnapshotFallback: Schema.optional(Schema.Boolean),
})
export type McpSchemaGenerationInput = typeof McpSchemaGenerationInput.Type

export const GeneratedCocoIndexArtifact = Schema.Struct({
  path: Schema.String,
  generator: Schema.String,
  generated: Schema.Boolean,
})
export type GeneratedCocoIndexArtifact =
  typeof GeneratedCocoIndexArtifact.Type

export const GeneratedCocoIndexArtifacts = Schema.Struct({
  files: Schema.Array(GeneratedCocoIndexArtifact),
  deterministic: Schema.Boolean,
})
export type GeneratedCocoIndexArtifacts =
  typeof GeneratedCocoIndexArtifacts.Type

export const McpToolRegistryOutput = Schema.Struct({
  tools: Schema.Array(Schema.Struct({
    name: Schema.String,
    inputSchema: Schema.String,
    resultSchema: Schema.String,
  })),
  generatedFiles: Schema.Array(Schema.String),
})
export type McpToolRegistryOutput = typeof McpToolRegistryOutput.Type

const queryLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "determinism.same-input-same-output",
  "side-effect.readonly",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

const commandLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "idempotence.same-observation-same-result",
  "side-effect.declared-boundary",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

const codecLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "determinism.same-input-same-output",
  "side-effect.readonly",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

const generatorLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "determinism.same-input-same-output",
  "side-effect.virtual-tree-only",
  "generator.options-decode",
  "generator.deterministic-output",
  "generator.provenance-recorded",
  "generator.no-untracked-output",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

export const ensureIndexedOperation = defineOperation({
  id: "ensure-indexed",
  name: "Ensure CocoIndex index freshness",
  kind: "command",
  input: EnsureIndexedRequest,
  output: EnsureIndexedResult,
  error: CocoIndexOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "cocoindex.index-freshness.changed",
      "cocoindex.repository-tool-status.changed",
    ],
    atoms: ["indexStatusAtom", "repositoryToolStatusAtom"],
  } as const),
  laws: commandLaws,
} as const)

export const searchAnchorsOperation = defineOperation({
  id: "search-anchors",
  name: "Search CocoIndex anchors",
  kind: "query",
  input: SearchAnchorsRequest,
  output: AnchorCards,
  error: CocoIndexOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "cocoindex.search-request.changed",
      "cocoindex.search-result.changed",
    ],
    atoms: ["searchRequestAtom", "searchResultAtom"],
  } as const),
  laws: queryLaws,
} as const)

export const searchSimilarAnchorsOperation = defineOperation({
  id: "search-similar-anchors",
  name: "Search similar CocoIndex anchors",
  kind: "query",
  input: SearchSimilarAnchorsRequest,
  output: AnchorCards,
  error: CocoIndexOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "cocoindex.search-request.changed",
      "cocoindex.search-result.changed",
      "cocoindex.anchor-lookup.changed",
    ],
    atoms: ["searchRequestAtom", "searchResultAtom", "anchorLookupAtom"],
  } as const),
  laws: queryLaws,
} as const)

export const getAnchorOperation = defineOperation({
  id: "get-anchor",
  name: "Get CocoIndex anchor",
  kind: "query",
  input: GetAnchorRequest,
  output: AnchorCard,
  error: CocoIndexOperationError,
  views: touches(PackageViews, {
    reactivityKeys: ["cocoindex.anchor-lookup.changed"],
    atoms: ["anchorLookupAtom"],
  } as const),
  laws: queryLaws,
} as const)

export const fixtureClientQueryOperation = defineOperation({
  id: "fixture-client-query",
  name: "Fixture CocoIndex client query",
  kind: "query",
  input: FixtureClientQueryInput,
  output: AnchorCards,
  error: CocoIndexOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "cocoindex.search-request.changed",
      "cocoindex.search-result.changed",
    ],
    atoms: ["searchRequestAtom", "searchResultAtom"],
  } as const),
  laws: queryLaws,
  metadata: {
    layer: "CocoIndexClientFixture",
    deterministic: true,
  } as const,
} as const)

export const normalizeRawHitsOperation = defineOperation({
  id: "normalize-raw-hits",
  name: "Normalize raw CocoIndex hits",
  kind: "codec",
  input: NormalizeRawHitsInput,
  output: AnchorCards,
  error: CocoIndexOperationError,
  views: touches(PackageViews, {
    reactivityKeys: ["cocoindex.normalized-anchors.changed"],
    atoms: ["normalizedAnchorsAtom"],
  } as const),
  laws: codecLaws,
  metadata: {
    codecs: [
      "normalizeCocoIndexHit",
      "normalizeCocoIndexHits",
      "score-clamping",
      "location-normalization",
      "vocabulary-tokenization",
    ],
  } as const,
} as const)

export const decodeMcpSearchResultOperation = defineOperation({
  id: "decode-mcp-search-result",
  name: "Decode CocoIndex MCP search result",
  kind: "codec",
  input: CocoIndexMcpSearchResult,
  output: CocoIndexMcpSearchResult,
  error: CocoIndexOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "cocoindex.mcp-tool-registry.changed",
      "cocoindex.search-result.changed",
    ],
    atoms: ["mcpToolRegistryAtom", "searchResultAtom"],
  } as const),
  laws: codecLaws,
  metadata: {
    schema: "CocoIndexMcpSearchResult",
    decodeFallbacks: ["structuredContent", "direct-result", "content-text-json"],
  } as const,
} as const)

export const repositorySessionOperation = defineOperation({
  id: "repository-session",
  name: "Repository intelligence session",
  kind: "command",
  input: RepositorySessionRequest,
  output: RepositorySessionOutput,
  error: CocoIndexOperationError,
  views: touches(PackageViews, {
    reactivityKeys: ["cocoindex.repository-tool-status.changed"],
    atoms: ["repositoryToolStatusAtom"],
  } as const),
  laws: commandLaws,
  metadata: {
    service: "@attune/RepositoryIntelligence",
    acquires: ["cocoindex", "joern"],
  } as const,
} as const)

export const repositoryIntelligenceQueryOperation = defineOperation({
  id: "repository-intelligence-query",
  name: "Repository intelligence query",
  kind: "query",
  input: RepositoryIntelligenceQueryInput,
  output: RepositoryIntelligenceQueryOutput,
  error: CocoIndexOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "cocoindex.search-request.changed",
      "cocoindex.search-result.changed",
      "cocoindex.repository-tool-status.changed",
    ],
    atoms: [
      "searchRequestAtom",
      "searchResultAtom",
      "repositoryToolStatusAtom",
    ],
  } as const),
  laws: queryLaws,
} as const)

export const repositoryToolStatusViewOperation = defineOperation({
  id: "repository-tool-status-view",
  name: "Repository tool status view",
  kind: "query",
  input: RepositoryToolStatusViewInput,
  output: RepositoryToolStatusViewOutput,
  error: CocoIndexOperationError,
  views: touches(PackageViews, {
    reactivityKeys: ["cocoindex.repository-tool-status.changed"],
    atoms: ["repositoryToolStatusAtom"],
  } as const),
  laws: queryLaws,
} as const)

export const commandLifecycleOperation = defineOperation({
  id: "command-lifecycle",
  name: "CocoIndex command lifecycle",
  kind: "command",
  input: CocoIndexCommandLifecycleInput,
  output: CocoIndexCommandLifecycleOutput,
  error: CocoIndexOperationError,
  views: touches(PackageViews, {
    reactivityKeys: ["cocoindex.command-lifecycle.changed"],
    atoms: ["commandLifecycleAtom"],
  } as const),
  laws: commandLaws,
  metadata: {
    boundary: "subprocess-json",
    implementation: "makeCocoIndexCommandClient",
  } as const,
} as const)

export const mcpLifecycleOperation = defineOperation({
  id: "mcp-lifecycle",
  name: "CocoIndex MCP lifecycle",
  kind: "command",
  input: CocoIndexMcpLifecycleInput,
  output: CocoIndexMcpLifecycleOutput,
  error: CocoIndexOperationError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "cocoindex.command-lifecycle.changed",
      "cocoindex.repository-tool-status.changed",
    ],
    atoms: ["commandLifecycleAtom", "repositoryToolStatusAtom"],
  } as const),
  laws: commandLaws,
  metadata: {
    boundary: "mcp-stdio",
    implementation: "CocoIndexMcpLifecycle",
  } as const,
} as const)

export const emitMcpSchemaOperation = defineOperation({
  id: "emit-mcp-schema",
  name: "Emit CocoIndex MCP schema",
  kind: "generator",
  input: McpSchemaGenerationInput,
  output: GeneratedCocoIndexArtifacts,
  error: CocoIndexOperationError,
  views: touches(PackageViews, {
    reactivityKeys: ["cocoindex.mcp-tool-registry.changed"],
    atoms: ["mcpToolRegistryAtom"],
  } as const),
  laws: generatorLaws,
  generator: {
    name: "scripts/generationStage.ts emit-mcp-schema",
    project: "cocoindex-effect",
    output: "src/generated/cocoindex-code-mcp.ts",
  } as const,
} as const)

export const syncMcpToolRegistryOperation = defineOperation({
  id: "sync-mcp-tool-registry",
  name: "Sync CocoIndex MCP tool registry",
  kind: "generator",
  input: McpToolRegistryGenerationInput,
  output: McpToolRegistryOutput,
  error: CocoIndexOperationError,
  views: touches(PackageViews, {
    reactivityKeys: ["cocoindex.mcp-tool-registry.changed"],
    atoms: ["mcpToolRegistryAtom"],
  } as const),
  laws: generatorLaws,
  generator: {
    name: "@attune/nx:sync-cocoindex-mcp-tools",
    project: "cocoindex-effect",
    output: "src/cocoindex/tools/ToolRegistry.generated.ts",
  } as const,
} as const)

export const PackageContract = definePackageContract({
  packageId: "cocoindex-effect",
  sourceRoot: "packages/cocoindex-effect/src",
  packageKind: "semantic-recall-service",
  views: PackageViews,
  services: ServiceIds,
  operations: [
    ensureIndexedOperation,
    searchAnchorsOperation,
    searchSimilarAnchorsOperation,
    getAnchorOperation,
    fixtureClientQueryOperation,
    normalizeRawHitsOperation,
    decodeMcpSearchResultOperation,
    repositorySessionOperation,
    repositoryIntelligenceQueryOperation,
    repositoryToolStatusViewOperation,
    commandLifecycleOperation,
    mcpLifecycleOperation,
    emitMcpSchemaOperation,
    syncMcpToolRegistryOperation,
  ] as const,
  provenance: {
    generator: "@attune/nx:package-contract",
    project: "cocoindex-effect",
    openspecChangeId: "standardize-effect-package-contracts",
  } as const,
  waivers: [
    {
      id: "cocoindex-effect/context-service-shape",
      category: "legacy-boundary",
      owner: "cocoindex-effect-migration-agent",
      reason:
        "CocoIndexClient and RepositoryIntelligence currently use Context.Service; canonical Effect.Service migration is tracked after the package contract lands.",
      review: "standardize-effect-package-contracts phase5",
    },
    {
      id: "cocoindex-effect/live-subprocess-and-mcp-boundary",
      category: "hidden-configuration",
      owner: "cocoindex-effect-migration-agent",
      reason:
        "Live command and MCP clients spawn subprocesses and still merge process.env; deterministic PackageTestLayer uses fixtures while Effect Config/service dependencies are introduced.",
      review: "standardize-effect-package-contracts task 10.5",
    },
    {
      id: "cocoindex-effect/generated-mcp-schema-snapshot",
      category: "legacy-boundary",
      owner: "cocoindex-effect-migration-agent",
      reason:
        "Checked-in MCP schema snapshot remains until MCP schema generation moves behind typed Nx executor/versioned toolchain evidence.",
      review: "standardize-effect-package-contracts task 10.5",
    },
  ] as const,
} as const)
export type PackageContract = typeof PackageContract

export const PackageLayer = {
  layer: Layer.empty,
  provides: ServiceIds,
  requires: [
    "cocoindex.command-config",
    "cocoindex.mcp-config",
    "repository.joern-lifecycle",
  ] as const,
  metadata: {
    packageId: "cocoindex-effect",
    role: "semantic-recall-live-boundary",
  },
} as const
export type PackageLayer = typeof PackageLayer

const packageTestFixture: CocoIndexFixtureInput = {
  anchors: [
    {
      anchorId: "fixture-anchor-cocoindex-contract",
      runId: "run-fixture",
      title: "CocoIndex contract fixture",
      vocabulary: ["typescript", "cocoindex", "fixture", "contract"],
      score: 0.99,
      excerpt: "Fixture boundary for generated package audits.",
      locations: [
        {
          path: "packages/cocoindex-effect/src/attune.package.ts",
          startLine: 1,
          endLine: 1,
        },
      ],
    },
  ],
  indexedAt: "2026-01-01T00:00:00.000Z",
}

export const PackageTestLayer = {
  layer: Layer.mergeAll(
    CocoIndexClientFixture(packageTestFixture),
    RepositoryIntelligence.fromConfig({
      cocoindex: CocoIndexFixtureLifecycle(packageTestFixture),
      joern: JoernDslFixtureLifecycle(makeNoopJoernDslClient()),
    }),
  ),
  provides: ServiceIds,
  requires: [] as const,
  metadata: {
    packageId: "cocoindex-effect",
    role: "semantic-recall-fixture-boundary",
    fixtureAnchorCount: packageTestFixture.anchors.length,
  },
} as const
export type PackageTestLayer = typeof PackageTestLayer

const emptyAnchors = [] as readonly typeof AnchorCard.Type[]

const PackageGenerated = createAttuneGenerated({
  PackageContract,
  codecLaws,
  commandLaws,
  commandLifecycleOperation,
  decodeMcpSearchResultOperation,
  emitMcpSchemaOperation,
  emptyAnchors,
  ensureIndexedOperation,
  fixtureClientQueryOperation,
  generatorLaws,
  getAnchorOperation,
  mcpLifecycleOperation,
  normalizeRawHitsOperation,
  packageTestFixture,
  queryLaws,
  repositoryIntelligenceQueryOperation,
  repositorySessionOperation,
  repositoryToolStatusViewOperation,
  searchAnchorsOperation,
  searchSimilarAnchorsOperation,
  syncMcpToolRegistryOperation,
} as const)
export const PackageFuzzHandlers = PackageGenerated.PackageFuzzHandlers
export const PackageProperties = PackageGenerated.PackageProperties
export const PackageTypeGuidance = PackageGenerated.PackageTypeGuidance
export type PackageFuzzHandlers = typeof PackageFuzzHandlers
export type PackageProperties = typeof PackageProperties
export type PackageTypeGuidance = typeof PackageTypeGuidance
