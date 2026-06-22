import { describe, expect, it } from "vitest"

import effectServiceGenerator from "../src/generators/effect-service/generator.js"
import type { GeneratorTree } from "../src/internal/tree.js"

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

const generatedService = (tree: MemoryTree): string =>
  tree.files.get(
    "packages/decision-core/src/effect/services/decision-runner.ts",
  ) ?? ""

describe("@attune/nx:effect-service", () => {
  it("generates the canonical Effect.Service shape with accessors", () => {
    const tree = new MemoryTree()

    effectServiceGenerator(tree, {
      name: "Decision Runner",
      directory: "packages/decision-core/src/effect/services",
      project: "decision-core",
    })

    const source = generatedService(tree)
    expect(source).toContain('import { Effect, Schema } from "effect"')
    expect(source).toContain(
      "export class DecisionRunner extends Effect.Service<DecisionRunner>()",
    )
    expect(source).toContain('  "@attune/service/DecisionRunner",')
    expect(source).toContain("    accessors: true,")
    expect(source).toContain(
      "    effect: Effect.succeed(makeDecisionRunner()),",
    )
    expect(source).not.toContain("Context.Tag")
  })

  it("emits operation schema and package-contract registration placeholders", () => {
    const tree = new MemoryTree()

    effectServiceGenerator(tree, {
      name: "Decision Runner",
      directory: "packages/decision-core/src/effect/services",
      operationId: "decision.runner.execute",
      operationKind: "resource-provider",
      project: "decision-core",
    })

    const source = generatedService(tree)
    expect(source).toContain("export const DecisionRunnerRunInput = Schema.Void")
    expect(source).toContain(
      "export const DecisionRunnerRunOutput = Schema.Void",
    )
    expect(source).toContain("export const DecisionRunnerRunOperation = {")
    expect(source).toContain('  id: "decision.runner.execute",')
    expect(source).toContain('  kind: "resource-provider",')
    expect(source).toContain('  inferredLaws: "inferLaws()",')
    expect(source).toContain("  lawExtensions: [],")
    expect(source).toContain(
      '    "resourceProviderOperation({ id, input, output, laws: inferLaws(), views: touches(...) })",',
    )
  })

  it("exports PackageLayer and PackageTestLayer from the service default layer", () => {
    const tree = new MemoryTree()

    effectServiceGenerator(tree, {
      name: "Decision Runner",
      directory: "packages/decision-core/src/effect/services",
      project: "decision-core",
    })

    const source = generatedService(tree)
    expect(source).toContain(
      "export const DecisionRunnerLive = DecisionRunner.Default",
    )
    expect(source).toContain("export const PackageLayer = DecisionRunnerLive")
    expect(source).toContain(
      "export const PackageTestLayer = DecisionRunnerLive",
    )
  })

  it("records operation metadata in Source BOM provenance", () => {
    const tree = new MemoryTree()

    effectServiceGenerator(tree, {
      name: "Decision Runner",
      directory: "packages/decision-core/src/effect/services",
      generatorVersion: "0.0.0-test",
      operationId: "decision.runner.execute",
      operationKind: "generator",
      project: "decision-core",
    })

    const shard = JSON.parse(
      tree.files.get("packages/decision-core/attune.source-bom.json") ?? "{}",
    )

    expect(shard.entries[0]).toMatchObject({
      generatorName: "@attune/nx:effect-service",
      generatorVersion: "0.0.0-test",
      options: {
        directory: "packages/decision-core/src/effect/services",
        export: true,
        name: "Decision Runner",
        operationId: "decision.runner.execute",
        operationKind: "generator",
        tag: "@attune/service/DecisionRunner",
      },
      ownedFiles: [
        "packages/decision-core/src/effect/services/decision-runner.ts",
        "packages/decision-core/src/effect/services/index.ts",
      ],
      openspecChangeId: "standardize-effect-package-contracts",
    })
  })

  it("keeps repeated generator output deterministic", () => {
    const first = new MemoryTree()
    const second = new MemoryTree()
    const options = {
      name: "Decision Runner",
      directory: "packages/decision-core/src/effect/services",
      operationId: "decision.runner.execute",
      operationKind: "generator" as const,
      project: "decision-core",
    }

    effectServiceGenerator(first, options)
    effectServiceGenerator(first, options)
    effectServiceGenerator(second, options)

    expect([...first.files.entries()].sort()).toEqual(
      [...second.files.entries()].sort(),
    )
  })
})
