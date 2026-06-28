import { Schema } from "effect"

import type { KubernetesObject as KubernetesObjectType } from "./kubernetes-types.js"

export const KubernetesObjectMeta = Schema.Struct({
  name: Schema.String,
  namespace: Schema.optional(Schema.String),
  labels: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  annotations: Schema.optional(Schema.Record(Schema.String, Schema.String)),
})
export type KubernetesObjectMeta = typeof KubernetesObjectMeta.Type

export const KubernetesObjectSchema = Schema.Struct({
  apiVersion: Schema.String,
  kind: Schema.String,
  metadata: KubernetesObjectMeta,
  spec: Schema.optional(Schema.Unknown),
  rules: Schema.optional(Schema.Unknown),
  roleRef: Schema.optional(Schema.Unknown),
  subjects: Schema.optional(Schema.Unknown),
  data: Schema.optional(Schema.Record(Schema.String, Schema.String)),
  stringData: Schema.optional(Schema.Record(Schema.String, Schema.String)),
})

export const RenderedResourceSet = Schema.Struct({
  id: Schema.String,
  objects: Schema.Array(KubernetesObjectSchema),
})
export type RenderedResourceSet = {
  readonly id: string
  readonly objects: readonly KubernetesObjectType[]
}

export interface PlatformResourceSet {
  readonly id: string
  readonly render: () => RenderedResourceSet
}

export interface KubernetesProviderPlan {
  readonly provider: "attune:alchemy:kubernetes"
  readonly id: string
  readonly objects: readonly KubernetesObjectType[]
}

export interface AlchemyK8sProvider {
  readonly provider: "attune:alchemy:kubernetes"
  readonly plan: (resource: PlatformResourceSet) => KubernetesProviderPlan
}

export const createAlchemyK8sProvider = (): AlchemyK8sProvider => ({
  provider: "attune:alchemy:kubernetes",
  plan: (resource) => {
    const rendered = resource.render()
    Schema.decodeUnknownSync(RenderedResourceSet)(rendered)
    return {
      provider: "attune:alchemy:kubernetes",
      id: rendered.id,
      objects: rendered.objects,
    }
  },
})

export const objectKey = (object: KubernetesObjectType): string =>
  `${object.apiVersion ?? "_"}/${object.kind ?? "_"}/${object.metadata?.namespace ?? "_"}/${object.metadata?.name ?? "_"}`

export type { KubernetesObject } from "./kubernetes-types.js"
