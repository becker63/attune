import { describe, expect, it } from "vitest"

import syncCocoIndexMcpToolsGenerator from "../src/generators/sync-cocoindex-mcp-tools/generator.js"
import discoveryEventGenerator from "../src/generators/discovery-event/generator.js"
import effectServiceGenerator from "../src/generators/effect-service/generator.js"
import syncJoernTemplatesGenerator from "../src/generators/sync-joern-templates/generator.js"
import syncK8sResourcesGenerator from "../src/generators/sync-k8s-resources/generator.js"
import {
  attuneNxGeneratorInventory,
  phase2GeneratorGapMap,
  requiredPhase2GeneratorCapabilities,
} from "../src/generator-inventory.js"
import {
  artifactOwnershipCacheShardPath,
  artifactOwnershipFrameworkShardPath,
  upsertArtifactOwnership,
} from "../src/internal/artifact-ownership.js"
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

  it("records the generator gaps for project-facts migration", () => {
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
          capability: "project-facts",
          currentHome: "@attune/nx:project-facts",
          targetHome: "@attune/nx:project-facts",
          owner: "project-facts-generator-agent",
        }),
        expect.objectContaining({
          capability: "atom-view",
          currentHome: "@attune/nx:atom-view",
          targetHome: "@attune/nx:atom-view",
          owner: "atom-view-generator-agent",
        }),
        expect.objectContaining({
          capability: "symbol-registry",
          currentHome: "@attune/nx:project-facts",
          targetHome: "@attune/nx:project-facts",
          owner: "project-facts-generator-agent",
        }),
        expect.objectContaining({
          capability: "observation-plan",
          currentHome: "@attune/nx:project-facts",
          targetHome: "@attune/nx:project-facts",
          owner: "program-observation-agent",
        }),
        expect.objectContaining({
          capability: "worker-observation-module",
          currentHome: "@attune/nx:project-facts",
          targetHome: "@attune/nx:project-facts",
          owner: "attune-nx-framework-generator-integration-agent",
        }),
        expect.objectContaining({
          capability: "no-checked-in-report-policy",
          currentHome: "@attune/nx:project-facts",
          targetHome: "@attune/nx:project-facts",
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

  it("generates Effect service boundary ownership comments and artifact provenance", () => {
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
      tree.files.get("packages/decision-core/attune.artifact-ownership.json") ?? "{}",
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
        symbolId: "decision-runner.run",
        symbolKind: "command",
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
      tree.files.get("attune.artifact-ownership.index.json") ?? "{}",
    )
    expect(index.shards).toEqual([
      {
        project: "decision-core",
        projectRoot: "packages/decision-core",
        shard: "packages/decision-core/attune.artifact-ownership.json",
      },
    ])
  })

  it("upserts artifact provenance shards deterministically", () => {
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

    upsertArtifactOwnership(tree, input)
    const firstShard = tree.files.get("packages/example/attune.artifact-ownership.json")
    const firstIndex = tree.files.get("attune.artifact-ownership.index.json")
    upsertArtifactOwnership(tree, {
      ...input,
      options: { nested: { a: 1, b: 2 }, z: true },
    })

    expect(tree.files.get("packages/example/attune.artifact-ownership.json")).toEqual(
      firstShard,
    )
    expect(tree.files.get("attune.artifact-ownership.index.json")).toEqual(firstIndex)
    expect(JSON.parse(firstShard ?? "{}").entries[0].ownedFiles).toEqual([
      "packages/example/src/a.ts",
      "packages/example/src/b.ts",
    ])
  })

  it("exposes framework-owned artifact provenance cache shard paths", () => {
    expect(artifactOwnershipCacheShardPath("attuned-discovery")).toBe(
      ".attune/cache/artifact-ownership/attuned-discovery.json",
    )
    expect(artifactOwnershipFrameworkShardPath("attuned-discovery")).toBe(
      "framework/architecture/src/generated/artifact-ownership/attuned-discovery.json",
    )
  })

  it("syncs CocoIndex MCP tool registries", () => {
    const tree = new MemoryTree()
    tree.write("src/cocoindex/tools/recall.ts", "export const RecallTool = {}\nexport const Ignored = {}\n")
    tree.write("src/cocoindex/tools/plan.generated.ts", "export const GeneratedTool = {}\n")
    tree.write("src/cocoindex/tools/index.ts", 'export * from "./manual.js"\n')

    syncCocoIndexMcpToolsGenerator(tree)

    expect(tree.files.get("src/cocoindex/tools/ToolRegistry.generated.ts")).toBe(`// This file is generated by @attune/nx.
// Source: sync-cocoindex-mcp-tools.
// Keep manual implementation in neighboring files.
import { RecallTool } from "./recall.js"

export const cocoindexMcpTools = [RecallTool] as const

export type CocoIndexMcpTool = (typeof cocoindexMcpTools)[number]
`)
    expect(tree.files.get("src/cocoindex/tools/index.ts")).toContain('export * from "./ToolRegistry.generated.js"')
  })

  it("syncs Joern template registries without exporting when disabled", () => {
    const tree = new MemoryTree()
    tree.write("src/joern/templates/call-graph.ts", "export const CallGraphTemplate = {}\nexport const Helper = {}\n")

    syncJoernTemplatesGenerator(tree, { export: false })

    expect(tree.files.get("src/joern/templates/TemplateRegistry.generated.ts")).toContain(
      "export const joernTemplates = [CallGraphTemplate] as const",
    )
    expect(tree.files.has("src/joern/templates/index.ts")).toBe(false)
  })

  it("syncs empty K8s resource registries", () => {
    const tree = new MemoryTree()

    syncK8sResourcesGenerator(tree)

    expect(tree.files.get("src/resources/ResourceRegistry.generated.ts")).toContain(
      "export const k8sResourceModules = [] as const",
    )
    expect(tree.files.get("src/resources/index.ts")).toBe('export * from "./ResourceRegistry.generated.js"\n')
  })
})
