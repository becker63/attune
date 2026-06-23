import { describe, expect, expectTypeOf, it } from "vitest"

import {
  assertExactHandlers,
  assertLayerProvidesPackageServices,
  assertLayerSatisfiesRequiredServices,
  assertPackageContract,
  assertPropertyHarnesses,
  assertTypeGuidanceComplete,
  decodePackageContract,
  inferLawIds,
  packagePartitionIds,
  type OperationIds,
} from "@attune/framework-protocol"
import {
  PackageContract,
  PackageFuzzHandlers,
  PackageLayer,
  PackageProperties,
  PackageTestLayer,
  PackageTypeGuidance,
  PackageViews,
  observeKubernetesProviderEvidenceOperation,
  renderKubernetesResourcePlanOperation,
} from "../src/attune.package.js"

const requiredOperationIds = [
  "render-kubernetes-resource-plan",
  "generate-kubernetes-resource-shapes",
  "observe-kubernetes-provider-evidence",
  "resource-readiness-atom-family",
] as const

type PlatformAlchemyK8sOperationId = OperationIds<typeof PackageContract>

describe("platform-alchemy-k8s package contract", () => {
  it("declares the platform resource provider boundary and operation ids", () => {
    expect(PackageContract.packageId).toBe("platform-alchemy-k8s")
    expect(PackageContract.packageKind).toBe("platform-resource-provider")
    expect(PackageContract.sourceRoot).toBe("packages/platform-alchemy-k8s/src")
    expect(PackageContract.operations.map((operation: { readonly id: string }) => operation.id)).toEqual([
      ...requiredOperationIds,
    ])

    expectTypeOf<PlatformAlchemyK8sOperationId>().toEqualTypeOf<
      (typeof requiredOperationIds)[number]
    >()

    const decoded = decodePackageContract(PackageContract)
    expect(decoded.contract?.packageId).toBe("platform-alchemy-k8s")
    expect(decoded.contract?.operations).toHaveLength(requiredOperationIds.length)
  })

  it("records resource readiness and provider evidence views", () => {
    expect(PackageViews.reactivityKeys).toEqual(expect.arrayContaining([
      "platform-alchemy-k8s.resource-plan.changed",
      "platform-alchemy-k8s.generated-crds.changed",
      "platform-alchemy-k8s.resource-readiness.changed",
      "platform-alchemy-k8s.provider-evidence.changed",
    ]))
    expect(PackageViews.atoms).toEqual(expect.arrayContaining([
      "kubernetesResourcePlanAtom",
      "generatedCrdShapeAtom",
      "resourceReadinessAtom",
      "providerEvidenceAtom",
    ]))
    expect(renderKubernetesResourcePlanOperation.views?.atoms).toContain(
      "resourceReadinessAtom",
    )
    expect(observeKubernetesProviderEvidenceOperation.views?.atoms).toContain(
      "providerEvidenceAtom",
    )
  })

  it("keeps exact handler/property maps and type guidance aligned", () => {
    expect(Object.keys(PackageFuzzHandlers)).toEqual([...requiredOperationIds])
    expect(Object.keys(PackageProperties)).toEqual([...requiredOperationIds])
    expect(assertPackageContract(PackageContract)).toBe(true)
    expect(assertExactHandlers(PackageContract, PackageFuzzHandlers)).toBe(true)
    expect(assertPropertyHarnesses(PackageContract, PackageProperties)).toBe(true)
    expect(assertLayerProvidesPackageServices(PackageContract, PackageLayer)).toBe(true)
    expect(assertLayerSatisfiesRequiredServices(PackageContract, PackageTestLayer)).toBe(true)
    expect(assertTypeGuidanceComplete(PackageContract, PackageTypeGuidance)).toBe(true)
  })

  it("keeps live apply out of deterministic provider evidence", () => {
    expect(PackageTestLayer.metadata).toMatchObject({
      role: "dry-run-and-test-provider-contract",
      liveApply: false,
    })
    expect(PackageContract.waivers?.map((waiver: { readonly id: string }) => waiver.id)).toEqual(
      expect.arrayContaining([
        "platform-alchemy-k8s/live-provider-apply-boundary",
        "platform-alchemy-k8s/context-resource-scoped-provider",
      ]),
    )
    expect(PackageFuzzHandlers["observe-kubernetes-provider-evidence"]()).toMatchObject({
      mode: "DryRun",
      mutated: false,
    })
  })

  it("records inferred resource-provider laws and type-guidance partitions", () => {
    expect(
      inferLawIds({
        id: renderKubernetesResourcePlanOperation.id,
        kind: renderKubernetesResourcePlanOperation.kind,
        schemas: {
          input: renderKubernetesResourcePlanOperation.input,
          output: renderKubernetesResourcePlanOperation.output,
          error: renderKubernetesResourcePlanOperation.error,
        },
        views: {
          reactivityKeys: renderKubernetesResourcePlanOperation.views?.reactivityKeys,
          atoms: renderKubernetesResourcePlanOperation.views?.atoms,
        },
        resource: {
          observes: true,
          observationSchema: "KubernetesProviderPlan",
          desiredStateSchema: "RenderedResourceSet",
        },
      }),
    ).toEqual(renderKubernetesResourcePlanOperation.laws)

    const partitions = packagePartitionIds(PackageTypeGuidance)
    expect(partitions["observe-kubernetes-provider-evidence"]).toEqual(expect.arrayContaining([
      "observe-kubernetes-provider-evidence.mode-action",
      "observe-kubernetes-provider-evidence.evidence-refs",
      "platform-alchemy-k8s.provider-evidence.changed.moves",
      "providerEvidenceAtom.moves",
    ]))
    expect(
      PackageTypeGuidance.operations["observe-kubernetes-provider-evidence"].filters,
    ).toEqual([
      expect.objectContaining({
        id: "observe-kubernetes-provider-evidence.no-live-apply",
        kind: "operation-precondition",
      }),
    ])
  })
})
