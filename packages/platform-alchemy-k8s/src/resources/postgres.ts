import type { KubernetesObject, PlatformResourceSet } from "../provider/alchemy-k8s-provider.js"
import { attuneLabels, dnsLabel, resourceSet } from "./common.js"

export interface LocalPostgresProps {
  readonly name?: string
  readonly namespace: string
  readonly database?: string
  readonly username?: string
  readonly passwordSecretName?: string
  readonly storage?: string
  readonly image?: string
}

export interface LocalPostgresRefs {
  readonly serviceName: string
  readonly secretName: string
  readonly database: string
  readonly username: string
  readonly port: number
}

export const localPostgresRefs = (props: LocalPostgresProps): LocalPostgresRefs => {
  const name = dnsLabel(props.name ?? "attune-postgres")
  return {
    serviceName: name,
    secretName: props.passwordSecretName ?? `${name}-auth`,
    database: props.database ?? "attune",
    username: props.username ?? "attune",
    port: 5432,
  }
}

export const LocalPostgres = {
  make: (props: LocalPostgresProps): PlatformResourceSet => {
    const name = dnsLabel(props.name ?? "attune-postgres")
    const refs = localPostgresRefs(props)
    const labels = attuneLabels("postgres", {
      "app.kubernetes.io/name": name,
      "attune.dev/durable": "true",
    })
    const secret: KubernetesObject = {
      apiVersion: "v1",
      kind: "Secret",
      metadata: {
        name: refs.secretName,
        namespace: props.namespace,
        labels,
      },
      type: "Opaque",
      stringData: {
        POSTGRES_DB: refs.database,
        POSTGRES_USER: refs.username,
        POSTGRES_PASSWORD: "attune-local-dev",
      },
    } as KubernetesObject
    const service: KubernetesObject = {
      apiVersion: "v1",
      kind: "Service",
      metadata: {
        name: refs.serviceName,
        namespace: props.namespace,
        labels,
      },
      spec: {
        selector: labels,
        ports: [
          {
            name: "postgres",
            port: refs.port,
            targetPort: refs.port,
          },
        ],
      },
    }
    const statefulSet: KubernetesObject = {
      apiVersion: "apps/v1",
      kind: "StatefulSet",
      metadata: {
        name,
        namespace: props.namespace,
        labels,
      },
      spec: {
        serviceName: refs.serviceName,
        replicas: 1,
        selector: {
          matchLabels: labels,
        },
        template: {
          metadata: {
            labels,
          },
          spec: {
            containers: [
              {
                name: "postgres",
                image: props.image ?? "postgres:16-alpine",
                ports: [
                  {
                    name: "postgres",
                    containerPort: refs.port,
                  },
                ],
                envFrom: [
                  {
                    secretRef: {
                      name: refs.secretName,
                    },
                  },
                ],
                volumeMounts: [
                  {
                    name: "postgres-data",
                    mountPath: "/var/lib/postgresql/data",
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
        volumeClaimTemplates: [
          {
            metadata: {
              name: "postgres-data",
              labels,
            },
            spec: {
              accessModes: ["ReadWriteOnce"],
              resources: {
                requests: {
                  storage: props.storage ?? "50Gi",
                },
              },
            },
          },
        ],
      },
    }

    return resourceSet(`postgres:${props.namespace}:${name}`, [secret, service, statefulSet])
  },
} as const
