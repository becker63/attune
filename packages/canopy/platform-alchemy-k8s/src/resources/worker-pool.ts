import type { KubernetesObject, PlatformResourceSet } from "../provider/alchemy-k8s-provider.js"
import { BudgetPolicy, type BudgetPolicyRequired } from "./budget-policy.js"
import { attuneLabels, dnsLabel, mergeResourceSets, resourceSet } from "./common.js"
import { AttuneCustomResources } from "./custom-resources.js"
import { RepoSandbox } from "./repo-sandbox.js"
import { ResourceClass } from "./resource-class.js"
import { RunNamespace } from "./run-namespace.js"

export interface WorkerPoolProps {
  readonly name: string
  readonly namespace: string
  readonly image: string
  readonly resourceClass: string
  readonly workerClass?: "thinkcentre-cpu" | "desktop-gpu" | "wsl-disposable"
  readonly nodeSelector?: Readonly<Record<string, string>>
  readonly tolerations?: readonly Readonly<Record<string, unknown>>[]
  readonly parallelism?: number
  readonly budgetPolicy: BudgetPolicyRequired
  readonly gpu?: boolean
  readonly intermittent?: boolean
}

const workerJob = (props: WorkerPoolProps): KubernetesObject => {
  const name = dnsLabel(props.name)
  const labels = attuneLabels("worker-pool", {
    "attune.dev/worker-pool": name,
    "attune.dev/worker-class": props.workerClass ?? name,
    "attune.dev/resource-class": props.resourceClass,
    "attune.dev/intermittent": String(props.intermittent ?? false),
    "attune.dev/gpu": String(props.gpu ?? false),
    ...BudgetPolicy.labels(props.budgetPolicy),
  })

  return {
    apiVersion: "batch/v1",
    kind: "Job",
    metadata: {
      name: `${name}-worker`,
      namespace: props.namespace,
      labels,
    },
    spec: {
      parallelism: props.parallelism ?? 1,
      completions: props.parallelism ?? 1,
      backoffLimit: 0,
      template: {
        metadata: {
          labels,
        },
        spec: {
          restartPolicy: "Never",
          serviceAccountName: `${name}-worker`,
          nodeSelector: props.nodeSelector ?? {},
          tolerations: props.tolerations ? props.tolerations.map((toleration) => ({ ...toleration })) : [],
          containers: [
            {
              name: "worker",
              image: props.image,
              imagePullPolicy: "IfNotPresent",
              command: ["node", "--version"],
              resources: {
                requests: {
                  cpu: "500m",
                  memory: "512Mi",
                },
                limits: {
                  cpu: "2",
                  memory: "4Gi",
                },
              },
              volumeMounts: [
                {
                  name: "workspace",
                  mountPath: "/workspace",
                },
              ],
            },
          ],
          volumes: [
            {
              name: "workspace",
              emptyDir: {},
            },
          ],
        },
      },
    },
  }
}

export const WorkerPool = {
  make: (props: WorkerPoolProps): PlatformResourceSet => {
    const name = dnsLabel(props.name)
    const labels = attuneLabels("worker-pool", {
      "attune.dev/worker-pool": name,
    })
    const serviceAccount: KubernetesObject = {
      apiVersion: "v1",
      kind: "ServiceAccount",
      metadata: {
        name: `${name}-worker`,
        namespace: props.namespace,
        labels,
      },
    }
    const role: KubernetesObject = {
      apiVersion: "rbac.authorization.k8s.io/v1",
      kind: "Role",
      metadata: {
        name: `${name}-worker`,
        namespace: props.namespace,
        labels,
      },
      rules: [
        {
          apiGroups: [""],
          resources: ["configmaps", "pods"],
          verbs: ["get", "list", "watch"],
        },
        {
          apiGroups: ["batch"],
          resources: ["jobs"],
          verbs: ["get", "list", "watch"],
        },
      ],
    } as KubernetesObject
    const roleBinding: KubernetesObject = {
      apiVersion: "rbac.authorization.k8s.io/v1",
      kind: "RoleBinding",
      metadata: {
        name: `${name}-worker`,
        namespace: props.namespace,
        labels,
      },
      subjects: [
        {
          kind: "ServiceAccount",
          name: `${name}-worker`,
          namespace: props.namespace,
        },
      ],
      roleRef: {
        apiGroup: "rbac.authorization.k8s.io",
        kind: "Role",
        name: `${name}-worker`,
      },
    } as KubernetesObject

    return resourceSet(`worker-pool:${props.namespace}:${name}`, [
      AttuneCustomResources.workerPool(
        {
          name,
          namespace: props.namespace,
        },
        {
          workerClass: props.workerClass ?? "thinkcentre-cpu",
          resourceClass: props.resourceClass,
          image: props.image,
          ...(props.nodeSelector ? { nodeSelector: props.nodeSelector } : {}),
          intermittent: props.intermittent ?? false,
          gpu: props.gpu ?? false,
          maxConcurrentLeases: props.parallelism ?? 1,
        },
      ),
      serviceAccount,
      role,
      roleBinding,
      workerJob(props),
    ])
  },

  thinkcentreCpu: (image = "ghcr.io/attune/local-worker:dev"): PlatformResourceSet => {
    const namespace = "attune-runs"
    return mergeResourceSets("worker-pool:thinkcentre-cpu", [
      RunNamespace.make({
        name: namespace,
        labels: {
          "attune.dev/cluster-role": "thinkcentre-cpu",
        },
      }),
      ResourceClass.make({
        name: "thinkcentre-cpu",
        namespace,
        cpu: "8",
        memory: "24Gi",
        pods: "24",
      }),
      RepoSandbox.untrustedRepo({
        name: "untrusted-repo",
        namespace,
      }),
      WorkerPool.make({
        name: "thinkcentre-cpu",
        namespace,
        image,
        workerClass: "thinkcentre-cpu",
        resourceClass: "thinkcentre-cpu",
        nodeSelector: {
          "attune.dev/worker-class": "thinkcentre-cpu",
        },
        budgetPolicy: BudgetPolicy.required("standard"),
      }),
    ])
  },

  desktopGpu: (image = "ghcr.io/attune/local-gpu-worker:dev"): PlatformResourceSet => {
    const namespace = "attune-runs"
    return mergeResourceSets("worker-pool:desktop-gpu", [
      ResourceClass.make({
        name: "desktop-gpu",
        namespace,
        cpu: "8",
        memory: "32Gi",
        pods: "4",
      }),
      WorkerPool.make({
        name: "desktop-gpu",
        namespace,
        image,
        workerClass: "desktop-gpu",
        resourceClass: "desktop-gpu",
        nodeSelector: {
          "attune.dev/worker-class": "desktop-gpu",
          "attune.dev/gpu": "amd-rx-6800-xt",
        },
        tolerations: [
          {
            key: "attune.dev/intermittent",
            operator: "Equal",
            value: "true",
            effect: "NoSchedule",
          },
        ],
        parallelism: 1,
        gpu: true,
        intermittent: true,
        budgetPolicy: BudgetPolicy.required("expensive"),
      }),
    ])
  },
} as const
