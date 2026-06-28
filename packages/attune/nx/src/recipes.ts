import { defineRecipe } from "@attune/framework-protocol"
import { Schema } from "effect"
import { attuneNxGeneratorInventory, type GeneratorInventoryEntry } from "./generator-inventory.js"

export const AttuneNxGeneratorCatalogInput = Schema.Struct({
  packageRoot: Schema.String,
  generatorJsonPath: Schema.String,
})
export type AttuneNxGeneratorCatalogInput = typeof AttuneNxGeneratorCatalogInput.Type

export const AttuneNxGeneratorCatalogEntry = Schema.Struct({
  id: Schema.String,
  publicName: Schema.String,
  kind: Schema.Literals(["scaffold", "sync"] as const),
  implementation: Schema.String,
  schema: Schema.String,
  currentOutput: Schema.Array(Schema.String),
})
export type AttuneNxGeneratorCatalogEntry = typeof AttuneNxGeneratorCatalogEntry.Type

export const AttuneNxGeneratorCatalogOutput = Schema.Struct({
  entries: Schema.Array(AttuneNxGeneratorCatalogEntry),
  missingCapabilities: Schema.Array(Schema.String),
})
export type AttuneNxGeneratorCatalogOutput = typeof AttuneNxGeneratorCatalogOutput.Type

export const AttuneNxGeneratorRunInput = Schema.Struct({
  generator: Schema.String,
  project: Schema.String,
  directory: Schema.optional(Schema.String),
})
export type AttuneNxGeneratorRunInput = typeof AttuneNxGeneratorRunInput.Type

export const AttuneNxGeneratorRunOutput = Schema.Struct({
  writtenFiles: Schema.Array(Schema.String),
  receiptProvenanceFiles: Schema.Array(Schema.String),
  validationTargets: Schema.Array(Schema.String),
})
export type AttuneNxGeneratorRunOutput = typeof AttuneNxGeneratorRunOutput.Type

export const AttuneNxRecipes = [
  defineRecipe({
    id: "attune-nx.generator-catalog",
    projectId: "attune-nx",
    title: "Inventory registered Attune Nx generators",
    inputSchema: AttuneNxGeneratorCatalogInput,
    outputSchema: AttuneNxGeneratorCatalogOutput,
    nxTarget: "attune-nx:test",
    sourcePath: "packages/attune/nx/src/recipes.ts",
    allowedFiles: ["packages/attune/nx/**"],
    validationEvidence: ["attune-nx:test"],
  }),
  defineRecipe({
    id: "attune-nx.local-plugin-registration",
    projectId: "attune-nx",
    title: "Register local Nx plugin entrypoints without generated dist",
    inputSchema: AttuneNxGeneratorCatalogInput,
    outputSchema: AttuneNxGeneratorCatalogOutput,
    dependencies: [{ recipeId: "attune-nx.generator-catalog" }],
    nxTarget: "attune-nx:test",
    sourcePath: "packages/attune/nx/src/recipes.ts",
    allowedFiles: [
      "packages/attune/nx/executors.json",
      "packages/attune/nx/generators.json",
      "packages/attune/nx/src/executors/**/*.cjs",
      "packages/attune/nx/src/generators/**/*.cjs",
    ],
    validationEvidence: ["attune-nx:test", "workspace:policy-fast"],
  }),
  ...attuneNxGeneratorInventory.map((entry) => recipeFromGeneratorInventory(entry)),
  defineRecipe({
    id: "attune-nx.recipe-receipt-provenance",
    projectId: "attune-nx",
    title: "Normalize generator recipe receipt provenance",
    inputSchema: AttuneNxGeneratorRunInput,
    outputSchema: AttuneNxGeneratorRunOutput,
    dependencies: [{ recipeId: "attune-nx.generator-catalog" }],
    nxTarget: "attune-nx:test",
    sourcePath: "packages/attune/nx/src/recipes.ts",
    allowedFiles: ["packages/attune/nx/src/internal/**", "packages/attune/nx/src/generators/**"],
    validationEvidence: ["attune-nx:test", "workspace:framework-policy-check"],
  }),
  defineRecipe({
    id: "attune-nx.cjs-wrapper-generation",
    projectId: "attune-nx",
    title: "Generate CommonJS wrappers for compiled Attune Nx generator entrypoints",
    inputSchema: AttuneNxGeneratorCatalogInput,
    outputSchema: AttuneNxGeneratorRunOutput,
    dependencies: [{ recipeId: "attune-nx.generator-catalog" }],
    nxTarget: "attune-nx:build",
    sourcePath: "packages/attune/nx/src/recipes.ts",
    allowedFiles: [
      "packages/attune/nx/scripts/write-generator-cjs-wrappers.mjs",
      "packages/attune/nx/generators.json",
      "packages/attune/nx/src/generators/**",
    ],
    validationEvidence: ["attune-nx:build", "attune-nx:test"],
  }),
] as const

function recipeFromGeneratorInventory(entry: GeneratorInventoryEntry) {
  return defineRecipe({
    id: `attune-nx.generator.${entry.id}`,
    projectId: "attune-nx",
    title: `Run ${entry.publicName} ${entry.kind} generator as a recipe pipeline`,
    inputSchema: AttuneNxGeneratorRunInput,
    outputSchema: AttuneNxGeneratorRunOutput,
    dependencies: [{ recipeId: "attune-nx.generator-catalog" }],
    nxTarget: "attune-nx:test",
    sourcePath: "packages/attune/nx/src/recipes.ts",
    allowedFiles: [
      `packages/attune/nx/${entry.implementation}`,
      `packages/attune/nx/${entry.schema}`,
      "packages/attune/nx/src/internal/**",
      "packages/attune/nx/src/generator-inventory.ts",
    ],
    validationEvidence: [
      "attune-nx:test",
      "attune-nx:typecheck",
      ...(entry.migrationCapabilities["recipe-receipt-provenance"] === "present"
        ? ["workspace:framework-policy-check"]
        : []),
    ],
  })
}
