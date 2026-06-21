import { describe, expect, it } from "vitest"

import syncCocoIndexMcpToolsGenerator from "../src/generators/sync-cocoindex-mcp-tools/generator.js"
import discoveryEventGenerator from "../src/generators/discovery-event/generator.js"
import effectServiceGenerator from "../src/generators/effect-service/generator.js"
import syncJoernTemplatesGenerator from "../src/generators/sync-joern-templates/generator.js"
import syncK8sResourcesGenerator from "../src/generators/sync-k8s-resources/generator.js"
import {
  normalizeSourceBomOptions,
  sourceBomOptionsHash,
  sourceBomRootIndexSchemaVersion,
  sourceBomShardSchemaVersion,
  upsertSourceBomEntry,
} from "../src/internal/source-bom.js"
import type { GeneratorTree } from "../src/internal/tree.js"

class MemoryTree implements GeneratorTree {
  readonly files = new Map<string, string>()

  exists(path: string): boolean {
    return this.files.has(path) || [...this.files.keys()].some((file) => file.startsWith(`${path}/`))
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
  it("generates DiscoveryEvents facade and projection ownership comments", () => {
    const tree = new MemoryTree()

    discoveryEventGenerator(tree, {
      name: "Evidence Recorded",
      eventType: "discovery.evidence.recorded",
      viewKey: "discovery.evidence",
    })

    const source = tree.files.get("src/discovery/events/evidence-recorded.ts") ?? ""
    expect(source).toContain("raw EventLog writes stay behind DiscoveryEvents/facade boundaries")
    expect(source).toContain("export const EvidenceRecordedEvent = Schema.Struct")
    expect(source).toContain("export const appendEvidenceRecorded")
    expect(source).toContain("export const projectEvidenceRecorded")
    expect(source).toContain("Drizzle tables belong behind this persistence/read-model boundary")
    expect(source).toContain("export const evidenceRecordedViewKey = \"discovery.evidence\" as const")
    expect(tree.files.get("src/discovery/events/index.ts")).toContain('export * from "./evidence-recorded.js"')
  })

  it("generates Effect service boundary ownership comments", () => {
    const tree = new MemoryTree()

    effectServiceGenerator(tree, { name: "Decision Runner" })

    const source = tree.files.get("src/effect/services/decision-runner.ts") ?? ""
    expect(source).toContain("world-changing effects live in Effect services, not atoms")
    expect(source).toContain("export class DecisionRunner extends Context.Service")
    expect(tree.files.get("attune.source-bom.json")).toContain('"kind": "effect-service"')
    expect(tree.files.get("attune.source-bom.index.json")).toContain('"path": "attune.source-bom.json"')
  })

  it("generates project-local Source BOM entries for Effect services", () => {
    const tree = new MemoryTree()

    effectServiceGenerator(tree, {
      name: "Decision Runner",
      directory: "packages/attuned-discovery/src/effect/services",
      project: "attuned-discovery",
      projectRoot: "packages/attuned-discovery",
      openspecChange: "enforce-nix-agent-policy-gates",
    })

    const shard = JSON.parse(tree.files.get("packages/attuned-discovery/attune.source-bom.json") ?? "{}")
    expect(shard).toMatchObject({
      schemaVersion: sourceBomShardSchemaVersion,
      project: "attuned-discovery",
      projectRoot: "packages/attuned-discovery",
      entries: [
        {
          id: "attuned-discovery:effect-service:decision-runner",
          kind: "effect-service",
          project: "attuned-discovery",
          generator: {
            name: "@attune/nx:effect-service",
            version: "0.0.0",
          },
          generatedOutputs: ["packages/attuned-discovery/src/effect/services/decision-runner.ts"],
          ownedFiles: ["packages/attuned-discovery/src/effect/services/decision-runner.ts"],
          syncTargets: ["@attune/nx:effect-service"],
          checkTargets: ["attuned-discovery:typecheck"],
          openspecChange: "enforce-nix-agent-policy-gates",
        },
      ],
      waivers: [],
    })

    const index = JSON.parse(tree.files.get("attune.source-bom.index.json") ?? "{}")
    expect(index).toEqual({
      schemaVersion: sourceBomRootIndexSchemaVersion,
      shards: [
        {
          project: "attuned-discovery",
          projectRoot: "packages/attuned-discovery",
          path: "packages/attuned-discovery/attune.source-bom.json",
          entryIds: ["attuned-discovery:effect-service:decision-runner"],
        },
      ],
    })
  })

  it("upserts Source BOM entries with deterministic sorting", () => {
    const tree = new MemoryTree()
    const normalizedOptions = normalizeSourceBomOptions({
      name: "Recall Tool",
      export: true,
      skipped: undefined,
      nested: {
        z: true,
        a: "first",
      },
    })
    const expectedHash = sourceBomOptionsHash(normalizedOptions)

    upsertSourceBomEntry(tree, {
      id: "attuned-discovery:cocoindex-mcp-tool:recall",
      kind: "cocoindex-mcp-tool",
      project: "attuned-discovery",
      projectRoot: "packages/attuned-discovery",
      generator: {
        name: "@attune/nx:cocoindex-mcp-tool",
        version: "0.0.0",
      },
      normalizedOptions,
      ownedFiles: [
        "packages/attuned-discovery/src/cocoindex/tools/recall.ts",
        "packages/attuned-discovery/src/cocoindex/tools/index.ts",
      ],
      generatedOutputs: ["packages/attuned-discovery/src/cocoindex/tools/recall.ts"],
      editableRegions: [
        {
          file: "packages/attuned-discovery/src/cocoindex/tools/recall.ts",
          region: "tool-implementation",
          description: "Input/result schema and MCP execution boundary.",
        },
      ],
      syncTargets: ["@attune/nx:sync-cocoindex-mcp-tools", "@attune/nx:cocoindex-mcp-tool"],
      checkTargets: ["attuned-discovery:typecheck", "attuned-discovery:test"],
    })

    const before = tree.files.get("packages/attuned-discovery/attune.source-bom.json")

    upsertSourceBomEntry(tree, {
      id: "attuned-discovery:cocoindex-mcp-tool:recall",
      kind: "cocoindex-mcp-tool",
      project: "attuned-discovery",
      projectRoot: "packages/attuned-discovery",
      generator: {
        name: "@attune/nx:cocoindex-mcp-tool",
        version: "0.0.0",
      },
      normalizedOptions: {
        nested: {
          a: "first",
          z: true,
        },
        export: true,
        name: "Recall Tool",
      },
      ownedFiles: [
        "packages/attuned-discovery/src/cocoindex/tools/index.ts",
        "packages/attuned-discovery/src/cocoindex/tools/recall.ts",
      ],
      generatedOutputs: ["packages/attuned-discovery/src/cocoindex/tools/recall.ts"],
      editableRegions: [
        {
          file: "packages/attuned-discovery/src/cocoindex/tools/recall.ts",
          region: "tool-implementation",
          description: "Input/result schema and MCP execution boundary.",
        },
      ],
      syncTargets: ["@attune/nx:cocoindex-mcp-tool", "@attune/nx:sync-cocoindex-mcp-tools"],
      checkTargets: ["attuned-discovery:test", "attuned-discovery:typecheck"],
    })

    expect(tree.files.get("packages/attuned-discovery/attune.source-bom.json")).toBe(before)
    expect(JSON.parse(before ?? "{}")).toEqual({
      schemaVersion: sourceBomShardSchemaVersion,
      project: "attuned-discovery",
      projectRoot: "packages/attuned-discovery",
      entries: [
        {
          id: "attuned-discovery:cocoindex-mcp-tool:recall",
          kind: "cocoindex-mcp-tool",
          project: "attuned-discovery",
          generator: {
            name: "@attune/nx:cocoindex-mcp-tool",
            version: "0.0.0",
          },
          normalizedOptions: {
            export: true,
            name: "Recall Tool",
            nested: {
              a: "first",
              z: true,
            },
          },
          optionsHash: expectedHash,
          sourceInputs: [],
          generatedOutputs: ["packages/attuned-discovery/src/cocoindex/tools/recall.ts"],
          ownedFiles: [
            "packages/attuned-discovery/src/cocoindex/tools/index.ts",
            "packages/attuned-discovery/src/cocoindex/tools/recall.ts",
          ],
          editableRegions: [
            {
              file: "packages/attuned-discovery/src/cocoindex/tools/recall.ts",
              region: "tool-implementation",
              description: "Input/result schema and MCP execution boundary.",
            },
          ],
          syncTargets: ["@attune/nx:cocoindex-mcp-tool", "@attune/nx:sync-cocoindex-mcp-tools"],
          checkTargets: ["attuned-discovery:test", "attuned-discovery:typecheck"],
        },
      ],
      waivers: [],
    })
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
