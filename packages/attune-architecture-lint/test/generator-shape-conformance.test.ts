import * as fs from "node:fs"
import * as os from "node:os"
import * as path from "node:path"
import { describe, expect, it } from "vitest"
import { checkGeneratorShapeConformance } from "../src/generator-shape-conformance.js"

const withWorkspace = (files: Record<string, string>, run: (workspace: string, trackedFiles: readonly string[]) => void): void => {
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), "attune-shape-conformance-"))
  try {
    for (const [relativePath, content] of Object.entries(files)) {
      const target = path.join(workspace, relativePath)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.writeFileSync(target, content)
    }
    run(workspace, Object.keys(files))
  } finally {
    fs.rmSync(workspace, { recursive: true, force: true })
  }
}

describe("generator shape conformance", () => {
  it("accepts generated shapes backed by Source BOM generated outputs", () => {
    withWorkspace({
      "attune.generator-shapes.json": JSON.stringify({
        schemaVersion: 1,
        shapes: [{
          id: "example.generated-registry",
          project: "example",
          projectRoot: "packages/example",
          kind: "generated-registry",
          generator: "@attune/nx:sync-example",
          status: "generated",
          paths: ["src/Registry.generated.ts"],
          sourceBomShard: "packages/example/attune.source-bom.json",
        }],
      }),
      "attune.source-bom.index.json": JSON.stringify({
        schemaVersion: 1,
        shapeManifest: "attune.generator-shapes.json",
        shards: [{
          project: "example",
          projectRoot: "packages/example",
          shard: "packages/example/attune.source-bom.json",
        }],
      }),
      "packages/attune-nx/generators.json": JSON.stringify({
        generators: {
          "sync-example": {
            implementation: "./src/generators/sync-example/generator.ts",
            schema: "./src/generators/sync-example/schema.json",
          },
        },
      }),
      "packages/example/attune.source-bom.json": JSON.stringify({
        schemaVersion: 1,
        project: "example",
        projectRoot: "packages/example",
        generatedOutputs: [{
          generator: "@attune/nx:sync-example",
          target: "sync-example",
          sources: ["src/*.ts"],
          outputs: ["src/Registry.generated.ts"],
        }],
        historicalHandAuthoredShapes: [],
        ownedFiles: ["src/**"],
      }),
      "packages/example/src/Registry.generated.ts": "export const registry = [] as const\n",
    }, (workspaceRoot, trackedFiles) => {
      const result = checkGeneratorShapeConformance({ workspaceRoot, trackedFiles })
      expect(result.exitCode).toBe(0)
      expect(result.summary.generated).toBe(1)
    })
  })

  it("tracks planned package-contract shards without requiring the generated files to exist yet", () => {
    withWorkspace({
      "attune.generator-shapes.json": JSON.stringify({
        schemaVersion: 1,
        shapes: [{
          id: "example.package-contract",
          project: "example",
          projectRoot: "packages/example",
          kind: "package-contract",
          generator: "@attune/nx:package-contract",
          status: "migrate",
          paths: ["attune.source-bom.json"],
          plannedPaths: ["src/attune.package.ts", "src/attune.package.typecheck.ts"],
          sourceBomShard: "packages/example/attune.source-bom.json",
        }],
      }),
      "attune.source-bom.index.json": JSON.stringify({
        schemaVersion: 1,
        shapeManifest: "attune.generator-shapes.json",
        shards: [{
          project: "example",
          projectRoot: "packages/example",
          shard: "packages/example/attune.source-bom.json",
        }],
      }),
      "packages/attune-nx/generators.json": JSON.stringify({
        generators: {
          "package-contract": {
            implementation: "./src/generators/package-contract/generator.ts",
            schema: "./src/generators/package-contract/schema.json",
          },
        },
      }),
      "packages/example/attune.source-bom.json": JSON.stringify({
        schemaVersion: 1,
        project: "example",
        projectRoot: "packages/example",
        generatedOutputs: [],
        contractShards: [{
          generator: "@attune/nx:package-contract",
          target: "sync-package-contract",
          status: "planned",
          sources: ["src/**", "project.json"],
          outputs: ["src/attune.package.ts", "src/attune.package.typecheck.ts"],
        }],
        historicalHandAuthoredShapes: [],
        ownedFiles: ["src/**"],
      }),
    }, (workspaceRoot, trackedFiles) => {
      const result = checkGeneratorShapeConformance({ workspaceRoot, trackedFiles })
      expect(result.exitCode).toBe(0)
      expect(result.summary.migrate).toBe(1)
    })
  })

  it("rejects generated shapes that still carry planned paths", () => {
    withWorkspace({
      "attune.generator-shapes.json": JSON.stringify({
        schemaVersion: 1,
        shapes: [{
          id: "example.package-contract",
          project: "example",
          projectRoot: "packages/example",
          kind: "package-contract",
          generator: "@attune/nx:package-contract",
          status: "generated",
          paths: ["src/attune.package.ts"],
          plannedPaths: ["src/attune.package.typecheck.ts"],
          sourceBomShard: "packages/example/attune.source-bom.json",
        }],
      }),
      "attune.source-bom.index.json": JSON.stringify({
        schemaVersion: 1,
        shapeManifest: "attune.generator-shapes.json",
        shards: [{
          project: "example",
          projectRoot: "packages/example",
          shard: "packages/example/attune.source-bom.json",
        }],
      }),
      "packages/attune-nx/generators.json": JSON.stringify({
        generators: {
          "package-contract": {
            implementation: "./src/generators/package-contract/generator.ts",
            schema: "./src/generators/package-contract/schema.json",
          },
        },
      }),
      "packages/example/attune.source-bom.json": JSON.stringify({
        schemaVersion: 1,
        project: "example",
        projectRoot: "packages/example",
        generatedOutputs: [],
        contractShards: [{
          generator: "@attune/nx:package-contract",
          target: "sync-package-contract",
          status: "generated",
          sources: ["src/**", "project.json"],
          outputs: ["src/attune.package.ts", "src/attune.package.typecheck.ts"],
        }],
        historicalHandAuthoredShapes: [],
        ownedFiles: ["src/**"],
      }),
      "packages/example/src/attune.package.ts": "export const PackageContract = {}\n",
      "packages/example/src/attune.package.typecheck.ts": "export {}\n",
    }, (workspaceRoot, trackedFiles) => {
      const result = checkGeneratorShapeConformance({ workspaceRoot, trackedFiles })
      expect(result.exitCode).toBe(1)
      expect(result.diagnostics).toContainEqual(expect.objectContaining({
        message: expect.stringContaining("still declares plannedPaths"),
      }))
    })
  })

  it("rejects generated package-contract shapes without generated Source BOM contract shards", () => {
    withWorkspace({
      "attune.generator-shapes.json": JSON.stringify({
        schemaVersion: 1,
        shapes: [{
          id: "example.package-contract",
          project: "example",
          projectRoot: "packages/example",
          kind: "package-contract",
          generator: "@attune/nx:package-contract",
          status: "generated",
          paths: ["src/attune.package.ts", "src/attune.package.typecheck.ts"],
          sourceBomShard: "packages/example/attune.source-bom.json",
        }],
      }),
      "attune.source-bom.index.json": JSON.stringify({
        schemaVersion: 1,
        shapeManifest: "attune.generator-shapes.json",
        shards: [{
          project: "example",
          projectRoot: "packages/example",
          shard: "packages/example/attune.source-bom.json",
        }],
      }),
      "packages/attune-nx/generators.json": JSON.stringify({
        generators: {
          "package-contract": {
            implementation: "./src/generators/package-contract/generator.ts",
            schema: "./src/generators/package-contract/schema.json",
          },
        },
      }),
      "packages/example/attune.source-bom.json": JSON.stringify({
        schemaVersion: 1,
        project: "example",
        projectRoot: "packages/example",
        generatedOutputs: [],
        contractShards: [],
        historicalHandAuthoredShapes: [],
        ownedFiles: ["src/**"],
      }),
      "packages/example/src/attune.package.ts": "export const PackageContract = {}\n",
      "packages/example/src/attune.package.typecheck.ts": "export {}\n",
    }, (workspaceRoot, trackedFiles) => {
      const result = checkGeneratorShapeConformance({ workspaceRoot, trackedFiles })
      expect(result.exitCode).toBe(1)
      expect(result.diagnostics).toContainEqual(expect.objectContaining({
        message: expect.stringContaining("missing a generated Source BOM contract shard"),
      }))
    })
  })

  it("allows migrate entries to name future @attune/nx generators", () => {
    withWorkspace({
      "attune.generator-shapes.json": JSON.stringify({
        schemaVersion: 1,
        shapes: [{
          id: "example.future-shape",
          project: "example",
          projectRoot: "packages/example",
          kind: "future-shape",
          generator: "@attune/nx:future-shape",
          status: "migrate",
          paths: ["src/future.ts"],
        }],
      }),
      "attune.source-bom.index.json": JSON.stringify({
        schemaVersion: 1,
        shards: [{
          project: "example",
          projectRoot: "packages/example",
          shard: "packages/example/attune.source-bom.json",
        }],
      }),
      "packages/attune-nx/generators.json": JSON.stringify({ generators: {} }),
      "packages/example/attune.source-bom.json": JSON.stringify({
        schemaVersion: 1,
        project: "example",
        projectRoot: "packages/example",
        generatedOutputs: [],
        historicalHandAuthoredShapes: [{
          paths: ["src/future.ts"],
          reason: "waiting for generator",
        }],
        ownedFiles: ["src/**"],
      }),
      "packages/example/src/future.ts": "export const future = true\n",
    }, (workspaceRoot, trackedFiles) => {
      const result = checkGeneratorShapeConformance({ workspaceRoot, trackedFiles })
      expect(result.exitCode).toBe(0)
      expect(result.summary.futureGenerators).toEqual(["@attune/nx:future-shape"])
    })
  })

  it("rejects generated shapes that name missing @attune/nx generators", () => {
    withWorkspace({
      "attune.generator-shapes.json": JSON.stringify({
        schemaVersion: 1,
        shapes: [{
          id: "example.broken-generated-shape",
          project: "example",
          projectRoot: "packages/example",
          kind: "broken-generated-shape",
          generator: "@attune/nx:missing",
          status: "generated",
          paths: ["src/Broken.generated.ts"],
        }],
      }),
      "attune.source-bom.index.json": JSON.stringify({
        schemaVersion: 1,
        shards: [{
          project: "example",
          projectRoot: "packages/example",
          shard: "packages/example/attune.source-bom.json",
        }],
      }),
      "packages/attune-nx/generators.json": JSON.stringify({ generators: {} }),
      "packages/example/attune.source-bom.json": JSON.stringify({
        schemaVersion: 1,
        project: "example",
        projectRoot: "packages/example",
        generatedOutputs: [],
        historicalHandAuthoredShapes: [],
        ownedFiles: ["src/**"],
      }),
      "packages/example/src/Broken.generated.ts": "export const broken = true\n",
    }, (workspaceRoot, trackedFiles) => {
      const result = checkGeneratorShapeConformance({ workspaceRoot, trackedFiles })
      expect(result.exitCode).toBe(1)
      expect(result.diagnostics).toContainEqual(expect.objectContaining({
        message: expect.stringContaining("missing @attune/nx generator"),
      }))
    })
  })
})
