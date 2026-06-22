import { Layer, Schema } from "effect"
import {
  defineOperation,
  definePackageContract,
  definePackageViews,
  defineTypeGuidance,
  touches,
} from "@attune/framework-protocol"

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

export const PackageFuzzHandlers = {
  "render-kubernetes-resource-plan": () => ({
    provider: "attune:alchemy:kubernetes" as const,
    resourceId: "worker-pool:thinkcentre-cpu",
    objectKeys: [
      "v1/Namespace/_/attune-runs",
      "batch/v1/Job/attune-runs/thinkcentre-cpu-worker",
      "attune.dev/v1alpha1/AttuneWorkerPool/attune-runs/thinkcentre-cpu",
    ],
    objectKinds: ["Namespace", "Job", "AttuneWorkerPool"],
    readinessAtoms: ["resourceReadinessAtom"],
  }),
  "generate-kubernetes-resource-shapes": () => ({
    generatedFiles: [
      "src/generated/crds.ts",
      "src/generated/crds/attunediscoveryruns.crd.json",
      "src/resources/ResourceRegistry.generated.ts",
    ],
    sourceFiles: ["src/crds/definitions.ts", "src/resources/worker-pool.ts"],
    deterministic: true,
    sourceBomTarget: "check-generated",
  }),
  "observe-kubernetes-provider-evidence": () => ({
    mode: "DryRun" as const,
    action: "diff" as const,
    mutated: false,
    evidenceRefs: ["kubernetes-object-set:DryRun:diff:worker-pool:thinkcentre-cpu"],
    observedObjectKeys: [],
    diffOperations: ["create" as const],
  }),
  "resource-readiness-atom-family": () => ({
    atomId: "resourceReadinessAtom",
    dependsOnAtoms: [
      "kubernetesResourcePlanAtom",
      "generatedCrdShapeAtom",
      "providerEvidenceAtom",
    ],
    reactivityKeys: [
      "platform-alchemy-k8s.resource-readiness.changed",
      "platform-alchemy-k8s.provider-evidence.changed",
    ],
    valueKind: "resource-readiness" as const,
    observed: true,
  }),
} as const satisfies { readonly [Id in PlatformAlchemyK8sOperationId]: () => unknown }
export type PackageFuzzHandlers = typeof PackageFuzzHandlers

export const PackageProperties = {
  "render-kubernetes-resource-plan": {
    property:
      "Rendered PlatformResourceSet values decode as Kubernetes object plans and move readiness views without applying to a cluster.",
  },
  "generate-kubernetes-resource-shapes": {
    property:
      "CRD manifests, generated TypeScript CRD types, and ResourceRegistry generated output are deterministic and Source BOM-backed.",
  },
  "observe-kubernetes-provider-evidence": {
    property:
      "DryRun and Test provider observations produce schema-backed evidence refs, stable diffs, and no live apply side effects.",
  },
  "resource-readiness-atom-family": {
    property:
      "Resource readiness and provider evidence atoms compose rendered resources and provider evidence without durable writes.",
  },
} as const satisfies {
  readonly [Id in PlatformAlchemyK8sOperationId]: { readonly property: string }
}
export type PackageProperties = typeof PackageProperties

export const PackageTypeGuidance = defineTypeGuidance(PackageContract, {
  sourceLabels: [
    "contract.operation",
    "effect-schema.ast",
    "operation.kind.platform-resource-provider",
    "kubernetes-resource-shape",
    "provider-evidence",
  ],
  sources: [
    {
      id: "contract:platform-alchemy-k8s",
      label: "platform-alchemy-k8s package contract",
      kind: "contract-operation",
    },
    {
      id: "views:platform-alchemy-k8s",
      label: "platform-alchemy-k8s Reactivity and atom graph",
      kind: "declared-view",
    },
  ],
  operations: {
    "render-kubernetes-resource-plan": operationGuidance(
      renderKubernetesResourcePlanOperation,
      resourceProviderLaws,
      {
        inputPartitionId: "render-kubernetes-resource-plan.resource-kind",
        outputPartitionId: "render-kubernetes-resource-plan.object-keys",
        coverageTargetId: "kubernetesResourcePlanAtom.moves",
        transformId: "render-kubernetes-resource-plan.resource-kind-coverage",
      },
    ),
    "generate-kubernetes-resource-shapes": operationGuidance(
      generateKubernetesResourceShapesOperation,
      generatedShapeLaws,
      {
        inputPartitionId: "generate-kubernetes-resource-shapes.stage",
        outputPartitionId: "generate-kubernetes-resource-shapes.generated-files",
        coverageTargetId: "generatedCrdShapeAtom.moves",
        transformId: "generate-kubernetes-resource-shapes.stage-coverage",
      },
    ),
    "observe-kubernetes-provider-evidence": operationGuidance(
      observeKubernetesProviderEvidenceOperation,
      resourceProviderLaws,
      {
        inputPartitionId: "observe-kubernetes-provider-evidence.mode-action",
        outputPartitionId: "observe-kubernetes-provider-evidence.evidence-refs",
        coverageTargetId: "providerEvidenceAtom.moves",
        transformId: "observe-kubernetes-provider-evidence.dry-run-test-coverage",
        filterId: "observe-kubernetes-provider-evidence.no-live-apply",
      },
    ),
    "resource-readiness-atom-family": operationGuidance(
      resourceReadinessAtomFamilyOperation,
      atomFamilyLaws,
      {
        inputPartitionId: "resource-readiness-atom-family.atom-id",
        outputPartitionId: "resource-readiness-atom-family.observation",
        coverageTargetId: "resourceReadinessAtom.moves",
        transformId: "resource-readiness-atom-family.atom-coverage",
      },
    ),
  },
} as const)
export type PackageTypeGuidance = typeof PackageTypeGuidance

type OperationWithGuidance = {
  readonly id: string
  readonly kind: string
  readonly input: unknown
  readonly output: unknown
  readonly error?: unknown
  readonly views?: {
    readonly reactivityKeys?: readonly string[]
    readonly atoms?: readonly string[]
  }
  readonly laws?: readonly string[]
}

type LawPartition<Laws extends readonly string[]> = {
  readonly [Index in keyof Laws]: {
    readonly id: Laws[Index]
    readonly kind: "law"
    readonly from: "inferred-law"
  }
}

function operationGuidance<
  const Operation extends OperationWithGuidance,
  const Laws extends readonly string[],
>(
  operation: Operation,
  laws: Laws,
  options: {
    readonly inputPartitionId: string
    readonly outputPartitionId: string
    readonly coverageTargetId: string
    readonly transformId: string
    readonly filterId?: string
  },
) {
  return {
    sourceLabels: [
      `operation.kind.${operation.kind}`,
      "effect-schema.ast",
      "package-view-graph",
    ],
    sources: [
      {
        id: `operation:${operation.id}`,
        label: operation.id,
        kind: "contract-operation" as const,
        operationId: operation.id,
      },
    ],
    schemaSources: [
      schemaSource(operation.id, "input"),
      schemaSource(operation.id, "output"),
      schemaSource(operation.id, "error"),
    ],
    inputPartitions: [
      {
        id: options.inputPartitionId,
        kind: "schema-boundary" as const,
        from: "schema.input",
        sourceId: `schema:${operation.id}:input`,
        transformIds: [options.transformId],
        ...(options.filterId ? { filterIds: [options.filterId] } : {}),
      },
    ],
    outputPartitions: [
      {
        id: options.outputPartitionId,
        kind: "output-variant" as const,
        from: "schema.output",
        sourceId: `schema:${operation.id}:output`,
      },
    ],
    errorPartitions: [
      {
        id: `${operation.id}.typed-error`,
        kind: "typed-error-variant" as const,
        from: "schema.error",
        sourceId: `schema:${operation.id}:error`,
      },
    ],
    lawPartitions: lawPartitions(laws),
    viewPartitions: [
      ...viewPartitions(operation.id, "reactivity-key", operation.views?.reactivityKeys ?? []),
      ...viewPartitions(operation.id, "atom", operation.views?.atoms ?? []),
    ],
    coverageSearch: [
      {
        id: `coverage:${operation.id}:${options.coverageTargetId}`,
        targetPartitionId: options.coverageTargetId,
        tier: "commit" as const,
        required: true,
      },
    ],
    transforms: [
      {
        id: options.transformId,
        kind: "coverage-bias" as const,
        targetPartitionId: options.coverageTargetId,
        reason:
          "Bias generated cases toward missing Kubernetes resource/provider view movement.",
      },
    ],
    filters: options.filterId
      ? [
        {
          id: options.filterId,
          kind: "operation-precondition" as const,
          reason:
            "Generated provider audits stay on DryRun or Test modes; live apply remains a waivered provider boundary.",
          targetPartitionId: options.inputPartitionId,
          expectedAcceptanceRate: 0.95,
        },
      ]
      : [],
  } as const
}

function schemaSource(operationId: string, role: "input" | "output" | "error") {
  return {
    id: `schema:${operationId}:${role}`,
    role,
    label: `${operationId}.${role}`,
    source: "effect-schema" as const,
  }
}

function lawPartitions<const Laws extends readonly string[]>(laws: Laws): LawPartition<Laws> {
  return laws.map((id) => ({
    id,
    kind: "law",
    from: "inferred-law",
  })) as LawPartition<Laws>
}

function viewPartitions(
  operationId: string,
  kind: "reactivity-key" | "atom",
  values: readonly string[],
) {
  return values.map((value) => ({
    id: `${value}.moves`,
    kind,
    from: kind === "reactivity-key" ? "operation.views.reactivityKeys" : "operation.views.atoms",
    label: `${operationId}:${value}`,
  })) as readonly {
    readonly id: string
    readonly kind: "reactivity-key" | "atom"
    readonly from: "operation.views.reactivityKeys" | "operation.views.atoms"
    readonly label: string
  }[]
}
