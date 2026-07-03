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
import { BudgetPolicy } from "./budget-policy.js"
import { mergeResourceSets, resourceSet } from "./common.js"
import { AttuneCustomResources } from "./custom-resources.js"
import { AttuneToolJob } from "./attune-tool-job.js"

export interface JoernQueryProps {
  readonly name: string
  readonly namespace: string
  readonly runId: string
  readonly image: string
  readonly repoSandboxRef: string
  readonly workerPoolRef: string
  readonly resourceClass: string
  readonly queryTemplate: string
  readonly variables?: Readonly<Record<string, string>>
  readonly timeoutSeconds?: number
}

export const JoernQuery = {
  make: (props: JoernQueryProps): PlatformResourceSet =>
    mergeResourceSets(`joern-query:${props.namespace}:${props.name}`, [
      resourceSet(`joern-query-cr:${props.namespace}:${props.name}`, [
        AttuneCustomResources.joernQuery(
          { name: props.name, namespace: props.namespace },
          {
            runId: props.runId,
            repoSandboxRef: props.repoSandboxRef,
            queryTemplate: props.queryTemplate,
            ...(props.variables ? { variables: props.variables } : {}),
            timeoutSeconds: props.timeoutSeconds ?? 600,
            resourceClass: props.resourceClass,
          },
        ),
      ]),
      AttuneToolJob.make({
        name: props.name,
        namespace: props.namespace,
        runId: props.runId,
        tool: "joern",
        image: props.image,
        repoSandboxRef: props.repoSandboxRef,
        workerPoolRef: props.workerPoolRef,
        resourceClass: props.resourceClass,
        command: [
          "joern-query",
          "--template",
          props.queryTemplate,
          "--variables",
          JSON.stringify(props.variables ?? {}),
        ],
        timeoutSeconds: props.timeoutSeconds ?? 600,
        budgetPolicy: BudgetPolicy.required("standard"),
        outputArtifacts: [
          {
            name: `${props.name}-result`,
          },
        ],
      }),
    ]),
} as const


export const JoernQueryResourceRecipeId = "platform-alchemy-k8s.joern-query-resource" as const
const JoernQueryResourceHandlerId = "platform-alchemy-k8s.joern-query-resource.handler" as const
const JoernQueryResourceSourcePath = "packages/canopy/platform-alchemy-k8s/src/resources/joern-query.ts" as const

export const JoernQueryResourceHandler = defineRecipeHandler<
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport
>({
  id: JoernQueryResourceHandlerId,
  recipeId: JoernQueryResourceRecipeId,
  sourcePath: JoernQueryResourceSourcePath,
  exportName: "JoernQuery",
  handler: () =>
    Effect.succeed(k8sResourceModuleReport({
      recipeId: JoernQueryResourceRecipeId,
      sourcePath: JoernQueryResourceSourcePath,
      exportName: "JoernQuery",
      moduleKind: "joern query Kubernetes resource factory",
    })) as never,
  emitsReceipts: [`platform-alchemy-k8s.joern-query-resource.projected`],
})

// @attune-packet-target generated-runtime-projection eligible
export const JoernQueryResourceRecipe = defineProjectionRecipe({
  id: JoernQueryResourceRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Declare joern query Kubernetes resource factory",
  inputSchema: K8sResourceModuleRecipeInput as never,
  outputSchema: K8sResourceModuleReport as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [JoernQueryResourceSourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceModuleRecipeInput as never,
    outputSchema: K8sResourceModuleReport as never,
    inputResources: [K8sResourceModuleCatalogResource],
    outputResources: [K8sResourceModuleCatalogResource],
  },
  handler: JoernQueryResourceHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: PlatformAlchemyK8sResourceRegistryRecipeId,
      toRecipeId: JoernQueryResourceRecipeId,
      resource: K8sResourceModuleCatalogResource,
      kind: "projects",
      modes: ["project", "read"],
    }),
  ],
})

export const JoernQueryResourceRecipes = [JoernQueryResourceRecipe] as const
