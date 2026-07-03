import {
  RecipeDbEmissionView,
  RecipeRegistry,
  defineAlchemyResource,
  defineRecipe,
  defineRecipeHandler,
  type AnyRecipeDefinition,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import { AttuneArchitectureRecipes } from "./architecture/src/recipes.js"
import { FrameworkLanguageServiceRecipes } from "./language-service/src/recipes.js"
import { FrameworkNxRecipes } from "./nx/src/recipes.js"
import { FrameworkProtocolRecipes } from "./protocol/src/recipes/index.js"
import { FrameworkRuntimeRecipes } from "./runtime/src/recipes.js"
import { FrameworkTestingRecipes } from "./testing/src/recipes.js"
import { AttunePiAgentRecipes } from "../attune/pi-agent/src/recipes.js"
import { AttuneDiscoveryRecipes } from "../attune/discovery/src/index.js"
import { CocoIndexEffectRecipes } from "../attune/cocoindex-effect/src/recipes.js"
import { CanopyManagedRecipes } from "../canopy/home-deployment/src/recipes.js"
import { JoernFuzzerRecipes } from "../attune/joern-effect-properties/src/recipes.js"
import { JoernProofRecipes } from "../attune/joern-effect/src/recipes.js"
import { PlatformAlchemyK8sRecipes } from "../canopy/platform-alchemy-k8s/src/recipes.js"
import { TendCoreRecipes } from "../tend/core/src/recipes.js"
import { TendDbRecipes } from "../tend/db/src/recipes.js"
import { TendLongJobRecipes } from "../tend/long-job/src/recipes.js"
import { TendOpenCodeRecipes } from "../tend/opencode/src/recipes.js"
import { TendPolicyRecipes } from "../tend/policies/src/recipes.js"
import { TendReportRecipes } from "../tend/reporting/src/recipes.js"
import { TendTokenAuditRecipes } from "../tend/token-audit/src/recipes.js"

type AnyRecipe = AnyRecipeDefinition
const workspaceRecipesSourcePath = "packages/trellis/recipes.ts" as const
const workspaceRecipeCatalogRecipeId = "workspace.recipe-catalog" as const
const workspaceRecipeCatalogSourceRecipeId = "workspace.recipe-catalog.source" as const
const workspaceCleanForkPolicyRecipeId = "workspace.clean-fork-policy" as const
const workspacePackageDbEmissionRecipeId = "workspace.package-db-emission" as const
const attuneFoldKitWorkspaceCatalogRecipeId = "attune-foldkit.workspace-catalog" as const
const attuneFoldKitWorkspaceCatalogSourceRecipeId = "attune-foldkit.workspace-catalog.source" as const
const frameworkRuntimeLocalTimescaleRecipeId = "framework-runtime.local-timescaledb" as const

const asRecipes = (
  recipes: readonly AnyRecipeDefinition[],
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

export const AttuneFoldKitWorkspaceCatalogInput = Schema.Struct({
  packageId: Schema.Literal("attune-foldkit"),
})
export type AttuneFoldKitWorkspaceCatalogInput =
  typeof AttuneFoldKitWorkspaceCatalogInput.Type

export const AttuneFoldKitWorkspaceCatalogOutput = Schema.Struct({
  packageId: Schema.Literal("attune-foldkit"),
  packageCatalogSourcePath: Schema.String,
  importsBrowserRuntime: Schema.Boolean,
})
export type AttuneFoldKitWorkspaceCatalogOutput =
  typeof AttuneFoldKitWorkspaceCatalogOutput.Type

export const AttuneFoldKitWorkspaceCatalogResource = defineAlchemyResource({
  id: "attune-foldkit.workspace-catalog.resource",
  kind: "package-metadata",
  alchemyType: "attune:resource:FoldKitWorkspaceCatalog",
  ownerRecipeId: attuneFoldKitWorkspaceCatalogRecipeId,
  producedBy: [attuneFoldKitWorkspaceCatalogRecipeId],
  consumedBy: [attuneFoldKitWorkspaceCatalogRecipeId],
  addressSchema: AttuneFoldKitWorkspaceCatalogInput,
  stateSchema: AttuneFoldKitWorkspaceCatalogOutput,
  modes: ["read", "project", "check"],
})

export const WorkspaceRecipeCatalogResource = defineAlchemyResource({
  id: "workspace.recipe-catalog.resource",
  kind: "package-metadata",
  alchemyType: "attune:resource:WorkspaceRecipeCatalog",
  ownerRecipeId: workspaceRecipeCatalogRecipeId,
  producedBy: [workspaceRecipeCatalogRecipeId],
  consumedBy: [
    workspaceRecipeCatalogRecipeId,
    workspaceCleanForkPolicyRecipeId,
    workspacePackageDbEmissionRecipeId,
  ],
  addressSchema: WorkspaceRecipeCatalogInput,
  stateSchema: WorkspaceRecipeCatalogOutput,
  modes: ["read", "project", "check"],
})

export const WorkspaceCleanForkPolicyResource = defineAlchemyResource({
  id: "workspace.clean-fork-policy.resource",
  kind: "report",
  alchemyType: "attune:resource:WorkspaceCleanForkPolicy",
  ownerRecipeId: workspaceCleanForkPolicyRecipeId,
  producedBy: [workspaceCleanForkPolicyRecipeId],
  consumedBy: [workspaceCleanForkPolicyRecipeId, workspacePackageDbEmissionRecipeId],
  addressSchema: WorkspaceRecipeCatalogInput,
  stateSchema: WorkspaceRecipeCatalogOutput,
  modes: ["read", "check"],
})

export const WorkspacePackageDbEmissionResource = defineAlchemyResource({
  id: "workspace.package-db-emission.resource",
  kind: "report",
  alchemyType: "attune:resource:WorkspacePackageDbEmission",
  ownerRecipeId: workspacePackageDbEmissionRecipeId,
  producedBy: [workspacePackageDbEmissionRecipeId],
  consumedBy: [workspacePackageDbEmissionRecipeId],
  addressSchema: WorkspaceRecipeCatalogInput,
  stateSchema: WorkspacePackageDbEmissionOutput,
  modes: ["read", "project", "check"],
})

export const WorkspaceRecipeCatalogHandler = defineRecipeHandler<
  WorkspaceRecipeCatalogInput,
  WorkspaceRecipeCatalogOutput
>({
  id: "workspace.recipe-catalog.handler",
  recipeId: workspaceRecipeCatalogRecipeId,
  sourcePath: workspaceRecipesSourcePath,
  exportName: "workspaceRecipeCatalogOutput",
  emitsReceipts: ["workspace.recipe-catalog.projected"],
  handler: () => Effect.succeed(workspaceRecipeCatalogOutput()),
})

export const WorkspaceCleanForkPolicyHandler = defineRecipeHandler<
  WorkspaceRecipeCatalogInput,
  WorkspaceRecipeCatalogOutput
>({
  id: "workspace.clean-fork-policy.handler",
  recipeId: workspaceCleanForkPolicyRecipeId,
  sourcePath: workspaceRecipesSourcePath,
  exportName: "workspaceRecipeCatalogOutput",
  emitsReceipts: ["workspace.clean-fork-policy.checked"],
  handler: () => Effect.succeed(workspaceRecipeCatalogOutput()),
})

export const WorkspacePackageDbEmissionHandler = defineRecipeHandler<
  WorkspaceRecipeCatalogInput,
  WorkspacePackageDbEmissionOutput
>({
  id: "workspace.package-db-emission.handler",
  recipeId: workspacePackageDbEmissionRecipeId,
  sourcePath: workspaceRecipesSourcePath,
  exportName: "workspacePackageDbEmissionOutput",
  emitsReceipts: ["workspace.package-db-emission.projected"],
  handler: () => Effect.succeed(workspacePackageDbEmissionOutput()),
})

export const AttuneFoldKitWorkspaceCatalogHandler = defineRecipeHandler<
  AttuneFoldKitWorkspaceCatalogInput,
  AttuneFoldKitWorkspaceCatalogOutput
>({
  id: "attune-foldkit.workspace-catalog.handler",
  recipeId: attuneFoldKitWorkspaceCatalogRecipeId,
  sourcePath: workspaceRecipesSourcePath,
  exportName: "attuneFoldKitWorkspaceCatalogOutput",
  emitsReceipts: ["attune-foldkit.workspace-catalog.projected"],
  handler: () => Effect.succeed(attuneFoldKitWorkspaceCatalogOutput()),
})

export const WorkspaceRecipes = [
  defineRecipe({
    id: workspaceRecipeCatalogRecipeId,
    projectId: "workspace",
    title: "Aggregate active package recipe declarations",
    inputSchema: WorkspaceRecipeCatalogInput,
    outputSchema: WorkspaceRecipeCatalogOutput,
    nxTarget: "workspace:policy-fast",
    sourcePath: workspaceRecipesSourcePath,
    allowedFiles: ["packages/**"],
    validationEvidence: ["attune-architecture:test", "workspace:policy-fast"],
    io: {
      inputSchema: WorkspaceRecipeCatalogInput,
      outputSchema: WorkspaceRecipeCatalogOutput,
      inputResources: [WorkspaceRecipeCatalogResource],
      outputResources: [WorkspaceRecipeCatalogResource],
    },
    handler: WorkspaceRecipeCatalogHandler,
    alchemyDag: [{
      fromRecipeId: workspaceRecipeCatalogSourceRecipeId,
      toRecipeId: workspaceRecipeCatalogRecipeId,
      resource: WorkspaceRecipeCatalogResource,
      kind: "projects",
      modes: ["read", "project", "check"],
    }],
  }),
  defineRecipe({
    id: workspaceCleanForkPolicyRecipeId,
    projectId: "workspace",
    title: "Enforce clean-fork recipe substrate migration policy",
    inputSchema: WorkspaceRecipeCatalogInput,
    outputSchema: WorkspaceRecipeCatalogOutput,
    nxTarget: "workspace:framework-policy-check",
    sourcePath: workspaceRecipesSourcePath,
    allowedFiles: [
      "openspec/changes/arbor-recipe-substrate-migration/**",
      "packages/**",
    ],
    validationEvidence: ["openspec validate arbor-recipe-substrate-migration --strict", "workspace:policy-fast"],
    io: {
      inputSchema: WorkspaceRecipeCatalogInput,
      outputSchema: WorkspaceRecipeCatalogOutput,
      inputResources: [WorkspaceRecipeCatalogResource],
      outputResources: [WorkspaceCleanForkPolicyResource],
    },
    handler: WorkspaceCleanForkPolicyHandler,
    alchemyDag: [{
      fromRecipeId: workspaceCleanForkPolicyRecipeId,
      toRecipeId: workspaceRecipeCatalogRecipeId,
      resource: WorkspaceRecipeCatalogResource,
      kind: "validates",
      modes: ["read", "check"],
    }],
  }),
  defineRecipe({
    id: workspacePackageDbEmissionRecipeId,
    projectId: "workspace",
    title: "Project every active package recipe into the generic TimescaleDB/Postgres spine",
    inputSchema: WorkspaceRecipeCatalogInput,
    outputSchema: WorkspacePackageDbEmissionOutput,
    nxTarget: "workspace:policy-fast",
    sourcePath: workspaceRecipesSourcePath,
    allowedFiles: [
      "packages/trellis/recipes.ts",
      "packages/trellis/protocol/**",
      "packages/trellis/runtime/**",
      "packages/**",
    ],
    validationEvidence: [
      "attune-architecture:test",
      "framework-runtime:test",
      "workspace:policy-fast",
    ],
    io: {
      inputSchema: WorkspaceRecipeCatalogInput,
      outputSchema: WorkspacePackageDbEmissionOutput,
      inputResources: [WorkspaceRecipeCatalogResource],
      outputResources: [WorkspacePackageDbEmissionResource],
    },
    handler: WorkspacePackageDbEmissionHandler,
    alchemyDag: [
      {
        fromRecipeId: workspacePackageDbEmissionRecipeId,
        toRecipeId: workspaceRecipeCatalogRecipeId,
        resource: WorkspaceRecipeCatalogResource,
        kind: "projects",
        modes: ["read", "project", "check"],
      },
      {
        fromRecipeId: workspacePackageDbEmissionRecipeId,
        toRecipeId: frameworkRuntimeLocalTimescaleRecipeId,
        resource: "framework-runtime.local-timescaledb.resource",
        kind: "projects",
        modes: ["read", "project", "check"],
      },
    ],
  }),
] as const

export const AttuneFoldKitWorkspaceRecipes = [
  defineRecipe({
    id: attuneFoldKitWorkspaceCatalogRecipeId,
    projectId: "attune-foldkit",
    title: "Register FoldKit package recipe catalog without importing browser runtime modules",
    inputSchema: AttuneFoldKitWorkspaceCatalogInput,
    outputSchema: AttuneFoldKitWorkspaceCatalogOutput,
    nxTarget: "attune-foldkit:check",
    sourcePath: workspaceRecipesSourcePath,
    allowedFiles: [
      "packages/trellis/recipes.ts",
      "packages/attune/foldkit/src/recipes.ts",
      "packages/attune/foldkit/src/**",
    ],
    validationEvidence: ["attune-foldkit:typecheck", "attune-foldkit:test"],
    io: {
      inputSchema: AttuneFoldKitWorkspaceCatalogInput,
      outputSchema: AttuneFoldKitWorkspaceCatalogOutput,
      inputResources: [AttuneFoldKitWorkspaceCatalogResource],
      outputResources: [AttuneFoldKitWorkspaceCatalogResource],
    },
    handler: AttuneFoldKitWorkspaceCatalogHandler,
    alchemyDag: [{
      fromRecipeId: attuneFoldKitWorkspaceCatalogSourceRecipeId,
      toRecipeId: attuneFoldKitWorkspaceCatalogRecipeId,
      resource: AttuneFoldKitWorkspaceCatalogResource,
      kind: "projects",
      modes: ["read", "project", "check"],
    }],
  }),
] as const

export const WorkspacePackageRecipeCatalog = [
  { projectId: "workspace", recipes: asRecipes(WorkspaceRecipes) },
  { projectId: "attune-architecture", recipes: asRecipes(AttuneArchitectureRecipes) },
  { projectId: "framework-language-service", recipes: asRecipes(FrameworkLanguageServiceRecipes) },
  { projectId: "framework-nx", recipes: asRecipes(FrameworkNxRecipes) },
  { projectId: "framework-protocol", recipes: asRecipes(FrameworkProtocolRecipes) },
  { projectId: "framework-runtime", recipes: asRecipes(FrameworkRuntimeRecipes) },
  { projectId: "framework-testing", recipes: asRecipes(FrameworkTestingRecipes) },
  { projectId: "attune-foldkit", recipes: asRecipes(AttuneFoldKitWorkspaceRecipes) },
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

export const attuneFoldKitWorkspaceCatalogOutput = (): AttuneFoldKitWorkspaceCatalogOutput => ({
  packageId: "attune-foldkit",
  packageCatalogSourcePath: "packages/attune/foldkit/src/recipes.ts",
  importsBrowserRuntime: false,
})
