import {
  defineAlchemyResource,
  defineRecipeHandler,
  defineTestRecipe,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import { AttuneKubernetesGraphResourceContract } from "./provider/alchemy-resource.js"
import { KubernetesObjectSetRecipeId } from "./provider/kubernetes-object-set.js"

const PlatformAlchemyK8sProjectId = "platform-alchemy-k8s" as const
const PlatformAlchemyK8sTestSuiteRecipeId =
  "platform-alchemy-k8s.test-suite" as const
const PlatformAlchemyK8sTestReportResourceId =
  "platform-alchemy-k8s.test-report.resource" as const
const PlatformAlchemyK8sTestSuiteHandlerId =
  "platform-alchemy-k8s.test-suite.handler" as const
const PlatformAlchemyK8sTestRecipeSourcePath =
  "packages/canopy/platform-alchemy-k8s/src/test-recipes.ts" as const

export const PlatformAlchemyK8sTestRecipeInput = Schema.Struct({
  packageId: Schema.Literal(PlatformAlchemyK8sProjectId),
})
export type PlatformAlchemyK8sTestRecipeInput = typeof PlatformAlchemyK8sTestRecipeInput.Type

export const PlatformAlchemyK8sTestRecipeOutput = Schema.Struct({
  packageId: Schema.Literal(PlatformAlchemyK8sProjectId),
  providerLifecycleCovered: Schema.Boolean,
  generatedArtifactFreshnessCovered: Schema.Boolean,
})
export type PlatformAlchemyK8sTestRecipeOutput = typeof PlatformAlchemyK8sTestRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const PlatformAlchemyK8sTestReportResource = defineAlchemyResource({
  id: PlatformAlchemyK8sTestReportResourceId,
  kind: "report",
  alchemyType: "attune:resource:Report",
  ownerRecipeId: PlatformAlchemyK8sTestSuiteRecipeId,
  producedBy: [PlatformAlchemyK8sTestSuiteRecipeId],
  addressFields: ["packageId"],
  addressSchema: PlatformAlchemyK8sTestRecipeInput as never,
  stateSchema: PlatformAlchemyK8sTestRecipeOutput as never,
  modes: ["check", "observe"],
})

export const PlatformAlchemyK8sTestSuiteHandler = defineRecipeHandler<
  PlatformAlchemyK8sTestRecipeInput,
  PlatformAlchemyK8sTestRecipeOutput
>({
  id: PlatformAlchemyK8sTestSuiteHandlerId,
  recipeId: PlatformAlchemyK8sTestSuiteRecipeId,
  sourcePath: PlatformAlchemyK8sTestRecipeSourcePath,
  exportName: "PlatformAlchemyK8sTestRecipes",
  handler: (input) =>
    Effect.succeed({
      packageId: input.packageId,
      providerLifecycleCovered: true,
      generatedArtifactFreshnessCovered: true,
    }) as never,
  emitsReceipts: ["platform-alchemy-k8s.test-report"],
})

// @attune-packet-target generated-runtime-projection eligible
export const PlatformAlchemyK8sTestSuiteRecipe = defineTestRecipe({
  id: PlatformAlchemyK8sTestSuiteRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Own platform Alchemy Kubernetes provider tests",
  inputSchema: PlatformAlchemyK8sTestRecipeInput as never,
  outputSchema: PlatformAlchemyK8sTestRecipeOutput as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [
    PlatformAlchemyK8sTestRecipeSourcePath,
    "packages/canopy/platform-alchemy-k8s/test/**",
    "packages/canopy/platform-alchemy-k8s/vitest.config.ts",
  ],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: PlatformAlchemyK8sTestRecipeInput as never,
    outputSchema: PlatformAlchemyK8sTestRecipeOutput as never,
    inputResources: [AttuneKubernetesGraphResourceContract],
    outputResources: [PlatformAlchemyK8sTestReportResource],
  },
  handler: PlatformAlchemyK8sTestSuiteHandler,
  alchemyDag: [{
    fromRecipeId: KubernetesObjectSetRecipeId,
    toRecipeId: PlatformAlchemyK8sTestSuiteRecipeId,
    resource: PlatformAlchemyK8sTestReportResource,
    kind: "validates",
    modes: ["check", "observe"],
  }],
})

export const PlatformAlchemyK8sTestRecipes = [PlatformAlchemyK8sTestSuiteRecipe] as const
