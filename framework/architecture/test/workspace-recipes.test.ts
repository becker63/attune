import { describe, expect, it } from "vitest"

import {
  WorkspaceAllRecipes,
  WorkspacePackageRecipeCatalog,
  WorkspaceRecipeProjectIds,
  WorkspaceRecipeRegistry,
  workspacePackageDbEmissionOutput,
  workspaceRecipeCatalogOutput,
} from "../../../recipes.js"

describe("workspace recipe catalog", () => {
  it("covers every active Nx project with a public recipe surface", () => {
    expect(WorkspaceRecipeProjectIds).toEqual([
      "workspace",
      "attune-architecture",
      "framework-language-service",
      "framework-nx",
      "effect-oxlint-policy",
      "framework-protocol",
      "framework-runtime",
      "framework-testing",
      "attune-foldkit",
      "attune-nx",
      "attune-pi-agent",
      "attuned-discovery",
      "cocoindex-effect",
      "home-deployment",
      "joern-effect-properties",
      "joern-effect",
      "platform-alchemy-k8s",
      "tend-core",
      "tend-db",
      "tend-long-job",
      "tend-opencode",
      "tend-policies",
      "tend-reporting",
      "tend-token-audit",
    ])
    expect(WorkspacePackageRecipeCatalog.every((entry) => entry.recipes.length > 0)).toBe(true)
    expect(WorkspaceAllRecipes.map((recipe) => recipe.id)).toContain("workspace.clean-fork-policy")
    expect(WorkspaceAllRecipes.map((recipe) => recipe.id)).toContain("workspace.package-db-emission")
    expect(WorkspaceAllRecipes.map((recipe) => recipe.id)).toContain("workspace.legacy-sqlite-archive")
    expect(WorkspaceRecipeRegistry.snapshot().duplicateRecipeIds).toEqual([])
    expect(workspaceRecipeCatalogOutput()).toMatchObject({
      projectCount: 24,
      cleanFork: true,
    })
    expect(workspacePackageDbEmissionOutput()).toMatchObject({
      projectCount: 24,
      recipeRows: WorkspaceAllRecipes.length,
      ioRows: WorkspaceAllRecipes.length * 2,
      healthRows: WorkspaceAllRecipes.length,
      emitReadyProjectCount: 24,
      dbSpine: "generic-timescaledb-postgres-recipe-spine",
    })
  })
})
