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

import { diagnosticRequirementId, type ProgramDiagnosticRequirement } from "../diagnostic-obligations/index.js"
import { AttuneProtocolWaiverSchema, decodeProtocolWaivers } from "../waivers/index.js"

export const ProgramCoverageExpectationSchema = Schema.Struct({
  id: Schema.String,
  symbolId: Schema.optional(Schema.String),
  tier: Schema.Literals(["commit", "push", "proof-pressure", "nightly", "debug"] as const),
  required: Schema.Boolean,
  evidenceKinds: Schema.Array(Schema.String),
})
export type ProgramCoverageExpectation = typeof ProgramCoverageExpectationSchema.Type

export const ProgramSymbolDescriptorSchema = Schema.Struct({
  id: Schema.String,
  kind: OperationKindSchema,
  views: Schema.optional(TouchedViewsSchema),
  laws: Schema.optional(Schema.Array(Schema.String)),
  inputSchema: Schema.String,
  outputSchema: Schema.String,
  errorSchema: Schema.optional(Schema.String),
})

export const ProgramSchemaDescriptorSchema = Schema.Struct({
  schemaDescriptorId: Schema.String,
  projectId: Schema.String,
  packageKind: PackageKindSchema,
  descriptorHash: Schema.String,
  sourcePath: Schema.String,
  views: PackageViewsSchema,
  services: Schema.Array(Schema.String),
  operations: Schema.Array(ProgramSymbolDescriptorSchema),
  provenance: Schema.optional(Schema.Unknown),
  waivers: Schema.Array(AttuneProtocolWaiverSchema),
  coverageExpectations: Schema.Array(ProgramCoverageExpectationSchema),
})

export type ProgramSymbolDescriptor = typeof ProgramSymbolDescriptorSchema.Type
export type ProgramSchemaDescriptor = typeof ProgramSchemaDescriptorSchema.Type

export interface ProgramSchemaDescriptorSource<Contract extends AttunePackageContract = AttunePackageContract> {
  readonly sourcePath: string
  readonly contract: Contract
}

export const schemaDescriptorIdForProject = (projectId: string): string =>
  `attune/project/${projectId}`

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

export const hashProgramValue = (value: unknown): string =>
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

export const schemaDescriptorFromProjectFacts = (
  source: ProgramSchemaDescriptorSource,
): ProgramSchemaDescriptor => {
  const decoded: DecodedPackageContract = Schema.decodeUnknownSync(PackageContractSchema)(source.contract)
  const projectId = decoded.packageId
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
    schemaDescriptorId: schemaDescriptorIdForProject(projectId),
    projectId,
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
    descriptorHash: hashProgramValue(withoutHash),
  }
}

export const decodeProjectFactsCompatibility = (
  contract: unknown,
): DecodedPackageContract =>
  Schema.decodeUnknownSync(PackageContractSchema)(contract)

export const deriveDiagnosticRequirements = (
  descriptor: ProgramSchemaDescriptor,
): readonly ProgramDiagnosticRequirement[] => {
  const operationObligations = descriptor.operations.flatMap((operation) => {
    const base: ProgramDiagnosticRequirement[] = [
      {
        diagnosticRequirementId: diagnosticRequirementId(descriptor.projectId, "handler", operation.id),
        schemaDescriptorId: descriptor.schemaDescriptorId,
        projectId: descriptor.projectId,
        symbolId: operation.id,
        kind: "handler",
      reason: `Symbol ${operation.id} must have a public project-boundary handler or registry entry.`,
      },
      {
        diagnosticRequirementId: diagnosticRequirementId(descriptor.projectId, "property", operation.id),
        schemaDescriptorId: descriptor.schemaDescriptorId,
        projectId: descriptor.projectId,
        symbolId: operation.id,
        kind: "property",
      reason: `Symbol ${operation.id} requires generated property observations for ${operation.kind}.`,
      },
    ]

    const lawObligations = (operation.laws ?? []).map((law) => ({
      diagnosticRequirementId: `${descriptor.projectId}:${operation.id}:law:${law}`,
      schemaDescriptorId: descriptor.schemaDescriptorId,
      projectId: descriptor.projectId,
      symbolId: operation.id,
      kind: "law" as const,
      reason: `Symbol ${operation.id} must satisfy diagnostic rule ${law}.`,
    }))

    const hasTouchedViews =
      (operation.views?.reactivityKeys?.length ?? 0) > 0 ||
      (operation.views?.atoms?.length ?? 0) > 0
    const viewObligations = hasTouchedViews
      ? [{
        diagnosticRequirementId: diagnosticRequirementId(descriptor.projectId, "view-movement", operation.id),
        schemaDescriptorId: descriptor.schemaDescriptorId,
        projectId: descriptor.projectId,
        symbolId: operation.id,
        kind: "view-movement" as const,
        reason: `Symbol ${operation.id} touches runtime roots and must record atom/Reactivity movement observations.`,
      }]
      : []

    return [...base, ...lawObligations, ...viewObligations]
  })

  return [
    ...operationObligations,
    {
      diagnosticRequirementId: diagnosticRequirementId(descriptor.projectId, "type-guidance"),
      schemaDescriptorId: descriptor.schemaDescriptorId,
      projectId: descriptor.projectId,
      kind: "type-guidance",
      reason: `Project ${descriptor.projectId} must keep schema observations aligned with its schema descriptor.`,
    },
    {
      diagnosticRequirementId: diagnosticRequirementId(descriptor.projectId, "generated-artifact"),
      schemaDescriptorId: descriptor.schemaDescriptorId,
      projectId: descriptor.projectId,
      kind: "generated-artifact",
      reason: `Project ${descriptor.projectId} must keep generated artifacts fresh for schema descriptor ${descriptor.descriptorHash}.`,
    },
  ]
}
