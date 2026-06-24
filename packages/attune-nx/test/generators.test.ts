import { describe, expect, it } from "vitest"

import discoveryEventGenerator from "../src/generators/discovery-event/generator.js"
import effectServiceGenerator from "../src/generators/effect-service/generator.js"
import {
  attuneNxGeneratorInventory,
  phase2GeneratorGapMap,
  requiredPhase2GeneratorCapabilities,
} from "../src/generator-inventory.js"
import {
  sourceBomCacheShardPath,
  sourceBomFrameworkShardPath,
  upsertSourceBom,
} from "../src/internal/source-bom.js"
import type { GeneratorTree } from "../src/internal/tree.js"

interface GeneratorsJson {
  readonly generators: Record<
    string,
    {
      readonly factory: string
      readonly schema: string
      readonly description: string
    }
  >
}

class MemoryTree implements GeneratorTree {
  readonly files = new Map<string, string>()

  exists(path: string): boolean {
    return (
      this.files.has(path) ||
      [...this.files.keys()].some((file) => file.startsWith(`${path}/`))
    )
  }

  read(path: string): string | null {
    return this.files.get(path) ?? null
  }

  write(path: string, content: string): void {
    this.files.set(path, content)
  }

  children(path: string): string[] {
    const prefix = `${path}/`
    return [...this.files.keys()]
      .filter((file) => file.startsWith(prefix))
      .map((file) => file.slice(prefix.length))
      .filter((file) => !file.includes("/"))
  }
}

describe("attune-nx generators", () => {
  it("keeps the Phase 0 generator inventory aligned with registered generators", async () => {
    const generatorsJson = JSON.parse(
      await import("node:fs/promises").then(({ readFile }) =>
        readFile(new URL("../generators.json", import.meta.url), "utf8"),
      ),
    ) as GeneratorsJson
    const registered = Object.keys(generatorsJson.generators).sort()
    const inventoried = attuneNxGeneratorInventory
      .map((entry) => entry.id)
      .sort()

    expect(inventoried).toEqual(registered)

    for (const entry of attuneNxGeneratorInventory) {
      const registration = generatorsJson.generators[entry.id]
      expect(registration?.schema).toEqual(`./${entry.schema}`)
      expect(registration?.description).toBeTruthy()
      await expect(
        import("node:fs/promises").then(({ access }) =>
          access(new URL(`../${entry.implementation}`, import.meta.url)),
        ),
      ).resolves.toBeUndefined()
      await expect(
        import("node:fs/promises").then(({ access }) =>
          access(new URL(`../${entry.schema}`, import.meta.url)),
        ),
      ).resolves.toBeUndefined()
    }
  })

  it("records the Phase 2 generator gaps for package-contract migration", () => {
    expect(phase2GeneratorGapMap.map((entry) => entry.capability)).toEqual(
      requiredPhase2GeneratorCapabilities,
    )
    expect(phase2GeneratorGapMap).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          capability: "effect-service",
          currentHome: "@attune/nx:effect-service",
          targetHome: "@attune/nx:effect-service",
          owner: "effect-service-generator-agent",
        }),
        expect.objectContaining({
          capability: "package-contract",
          currentHome: "@attune/nx:package-contract",
          targetHome: "@attune/nx:package-contract",
          owner: "package-contract-generator-agent",
        }),
        expect.objectContaining({
          capability: "atom-view",
          currentHome: "@attune/nx:atom-view",
          targetHome: "@attune/nx:atom-view",
          owner: "atom-view-generator-agent",
        }),
        expect.objectContaining({
          capability: "compile-only-assertion",
          currentHome: "@attune/nx:package-contract",
          targetHome: "@attune/nx:package-contract",
          owner: "package-contract-generator-agent",
        }),
        expect.objectContaining({
          capability: "type-guidance",
          currentHome: "@attune/nx:package-contract",
          targetHome: "@attune/nx:package-contract",
          owner: "type-guidance-agent",
        }),
        expect.objectContaining({
          capability: "operation-registry",
          currentHome: "@attune/nx:package-contract",
          targetHome: "@attune/nx:package-contract",
          owner: "attune-nx-framework-generator-integration-agent",
        }),
        expect.objectContaining({
          capability: "property-evidence-plan",
          currentHome: "@attune/nx:package-contract",
          targetHome: "@attune/nx:package-contract",
          owner: "attune-nx-framework-generator-integration-agent",
        }),
        expect.objectContaining({
          capability: "worker-property-module",
          currentHome: "@attune/nx:package-contract",
          targetHome: "@attune/nx:package-contract",
          owner: "attune-nx-framework-generator-integration-agent",
        }),
        expect.objectContaining({
          capability: "no-checked-in-report-policy",
          currentHome: "@attune/nx:package-contract",
          targetHome: "@attune/nx:package-contract",
          owner: "attune-nx-framework-generator-integration-agent",
        }),
      ]),
    )
  })

  it("generates DiscoveryEvents facade and projection ownership comments", () => {
    const tree = new MemoryTree()

    discoveryEventGenerator(tree, {
      name: "Evidence Recorded",
      eventType: "discovery.evidence.recorded",
      viewKey: "discovery.evidence",
    })

    const source =
      tree.files.get("src/discovery/events/evidence-recorded.ts") ?? ""
    expect(source).toContain(
      "raw EventLog writes stay behind DiscoveryEvents/facade boundaries",
    )
    expect(source).toContain(
      "export const EvidenceRecordedEvent = Schema.Struct",
    )
    expect(source).toContain("export const appendEvidenceRecorded")
    expect(source).toContain("export const projectEvidenceRecorded")
    expect(source).toContain(
      "Drizzle tables belong behind this persistence/read-model boundary",
    )
    expect(source).toContain(
      'export const evidenceRecordedViewKey = "discovery.evidence" as const',
    )
    expect(tree.files.get("src/discovery/events/index.ts")).toContain(
      'export * from "./evidence-recorded.js"',
    )
  })

  it("generates Effect service boundary ownership comments and Source BOM provenance", () => {
    const tree = new MemoryTree()

    effectServiceGenerator(tree, {
      name: "Decision Runner",
      directory: "packages/decision-core/src/effect/services",
      project: "decision-core",
      generatorVersion: "0.0.0-test",
    })

    const source =
      tree.files.get(
        "packages/decision-core/src/effect/services/decision-runner.ts",
      ) ?? ""
    expect(source).toContain(
      "world-changing effects live in Effect services, not atoms",
    )
    expect(source).toContain(
      "export class DecisionRunner extends Effect.Service<DecisionRunner>()",
    )
    expect(source).toContain("    accessors: true,")

    const shard = JSON.parse(
      tree.files.get("packages/decision-core/attune.source-bom.json") ?? "{}",
    )
    expect(shard).toMatchObject({
      schemaVersion: 1,
      project: "decision-core",
      projectRoot: "packages/decision-core",
    })
    expect(shard.entries).toHaveLength(1)
    expect(shard.entries[0]).toMatchObject({
      generatorName: "@attune/nx:effect-service",
      generatorVersion: "0.0.0-test",
      owningProject: "decision-core",
      sourceShapeKind: "effect-service",
      options: {
        directory: "packages/decision-core/src/effect/services",
        export: true,
        name: "Decision Runner",
        operationId: "decision-runner.run",
        operationKind: "command",
        tag: "@attune/service/DecisionRunner",
      },
      ownedFiles: [
        "packages/decision-core/src/effect/services/decision-runner.ts",
        "packages/decision-core/src/effect/services/index.ts",
      ],
      syncTargets: [{ project: "decision-core", target: "sync-effect-layers" }],
      checkTargets: [{ project: "decision-core", target: "typecheck" }],
      openspecChangeId: "promote-program-index-runtime-substrate",
    })
    expect(shard.entries[0].optionsHash).toMatch(/^fnv1a32:/)

    const index = JSON.parse(
      tree.files.get("attune.source-bom.index.json") ?? "{}",
    )
    expect(index.shards).toEqual([
      {
        project: "decision-core",
        projectRoot: "packages/decision-core",
        shard: "packages/decision-core/attune.source-bom.json",
      },
    ])
  })

  it("upserts Source BOM shards deterministically", () => {
    const tree = new MemoryTree()
    const input = {
      generatorName: "@attune/nx:test-shape",
      owningProject: "example",
      projectRoot: "packages/example",
      sourceShapeKind: "test-shape",
      options: { z: true, nested: { b: 2, a: 1 } },
      ownedFiles: [
        "packages/example/src/b.ts",
        "packages/example/src/a.ts",
        "packages/example/src/b.ts",
      ],
      editableRegions: [
        { file: "packages/example/src/b.ts", marker: "B" },
        { file: "packages/example/src/a.ts", marker: "A" },
      ],
      syncTargets: [
        { project: "example", target: "sync" },
        { project: "example", target: "build" },
      ],
      checkTargets: [{ project: "example", target: "typecheck" }],
    }

    upsertSourceBom(tree, input)
    const firstShard = tree.files.get("packages/example/attune.source-bom.json")
    const firstIndex = tree.files.get("attune.source-bom.index.json")
    upsertSourceBom(tree, {
      ...input,
      options: { nested: { a: 1, b: 2 }, z: true },
    })

    expect(tree.files.get("packages/example/attune.source-bom.json")).toEqual(
      firstShard,
    )
    expect(tree.files.get("attune.source-bom.index.json")).toEqual(firstIndex)
    expect(JSON.parse(firstShard ?? "{}").entries[0].ownedFiles).toEqual([
      "packages/example/src/a.ts",
      "packages/example/src/b.ts",
    ])
  })

  it("exposes framework-owned Source BOM cache shard paths", () => {
    expect(sourceBomCacheShardPath("attuned-discovery")).toBe(
      ".attune/cache/source-bom/attuned-discovery.json",
    )
    expect(sourceBomFrameworkShardPath("attuned-discovery")).toBe(
      "framework/architecture/src/generated/source-bom/attuned-discovery.json",
    )
  })
})
