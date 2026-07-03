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
import { attuneLabels, configMap, dnsLabel, resourceSet, type ArtifactReference } from "./common.js"

export type AttunePhaseKind = "discovery" | "indexing" | "joern-query" | "evidence-scoring" | "report-writing"

export interface AttunePhaseProps {
  readonly name: string
  readonly namespace: string
  readonly runId: string
  readonly phase: AttunePhaseKind
  readonly dependsOn?: readonly string[]
  readonly expectedArtifacts?: readonly ArtifactReference[]
}

export const AttunePhase = {
  make: (props: AttunePhaseProps): PlatformResourceSet => {
    const name = dnsLabel(props.name)
    const labels = attuneLabels("attune-phase", {
      "attune.dev/run-id": props.runId,
      "attune.dev/phase": props.phase,
    })

    return resourceSet(`attune-phase:${props.namespace}:${name}`, [
      configMap(`${name}-phase`, props.namespace, labels, {
        runId: props.runId,
        phase: props.phase,
        dependsOn: (props.dependsOn ?? []).join(","),
        expectedArtifacts: JSON.stringify(props.expectedArtifacts ?? []),
      }),
    ])
  },
} as const


export const AttunePhaseResourceRecipeId = "platform-alchemy-k8s.attune-phase-resource" as const
const AttunePhaseResourceHandlerId = "platform-alchemy-k8s.attune-phase-resource.handler" as const
const AttunePhaseResourceSourcePath = "packages/canopy/platform-alchemy-k8s/src/resources/attune-phase.ts" as const

export const AttunePhaseResourceHandler = defineRecipeHandler<
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport
>({
  id: AttunePhaseResourceHandlerId,
  recipeId: AttunePhaseResourceRecipeId,
  sourcePath: AttunePhaseResourceSourcePath,
  exportName: "AttunePhase",
  handler: () =>
    Effect.succeed(k8sResourceModuleReport({
      recipeId: AttunePhaseResourceRecipeId,
      sourcePath: AttunePhaseResourceSourcePath,
      exportName: "AttunePhase",
      moduleKind: "attune phase Kubernetes resource factory",
    })) as never,
  emitsReceipts: [`platform-alchemy-k8s.attune-phase-resource.projected`],
})

// @attune-packet-target generated-runtime-projection eligible
export const AttunePhaseResourceRecipe = defineProjectionRecipe({
  id: AttunePhaseResourceRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Declare attune phase Kubernetes resource factory",
  inputSchema: K8sResourceModuleRecipeInput as never,
  outputSchema: K8sResourceModuleReport as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [AttunePhaseResourceSourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceModuleRecipeInput as never,
    outputSchema: K8sResourceModuleReport as never,
    inputResources: [K8sResourceModuleCatalogResource],
    outputResources: [K8sResourceModuleCatalogResource],
  },
  handler: AttunePhaseResourceHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: PlatformAlchemyK8sResourceRegistryRecipeId,
      toRecipeId: AttunePhaseResourceRecipeId,
      resource: K8sResourceModuleCatalogResource,
      kind: "projects",
      modes: ["project", "read"],
    }),
  ],
})

export const AttunePhaseResourceRecipes = [AttunePhaseResourceRecipe] as const
