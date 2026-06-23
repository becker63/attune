import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

import { describe, expect, it } from "vitest"

import {
  derivePackageContractWorkspaceGraph,
  discoverPackageContracts,
  type NxProjectLike,
} from "../src/package-contract-graph.js"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")

const toolingProjectFiles = [
  "packages/attune-nx/project.json",
  "framework/architecture/project.json",
  "framework/oxlint-policy/project.json",
] as const

describe("tooling package contract discovery", () => {
  it("requires Phase 4 tooling packages to expose contract and typecheck modules", () => {
    const projects = Object.fromEntries(
      toolingProjectFiles.map((projectFile) => {
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
      missingContractFiles: discovery.missingContracts.map((entry) => entry.contractPath),
      missingTypecheckFiles,
    }).toEqual({
      missingContractFiles: [],
      missingTypecheckFiles: [],
    })
  })

  it("derives graph metadata from Phase 4 tooling package contracts", async () => {
    const graph = derivePackageContractWorkspaceGraph(
      await Promise.all(
        toolingProjectFiles.map(async (projectFile) => {
          const project = readProject(projectFile)
          return {
            projectName: project.name ?? project.root,
            projectRoot: project.root,
            ...(project.sourceRoot === undefined ? {} : { sourceRoot: project.sourceRoot }),
            contractPath: `${project.root}/src/attune.package.ts`,
            module: await importPackageContractModule(project),
          }
        }),
      ),
    )

    expect(graph.projects.map((project) => ({
      projectName: project.projectName,
      packageId: project.packageId,
      operationCount: project.operationCount,
    }))).toEqual([
      expect.objectContaining({
        projectName: "attune-nx",
        packageId: "attune-nx",
        operationCount: expect.any(Number),
      }),
      expect.objectContaining({
        projectName: "attune-architecture",
        packageId: "attune-architecture",
        operationCount: expect.any(Number),
      }),
      expect.objectContaining({
        projectName: "effect-oxlint-policy",
        packageId: "effect-oxlint-policy",
        operationCount: expect.any(Number),
      }),
    ])
    expect(graph.projectMetadata["attune-nx"]?.attune.packageContract.targetSemantics.map((target) => target.targetName)).toContain(
      "service-conformance",
    )
  })
})

function readProject(path: string): NxProjectLike & { readonly root: string } {
  return JSON.parse(readFileSync(resolve(repositoryRoot, path), "utf8")) as NxProjectLike & {
    readonly root: string
  }
}

async function importPackageContractModule(
  project: NxProjectLike & { readonly root: string },
) {
  const contractPath = resolve(repositoryRoot, project.root, "src/attune.package.ts")
  return await import(pathToFileURL(contractPath).href)
}
