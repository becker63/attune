import { Layer, Schema } from "effect"
import {
  defineOperation,
  definePackageContract,
  definePackageViews,
  defineTypeGuidance,
  touches,
} from "@attune/framework-protocol"
import { createAttuneGenerated } from "./attune.generated.js"

export { PackageContractSchema } from "@attune/framework-protocol"

export const PackageViews = definePackageViews({
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
} as const)

export const PlatformK8sContractError = Schema.Struct({
  code: Schema.Literals([
    "resource-render-failed",
    "generated-shape-stale",
    "provider-observation-failed",
    "provider-live-boundary-waived",
    "readiness-observation-failed",
  ] as const),
  message: Schema.String,
  operationId: Schema.optional(Schema.String),
  evidenceRef: Schema.optional(Schema.String),
})
export type PlatformK8sContractError = typeof PlatformK8sContractError.Type

export const PlatformResourceKind = Schema.Literals([
  "AttuneDiscoveryWorkflow",
  "WorkerPool",
  "LocalComputeStack",
  "AttuneCustomResources",
] as const)

export const KubernetesProviderMode = Schema.Literals(["DryRun", "Test", "Live"] as const)

export const KubernetesObjectSetAction = Schema.Literals([
  "render",
  "validate",
  "read",
  "diff",
  "apply",
  "delete",
] as const)

export const ResourcePlanInput = Schema.Struct({
  resourceKind: PlatformResourceKind,
  namespace: Schema.optional(Schema.String),
  runId: Schema.optional(Schema.String),
  includeCrds: Schema.optional(Schema.Boolean),
})
export type ResourcePlanInput = typeof ResourcePlanInput.Type

export const ResourcePlanOutput = Schema.Struct({
  provider: Schema.Literal("attune:alchemy:kubernetes"),
  resourceId: Schema.String,
  objectKeys: Schema.Array(Schema.String),
  objectKinds: Schema.Array(Schema.String),
  readinessAtoms: Schema.Array(Schema.String),
})
export type ResourcePlanOutput = typeof ResourcePlanOutput.Type

export const GeneratedShapeInput = Schema.Struct({
  stage: Schema.Literals([
    "emit-crd-manifests",
    "emit-crd-types",
    "sync-k8s-resources",
  ] as const),
  sourceRoot: Schema.optional(Schema.String),
})
export type GeneratedShapeInput = typeof GeneratedShapeInput.Type

export const GeneratedShapeOutput = Schema.Struct({
  generatedFiles: Schema.Array(Schema.String),
  sourceFiles: Schema.Array(Schema.String),
  deterministic: Schema.Boolean,
  sourceBomTarget: Schema.String,
})
export type GeneratedShapeOutput = typeof GeneratedShapeOutput.Type

export const ProviderEvidenceInput = Schema.Struct({
  mode: KubernetesProviderMode,
  action: KubernetesObjectSetAction,
  resourceKind: PlatformResourceKind,
  liveApplyAllowed: Schema.optional(Schema.Boolean),
})
export type ProviderEvidenceInput = typeof ProviderEvidenceInput.Type

export const ProviderEvidenceOutput = Schema.Struct({
  mode: KubernetesProviderMode,
  action: KubernetesObjectSetAction,
  mutated: Schema.Boolean,
  evidenceRefs: Schema.Array(Schema.String),
  observedObjectKeys: Schema.Array(Schema.String),
  diffOperations: Schema.Array(Schema.Literals(["create", "update", "delete", "unchanged"] as const)),
})
export type ProviderEvidenceOutput = typeof ProviderEvidenceOutput.Type

export const ReadinessAtomInput = Schema.Struct({
  atomId: Schema.Literals(["resourceReadinessAtom", "providerEvidenceAtom"] as const),
  resourceKind: PlatformResourceKind,
})
export type ReadinessAtomInput = typeof ReadinessAtomInput.Type

export const ReadinessAtomOutput = Schema.Struct({
  atomId: Schema.String,
  dependsOnAtoms: Schema.Array(Schema.String),
  reactivityKeys: Schema.Array(Schema.String),
  valueKind: Schema.Literals(["resource-readiness", "provider-evidence"] as const),
  observed: Schema.Boolean,
})
export type ReadinessAtomOutput = typeof ReadinessAtomOutput.Type

const resourceProviderLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "side-effect.declared-boundary",
  "resource.observe-before-apply",
  "view.reactivity-key-moves",
  "view.atom-moves",
  "resource.observed-idempotence",
] as const

const generatedShapeLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "determinism.same-input-same-output",
  "side-effect.virtual-tree-only",
  "generator.options-decode",
  "generator.deterministic-output",
  "generator.provenance-recorded",
  "generator.no-untracked-output",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

const atomFamilyLaws = [
  "schema.decode",
  "schema.encode",
  "schema.error-decode",
  "side-effect.no-durable-atom-write",
  "atom-family.base-refresh",
  "atom-family.derived-composes",
  "view.reactivity-key-moves",
  "view.atom-moves",
] as const

export const renderKubernetesResourcePlanOperation = defineOperation({
  id: "render-kubernetes-resource-plan",
  name: "Render Kubernetes resource plan",
  kind: "resource-provider",
  observes: true,
  input: ResourcePlanInput,
  output: ResourcePlanOutput,
  error: PlatformK8sContractError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "platform-alchemy-k8s.resource-plan.changed",
      "platform-alchemy-k8s.resource-readiness.changed",
    ],
    atoms: ["kubernetesResourcePlanAtom", "resourceReadinessAtom"],
  } as const),
  laws: resourceProviderLaws,
  resource: {
    observes: true,
    desiredStateSchema: "RenderedResourceSet",
    observationSchema: "KubernetesProviderPlan",
    provider: "attune:alchemy:kubernetes",
    liveApply: false,
  } as const,
} as const)

export const generateKubernetesResourceShapesOperation = defineOperation({
  id: "generate-kubernetes-resource-shapes",
  name: "Generate Kubernetes CRD and resource shapes",
  kind: "generator",
  input: GeneratedShapeInput,
  output: GeneratedShapeOutput,
  error: PlatformK8sContractError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "platform-alchemy-k8s.generated-crds.changed",
      "platform-alchemy-k8s.resource-registry.changed",
    ],
    atoms: ["generatedCrdShapeAtom", "resourceRegistryAtom"],
  } as const),
  laws: generatedShapeLaws,
  generator: {
    name: "@attune/nx:sync-k8s-resources",
    project: "platform-alchemy-k8s",
    output: "generated-source",
    generatedFiles: [
      "src/generated/crds.ts",
      "src/generated/crds/*.crd.json",
      "src/resources/ResourceRegistry.generated.ts",
    ],
  } as const,
} as const)

export const observeKubernetesProviderEvidenceOperation = defineOperation({
  id: "observe-kubernetes-provider-evidence",
  name: "Observe Kubernetes provider evidence",
  kind: "resource-provider",
  observes: true,
  input: ProviderEvidenceInput,
  output: ProviderEvidenceOutput,
  error: PlatformK8sContractError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "platform-alchemy-k8s.provider-evidence.changed",
      "platform-alchemy-k8s.resource-readiness.changed",
    ],
    atoms: ["providerEvidenceAtom", "resourceReadinessAtom"],
  } as const),
  laws: resourceProviderLaws,
  resource: {
    observes: true,
    desiredStateSchema: "RenderedResourceSet",
    observationSchema: "KubernetesObjectSetResult",
    provider: "KubernetesProvider",
    liveModes: ["DryRun", "Test"],
    waivedLiveMode: "Live",
  } as const,
} as const)

export const resourceReadinessAtomFamilyOperation = defineOperation({
  id: "resource-readiness-atom-family",
  name: "Resource readiness and provider evidence atoms",
  kind: "atom-family",
  input: ReadinessAtomInput,
  output: ReadinessAtomOutput,
  error: PlatformK8sContractError,
  views: touches(PackageViews, {
    reactivityKeys: [
      "platform-alchemy-k8s.resource-readiness.changed",
      "platform-alchemy-k8s.provider-evidence.changed",
    ],
    atoms: ["resourceReadinessAtom", "providerEvidenceAtom"],
  } as const),
  laws: atomFamilyLaws,
  atom: {
    family: "platform-resource-readiness",
    baseAtoms: ["kubernetesResourcePlanAtom", "generatedCrdShapeAtom", "resourceRegistryAtom"],
    derivedAtoms: ["resourceReadinessAtom", "providerEvidenceAtom"],
    composes: true,
  } as const,
} as const)

export const PackageContract = definePackageContract({
  packageId: "platform-alchemy-k8s",
  sourceRoot: "packages/platform-alchemy-k8s/src",
  packageKind: "platform-resource-provider",
  views: PackageViews,
  services: [] as const,
  providedServices: [] as const,
  operations: [
    renderKubernetesResourcePlanOperation,
    generateKubernetesResourceShapesOperation,
    observeKubernetesProviderEvidenceOperation,
    resourceReadinessAtomFamilyOperation,
  ] as const,
  provenance: {
    generator: "@attune/nx:package-contract",
    project: "platform-alchemy-k8s",
    openspecChangeId: "standardize-effect-package-contracts",
    customizedFor: "Alchemy-shaped Kubernetes resource and provider boundary",
  } as const,
  waivers: [
    {
      id: "platform-alchemy-k8s/live-provider-apply-boundary",
      category: "provider-runtime-boundary",
      owner: "platform-alchemy-k8s-migration-agent",
      reason:
        "Live Kubernetes apply/delete depends on cluster state and human-reviewed provider credentials; package tests cover DryRun and Test providers only.",
      review: "standardize-effect-package-contracts task 12.4",
    },
    {
      id: "platform-alchemy-k8s/context-resource-scoped-provider",
      category: "legacy-boundary",
      owner: "platform-alchemy-k8s-migration-agent",
      reason:
        "Alchemy and Effect Kubernetes provider seams remain resource-scoped while typed provider executors and service layers are migrated.",
      review: "standardize-effect-package-contracts task 12.3",
    },
  ] as const,
} as const)
export type PackageContract = typeof PackageContract

export const PackageLayer = {
  layer: Layer.empty,
  provides: [] as const,
  requires: [] as const,
  metadata: {
    packageId: "platform-alchemy-k8s",
    role: "platform-resource-provider-contract",
  },
} as const
export type PackageLayer = typeof PackageLayer

export const PackageTestLayer = {
  layer: Layer.empty,
  provides: [] as const,
  requires: [] as const,
  metadata: {
    packageId: "platform-alchemy-k8s",
    role: "dry-run-and-test-provider-contract",
    liveApply: false,
  },
} as const
export type PackageTestLayer = typeof PackageTestLayer

export type PlatformAlchemyK8sOperationId =
  (typeof PackageContract.operations)[number]["id"]

const PackageGenerated = createAttuneGenerated({
  PackageContract,
  atomFamilyLaws,
  generatedShapeLaws,
  generateKubernetesResourceShapesOperation,
  observeKubernetesProviderEvidenceOperation,
  renderKubernetesResourcePlanOperation,
  resourceProviderLaws,
  resourceReadinessAtomFamilyOperation,
} as const)
export const PackageFuzzHandlers = PackageGenerated.PackageFuzzHandlers
export const PackageProperties = PackageGenerated.PackageProperties
export const PackageTypeGuidance = PackageGenerated.PackageTypeGuidance
export type PackageFuzzHandlers = typeof PackageFuzzHandlers
export type PackageProperties = typeof PackageProperties
export type PackageTypeGuidance = typeof PackageTypeGuidance
