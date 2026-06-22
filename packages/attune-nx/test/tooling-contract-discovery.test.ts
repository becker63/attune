import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { discoverPackageContracts, type NxProjectLike } from "../src/package-contract-graph.js"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..")

const toolingProjectFiles = [
  "packages/attune-nx/project.json",
  "packages/attune-architecture-lint/project.json",
  "packages/effect-oxlint-policy/project.json",
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
})

function readProject(path: string): NxProjectLike & { readonly root: string } {
  return JSON.parse(readFileSync(resolve(repositoryRoot, path), "utf8")) as NxProjectLike & {
    readonly root: string
  }
}
