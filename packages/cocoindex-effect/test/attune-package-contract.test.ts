import { Schema } from "effect"
import { describe, expect, expectTypeOf, it } from "vitest"

import {
  PackageContractSchema,
  assertExactHandlers,
  assertLayerProvidesPackageServices,
  assertLayerSatisfiesRequiredServices,
  assertPackageContract,
  assertPropertyHarnesses,
  assertTypeGuidanceComplete,
  inferLawIds,
  packagePartitionIds,
  type OperationIds,
} from "@attune/framework-protocol"
import {
  PackageContract,
  PackageFuzzHandlers,
  PackageLayer,
  PackageProperties,
  PackageTestLayer,
  PackageTypeGuidance,
  PackageViews,
  commandLifecycleOperation,
  normalizeRawHitsOperation,
  searchAnchorsOperation,
  syncMcpToolRegistryOperation,
} from "../src/attune.package.js"

const requiredOperationIds = [
  "ensure-indexed",
  "search-anchors",
  "search-similar-anchors",
  "get-anchor",
  "fixture-client-query",
  "normalize-raw-hits",
  "decode-mcp-search-result",
  "repository-session",
  "repository-intelligence-query",
  "repository-tool-status-view",
  "command-lifecycle",
  "mcp-lifecycle",
  "emit-mcp-schema",
  "sync-mcp-tool-registry",
] as const

type CocoIndexOperationId = OperationIds<typeof PackageContract>

describe("cocoindex-effect package contract", () => {
  it("declares the semantic recall package boundary and operation ids", () => {
    expect(PackageContract.packageId).toBe("cocoindex-effect")
    expect(PackageContract.packageKind).toBe("semantic-recall-service")
    expect(PackageContract.sourceRoot).toBe("packages/cocoindex-effect/src")
    expect(PackageContract.services).toEqual([
      "@attune/CocoIndexClient",
      "@attune/RepositoryIntelligence",
    ])
    expect(PackageContract.operations.map((operation) => operation.id)).toEqual([
      ...requiredOperationIds,
    ])

    expectTypeOf<CocoIndexOperationId>().toEqualTypeOf<
      (typeof requiredOperationIds)[number]
    >()

    const decoded = Schema.decodeUnknownSync(PackageContractSchema)(PackageContract)
    expect(decoded.packageId).toBe("cocoindex-effect")
    expect(decoded.operations).toHaveLength(requiredOperationIds.length)
  })

  it("records package-level Reactivity keys and atoms for recall views", () => {
    expect(PackageViews.reactivityKeys).toEqual(expect.arrayContaining([
      "cocoindex.index-freshness.changed",
      "cocoindex.search-result.changed",
      "cocoindex.normalized-anchors.changed",
      "cocoindex.anchor-lookup.changed",
      "cocoindex.mcp-tool-registry.changed",
      "cocoindex.command-lifecycle.changed",
    ]))
    expect(PackageViews.atoms).toEqual(expect.arrayContaining([
      "indexStatusAtom",
      "searchRequestAtom",
      "searchResultAtom",
      "normalizedAnchorsAtom",
      "anchorLookupAtom",
      "repositoryToolStatusAtom",
      "mcpToolRegistryAtom",
      "commandLifecycleAtom",
    ]))
    expect(normalizeRawHitsOperation.views?.atoms).toContain(
      "normalizedAnchorsAtom",
    )
    expect(syncMcpToolRegistryOperation.views?.reactivityKeys).toContain(
      "cocoindex.mcp-tool-registry.changed",
    )
  })

  it("keeps exact handler/property maps and compile-time helpers aligned", () => {
    expect(Object.keys(PackageFuzzHandlers)).toEqual([...requiredOperationIds])
    expect(Object.keys(PackageProperties)).toEqual([...requiredOperationIds])
    expect(assertPackageContract(PackageContract)).toBe(true)
    expect(assertExactHandlers(PackageContract, PackageFuzzHandlers)).toBe(true)
    expect(assertPropertyHarnesses(PackageContract, PackageProperties)).toBe(true)
    expect(assertLayerProvidesPackageServices(PackageContract, PackageLayer)).toBe(true)
    expect(assertLayerSatisfiesRequiredServices(PackageContract, PackageTestLayer)).toBe(true)
    expect(assertTypeGuidanceComplete(PackageContract, PackageTypeGuidance)).toBe(true)
  })

  it("separates live subprocess/MCP debt from deterministic fixture layers", () => {
    expect(PackageLayer).toMatchObject({
      provides: [
        "@attune/CocoIndexClient",
        "@attune/RepositoryIntelligence",
      ],
      requires: [
        "cocoindex.command-config",
        "cocoindex.mcp-config",
        "repository.joern-lifecycle",
      ],
    })
    expect(PackageTestLayer.metadata).toMatchObject({
      role: "semantic-recall-fixture-boundary",
      fixtureAnchorCount: 1,
    })
    expect(PackageContract.waivers?.map((waiver) => waiver.id)).toEqual(
      expect.arrayContaining([
        "cocoindex-effect/context-service-shape",
        "cocoindex-effect/live-subprocess-and-mcp-boundary",
        "cocoindex-effect/generated-mcp-schema-snapshot",
      ]),
    )
    expect(commandLifecycleOperation.metadata).toMatchObject({
      boundary: "subprocess-json",
    })
  })

  it("records inferred laws and type-guidance partitions for generated audits", () => {
    expect(
      inferLawIds({
        id: searchAnchorsOperation.id,
        kind: searchAnchorsOperation.kind,
        schemas: {
          input: searchAnchorsOperation.input,
          output: searchAnchorsOperation.output,
          error: searchAnchorsOperation.error,
        },
        views: {
          reactivityKeys: searchAnchorsOperation.views?.reactivityKeys,
          atoms: searchAnchorsOperation.views?.atoms,
        },
      }),
    ).toEqual(searchAnchorsOperation.laws)

    const partitions = packagePartitionIds(PackageTypeGuidance)
    expect(partitions["normalize-raw-hits"]).toEqual(expect.arrayContaining([
      "normalize-raw-hits.raw-hit-variants",
      "normalize-raw-hits.normalized-anchor-cards",
      "cocoindex.normalized-anchors.changed.moves",
      "normalizedAnchorsAtom.moves",
    ]))
    expect(
      PackageTypeGuidance.operations["normalize-raw-hits"].transforms,
    ).toEqual([
      expect.objectContaining({
        id: "normalize-raw-hits.score-location-vocabulary",
        kind: "coverage-bias",
      }),
    ])
    expect(
      PackageTypeGuidance.operations["get-anchor"].filters,
    ).toEqual([
      expect.objectContaining({
        id: "get-anchor.fixture-anchor-or-missing",
        kind: "operation-precondition",
      }),
    ])
  })
})
