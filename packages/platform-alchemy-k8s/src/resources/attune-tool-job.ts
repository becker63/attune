import type { KubernetesObject, PlatformResourceSet } from "../provider/alchemy-k8s-provider.js"
import { BudgetPolicy, type BudgetPolicyRequired } from "./budget-policy.js"
import { attuneLabels, dnsLabel, mergeResourceSets, resourceSet, type ArtifactReference } from "./common.js"
import { AttuneCustomResources } from "./custom-resources.js"

export type AttuneToolKind = "joern" | "cocoindex" | "ast-grep" | "oxlint" | "local-model"

export interface AttuneToolJobProps {
  readonly name: string
  readonly namespace: string
  readonly runId: string
  readonly tool: AttuneToolKind
  readonly image: string
  readonly repoSandboxRef: string
  readonly workerPoolRef: string
  readonly resourceClass: string
  readonly command: readonly string[]
  readonly timeoutSeconds: number
  readonly budgetPolicy: BudgetPolicyRequired
  readonly outputArtifacts?: readonly ArtifactReference[]
}

const jobForTool = (props: AttuneToolJobProps): KubernetesObject => {
  const name = dnsLabel(props.name)
  const labels = attuneLabels("attune-tool-job", {
    "attune.dev/run-id": props.runId,
    "attune.dev/tool": props.tool,
    "attune.dev/repo-sandbox": props.repoSandboxRef,
    "attune.dev/worker-pool": props.workerPoolRef,
    "attune.dev/resource-class": props.resourceClass,
    ...BudgetPolicy.labels(props.budgetPolicy),
  })

  return {
    apiVersion: "batch/v1",
    kind: "Job",
    metadata: {
      name: `${name}-tool`,
      namespace: props.namespace,
      labels,
      annotations: {
        "attune.dev/timeout-seconds": String(props.timeoutSeconds),
        "attune.dev/output-artifacts": JSON.stringify(props.outputArtifacts ?? []),
      },
    },
    spec: {
      backoffLimit: 1,
      activeDeadlineSeconds: props.timeoutSeconds,
      template: {
        metadata: {
          labels,
        },
        spec: {
          restartPolicy: "Never",
          serviceAccountName: `${props.workerPoolRef}-worker`,
          containers: [
            {
              name: props.tool,
              image: props.image,
              imagePullPolicy: "IfNotPresent",
              command: [...props.command],
              env: [
                { name: "ATTUNE_RUN_ID", value: props.runId },
                { name: "ATTUNE_TOOL", value: props.tool },
                { name: "ATTUNE_REPO_SANDBOX_REF", value: props.repoSandboxRef },
              ],
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

export const AttuneToolJob = {
  make: (props: AttuneToolJobProps): PlatformResourceSet => {
    const name = dnsLabel(props.name)
    return mergeResourceSets(`attune-tool-job:${props.namespace}:${name}`, [
      resourceSet(`attune-tool-job-cr:${props.namespace}:${name}`, [
        AttuneCustomResources.toolJob(
          { name, namespace: props.namespace },
          {
            runId: props.runId,
            tool: props.tool,
            repoSandboxRef: props.repoSandboxRef,
            workerPoolRef: props.workerPoolRef,
            resourceClass: props.resourceClass,
            image: props.image,
            command: props.command,
            timeoutSeconds: props.timeoutSeconds,
            ...(props.outputArtifacts ? { outputArtifactRefs: props.outputArtifacts.map((artifact) => artifact.name) } : {}),
          },
        ),
      ]),
      resourceSet(`attune-tool-job-workload:${props.namespace}:${name}`, [jobForTool(props)]),
    ])
  },
} as const
