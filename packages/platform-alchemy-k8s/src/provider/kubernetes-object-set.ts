import { Schema } from "effect"

import {
  KubernetesObjectSchema,
  RenderedResourceSet,
  objectKey,
  type KubernetesObject,
  type PlatformResourceSet,
} from "./alchemy-k8s-provider.js"

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
