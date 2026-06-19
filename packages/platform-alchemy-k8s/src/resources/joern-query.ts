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
