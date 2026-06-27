import { describe, expect, it } from "vitest"

import {
  AttuneDiscoveryWorkflow,
  WorkerPool,
  AttuneCrds,
  LocalComputeStack,
  createAlchemyK8sProvider,
  createKubernetesProviderDryRun,
  createKubernetesProviderTest,
  makeLocalClusterPlan,
  objectKey,
  renderCommand,
} from "../src/index.js"

describe("platform-alchemy-k8s", () => {
  it("renders the thinkcentre cpu worker pool as Kubernetes resources", () => {
    const provider = createAlchemyK8sProvider()
    const plan = provider.plan(WorkerPool.thinkcentreCpu("registry.local/attune-worker:test"))
    const keys = plan.objects.map(objectKey)

    expect(plan.provider).toBe("attune:alchemy:kubernetes")
    expect(keys).toContain("v1/Namespace/_/attune-runs")
    expect(keys).toContain("v1/ServiceAccount/attune-runs/thinkcentre-cpu-worker")
    expect(keys).toContain("v1/ResourceQuota/attune-runs/thinkcentre-cpu-quota")
    expect(keys).toContain("networking.k8s.io/v1/NetworkPolicy/attune-runs/untrusted-repo-default-deny")
    expect(keys).toContain("batch/v1/Job/attune-runs/thinkcentre-cpu-worker")
    expect(keys).toContain("attune.dev/v1alpha1/AttuneWorkerPool/attune-runs/thinkcentre-cpu")
  })

  it("renders the local compute stack with durable postgres and intermittent gpu pool", () => {
    const plan = createAlchemyK8sProvider().plan(LocalComputeStack.thinkcentreWithIntermittentGpu())
    const keys = plan.objects.map(objectKey)

    expect(keys).toContain("apps/v1/StatefulSet/attune-runs/attune-postgres")
    expect(keys).toContain("v1/Service/attune-runs/attune-postgres")
    expect(keys).toContain("apps/v1/Deployment/attune-runs/attune-control-plane")
    expect(keys).toContain("attune.dev/v1alpha1/AttuneWorkerPool/attune-runs/desktop-gpu")
  })

  it("renders discovery workflow phases, CRDs, and concrete tool jobs", () => {
    const plan = createAlchemyK8sProvider().plan(
      AttuneDiscoveryWorkflow.make({
        runId: "run-001",
        namespace: "attune-runs",
        repoUrl: "https://example.invalid/repo.git",
        workerImage: "registry.local/attune-worker:test",
      }),
    )
    const keys = plan.objects.map(objectKey)

    expect(keys).toContain("attune.dev/v1alpha1/AttuneDiscoveryRun/attune-runs/run-001")
    expect(keys).toContain("attune.dev/v1alpha1/AttuneRepoSandbox/attune-runs/run-001")
    expect(keys).toContain("attune.dev/v1alpha1/JoernQuery/attune-runs/run-001-source-sink")
    expect(keys).toContain("batch/v1/Job/attune-runs/run-001-indexing-tool")
    expect(keys).toContain("batch/v1/Job/attune-runs/run-001-report-writing-tool")
  })

  it("keeps CRD metadata available from generated types", () => {
    expect(AttuneCrds.attuneDiscoveryRunCrdMetadata).toEqual({
      apiVersion: "attune.dev/v1alpha1",
      group: "attune.dev",
      version: "v1alpha1",
      kind: "AttuneDiscoveryRun",
      plural: "attunediscoveryruns",
      scope: "Namespaced",
    })
  })

  it("applies Kubernetes object sets in the Test provider without subprocesses", () => {
    const provider = createKubernetesProviderTest()
    const graph = WorkerPool.thinkcentreCpu("registry.local/attune-worker:test")

    const first = provider.diff(graph)
    const applied = provider.apply(graph)
    const second = provider.diff(graph)

    expect(first.diff.some((entry) => entry.operation === "create")).toBe(true)
    expect(applied.mutated).toBe(true)
    expect(applied.evidenceRefs[0]).toContain("kubernetes-object-set:Test:apply")
    expect(second.diff.every((entry) => entry.operation === "unchanged")).toBe(true)
  })

  it("confines Test provider mutations to its in-memory world", () => {
    const firstProvider = createKubernetesProviderTest()
    const secondProvider = createKubernetesProviderTest()
    const graph = WorkerPool.thinkcentreCpu("registry.local/attune-worker:test")

    expect(firstProvider.apply(graph).mutated).toBe(true)
    expect(firstProvider.diff(graph).diff.every((entry) => entry.operation === "unchanged")).toBe(true)
    expect(secondProvider.diff(graph).diff.some((entry) => entry.operation === "create")).toBe(true)
  })

  it("keeps Kubernetes DryRun apply non-mutating", () => {
    const provider = createKubernetesProviderDryRun()
    const graph = WorkerPool.thinkcentreCpu("registry.local/attune-worker:test")

    const applied = provider.apply(graph)
    const diff = provider.diff(graph)

    expect(applied.mutated).toBe(false)
    expect(diff.diff.some((entry) => entry.operation === "create")).toBe(true)
  })

  it("models local cluster commands without applying them", () => {
    const plan = makeLocalClusterPlan({ driver: "k3d", name: "attune-test", agents: 2 })

    expect(renderCommand(plan.create)).toContain("'k3d' 'cluster' 'create' 'attune-test'")
    expect(plan.create).toMatchObject({
      intentId: "local-cluster:k3d:attune-test:create",
      action: "create",
      executionBoundary: "rendered-only",
    })
    expect(plan.smoke.argv).toEqual(["kubectl", "cluster-info", "--context", "k3d-attune-test"])
  })
})
