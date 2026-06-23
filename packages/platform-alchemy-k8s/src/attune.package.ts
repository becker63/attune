import { defineAttunePackageDeclaration } from "@attune/framework-protocol"

export { PackageContractSchema } from "@attune/framework-protocol"

export const PackageViewRoots = {
  reactivityKeys: [
    "platform-alchemy-k8s.resource-plan.changed",
    "platform-alchemy-k8s.generated-crds.changed",
    "platform-alchemy-k8s.resource-registry.changed",
    "platform-alchemy-k8s.resource-readiness.changed",
    "platform-alchemy-k8s.provider-evidence.changed",
  ],
  atoms: [
    "kubernetesResourcePlanAtom",
    "generatedCrdShapeAtom",
    "resourceRegistryAtom",
    "resourceReadinessAtom",
    "providerEvidenceAtom",
  ],
} as const

export const PackageDeclaration = defineAttunePackageDeclaration({
  id: "platform-alchemy-k8s",
  kind: "platform-resource-provider",
  operations: [
    {
      id: "render-kubernetes-resource-plan",
      kind: "resource-provider",
      name: "Render Kubernetes resource plan",
    },
    {
      id: "generate-kubernetes-resource-shapes",
      kind: "generator",
      name: "Generate Kubernetes CRD and resource shapes",
    },
    {
      id: "observe-kubernetes-provider-evidence",
      kind: "resource-provider",
      name: "Observe Kubernetes provider evidence",
    },
    {
      id: "resource-readiness-atom-family",
      kind: "atom-family",
      name: "Resource readiness and provider evidence atoms",
    },
  ],
  views: [
    ...PackageViewRoots.reactivityKeys.map((id) => ({
      id,
      kind: "reactivity-key" as const,
    })),
    ...PackageViewRoots.atoms.map((id) => ({
      id,
      kind: "atom" as const,
    })),
  ],
} as const)
