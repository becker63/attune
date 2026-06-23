import { describe, expect, it } from "vitest"

import {
  PackageDeclaration,
  PackageViewRoots,
} from "../src/attune.package.js"

const requiredOperationIds = [
  "render-kubernetes-resource-plan",
  "generate-kubernetes-resource-shapes",
  "observe-kubernetes-provider-evidence",
  "resource-readiness-atom-family",
] as const

describe("platform-alchemy-k8s package contract", () => {
  it("declares the authored platform resource provider boundary", () => {
    expect(PackageDeclaration.id).toBe("platform-alchemy-k8s")
    expect(PackageDeclaration.kind).toBe("platform-resource-provider")
    expect(PackageDeclaration.operations.map((operation) => operation.id)).toEqual([
      ...requiredOperationIds,
    ])
  })

  it("keeps the authored resource readiness and provider evidence roots visible", () => {
    expect(PackageViewRoots.reactivityKeys).toEqual(expect.arrayContaining([
      "platform-alchemy-k8s.resource-plan.changed",
      "platform-alchemy-k8s.generated-crds.changed",
      "platform-alchemy-k8s.resource-registry.changed",
      "platform-alchemy-k8s.resource-readiness.changed",
      "platform-alchemy-k8s.provider-evidence.changed",
    ]))
    expect(PackageViewRoots.atoms).toEqual(expect.arrayContaining([
      "kubernetesResourcePlanAtom",
      "generatedCrdShapeAtom",
      "resourceRegistryAtom",
      "resourceReadinessAtom",
      "providerEvidenceAtom",
    ]))
  })
})
