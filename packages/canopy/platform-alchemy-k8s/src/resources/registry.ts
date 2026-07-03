import {
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import { AttuneArtifact } from "./attune-artifact.js"
import { AttuneBudget } from "./attune-budget.js"
import { AttuneDiscoveryRun } from "./attune-discovery-run.js"
import { AttunePhase } from "./attune-phase.js"
import { AttunePolicy } from "./attune-policy.js"
import { AttuneReport } from "./attune-report.js"
import { AttuneToolJob } from "./attune-tool-job.js"
import { BudgetClass, BudgetPolicy } from "./budget-policy.js"
import { AttuneControlPlane } from "./control-plane.js"
import { AttuneCustomResources } from "./custom-resources.js"
import { AttuneDiscoveryWorkflow } from "./discovery-workflow.js"
import { JoernQuery } from "./joern-query.js"
import {
  LocalComputeStack,
  LocalComputeStackRecipeId,
  LocalComputeStackResource,
} from "./local-compute-stack.js"
import { LocalPostgres } from "./postgres.js"
import { RepoSandbox } from "./repo-sandbox.js"
import { ResourceClass } from "./resource-class.js"
import { RunNamespace } from "./run-namespace.js"
import { WorkerPool } from "./worker-pool.js"

export const K8sResourceRegistryRecipeId =
  "platform-alchemy-k8s.resource-registry" as const
const K8sResourceRegistryResourceId =
  "platform-alchemy-k8s.resource-registry.resource" as const
const K8sResourceRegistryHandlerId =
  "platform-alchemy-k8s.resource-registry.handler" as const
const K8sResourceRegistrySourcePath =
  "packages/canopy/platform-alchemy-k8s/src/resources/registry.ts" as const

export const k8sResourceModules = [
  AttuneArtifact,
  AttuneBudget,
  AttuneDiscoveryRun,
  AttunePhase,
  AttunePolicy,
  AttuneReport,
  AttuneToolJob,
  BudgetClass,
  BudgetPolicy,
  AttuneControlPlane,
  AttuneCustomResources,
  AttuneDiscoveryWorkflow,
  JoernQuery,
  LocalComputeStack,
  LocalPostgres,
  RepoSandbox,
  ResourceClass,
  RunNamespace,
  WorkerPool,
] as const

export type K8sResourceModule = (typeof k8sResourceModules)[number]

export const K8sResourceRegistryRecipeInput = Schema.Struct({
  sourcePath: Schema.optional(Schema.String),
})
export type K8sResourceRegistryRecipeInput = typeof K8sResourceRegistryRecipeInput.Type

export const K8sResourceRegistryRecipeOutput = Schema.Struct({
  moduleCount: Schema.Number,
  includesCustomResourceFactory: Schema.Boolean,
  includesLocalComputeStack: Schema.Boolean,
})
export type K8sResourceRegistryRecipeOutput = typeof K8sResourceRegistryRecipeOutput.Type

// @attune-packet-target generated-runtime-projection eligible
export const K8sResourceRegistryResource = defineAlchemyResource({
  id: K8sResourceRegistryResourceId,
  kind: "schema",
  alchemyType: "attune:resource:Schema",
  ownerRecipeId: K8sResourceRegistryRecipeId,
  producedBy: [K8sResourceRegistryRecipeId],
  consumedBy: [LocalComputeStackRecipeId],
  addressFields: ["sourcePath"],
  addressSchema: K8sResourceRegistryRecipeInput as never,
  stateSchema: K8sResourceRegistryRecipeOutput as never,
  modes: ["project", "read"],
})

export const K8sResourceRegistryHandler = defineRecipeHandler<
  K8sResourceRegistryRecipeInput,
  K8sResourceRegistryRecipeOutput
>({
  id: K8sResourceRegistryHandlerId,
  recipeId: K8sResourceRegistryRecipeId,
  sourcePath: K8sResourceRegistrySourcePath,
  exportName: "k8sResourceModules",
  handler: () =>
    Effect.succeed({
      moduleCount: k8sResourceModules.length,
      includesCustomResourceFactory: k8sResourceModules.includes(AttuneCustomResources),
      includesLocalComputeStack: k8sResourceModules.includes(LocalComputeStack),
    }) as never,
  emitsReceipts: ["platform-alchemy-k8s.resource-registry.projected"],
})

// @attune-packet-target generated-runtime-projection eligible
export const K8sResourceRegistryRecipe = defineProjectionRecipe({
  id: K8sResourceRegistryRecipeId,
  projectId: "platform-alchemy-k8s",
  title: "Project Kubernetes resource module registry",
  inputSchema: K8sResourceRegistryRecipeInput as never,
  outputSchema: K8sResourceRegistryRecipeOutput as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [K8sResourceRegistrySourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceRegistryRecipeInput as never,
    outputSchema: K8sResourceRegistryRecipeOutput as never,
    inputResources: [K8sResourceRegistryResource],
    outputResources: [K8sResourceRegistryResource],
  },
  handler: K8sResourceRegistryHandler,
  alchemyDag: [{
    fromRecipeId: K8sResourceRegistryRecipeId,
    toRecipeId: LocalComputeStackRecipeId,
    resource: LocalComputeStackResource,
    kind: "projects",
    modes: ["project", "read"],
  }],
})

export const K8sResourceRegistryRecipes = [K8sResourceRegistryRecipe] as const
