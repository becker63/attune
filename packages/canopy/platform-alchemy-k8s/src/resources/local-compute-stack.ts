import {
  defineAlchemyResource,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect, Schema } from "effect"

import {
  LocalClusterPlanRecipeId,
  LocalClusterPlanResource,
} from "../cluster/local-cluster.js"
import { RenderedResourceSet, type PlatformResourceSet } from "../provider/alchemy-k8s-provider.js"
import { AttuneControlPlane } from "./control-plane.js"
import { PlatformAlchemyK8sProjectId, mergeResourceSets } from "./common.js"
import { LocalPostgres, localPostgresRefs } from "./postgres.js"
import { RunNamespace } from "./run-namespace.js"
import { WorkerPool } from "./worker-pool.js"

export const LocalComputeStackRecipeId =
  "platform-alchemy-k8s.local-compute-stack" as const
export const DiscoveryWorkflowRecipeId =
  "platform-alchemy-k8s.discovery-workflow" as const
const LocalComputeStackResourceId =
  "platform-alchemy-k8s.local-compute-stack.resource" as const
const LocalComputeStackHandlerId =
  "platform-alchemy-k8s.local-compute-stack.handler" as const
const LocalComputeStackSourcePath =
  "packages/canopy/platform-alchemy-k8s/src/resources/local-compute-stack.ts" as const

export interface LocalComputeStackProps {
  readonly namespace?: string
  readonly controlPlaneImage?: string
  readonly workerImage?: string
  readonly gpuWorkerImage?: string
}

export const LocalComputeStackRecipeInput = Schema.Struct({
  namespace: Schema.optional(Schema.String),
  controlPlaneImage: Schema.optional(Schema.String),
  workerImage: Schema.optional(Schema.String),
  gpuWorkerImage: Schema.optional(Schema.String),
})
export type LocalComputeStackRecipeInput = typeof LocalComputeStackRecipeInput.Type

// @attune-packet-target generated-runtime-projection eligible
export const LocalComputeStackResource = defineAlchemyResource({
  id: LocalComputeStackResourceId,
  kind: "kubernetes-object-set",
  alchemyType: "attune:alchemy:KubernetesGraph",
  ownerRecipeId: LocalComputeStackRecipeId,
  producedBy: [LocalComputeStackRecipeId],
  consumedBy: [
    DiscoveryWorkflowRecipeId,
    "platform-alchemy-k8s.kubernetes-object-set",
  ],
  addressFields: ["namespace"],
  addressSchema: LocalComputeStackRecipeInput as never,
  stateSchema: RenderedResourceSet as never,
  modes: ["project", "plan", "read"],
  programmaticResourceExport: "AttuneKubernetesGraph",
  programmaticProviderExport: "platformAlchemyK8sProviders",
  programmaticBridgeSourcePath: "packages/canopy/platform-alchemy-k8s/src/provider/alchemy-resource.ts",
})

export const LocalComputeStack = {
  thinkcentreWithIntermittentGpu: (props: LocalComputeStackProps = {}): PlatformResourceSet => {
    const namespace = props.namespace ?? "attune-runs"
    const postgres = localPostgresRefs({ namespace })

    return mergeResourceSets(`local-compute-stack:${namespace}`, [
      RunNamespace.make({
        name: namespace,
        labels: {
          "attune.dev/cluster-role": "local-compute",
        },
      }),
      LocalPostgres.make({
        namespace,
        storage: "100Gi",
      }),
      AttuneControlPlane.make({
        namespace,
        image: props.controlPlaneImage ?? "ghcr.io/attune/control-plane:dev",
        postgres,
      }),
      WorkerPool.thinkcentreCpu(props.workerImage ?? "ghcr.io/attune/local-worker:dev"),
      WorkerPool.desktopGpu(props.gpuWorkerImage ?? "ghcr.io/attune/local-gpu-worker:dev"),
    ])
  },
} as const

const localComputeStackPropsFromInput = (input: LocalComputeStackRecipeInput): LocalComputeStackProps => ({
  ...(input.namespace === undefined ? {} : { namespace: input.namespace }),
  ...(input.controlPlaneImage === undefined ? {} : { controlPlaneImage: input.controlPlaneImage }),
  ...(input.workerImage === undefined ? {} : { workerImage: input.workerImage }),
  ...(input.gpuWorkerImage === undefined ? {} : { gpuWorkerImage: input.gpuWorkerImage }),
})

export const LocalComputeStackHandler = defineRecipeHandler<
  LocalComputeStackRecipeInput,
  typeof RenderedResourceSet.Type
>({
  id: LocalComputeStackHandlerId,
  recipeId: LocalComputeStackRecipeId,
  sourcePath: LocalComputeStackSourcePath,
  exportName: "LocalComputeStack",
  handler: (input) =>
    Effect.succeed(LocalComputeStack.thinkcentreWithIntermittentGpu(localComputeStackPropsFromInput(input)).render()) as never,
  emitsReceipts: ["platform-alchemy-k8s.local-compute-stack.rendered"],
})

// @attune-packet-target generated-runtime-projection eligible
export const LocalComputeStackRecipe = defineProjectionRecipe({
  id: LocalComputeStackRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Render local compute stack resource set",
  inputSchema: LocalComputeStackRecipeInput as never,
  outputSchema: RenderedResourceSet as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [LocalComputeStackSourcePath],
  validationEvidence: ["platform-alchemy-k8s:test"],
  io: {
    inputSchema: LocalComputeStackRecipeInput as never,
    outputSchema: RenderedResourceSet as never,
    inputResources: [LocalClusterPlanResource],
    outputResources: [LocalComputeStackResource],
  },
  handler: LocalComputeStackHandler,
  alchemyDag: [{
    fromRecipeId: LocalComputeStackRecipeId,
    toRecipeId: DiscoveryWorkflowRecipeId,
    resource: LocalComputeStackResource,
    kind: "projects",
    modes: ["project", "plan", "read"],
  }],
})

export const LocalComputeStackRecipes = [LocalComputeStackRecipe] as const
