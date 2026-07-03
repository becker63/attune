import { defineRecipePackage } from "@attune/framework-protocol"

import { CocoIndexClientRecipes } from "./CocoIndexClient.js"
import { CocoIndexClientFixtureRecipes } from "./CocoIndexClientFixture.js"
import { CocoIndexErrorRecipes } from "./errors.js"
import { CocoIndexModelRecipes } from "./model.js"
import { CocoIndexGenerationCliRecipes } from "./internal/generation/CocoIndexGenerationCli.js"
import { CocoIndexTestRecipes } from "./test-recipes.js"
import { CocoIndexMcpTypesRecipes } from "./internal/generation/CocoIndexMcpTypes.js"
import { CocoIndexSearchToolRecipes } from "./cocoindex/tools/search.js"
import { CocoIndexToolRegistryRecipes } from "./cocoindex/tools/index.js"
import { CocoIndexMcpSchemaRecipes } from "./cocoindex/mcp-schema.js"
import { CocoIndexClientLiveRecipes } from "./CocoIndexClientLive.js"
import { CocoIndexMcpStdioRecipes } from "./mcp/stdio.js"
import { RepositoryIntelligenceRecipes } from "./RepositoryIntelligence.js"

export const CocoIndexEffectRecipes = [
  ...CocoIndexModelRecipes,
  ...CocoIndexClientRecipes,
  ...CocoIndexClientFixtureRecipes,
  ...CocoIndexErrorRecipes,
  ...CocoIndexGenerationCliRecipes,
  ...CocoIndexTestRecipes,
  ...CocoIndexMcpTypesRecipes,
  ...CocoIndexSearchToolRecipes,
  ...CocoIndexToolRegistryRecipes,
  ...CocoIndexMcpSchemaRecipes,
  ...CocoIndexClientLiveRecipes,
  ...CocoIndexMcpStdioRecipes,
  ...RepositoryIntelligenceRecipes,
] as const

// @attune-packet-target generated-runtime-projection eligible
export const CocoIndexEffectRecipePackage = defineRecipePackage({
  packageId: "cocoindex-effect",
  kind: "semantic-recall-service",
  title: "CocoIndex Effect semantic recall recipes",
  sourceRoot: "packages/attune/cocoindex-effect/src",
  recipes: CocoIndexEffectRecipes,
  ownership: [
    {
      id: "semantic-recall",
      title: "CocoIndex indexing, search, MCP, and repository-session source",
      files: [
        "packages/attune/cocoindex-effect/src/CocoIndexClient.ts",
        "packages/attune/cocoindex-effect/src/CocoIndexClientFixture.ts",
        "packages/attune/cocoindex-effect/src/CocoIndexClientLive.ts",
        "packages/attune/cocoindex-effect/src/RepositoryIntelligence.ts",
        "packages/attune/cocoindex-effect/src/cocoindex/mcp-schema.ts",
        "packages/attune/cocoindex-effect/src/cocoindex/tools/index.ts",
        "packages/attune/cocoindex-effect/src/cocoindex/tools/search.ts",
        "packages/attune/cocoindex-effect/src/errors.ts",
        "packages/attune/cocoindex-effect/src/index.ts",
        "packages/attune/cocoindex-effect/src/internal/generation/CocoIndexGenerationCli.ts",
        "packages/attune/cocoindex-effect/src/internal/generation/CocoIndexMcpTypes.ts",
        "packages/attune/cocoindex-effect/src/mcp/stdio.ts",
        "packages/attune/cocoindex-effect/src/model.ts",
        "packages/attune/cocoindex-effect/src/test-recipes.ts",
        "packages/attune/cocoindex-effect/test/**",
        "packages/attune/cocoindex-effect/vitest.config.ts",
      ],
      recipeIds: CocoIndexEffectRecipes.map((recipe) => recipe.id),
    },
  ],
})
