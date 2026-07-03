import { Effect, Schema } from "effect"

import {
  PackageContractSchema,
  type DecodedPackageContract,
  type OperationKind,
} from "./core.js"
import {
  CanonicalDiagnosticRuleIds,
  isDiagnosticRuleAllowedForSymbol,
  type DiagnosticRuleId,
  type OperationDiagnosticRuleInput,
  type ViewDiagnosticRuleMetadata,
} from "./diagnostic-rules.js"
import type {
  AnyRecipeDefinition,
  FrameworkProtocolRecipeHelpers,
} from "../recipes/index.js"

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

const canonicalDiagnosticRuleIds = new Set<string>(CanonicalDiagnosticRuleIds)

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
      ...findInvalidDiagnosticRuleIds(decoded.contract),
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
    message: `Operation id ${operationId} appears more than once in the decoded project facts.`,
    path: ["operations", operationId],
  }))
}

function findInvalidDiagnosticRuleIds(
  contract: DecodedPackageContract,
): readonly PackageContractValidationDiagnostic[] {
  const diagnostics: PackageContractValidationDiagnostic[] = []

  for (const operation of contract.operations) {
    for (const lawId of operation.laws ?? []) {
      if (!canonicalDiagnosticRuleIds.has(lawId)) {
        diagnostics.push({
          code: "invalid-law-id",
          message: `Operation ${operation.id} declares unknown law id ${lawId}.`,
          path: ["operations", operation.id, "laws", lawId],
        })
        continue
      }

      const views = compactViewDiagnosticRuleMetadata(operation.views)
      const lawInput: OperationDiagnosticRuleInput = views === undefined
        ? { id: operation.id, kind: operation.kind }
        : { id: operation.id, kind: operation.kind, views }

      if (!isDiagnosticRuleAllowedForSymbol(lawId as DiagnosticRuleId, lawInput)) {
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

function compactViewDiagnosticRuleMetadata(
  views: {
    readonly reactivityKeys?: readonly string[] | undefined
    readonly atoms?: readonly string[] | undefined
  } | undefined,
): ViewDiagnosticRuleMetadata | undefined {
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
  if (hasLayerMetadata(input, "PackageLayer") && hasLayerMetadata(input, "programTestLayer")) return []
  if (hasLayerMetadata(input, "layers")) return []

  return [{
    code: "missing-layer-metadata",
    message: "Package contracts with operations must expose PackageLayer and programTestLayer metadata or a generated layers record.",
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

export const ProjectFactsValidationRecipeInput = Schema.Struct({
  sourcePath: Schema.String,
  contract: Schema.Unknown,
})
export type ProjectFactsValidationRecipeInput = typeof ProjectFactsValidationRecipeInput.Type

export const ProjectFactsValidationRecipeOutput = Schema.Struct({
  sourcePath: Schema.String,
  diagnosticCount: Schema.Number,
  decoded: Schema.Boolean,
})
export type ProjectFactsValidationRecipeOutput = typeof ProjectFactsValidationRecipeOutput.Type

export const summarizeProjectFactsValidation = (
  input: ProjectFactsValidationRecipeInput,
): ProjectFactsValidationRecipeOutput => {
  const result = validatePackageContract(input.contract)
  return {
    sourcePath: input.sourcePath,
    diagnosticCount: result.diagnostics.length,
    decoded: result.contract !== undefined,
  }
}

export const ProjectFactsValidationRecipes = (
  helpers: FrameworkProtocolRecipeHelpers,
): readonly AnyRecipeDefinition[] => {
// @attune-packet-target generated-runtime-projection eligible
  const ValidationSource = helpers.defineAlchemyResource({
    id: "framework-protocol.project-facts.validation.source",
    kind: "file",
    alchemyType: "attune:resource:ProtocolSourceFile",
    addressSchema: ProjectFactsValidationRecipeInput,
    stateSchema: ProjectFactsValidationRecipeInput,
    modes: ["read"],
    consumedBy: ["framework-protocol.project-facts.contract-validation"],
  })
// @attune-packet-target generated-runtime-projection eligible
  const ValidationReport = helpers.defineAlchemyResource({
    id: "framework-protocol.project-facts.validation.report",
    kind: "report",
    alchemyType: "attune:resource:ProjectFactsValidationReport",
    addressSchema: ProjectFactsValidationRecipeInput,
    stateSchema: ProjectFactsValidationRecipeOutput,
    modes: ["check", "read"],
    ownerRecipeId: "framework-protocol.project-facts.contract-validation",
    producedBy: ["framework-protocol.project-facts.contract-validation"],
  })
  const ValidationHandler = helpers.defineRecipeHandler<ProjectFactsValidationRecipeInput, ProjectFactsValidationRecipeOutput, never, never>({
    id: "framework-protocol.project-facts.contract-validation.handler",
    recipeId: "framework-protocol.project-facts.contract-validation",
    sourcePath: "packages/trellis/protocol/src/project-facts/validation.ts",
    exportName: "summarizeProjectFactsValidation",
    emitsReceipts: ["project-facts.validation-summary"],
    handler: (input) => Effect.succeed(summarizeProjectFactsValidation(input)),
  })
  const ValidationDagEdge = helpers.defineAlchemyRecipeDagEdge({
    fromRecipeId: "framework-protocol.project-facts.validation.source",
    toRecipeId: "framework-protocol.project-facts.contract-validation",
    resource: "framework-protocol.project-facts.validation.report",
    kind: "validates",
    modes: ["read", "check"],
  })

  return [
    helpers.defineDiagnosticRecipe({
      id: "framework-protocol.project-facts.contract-validation",
      projectId: "framework-protocol",
      title: "Validate decoded project-fact package contracts",
      inputSchema: ProjectFactsValidationRecipeInput,
      outputSchema: ProjectFactsValidationRecipeOutput,
      io: {
        inputSchema: ProjectFactsValidationRecipeInput,
        outputSchema: ProjectFactsValidationRecipeOutput,
        inputResources: [ValidationSource],
        outputResources: [ValidationReport],
      },
      handler: ValidationHandler,
      alchemyDag: [ValidationDagEdge],
      nxTarget: "framework-protocol:test",
      observedFiles: ["packages/trellis/protocol/src/project-facts/validation.ts"],
      allowedFiles: ["packages/trellis/protocol/src/project-facts/validation.ts"],
      validationEvidence: ["framework-protocol:test", "framework-protocol:typecheck"],
    }),
  ] as const
}
