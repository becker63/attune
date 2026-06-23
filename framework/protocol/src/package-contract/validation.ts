import { Schema } from "effect"

import {
  PackageContractSchema,
  type DecodedPackageContract,
  type OperationKind,
} from "./core.js"
import {
  CanonicalLawIds,
  isLawAllowedForOperation,
  type LawId,
  type OperationLawInput,
  type ViewLawMetadata,
} from "./laws.js"

export type PackageContractEnforcementBoundary =
  | "typescript-contract-builder"
  | "effect-schema-decoder"
  | "nx-generated-sync"
  | "fastcheck-provider-observation"
  | "architecture-policy"

export interface PackageContractInvariantClassification {
  readonly invariant: string
  readonly boundary: PackageContractEnforcementBoundary
  readonly reason: string
}

export const PackageContractInvariantClassifications = [
  {
    invariant: "literal operation ids, operation maps, touched views, and handler/property map completeness",
    boundary: "typescript-contract-builder",
    reason: "These invariants are local to the authored contract module and should fail at typecheck.",
  },
  {
    invariant: "encoded package ids, operation kinds, views, schemas, law descriptor values, and waiver records",
    boundary: "effect-schema-decoder",
    reason: "These values cross runtime, cache, evidence, and descriptor boundaries.",
  },
  {
    invariant: "missing files, generated freshness, project targets, command surfaces, and package discovery",
    boundary: "nx-generated-sync",
    reason: "These facts depend on repository files and Nx project graph state.",
  },
  {
    invariant: "behavioral laws, provider observations, replay, mutation, coverage, and atom movement evidence",
    boundary: "fastcheck-provider-observation",
    reason: "These facts require executing operations or observing generated evidence.",
  },
  {
    invariant: "residual repo-wide ratchets, expired migration waivers, checked-in reports, and manual derived truth",
    boundary: "architecture-policy",
    reason: "These are cross-package policy constraints after typed helpers and Schema decoders have accepted a descriptor.",
  },
] as const satisfies readonly PackageContractInvariantClassification[]

export type PackageContractValidationDiagnosticCode =
  | "schema-decode-failed"
  | "duplicate-operation-id"
  | "invalid-law-id"
  | "invalid-view-reference"
  | "missing-kind-metadata"
  | "missing-layer-metadata"
  | "hidden-configuration-without-waiver"

export interface PackageContractValidationDiagnostic {
  readonly code: PackageContractValidationDiagnosticCode
  readonly message: string
  readonly path: readonly string[]
}

export interface PackageContractValidationResult {
  readonly contract: DecodedPackageContract | undefined
  readonly diagnostics: readonly PackageContractValidationDiagnostic[]
}

const canonicalLawIds = new Set<string>(CanonicalLawIds)

export const decodePackageContract = (input: unknown): PackageContractValidationResult => {
  try {
    return {
      contract: Schema.decodeUnknownSync(PackageContractSchema)(input),
      diagnostics: [],
    }
  } catch (error) {
    return {
      contract: undefined,
      diagnostics: [{
        code: "schema-decode-failed",
        message: String(error),
        path: [],
      }],
    }
  }
}

export const validatePackageContract = (input: unknown): PackageContractValidationResult => {
  const decoded = decodePackageContract(input)
  if (decoded.contract === undefined) return decoded

  return {
    contract: decoded.contract,
    diagnostics: [
      ...findDuplicateOperationIds(decoded.contract),
      ...findInvalidLawIds(decoded.contract),
      ...findInvalidViewReferences(decoded.contract),
      ...findMissingKindMetadata(input, decoded.contract),
      ...findMissingLayerMetadata(input, decoded.contract),
      ...findHiddenConfigurationDiagnostics(input, decoded.contract),
    ],
  }
}

function findDuplicateOperationIds(
  contract: DecodedPackageContract,
): readonly PackageContractValidationDiagnostic[] {
  const seen = new Set<string>()
  const duplicates = new Set<string>()

  for (const operation of contract.operations) {
    if (seen.has(operation.id)) duplicates.add(operation.id)
    seen.add(operation.id)
  }

  return [...duplicates].map((operationId) => ({
    code: "duplicate-operation-id",
    message: `Operation id ${operationId} appears more than once in the decoded package contract.`,
    path: ["operations", operationId],
  }))
}

function findInvalidLawIds(
  contract: DecodedPackageContract,
): readonly PackageContractValidationDiagnostic[] {
  const diagnostics: PackageContractValidationDiagnostic[] = []

  for (const operation of contract.operations) {
    for (const lawId of operation.laws ?? []) {
      if (!canonicalLawIds.has(lawId)) {
        diagnostics.push({
          code: "invalid-law-id",
          message: `Operation ${operation.id} declares unknown law id ${lawId}.`,
          path: ["operations", operation.id, "laws", lawId],
        })
        continue
      }

      const views = compactViewLawMetadata(operation.views)
      const lawInput: OperationLawInput = views === undefined
        ? { id: operation.id, kind: operation.kind }
        : { id: operation.id, kind: operation.kind, views }

      if (!isLawAllowedForOperation(lawId as LawId, lawInput)) {
        diagnostics.push({
          code: "invalid-law-id",
          message: `Operation ${operation.id} declares law ${lawId}, which is not allowed for ${operation.kind} metadata.`,
          path: ["operations", operation.id, "laws", lawId],
        })
      }
    }
  }

  return diagnostics
}

function compactViewLawMetadata(
  views: {
    readonly reactivityKeys?: readonly string[] | undefined
    readonly atoms?: readonly string[] | undefined
  } | undefined,
): ViewLawMetadata | undefined {
  if (views === undefined) return undefined

  const compacted: {
    reactivityKeys?: readonly string[]
    atoms?: readonly string[]
  } = {}
  if (views.reactivityKeys !== undefined) compacted.reactivityKeys = views.reactivityKeys
  if (views.atoms !== undefined) compacted.atoms = views.atoms

  return Object.keys(compacted).length === 0 ? undefined : compacted
}

function findInvalidViewReferences(
  contract: DecodedPackageContract,
): readonly PackageContractValidationDiagnostic[] {
  const reactivityKeys = new Set(contract.views.reactivityKeys)
  const atoms = new Set(contract.views.atoms)
  const diagnostics: PackageContractValidationDiagnostic[] = []

  for (const operation of contract.operations) {
    for (const key of operation.views?.reactivityKeys ?? []) {
      if (reactivityKeys.has(key)) continue
      diagnostics.push({
        code: "invalid-view-reference",
        message: `Operation ${operation.id} touches unknown Reactivity key ${key}.`,
        path: ["operations", operation.id, "views", "reactivityKeys", key],
      })
    }

    for (const atom of operation.views?.atoms ?? []) {
      if (atoms.has(atom)) continue
      diagnostics.push({
        code: "invalid-view-reference",
        message: `Operation ${operation.id} touches unknown atom ${atom}.`,
        path: ["operations", operation.id, "views", "atoms", atom],
      })
    }
  }

  return diagnostics
}

function findMissingKindMetadata(
  input: unknown,
  contract: DecodedPackageContract,
): readonly PackageContractValidationDiagnostic[] {
  const operations = rawOperations(input)

  return contract.operations.flatMap((operation, index) => {
    const rawOperation = operations[index]
    const missing = missingKindMetadataField(operation.kind, rawOperation)
    if (missing === undefined) return []

    return [{
      code: "missing-kind-metadata",
      message: `Operation ${operation.id} with kind ${operation.kind} must declare ${missing} metadata.`,
      path: ["operations", operation.id, missing],
    }]
  })
}

function missingKindMetadataField(
  kind: OperationKind,
  operation: unknown,
): string | undefined {
  switch (kind) {
    case "atom-family":
      return hasTopLevelOrMetadataField(operation, "atom") ? undefined : "atom"
    case "event-facade":
      return hasTopLevelOrMetadataField(operation, "event") ? undefined : "event"
    case "generator":
      return hasTopLevelOrMetadataField(operation, "generator") ? undefined : "generator"
    case "joern-template":
      return hasTopLevelOrMetadataField(operation, "joern") ? undefined : "joern"
    case "policy-rule":
      return hasTopLevelOrMetadataField(operation, "policy") ? undefined : "policy"
    case "projection":
      return hasTopLevelOrMetadataField(operation, "projection") ? undefined : "projection"
    case "resource-provider":
      return hasTopLevelOrMetadataField(operation, "observes") ||
        hasTopLevelOrMetadataField(operation, "resource")
        ? undefined
        : "observes"
    case "codec":
    case "command":
    case "query":
      return undefined
  }
}

function findMissingLayerMetadata(
  input: unknown,
  contract: DecodedPackageContract,
): readonly PackageContractValidationDiagnostic[] {
  if (contract.operations.length === 0) return []
  if (hasLayerMetadata(input, "packageLayer") && hasLayerMetadata(input, "testLayer")) return []
  if (hasLayerMetadata(input, "PackageLayer") && hasLayerMetadata(input, "PackageTestLayer")) return []
  if (hasLayerMetadata(input, "layers")) return []

  return [{
    code: "missing-layer-metadata",
    message: "Package contracts with operations must expose PackageLayer and PackageTestLayer metadata or a generated layers record.",
    path: ["layers"],
  }]
}

function findHiddenConfigurationDiagnostics(
  input: unknown,
  contract: DecodedPackageContract,
): readonly PackageContractValidationDiagnostic[] {
  if (hasWaiverCategory(contract.waivers, "hidden-configuration")) return []

  return rawOperations(input).flatMap((operation, index) => {
    if (!hasHiddenConfiguration(operation)) return []

    return [{
      code: "hidden-configuration-without-waiver",
      message: `Operation ${contract.operations[index]?.id ?? index} declares hidden configuration dependencies without a hidden-configuration waiver.`,
      path: ["operations", contract.operations[index]?.id ?? String(index), "metadata", "hiddenConfiguration"],
    }]
  })
}

function rawOperations(input: unknown): readonly unknown[] {
  if (!isRecord(input) || !Array.isArray(input.operations)) return []
  return input.operations
}

function hasTopLevelOrMetadataField(value: unknown, field: string): boolean {
  if (!isRecord(value)) return false
  if (value[field] !== undefined) return true
  return isRecord(value.metadata) && value.metadata[field] !== undefined
}

function hasLayerMetadata(input: unknown, field: string): boolean {
  return isRecord(input) && input[field] !== undefined
}

function hasHiddenConfiguration(value: unknown): boolean {
  if (!isRecord(value)) return false
  return Boolean(value.hiddenConfiguration) ||
    Boolean(value.hiddenConfig) ||
    hasHiddenConfiguration(value.metadata)
}

function hasWaiverCategory(waivers: readonly unknown[] | undefined, category: string): boolean {
  return (waivers ?? []).some((waiver) => isRecord(waiver) && waiver.category === category)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}
