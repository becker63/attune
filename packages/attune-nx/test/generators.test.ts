import { describe, expect, it } from "vitest"
import { RecipeRecordView, type RecipeDefinition } from "@attune/framework-protocol"

import discoveryEventGenerator from "../src/generators/discovery-event/generator.js"
import effectServiceGenerator from "../src/generators/effect-service/generator.js"
import { AttuneNxRecipes } from "../src/index.js"
import {
  attuneNxGeneratorInventory,
  phase2GeneratorGapMap,
  requiredPhase2GeneratorCapabilities,
} from "../src/generator-inventory.js"
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
  it("declares generator package recipes from the package barrel", () => {
    const records = AttuneNxRecipes.map((recipe) =>
      RecipeRecordView.fromRecipe(recipe as RecipeDefinition<unknown, unknown>)
    )

    expect(records.map((record) => record.recipeId)).toEqual([
      "attune-nx.generator-catalog",
      ...attuneNxGeneratorInventory.map((entry) => `attune-nx.generator.${entry.id}`),
      "attune-nx.recipe-receipt-provenance",
    ])
    expect(records.every((record) => record.sourcePath === "packages/attune-nx/src/recipes.ts")).toBe(true)
  })

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
      "Persistence tables belong behind this Effect service/read-model boundary",
    )
    expect(source).toContain(
      'export const evidenceRecordedViewKey = "discovery.evidence" as const',
    )
    expect(tree.files.get("src/discovery/events/index.ts")).toContain(
      'export * from "./evidence-recorded.js"',
    )
  })

  it("generates Effect service boundary ownership comments without legacy artifact provenance", () => {
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

    expect(tree.files.has("packages/decision-core/attune.artifact-ownership.json")).toBe(false)
    expect(tree.files.has("attune.artifact-ownership.index.json")).toBe(false)
  })
})
