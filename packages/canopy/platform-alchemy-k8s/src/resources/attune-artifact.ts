import {
  defineAlchemyRecipeDagEdge,
  defineProjectionRecipe,
  defineRecipeHandler,
} from "@attune/framework-protocol"
import { Effect } from "effect"
import {
  K8sResourceModuleCatalogResource,
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport,
  PlatformAlchemyK8sProjectId,
  PlatformAlchemyK8sResourceRegistryRecipeId,
  k8sResourceModuleReport,
} from "./common.js"

import type { PlatformResourceSet } from "../provider/alchemy-k8s-provider.js"
import { attuneLabels, configMap, dnsLabel, resourceSet } from "./common.js"

export type AttuneArtifactKind = "cpg" | "index" | "evidence-bundle" | "report-snapshot" | "diagnostics"

export interface AttuneArtifactProps {
  readonly name: string
  readonly namespace: string
  readonly runId: string
  readonly kind: AttuneArtifactKind
  readonly producerRef: string
  readonly uri?: string
  readonly digest?: string
}

export const AttuneArtifact = {
  make: (props: AttuneArtifactProps): PlatformResourceSet => {
    const name = dnsLabel(props.name)
    const labels = attuneLabels("attune-artifact", {
      "attune.dev/run-id": props.runId,
      "attune.dev/artifact-kind": props.kind,
      "attune.dev/producer": props.producerRef,
    })

    return resourceSet(`attune-artifact:${props.namespace}:${name}`, [
      configMap(`${name}-artifact`, props.namespace, labels, {
        runId: props.runId,
        kind: props.kind,
        producerRef: props.producerRef,
        ...(props.uri ? { uri: props.uri } : {}),
        ...(props.digest ? { digest: props.digest } : {}),
      }),
    ])
  },
} as const


export const AttuneArtifactResourceRecipeId = "platform-alchemy-k8s.attune-artifact-resource" as const
const AttuneArtifactResourceHandlerId = "platform-alchemy-k8s.attune-artifact-resource.handler" as const
const AttuneArtifactResourceSourcePath = "packages/canopy/platform-alchemy-k8s/src/resources/attune-artifact.ts" as const

export const AttuneArtifactResourceHandler = defineRecipeHandler<
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport
>({
  id: AttuneArtifactResourceHandlerId,
  recipeId: AttuneArtifactResourceRecipeId,
  sourcePath: AttuneArtifactResourceSourcePath,
  exportName: "AttuneArtifact",
  handler: () =>
    Effect.succeed(k8sResourceModuleReport({
      recipeId: AttuneArtifactResourceRecipeId,
      sourcePath: AttuneArtifactResourceSourcePath,
      exportName: "AttuneArtifact",
      moduleKind: "attune artifact Kubernetes resource factory",
    })) as never,
  emitsReceipts: [`platform-alchemy-k8s.attune-artifact-resource.projected`],
})

// @attune-packet-target generated-runtime-projection eligible
export const AttuneArtifactResourceRecipe = defineProjectionRecipe({
  id: AttuneArtifactResourceRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Declare attune artifact Kubernetes resource factory",
  inputSchema: K8sResourceModuleRecipeInput as never,
  outputSchema: K8sResourceModuleReport as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [AttuneArtifactResourceSourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceModuleRecipeInput as never,
    outputSchema: K8sResourceModuleReport as never,
    inputResources: [K8sResourceModuleCatalogResource],
    outputResources: [K8sResourceModuleCatalogResource],
  },
  handler: AttuneArtifactResourceHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: PlatformAlchemyK8sResourceRegistryRecipeId,
      toRecipeId: AttuneArtifactResourceRecipeId,
      resource: K8sResourceModuleCatalogResource,
      kind: "projects",
      modes: ["project", "read"],
    }),
  ],
})

export const AttuneArtifactResourceRecipes = [AttuneArtifactResourceRecipe] as const
