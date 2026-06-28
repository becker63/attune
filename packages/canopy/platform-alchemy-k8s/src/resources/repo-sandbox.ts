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
