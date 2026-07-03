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

import type { KubernetesObject, PlatformResourceSet } from "../provider/alchemy-k8s-provider.js"
import { attuneLabels, dnsLabel, resourceSet } from "./common.js"
import { AttuneCustomResources } from "./custom-resources.js"

export interface RepoSandboxProps {
  readonly name: string
  readonly namespace: string
  readonly runId?: string
  readonly repoUrl?: string
}

export const RepoSandbox = {
  untrustedRepo: (props: RepoSandboxProps): PlatformResourceSet => {
    const name = dnsLabel(props.name)
    const labels = attuneLabels("repo-sandbox", {
      "attune.dev/sandbox": name,
      "attune.dev/trust": "untrusted",
    })
    const networkPolicy: KubernetesObject = {
      apiVersion: "networking.k8s.io/v1",
      kind: "NetworkPolicy",
      metadata: {
        name: `${name}-default-deny`,
        namespace: props.namespace,
        labels,
      },
      spec: {
        podSelector: {
          matchLabels: {
            "attune.dev/sandbox": name,
          },
        },
        policyTypes: ["Ingress", "Egress"],
      },
    }
    const workspaceClaim: KubernetesObject = {
      apiVersion: "v1",
      kind: "PersistentVolumeClaim",
      metadata: {
        name: `${name}-workspace`,
        namespace: props.namespace,
        labels,
      },
      spec: {
        accessModes: ["ReadWriteOnce"],
        resources: {
          requests: {
            storage: "20Gi",
          },
        },
      },
    }

    return resourceSet(`repo-sandbox:${props.namespace}:${name}`, [
      AttuneCustomResources.repoSandbox(
        {
          name,
          namespace: props.namespace,
        },
        {
          runId: props.runId ?? name,
          repoUrl: props.repoUrl ?? "",
          trust: "untrusted",
          workspaceClaim: `${name}-workspace`,
          allowNetworkEgress: false,
        },
      ),
      networkPolicy,
      workspaceClaim,
    ])
  },
} as const


export const RepoSandboxResourceRecipeId = "platform-alchemy-k8s.repo-sandbox-resource" as const
const RepoSandboxResourceHandlerId = "platform-alchemy-k8s.repo-sandbox-resource.handler" as const
const RepoSandboxResourceSourcePath = "packages/canopy/platform-alchemy-k8s/src/resources/repo-sandbox.ts" as const

export const RepoSandboxResourceHandler = defineRecipeHandler<
  K8sResourceModuleRecipeInput,
  K8sResourceModuleReport
>({
  id: RepoSandboxResourceHandlerId,
  recipeId: RepoSandboxResourceRecipeId,
  sourcePath: RepoSandboxResourceSourcePath,
  exportName: "RepoSandbox",
  handler: () =>
    Effect.succeed(k8sResourceModuleReport({
      recipeId: RepoSandboxResourceRecipeId,
      sourcePath: RepoSandboxResourceSourcePath,
      exportName: "RepoSandbox",
      moduleKind: "repo sandbox Kubernetes resource factory",
    })) as never,
  emitsReceipts: [`platform-alchemy-k8s.repo-sandbox-resource.projected`],
})

// @attune-packet-target generated-runtime-projection eligible
export const RepoSandboxResourceRecipe = defineProjectionRecipe({
  id: RepoSandboxResourceRecipeId,
  projectId: PlatformAlchemyK8sProjectId,
  title: "Declare repo sandbox Kubernetes resource factory",
  inputSchema: K8sResourceModuleRecipeInput as never,
  outputSchema: K8sResourceModuleReport as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: [RepoSandboxResourceSourcePath],
  validationEvidence: ["platform-alchemy-k8s:test", "platform-alchemy-k8s:typecheck"],
  io: {
    inputSchema: K8sResourceModuleRecipeInput as never,
    outputSchema: K8sResourceModuleReport as never,
    inputResources: [K8sResourceModuleCatalogResource],
    outputResources: [K8sResourceModuleCatalogResource],
  },
  handler: RepoSandboxResourceHandler,
  alchemyDag: [
    defineAlchemyRecipeDagEdge({
      fromRecipeId: PlatformAlchemyK8sResourceRegistryRecipeId,
      toRecipeId: RepoSandboxResourceRecipeId,
      resource: K8sResourceModuleCatalogResource,
      kind: "projects",
      modes: ["project", "read"],
    }),
  ],
})

export const RepoSandboxResourceRecipes = [RepoSandboxResourceRecipe] as const
