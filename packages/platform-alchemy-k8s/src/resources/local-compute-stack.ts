import type { PlatformResourceSet } from "../provider/alchemy-k8s-provider.js"
import { AttuneControlPlane } from "./control-plane.js"
import { mergeResourceSets } from "./common.js"
import { LocalPostgres, localPostgresRefs } from "./postgres.js"
import { RunNamespace } from "./run-namespace.js"
import { WorkerPool } from "./worker-pool.js"

export interface LocalComputeStackProps {
  readonly namespace?: string
  readonly controlPlaneImage?: string
  readonly workerImage?: string
  readonly gpuWorkerImage?: string
}

export const LocalComputeStack = {
  thinkcentreWithIntermittentGpu: (props: LocalComputeStackProps = {}): PlatformResourceSet => {
    const namespace = props.namespace ?? "attune-runs"
    const postgres = localPostgresRefs({ namespace })

    return mergeResourceSets(`local-compute-stack:${namespace}`, [
      RunNamespace.make({
        name: namespace,
        labels: {
          "attune.dev/cluster-role": "local-compute",
        },
      }),
      LocalPostgres.make({
        namespace,
        storage: "100Gi",
      }),
      AttuneControlPlane.make({
        namespace,
        image: props.controlPlaneImage ?? "ghcr.io/attune/control-plane:dev",
        postgres,
      }),
      WorkerPool.thinkcentreCpu(props.workerImage ?? "ghcr.io/attune/local-worker:dev"),
      WorkerPool.desktopGpu(props.gpuWorkerImage ?? "ghcr.io/attune/local-gpu-worker:dev"),
    ])
  },
} as const
