import type {
  AttunePackageContract,
} from "../project-facts/index.js"
import {
  OperationKindSchema,
  PackageContractSchema,
  PackageKindSchema,
  PackageViewsSchema,
  TouchedViewsSchema,
  type DecodedPackageContract,
} from "../project-facts/index.js"
import { Schema } from "effect"

import { obligationId, type AttuneProtocolObligation } from "../diagnostic-obligations/index.js"
import { AttuneProtocolWaiverSchema, decodeProtocolWaivers } from "../waivers/index.js"

export const AttuneCoverageExpectationSchema = Schema.Struct({
  id: Schema.String,
  operationId: Schema.optional(Schema.String),
  tier: Schema.Literals(["commit", "push", "proof-pressure", "nightly", "debug"] as const),
  required: Schema.Boolean,
  evidenceKinds: Schema.Array(Schema.String),
})
export type AttuneCoverageExpectation = typeof AttuneCoverageExpectationSchema.Type

export const AttuneProtocolOperationDescriptorSchema = Schema.Struct({
  id: Schema.String,
  kind: OperationKindSchema,
  views: Schema.optional(TouchedViewsSchema),
  laws: Schema.optional(Schema.Array(Schema.String)),
  inputSchema: Schema.String,
  outputSchema: Schema.String,
  errorSchema: Schema.optional(Schema.String),
})

export const AttuneProtocolDescriptorSchema = Schema.Struct({
  protocolId: Schema.String,
  packageId: Schema.String,
  packageKind: PackageKindSchema,
  descriptorHash: Schema.String,
  sourcePath: Schema.String,
  views: PackageViewsSchema,
  services: Schema.Array(Schema.String),
  operations: Schema.Array(AttuneProtocolOperationDescriptorSchema),
  provenance: Schema.optional(Schema.Unknown),
  waivers: Schema.Array(AttuneProtocolWaiverSchema),
  coverageExpectations: Schema.Array(AttuneCoverageExpectationSchema),
})

export type AttuneProtocolOperationDescriptor = typeof AttuneProtocolOperationDescriptorSchema.Type
export type AttuneProtocolDescriptor = typeof AttuneProtocolDescriptorSchema.Type

export interface AttuneProtocolSource<Contract extends AttunePackageContract = AttunePackageContract> {
  readonly sourcePath: string
  readonly contract: Contract
}

export const protocolIdForPackage = (packageId: string): string =>
  `attune/package/${packageId}`

const schemaLabel = (schema: unknown): string => {
  if (typeof schema === "string") return schema
  if (schema && typeof schema === "object") {
    const maybe = schema as { readonly ast?: { readonly _tag?: string }; readonly _tag?: string }
    return maybe.ast?._tag ?? maybe._tag ?? schema.constructor.name
  }
  return typeof schema
}

const stableJson = (value: unknown): string =>
  JSON.stringify(sortJson(value))

const sortJson = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortJson)
  if (value === null || typeof value !== "object") return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, nested]) => nested !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, nested]) => [key, sortJson(nested)]),
  )
}

export const hashProtocolValue = (value: unknown): string =>
  stableHash(stableJson(value))

const stableHash = (input: string): string => {
  let left = 0x811c9dc5
  let right = 0x811c9dc5 ^ input.length

  for (let index = 0; index < input.length; index += 1) {
    const char = input.charCodeAt(index)
    left ^= char
    left = Math.imul(left, 0x01000193)
    right ^= char + index
    right = Math.imul(right, 0x85ebca6b)
  }

  return [
    (left >>> 0).toString(16).padStart(8, "0"),
    (right >>> 0).toString(16).padStart(8, "0"),
  ].join("")
}

export const descriptorFromPackageContract = (
  source: AttuneProtocolSource,
): AttuneProtocolDescriptor => {
  const decoded: DecodedPackageContract = Schema.decodeUnknownSync(PackageContractSchema)(source.contract)
  const operations = decoded.operations.map((operation) => ({
    id: operation.id,
    kind: operation.kind,
    ...(operation.views === undefined ? {} : { views: operation.views }),
    ...(operation.laws === undefined ? {} : { laws: operation.laws }),
    inputSchema: schemaLabel(operation.input),
    outputSchema: schemaLabel(operation.output),
    ...(operation.error === undefined ? {} : { errorSchema: schemaLabel(operation.error) }),
  }))

  const withoutHash = {
    protocolId: protocolIdForPackage(decoded.packageId),
    packageId: decoded.packageId,
    packageKind: decoded.packageKind,
    sourcePath: source.sourcePath,
    views: decoded.views,
    services: decoded.services ?? [],
    operations,
    ...(decoded.provenance === undefined ? {} : { provenance: decoded.provenance }),
    waivers: decodeProtocolWaivers(decoded.waivers ?? []),
    coverageExpectations: [],
  }

  return {
    ...withoutHash,
    descriptorHash: hashProtocolValue(withoutHash),
  }
}

export const decodePackageContract = (
  contract: unknown,
): DecodedPackageContract =>
  Schema.decodeUnknownSync(PackageContractSchema)(contract)

export const deriveProtocolObligations = (
  descriptor: AttuneProtocolDescriptor,
): readonly AttuneProtocolObligation[] => {
  const operationObligations = descriptor.operations.flatMap((operation) => {
    const base: AttuneProtocolObligation[] = [
      {
        obligationId: obligationId(descriptor.packageId, "handler", operation.id),
        protocolId: descriptor.protocolId,
        packageId: descriptor.packageId,
        operationId: operation.id,
        kind: "handler",
        reason: `Operation ${operation.id} must have a public package-boundary handler or registry entry.`,
      },
      {
        obligationId: obligationId(descriptor.packageId, "property", operation.id),
        protocolId: descriptor.protocolId,
        packageId: descriptor.packageId,
        operationId: operation.id,
        kind: "property",
        reason: `Operation ${operation.id} requires generated property evidence for ${operation.kind}.`,
      },
    ]

    const lawObligations = (operation.laws ?? []).map((law) => ({
      obligationId: `${descriptor.packageId}:${operation.id}:law:${law}`,
      protocolId: descriptor.protocolId,
      packageId: descriptor.packageId,
      operationId: operation.id,
      kind: "law" as const,
      reason: `Operation ${operation.id} must observe law ${law}.`,
    }))

    const hasTouchedViews =
      (operation.views?.reactivityKeys?.length ?? 0) > 0 ||
      (operation.views?.atoms?.length ?? 0) > 0
    const viewObligations = hasTouchedViews
      ? [{
        obligationId: obligationId(descriptor.packageId, "view-movement", operation.id),
        protocolId: descriptor.protocolId,
        packageId: descriptor.packageId,
        operationId: operation.id,
        kind: "view-movement" as const,
        reason: `Operation ${operation.id} touches package views and must record atom/Reactivity movement evidence.`,
      }]
      : []

    return [...base, ...lawObligations, ...viewObligations]
  })

  return [
    ...operationObligations,
    {
      obligationId: obligationId(descriptor.packageId, "type-guidance"),
      protocolId: descriptor.protocolId,
      packageId: descriptor.packageId,
      kind: "type-guidance",
      reason: `Package ${descriptor.packageId} must keep PackageTypeGuidance aligned with its protocol descriptor.`,
    },
    {
      obligationId: obligationId(descriptor.packageId, "generated-artifact"),
      protocolId: descriptor.protocolId,
      packageId: descriptor.packageId,
      kind: "generated-artifact",
      reason: `Package ${descriptor.packageId} must keep generated protocol artifacts fresh for descriptor ${descriptor.descriptorHash}.`,
    },
  ]
}
