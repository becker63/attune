import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { Schema } from "effect"
import { describe, expect, it } from "vitest"

import { PackageContractSchema } from "@attune/framework-protocol"
import {
  derivePackageContractWorkspaceGraph,
  discoverPackageContracts,
  type NxProjectLike,
} from "../src/package-contract-graph.js"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")

const productProjectFiles = [
  "packages/attuned-discovery/project.json",
  "packages/cocoindex-effect/project.json",
  "packages/attune-foldkit/project.json",
  "packages/attune-pi-agent/project.json",
] as const

const ownersByProjectName = {
  "attuned-discovery": "attuned-discovery-migration-agent",
  "cocoindex-effect": "cocoindex-effect-migration-agent",
  "attune-foldkit": "attune-foldkit-migration-agent",
  "attune-pi-agent": "attune-pi-agent-migration-agent",
} as const

const expectedProductContracts = {
  "attuned-discovery": {
    packageId: "attuned-discovery",
    packageKind: "core-discovery-runtime",
  },
  "cocoindex-effect": {
    packageId: "cocoindex-effect",
    packageKind: "semantic-recall-service",
  },
  "attune-foldkit": {
    packageId: "attune-foldkit",
    packageKind: "foldkit-ui",
  },
  "attune-pi-agent": {
    packageId: "attune-pi-agent",
    packageKind: "agent-extension",
  },
} as const

interface PackageContractModule {
  readonly PackageContract: unknown
  readonly PackageLayer: unknown
  readonly PackageTestLayer: unknown
  readonly PackageFuzzHandlers: unknown
  readonly PackageProperties: unknown
  readonly PackageTypeGuidance: unknown
}

describe("product package contract discovery", () => {
  it("requires Phase 5 product packages to expose contract and typecheck modules", () => {
    const projects = Object.fromEntries(
      productProjectFiles.map((projectFile) => {
        const project = readProject(projectFile)
        return [project.name ?? projectFile, project] as const
      }),
    )

    const expectedContractFiles = Object.values(projects).map((project) =>
      `${project.root}/src/attune.package.ts`,
    )
    const expectedTypecheckFiles = Object.values(projects).map((project) =>
      `${project.root}/src/attune.package.typecheck.ts`,
    )
    const expectedFiles = [...expectedContractFiles, ...expectedTypecheckFiles]

    const existingFiles = expectedFiles.filter((path) =>
      existsSync(resolve(repositoryRoot, path)),
    )
    const discovery = discoverPackageContracts(projects, { existingFiles })
    const missingTypecheckFiles = expectedTypecheckFiles.filter((path) =>
      !existingFiles.includes(path),
    )

    expect({
      missingContractFiles: discovery.missingContracts.map((entry) => ({
        path: entry.contractPath,
        owner: ownerFor(entry.projectName),
      })),
      missingTypecheckFiles: missingTypecheckFiles.map((path) => ({
        path,
        owner: ownerForProjectRoot(path),
      })),
    }).toEqual({
      missingContractFiles: [],
      missingTypecheckFiles: [],
    })
  })

  it("decodes product contracts and summarizes contract-owned boundary surfaces", async () => {
    const contractModules = await Promise.all(
      productProjectFiles.map(async (projectFile) => {
        const project = readProject(projectFile)
        const module = await importPackageContractModule(project)
        const decoded = Schema.decodeUnknownSync(PackageContractSchema)(
          module.PackageContract,
        )
        const operationIds = decoded.operations.map((operation) => operation.id).sort()
        const expected = expectedProductContracts[
          project.name as keyof typeof expectedProductContracts
        ]

        return {
          project,
          module,
          projectName: project.name,
          packageId: decoded.packageId,
          packageKind: decoded.packageKind,
          operationCount: decoded.operations.length,
          reactivityKeyCount: decoded.views.reactivityKeys.length,
          atomCount: decoded.views.atoms.length,
          layer: layerSummary(module.PackageLayer),
          testLayer: layerSummary(module.PackageTestLayer),
          fuzzHandlerIds: objectKeys(module.PackageFuzzHandlers),
          propertyIds: objectKeys(module.PackageProperties),
          typeGuidanceIds: objectKeys(
            guidanceOperations(module.PackageTypeGuidance),
          ),
          expected,
          operationIds,
        }
      }),
    )
    const summaries = contractModules.map(
      ({ project: _project, module: _module, ...summary }) => summary,
    )
    const graph = derivePackageContractWorkspaceGraph(
      contractModules.map(({ project, module }) => ({
        projectName: project.name ?? project.root,
        projectRoot: project.root,
        ...(project.sourceRoot === undefined ? {} : { sourceRoot: project.sourceRoot }),
        contractPath: `${project.root}/src/attune.package.ts`,
        module,
      })),
    )

    expect(
      summaries.map((summary) => ({
        projectName: summary.projectName,
        packageId: summary.packageId,
        packageKind: summary.packageKind,
      })),
    ).toEqual(
      Object.entries(expectedProductContracts).map(([projectName, expected]) => ({
        projectName,
        packageId: expected.packageId,
        packageKind: expected.packageKind,
      })),
    )

    for (const summary of summaries) {
      expect(summary.operationCount, `${summary.projectName} operation count`).toBeGreaterThan(0)
      expect(summary.reactivityKeyCount, `${summary.projectName} Reactivity key count`).toBeGreaterThan(0)
      expect(summary.atomCount, `${summary.projectName} atom count`).toBeGreaterThan(0)
      expect(summary.layer, `${summary.projectName} PackageLayer`).toEqual({
        hasLayer: true,
        hasProvides: true,
        hasRequires: true,
        packageId: summary.packageId,
      })
      expect(summary.testLayer, `${summary.projectName} PackageTestLayer`).toEqual({
        hasLayer: true,
        hasProvides: true,
        hasRequires: true,
        packageId: summary.packageId,
      })
      expect(summary.fuzzHandlerIds, `${summary.projectName} fuzz handlers`).toEqual(summary.operationIds)
      expect(summary.propertyIds, `${summary.projectName} properties`).toEqual(summary.operationIds)
      expect(summary.typeGuidanceIds, `${summary.projectName} type guidance`).toEqual(summary.operationIds)
    }

    expect(graph.projects.map((project) => ({
      projectName: project.projectName,
      packageId: project.packageId,
      operationCount: project.operationCount,
      reactivityKeyCount: project.atomGraph.declaredReactivityKeys.length,
      atomCount: project.atomGraph.declaredAtoms.length,
    }))).toEqual(summaries.map((summary) => ({
      projectName: summary.projectName,
      packageId: summary.packageId,
      operationCount: summary.operationCount,
      reactivityKeyCount: summary.reactivityKeyCount,
      atomCount: summary.atomCount,
    })))
    expect(graph.projectMetadata["attune-foldkit"]?.attune.packageContract.descriptorHash).toMatch(/^[0-9a-f]+$/)
  })
})

function readProject(path: string): NxProjectLike & { readonly root: string } {
  return JSON.parse(readFileSync(resolve(repositoryRoot, path), "utf8")) as NxProjectLike & {
    readonly root: string
  }
}

function ownerFor(projectName: string): string {
  return ownersByProjectName[projectName as keyof typeof ownersByProjectName] ?? "product-migration-agent"
}

function ownerForProjectRoot(path: string): string {
  const projectName = Object.keys(ownersByProjectName).find((name) =>
    path.startsWith(`packages/${name}/`),
  )

  return projectName === undefined ? "product-migration-agent" : ownerFor(projectName)
}

async function importPackageContractModule(
  project: NxProjectLike & { readonly root: string },
): Promise<PackageContractModule> {
  const contractPath = resolve(repositoryRoot, project.root, "src/attune.package.ts")
  const imported = await import(pathToFileURL(contractPath).href) as Partial<PackageContractModule>
  for (const exportName of [
    "PackageContract",
    "PackageLayer",
    "PackageTestLayer",
    "PackageFuzzHandlers",
    "PackageProperties",
    "PackageTypeGuidance",
  ] as const) {
    expect(imported[exportName], `${project.name} ${exportName}`).toBeDefined()
  }
  return imported as PackageContractModule
}

function objectKeys(value: unknown): readonly string[] {
  return value !== null && typeof value === "object"
    ? Object.keys(value).sort()
    : []
}

function guidanceOperations(value: unknown): unknown {
  return value !== null && typeof value === "object" && "operations" in value
    ? (value as { readonly operations: unknown }).operations
    : undefined
}

function layerSummary(value: unknown): {
  readonly hasLayer: boolean
  readonly hasProvides: boolean
  readonly hasRequires: boolean
  readonly packageId: string | null
} {
  if (value === null || typeof value !== "object") {
    return {
      hasLayer: false,
      hasProvides: false,
      hasRequires: false,
      packageId: null,
    }
  }
  const layer = value as {
    readonly layer?: unknown
    readonly provides?: unknown
    readonly requires?: unknown
    readonly metadata?: {
      readonly packageId?: unknown
    }
  }
  return {
    hasLayer: "layer" in layer,
    hasProvides: Array.isArray(layer.provides),
    hasRequires: Array.isArray(layer.requires),
    packageId: typeof layer.metadata?.packageId === "string"
      ? layer.metadata.packageId
      : null,
  }
}
