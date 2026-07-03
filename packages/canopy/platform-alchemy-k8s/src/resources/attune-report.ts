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

export interface AttuneReportProps {
  readonly name: string
  readonly namespace: string
  readonly runId: string
  readonly snapshotArtifactRef?: string
  readonly mdxState?: string
}

export const AttuneReport = {
  make: (props: AttuneReportProps): PlatformResourceSet => {
    const name = dnsLabel(props.name)
    const labels = attuneLabels("attune-report", {
      "attune.dev/run-id": props.runId,
    })

    return resourceSet(`attune-report:${props.namespace}:${name}`, [
      configMap(`${name}-report`, props.namespace, labels, {
        runId: props.runId,
        snapshotArtifactRef: props.snapshotArtifactRef ?? "",
        mdxState: props.mdxState ?? "",
      }),
    ])
  },
} as const


export const AttuneReportResourceRecipeId = "platform-alchemy-k8s.attune-report-resource" as const
const AttuneReportResourceHandlerId = "platform-alchemy-k8s.attune-report-resource.handler" as const
const AttuneReportResourceSourcePath = "packages/canopy/platform-alchemy-k8s/src/resources/attune-report.ts" as const

export const AttuneReportResourceHandler = defineRecipeHandler<
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport
>({
  id: AttuneReportResourceHandlerId,
  recipeId: AttuneReportResourceRecipeId,
  sourcePath: AttuneReportResourceSourcePath,
  exportName: "AttuneReport",
  handler: () =>
    Effect.succeed(k8sResourceModuleReport({
      recipeId: AttuneReportResourceRecipeId,
      sourcePath: AttuneReportResourceSourcePath,
      exportName: "AttuneReport",
      moduleKind: "attune report Kubernetes resource factory",
    })) as never,
  emitsReceipts: [`platform-alchemy-k8s.attune-report-resource.projected`],
})

// @attune-packet-target generated-runtime-projection eligible
export const AttuneReportResourceRecipe = defineProjectionRecipe({
  id: AttuneReportResourceRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Declare attune report Kubernetes resource factory",
  inputSchema: K8sResourceModuleRecipeInput as never,
  outputSchema: K8sResourceModuleReport as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [AttuneReportResourceSourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceModuleRecipeInput as never,
    outputSchema: K8sResourceModuleReport as never,
    inputResources: [K8sResourceModuleCatalogResource],
    outputResources: [K8sResourceModuleCatalogResource],
  },
  handler: AttuneReportResourceHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: PlatformAlchemyK8sResourceRegistryRecipeId,
      toRecipeId: AttuneReportResourceRecipeId,
      resource: K8sResourceModuleCatalogResource,
      kind: "projects",
      modes: ["project", "read"],
    }),
  ],
})

export const AttuneReportResourceRecipes = [AttuneReportResourceRecipe] as const
