import type { CustomResourceDefinition } from "kubernetes-types/apiextensions/v1.d.ts"
import type { Job } from "kubernetes-types/batch/v1.d.ts"
import type { Deployment, StatefulSet } from "kubernetes-types/apps/v1.d.ts"
import type {
  ConfigMap,
  LimitRange,
  Namespace,
  PersistentVolumeClaim,
  ResourceQuota,
  Secret,
  Service,
  ServiceAccount,
} from "kubernetes-types/core/v1.d.ts"
import type { NetworkPolicy } from "kubernetes-types/networking/v1.d.ts"
import type { Role, RoleBinding } from "kubernetes-types/rbac/v1.d.ts"

export type BuiltInKubernetesObject =
  | ConfigMap
  | CustomResourceDefinition
  | Deployment
  | Job
  | LimitRange
  | Namespace
  | NetworkPolicy
  | PersistentVolumeClaim
  | ResourceQuota
  | Role
  | RoleBinding
  | Secret
  | Service
  | ServiceAccount
  | StatefulSet

export interface AttuneCustomResourceObject {
  readonly apiVersion: "attune.dev/v1alpha1"
  readonly kind: string
  readonly metadata: {
    readonly name?: string
    readonly namespace?: string
    readonly labels?: Readonly<Record<string, string>>
    readonly annotations?: Readonly<Record<string, string>>
  }
  readonly spec?: unknown
  readonly status?: unknown
}

export type KubernetesObject = BuiltInKubernetesObject | AttuneCustomResourceObject
