import { defineRecipePackage } from "@attune/framework-protocol"

import { AttunePiArtifactRecipes } from "./artifacts/index.js"
import { AttunePiCommandRecipes } from "./commands/index.js"
import { AttunePiDocumentationRecipes } from "./documentation-recipes.js"
import { AttunePiExtensionRecipes } from "./pi-extension.js"
import { AttunePiGeneratorConfigRecipes } from "./generator-config-recipes.js"
import { AttunePiGeneratorRecipes } from "./generators/index.js"
import { AttunePiConversationRecipes } from "./pi/index.js"
import { AttunePiPermissionRecipes } from "./permissions/index.js"
import { AttunePiSchemaRecipes } from "./schema/index.js"
import { AttunePiTestRecipes } from "./test-recipes.js"

export { PiCommandSurface } from "./commands/index.js"
export { PiGeneratorArtifact } from "./generators/renderers.js"

export const AttunePiAgentRecipes = [
  ...AttunePiSchemaRecipes,
  ...AttunePiConversationRecipes,
  ...AttunePiPermissionRecipes,
  ...AttunePiArtifactRecipes,
  ...AttunePiGeneratorConfigRecipes,
  ...AttunePiGeneratorRecipes,
  ...AttunePiCommandRecipes,
  ...AttunePiExtensionRecipes,
  ...AttunePiDocumentationRecipes,
  ...AttunePiTestRecipes,
] as const

// @attune-packet-target generated-runtime-projection eligible
export const AttunePiAgentRecipePackage = defineRecipePackage({
  packageId: "attune-pi-agent",
  kind: "agent-extension",
  title: "Pi agent permission, evidence, generator, and command recipes",
  sourceRoot: "packages/attune/pi-agent/src",
  recipes: AttunePiAgentRecipes,
  ownership: [
    {
      id: "pi-schema-catalog",
      title: "Pi schema and implementation-spec source",
      files: ["packages/attune/pi-agent/src/schema/**"],
      recipeIds: AttunePiSchemaRecipes.map((recipe) => recipe.id),
    },
    {
      id: "pi-root-public-api-catalog",
      title: "Pi public API barrel",
      files: ["packages/attune/pi-agent/src/index.ts"],
      recipeIds: AttunePiAgentRecipes.map((recipe) => recipe.id),
    },
    {
      id: "pi-artifact-recipe-catalog",
      title: "Pi artifact recipe catalog",
      files: ["packages/attune/pi-agent/src/artifacts/index.ts"],
      recipeIds: AttunePiArtifactRecipes.map((recipe) => recipe.id),
    },
    {
      id: "pi-conversation-and-command-surface",
      title: "Pi conversation adapters, command handlers, and extension entrypoint",
      files: [
        "packages/attune/pi-agent/src/commands/**",
        "packages/attune/pi-agent/src/pi/**",
        "packages/attune/pi-agent/src/pi-extension.ts",
        "packages/attune/pi-agent/src/index.ts",
      ],
      recipeIds: [
        ...AttunePiConversationRecipes,
        ...AttunePiCommandRecipes,
        ...AttunePiExtensionRecipes,
      ].map((recipe) => recipe.id),
    },
    {
      id: "pi-conversation-recipe-catalog",
      title: "Pi conversation recipe catalog",
      files: ["packages/attune/pi-agent/src/pi/index.ts"],
      recipeIds: AttunePiConversationRecipes.map((recipe) => recipe.id),
    },
    {
      id: "pi-permission-policy",
      title: "Pi deny-first permission profile and permission decision source",
      files: [
        "packages/attune/pi-agent/src/permissions/**",
        "packages/attune/pi-agent/src/schema/permission-profile.ts",
      ],
      recipeIds: AttunePiPermissionRecipes.map((recipe) => recipe.id),
    },
    {
      id: "pi-permission-recipe-catalog",
      title: "Pi permission recipe catalog",
      files: ["packages/attune/pi-agent/src/permissions/index.ts"],
      recipeIds: AttunePiPermissionRecipes.map((recipe) => recipe.id),
    },
    {
      id: "pi-evidence-and-run-artifacts",
      title: "Evidence matrix reports and local run artifact projections",
      files: [
        "packages/attune/pi-agent/src/artifacts/**",
        ".attune-runs/**",
      ],
      recipeIds: AttunePiArtifactRecipes.map((recipe) => recipe.id),
    },
    {
      id: "pi-generators-and-config",
      title: "Pi generator config, renderers, and generator entrypoints",
      files: [
        "packages/attune/pi-agent/generators.json",
        "packages/attune/pi-agent/src/generators/**",
      ],
      recipeIds: [
        ...AttunePiGeneratorConfigRecipes,
        ...AttunePiGeneratorRecipes,
      ].map((recipe) => recipe.id),
    },
    {
      id: "pi-docs-tests-and-fixtures",
      title: "Pi docs, tests, and implementation-spec fixtures",
      files: [
        "packages/attune/pi-agent/docs/**",
        "packages/attune/pi-agent/src/fixtures/**",
        "packages/attune/pi-agent/test/**",
        "packages/attune/pi-agent/vitest.config.ts",
      ],
      recipeIds: [
        ...AttunePiDocumentationRecipes,
        ...AttunePiTestRecipes,
      ].map((recipe) => recipe.id),
    },
  ],
})
