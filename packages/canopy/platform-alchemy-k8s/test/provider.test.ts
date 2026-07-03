import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import {
  RecipeObservationView,
  RecipeRecordView,
  type RecipeDefinition,
} from "@attune/framework-protocol"

import {
  AttuneDiscoveryWorkflow,
  WorkerPool,
  AttuneCrds,
  LocalComputeStack,
  PlatformAlchemyK8sRecipes,
  createAlchemyK8sProvider,
  createKubernetesProviderDryRun,
  createKubernetesProviderTest,
  makeLocalClusterPlan,
  objectKey,
  renderCommand,
} from "../src/index.js"

describe("platform-alchemy-k8s", () => {
  it("declares platform Alchemy Kubernetes recipes from the package barrel", () => {
    const records = PlatformAlchemyK8sRecipes.map((recipe) =>
      RecipeRecordView.fromRecipe(recipe as RecipeDefinition<unknown, unknown>)
    )

    expect(records.map((record) => record.recipeId)).toEqual([
      "platform-alchemy-k8s.crd-generation-cli-invocation",
      "platform-alchemy-k8s.crd-type-generation",
      "platform-alchemy-k8s.local-cluster-plan",
      "platform-alchemy-k8s.crd-definitions",
      "platform-alchemy-k8s.crd-types",
      "platform-alchemy-k8s.provider-contract",
      "platform-alchemy-k8s.effect-k8s-client-boundary",
      "platform-alchemy-k8s.kubernetes-types-contract",
      "platform-alchemy-k8s.resource-common",
      "platform-alchemy-k8s.attune-artifact-resource",
      "platform-alchemy-k8s.attune-budget-resource",
      "platform-alchemy-k8s.attune-discovery-run-resource",
      "platform-alchemy-k8s.attune-phase-resource",
      "platform-alchemy-k8s.attune-policy-resource",
      "platform-alchemy-k8s.attune-report-resource",
      "platform-alchemy-k8s.attune-tool-job-resource",
      "platform-alchemy-k8s.budget-policy-resource",
      "platform-alchemy-k8s.control-plane-resource",
      "platform-alchemy-k8s.custom-resources-resource",
      "platform-alchemy-k8s.resources-barrel",
      "platform-alchemy-k8s.joern-query-resource",
      "platform-alchemy-k8s.postgres-resource",
      "platform-alchemy-k8s.repo-sandbox-resource",
      "platform-alchemy-k8s.resource-class-resource",
      "platform-alchemy-k8s.run-namespace-resource",
      "platform-alchemy-k8s.worker-pool-resource",
      "platform-alchemy-k8s.resource-registry",
      "platform-alchemy-k8s.provider-bridge",
      "platform-alchemy-k8s.local-compute-stack",
      "platform-alchemy-k8s.discovery-workflow",
      "platform-alchemy-k8s.kubernetes-object-set",
      "platform-alchemy-k8s.test-suite",
    ])
    expect(records.find((record) => record.recipeId === "platform-alchemy-k8s.kubernetes-object-set")).toMatchObject({
      kind: "managed-recipe",
      resourceKind: "kubernetes-object-set",
      humanReviewRequired: true,
    })
    const managedRecipe = PlatformAlchemyK8sRecipes.find((recipe) => recipe.id === "platform-alchemy-k8s.kubernetes-object-set")
    expect(managedRecipe?.handler?.layer?.id).toBe("platform-alchemy-k8s.kubernetes-provider-runtime.layer")
    expect(managedRecipe?.alchemyDag?.some((edge) => edge.kind === "manages")).toBe(true)
  })

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

  it("keeps CRD metadata available from source-owned types", () => {
    expect(AttuneCrds.attuneDiscoveryRunCrdMetadata).toEqual({
      apiVersion: "attune.dev/v1alpha1",
      group: "attune.dev",
      version: "v1alpha1",
      kind: "AttuneDiscoveryRun",
      plural: "attunediscoveryruns",
      scope: "Namespaced",
    })
  })

  it("makes generated Kubernetes artifacts cache-owned and freshness-observable", () => {
    const crdTypesPath = ".attune/cache/generated/platform-alchemy-k8s/crds.ts"
    const resourceRegistryPath = ".attune/cache/generated/platform-alchemy-k8s/resources/ResourceRegistry.generated.ts"

    expect(readFileSync(new URL(`../../../../packages/canopy/platform-alchemy-k8s/src/crds/types.ts`, import.meta.url), "utf8")).toContain(
      "Source-owned CRD type facade",
    )
    expect(readFileSync(new URL(`../../../../${crdTypesPath}`, import.meta.url), "utf8")).toContain(
      "@generated by recipe platform-alchemy-k8s.crd-type-generation",
    )
    expect(readFileSync(new URL(`../../../../${resourceRegistryPath}`, import.meta.url), "utf8")).toContain(
      "@generated by recipe platform-alchemy-k8s.local-compute-stack",
    )
    expect(PlatformAlchemyK8sRecipes.find((recipe) => recipe.id === "platform-alchemy-k8s.crd-type-generation")?.allowedFiles).toContain(
      ".attune/cache/generated/platform-alchemy-k8s/**",
    )
    expect(PlatformAlchemyK8sRecipes.find((recipe) => recipe.id === "platform-alchemy-k8s.local-compute-stack")?.allowedFiles).toContain(
      "packages/canopy/platform-alchemy-k8s/src/resources/local-compute-stack.ts",
    )

    expect(RecipeObservationView.generatedArtifactFreshness({
      recipeId: "platform-alchemy-k8s.crd-type-generation",
      artifactPath: crdTypesPath,
      fresh: true,
      observedAt: "2026-06-28T00:00:00.000Z",
      source: "platform-alchemy-k8s:test",
    })).toMatchObject({
      observationKind: "generated-artifact.freshness",
      payload: {
        ownerRecipeId: "platform-alchemy-k8s.crd-type-generation",
        artifactPath: crdTypesPath,
        fresh: true,
      },
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
