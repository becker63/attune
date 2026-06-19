import type { PlatformResourceSet } from "../provider/alchemy-k8s-provider.js"
import { AttuneBudget } from "./attune-budget.js"
import { AttunePolicy } from "./attune-policy.js"
import { AttuneReport } from "./attune-report.js"
import { AttuneCustomResources } from "./custom-resources.js"
import { mergeResourceSets } from "./common.js"
import { RepoSandbox } from "./repo-sandbox.js"

export interface AttuneDiscoveryRunProps {
  readonly runId: string
  readonly namespace: string
  readonly image: string
  readonly repoUrl: string
  readonly workerPoolRef: string
  readonly resourceClass: string
}

export const AttuneDiscoveryRun = {
  make: (props: AttuneDiscoveryRunProps): PlatformResourceSet =>
    mergeResourceSets(`attune-discovery-run:${props.namespace}:${props.runId}`, [
      {
        id: `attune-discovery-run-cr:${props.namespace}:${props.runId}`,
        render: () => ({
          id: `attune-discovery-run-cr:${props.namespace}:${props.runId}`,
          objects: [
            AttuneCustomResources.discoveryRun(
              {
                name: props.runId,
                namespace: props.namespace,
              },
              {
                runId: props.runId,
                repoUrl: props.repoUrl,
                workerPoolRef: props.workerPoolRef,
                repoSandboxRef: props.runId,
                resourceClass: props.resourceClass,
                phaseRefs: [
                  `${props.runId}-discovery`,
                  `${props.runId}-indexing`,
                  `${props.runId}-joern-query`,
                  `${props.runId}-evidence-scoring`,
                  `${props.runId}-report-writing`,
                ],
                policyRef: props.runId,
                budgetRef: props.runId,
              },
            ),
          ],
        }),
      },
      RepoSandbox.untrustedRepo({
        name: props.runId,
        namespace: props.namespace,
        runId: props.runId,
        repoUrl: props.repoUrl,
      }),
      AttuneBudget.make({
        name: props.runId,
        namespace: props.namespace,
        runId: props.runId,
        resourceClass: props.resourceClass,
        maxCpu: "4",
        maxMemory: "8Gi",
        maxDurationSeconds: 3600,
      }),
      AttunePolicy.make({
        name: props.runId,
        namespace: props.namespace,
        runId: props.runId,
        repoSandboxRef: props.runId,
        allowedTools: ["joern", "ast-grep", "oxlint"],
      }),
      AttuneReport.make({
        name: props.runId,
        namespace: props.namespace,
        runId: props.runId,
        snapshotArtifactRef: `${props.runId}-report-snapshot`,
      }),
    ]),
} as const
