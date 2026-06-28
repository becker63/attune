import {
  defineManagedRecipe,
  defineRecipe,
  type RecipeRepair,
} from "@attune/framework-protocol"
import { Schema } from "effect"

import {
  AnchorCard,
  EnsureIndexedRequest,
  EnsureIndexedResult,
  SearchAnchorsRequest,
  SearchSimilarAnchorsRequest,
} from "./model.js"
import {
  RepositorySessionRequest,
  RepositoryToolStatus,
} from "./RepositoryIntelligence.js"

export const RepositoryIntelligenceSessionRecipeOutput = Schema.Struct({
  repoPath: Schema.String,
  repoSnapshotId: Schema.String,
  runId: Schema.String,
  status: Schema.Array(RepositoryToolStatus),
})
export type RepositoryIntelligenceSessionRecipeOutput = typeof RepositoryIntelligenceSessionRecipeOutput.Type

export const CocoIndexGeneratedPipelineInput = Schema.Struct({
  projectRoot: Schema.String,
  target: Schema.String,
  generator: Schema.optional(Schema.String),
})
export type CocoIndexGeneratedPipelineInput = typeof CocoIndexGeneratedPipelineInput.Type

export const CocoIndexGeneratedPipelineOutput = Schema.Struct({
  target: Schema.String,
  generatedFiles: Schema.Array(Schema.String),
  provenanceOwner: Schema.String,
})
export type CocoIndexGeneratedPipelineOutput = typeof CocoIndexGeneratedPipelineOutput.Type

export const cocoIndexRepositorySessionRepair: RecipeRepair = {
  repairId: "recipe-repair:cocoindex-effect.repository-session:drift",
  recipeId: "cocoindex-effect.repository-session",
  title: "Repair repository intelligence session lifecycle",
  kind: "managed-lifecycle",
  nxTarget: "cocoindex-effect:test",
  allowedFiles: ["packages/attune/cocoindex-effect/**"],
  risk: "needs-review",
  evidenceRequirements: ["cocoindex-effect:test"],
}

export const CocoIndexEffectRecipes = [
  defineRecipe({
    id: "cocoindex-effect.mcp-tool-generation",
    projectId: "cocoindex-effect",
    title: "Run CocoIndex MCP tool generation stages as a recipe-backed pipeline",
    inputSchema: CocoIndexGeneratedPipelineInput,
    outputSchema: CocoIndexGeneratedPipelineOutput,
    nxTarget: "cocoindex-effect:generate",
    sourcePath: "packages/attune/cocoindex-effect/src/recipes.ts",
    allowedFiles: [
      "packages/attune/cocoindex-effect/scripts/generationStage.ts",
      "packages/attune/cocoindex-effect/scripts/generate-cocoindex-mcp-types.ts",
      "packages/attune/cocoindex-effect/src/generated/**",
      "packages/attune/cocoindex-effect/project.json",
    ],
    validationEvidence: ["cocoindex-effect:generate", "cocoindex-effect:generate"],
  }),
  defineRecipe({
    id: "cocoindex-effect.emit-mcp-schema",
    projectId: "cocoindex-effect",
    title: "Generate typed CocoIndex MCP schema from tool inspection",
    inputSchema: CocoIndexGeneratedPipelineInput,
    outputSchema: CocoIndexGeneratedPipelineOutput,
    dependencies: [{ recipeId: "cocoindex-effect.mcp-tool-generation" }],
    nxTarget: "cocoindex-effect:generate",
    sourcePath: "packages/attune/cocoindex-effect/src/recipes.ts",
    allowedFiles: [
      "packages/attune/cocoindex-effect/scripts/generate-cocoindex-mcp-types.ts",
      "packages/attune/cocoindex-effect/src/generated/**",
      "packages/attune/cocoindex-effect/project.json",
    ],
    validationEvidence: ["cocoindex-effect:generate", "cocoindex-effect:test"],
  }),
  defineRecipe({
    id: "cocoindex-effect.scaffold-mcp-tool",
    projectId: "cocoindex-effect",
    title: "Generate CocoIndex MCP tool adapters through @attune/nx",
    inputSchema: CocoIndexGeneratedPipelineInput,
    outputSchema: CocoIndexGeneratedPipelineOutput,
    dependencies: [{ recipeId: "cocoindex-effect.emit-mcp-schema" }],
    nxTarget: "cocoindex-effect:generate",
    sourcePath: "packages/attune/cocoindex-effect/src/recipes.ts",
    allowedFiles: [
      "packages/attune/cocoindex-effect/src/cocoindex/tools/**",
      "packages/attune/nx/src/generators/cocoindex-mcp-tool/**",
    ],
    validationEvidence: ["cocoindex-effect:test", "attune-nx:test"],
  }),
  defineRecipe({
    id: "cocoindex-effect.sync-mcp-tools",
    projectId: "cocoindex-effect",
    title: "Generate CocoIndex MCP tool registry",
    inputSchema: CocoIndexGeneratedPipelineInput,
    outputSchema: CocoIndexGeneratedPipelineOutput,
    dependencies: [{ recipeId: "cocoindex-effect.scaffold-mcp-tool" }],
    nxTarget: "cocoindex-effect:generate",
    sourcePath: "packages/attune/cocoindex-effect/src/recipes.ts",
    allowedFiles: [
      "packages/attune/cocoindex-effect/src/cocoindex/tools/**",
      "packages/attune/nx/src/generators/sync-cocoindex-mcp-tools/**",
    ],
    validationEvidence: ["cocoindex-effect:generate", "cocoindex-effect:test"],
  }),
  defineRecipe({
    id: "cocoindex-effect.generated-surface-check",
    projectId: "cocoindex-effect",
    title: "Validate generated CocoIndex MCP schema and registry freshness",
    inputSchema: CocoIndexGeneratedPipelineInput,
    outputSchema: CocoIndexGeneratedPipelineOutput,
    dependencies: [{ recipeId: "cocoindex-effect.sync-mcp-tools" }],
    nxTarget: "cocoindex-effect:generate",
    sourcePath: "packages/attune/cocoindex-effect/src/recipes.ts",
    allowedFiles: [
      "packages/attune/cocoindex-effect/src/generated/**",
      "packages/attune/cocoindex-effect/src/cocoindex/tools/**",
      "packages/attune/cocoindex-effect/project.json",
    ],
    validationEvidence: ["cocoindex-effect:generate", "cocoindex-effect:test"],
  }),
  defineRecipe({
    id: "cocoindex-effect.ensure-indexed",
    projectId: "cocoindex-effect",
    title: "Ensure CocoIndex has a repository snapshot indexed",
    inputSchema: EnsureIndexedRequest,
    outputSchema: EnsureIndexedResult,
    dependencies: [{ recipeId: "cocoindex-effect.generated-surface-check" }],
    nxTarget: "cocoindex-effect:test",
    sourcePath: "packages/attune/cocoindex-effect/src/recipes.ts",
    allowedFiles: ["packages/attune/cocoindex-effect/src/**"],
    validationEvidence: ["cocoindex-effect:test"],
  }),
  defineRecipe({
    id: "cocoindex-effect.search-anchors",
    projectId: "cocoindex-effect",
    title: "Normalize CocoIndex recall into AnchorCards",
    inputSchema: SearchAnchorsRequest,
    outputSchema: Schema.Array(AnchorCard),
    dependencies: [{ recipeId: "cocoindex-effect.ensure-indexed" }],
    nxTarget: "cocoindex-effect:test",
    sourcePath: "packages/attune/cocoindex-effect/src/recipes.ts",
    allowedFiles: ["packages/attune/cocoindex-effect/src/**"],
    validationEvidence: ["cocoindex-effect:test"],
  }),
  defineRecipe({
    id: "cocoindex-effect.search-similar-anchors",
    projectId: "cocoindex-effect",
    title: "Find related AnchorCards through CocoIndex",
    inputSchema: SearchSimilarAnchorsRequest,
    outputSchema: Schema.Array(AnchorCard),
    dependencies: [{ recipeId: "cocoindex-effect.search-anchors" }],
    nxTarget: "cocoindex-effect:test",
    sourcePath: "packages/attune/cocoindex-effect/src/recipes.ts",
    allowedFiles: ["packages/attune/cocoindex-effect/src/**"],
    validationEvidence: ["cocoindex-effect:test"],
  }),
  defineManagedRecipe({
    id: "cocoindex-effect.repository-session",
    projectId: "cocoindex-effect",
    title: "Manage repository intelligence tool session",
    inputSchema: RepositorySessionRequest,
    outputSchema: RepositoryIntelligenceSessionRecipeOutput,
    dependencies: [
      { recipeId: "cocoindex-effect.ensure-indexed" },
      { recipeId: "cocoindex-effect.sync-mcp-tools" },
    ],
    nxTarget: "cocoindex-effect:test",
    sourcePath: "packages/attune/cocoindex-effect/src/recipes.ts",
    allowedFiles: ["packages/attune/cocoindex-effect/src/**"],
    validationEvidence: ["cocoindex-effect:test"],
    lifecycle: ["plan", "apply", "check", "destroy"],
    resourceKind: "repository-intelligence-session",
    lifecycleSubstrates: [
      {
        id: "cocoindex-effect.mcp-stdio",
        kind: "container-runtime",
        tool: "cocoindex-mcp-stdio",
        lifecycleActions: ["plan", "apply", "check", "destroy"],
        evidence: ["cocoindex-effect:test"],
      },
    ],
    observedState: { status: "unknown" },
    driftRepair: cocoIndexRepositorySessionRepair,
    humanReviewRequired: true,
  }),
] as const
