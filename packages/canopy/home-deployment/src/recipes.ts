import {
  defineExternalSchemaManagedRecipe,
  defineExternalSchemaRecipe,
  type RecipeRepair,
} from "@attune/framework-protocol"
import { Schema } from "effect"

import { HomeDeploymentConfig } from "./model.js"
import { ProviderEvidence } from "./providers.js"

export const PlatformLifecycleGraphSchema = Schema.Struct({
  name: Schema.String,
  resources: Schema.Array(Schema.Unknown),
})
export type PlatformLifecycleGraphRecipe = typeof PlatformLifecycleGraphSchema.Type

export const CanopyRenderedResources = Schema.Struct({
  lifecycleGraph: PlatformLifecycleGraphSchema,
  resourceCount: Schema.Number,
})
export type CanopyRenderedResources = typeof CanopyRenderedResources.Type

export const CanopyPolicyResult = Schema.Struct({
  allowed: Schema.Boolean,
  blockers: Schema.Array(Schema.String),
  humanReviewRequired: Schema.Boolean,
})
export type CanopyPolicyResult = typeof CanopyPolicyResult.Type

export const CanopyDeployPlan = Schema.Struct({
  target: Schema.String,
  commands: Schema.Array(Schema.Array(Schema.String)),
  evidenceRequirements: Schema.Array(Schema.String),
})
export type CanopyDeployPlan = typeof CanopyDeployPlan.Type

export const CanopyObservedState = Schema.Struct({
  evidence: Schema.Array(ProviderEvidence),
  ready: Schema.Boolean,
})
export type CanopyObservedState = typeof CanopyObservedState.Type

export const canopyDriftRepair: RecipeRepair = {
  repairId: "recipe-repair:canopy.home-deployment:drift",
  recipeId: "canopy.home-deployment",
  title: "Repair Canopy managed platform drift",
  kind: "managed-lifecycle",
  nxTarget: "home-deployment:repair",
  allowedFiles: ["packages/canopy/home-deployment/**", "packages/canopy/platform-alchemy-k8s/**"],
  risk: "needs-review",
  evidenceRequirements: ["home-deployment:test", "workspace:policy-fast"],
}

export const CanopyManagedRecipes = [
  defineExternalSchemaRecipe({
    id: "canopy.desired-state",
    projectId: "home-deployment",
    title: "Decode Canopy desired state",
    inputSchema: HomeDeploymentConfig,
    outputSchema: HomeDeploymentConfig,
    nxTarget: "home-deployment:check",
    sourcePath: "packages/canopy/home-deployment/src/recipes.ts",
    allowedFiles: ["packages/canopy/home-deployment/**"],
    validationEvidence: ["home-deployment:test"],
  }),
  defineExternalSchemaManagedRecipe({
    id: "canopy.home-deployment",
    projectId: "home-deployment",
    title: "Manage Canopy home deployment lifecycle",
    inputSchema: HomeDeploymentConfig,
    outputSchema: PlatformLifecycleGraphSchema,
    dependencies: [{ recipeId: "canopy.desired-state" }],
    nxTarget: "home-deployment:dev",
    sourcePath: "packages/canopy/home-deployment/src/recipes.ts",
    allowedFiles: ["packages/canopy/home-deployment/**", "packages/canopy/platform-alchemy-k8s/**"],
    validationEvidence: ["home-deployment:test"],
    lifecycle: ["plan", "apply", "check", "destroy"],
    resourceKind: "canopy-platform-lifecycle",
    observedState: { status: "unknown" },
    driftRepair: canopyDriftRepair,
    humanReviewRequired: true,
  }),
  defineExternalSchemaRecipe({
    id: "canopy.rendered-resources",
    projectId: "home-deployment",
    title: "Render platform resources",
    inputSchema: PlatformLifecycleGraphSchema,
    outputSchema: CanopyRenderedResources,
    dependencies: [{ recipeId: "canopy.home-deployment" }],
    nxTarget: "home-deployment:check",
    sourcePath: "packages/canopy/home-deployment/src/recipes.ts",
    allowedFiles: ["packages/canopy/home-deployment/**", "packages/canopy/platform-alchemy-k8s/**"],
    validationEvidence: ["home-deployment:test"],
  }),
  defineExternalSchemaRecipe({
    id: "canopy.policy",
    projectId: "home-deployment",
    title: "Evaluate Canopy policy gates",
    inputSchema: CanopyRenderedResources,
    outputSchema: CanopyPolicyResult,
    dependencies: [{ recipeId: "canopy.rendered-resources" }],
    nxTarget: "home-deployment:check",
    sourcePath: "packages/canopy/home-deployment/src/recipes.ts",
    allowedFiles: ["packages/canopy/home-deployment/**", "packages/canopy/platform-alchemy-k8s/**"],
    validationEvidence: ["home-deployment:test", "workspace:policy-fast"],
  }),
  defineExternalSchemaRecipe({
    id: "canopy.deploy-plan",
    projectId: "home-deployment",
    title: "Create Canopy deploy plan",
    inputSchema: CanopyPolicyResult,
    outputSchema: CanopyDeployPlan,
    dependencies: [{ recipeId: "canopy.policy" }],
    nxTarget: "home-deployment:dev",
    sourcePath: "packages/canopy/home-deployment/src/recipes.ts",
    allowedFiles: ["packages/canopy/home-deployment/**"],
    validationEvidence: ["home-deployment:test"],
  }),
  defineExternalSchemaRecipe({
    id: "canopy.nixos-bootstrap-command-plan",
    projectId: "home-deployment",
    title: "Render NixOS bootstrap command plan without live host mutation",
    inputSchema: CanopyPolicyResult,
    outputSchema: CanopyDeployPlan,
    dependencies: [{ recipeId: "canopy.deploy-plan" }],
    nxTarget: "home-deployment:check",
    sourcePath: "packages/canopy/home-deployment/src/recipes.ts",
    allowedFiles: [
      "packages/canopy/home-deployment/src/internal/bootstrap/**",
      "packages/canopy/home-deployment/src/**",
      "nix/hosts/**",
    ],
    validationEvidence: ["home-deployment:test", "workspace:policy-fast"],
  }),
  defineExternalSchemaRecipe({
    id: "canopy.observed-state",
    projectId: "home-deployment",
    title: "Observe Canopy provider state",
    inputSchema: CanopyDeployPlan,
    outputSchema: CanopyObservedState,
    dependencies: [{ recipeId: "canopy.nixos-bootstrap-command-plan" }],
    nxTarget: "home-deployment:test",
    sourcePath: "packages/canopy/home-deployment/src/recipes.ts",
    allowedFiles: ["packages/canopy/home-deployment/**"],
    validationEvidence: ["home-deployment:test"],
  }),
] as const
