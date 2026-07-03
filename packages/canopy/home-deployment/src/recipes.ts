import { defineRecipePackage } from "@attune/framework-protocol"

import {
  CanopyHomeDeploymentRecipe,
  HomeDeploymentAlchemyRecipes,
} from "./alchemy.ts"
import { HomeDeploymentConfigRecipes } from "./config-recipes.ts"
import { NixosBootstrapCommandPlanRecipe } from "./internal/bootstrap/NixosBootstrapCommandPlan.ts"
import {
  CanopyPolicyRecipe,
  CanopyRenderedResourcesRecipe,
  HomeDeploymentLifecycleRecipes,
} from "./lifecycle.ts"
import {
  CanopyDeployPlanRecipe,
  CanopyDesiredStateRecipe,
  HomeDeploymentModelRecipes,
} from "./model.ts"
import {
  CanopyObservedStateRecipe,
  HomeDeploymentProviderRecipes,
} from "./providers.ts"
import { HomeDeploymentStateRecipes } from "./state.ts"
import { HomeDeploymentTestRecipes } from "./test-recipes.ts"

export const CanopyManagedRecipes = [
  CanopyDesiredStateRecipe,
  CanopyHomeDeploymentRecipe,
  CanopyRenderedResourcesRecipe,
  CanopyPolicyRecipe,
  CanopyDeployPlanRecipe,
  NixosBootstrapCommandPlanRecipe,
  CanopyObservedStateRecipe,
] as const

export const HomeDeploymentRecipes = [
  ...HomeDeploymentModelRecipes,
  ...HomeDeploymentAlchemyRecipes,
  ...HomeDeploymentLifecycleRecipes,
  ...HomeDeploymentProviderRecipes,
  ...HomeDeploymentStateRecipes,
  ...HomeDeploymentConfigRecipes,
  ...HomeDeploymentTestRecipes,
] as const

// @attune-packet-target generated-runtime-projection eligible
export const HomeDeploymentRecipePackage = defineRecipePackage({
  packageId: "home-deployment",
  kind: "day0-resource-runbook",
  title: "Canopy home deployment lifecycle recipes",
  sourceRoot: "packages/canopy/home-deployment/src",
  recipes: HomeDeploymentRecipes,
  ownership: [
    {
      id: "desired-state-model",
      title: "Home deployment desired-state model and deploy plan projection",
      files: ["packages/canopy/home-deployment/src/model.ts"],
      recipeIds: ["canopy.desired-state", "canopy.deploy-plan"],
    },
    {
      id: "alchemy-managed-lifecycle",
      title: "Alchemy provider-backed home deployment lifecycle",
      files: ["packages/canopy/home-deployment/src/alchemy.ts", "packages/canopy/home-deployment/alchemy.run.ts"],
      recipeIds: ["canopy.home-deployment"],
    },
    {
      id: "lifecycle-render-policy",
      title: "Lifecycle graph projection, rendered resources, and policy checks",
      files: ["packages/canopy/home-deployment/src/lifecycle.ts"],
      recipeIds: ["canopy.rendered-resources", "canopy.policy"],
    },
    {
      id: "provider-observation",
      title: "Provider evidence and observed-state projection",
      files: ["packages/canopy/home-deployment/src/providers.ts"],
      recipeIds: ["canopy.observed-state"],
    },
    {
      id: "bootstrap-workflow",
      title: "NixOS bootstrap command workflow projection",
      files: ["packages/canopy/home-deployment/src/internal/bootstrap/NixosBootstrapCommandPlan.ts"],
      recipeIds: ["canopy.nixos-bootstrap-command-plan"],
    },
    {
      id: "managed-state-file",
      title: "Local deployment state file lifecycle",
      files: ["packages/canopy/home-deployment/src/state.ts"],
      recipeIds: ["canopy.home-deployment-state"],
    },
    {
      id: "home-deployment-config",
      title: "Home deployment package configuration",
      files: [
        "packages/canopy/home-deployment/package.json",
        "packages/canopy/home-deployment/project.json",
        "packages/canopy/home-deployment/tsconfig.json",
        "packages/canopy/home-deployment/vitest.config.ts",
      ],
      recipeIds: ["canopy.home-deployment.config-surface"],
    },
    {
      id: "home-deployment-tests",
      title: "Home deployment test ownership",
      files: ["packages/canopy/home-deployment/test/**"],
      recipeIds: ["canopy.home-deployment-test-suite"],
    },
  ],
})
