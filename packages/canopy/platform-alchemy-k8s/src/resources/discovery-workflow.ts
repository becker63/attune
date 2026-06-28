import type { PlatformResourceSet } from "../provider/alchemy-k8s-provider.js"
import { AttuneArtifact } from "./attune-artifact.js"
import { AttuneDiscoveryRun } from "./attune-discovery-run.js"
import { AttunePhase } from "./attune-phase.js"
import { AttuneToolJob } from "./attune-tool-job.js"
import { BudgetPolicy } from "./budget-policy.js"
import { mergeResourceSets } from "./common.js"
import { JoernQuery } from "./joern-query.js"

export interface AttuneDiscoveryWorkflowProps {
  readonly runId: string
  readonly namespace: string
  readonly repoUrl: string
  readonly workerImage: string
  readonly workerPoolRef?: string
  readonly resourceClass?: string
}

export const AttuneDiscoveryWorkflow = {
  make: (props: AttuneDiscoveryWorkflowProps): PlatformResourceSet => {
    const workerPoolRef = props.workerPoolRef ?? "thinkcentre-cpu"
    const resourceClass = props.resourceClass ?? "thinkcentre-cpu"
    const run = {
      runId: props.runId,
      namespace: props.namespace,
      image: props.workerImage,
      repoUrl: props.repoUrl,
      workerPoolRef,
      resourceClass,
    }

    return mergeResourceSets(`attune-discovery-workflow:${props.namespace}:${props.runId}`, [
      AttuneDiscoveryRun.make(run),
      AttunePhase.make({
        name: `${props.runId}-discovery`,
        namespace: props.namespace,
        runId: props.runId,
        phase: "discovery",
        expectedArtifacts: [{ name: `${props.runId}-repo-workspace` }],
      }),
      AttunePhase.make({
        name: `${props.runId}-indexing`,
        namespace: props.namespace,
        runId: props.runId,
        phase: "indexing",
        dependsOn: [`${props.runId}-discovery`],
        expectedArtifacts: [{ name: `${props.runId}-index` }],
      }),
      AttuneToolJob.make({
        name: `${props.runId}-indexing`,
        namespace: props.namespace,
        runId: props.runId,
        tool: "cocoindex",
        image: props.workerImage,
        repoSandboxRef: props.runId,
        workerPoolRef,
        resourceClass,
        command: [
          "attune-worker",
          "run",
          "indexing",
          "--run-id",
          props.runId,
          "--repo",
          props.repoUrl,
          "--artifact",
          `${props.runId}-index`,
        ],
        timeoutSeconds: 1800,
        budgetPolicy: BudgetPolicy.required("standard"),
        outputArtifacts: [{ name: `${props.runId}-index` }],
      }),
      AttuneArtifact.make({
        name: `${props.runId}-index`,
        namespace: props.namespace,
        runId: props.runId,
        kind: "index",
        producerRef: `${props.runId}-indexing`,
      }),
      AttunePhase.make({
        name: `${props.runId}-joern-query`,
        namespace: props.namespace,
        runId: props.runId,
        phase: "joern-query",
        dependsOn: [`${props.runId}-indexing`],
        expectedArtifacts: [{ name: `${props.runId}-source-sink-result` }],
      }),
      JoernQuery.make({
        name: `${props.runId}-source-sink`,
        namespace: props.namespace,
        runId: props.runId,
        image: props.workerImage,
        repoSandboxRef: props.runId,
        workerPoolRef,
        resourceClass,
        queryTemplate: "source-sink-neighborhood",
        variables: {
          repoUrl: props.repoUrl,
        },
        timeoutSeconds: 2400,
      }),
      AttuneArtifact.make({
        name: `${props.runId}-source-sink-result`,
        namespace: props.namespace,
        runId: props.runId,
        kind: "evidence-bundle",
        producerRef: `${props.runId}-source-sink`,
      }),
      AttunePhase.make({
        name: `${props.runId}-evidence-scoring`,
        namespace: props.namespace,
        runId: props.runId,
        phase: "evidence-scoring",
        dependsOn: [`${props.runId}-joern-query`],
        expectedArtifacts: [{ name: `${props.runId}-evidence` }],
      }),
      AttuneToolJob.make({
        name: `${props.runId}-evidence-scoring`,
        namespace: props.namespace,
        runId: props.runId,
        tool: "local-model",
        image: props.workerImage,
        repoSandboxRef: props.runId,
        workerPoolRef,
        resourceClass,
        command: [
          "attune-worker",
          "run",
          "evidence-scoring",
          "--run-id",
          props.runId,
          "--input-artifact",
          `${props.runId}-source-sink-result`,
          "--output-artifact",
          `${props.runId}-evidence`,
        ],
        timeoutSeconds: 1200,
        budgetPolicy: BudgetPolicy.required("standard"),
        outputArtifacts: [{ name: `${props.runId}-evidence` }],
      }),
      AttuneArtifact.make({
        name: `${props.runId}-evidence`,
        namespace: props.namespace,
        runId: props.runId,
        kind: "evidence-bundle",
        producerRef: `${props.runId}-evidence-scoring`,
      }),
      AttunePhase.make({
        name: `${props.runId}-report-writing`,
        namespace: props.namespace,
        runId: props.runId,
        phase: "report-writing",
        dependsOn: [`${props.runId}-evidence-scoring`],
        expectedArtifacts: [{ name: `${props.runId}-report-snapshot` }],
      }),
      AttuneArtifact.make({
        name: `${props.runId}-report-snapshot`,
        namespace: props.namespace,
        runId: props.runId,
        kind: "report-snapshot",
        producerRef: `${props.runId}-report-writing`,
      }),
      AttuneToolJob.make({
        name: `${props.runId}-report-writing`,
        namespace: props.namespace,
        runId: props.runId,
        tool: "local-model",
        image: props.workerImage,
        repoSandboxRef: props.runId,
        workerPoolRef,
        resourceClass,
        command: [
          "attune-worker",
          "run",
          "report-writing",
          "--run-id",
          props.runId,
          "--input-artifact",
          `${props.runId}-evidence`,
          "--output-artifact",
          `${props.runId}-report-snapshot`,
        ],
        timeoutSeconds: 1200,
        budgetPolicy: BudgetPolicy.required("standard"),
        outputArtifacts: [{ name: `${props.runId}-report-snapshot` }],
      }),
    ])
  },
} as const
