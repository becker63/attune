import type { KubernetesObject, PlatformResourceSet } from "../provider/alchemy-k8s-provider.js"
import { attuneLabels, dnsLabel, resourceSet } from "./common.js"
import type { LocalPostgresRefs } from "./postgres.js"

export interface AttuneControlPlaneProps {
  readonly name?: string
  readonly namespace: string
  readonly image: string
  readonly postgres: LocalPostgresRefs
  readonly replicas?: number
}

export const AttuneControlPlane = {
  make: (props: AttuneControlPlaneProps): PlatformResourceSet => {
    const name = dnsLabel(props.name ?? "attune-control-plane")
    const labels = attuneLabels("control-plane", {
      "app.kubernetes.io/name": name,
      "attune.dev/durable": "true",
    })
    const serviceAccount: KubernetesObject = {
      apiVersion: "v1",
      kind: "ServiceAccount",
      metadata: {
        name,
        namespace: props.namespace,
        labels,
      },
    }
    const service: KubernetesObject = {
      apiVersion: "v1",
      kind: "Service",
      metadata: {
        name,
        namespace: props.namespace,
        labels,
      },
      spec: {
        selector: labels,
        ports: [
          {
            name: "http",
            port: 8080,
            targetPort: 8080,
          },
        ],
      },
    }
    const deployment: KubernetesObject = {
      apiVersion: "apps/v1",
      kind: "Deployment",
      metadata: {
        name,
        namespace: props.namespace,
        labels,
      },
      spec: {
        replicas: props.replicas ?? 1,
        selector: {
          matchLabels: labels,
        },
        template: {
          metadata: {
            labels,
          },
          spec: {
            serviceAccountName: name,
            containers: [
              {
                name: "control-plane",
                image: props.image,
                imagePullPolicy: "IfNotPresent",
                command: ["attune-control-plane"],
                args: ["serve", "--host", "0.0.0.0", "--port", "8080"],
                ports: [
                  {
                    name: "http",
                    containerPort: 8080,
                  },
                ],
                env: [
                  { name: "ATTUNE_EVENTLOG_DRIVER", value: "postgres" },
                  {
                    name: "ATTUNE_POSTGRES_HOST",
                    value: props.postgres.serviceName,
                  },
                  {
                    name: "ATTUNE_POSTGRES_PORT",
                    value: String(props.postgres.port),
                  },
                  {
                    name: "ATTUNE_POSTGRES_DATABASE",
                    value: props.postgres.database,
                  },
                  {
                    name: "ATTUNE_POSTGRES_USER",
                    valueFrom: {
                      secretKeyRef: {
                        name: props.postgres.secretName,
                        key: "POSTGRES_USER",
                      },
                    },
                  },
                  {
                    name: "ATTUNE_POSTGRES_PASSWORD",
                    valueFrom: {
                      secretKeyRef: {
                        name: props.postgres.secretName,
                        key: "POSTGRES_PASSWORD",
                      },
                    },
                  },
                ],
                resources: {
                  requests: {
                    cpu: "250m",
                    memory: "512Mi",
                  },
                  limits: {
                    cpu: "2",
                    memory: "2Gi",
                  },
                },
              },
            ],
          },
        },
      },
    }

    return resourceSet(`control-plane:${props.namespace}:${name}`, [serviceAccount, service, deployment])
  },
} as const
