import {
  RecipeDbEmissionView,
  RecipeRegistry,
  defineRecipe,
  type RecipeDefinition,
} from "@attune/framework-protocol"
import { Schema } from "effect"

import { AttuneArchitectureRecipes } from "./framework/architecture/src/recipes.js"
import { FrameworkLanguageServiceRecipes } from "./framework/language-service/src/recipes.js"
import { FrameworkNxRecipes } from "./framework/nx/src/recipes.js"
import { FrameworkOxlintPolicyRecipes } from "./framework/oxlint-policy/src/recipes.js"
import { FrameworkProtocolRecipes } from "./framework/protocol/src/recipes/index.js"
import { FrameworkRuntimeRecipes } from "./framework/runtime/src/recipes.js"
import { FrameworkTestingRecipes } from "./framework/testing/src/recipes.js"
import { FoldKitReportRecipes } from "./packages/attune-foldkit/src/recipes.js"
import { AttuneNxRecipes } from "./packages/attune-nx/src/recipes.js"
import { AttunePiAgentRecipes } from "./packages/attune-pi-agent/src/recipes.js"
import { AttuneDiscoveryRecipes } from "./packages/attuned-discovery/src/index.js"
import { CocoIndexEffectRecipes } from "./packages/cocoindex-effect/src/recipes.js"
import { CanopyManagedRecipes } from "./packages/home-deployment/src/recipes.js"
import { JoernFuzzerRecipes } from "./packages/joern-effect-properties/src/recipes.js"
import { JoernProofRecipes } from "./packages/joern-effect/src/recipes.js"
import { PlatformAlchemyK8sRecipes } from "./packages/platform-alchemy-k8s/src/recipes.js"
import { TendCoreRecipes } from "./tend/packages/core/src/index.js"
import { TendDbRecipes } from "./tend/packages/db/src/index.js"
import { TendLongJobRecipes } from "./tend/packages/long-job/src/index.js"
import { TendOpenCodeRecipes } from "./tend/packages/opencode/src/index.js"
import { TendPolicyRecipes } from "./tend/packages/policies/src/index.js"
import { TendReportRecipes } from "./tend/packages/reporting/src/index.js"
import { TendTokenAuditRecipes } from "./tend/packages/token-audit/src/index.js"

type AnyRecipe = RecipeDefinition<unknown, unknown>

const asRecipes = (
  recipes: readonly RecipeDefinition[],
): readonly AnyRecipe[] => recipes as readonly AnyRecipe[]

export const WorkspaceRecipeCatalogInput = Schema.Struct({
  workspaceRoot: Schema.String,
})
export type WorkspaceRecipeCatalogInput = typeof WorkspaceRecipeCatalogInput.Type

export const WorkspaceRecipeCatalogOutput = Schema.Struct({
  projectCount: Schema.Number,
  recipeCount: Schema.Number,
  cleanFork: Schema.Boolean,
  activeProjects: Schema.Array(Schema.String),
})
export type WorkspaceRecipeCatalogOutput = typeof WorkspaceRecipeCatalogOutput.Type

export const WorkspacePackageDbEmissionOutput = Schema.Struct({
  projectCount: Schema.Number,
  recipeRows: Schema.Number,
  edgeRows: Schema.Number,
  ioRows: Schema.Number,
  healthRows: Schema.Number,
  emitReadyProjectCount: Schema.Number,
  activeProjects: Schema.Array(Schema.String),
  dbSpine: Schema.Literal("generic-timescaledb-postgres-recipe-spine"),
})
export type WorkspacePackageDbEmissionOutput =
  typeof WorkspacePackageDbEmissionOutput.Type

export const WorkspaceLegacyArchiveInput = Schema.Struct({
  archivePath: Schema.String,
  replacementRecipeId: Schema.String,
})
export type WorkspaceLegacyArchiveInput = typeof WorkspaceLegacyArchiveInput.Type

export const WorkspaceLegacyArchiveOutput = Schema.Struct({
  archived: Schema.Boolean,
  activeProject: Schema.Boolean,
  replacementSubstrate: Schema.Literal("framework-runtime.local-timescaledb"),
  compatibilityPath: Schema.Literal("none"),
})
export type WorkspaceLegacyArchiveOutput = typeof WorkspaceLegacyArchiveOutput.Type

export const WorkspaceRecipes = [
  defineRecipe({
    id: "workspace.recipe-catalog",
    projectId: "workspace",
    title: "Aggregate active package recipe declarations",
    inputSchema: WorkspaceRecipeCatalogInput,
    outputSchema: WorkspaceRecipeCatalogOutput,
    nxTarget: "workspace:policy-fast",
    sourcePath: "recipes.ts",
    allowedFiles: ["recipes.ts", "framework/**", "packages/**", "tend/**"],
    validationEvidence: ["attune-architecture:test", "workspace:policy-fast"],
  }),
  defineRecipe({
    id: "workspace.clean-fork-policy",
    projectId: "workspace",
    title: "Enforce clean-fork recipe substrate migration policy",
    inputSchema: WorkspaceRecipeCatalogInput,
    outputSchema: WorkspaceRecipeCatalogOutput,
    dependencies: [{ recipeId: "workspace.recipe-catalog" }],
    nxTarget: "workspace:framework-policy-check",
    sourcePath: "recipes.ts",
    allowedFiles: [
      "openspec/changes/arbor-recipe-substrate-migration/**",
      "framework/**",
      "packages/**",
      "tend/**",
    ],
    validationEvidence: ["openspec validate arbor-recipe-substrate-migration --strict", "workspace:policy-fast"],
  }),
  defineRecipe({
    id: "workspace.package-db-emission",
    projectId: "workspace",
    title: "Project every active package recipe into the generic TimescaleDB/Postgres spine",
    inputSchema: WorkspaceRecipeCatalogInput,
    outputSchema: WorkspacePackageDbEmissionOutput,
    dependencies: [
      { recipeId: "workspace.recipe-catalog" },
      { recipeId: "framework-runtime.receipt-store" },
      { recipeId: "framework-runtime.local-timescaledb" },
    ],
    nxTarget: "workspace:policy-fast",
    sourcePath: "recipes.ts",
    allowedFiles: [
      "recipes.ts",
      "framework/protocol/**",
      "framework/runtime/**",
      "packages/**",
      "tend/**",
    ],
    validationEvidence: [
      "attune-architecture:test",
      "framework-runtime:test",
      "workspace:policy-fast",
    ],
  }),
  defineRecipe({
    id: "workspace.legacy-sqlite-archive",
    projectId: "workspace",
    title: "Archive legacy SQLite program fact/index stores",
    inputSchema: WorkspaceLegacyArchiveInput,
    outputSchema: WorkspaceLegacyArchiveOutput,
    dependencies: [
      { recipeId: "workspace.clean-fork-policy" },
      { recipeId: "framework-runtime.local-timescaledb" },
    ],
    nxTarget: "workspace:framework-policy-check",
    sourcePath: "recipes.ts",
    allowedFiles: ["framework/archive/legacy-sqlite/**", "recipes.ts", ".nxignore", "tsconfig.base.json"],
    validationEvidence: ["attune-architecture:test", "workspace:policy-fast"],
  }),
] as const

export const WorkspacePackageRecipeCatalog = [
  { projectId: "workspace", recipes: asRecipes(WorkspaceRecipes) },
  { projectId: "attune-architecture", recipes: asRecipes(AttuneArchitectureRecipes) },
  { projectId: "framework-language-service", recipes: asRecipes(FrameworkLanguageServiceRecipes) },
  { projectId: "framework-nx", recipes: asRecipes(FrameworkNxRecipes) },
  { projectId: "effect-oxlint-policy", recipes: asRecipes(FrameworkOxlintPolicyRecipes) },
  { projectId: "framework-protocol", recipes: asRecipes(FrameworkProtocolRecipes) },
  { projectId: "framework-runtime", recipes: asRecipes(FrameworkRuntimeRecipes) },
  { projectId: "framework-testing", recipes: asRecipes(FrameworkTestingRecipes) },
  { projectId: "attune-foldkit", recipes: asRecipes(FoldKitReportRecipes) },
  { projectId: "attune-nx", recipes: asRecipes(AttuneNxRecipes) },
  { projectId: "attune-pi-agent", recipes: asRecipes(AttunePiAgentRecipes) },
  { projectId: "attuned-discovery", recipes: asRecipes(AttuneDiscoveryRecipes) },
  { projectId: "cocoindex-effect", recipes: asRecipes(CocoIndexEffectRecipes) },
  { projectId: "home-deployment", recipes: asRecipes(CanopyManagedRecipes) },
  { projectId: "joern-effect-properties", recipes: asRecipes(JoernFuzzerRecipes) },
  { projectId: "joern-effect", recipes: asRecipes(JoernProofRecipes) },
  { projectId: "platform-alchemy-k8s", recipes: asRecipes(PlatformAlchemyK8sRecipes) },
  { projectId: "tend-core", recipes: asRecipes(TendCoreRecipes) },
  { projectId: "tend-db", recipes: asRecipes(TendDbRecipes) },
  { projectId: "tend-long-job", recipes: asRecipes(TendLongJobRecipes) },
  { projectId: "tend-opencode", recipes: asRecipes(TendOpenCodeRecipes) },
  { projectId: "tend-policies", recipes: asRecipes(TendPolicyRecipes) },
  { projectId: "tend-reporting", recipes: asRecipes(TendReportRecipes) },
  { projectId: "tend-token-audit", recipes: asRecipes(TendTokenAuditRecipes) },
] as const

export const WorkspaceRecipeProjectIds = WorkspacePackageRecipeCatalog.map((entry) => entry.projectId)

export const WorkspaceAllRecipes: readonly AnyRecipe[] =
  WorkspacePackageRecipeCatalog.flatMap((entry) => entry.recipes)

export const WorkspaceRecipeRegistry = RecipeRegistry.fromRecipes(WorkspaceAllRecipes)

export const workspaceRecipeCatalogOutput = (): WorkspaceRecipeCatalogOutput => ({
  projectCount: WorkspacePackageRecipeCatalog.length,
  recipeCount: WorkspaceAllRecipes.length,
  cleanFork: true,
  activeProjects: [...WorkspaceRecipeProjectIds],
})

export const workspacePackageDbEmissionOutput = (): WorkspacePackageDbEmissionOutput => {
  const emission = RecipeDbEmissionView.fromRecipes(WorkspaceAllRecipes)
  return {
    projectCount: WorkspacePackageRecipeCatalog.length,
    recipeRows: emission.recipes.length,
    edgeRows: emission.edges.length,
    ioRows: emission.io.length,
    healthRows: emission.health.length,
    emitReadyProjectCount: WorkspacePackageRecipeCatalog.filter((entry) => entry.recipes.length > 0).length,
    activeProjects: [...WorkspaceRecipeProjectIds],
    dbSpine: "generic-timescaledb-postgres-recipe-spine",
  }
}
