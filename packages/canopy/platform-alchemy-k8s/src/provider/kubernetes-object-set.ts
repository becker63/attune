import {
  defineManagedRecipe,
  defineManagedRecipeAlchemyBinding,
  defineRecipeHandler,
  defineRecipeLayer,
  type RecipeRepair,
} from "@attune/framework-protocol"
import { Context, Effect, Layer, Schema } from "effect"

import {
  KubernetesObjectSchema,
  RenderedResourceSet,
  objectKey,
  type KubernetesObject,
  type PlatformResourceSet,
} from "./alchemy-k8s-provider.js"
import { AttuneKubernetesGraphResourceContract } from "./alchemy-resource.js"
import { resourceSet } from "../resources/common.js"

export const KubernetesObjectSetRecipeId =
  "platform-alchemy-k8s.kubernetes-object-set" as const
const KubernetesObjectSetHandlerId =
  "platform-alchemy-k8s.kubernetes-object-set.handler" as const
const KubernetesObjectSetAlchemyBindingId =
  "platform-alchemy-k8s.kubernetes-object-set.alchemy" as const
const KubernetesProviderRuntimeLayerId =
  "platform-alchemy-k8s.kubernetes-provider-runtime.layer" as const
const KubernetesProviderRuntimeServiceId =
  "platform-alchemy-k8s.kubernetes-provider-runtime" as const
const PlatformAlchemyK8sProviderBridgeRecipeId =
  "platform-alchemy-k8s.provider-bridge" as const
const PlatformAlchemyK8sProviderCollectionId =
  "platform-alchemy-k8s.provider-collection" as const
const KubernetesObjectSetLifecycleSubstrateId =
  "platform-alchemy-k8s.alchemy-provider" as const
const KubernetesObjectSetDriftRepairId =
  "recipe-repair:platform-alchemy-k8s.kubernetes-object-set:drift" as const
const KubernetesObjectSetDriftRepairRisk = "needs-review" as const
const KubernetesObjectSetSourcePath =
  "packages/canopy/platform-alchemy-k8s/src/provider/kubernetes-object-set.ts" as const

export type KubernetesProviderMode = "Live" | "DryRun" | "Test"
export type KubernetesObjectSetAction = "render" | "validate" | "read" | "diff" | "apply" | "delete"
export type KubernetesDiffOperation = "create" | "update" | "delete" | "unchanged"

export interface KubernetesObjectSetDiffEntry {
  readonly key: string
  readonly operation: KubernetesDiffOperation
  readonly desired?: KubernetesObject
  readonly observed?: KubernetesObject
}

export interface KubernetesObjectSetResult {
  readonly provider: "KubernetesProvider"
  readonly mode: KubernetesProviderMode
  readonly action: KubernetesObjectSetAction
  readonly id: string
  readonly objects: readonly KubernetesObject[]
  readonly observed: readonly KubernetesObject[]
  readonly diff: readonly KubernetesObjectSetDiffEntry[]
  readonly mutated: boolean
  readonly evidenceRefs: readonly string[]
}

export interface KubernetesObjectSetWorld {
  readonly objects: ReadonlyMap<string, KubernetesObject>
}

export interface KubernetesProvider {
  readonly provider: "KubernetesProvider"
  readonly mode: KubernetesProviderMode
  readonly render: (resource: PlatformResourceSet) => KubernetesObjectSetResult
  readonly validate: (resource: PlatformResourceSet) => KubernetesObjectSetResult
  readonly read: (resource: PlatformResourceSet) => KubernetesObjectSetResult
  readonly diff: (resource: PlatformResourceSet) => KubernetesObjectSetResult
  readonly apply: (resource: PlatformResourceSet) => KubernetesObjectSetResult
  readonly delete: (resource: PlatformResourceSet) => KubernetesObjectSetResult
}

export const KubernetesProviderModeSchema = Schema.Literals(["DryRun", "Test", "Live"] as const)
export const KubernetesObjectSetActionSchema = Schema.Literals(["render", "validate", "read", "diff", "apply", "delete"] as const)
export const KubernetesDiffOperationSchema = Schema.Literals(["create", "update", "delete", "unchanged"] as const)

export const KubernetesObjectSetRecipeInput = Schema.Struct({
  id: Schema.String,
  objects: Schema.Array(KubernetesObjectSchema),
  mode: KubernetesProviderModeSchema,
  action: Schema.optional(KubernetesObjectSetActionSchema),
})
export type KubernetesObjectSetRecipeInput = typeof KubernetesObjectSetRecipeInput.Type

export const KubernetesObjectSetDiffEntrySchema = Schema.Struct({
  key: Schema.String,
  operation: KubernetesDiffOperationSchema,
  desired: Schema.optional(KubernetesObjectSchema),
  observed: Schema.optional(KubernetesObjectSchema),
})

export const KubernetesObjectSetRecipeOutput = Schema.Struct({
  provider: Schema.Literal("KubernetesProvider"),
  mode: KubernetesProviderModeSchema,
  action: KubernetesObjectSetActionSchema,
  id: Schema.String,
  objects: Schema.Array(KubernetesObjectSchema),
  observed: Schema.Array(KubernetesObjectSchema),
  diff: Schema.Array(KubernetesObjectSetDiffEntrySchema),
  mutated: Schema.Boolean,
  evidenceRefs: Schema.Array(Schema.String),
})
export type KubernetesObjectSetRecipeOutput = typeof KubernetesObjectSetRecipeOutput.Type

export interface KubernetesProviderRuntimeService {
  readonly providerForMode: (mode: KubernetesProviderMode) => KubernetesProvider
}

export class KubernetesProviderRuntime extends Context.Service<
  KubernetesProviderRuntime,
  KubernetesProviderRuntimeService
>()("platform-alchemy-k8s/KubernetesProviderRuntime") {}

const validateObject = (object: KubernetesObject): void => {
  Schema.decodeUnknownSync(KubernetesObjectSchema)(object)
}

const renderObjects = (resource: PlatformResourceSet): readonly KubernetesObject[] => {
  const rendered = resource.render()
  Schema.decodeUnknownSync(RenderedResourceSet)(rendered)
  for (const object of rendered.objects) {
    validateObject(object)
  }
  return rendered.objects
}

const byKey = (objects: Iterable<KubernetesObject>): Map<string, KubernetesObject> =>
  new Map([...objects].map((object) => [objectKey(object), object]))

const diffObjects = (
  desiredObjects: readonly KubernetesObject[],
  observedObjects: readonly KubernetesObject[],
): readonly KubernetesObjectSetDiffEntry[] => {
  const desired = byKey(desiredObjects)
  const observed = byKey(observedObjects)
  const keys = [...new Set([...desired.keys(), ...observed.keys()])].sort()

  return keys.map((key) => {
    const desiredObject = desired.get(key)
    const observedObject = observed.get(key)
    if (desiredObject === undefined) {
      return { key, operation: "delete", ...(observedObject === undefined ? {} : { observed: observedObject }) }
    }
    if (observedObject === undefined) {
      return { key, operation: "create", desired: desiredObject }
    }
    const operation = JSON.stringify(desiredObject) === JSON.stringify(observedObject) ? "unchanged" : "update"
    return { key, operation, desired: desiredObject, observed: observedObject }
  })
}

const result = (props: {
  readonly mode: KubernetesProviderMode
  readonly action: KubernetesObjectSetAction
  readonly id: string
  readonly objects: readonly KubernetesObject[]
  readonly observed: readonly KubernetesObject[]
  readonly mutated: boolean
}): KubernetesObjectSetResult => ({
  provider: "KubernetesProvider",
  mode: props.mode,
  action: props.action,
  id: props.id,
  objects: props.objects,
  observed: props.observed,
  diff: diffObjects(props.objects, props.observed),
  mutated: props.mutated,
  evidenceRefs: [`kubernetes-object-set:${props.mode}:${props.action}:${props.id}`],
})

const createProvider = (mode: KubernetesProviderMode, world: Map<string, KubernetesObject>): KubernetesProvider => {
  const make = (action: KubernetesObjectSetAction, resource: PlatformResourceSet, mutated: boolean): KubernetesObjectSetResult => {
    const objects = renderObjects(resource)
    const observed = objects.map((object) => world.get(objectKey(object))).filter((object): object is KubernetesObject => object !== undefined)
    return result({ mode, action, id: resource.render().id, objects, observed, mutated })
  }

  return {
    provider: "KubernetesProvider",
    mode,
    render: (resource) => make("render", resource, false),
    validate: (resource) => make("validate", resource, false),
    read: (resource) => make("read", resource, false),
    diff: (resource) => make("diff", resource, false),
    apply: (resource) => {
      const rendered = make("apply", resource, mode === "Test")
      if (mode === "Test") {
        for (const object of rendered.objects) {
          world.set(objectKey(object), object)
        }
      }
      return rendered
    },
    delete: (resource) => {
      const rendered = make("delete", resource, mode === "Test")
      if (mode === "Test") {
        for (const object of rendered.objects) {
          world.delete(objectKey(object))
        }
      }
      return rendered
    },
  }
}

export const createKubernetesProviderDryRun = (): KubernetesProvider => createProvider("DryRun", new Map())

export const createKubernetesProviderTest = (world: KubernetesObjectSetWorld = { objects: new Map() }): KubernetesProvider =>
  createProvider("Test", new Map(world.objects))

export const createKubernetesProviderLive = (): KubernetesProvider => createProvider("Live", new Map())

export const KubernetesProviderRuntimeLive = Layer.succeed(KubernetesProviderRuntime, {
  providerForMode: (mode: KubernetesProviderMode) => {
    switch (mode) {
      case "Live":
        return createKubernetesProviderLive()
      case "Test":
        return createKubernetesProviderTest()
      case "DryRun":
        return createKubernetesProviderDryRun()
    }
  },
})

export const KubernetesProviderRuntimeLayer = defineRecipeLayer({
  id: KubernetesProviderRuntimeLayerId,
  sourcePath: KubernetesObjectSetSourcePath,
  exportName: "KubernetesProviderRuntimeLive",
  layer: KubernetesProviderRuntimeLive as never,
  provides: [{
    id: KubernetesProviderRuntimeServiceId,
    service: KubernetesProviderRuntime as never,
  }],
})

const runObjectSetAction = (
  runtime: KubernetesProviderRuntimeService,
  input: KubernetesObjectSetRecipeInput,
): KubernetesObjectSetResult => {
  const resource = resourceSet(input.id, input.objects as readonly KubernetesObject[])
  const provider = runtime.providerForMode(input.mode)

  switch (input.action ?? "validate") {
    case "render":
      return provider.render(resource)
    case "read":
      return provider.read(resource)
    case "diff":
      return provider.diff(resource)
    case "apply":
      return provider.apply(resource)
    case "delete":
      return provider.delete(resource)
    case "validate":
      return provider.validate(resource)
  }
}

export const KubernetesObjectSetHandler = defineRecipeHandler<
  KubernetesObjectSetRecipeInput,
  KubernetesObjectSetRecipeOutput,
  never,
  KubernetesProviderRuntime
>({
  id: KubernetesObjectSetHandlerId,
  recipeId: KubernetesObjectSetRecipeId,
  sourcePath: KubernetesObjectSetSourcePath,
  exportName: "KubernetesObjectSetHandler",
  handler: (input) =>
    Effect.gen(function* () {
      const runtime = yield* KubernetesProviderRuntime
      return runObjectSetAction(runtime, input)
    }) as never,
  layer: KubernetesProviderRuntimeLayer,
  emitsReceipts: ["platform-alchemy-k8s.kubernetes-object-set.lifecycle"],
})

export const kubernetesObjectSetDriftRepair: RecipeRepair = {
  repairId: KubernetesObjectSetDriftRepairId,
  recipeId: KubernetesObjectSetRecipeId,
  title: "Repair rendered Kubernetes object-set drift",
  kind: "managed-lifecycle",
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: ["packages/canopy/platform-alchemy-k8s/src/provider/**", "packages/canopy/platform-alchemy-k8s/src/resources/**"],
  risk: KubernetesObjectSetDriftRepairRisk,
  evidenceRequirements: ["platform-alchemy-k8s:test", "workspace:policy-fast"],
}

// @attune-packet-target generated-runtime-projection eligible
export const KubernetesObjectSetAlchemyBinding = defineManagedRecipeAlchemyBinding({
  id: KubernetesObjectSetAlchemyBindingId,
  managedRecipeId: KubernetesObjectSetRecipeId,
  alchemyResourceType: "attune:alchemy:KubernetesGraph",
  providerId: PlatformAlchemyK8sProviderCollectionId,
  resource: AttuneKubernetesGraphResourceContract,
  lifecycle: {
    plan: "render",
    read: "read",
    diff: "diff",
    check: "validate",
    apply: "apply",
    destroy: "delete",
  },
  bindings: ["AttuneKubernetesGraph", "platformAlchemyK8sProviders"],
})

export const KubernetesObjectSetManagedRecipe = defineManagedRecipe({
  id: KubernetesObjectSetRecipeId,
  projectId: "platform-alchemy-k8s",
  title: "Manage rendered Kubernetes object-set lifecycle",
  inputSchema: KubernetesObjectSetRecipeInput as never,
  outputSchema: KubernetesObjectSetRecipeOutput as never,
  nxTarget: "platform-alchemy-k8s:test",
  allowedFiles: ["packages/canopy/platform-alchemy-k8s/src/provider/**", "packages/canopy/platform-alchemy-k8s/src/resources/**"],
  validationEvidence: ["platform-alchemy-k8s:test", "workspace:policy-fast"],
  io: {
    inputSchema: KubernetesObjectSetRecipeInput as never,
    outputSchema: KubernetesObjectSetRecipeOutput as never,
    inputResources: [AttuneKubernetesGraphResourceContract],
    outputResources: [AttuneKubernetesGraphResourceContract],
  },
  handler: KubernetesObjectSetHandler as never,
  alchemyDag: [{
    fromRecipeId: PlatformAlchemyK8sProviderBridgeRecipeId,
    toRecipeId: KubernetesObjectSetRecipeId,
    resource: AttuneKubernetesGraphResourceContract,
    kind: "manages",
    modes: ["plan", "apply", "check", "destroy", "read"],
  }],
  lifecycle: ["plan", "apply", "check", "destroy"],
  resourceKind: "kubernetes-object-set",
  alchemy: KubernetesObjectSetAlchemyBinding,
  lifecycleSubstrates: [
    {
      id: KubernetesObjectSetLifecycleSubstrateId,
      kind: "container-runtime",
      tool: "alchemy",
      lifecycleActions: ["plan", "apply", "check", "destroy"],
      evidence: ["platform-alchemy-k8s:test"],
    },
  ],
  observedState: { status: "unknown" },
  driftRepair: kubernetesObjectSetDriftRepair,
  humanReviewRequired: true,
})

export const KubernetesObjectSetRecipes = [KubernetesObjectSetManagedRecipe] as const
